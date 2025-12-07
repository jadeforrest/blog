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
**Notes:** Current version works but lacks Gatsby's sophisticated image handling (fluid images, base64 placeholders, hover effects). Good enough for launch.

## #5 - Constrain Image Width on Large Screens
**Phase:** Phase 1 (First Post Working)
**Reason:** Get images displaying first, refine layout later
**Current Implementation:** Images take up 100% width regardless of screen size
**Better Approach:** Add max-width constraint for images on larger screens (e.g., max-width: 800px or similar) with centering
**Components:** src/components/markdown/ReImg.jsx or article styles
**Effort:** Low
**Notes:** Images should be full-width on mobile but constrained on desktop for better readability and layout.

---

## Template for New Entries

## #N - [Name]
**Phase:** [During which phase was this deferred?]
**Reason:** [Why defer this?]
**Current Implementation:** [What did you do instead?]
**Better Approach:** [What would be better?]
**Effort:** [Low/Medium/High]
**Notes:** [Any additional context]
