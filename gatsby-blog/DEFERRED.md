# Deferred Work

> **How to use this file:** As you encounter opportunities to improve the implementation or use more idiomatic Astro patterns, add them here immediately. Each entry should document what you implemented, why it's deferred, and what the better approach would be.

## #1 - Infinite Scroll
**Phase:** Post-Launch
**Reason:** Complex, traditional pagination sufficient for launch
**Current Implementation:** Traditional pagination
**Better Approach:** Port GlobalState + infinite scroll from Gatsby
**Effort:** Medium

## #2 - Convert React Components to Native Astro
**Phase:** Post-Launch
**Reason:** client:load works fine for launch
**Current Implementation:** React components with client:load
**Better Approach:** Convert to native Astro components for better performance
**Components:** Header (if React), ConvertKitForm, Search
**Effort:** Low-Medium

## #3 - Utility Scripts
**Phase:** Post-Launch
**Reason:** Focus on site functionality first
**Scripts:** Link verification, podcast RSS refresh, icon generation
**Effort:** Low

## #4 - Simplify ReImg Component
**Phase:** Phase 1 (First Post Working)
**Reason:** Get images working quickly for MVP
**Current Implementation:** Simplified React component that handles basic `src` prop only
**Better Approach:** Port full Gatsby ReImg with GatsbyImage, hover effects, and image optimization
**Components:** src/components/markdown/ReImg.jsx
**Effort:** Low-Medium
**Notes:** Current version works but lacks Gatsby's sophisticated image handling (fluid images, base64 placeholders, hover effects). Good enough for launch. Image width is constrained by article max-width which looks good.

## #5 - Add Image Hover Effect Back to ReImg
**Phase:** Phase 2 (Basic Layout & Styling)
**Reason:** Removed styled-jsx to fix warning, lost hover effect
**Current Implementation:** Images display correctly but no hover scale effect
**Better Approach:** Add CSS to ReImg component or use scoped Astro styles. Original effect was: `.img-container img:hover { transform: scale(1.05); }` with transition
**Components:** src/components/markdown/ReImg.jsx
**Effort:** Low
**Notes:** Removed `<style jsx>` tag that caused "Received `true` for a non-boolean attribute `jsx`" warning. Can add back as inline styles or use Astro's scoped styling.

## #6 - Replace Spotify Decoding Leadership Podcast Embeds
**Phase:** Post-Launch
**Reason:** Privacy/performance concerns, focus on core functionality first
**Current Implementation:** Spotify iframe embeds (`<iframe src="https://podcasters.spotify.com/pod/show/decodingleadership/embed/..."`)
**Better Approach:** Replace with simpler podcast links or custom embed component that doesn't make calls to Sentry or trigger OAuth2/content blocker issues
**Affected Posts:** 20 posts contain Spotify embeds
**Effort:** Low-Medium
**Notes:** Current Spotify embeds make calls to Sentry and have OAuth2 pages that get blocked by content blockers. Could replace with direct links to podcast episodes, or create a lightweight custom embed component that respects privacy.

## #7 - Optimize Thumbnail Images for Homepage
**Phase:** Phase 5 (Pagination & Polish)
**Reason:** Get thumbnails working quickly, optimize later for performance
**Current Implementation:** Full-resolution cover images served as thumbnails (200x150px on desktop, 120x90px on mobile)
**Better Approach:** Use Astro's image optimization to generate responsive thumbnails at appropriate sizes. Could use `astro:assets` with `<Image>` component or generate multiple sizes during build.
**Affected Files:** `src/pages/[...page].astro`
**Effort:** Low-Medium
**Notes:** Current implementation serves full-sized images (often several hundred KB) which are then scaled down by CSS. This wastes bandwidth and slows page load. Astro's built-in image optimization can generate optimized thumbnails at the exact dimensions needed. Would reduce page weight significantly.

---

## Template for New Entries

## #N - [Name]
**Phase:** [During which phase was this deferred?]
**Reason:** [Why defer this?]
**Current Implementation:** [What did you do instead?]
**Better Approach:** [What would be better?]
**Effort:** [Low/Medium/High]
**Notes:** [Any additional context]
