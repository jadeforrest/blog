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

---

## Template for New Entries

## #N - [Name]
**Phase:** [During which phase was this deferred?]
**Reason:** [Why defer this?]
**Current Implementation:** [What did you do instead?]
**Better Approach:** [What would be better?]
**Effort:** [Low/Medium/High]
**Notes:** [Any additional context]
