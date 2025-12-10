/**
 * OPTIMIZE STATIC IMAGES
 *
 * One-time utility script to optimize specific static images in public/images/
 * by converting them to WebP format and creating responsive sizes.
 *
 * WHEN TO USE:
 * - When adding new static images to public/images/ that need optimization
 * - When you want to create responsive WebP versions of large images
 *
 * WHAT IT DOES:
 * - Converts PNG/JPG images to WebP format (better compression)
 * - Creates multiple responsive sizes for large images
 * - Keeps original files as fallbacks for older browsers
 *
 * HOW TO USE:
 * 1. Add your image to public/images/
 * 2. Add an entry to the `images` array below with desired sizes
 * 3. Run: node scripts/optimize-static-images.js
 * 4. Update HTML/Astro components to use <picture> elements with new WebP versions
 *
 * NOTE: This is different from copy-post-images.js which handles blog post images.
 * This script is for static site images (logos, avatars, course images, etc.)
 *
 * Created: 2024-12-09
 * Last run: Successfully generated WebP versions for decoding-leadership-6, charity,
 *           rachel, and sarah images.
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

/**
 * Optimize static images in public/images/
 * - Convert to WebP
 * - Create responsive sizes for large images
 * - Keep originals as fallbacks
 */

const imagesDir = "public/images";

const images = [
  {
    name: "decoding-leadership-6.png",
    sizes: [400, 800, 1200], // Large image, needs multiple sizes
  },
  {
    name: "charity.png",
    sizes: [400], // Small, just one optimized size
  },
  {
    name: "rachel.png",
    sizes: [400],
  },
  {
    name: "sarah.png",
    sizes: [400],
  },
  // avatar.jpg is already small, skip it
];

async function optimizeImage(imageName, sizes) {
  const sourcePath = path.join(imagesDir, imageName);

  if (!fs.existsSync(sourcePath)) {
    console.log(`⚠️  Skipping ${imageName} (not found)`);
    return;
  }

  const ext = path.extname(imageName);
  const baseName = path.basename(imageName, ext);

  console.log(`\n📸 Processing ${imageName}...`);

  // Get original dimensions
  const metadata = await sharp(sourcePath).metadata();
  console.log(`   Original: ${metadata.width}×${metadata.height} (${(metadata.size / 1024 / 1024).toFixed(2)}MB)`);

  let totalSaved = 0;

  for (const width of sizes) {
    const outputPath = path.join(imagesDir, `${baseName}-${width}.webp`);

    try {
      const info = await sharp(sourcePath)
        .resize(width, null, {
          withoutEnlargement: true,
          fit: "inside",
        })
        .webp({ quality: 85 })
        .toFile(outputPath);

      const savedKB = ((metadata.size - info.size) / 1024).toFixed(0);
      totalSaved += (metadata.size - info.size);
      console.log(`   ✓ Created ${baseName}-${width}.webp (${(info.size / 1024).toFixed(0)}KB, saved ${savedKB}KB)`);
    } catch (error) {
      console.error(`   ✗ Error creating ${width}px version: ${error.message}`);
    }
  }

  console.log(`   💾 Total saved: ${(totalSaved / 1024 / 1024).toFixed(2)}MB`);
}

async function main() {
  console.log("🎨 Optimizing static images...\n");
  console.log("This will create WebP versions of PNG/JPG images.");
  console.log("Original files will be kept as fallbacks.\n");

  for (const { name, sizes } of images) {
    await optimizeImage(name, sizes);
  }

  console.log("\n✅ Done! Updated images:");
  console.log("   - decoding-leadership-6-*.webp (3 sizes)");
  console.log("   - charity-400.webp");
  console.log("   - rachel-400.webp");
  console.log("   - sarah-400.webp");
  console.log("\nNext: Update HTML to use <picture> elements with these WebP versions.");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
