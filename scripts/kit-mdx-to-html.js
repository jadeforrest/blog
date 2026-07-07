/**
 * MDX → email-compatible HTML conversion pipeline.
 * Exported as a module for use by kit-sync.js.
 */

import { remark } from 'remark';
import remarkHtml from 'remark-html';
import remarkFrontmatter from 'remark-frontmatter';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SITE_URL = 'https://www.rubick.com';

/**
 * Kit's editor strips <style> blocks and class-based CSS on paste, which
 * collapses tables with no inline styling into a wall of concatenated text.
 * Rather than fight Kit's sanitizer, render each <table> to a PNG and swap it
 * for an <img>.
 *
 * The PNG is saved into the post's source directory (alongside index.mdx and
 * its other images), matching where every other post image lives, and then
 * copied into public/ so the absolute rubick.com URL resolves immediately
 * without waiting for the next `npm run dev`/`build` image-copy pass.
 */
async function renderTablesAsImages(html, slug, sourceDir) {
  const tables = html.match(/<table[\s\S]*?<\/table>/g);
  if (!tables) return html;

  const publicOutDir = path.join(PUBLIC_DIR, slug);
  fs.mkdirSync(publicOutDir, { recursive: true });

  const browser = await chromium.launch();
  try {
    for (let i = 0; i < tables.length; i++) {
      const tableHtml = tables[i];
      const filename = `kit-table-${i + 1}.png`;
      const sourcePath = path.join(sourceDir, filename);

      const page = await browser.newPage({ deviceScaleFactor: 2 });
      await page.setContent(
        `<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#fff;` +
        `font-family:Arial,Helvetica,sans-serif;font-size:14px;">${tableHtml}</body></html>`
      );
      const table = await page.$('table');
      await table.screenshot({ path: sourcePath });
      await page.close();

      fs.copyFileSync(sourcePath, path.join(publicOutDir, filename));

      // Rendered at 2x for retina; halve back to CSS pixels for the <img width>.
      const { width } = await sharp(sourcePath).metadata();
      const widthAttr = width ? ` width="${Math.round(width / 2)}"` : '';

      html = html.replace(tableHtml, `<img src="${SITE_URL}/${slug}/${filename}" alt="Table"${widthAttr} />`);
    }
  } finally {
    await browser.close();
  }

  return html;
}

/**
 * Given the raw MDX file content and the post slug, returns email HTML.
 * slug = the clean slug without date prefix (e.g. "equity-benefits-everyone")
 * sourceDir = the post's source directory (contains index.mdx and its images),
 * used to save any generated table screenshots alongside the post's other assets.
 */
export async function mdxToEmailHtml(rawMdx, slug, sourceDir) {
  // 1. Strip frontmatter block
  const withoutFrontmatter = rawMdx.replace(/^---\n[\s\S]*?\n---\n/, '');

  // 2. Pre-process MDX-specific syntax
  let markdown = withoutFrontmatter;

  // Remove import statements
  markdown = markdown.replace(/^import\s+.*$/gm, '');

  // Replace Astro <Image> components with plain <img> tags
  // Handles: <Image src={varName} alt="..." width={400} class="..." />
  // We need to resolve the variable name to a filename.
  // First, collect import mappings: import myImage from './my-image.jpg'
  const importMap = {};
  for (const match of rawMdx.matchAll(/^import\s+(\w+)\s+from\s+['"]\.\/([^'"]+)['"]/gm)) {
    importMap[match[1]] = match[2]; // e.g. { myImage: 'my-image.jpg' }
  }

  // Replace <Image src={varName} ... /> or <Image src={varName} ...>
  markdown = markdown.replace(
    /<Image\s([^>]*?)\/?>(?:<\/Image>)?/gs,
    (match, attrs) => {
      const srcMatch = attrs.match(/src=\{(\w+)\}/);
      const altMatch = attrs.match(/alt=["']([^"']*)["']/);
      const widthMatch = attrs.match(/width=\{?(\d+)\}?/);

      if (!srcMatch) return ''; // can't resolve, drop it

      const varName = srcMatch[1];
      const filename = importMap[varName];
      if (!filename) return ''; // unknown var, drop it

      const src = `${SITE_URL}/${slug}/${filename}`;
      const alt = altMatch ? altMatch[1] : '';
      const width = widthMatch ? ` width="${widthMatch[1]}"` : '';

      return `<img src="${src}" alt="${alt}"${width} />`;
    }
  );

  // Drop remaining JSX components (self-closing or with children)
  // This catches things like <Callout>...</Callout> or <SomeComponent />
  markdown = markdown.replace(/<[A-Z][A-Za-z]*\b[^>]*\/>/g, '');
  markdown = markdown.replace(/<[A-Z][A-Za-z]*\b[^>]*>[\s\S]*?<\/[A-Z][A-Za-z]*>/g, '');

  // Drop JSX-style <style>{`...`}</style> blocks (lowercase, so the regexes above
  // don't catch them). Kit strips <style> tags on paste anyway, so any CSS in here
  // never survives — better to remove it than leak literal `{` / backticks.
  markdown = markdown.replace(/<style>[\s\S]*?<\/style>/g, '');

  // Clean up excess blank lines left by removals
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

  // 3. Convert markdown → HTML
  const processor = remark()
    .use(remarkFrontmatter)
    .use(remarkHtml, { sanitize: false });

  const result = await processor.process(markdown);
  let html = String(result);

  // Rewrite relative <img> src attributes to absolute rubick.com URLs.
  // Astro <Image> components are already resolved to absolute URLs above, but
  // plain markdown images (![alt](file.png)) come out of remark with a relative
  // src, which resolves against app.kit.com once pasted into the Kit editor.
  html = html.replace(/<img([^>]*?)\ssrc="([^"]+)"/g, (match, before, src) => {
    if (/^(https?:)?\/\//.test(src) || src.startsWith('/')) return match;
    return `<img${before} src="${SITE_URL}/${slug}/${src}"`;
  });

  // Add inline borders/padding so the table renders cleanly in the screenshot below.
  html = html.replace(/<table(?![^>]*\bstyle=)([^>]*)>/g,
    '<table$1 border="1" cellspacing="0" cellpadding="8" style="border-collapse:collapse">');
  html = html.replace(/<td style="([^"]*)"/g,
    '<td style="$1;border:1px solid #555;padding:12px 16px;"');
  html = html.replace(/<td(?![^>]*\bstyle=)>/g,
    '<td style="border:1px solid #555;padding:12px 16px;">');

  html = await renderTablesAsImages(html, slug, sourceDir);

  // 4. Wrap with share-link paragraphs
  const postUrl = `${SITE_URL}/${slug}/`;
  const shareLink = `<p>Share this link: <a href="${postUrl}">${postUrl}</a></p>`;

  return `${shareLink}\n${html}\n${shareLink}`;
}
