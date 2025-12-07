import fs from "fs";
import path from "path";

/**
 * Copy images from post directories to public output
 * This makes images accessible at /[slug]/[image.png]
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

function copyImages() {
  const postDirs = findPostDirectories(postsDir);
  let copiedCount = 0;

  postDirs.forEach(({ dir, slug }) => {
    // Extract slug without date prefix
    const cleanSlug = slug.replace(/^\d{4}-\d{2}-\d{2}--/, "");

    // Read all files in post directory
    const files = fs.readdirSync(dir);

    // Find image files (jpg, jpeg, png, gif, webp, svg)
    const imageFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)
    );

    if (imageFiles.length > 0) {
      // Create public directory for this post's images
      const targetDir = path.join(publicDir, cleanSlug);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Copy each image
      imageFiles.forEach((imageFile) => {
        const sourcePath = path.join(dir, imageFile);
        const targetPath = path.join(targetDir, imageFile);

        fs.copyFileSync(sourcePath, targetPath);
        copiedCount++;
      });

      console.log(`Copied ${imageFiles.length} images for ${cleanSlug}`);
    }
  });

  console.log(`\nTotal: Copied ${copiedCount} images from ${postDirs.length} posts`);
}

copyImages();
