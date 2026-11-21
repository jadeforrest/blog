import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import {
  emailsBySlug,
  formatKitEmails,
  loadKitIndex,
  mergePairs,
  newEmailSchedule,
  parseKitEmails,
  postSequences,
  shareSlug,
} from "./kit-post-index.js";

// Shapes seen in real Kit emails: the converter's, an old paste, a typo, Kit's own template.
const CONVERTER = '<p>Share this link: <a href="https://www.rubick.com/the-ratchet/">https://www.rubick.com/the-ratchet/</a></p>\n<p>See <a href="https://www.rubick.com/other/">x</a></p>';
const OLD_PASTE = '<style>@media{.a{b:c}}</style><div><p class="">​<a href="https://www.rubick.com/completed-staff-work/" target="_blank">https://www.rubick.com/completed-staff-work/</a>​</p>';
const TYPO = "<table><tr><td><p>Share this post: https://wwww.rubick.com/fan-out-work/</p>";
const UTM = '<div><p>Share this post: <a href="https://www.rubick.com/Advice-For-New-Directors/?utm_source=x">l</a></p>';

test("shareSlug reads the post from the first paragraph's rubick.com link", () => {
  assert.equal(shareSlug(CONVERTER), "the-ratchet");
  assert.equal(shareSlug(OLD_PASTE), "completed-staff-work");
  assert.equal(shareSlug(TYPO), "fan-out-work");
  assert.equal(shareSlug(UTM), "advice-for-new-directors");
});

test("shareSlug finds a share link that comes after an intro paragraph", () => {
  const html = '<p>Last week we talked about <a href="https://www.rubick.com/managing-complexity/">complexity</a>.</p>' +
    '<p>\u200b<a href="https://www.rubick.com/infobits-for-information-flow/?utm_source=x">https://www.rubick.com/infobits-for-information-flow/</a>\u200b</p>';
  assert.equal(shareSlug(html), "infobits-for-information-flow");
});

test("shareSlug: links inside running text, or share links elsewhere, name no post", () => {
  assert.equal(shareSlug('<p>Hi there</p><p>See <a href="https://www.rubick.com/x/">this post</a> too.</p>'), null);
  assert.equal(shareSlug('<p>Read https://www.rubick.com/x/ today</p>'), null);
  assert.equal(shareSlug('<p>Share: <a href="https://www.departmentofproduct.com/blog/rubick/">x</a></p>'), null);
  assert.equal(shareSlug(""), null);
  assert.equal(shareSlug(null), null);
});

test("shareSlug ignores <style> blocks, which can contain paragraph-like text", () => {
  assert.equal(shareSlug('<style>p{}</style><p><a href="//rubick.com/a-b/">//rubick.com/a-b/</a></p>'), "a-b");
});

test("property: kitEmails format and parse round-trip", () => {
  const pair = fc.record({ sequenceId: fc.integer({ min: 1, max: 1e9 }), emailId: fc.integer({ min: 1, max: 1e9 }) });
  fc.assert(fc.property(fc.array(pair, { maxLength: 5 }), (pairs) => {
    assert.deepEqual(parseKitEmails(formatKitEmails(pairs)), pairs.map((p) => ({ ...p })));
  }));
});

test("parseKitEmails skips blanks and anything that isn't sequence/email", () => {
  assert.deepEqual(parseKitEmails(""), []);
  assert.deepEqual(parseKitEmails(undefined), []);
  assert.deepEqual(parseKitEmails(" 1/2 , https://app.kit.com/sequences/1, 3/4"), [
    { sequenceId: 1, emailId: 2 },
    { sequenceId: 3, emailId: 4 },
  ]);
});

test("mergePairs keeps order and adds only new pairs", () => {
  const a = [{ sequenceId: 1, emailId: 2 }];
  const b = [{ sequenceId: 1, emailId: 2 }, { sequenceId: 5, emailId: 6 }];
  assert.deepEqual(mergePairs(a, b), [...a, { sequenceId: 5, emailId: 6 }]);
});

test("postSequences leaves out local-folder, test and ZZ sequences", () => {
  const all = [
    { id: 1, name: "Engineering leadership weekly" },
    { id: 2, name: "Frontline management" },
    { id: 3, name: "Sequence for testing" },
    { id: 4, name: "Test sequence" },
    { id: 5, name: "ZZ Directors" },
  ];
  assert.deepEqual(postSequences(all, ["2"]).map((s) => s.id), [1]);
});

/** A fake GET over `{ [sequenceId]: [emails] }`, two emails per page. */
function fakeKit(seqs) {
  const calls = [];
  const get = async (p) => {
    calls.push(p);
    const one = p.match(/^\/sequences\/(\d+)\/emails\/(\d+)$/);
    if (one) return { email: seqs[one[1]].find((e) => e.id === Number(one[2])) };
    const [, id, query] = p.match(/^\/sequences\/(\d+)\/emails\?(.*)$/);
    const start = Number(new URLSearchParams(query).get("after") ?? 0);
    const all = seqs[id].map(({ content, ...rest }) => rest);
    const more = start + 2 < all.length;
    return { emails: all.slice(start, start + 2), pagination: { has_next_page: more, end_cursor: String(start + 2) } };
  };
  return { get, calls };
}

test("loadKitIndex pages through every email, fetches only uncached ones, and fills the cache", async () => {
  const seqs = {
    9: [
      { id: 1, position: 0, content: CONVERTER },
      { id: 2, position: 1, content: "<p>Welcome</p>" },
      { id: 3, position: 2, content: OLD_PASTE },
    ],
  };
  const kit = fakeKit(seqs);
  const cache = { 1: "the-ratchet", 2: null };
  const { emails, fetched } = await loadKitIndex({ sequences: [{ id: 9 }], get: kit.get, cache });
  assert.equal(fetched, 2);
  assert.deepEqual(emails.map((e) => [e.id, e.slug, e.sequence_id]), [[1, "the-ratchet", 9], [2, null, 9], [3, "completed-staff-work", 9]]);
  assert.deepEqual(cache, { 1: "the-ratchet", 2: null, 3: "completed-staff-work" });
  assert.ok(!kit.calls.includes("/sequences/9/emails/1"));
  // A cached "no post" is checked again.
  assert.ok(kit.calls.includes("/sequences/9/emails/2"));
});

test("emailsBySlug groups a post's emails across sequences and skips non-post emails", () => {
  const map = emailsBySlug([
    { id: 1, sequence_id: 9, slug: "a" },
    { id: 2, sequence_id: 9, slug: null },
    { id: 3, sequence_id: 8, slug: "a" },
  ]);
  assert.deepEqual([...map], [["a", [{ sequenceId: 9, emailId: 1 }, { sequenceId: 8, emailId: 3 }]]]);
});

test("newEmailSchedule copies the sequence's last email, and defaults when it is empty", () => {
  const emails = [
    { sequence_id: 9, position: 5, delay_value: 5, delay_unit: "days", send_days: ["friday"] },
    { sequence_id: 9, position: 2, delay_value: 7, delay_unit: "days", send_days: ["monday"] },
    { sequence_id: 8, position: 9, delay_value: 1, delay_unit: "hours", send_days: null },
  ];
  assert.deepEqual(newEmailSchedule(emails, 9), { delay_value: 5, delay_unit: "days", send_days: ["friday"] });
  // Kit rejects send_days on an hours delay.
  assert.deepEqual(newEmailSchedule(emails, 8), { delay_value: 1, delay_unit: "hours" });
  assert.deepEqual(newEmailSchedule(emails, 7), { delay_value: 7, delay_unit: "days" });
});
