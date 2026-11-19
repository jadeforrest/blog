import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import fc from "fast-check";
import {
  episodeLabel,
  parseSpotifyEmbed,
  slugTitle,
  spotifyEpisodeToMarkdown,
} from "./spotify-embed.js";

const PROFILE = "https://creators.spotify.com/pod/profile/decodingleadership";

test("old podcasters/show URLs normalise to the final creators/profile URL (no redirects)", () => {
  const e = parseSpotifyEmbed(
    "https://podcasters.spotify.com/pod/show/decodingleadership/embed/episodes/10--Jade-Rubick-on-preventing-incidents-e2mjolc/a-abf5trv"
  );
  assert.deepEqual(e, {
    embedUrl: `${PROFILE}/embed/episodes/10--Jade-Rubick-on-preventing-incidents-e2mjolc/a-abf5trv`,
    pageUrl: `${PROFILE}/episodes/10--Jade-Rubick-on-preventing-incidents-e2mjolc`,
    title: "#10 Jade Rubick on preventing incidents",
  });
});

test("open.spotify.com embeds keep /video, drop the query and have no title", () => {
  assert.deepEqual(
    parseSpotifyEmbed("https://open.spotify.com/embed/episode/3cMqA8dqblT1Ux6qms8K8v/video?utm_source=generator"),
    {
      embedUrl: "https://open.spotify.com/embed/episode/3cMqA8dqblT1Ux6qms8K8v/video",
      pageUrl: "https://open.spotify.com/episode/3cMqA8dqblT1Ux6qms8K8v",
      title: null,
    }
  );
});

test("non-embed URLs are rejected", () => {
  for (const src of [
    "",
    "https://example.com/embed/episode/abc",
    "http://open.spotify.com/embed/episode/abc",
    "https://open.spotify.com/episode/abc",
    `${PROFILE}/episodes/9--x-e2m49sf`,
    "https://evil.spotify.com.example.com/pod/show/x/embed/episodes/y",
  ]) {
    assert.equal(parseSpotifyEmbed(src), null, src);
  }
});

test("slugTitle: double dashes are commas, the Anchor id is dropped", () => {
  assert.equal(
    slugTitle("14--Alex-Kroman-on-building-strong-leadership-teams--product-taste--and-neurodivergent-mode-e2or5cp"),
    "#14 Alex Kroman on building strong leadership teams, product taste, and neurodivergent mode"
  );
  assert.equal(slugTitle("1-Alexa-Stefanko-on-the-model-e2hlbik"), "#1 Alexa Stefanko on the model");
  assert.equal(slugTitle("no-number-e2hlbik"), null);
});

test("episodeLabel prefers an explicit title, then the slug title, then a generic label", () => {
  assert.equal(episodeLabel({ title: "#9 X" }, "Given"), "Listen on Spotify: Given");
  assert.equal(episodeLabel({ title: "#9 X" }), "Listen on Spotify: #9 X");
  assert.equal(episodeLabel({ title: null }), "Listen to this episode on Spotify");
});

test("spotifyEpisodeToMarkdown makes a link, honours title, drops what it can't parse", () => {
  assert.equal(
    spotifyEpisodeToMarkdown(
      '<SpotifyEpisode src="https://open.spotify.com/embed/episode/abc123" title="Jim [Shore]" height={152} />'
    ),
    "[Listen on Spotify: Jim Shore](https://open.spotify.com/episode/abc123)"
  );
  assert.equal(spotifyEpisodeToMarkdown('<SpotifyEpisode src="https://example.com/x" />'), "");
  assert.equal(spotifyEpisodeToMarkdown("<SpotifyEpisode />"), "");
});

test("every SpotifyEpisode in the posts has a parseable src", () => {
  const root = path.join(import.meta.dirname, "../../src/content");
  const srcs = fs
    .readdirSync(root, { recursive: true })
    .filter((f) => f.endsWith(".mdx"))
    .flatMap((f) => [...fs.readFileSync(path.join(root, f), "utf8").matchAll(/<SpotifyEpisode\b[^>]*\bsrc="([^"]*)"/g)])
    .map((m) => m[1]);
  assert.ok(srcs.length >= 20, `found ${srcs.length}`);
  for (const src of srcs) assert.ok(parseSpotifyEmbed(src), src);
});

// Generated Anchor-style URLs in every historical host/path shape.
const word = fc.stringMatching(/^[A-Za-z0-9]{1,8}$/);
const slug = fc
  .tuple(fc.nat(99), fc.array(word, { minLength: 1, maxLength: 6 }), fc.stringMatching(/^e[a-z0-9]{6}$/))
  .map(([n, words, id]) => `${n}--${words.join("-")}-${id}`);
const creatorsUrl = fc
  .record({
    host: fc.constantFrom("podcasters", "creators"),
    kind: fc.constantFrom("show", "profile"),
    show: fc.stringMatching(/^[a-z0-9-]{1,20}$/),
    slug,
    audio: fc.option(fc.stringMatching(/^a-[a-z0-9]{7}$/), { nil: undefined }),
  })
  .map(({ host, kind, show, slug, audio }) => ({
    url: `https://${host}.spotify.com/pod/${kind}/${show}/embed/episodes/${slug}${audio ? `/${audio}` : ""}`,
    show,
    slug,
  }));
const openUrl = fc
  .tuple(fc.stringMatching(/^[A-Za-z0-9]{22}$/), fc.boolean(), fc.option(fc.stringMatching(/^[a-z_=]{0,20}$/)))
  .map(([id, video, q]) => `https://open.spotify.com/embed/episode/${id}${video ? "/video" : ""}${q === null ? "" : `?${q}`}`);

test("property: every shape parses to a canonical, idempotent embed URL and a clean page URL", () => {
  fc.assert(
    fc.property(creatorsUrl, ({ url, show, slug }) => {
      const e = parseSpotifyEmbed(url);
      assert.ok(e.embedUrl.startsWith(`https://creators.spotify.com/pod/profile/${show}/embed/episodes/${slug}`));
      assert.equal(e.pageUrl, `https://creators.spotify.com/pod/profile/${show}/episodes/${slug}`);
      assert.deepEqual(parseSpotifyEmbed(e.embedUrl), e);
      assert.ok(e.title.startsWith("#"));
    })
  );
  fc.assert(
    fc.property(openUrl, (url) => {
      const e = parseSpotifyEmbed(url);
      assert.deepEqual(parseSpotifyEmbed(e.embedUrl), e);
      assert.doesNotMatch(e.embedUrl + e.pageUrl, /\?/);
      assert.doesNotMatch(e.pageUrl, /embed|video/);
    })
  );
});

test("property: arbitrary strings never throw and only https Spotify URLs are accepted", () => {
  fc.assert(
    fc.property(fc.oneof(fc.string(), fc.webUrl()), (s) => {
      const e = parseSpotifyEmbed(s);
      if (e) assert.match(e.embedUrl, /^https:\/\/(creators|open)\.spotify\.com\//);
      assert.equal(typeof spotifyEpisodeToMarkdown(`<SpotifyEpisode src="${s}" />`), "string");
    })
  );
});
