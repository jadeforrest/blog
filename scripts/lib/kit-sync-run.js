/**
 * The steps of scripts/kit-sync.js (paste blog posts into Kit's editor), with all I/O
 * passed in so tests can drive it:
 *
 *   readSyncPosts   the posts under a directory, with frontmatter
 *   syncPlan        which posts are mapped, which need syncing, which are refused (pure)
 *   syncPost        one post: convert, copy, open each Kit URL, ask, record the hash
 *   runSync         the whole run, returning { synced, skipped, quit }
 *
 * deps: { log, warn, toHtml, pendingTableImages, copyHtml, openUrl, prompt, writeHash }
 */

import crypto from 'crypto';
import nodeFs from 'fs';
import path from 'path';
import { parseFrontmatter } from './frontmatter.js';

export const RULE = '='.repeat(60);

/** The file content that counts as "what we synced": without the kitSyncHash line itself. */
export function hashableContent(raw) {
  return raw.replace(/^kitSyncHash:.*\n?/m, '');
}

export function syncHash(raw) {
  return crypto.createHash('md5').update(hashableContent(raw)).digest('hex');
}

/** The file with its kitSyncHash replaced, or null when it has no kitSyncHash line. */
export function withHash(content, hash) {
  const line = /^kitSyncHash:.*$/m;
  // Test for the line, not for a change: re-syncing with --force writes the same hash.
  return line.test(content) ? content.replace(line, `kitSyncHash: "${hash}"`) : null;
}

/** Posts with an index.mdx under `postsDir`, sorted by directory. */
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

/** The Kit editor URLs a post is mapped to. */
export function editUrls(post) {
  return String(post.data.kitEditUrls ?? '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
}

/** 'never synced', 'content changed', or null when the stored hash is current. */
export function syncStatus(post) {
  if (!post.data.kitSyncHash) return 'never synced';
  return post.data.kitSyncHash === syncHash(post.raw) ? null : 'content changed';
}

/**
 * A never-synced post becomes a new email at the end of its Kit sequence, so it must not go
 * ahead of an earlier post in that sequence that isn't synced yet and isn't being synced now.
 * `held` maps a sequence URL to the first such post; this records `post` there when it is one.
 */
function sequenceOrderProblems(post, { status, going }, held) {
  if (status !== 'never synced') return [];
  const ahead = [...new Set(editUrls(post).filter((u) => held.has(u)).map((u) => held.get(u)))];
  const problems = ahead.map((slug) => `it would land in Kit ahead of /${slug}/, an earlier post in the same sequence that isn't synced yet`);
  if (!going || problems.length > 0) for (const u of editUrls(post)) if (!held.has(u)) held.set(u, post.slug);
  return problems;
}

/**
 * What a run will do. `problems(post)` lists why a post can't go to Kit yet (the schedule
 * guard); those are refused rather than synced, as are new posts that would land in Kit ahead
 * of an unsynced earlier one. `posts` must be in date order (readSyncPosts sorts them).
 */
export function syncPlan(posts, { force = false, postFilter = null, problems = () => [] } = {}) {
  const mapped = posts.filter((p) => editUrls(p).length > 0);
  const unmapped = posts.filter((p) => editUrls(p).length === 0);
  const held = new Map();
  const candidates = mapped
    .map((post) => {
      const status = syncStatus(post);
      const wanted = (status ?? (force ? 'forced' : null)) && (!postFilter || post.slug.includes(postFilter));
      const own = wanted ? problems(post) : [];
      const order = sequenceOrderProblems(post, { status, going: wanted && own.length === 0 }, held);
      return wanted && { post, status: status ?? 'forced', problems: [...own, ...order] };
    })
    .filter(Boolean);
  return {
    mapped,
    unmapped,
    refused: candidates.filter((c) => c.problems.length > 0),
    toSync: candidates.filter((c) => c.problems.length === 0),
  };
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

/** Warning shown before pasting a post whose table images aren't on the live site yet. */
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
    `    Pasting into Kit now is fine — ${plural(count, 'the image fills in by itself', 'the images fill in by themselves')} once the deploy finishes.`,
    `    Just don't send the email until then.`,
  ];
}

/** The end-of-run reminder about unshipped table images; empty when there are none. */
export function unshippedReminder(paths) {
  if (paths.length === 0) return [];
  return [
    '\n⚠ Before sending: these table images still need to reach the live site,',
    '  or the emails you just pasted will go out with broken images.',
    `\n    git add ${[...new Set(paths)].join(' ')}`,
    '    git commit -m "Add table images for Kit emails"',
    '    git push',
  ];
}

