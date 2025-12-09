import fs from "fs";
import path from "path";
import sharp from "sharp";

/**
 * Copy images from post directories to public output
 * This makes images accessible at /[slug]/[image.png]
 * Generates optimized WebP versions at multiple sizes for all images
 * Creates image-metadata.json with dimensions for responsive loading
 *
 * Options:
 *   --force   Regenerate all images even if they exist
 *   --clean   Remove old generated image directories for deleted posts
 */

const postsDir = "src/content/posts";
const publicDir = "public";

// Parse command line arguments
const args = process.argv.slice(2);
const forceRegenerate = args.includes("--force");
const cleanOldImages = args.includes("--clean");

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

async function generateWebP(sourcePath, targetPath, width, quality = 85) {
  // Skip if file exists and not forcing regeneration
  if (!forceRegenerate && fs.existsSync(targetPath)) {
    try {
      const metadata = await sharp(targetPath).metadata();
      return { success: true, width: metadata.width, height: metadata.height, skipped: true };
    } catch (error) {
      // If file exists but is corrupt, regenerate it
      console.warn(`Existing file corrupt, regenerating: ${targetPath}`);
    }
  }

  try {
    const info = await sharp(sourcePath)
      .resize(width, null, {
        withoutEnlargement: true,
        fit: "inside",
      })
      .webp({ quality })
      .toFile(targetPath);
    return { success: true, width: info.width, height: info.height, skipped: false };
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
  let thumbnailsSkipped = 0;
  let responsiveImagesGenerated = 0;
  let responsiveImagesSkipped = 0;
  const activeSlugs = new Set();

  for (const { dir, slug } of postDirs) {
    // Extract slug without date prefix
    const cleanSlug = slug.replace(/^\d{4}-\d{2}-\d{2}--/, "");
    activeSlugs.add(cleanSlug);

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

        // Copy original if it doesn't exist or if forcing
        if (forceRegenerate || !fs.existsSync(targetPath)) {
          fs.copyFileSync(sourcePath, targetPath);
          copiedCount++;
        }

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
              if (result.skipped) {
                thumbnailsSkipped++;
              } else {
                thumbnailsGenerated++;
              }
            }
          }
        }

        // Generate responsive WebP versions for all content images
        // (These are larger sizes for images inside blog posts)
        for (const size of CONTENT_IMAGE_SIZES) {
          const webpPath = path.join(targetDir, `${baseName}-${size}.webp`);
          const result = await generateWebP(sourcePath, webpPath, size);
          if (result.success) {
            if (result.skipped) {
              responsiveImagesSkipped++;
            } else {
              responsiveImagesGenerated++;
            }
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
      console.log(`Processed ${imageFiles.length} images for ${cleanSlug}${suffix}`);
    }
  }

  console.log(`\nTotal: Copied ${copiedCount} images, generated ${thumbnailsGenerated} thumbnails (${thumbnailsSkipped} skipped) and ${responsiveImagesGenerated} responsive images (${responsiveImagesSkipped} skipped) from ${postDirs.length} posts`);

  return activeSlugs;
}

