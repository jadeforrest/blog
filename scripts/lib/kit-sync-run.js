/**
 * The steps of scripts/kit-sync.js (push blog posts to Kit sequence emails via the v4 API),
 * with all I/O passed in so tests can drive it:
 *
 *   readSyncPosts   the posts under a directory, with frontmatter
 *   syncPlan        what each post needs: push, create, record ids, nothing, refused (pure)
 *   runSync         the whole run: record found ids, push changed posts, offer new drafts
 *
 * A post's emails are `kitEmails: "<sequenceId>/<emailId>, ..."`; ones found in Kit by their
 * share link (kit-post-index.js) are added. `kitSyncHash` says whether Kit has the current
 * content, `kitExclude: true` keeps a post out of Kit. Pushes send content only: Kit's
 * subject, preview text and schedule are left alone. Without `publish`, Kit keeps a pushed
 * change to a published email as an unpublished draft change.
 *
 * deps: { log, toHtml, pendingTableImages, kit: { get, put, post }, backup, confirm, choose,
 *         writeFile }
 */

import crypto from 'crypto';
import nodeFs from 'fs';
import path from 'path';
import { parseFrontmatter } from './frontmatter.js';
import { formatKitEmails, mergePairs, parseKitEmails } from './kit-post-index.js';

export const RULE = '='.repeat(60);

/**
 * Bump when kit-mdx-to-html.js changes what it produces: every post's hash then stops
 * matching and the next run pushes them all again.
 */
export const SYNC_FORMAT = 'kit-post-v1';

// Bookkeeping lines that don't change what the email says.
const STATE_LINE = /^(?:kitSyncHash|kitSyncedAt|kitEmails|kitEditUrls|kitExclude):.*\n?/gm;

/** The file content that counts as "what we synced": without the Kit bookkeeping lines. */
export function hashableContent(raw) {
  return raw.replace(STATE_LINE, '');
}

const md5 = (text) => crypto.createHash('md5').update(text).digest('hex');

export function syncHash(raw) {
  return md5(`${SYNC_FORMAT}\n${hashableContent(raw)}`);
}

/** The hash the clipboard version of kit-sync wrote: the file without its kitSyncHash line. */
export function legacyHash(raw) {
  return md5(raw.replace(/^kitSyncHash:.*\n?/m, ''));
}

/** 'never synced', 'content changed', or null when the stored hash (either kind) is current. */
export function syncStatus(post) {
  const stored = post.data.kitSyncHash;
  if (!stored) return 'never synced';
  return stored === syncHash(post.raw) || stored === legacyHash(post.raw) ? null : 'content changed';
}

const yamlValue = (v) => (typeof v === 'string' ? JSON.stringify(v) : String(v));

/**
 * `raw` with frontmatter keys set (or removed, for null), editing lines in place so the rest
 * of the block keeps its formatting. A key that isn't there yet goes at the end of the block.
 */
export function setFrontmatter(raw, changes) {
  const end = raw.indexOf('\n---', 3);
  if (!raw.startsWith('---\n') || end === -1) throw new Error('post has no frontmatter block');
  let block = raw.slice(4, end + 1);
  for (const [key, value] of Object.entries(changes)) {
    const line = new RegExp(`^${key}:.*\\n`, 'm');
    const next = value === null ? '' : `${key}: ${yamlValue(value)}\n`;
    // A function replacement, so `$&` and friends in a value stay literal.
    block = line.test(block) ? block.replace(line, () => next) : block + next;
  }
  return `---\n${block}${raw.slice(end + 1)}`;
}

/** Posts with an index.mdx under `postsDir`, sorted by directory (so by date). */
export function readSyncPosts(postsDir, fs = nodeFs) {
  return fs
    .readdirSync(postsDir)
    .map((dir) => path.join(postsDir, dir, 'index.mdx'))
    .filter((f) => fs.existsSync(f))
    .sort()
    .map((file) => {
      const raw = fs.readFileSync(file, 'utf8');
      const dirName = path.basename(path.dirname(file));
      return { file, raw, data: parseFrontmatter(raw, file).data, slug: dirName.replace(/^\d{4}-\d{2}-\d{2}--/, ''), dirName };
    });
}

