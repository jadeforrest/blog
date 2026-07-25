import { test } from "node:test";
import assert from "node:assert/strict";
import { compile } from "@mdx-js/mdx";
import remarkLcpImage from "./remark-lcp-image.js";

const build = (body) =>
  compile(
    ["import { Image } from 'astro:assets';", "import img from './x.jpg';", "", body, ""].join("\n"),
    { remarkPlugins: [remarkLcpImage], jsx: true }
  ).then(String);

test("marks the first Image and leaves later ones alone", async () => {
  const out = await build(
    '<Image src={img} alt="a" width={800} />\n\n## H\n\n<Image src={img} alt="b" width={800} />'
  );
  assert.equal(out.match(/priority/g).length, 1);
  assert.match(out, /alt="a"[^/]*priority/);
  assert.match(out, /widths=\{\[400, 700, 800, 1400\]\}/);
  assert.match(out, /sizes="\(min-width: 740px\) 700px, calc\(100vw - 40px\)"/);
});

test("handles a lead paragraph before the image", async () => {
  const out = await build('Intro sentence.\n\n<Image src={img} alt="a" width={800} />');
  assert.match(out, /priority/);
});

test("a post with no Image is a no-op", async () => {
  assert.doesNotMatch(await build("Just words."), /priority/);
});

test("an author-set loading attribute opts the post out", async () => {
  const out = await build('<Image src={img} alt="a" width={800} loading="lazy" />');
  assert.doesNotMatch(out, /priority/);
});

test("author-set sizes and widths are preserved", async () => {
  const out = await build('<Image src={img} alt="a" width={400} sizes="50vw" />');
  assert.match(out, /priority/);
  assert.match(out, /sizes="50vw"/);
  assert.doesNotMatch(out, /sizes="\(min-width/);
});

test("an Image past the window is ignored", async () => {
  const out = await build('a\n\nb\n\nc\n\nd\n\ne\n\n<Image src={img} alt="a" width={800} />');
  assert.doesNotMatch(out, /priority/);
});

test("is idempotent across repeated runs", async () => {
  const src = '<Image src={img} alt="a" width={800} />';
  const once = await build(src);
  const twice = await compile(
    ["import { Image } from 'astro:assets';", "import img from './x.jpg';", "", src, ""].join("\n"),
    { remarkPlugins: [remarkLcpImage, remarkLcpImage], jsx: true }
  ).then(String);
  assert.equal(once.match(/priority/g).length, 1);
  assert.equal(twice.match(/priority/g).length, 1);
});
