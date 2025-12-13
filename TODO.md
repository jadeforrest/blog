# Future Work

## ✅ Cover Image Migration to Astro Image - COMPLETED

**Status:** Completed December 2025

Cover images on listing pages now use Astro's native image() helper and getImage():
- Schema: `cover: image().optional()` in `src/content/config.ts`
- Frontmatter: All 102 posts updated to `cover: ./image.jpg` format
- Listing pages: Homepage, posts index, tag pages, and about page now use `getImage()`
- Build script: Thumbnail generation removed from `scripts/copy-post-images.js`

**Benefits Realized:**
- Type-safe validation of cover image paths
- Automatic WebP conversion and optimization
- Simpler code (no manual picture elements)
- Unified approach with content images

---

## Static Page Images Migration to Astro Image

Currently course, newsletter, and podcast pages use manual picture elements with WebP sources.

**Files affected:**
- `src/pages/course.astro` (lines 31-46) - rachel.png with responsive WebP
- `src/pages/newsletter.astro` (lines 44-64) - sarah.png with responsive WebP
- `src/pages/decoding-leadership.astro` (lines 41-61) - decoding-leadership-6.png with responsive WebP
- `public/images/*.webp` files

**To migrate:**
1. Move images from `public/images/` to `src/assets/` (or keep in public/ and import)
2. Replace picture elements with Astro Image component
3. Remove manual WebP file generation

**Estimated effort:** 1-2 hours

**Benefits:**
- Consistent image handling across all pages
- Automatic optimization
- Simpler maintenance

## Alt Text Improvement

Current Status: All 179+ images have auto-generated alt text based on filenames.

**Recommended:** Review and improve alt text for better accessibility. Priority posts:
- Most popular posts (check analytics)
- Posts with complex diagrams
- Tutorial/how-to posts

Good alt text should:
- Describe the content/purpose of the image
- Provide context within the article
- Be concise but descriptive
- Not just repeat the filename

## Cleanup Opportunities

- Consider removing unused generated WebP files from content images (640px, 960px, 1280px) now that Astro Image handles these
- Clean up `migrate-images.cjs` and `fix-alt-text.cjs` scripts (can be archived or deleted after migration complete)