/** What one post needs, before the order rule for new emails is applied. */
function classify(post, { index, force, wanted }) {
  if (post.data.kitExclude === true) return { post, action: 'excluded' };
  const known = parseKitEmails(post.data.kitEmails);
  const pairs = mergePairs(known, index.get(post.slug) ?? []);
  const found = wanted ? pairs.slice(known.length) : []; // --post records only that post's ids
  const status = syncStatus(post) ?? (force && wanted ? 'forced' : null);
  if (pairs.length === 0) return { post, pairs, found, status, action: wanted ? 'create' : 'none' };
  return { post, pairs, found, status, action: wanted && status ? 'push' : 'none' };
}

/**
 * What a run will do, one item per post: { post, pairs, found, status, action, problems }.
 * `action` is 'push' (Kit's copy is out of date), 'create' (no email yet: offer a new draft),
 * 'none' (in sync, or left out by `postFilter`), 'excluded' or 'refused' (`problems` says why).
 * `found` are ids discovered in Kit and not yet in the frontmatter; they're recorded whatever
 * the action. A new email goes at the end of the sequence, so a post can't be created while
 * an earlier post without an email isn't being created too. `posts` must be in date order.
 */
export function syncPlan(posts, { index = new Map(), force = false, postFilter = null, problems = () => [] } = {}) {
  let held = null;
  return posts.map((post) => {
    const wanted = !postFilter || post.slug.includes(postFilter);
    const item = classify(post, { index, force, wanted });
    const own = ['push', 'create'].includes(item.action) ? problems(post) : [];
    const order = item.action === 'create' && held ? [`it would land in Kit ahead of /${held}/, an earlier post with no Kit email`] : [];
    const all = [...own, ...order];
    if ((item.action === 'create' && all.length > 0) || (item.pairs?.length === 0 && item.action === 'none')) held ??= post.slug;
    return all.length > 0 ? { ...item, action: 'refused', problems: all } : { ...item, problems: [] };
  });
}

const pick = (plan, action) => plan.filter((i) => i.action === action);
const pairText = (pairs) => formatKitEmails(pairs);

/** The plan as lines to print. */
export function describePlan(plan, { publish = false } = {}) {
  const lines = [];
  const count = (a) => pick(plan, a).length;
  lines.push(
    `Posts: ${plan.length} total — ${count('push')} to push, ${count('create')} not in Kit, ` +
      `${count('refused')} refused, ${count('excluded')} excluded, ${count('none')} in sync or skipped`
  );
  const found = plan.filter((i) => i.found?.length > 0);
  if (found.length > 0) {
    lines.push(`\nEmails found in Kit, not yet in frontmatter (${found.length}):`);
    for (const i of found) lines.push(`  + ${i.post.slug} → ${pairText(i.found)}`);
  }
  const pushes = pick(plan, 'push');
  if (pushes.length > 0) {
    lines.push(`\nTo push (${publish ? 'published' : 'saved as unpublished changes; --publish makes them live'}):`);
    for (const i of pushes) lines.push(`  - ${i.post.slug} → ${pairText(i.pairs)} (${i.status})`);
  }
  const creates = pick(plan, 'create');
  if (creates.length > 0) {
    lines.push('\nNot in Kit (each is offered as a new draft; [x] marks it kitExclude):');
    for (const i of creates) lines.push(`  ? ${i.post.slug}`);
  }
  for (const i of pick(plan, 'refused')) lines.push(`  ✗ Not syncing ${i.post.slug}: ${i.problems.join('; ')}`);
  return lines;
}

