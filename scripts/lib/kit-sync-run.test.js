import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import fc from "fast-check";
import { parseFrontmatter } from "./frontmatter.js";
import {
  describePlan,
  describeRemote,
  hashableContent,
  legacyHash,
  pendingTableImages,
  readSyncPosts,
  runSync,
  setFrontmatter,
  syncHash,
  syncPlan,
  syncStatus,
  tableImageWarning,
  unshippedReminder,
} from "./kit-sync-run.js";

const raw = (fm, body = "Body") =>
  `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : v}`).join("\n")}\n---\n${body}\n`;

/**
 * A post as readSyncPosts returns it. `emails` is its kitEmails value, `synced` stores the
 * current hash (or the clipboard version's, with `legacy`), `fm` adds frontmatter.
 */
function post(slug, { emails = "", synced = false, legacy = false, body = "Body", date = "2026-11-01", fm = {} } = {}) {
  let text = raw({ title: slug, kitEditUrls: "", ...(emails && { kitEmails: emails }), kitSyncHash: "", ...fm }, body);
  if (synced) text = setFrontmatter(text, { kitSyncHash: legacy ? legacyHash(text) : syncHash(text) });
  return { file: `/posts/${date}--${slug}/index.mdx`, raw: text, data: parseFrontmatter(text).data, slug, dirName: `${date}--${slug}` };
}

const index = (entries) => new Map(Object.entries(entries).map(([slug, ids]) => [slug, ids.map(([s, e]) => ({ sequenceId: s, emailId: e }))]));
const actions = (plan) => Object.fromEntries(plan.map((i) => [i.post.slug, i.action]));

// --- hashing and frontmatter ---

test("property: syncHash ignores every Kit bookkeeping line, and only those", () => {
  const key = fc.constantFrom("kitSyncHash", "kitSyncedAt", "kitEmails", "kitEditUrls", "kitExclude");
  fc.assert(
    fc.property(key, fc.stringMatching(/^[a-z0-9/ ,]{0,20}$/), fc.string({ maxLength: 40 }), (k, value, body) => {
      const text = raw({ title: "t" }, body.replace(/^kit/gm, ""));
      assert.equal(syncHash(setFrontmatter(text, { [k]: value })), syncHash(text));
      assert.notEqual(syncHash(setFrontmatter(text, { title: `${value}!` })), syncHash(text));
    }),
  );
});

test("syncHash depends on the sync format, so bumping it re-syncs everything", () => {
  const text = raw({ title: "t" });
  assert.notEqual(syncHash(text), legacyHash(text));
  assert.equal(hashableContent('---\nkitEmails: "1/2"\ntitle: t\n---\n'), "---\ntitle: t\n---\n");
});

test("syncStatus: never synced, changed, in sync, and in sync by the clipboard version's hash", () => {
  assert.equal(syncStatus(post("a")), "never synced");
  assert.equal(syncStatus(post("a", { synced: true })), null);
  assert.equal(syncStatus(post("a", { synced: true, legacy: true })), null);
  const p = post("a", { synced: true });
  assert.equal(syncStatus({ ...p, raw: `${p.raw}more` }), "content changed");
});

test("setFrontmatter edits lines in place, appends new keys, removes nulls, keeps the body", () => {
  const text = '---\ntitle: "T"\nkitEditUrls: ""\ntags: ["a"]\n---\n---\nbody kitEditUrls: x\n';
  const out = setFrontmatter(text, { title: "New", kitEditUrls: null, kitExclude: true });
  assert.equal(out, '---\ntitle: "New"\ntags: ["a"]\nkitExclude: true\n---\n---\nbody kitEditUrls: x\n');
  assert.throws(() => setFrontmatter("no block", { a: 1 }), /no frontmatter/);
});

test("setFrontmatter keeps replacement patterns like $& literal (found by the property below)", () => {
  assert.equal(parseFrontmatter(setFrontmatter(raw({ title: "t" }), { title: "$& $1 $$" })).data.title, "$& $1 $$");
});

test("property: setFrontmatter then parse gives back the values set", () => {
  const value = fc.oneof(fc.string({ maxLength: 20 }), fc.boolean());
  fc.assert(
    fc.property(fc.dictionary(fc.constantFrom("kitEmails", "kitSyncHash", "kitExclude", "title"), value), (changes) => {
      const { data, content } = parseFrontmatter(setFrontmatter(raw({ title: "t", kitSyncHash: "" }), changes));
      for (const [k, v] of Object.entries(changes)) assert.deepEqual(data[k], v);
      assert.equal(content, "Body\n");
    }),
  );
});

test("readSyncPosts reads index.mdx posts, sorted, with slugs", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kit-sync-"));
  for (const d of ["2026-02-01--b", "2026-01-01--a", "2026-03-01--no-index"]) fs.mkdirSync(path.join(dir, d));
  fs.writeFileSync(path.join(dir, "2026-02-01--b", "index.mdx"), raw({ title: "B" }));
  fs.writeFileSync(path.join(dir, "2026-01-01--a", "index.mdx"), raw({ title: "A" }));
  const posts = readSyncPosts(dir);
  assert.deepEqual(posts.map((p) => [p.slug, p.data.title]), [["a", "A"], ["b", "B"]]);
});

// --- planning ---

test("syncPlan: push, create, in sync, excluded and refused posts", () => {
  const posts = [
    post("changed", { emails: "1/10" }),
    post("current", { emails: "1/11", synced: true }),
    post("excluded", { fm: { kitExclude: true } }),
    post("soon", { emails: "1/12" }),
    post("new-one"),
  ];
  const plan = syncPlan(posts, { problems: (p) => (p.slug === "soon" ? ["not live"] : []) });
  assert.deepEqual(actions(plan), { changed: "push", current: "none", excluded: "excluded", soon: "refused", "new-one": "create" });
  assert.deepEqual(plan[3].problems, ["not live"]);
});

test("syncPlan: ids found in Kit are added to the post's own, and listed as found", () => {
  const posts = [post("a", { emails: "1/10" }), post("b", { synced: true, legacy: true })];
  const plan = syncPlan(posts, { index: index({ a: [[1, 10], [2, 20]], b: [[1, 30]] }) });
  assert.deepEqual(plan[0].found, [{ sequenceId: 2, emailId: 20 }]);
  assert.equal(plan[0].pairs.length, 2);
  // A post pasted by the clipboard version is in sync once found: nothing to push.
  assert.deepEqual([plan[1].action, plan[1].found], ["none", [{ sequenceId: 1, emailId: 30 }]]);
});

test("syncPlan: --post limits pushes, creates and found ids to matching posts; --force pushes in-sync ones", () => {
  const posts = [post("a", { synced: true, emails: "1/1" }), post("b", { emails: "1/2" })];
  const plan = syncPlan(posts, { index: index({ b: [[3, 3]] }), postFilter: "a", force: true });
  assert.deepEqual(actions(plan), { a: "push", b: "none" });
  assert.equal(plan[0].status, "forced");
  assert.deepEqual(plan[1].found, []);
});

test("syncPlan order: a post without an email that isn't being created holds back later new ones", () => {
  const notLive = (p) => (p.slug === "soon" ? ["not live"] : []);
  assert.deepEqual(actions(syncPlan([post("soon"), post("later")], { problems: notLive })), { soon: "refused", later: "refused" });
  assert.match(syncPlan([post("old"), post("later")], { postFilter: "later" })[1].problems[0], /ahead of \/old\//);
  // Excluded posts and posts already in Kit hold nothing back.
  const fine = [post("x", { fm: { kitExclude: true } }), post("y", { emails: "1/1", synced: true }), post("z")];
  assert.equal(syncPlan(fine)[2].action, "create");
});

test("property: syncPlan never offers a new email ahead of an earlier post that has none", () => {
  const spec = fc.record({ kind: fc.constantFrom("mapped", "new", "excluded"), bad: fc.boolean() });
  fc.assert(
    fc.property(fc.array(spec, { maxLength: 8 }), fc.option(fc.nat(7), { nil: null }), (specs, chosen) => {
      const posts = specs.map((s, i) =>
        post(`p${i}-`, { emails: s.kind === "mapped" ? `1/${i + 1}` : "", fm: s.kind === "excluded" ? { kitExclude: true } : {} }));
      const plan = syncPlan(posts, { postFilter: chosen === null ? null : `p${chosen}-`, problems: (p) => (specs[parseInt(p.slug.slice(1))].bad ? ["x"] : []) });
      return plan.every((item, i) =>
        item.action !== "create" || plan.slice(0, i).every((q) => q.action === "create" || q.action === "excluded" || q.pairs.length > 0));
    }),
  );
});

test("describePlan summarises each kind and says how pushes land", () => {
  const plan = syncPlan([post("a", { emails: "1/2" }), post("b"), post("c", { emails: "1/3" })], {
    index: index({ c: [[4, 5]] }),
    problems: (p) => (p.slug === "c" ? ["not live"] : []),
  });
  const text = describePlan(plan).join("\n");
  assert.match(text, /1 to push, 1 not in Kit, 1 refused/);
  assert.match(text, /\+ c → 4\/5/);
  assert.match(text, /- a → 1\/2 \(never synced\)/);
  assert.match(text, /unpublished changes; --publish makes them live/);
  assert.match(text, /\? b/);
  assert.match(text, /✗ Not syncing c: not live/);
  assert.match(describePlan(plan, { publish: true }).join("\n"), /To push \(published\)/);
});

test("describeRemote warns when Kit already holds unpublished changes", () => {
  const lines = describeRemote({ sequenceId: 1, emailId: 2 }, { subject: "S", published: true, content: "abc", has_unpublished_changes: true }, "abcdef");
  assert.deepEqual(lines.slice(0, 2), ['1/2 "S" (published)', "  content: 3 → 6 chars"]);
  assert.match(lines[2], /already has unpublished changes/);
  assert.equal(describeRemote({ sequenceId: 1, emailId: 2 }, { subject: "S" }, "").length, 2);
});

// --- messages and table images ---

test("tableImageWarning: singular and plural wording", () => {
  const one = tableImageWarning({ count: 1, paths: ["p/a.png"] }, "slug").join("\n");
  assert.match(one, /The table in this post was rendered as an image, and it isn't on rubick.com yet/);
  assert.match(one, /git commit -m "Add table image for slug"/);
  assert.match(one, /the image fills in by itself/);
  assert.match(one, /--publish is refused until then/);
  const two = tableImageWarning({ count: 2, paths: ["a", "b"] }, "slug").join("\n");
  assert.match(two, /The 2 tables in this post were rendered as images, and they aren't/);
  assert.match(two, /the images fill in by themselves/);
});

test("unshippedReminder: nothing when shipped, de-duplicated paths otherwise", () => {
  assert.deepEqual(unshippedReminder([]), []);
  assert.ok(unshippedReminder(["a", "b", "a"]).includes("\n    git add a b"));
});

const TABLE_HTML = '<img src="https://www.rubick.com/x/kit-table-1.png"><img src="https://www.rubick.com/x/kit-table-2.png">';

test("pendingTableImages: no tables means nothing to check", () => {
  const git = () => assert.fail("git should not run");
  assert.deepEqual(pendingTableImages("<p>hi</p>", post("x"), { exists: () => true, git }), { count: 0, paths: [] });
});

test("pendingTableImages: shipped tables need nothing; uncommitted or unpushed ones are listed", () => {
  const p = post("x");
  const exists = (f) => f.startsWith("public/");
  const gitWith = (status, log) => (cmd) => (cmd.startsWith("status") ? status : log);
  assert.deepEqual(pendingTableImages(TABLE_HTML, p, { exists, git: gitWith("", "") }), { count: 2, paths: [] });
  const expected = { count: 2, paths: ["public/x/kit-table-1.png", "public/x/kit-table-2.png"] };
  assert.deepEqual(pendingTableImages(TABLE_HTML, p, { exists, git: gitWith("?? f", "") }), expected);
  assert.deepEqual(pendingTableImages(TABLE_HTML, p, { exists, git: gitWith("", "abc commit") }), expected);
});

test("pendingTableImages: checks both copies of each table", () => {
  const seen = [];
  pendingTableImages(TABLE_HTML.split("><")[0] + ">", post("x"), { exists: (f) => seen.push(f) && true, git: () => "" });
  assert.deepEqual(seen, ["public/x/kit-table-1.png", "src/content/posts/2026-11-01--x/kit-table-1.png"]);
});

// --- running ---

/**
 * Fake deps over an in-memory Kit. `confirms` / `choices` are the answers in order;
 * `failPut` makes PUTs to that email id throw; `images` is what pendingTableImages returns.
 */
function fakeDeps({ confirms = [], choices = [], failPut = null, images = { count: 0, paths: [] }, remote = {} } = {}) {
  const calls = { logs: [], gets: [], puts: [], posts: [], writes: {}, backups: [], prompts: [] };
  const confirmQ = [...confirms];
  const choiceQ = [...choices];
  const deps = {
    log: (m) => calls.logs.push(m),
    toHtml: async (p) => {
      if (p.slug.includes("broken")) throw new Error("bad mdx");
      return `<p>${p.slug}</p>`;
    },
    pendingTableImages: () => images,
    kit: {
      get: async (p) => (calls.gets.push(p), { email: { subject: "S", published: true, content: "old", ...remote } }),
      put: async (p, body) => {
        if (failPut && p.endsWith(`/${failPut}`)) throw new Error("422 nope");
        calls.puts.push([p, body]);
        return { email: {} };
      },
      post: async (p, body) => (calls.posts.push([p, body]), { email: { id: 999 } }),
    },
    backup: (pair) => (calls.backups.push(pair), `/b/${pair.emailId}`),
    confirm: async (q) => (calls.prompts.push(q), confirmQ.shift() ?? false),
    choose: async (q) => (calls.prompts.push(q), choiceQ.shift() ?? "n"),
    writeFile: (file, text) => (calls.writes[file] = text),
  };
  return { calls, deps };
}

const run = (posts, opts = {}, depOpts = {}) => {
  const { calls, deps } = fakeDeps(depOpts);
  const plan = syncPlan(posts, { index: opts.index, problems: opts.problems });
  return runSync({ plan, sequenceId: 7, schedule: { delay_value: 5, delay_unit: "days" }, ...opts }, deps).then((result) => ({ result, calls }));
};
const written = (calls, p) => parseFrontmatter(calls.writes[p.file]).data;

test("runSync dry run: inspects and backs up, but writes and pushes nothing", async () => {
  const p = post("a", { emails: "1/2" });
  const { result, calls } = await run([p, post("b")], { dryRun: true, index: index({ a: [[3, 4]] }) });
  assert.deepEqual(calls.gets, ["/sequences/1/emails/2", "/sequences/3/emails/4"]);
  assert.equal(calls.backups.length, 2);
  assert.deepEqual([calls.puts, calls.posts, calls.writes, calls.prompts], [[], [], {}, []]);
  assert.match(calls.logs.join("\n"), /Dry run complete: 1 posts would be pushed/);
  assert.equal(result.pushed, 0);
});

test("runSync: records found ids, pushes content only, and records the hash", async () => {
  const p = post("a");
  const { result, calls } = await run([p], { index: index({ a: [[1, 2]] }) }, { confirms: [true, true] });
  assert.deepEqual(calls.puts, [["/sequences/1/emails/2", { content: "<p>a</p>" }]]);
  const data = written(calls, p);
  assert.equal(data.kitEmails, "1/2");
  assert.equal("kitEditUrls" in data, false);
  assert.equal(data.kitSyncHash, syncHash(calls.writes[p.file]));
  // kitEmails takes kitEditUrls' place rather than going to the end.
  assert.match(calls.writes[p.file], /title: "a"\nkitEmails: "1\/2"\n/);
  assert.deepEqual([result.recorded, result.pushed], [1, 1]);
});

test("runSync: --publish sends published: true; --yes skips both confirmations", async () => {
  const { calls } = await run([post("a")], { index: index({ a: [[1, 2]] }), publish: true, yes: true });
  assert.deepEqual(calls.puts[0][1], { content: "<p>a</p>", published: true });
  assert.equal(calls.prompts.filter((q) => /\[y\/N\]/.test(q)).length, 0);
});

test("runSync: declining the push leaves Kit and the hash alone", async () => {
  const p = post("a", { emails: "1/2" });
  const { calls } = await run([p], {}, { confirms: [false] });
  assert.deepEqual([calls.puts, calls.writes], [[], {}]);
  assert.ok(calls.logs.includes("Nothing pushed."));
});

test("runSync: a post with a failing email keeps its old hash; others still push", async () => {
  const a = post("a", { emails: "1/2, 1/3" });
  const b = post("b", { emails: "1/4" });
  const { result, calls } = await run([a, b], { yes: true }, { failPut: 3 });
  assert.equal(calls.writes[a.file], undefined);
  assert.ok(calls.writes[b.file]);
  assert.deepEqual(result.failed, [{ slug: "a", error: "422 nope" }]);
});

test("runSync: a conversion error fails that post before anything is fetched", async () => {
  const { result, calls } = await run([post("broken", { emails: "1/2" })], { yes: true });
  assert.deepEqual([calls.gets, result.failed[0].error], [[], "bad mdx"]);
});

test("runSync: unshipped table images warn, and refuse --publish", async () => {
  const images = { count: 1, paths: ["public/a/kit-table-1.png"] };
  const draft = await run([post("a", { emails: "1/2" })], { yes: true }, { images });
  assert.equal(draft.calls.puts.length, 1);
  assert.match(draft.calls.logs.join("\n"), /Before publishing: these table images/);
  const live = await run([post("a", { emails: "1/2" })], { yes: true, publish: true }, { images });
  assert.deepEqual(live.calls.puts, []);
  assert.match(live.result.failed[0].error, /table images aren't on rubick.com yet/);
});

test("runSync creates: yes posts a draft with the title and schedule, x excludes, n stops the rest", async () => {
  const [a, b, c, d] = [post("a"), post("b"), post("c"), post("d")];
  const { result, calls } = await run([a, b, c, d], {}, { choices: ["y", "x", "n"] });
  assert.deepEqual(calls.posts, [["/sequences/7/emails", { subject: "a", content: "<p>a</p>", delay_value: 5, delay_unit: "days", published: false }]]);
  assert.equal(written(calls, a).kitEmails, "7/999");
  assert.equal(written(calls, a).kitSyncHash, syncHash(calls.writes[a.file]));
  assert.equal(written(calls, b).kitExclude, true);
  // c was declined, so d (which would land ahead of it) isn't offered.
  assert.equal(calls.prompts.filter((q) => /Create a Kit email/.test(q)).length, 3);
  assert.deepEqual([result.created, result.quit], [1, false]);
});

test("runSync creates: q quits, --publish creates it live, and a failed create stops the offers", async () => {
  const quit = await run([post("a"), post("b")], {}, { choices: ["q"] });
  assert.deepEqual([quit.calls.posts, quit.result.quit], [[], true]);
  const live = await run([post("a")], { publish: true }, { choices: ["y"] });
  assert.equal(live.calls.posts[0][1].published, true);
  const failed = await run([post("broken"), post("b")], {}, { choices: ["y", "y"] });
  assert.deepEqual([failed.calls.posts, failed.result.failed[0].slug], [[], "broken"]);
});
