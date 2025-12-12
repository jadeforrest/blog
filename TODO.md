# Future Work

## Cover Image Migration to Astro Image

Currently, cover images on listing pages (homepage, posts index, tag pages, about page) use the build script approach:
- String paths in frontmatter: `cover: "image.jpg"`
- Manual picture elements with WebP thumbnails in listing pages
- Build script (`scripts/copy-post-images.js`) generates thumbnails at 240px and 400px

### Future Migration Strategy

To fully migrate to Astro Image for cover images:

**1. Change Content Schema**
- Update `src/content/config.ts`:
  ```typescript
  cover: image().optional()  // Use Astro's image() helper
  ```

**2. Update All Post Frontmatter** (100+ posts)
```yaml
# Before:
cover: "image.jpg"

# After:
cover: "./image.jpg"  # Relative import path
```

**3. Use getImage() in Listing Pages**
- Import `getImage` from `astro:assets`
- Process cover images at build time in:
  - `src/pages/[...page].astro` (lines 122-143)
  - `src/pages/posts/[...page].astro` (lines 59-80)
  - `src/pages/about.astro` (lines 320-327)
  - `src/pages/tags/[tag].astro` (lines 85-92)
- Generate responsive srcset automatically

**4. Remove Build Script Thumbnail Generation**
- Keep `scripts/copy-post-images.js` for now (still copies source images)
- Remove thumbnail generation code (lines 154-167)
- Eventually may be able to remove entire script once fully on Astro Image

**Estimated Effort:** 4-6 hours
- Schema change: 30 minutes
- Frontmatter updates (can script): 1-2 hours
- Page updates: 2-3 hours
- Testing: 1 hour

**Benefits:**
- Unified image approach across entire site
- Remove build script dependency
- Better integration with Astro's optimization pipeline
- Automatic responsive image generation

**Risks:**
- Large number of files to update (100+ posts)
- Need migration script to avoid manual work
- Must ensure backwards compatibility during migration
- Build time may increase slightly

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