/**
 * Markdown tables are rendered to PNGs (see kit-mdx-to-html.js) and referenced by absolute
 * rubick.com URL, so they only reach the email once the PNG is live on the site. Returns
 * { count, paths }: how many tables became images, and the repo-relative files that still
 * need to go out (uncommitted, or committed but not pushed). Empty paths means deployed.
 * `exists(repoPath)` and `git(args)` (stdout, '' on error) come from the caller.
 */
export function pendingTableImages(html, post, { exists, git }) {
  const files = [...html.matchAll(/src="[^"]*\/(kit-table-\d+\.png)"/g)].map((m) => m[1]);
  if (files.length === 0) return { count: 0, paths: [] };
  // Each table lives twice: in the post source dir and in public/ (see CLAUDE.md).
  const paths = files
    .flatMap((f) => [path.join('public', post.slug, f), path.join('src', 'content', 'posts', post.dirName, f)])
    .filter(exists);
  const pathspec = paths.map((p) => `'${p}'`).join(' ');
  const shipped = git(`status --porcelain -- ${pathspec}`) === '' && git(`log --oneline @{u}..HEAD -- ${pathspec}`) === '';
  return { count: files.length, paths: shipped ? [] : paths };
}

const plural = (count, one, many) => (count === 1 ? one : many);

/** Warning shown for a post whose table images aren't on the live site yet. */
export function tableImageWarning({ count, paths }, slug) {
  const one = count === 1;
  const it = plural(count, 'it', 'them');
  return [
    `\n  ⚠ ${one ? 'The table in this post was' : `The ${count} tables in this post were`} rendered as ` +
      `${plural(count, 'an image', 'images')}, and ${plural(count, "it isn't", "they aren't")} on rubick.com yet.`,
    `    Kit loads ${it} from the live site, so the Kit preview and any test send will`,
    `    show ${plural(count, 'a broken image', 'broken images')} until you ship ${it}:`,
    `\n      git add ${paths.join(' ')}`,
    `      git commit -m "Add table ${plural(count, 'image', 'images')} for ${slug}"`,
    '      git push\n',
    `    Pushing an unpublished change is fine — ${plural(count, 'the image fills in by itself', 'the images fill in by themselves')} once the deploy finishes.`,
    `    --publish is refused until then.`,
  ];
}

/** The end-of-run reminder about unshipped table images; empty when there are none. */
export function unshippedReminder(paths) {
  if (paths.length === 0) return [];
  return [
    '\n⚠ Before publishing: these table images still need to reach the live site,',
    '  or the emails you just pushed will go out with broken images.',
    `\n    git add ${[...new Set(paths)].join(' ')}`,
    '    git commit -m "Add table images for Kit emails"',
    '    git push',
  ];
}

const emailPath = ({ sequenceId, emailId }) => `/sequences/${sequenceId}/emails/${emailId}`;

/** What a push would change on one remote email, as lines to print. */
export function describeRemote(pair, remote, html) {
  const lines = [
    `${pairText([pair])} "${remote.subject ?? ''}" (${remote.published ? 'published' : 'draft'})`,
    `  content: ${(remote.content ?? '').length} → ${html.length} chars`,
  ];
  if (remote.has_unpublished_changes) lines.push('  ⚠ Kit already has unpublished changes here; this push replaces them');
  return lines;
}

/** Record `changes` in the post's file and in `post` itself. */
function writePost(post, changes, deps) {
  // kitEmails replaces kitEditUrls, so it takes over that line rather than going at the end.
  const renamed = 'kitEmails' in changes && !/^kitEmails:/m.test(post.raw) ? post.raw.replace(/^kitEditUrls:/m, 'kitEmails:') : post.raw;
  post.raw = setFrontmatter(renamed, changes);
  post.data = { ...post.data, ...changes };
  deps.writeFile(post.file, post.raw);
}

/** The ids to write, keeping the post in sync if it was (a legacy hash becomes a current one). */
function mappingChanges(item) {
  const inSync = syncStatus(item.post) === null;
  return {
    kitEmails: formatKitEmails(item.pairs),
    kitEditUrls: null,
    ...(inSync && { kitSyncHash: syncHash(item.post.raw) }),
  };
}

async function recordFound(plan, { dryRun, yes, deps }) {
  const found = plan.filter((i) => i.found?.length > 0);
  if (found.length === 0 || dryRun) return 0;
  if (!yes && !(await deps.confirm(`\nRecord ${found.length} found email ids in post frontmatter? [y/N]: `))) return 0;
  for (const item of found) writePost(item.post, mappingChanges(item), deps);
  deps.log(`  ✓ Recorded ids in ${found.length} posts`);
  return found.length;
}

/** Convert one post and fetch + back up each of its emails. Throws on failure. */
async function inspectPost(item, { publish, deps }) {
  const html = await deps.toHtml(item.post);
  const images = deps.pendingTableImages(html, item.post);
  if (images.paths.length > 0 && publish) {
    throw new Error(`its table images aren't on rubick.com yet; push them first or drop --publish`);
  }
  const remotes = [];
  for (const pair of item.pairs) {
    const res = await deps.kit.get(emailPath(pair));
    const remote = res.email ?? res;
    const backup = deps.backup(pair, remote, html);
    remotes.push({ pair, remote, backup });
  }
  return { ...item, html, images, remotes };
}

/** Run `step` on each item, logging and collecting failures instead of stopping. */
async function each(items, deps, step) {
  const ok = [];
  const failed = [];
  for (const item of items) {
    try {
      ok.push(await step(item));
    } catch (err) {
      deps.log(`  ✗ ${item.post.slug}: ${err.message}`);
      failed.push({ slug: item.post.slug, error: err.message });
    }
  }
  return { ok, failed };
}

async function inspectAll(pushes, { publish, deps }) {
  deps.log(`\nFetching ${pushes.length} posts' Kit emails (backups go to scripts/kit-backups/)...`);
  return each(pushes, deps, async (item) => {
    const inspected = await inspectPost(item, { publish, deps });
    deps.log(`\n${item.post.slug}`);
    for (const { pair, remote } of inspected.remotes) describeRemote(pair, remote, inspected.html).forEach((l) => deps.log(`  ${l}`));
    if (inspected.images.paths.length > 0) tableImageWarning(inspected.images, item.post.slug).forEach((l) => deps.log(l));
    return inspected;
  });
}

/** PUT the content to every email of a post, then record the hash and ids. */
async function pushPost(item, { publish, deps }) {
  for (const { pair } of item.remotes) {
    await deps.kit.put(emailPath(pair), { content: item.html, ...(publish && { published: true }) });
  }
  writePost(item.post, { ...mappingChanges(item), kitSyncHash: syncHash(item.post.raw) }, deps);
  deps.log(`  ✓ ${item.post.slug} pushed to ${pairText(item.pairs)}`);
  return item;
}

async function runPushes(plan, { dryRun, publish, yes, deps }) {
  const pushes = pick(plan, 'push');
  const none = { pushed: 0, failed: [], unshipped: [] };
  if (pushes.length === 0) return none;
  const inspected = await inspectAll(pushes, { publish, deps });
  const unshipped = inspected.ok.flatMap((i) => i.images.paths);
  if (dryRun || inspected.ok.length === 0) return { ...none, failed: inspected.failed, unshipped };
  const state = publish ? 'and publish them' : 'as unpublished changes';
  if (!yes && !(await deps.confirm(`\nPush ${inspected.ok.length} posts to Kit ${state}? [y/N]: `))) {
    deps.log('Nothing pushed.');
    return { ...none, failed: inspected.failed, unshipped };
  }
  const pushed = await each(inspected.ok, deps, (item) => pushPost(item, { publish, deps }));
  return { pushed: pushed.ok.length, failed: [...inspected.failed, ...pushed.failed], unshipped };
}

/** POST a new email for a post at the end of `sequenceId`, then record it. */
async function createEmail(item, { sequenceId, schedule, publish, deps }) {
  const html = await deps.toHtml(item.post);
  const images = deps.pendingTableImages(html, item.post);
  if (images.paths.length > 0 && publish) throw new Error("its table images aren't on rubick.com yet");
  const body = { subject: String(item.post.data.title ?? item.post.slug), content: html, ...schedule, published: publish };
  const res = await deps.kit.post(`/sequences/${sequenceId}/emails`, body);
  const pairs = [{ sequenceId, emailId: (res.email ?? res).id }];
  writePost(item.post, { kitEmails: formatKitEmails(pairs), kitEditUrls: null, kitSyncHash: syncHash(item.post.raw) }, deps);
  deps.log(`  ✓ Created ${publish ? 'published' : 'draft'} email ${pairText(pairs)} for ${item.post.slug}`);
  return images.paths;
}

const CREATE_PROMPT = (slug) => `\nCreate a Kit email for ${slug}? [y]es / [n]o / [x] never (kitExclude) / [q]uit: `;

/** One create offer. Returns 'created', 'declined', 'excluded' or 'quit'. */
async function offerCreate(item, opts) {
  const { deps } = opts;
  const answer = await deps.choose(CREATE_PROMPT(item.post.slug));
  if (answer === 'q') return { outcome: 'quit' };
  if (answer === 'x') {
    writePost(item.post, { kitExclude: true }, deps);
    deps.log(`  ✓ Marked ${item.post.slug} kitExclude`);
    return { outcome: 'excluded' };
  }
  if (answer !== 'y') return { outcome: 'declined' };
  return { outcome: 'created', unshipped: await createEmail(item, opts) };
}

/**
 * Offer each post without an email, in date order. Declining one holds back the rest, which
 * would land in Kit ahead of it; excluding one doesn't.
 */
async function runCreates(plan, { dryRun, ...opts }) {
  const creates = pick(plan, 'create');
  const totals = { created: 0, failed: [], unshipped: [], quit: false };
  if (creates.length === 0 || dryRun) return totals;
  for (const item of creates) {
    try {
      const { outcome, unshipped = [] } = await offerCreate(item, opts);
      totals.unshipped.push(...unshipped);
      if (outcome === 'created') totals.created++;
      if (outcome === 'quit' || outcome === 'declined') return { ...totals, quit: outcome === 'quit' };
    } catch (err) {
      opts.deps.log(`  ✗ ${item.post.slug}: ${err.message}`);
      totals.failed.push({ slug: item.post.slug, error: err.message });
      return totals;
    }
  }
  return totals;
}

/**
 * One run of kit-sync: print the plan, then (unless `dryRun`, where pushes are only inspected)
 * record found ids, push changed posts after one confirmation, and offer each post without an
 * email as a new one in `sequenceId`. Returns the totals.
 */
export async function runSync({ plan, dryRun = false, publish = false, yes = false, sequenceId, schedule }, deps) {
  const { log } = deps;
  if (dryRun) log('--- DRY RUN (nothing is pushed to Kit or recorded in posts) ---\n');
  describePlan(plan, { publish }).forEach((l) => log(l));
  const recorded = await recordFound(plan, { dryRun, yes, deps });
  const pushes = await runPushes(plan, { dryRun, publish, yes, deps });
  const creates = await runCreates(plan, { dryRun, sequenceId, schedule, publish, deps });
  const failed = [...pushes.failed, ...creates.failed];
  log(`\n${RULE}`);
  log(
    dryRun
      ? `Dry run complete: ${pick(plan, 'push').length - pushes.failed.length} posts would be pushed. No changes made.`
      : `Done. Recorded ids: ${recorded}, pushed: ${pushes.pushed}, created: ${creates.created}, failed: ${failed.length}`
  );
  for (const f of failed) log(`  ✗ ${f.slug}: ${f.error}`);
  unshippedReminder([...pushes.unshipped, ...creates.unshipped]).forEach((l) => log(l));
  return { recorded, pushed: pushes.pushed, created: creates.created, failed, quit: creates.quit };
}
