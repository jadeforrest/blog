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
