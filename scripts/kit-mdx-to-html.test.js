import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mdxToEmailHtml } from './kit-mdx-to-html.js';

// Fixtures below contain no tables, so mdxToEmailHtml never launches the
// Playwright/table-screenshot path — these run fast and offline.
const FRONTMATTER = '---\ntitle: x\n---\n';
const html = (body) => mdxToEmailHtml(FRONTMATTER + body, 'span-of-control', '/tmp');

test('link rewrite: root-relative href → absolute rubick.com URL', async () => {
  // Regression: internal links like [x](/some-post/) leaked into the email as
  // the bare host "http://some-post/" because emails have no base URL.
  const out = await html('[org work](/organizational-work-second-job/)');
  assert.match(out, /<a href="https:\/\/www\.rubick\.com\/organizational-work-second-job\/">org work<\/a>/);
});

test('link rewrite: bare-relative href → domain + slug', async () => {
  // A markdown link to a sibling asset, e.g. [x](file.png "tip").
  const out = await html('[diagram](lines-of-communication.png)');
  assert.match(out, /href="https:\/\/www\.rubick\.com\/span-of-control\/lines-of-communication\.png"/);
});

test('link rewrite: absolute http(s) href is left untouched', async () => {
  const out = await html('[external](https://example.com/foo)');
  assert.match(out, /href="https:\/\/example\.com\/foo"/);
  assert.doesNotMatch(out, /rubick\.com\/span-of-control\/https/);
});

test('link rewrite: mailto and fragment hrefs are left untouched', async () => {
  const out = await html('[mail](mailto:a@b.com) and [top](#section)');
  assert.match(out, /href="mailto:a@b\.com"/);
  assert.match(out, /href="#section"/);
});

test('SpotifyEpisode becomes a link to the episode (emails cannot play an iframe)', async () => {
  const out = await html(
    'Listen:\n\n<SpotifyEpisode src="https://podcasters.spotify.com/pod/show/decodingleadership/embed/episodes/9--Jade-Rubick-on-removing-yourself-as-a-bottleneck-e2m49sf" />\n'
  );
  assert.match(
    out,
    /<a href="https:\/\/creators\.spotify\.com\/pod\/profile\/decodingleadership\/episodes\/9--Jade-Rubick-on-removing-yourself-as-a-bottleneck-e2m49sf">Listen on Spotify: #9 Jade Rubick on removing yourself as a bottleneck<\/a>/
  );
  assert.doesNotMatch(out, /SpotifyEpisode|iframe/);
});