/** Copy, open and confirm one URL. Returns 'done', 'skipped' or 'quit'. */
async function pasteInto(url, html, deps) {
  try {
    deps.copyHtml(html);
    deps.log('  ✓ HTML copied to clipboard');
  } catch (err) {
    deps.warn(`  Error copying to clipboard: ${err.message}`);
    return 'skipped';
  }
  deps.openUrl(url);
  deps.log('  ✓ Opened in browser');
  deps.log('  → Paste (Cmd+V) into the Kit editor');
  const answer = await deps.prompt('  Done? [y]es / [s]kip / [q]uit: ');
  if (answer === 'q') return 'quit';
  if (answer === 'y') return 'done';
  deps.log('  Skipped.');
  return 'skipped';
}

/**
 * Sync one post into each of its Kit URLs. Records the hash only when every URL was
 * confirmed. Returns { skipped, unshipped, quit, synced }.
 */
export async function syncPost(post, deps) {
  const urls = editUrls(post);
  deps.log(`\n${RULE}`);
  deps.log(`Post: ${post.slug}`);
  deps.log(`URLs: ${urls.length}`);

  let html;
  try {
    html = await deps.toHtml(post);
  } catch (err) {
    deps.warn(`  Error converting MDX: ${err.message}`);
    return { skipped: 1, unshipped: [], quit: false, synced: false };
  }

  // Warn before the paste: the missing image is the first thing you'd notice in Kit.
  const images = deps.pendingTableImages(html, post);
  if (images.paths.length > 0) tableImageWarning(images, post.slug).forEach((l) => deps.log(l));

  let skipped = 0;
  for (const [i, url] of urls.entries()) {
    deps.log(`\n[${i + 1}/${urls.length}] ${url}`);
    const outcome = await pasteInto(url, html, deps);
    if (outcome === 'quit') return { skipped, unshipped: images.paths, quit: true, synced: false };
    if (outcome === 'skipped') skipped++;
  }

  if (skipped > 0) {
    deps.log('  Hash not updated (some URLs were skipped).');
    return { skipped, unshipped: images.paths, quit: false, synced: false };
  }
  deps.writeHash(post, syncHash(post.raw));
  deps.log('  ✓ Hash updated');
  return { skipped, unshipped: images.paths, quit: false, synced: true };
}

function logPlan({ posts, plan }, log) {
  log(`Posts: ${posts.length} total, ${plan.mapped.length} mapped, ${plan.unmapped.length} unmapped\n`);
  if (plan.unmapped.length > 0) {
    log('Unmapped posts (no kitEditUrls):');
    for (const p of plan.unmapped) log(`  - ${p.slug}`);
    log('');
  }
  for (const { post, problems } of plan.refused) log(`  ✗ Not syncing ${post.slug}: ${problems.join('; ')}`);
}

/** Sync each post in turn, stopping on quit. */
async function syncAll(toSync, deps) {
  const totals = { synced: 0, skipped: 0, quit: false, unshipped: [] };
  for (const { post } of toSync) {
    const r = await syncPost(post, deps);
    totals.skipped += r.skipped;
    totals.unshipped.push(...r.unshipped);
    if (r.synced) totals.synced++;
    if (r.quit) return { ...totals, quit: true };
  }
  return totals;
}

/**
 * One run of kit-sync. Returns { synced, skipped, quit }; nothing is written in dry-run mode.
 */
export async function runSync({ posts, force, postFilter, dryRun, problems }, deps) {
  const { log } = deps;
  if (dryRun) log('--- DRY RUN MODE ---\n');
  const plan = syncPlan(posts, { force, postFilter, problems });
  logPlan({ posts, plan }, log);
  const none = { synced: 0, skipped: 0, quit: false };
  if (plan.toSync.length === 0) {
    log('All mapped posts are up to date. Nothing to sync.');
    return none;
  }
  log(`Posts to sync: ${plan.toSync.length}`);
  for (const { post, status } of plan.toSync) log(`  - ${post.slug} (${status === 'forced' ? 'content changed' : status})`);
  log('');
  if (dryRun) {
    log('Dry run complete. No changes made.');
    return none;
  }

  const totals = await syncAll(plan.toSync, deps);
  if (totals.quit) log('\nQuitting. Progress saved for completed posts.');
  else log(`\n${RULE}`);
  log(totals.quit ? `Summary: ${totals.synced} synced, ${totals.skipped} skipped` : `Done. Synced: ${totals.synced}, Skipped: ${totals.skipped}`);
  unshippedReminder(totals.unshipped).forEach((l) => log(l));
  return { synced: totals.synced, skipped: totals.skipped, quit: totals.quit };
}
