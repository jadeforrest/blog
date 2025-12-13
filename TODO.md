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

## ✅ Static Page Images Migration to Astro Image - COMPLETED

**Status:** Completed December 2025

Course, newsletter, and podcast pages now use Astro's Image component instead of manual picture elements:
- Images moved from `public/images/` to `src/assets/`
- Pages migrated: `course.astro`, `newsletter.astro`, `decoding-leadership.astro`
- Manual WebP files removed from `public/images/`
- Build script updated to skip migrated images

**Benefits Realized:**
- Consistent image handling across all pages
- Automatic optimization (rachel: 61kB→20kB, sarah: 83kB→19kB, podcast: 6MB→72kB)
- Simpler maintenance (no manual picture elements)

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
