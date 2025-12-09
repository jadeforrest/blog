import fs from "fs";
import path from "path";
import sharp from "sharp";

/**
 * Copy images from post directories to public output
 * This makes images accessible at /[slug]/[image.png]
 * Also generates optimized WebP thumbnails for cover images
 */

const postsDir = "src/content/posts";
const publicDir = "public";

function findPostDirectories(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory() && file.match(/^\d{4}-\d{2}-\d{2}--/)) {
      results.push({ dir: filePath, slug: file });
    }
  });

  return results;
}

function getCoverImage(dir) {
  // Read the index.mdx or index.md file to find the cover image
  const mdxPath = path.join(dir, "index.mdx");
  const mdPath = path.join(dir, "index.md");
  const filePath = fs.existsSync(mdxPath) ? mdxPath : mdPath;

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  // Match both quoted and unquoted cover values
  const coverMatch = content.match(/cover:\s*['"]?([^'"\n\r]+)['"]?/);
  return coverMatch ? coverMatch[1].trim() : null;
}

async function generateThumbnail(sourcePath, targetPath, width) {
  try {
    await sharp(sourcePath)
      .resize(width, null, {
        withoutEnlargement: true,
        fit: "inside",
      })
      .webp({ quality: 85 })
      .toFile(targetPath);
    return true;
  } catch (error) {
    console.error(`Error generating thumbnail: ${error.message}`);
    return false;
  }
}

async function copyImages() {
  const postDirs = findPostDirectories(postsDir);
  let copiedCount = 0;
  let thumbnailsGenerated = 0;

  for (const { dir, slug } of postDirs) {
    // Extract slug without date prefix
    const cleanSlug = slug.replace(/^\d{4}-\d{2}-\d{2}--/, "");

    // Read all files in post directory
    const files = fs.readdirSync(dir);

    // Find image files (jpg, jpeg, png, gif, webp, svg)
    const imageFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );

    if (imageFiles.length > 0) {
      // Create public directory for this post's images
      const targetDir = path.join(publicDir, cleanSlug);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Get cover image filename
      const coverImage = getCoverImage(dir);

      // Copy each image and generate thumbnails for cover image
      for (const imageFile of imageFiles) {
        const sourcePath = path.join(dir, imageFile);
        const targetPath = path.join(targetDir, imageFile);

        // Copy original
        fs.copyFileSync(sourcePath, targetPath);
        copiedCount++;

        // Generate thumbnails only for cover image
        if (coverImage && imageFile === coverImage && !/\.svg$/i.test(imageFile)) {
          const baseName = path.parse(imageFile).name;

          // Generate 240px thumbnail for mobile
          const thumb240 = path.join(targetDir, `${baseName}-thumb-240.webp`);
          if (await generateThumbnail(sourcePath, thumb240, 240)) {
            thumbnailsGenerated++;
          }

          // Generate 400px thumbnail for desktop
          const thumb400 = path.join(targetDir, `${baseName}-thumb-400.webp`);
          if (await generateThumbnail(sourcePath, thumb400, 400)) {
            thumbnailsGenerated++;
          }
        }
      }

      console.log(`Copied ${imageFiles.length} images for ${cleanSlug}${coverImage ? " (with thumbnails)" : ""}`);
    }
  }

  console.log(`\nTotal: Copied ${copiedCount} images and generated ${thumbnailsGenerated} thumbnails from ${postDirs.length} posts`);
}

function copyAboutPageAssets() {
  // Copy avatar image from old Gatsby content to public/about
  const sourceAvatar = "../content/pages/1--about/avatar-large.jpeg";
  const targetDir = "public/about";
  const targetAvatar = path.join(targetDir, "avatar-large.jpeg");

  if (fs.existsSync(sourceAvatar)) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.copyFileSync(sourceAvatar, targetAvatar);
    console.log("\nCopied avatar image for about page");
  }
}

async function main() {
  await copyImages();
  copyAboutPageAssets();
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
