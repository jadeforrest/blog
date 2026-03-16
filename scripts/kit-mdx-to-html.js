/**
 * MDX → email-compatible HTML conversion pipeline.
 * Exported as a module for use by kit-sync.js.
 */

import { remark } from 'remark';
import remarkHtml from 'remark-html';
import remarkFrontmatter from 'remark-frontmatter';
import path from 'path';

const SITE_URL = 'https://www.rubick.com';

/**
 * Given the raw MDX file content and the post slug, returns email HTML.
 * slug = the clean slug without date prefix (e.g. "equity-benefits-everyone")
 */
export async function mdxToEmailHtml(rawMdx, slug) {
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

  // Clean up excess blank lines left by removals
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

  // 3. Convert markdown → HTML
  const processor = remark()
    .use(remarkFrontmatter)
    .use(remarkHtml, { sanitize: false });

  const result = await processor.process(markdown);
  const html = String(result);

  // 4. Wrap with share-link paragraphs
  const postUrl = `${SITE_URL}/${slug}/`;
  const shareLink = `<p>Share this link: <a href="${postUrl}">${postUrl}</a></p>`;

  return `${shareLink}\n${html}\n${shareLink}`;
}
