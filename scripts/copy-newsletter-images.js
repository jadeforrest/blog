import fs from 'fs';
import path from 'path';

/**
 * Publish newsletter (Kit sequence) images to a stable public location while keeping
 * the newsletter Markdown itself private (it is not a content collection and has no route).
 *
 * Source images live co-located beside each email's index.md:
 *   src/content/kit-sequence-<id>/<slug>/<image>
 *
 * They are copied to:
 *   public/newsletter-images/<id>/<slug>/<image>
 *
 * ...so they build to dist/newsletter-images/<id>/<slug>/<image> and serve from
 *   https://www.rubick.com/newsletter-images/<id>/<slug>/<image>
 *
 * This gives Kit-rendered emails a stable rubick.com URL to reference, without
 * publishing the newsletter content as a web page. Today there may be nothing to
 * copy (no co-located images yet) — this is the mechanism for the editing phase.
 *
 * Options:
 *   --force   Re-copy even if the target already exists.
 */

const contentDir = 'src/content';
const publicBase = path.join('public', 'newsletter-images');
const forceRegenerate = process.argv.slice(2).includes('--force');
const IMAGE_RE = /\.(jpg|jpeg|png|gif|webp|svg)$/i;

function findSequenceDirs() {
  if (!fs.existsSync(contentDir)) return [];
  return fs
    .readdirSync(contentDir)
    .map((name) => ({ name, dir: path.join(contentDir, name) }))
    .filter(({ name, dir }) => fs.statSync(dir).isDirectory() && /^kit-sequence-(\d+)$/.test(name))
    .map(({ name, dir }) => ({ dir, sequenceId: name.match(/^kit-sequence-(\d+)$/)[1] }));
}

function copyNewsletterImages() {
  let copied = 0;
  const sequenceDirs = findSequenceDirs();

  for (const { dir, sequenceId } of sequenceDirs) {
    for (const slug of fs.readdirSync(dir)) {
      const slugDir = path.join(dir, slug);
      if (!fs.statSync(slugDir).isDirectory()) continue;

      const images = fs.readdirSync(slugDir).filter((f) => IMAGE_RE.test(f));
      if (images.length === 0) continue;

      const targetDir = path.join(publicBase, sequenceId, slug);
      fs.mkdirSync(targetDir, { recursive: true });

      for (const image of images) {
        const target = path.join(targetDir, image);
        if (forceRegenerate || !fs.existsSync(target)) {
          fs.copyFileSync(path.join(slugDir, image), target);
          copied++;
        }
      }
      console.log(`Published ${images.length} image(s) for ${sequenceId}/${slug}`);
    }
  }

  console.log(`\nNewsletter images: copied ${copied} file(s) from ${sequenceDirs.length} sequence folder(s).`);
}

copyNewsletterImages();
