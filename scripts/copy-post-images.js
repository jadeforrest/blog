import fs from "fs";
import path from "path";
import sharp from "sharp";

/**
 * Copy images from post directories to public output
 * This makes images accessible at /[slug]/[image.png]
 * Creates image-metadata.json with dimensions for responsive loading
 *
 * NOTE: All images now use Astro's native Image component for optimization.
 * - Cover images: use getImage() on listing pages
 * - Content images: use <Image> component in MDX files
 * This script simply copies original images to public directory.
 *
 * Options:
 *   --force   Force copy all images even if they exist
 *   --clean   Remove old generated image directories for deleted posts
 */

const postsDir = "src/content/posts";
const publicDir = "public";

// Parse command line arguments
const args = process.argv.slice(2);
const forceRegenerate = args.includes("--force");
const cleanOldImages = args.includes("--clean");

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

      // Process each image
      for (const imageFile of imageFiles) {
        const sourcePath = path.join(dir, imageFile);
        const targetPath = path.join(targetDir, imageFile);

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
      }

      console.log(`Processed ${imageFiles.length} images for ${cleanSlug}`);
    }
  }

  console.log(`\nTotal: Copied ${copiedCount} images from ${postDirs.length} posts`);

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
  // No longer needed - avatar-large.jpeg now uses Astro Image component
  // and is stored in src/assets/ instead of being copied to public/about
}

/**
 * Determine appropriate WebP sizes based on source image dimensions
 * Returns array of { width, quality } objects
 */
function getResponsiveSizes(sourceWidth) {
  // Very small images (< 150px): just 1x and 2x
  if (sourceWidth < 150) {
    return [
      { width: 100, quality: 85 },
      { width: 200, quality: 85 }
    ];
  }

  // Small images (150-500px): single size at slightly larger than source
  if (sourceWidth < 500) {
    return [{ width: Math.min(600, sourceWidth), quality: 92 }];
  }

  // Medium images (500-1000px): two responsive sizes
  if (sourceWidth < 1000) {
    return [
      { width: 800, quality: 92 },
      { width: 1200, quality: 92 }
    ];
  }

  // Large images (1000-2000px): two or three responsive sizes
  if (sourceWidth < 2000) {
    return [
      { width: 800, quality: 92 },
      { width: 1200, quality: 92 },
      { width: 1600, quality: 92 }
    ];
  }

  // Very large images (2000px+): three responsive sizes
  return [
    { width: 800, quality: 92 },
    { width: 1200, quality: 92 },
    { width: 2000, quality: 92 }
  ];
}

/**
 * Process a static image file and generate responsive WebP versions
 */
async function processStaticImage(sourcePath, targetDir, baseName) {
  let generated = 0;
  let skipped = 0;

  // Get source dimensions
  const dimensions = await getImageDimensions(sourcePath);
  if (!dimensions) {
    console.warn(`   ⚠️  Could not read dimensions for ${baseName}`);
    return { generated, skipped };
  }

  // Determine appropriate sizes
  const sizes = getResponsiveSizes(dimensions.width);

  // Generate each size
  for (const { width, quality } of sizes) {
    const webpPath = path.join(targetDir, `${baseName}-${width}.webp`);
    const result = await generateWebP(sourcePath, webpPath, width, quality);
    if (result.success) {
      if (result.skipped) {
        skipped++;
      } else {
        generated++;
        const qualityStr = quality !== 85 ? ` (quality: ${quality})` : '';
        console.log(`   Generated ${baseName}-${width}.webp${qualityStr}`);
      }
    }
  }

  return { generated, skipped };
}

async function generateStaticImageWebP() {
  // All static images now use Astro's Image component:
  // - rachel.png, sarah.png, decoding-leadership-6.png (course/newsletter/podcast pages)
  // - avatar.jpg (site header)
  // - charity.png (homepage)
  // - avatar-large.jpeg (about page)
  // No static image WebP generation needed anymore
  console.log("\n📸 Static images: All handled by Astro Image component");
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