function cleanOldDirectories(activeSlugs) {
  // Safety check: ensure publicDir is set and is a valid path
  if (!publicDir || publicDir === '/' || publicDir === '.') {
    console.error('ERROR: Invalid publicDir path for cleanup');
    return;
  }

  // Get all directories in public/ that look like blog post slug directories
  // (exclude special directories like 'about', 'images', etc.)
  const excludedDirs = new Set(['about', 'images', 'wiki', 'tags', 'static', 'fonts', 'css', 'js']);

  if (!fs.existsSync(publicDir)) {
    return;
  }

  // Resolve to absolute path for safety checks
  const absolutePublicDir = path.resolve(publicDir);
  const publicContents = fs.readdirSync(publicDir);
  let removedCount = 0;

  for (const item of publicContents) {
    // Safety check: prevent path traversal
    if (item.includes('..') || item.includes('/') || item.includes('\\')) {
      console.warn(`Skipping suspicious path: ${item}`);
      continue;
    }

    const itemPath = path.join(publicDir, item);
    const absoluteItemPath = path.resolve(itemPath);

    // Safety check: ensure the path is actually within publicDir
    if (!absoluteItemPath.startsWith(absolutePublicDir + path.sep)) {
      console.error(`ERROR: Path ${item} is outside public directory, skipping`);
      continue;
    }

    // Safety check: ensure we're not deleting publicDir itself
    if (absoluteItemPath === absolutePublicDir) {
      console.error('ERROR: Attempted to delete public directory itself, skipping');
      continue;
    }

    const stat = fs.statSync(itemPath);

    // Only check directories, and skip excluded ones
    if (stat.isDirectory() && !excludedDirs.has(item) && !activeSlugs.has(item)) {
      // Check if directory contains generated image files (webp)
      const dirContents = fs.readdirSync(itemPath);
      const hasGeneratedImages = dirContents.some(file => file.endsWith('.webp'));

      if (hasGeneratedImages) {
        // Final safety check: ensure path depth is reasonable (should be public/slug-name)
        const relativePath = path.relative(publicDir, itemPath);
        const pathDepth = relativePath.split(path.sep).length;

        if (pathDepth !== 1) {
          console.warn(`Skipping unexpected path depth: ${relativePath}`);
          continue;
        }

        console.log(`Removing old directory: ${item}`);
        fs.rmSync(itemPath, { recursive: true, force: true });
        removedCount++;
      }
    }
  }

  if (removedCount > 0) {
    console.log(`\n🧹 Cleaned ${removedCount} old image directories`);
  } else {
    console.log(`\n🧹 No old directories to clean`);
  }
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

async function generateStaticImageWebP() {
  console.log("\n📸 Processing static images");
  let generated = 0;
  let skipped = 0;

  // Process avatar.jpg in public/images (header image - small, default quality is fine)
  const avatarPath = path.join(publicDir, "images", "avatar.jpg");
  if (fs.existsSync(avatarPath)) {
    const sizes = [100, 200]; // Small sizes for header
    for (const size of sizes) {
      const webpPath = path.join(publicDir, "images", `avatar-${size}.webp`);
      const result = await generateWebP(avatarPath, webpPath, size);
      if (result.success) {
        if (result.skipped) {
          skipped++;
        } else {
          generated++;
          console.log(`   Generated avatar-${size}.webp`);
        }
      }
    }
  }

  // Process avatar-large.jpeg in public/about (prominent image - use high quality)
  const avatarLargePath = path.join(publicDir, "about", "avatar-large.jpeg");
  if (fs.existsSync(avatarLargePath)) {
    const sizes = [400, 600]; // Medium sizes for about page
    for (const size of sizes) {
      const webpPath = path.join(publicDir, "about", `avatar-large-${size}.webp`);
      const result = await generateWebP(avatarLargePath, webpPath, size, 92);
      if (result.success) {
        if (result.skipped) {
          skipped++;
        } else {
          generated++;
          console.log(`   Generated avatar-large-${size}.webp (quality: 92)`);
        }
      }
    }
  }

  // Process charity.png in public/images (homepage banner - use high quality)
  const charityPath = path.join(publicDir, "images", "charity.png");
  if (fs.existsSync(charityPath)) {
    const webpPath = path.join(publicDir, "images", "charity-400.webp");
    const result = await generateWebP(charityPath, webpPath, 400, 92);
    if (result.success) {
      if (result.skipped) {
        skipped++;
      } else {
        generated++;
        console.log(`   Generated charity-400.webp (quality: 92)`);
      }
    }
  }

  // Process sarah.png in public/images (newsletter page - use high quality)
  const sarahPath = path.join(publicDir, "images", "sarah.png");
  if (fs.existsSync(sarahPath)) {
    const webpPath = path.join(publicDir, "images", "sarah-400.webp");
    const result = await generateWebP(sarahPath, webpPath, 400, 92);
    if (result.success) {
      if (result.skipped) {
        skipped++;
      } else {
        generated++;
        console.log(`   Generated sarah-400.webp (quality: 92)`);
      }
    }
  }

  console.log(`   Static images: ${generated} generated, ${skipped} skipped`);
}

async function main() {
  console.log("📸 Image processing started");
  if (forceRegenerate) {
    console.log("   --force flag: Regenerating all images");
  } else {
    console.log("   Skipping existing images (use --force to regenerate)");
  }
  if (cleanOldImages) {
    console.log("   --clean flag: Will remove old directories");
  }
  console.log();

  const activeSlugs = await copyImages();
  copyAboutPageAssets();
  await generateStaticImageWebP();

  // Clean old directories if requested
  if (cleanOldImages) {
    cleanOldDirectories(activeSlugs);
  }

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
