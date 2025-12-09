import fs from "fs";
import path from "path";
import sharp from "sharp";

/**
 * Copy images from post directories to public output
 * This makes images accessible at /[slug]/[image.png]
 * Generates optimized WebP versions at multiple sizes for all images
 * Creates image-metadata.json with dimensions for responsive loading
 */

const postsDir = "src/content/posts";
const publicDir = "public";

// Responsive sizes for content images (not thumbnails)
const CONTENT_IMAGE_SIZES = [640, 960, 1280];
// Thumbnail sizes for cover images
const THUMBNAIL_SIZES = [240, 400];

// Store image metadata (dimensions) for use in components
const imageMetadata = {};

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

async function generateWebP(sourcePath, targetPath, width) {
  try {
    const info = await sharp(sourcePath)
      .resize(width, null, {
        withoutEnlargement: true,
        fit: "inside",
      })
      .webp({ quality: 85 })
      .toFile(targetPath);
    return { success: true, width: info.width, height: info.height };
  } catch (error) {
    console.error(`Error generating WebP: ${error.message}`);
    return { success: false };
  }
}

async function getImageDimensions(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    return { width: metadata.width, height: metadata.height };
  } catch (error) {
    console.error(`Error reading image dimensions: ${error.message}`);
    return null;
  }
}

async function copyImages() {
  const postDirs = findPostDirectories(postsDir);
  let copiedCount = 0;
  let thumbnailsGenerated = 0;
  let responsiveImagesGenerated = 0;

  for (const { dir, slug } of postDirs) {
    // Extract slug without date prefix
    const cleanSlug = slug.replace(/^\d{4}-\d{2}-\d{2}--/, "");

    // Read all files in post directory
    const files = fs.readdirSync(dir);

    // Find image files (jpg, jpeg, png, gif, webp - exclude svg)
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

      // Process each image
      for (const imageFile of imageFiles) {
        const sourcePath = path.join(dir, imageFile);
        const targetPath = path.join(targetDir, imageFile);
        const baseName = path.parse(imageFile).name;
        const isCover = coverImage && imageFile === coverImage;

        // Copy original
        fs.copyFileSync(sourcePath, targetPath);
        copiedCount++;

        // Get original dimensions for metadata
        const dimensions = await getImageDimensions(sourcePath);
        if (dimensions) {
          const metadataKey = `${cleanSlug}/${imageFile}`;
          imageMetadata[metadataKey] = dimensions;
        }

        // Generate thumbnails for cover images (240px, 400px)
        if (isCover) {
          for (const size of THUMBNAIL_SIZES) {
            const thumbPath = path.join(targetDir, `${baseName}-thumb-${size}.webp`);
            const result = await generateWebP(sourcePath, thumbPath, size);
            if (result.success) {
              thumbnailsGenerated++;
            }
          }
        }

        // Generate responsive WebP versions for all content images
        // (These are larger sizes for images inside blog posts)
        for (const size of CONTENT_IMAGE_SIZES) {
          const webpPath = path.join(targetDir, `${baseName}-${size}.webp`);
          const result = await generateWebP(sourcePath, webpPath, size);
          if (result.success) {
            responsiveImagesGenerated++;
            // Store dimensions for each responsive size
            const metadataKey = `${cleanSlug}/${baseName}-${size}.webp`;
            imageMetadata[metadataKey] = {
              width: result.width,
              height: result.height,
            };
          }
        }
      }

      const suffix = coverImage ? " (with thumbnails)" : "";
      console.log(`Copied ${imageFiles.length} images for ${cleanSlug}${suffix}`);
    }
  }

  console.log(`\nTotal: Copied ${copiedCount} images, generated ${thumbnailsGenerated} thumbnails and ${responsiveImagesGenerated} responsive images from ${postDirs.length} posts`);
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

  // Save image metadata to JSON file for use by components
  const metadataPath = path.join(publicDir, "image-metadata.json");
  fs.writeFileSync(metadataPath, JSON.stringify(imageMetadata, null, 2));
  console.log(`\n✅ Saved image metadata to ${metadataPath}`);
  console.log(`   Total images tracked: ${Object.keys(imageMetadata).length}`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
