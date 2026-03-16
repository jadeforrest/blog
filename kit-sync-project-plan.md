# Kit Sync Project Plan

Automate syncing blog posts from rubick.com to Kit.com sequence emails, eliminating manual copy-paste and re-editing when posts are updated.

## Context

- Blog at rubick.com (Astro, MDX posts in `src/content/posts/`)
- Kit.com account with Sequences — each email corresponds to a blog post
- A post can appear in multiple sequences
- Kit has no official API for editing sequence email content
- Email body format:
  ```
  Share this link: https://www.rubick.com/{slug}/

  {full post content as HTML}

  Share this link: https://www.rubick.com/{slug}/
  ```

---

## Approach: Semi-automated clipboard sync

Kit's internal save API requires session auth that expires frequently. Instead of automating the API call, we use the clipboard:

1. Script converts MDX → email HTML
2. Swift one-liner copies HTML to clipboard as `text/html` (macOS-native, no dependencies)
3. Script opens the Kit email editor URL in the browser
4. You paste (`Cmd+V`) — confirmed to render as formatted content, not raw tags
5. Script waits for `y`, then records the sync hash and moves to the next post

**Why this works well:**
- No auth/session management
- Visual verification of each update
- Only runs when content actually changed (hash-based)
- In practice: 1–5 posts per sync session

---

## Frontmatter Structure

Add to each mapped post's frontmatter:

```yaml
kitEditUrls: "https://app.kit.com/sequences/1059035/emails/123/edit, https://app.kit.com/sequences/1059030/emails/456/edit"
kitSyncHash: ""   # filled in by sync script after first successful sync
```

- `kitEditUrls`: comma-separated list of Kit editor URLs (one per sequence the post appears in)
- `kitSyncHash`: MD5 of the raw MDX file at last sync; empty = never synced

### Getting the editor URLs

Navigate to the sequence in Kit, open the email, and copy the URL from your browser address bar.

---

## Phase 1: One-time Frontmatter Setup ✅ DONE

### Script: `scripts/kit-add-frontmatter.js`

Scans all `src/content/posts/*/index.mdx` files and appends blank `kitEditUrls` and `kitSyncHash` fields to any post that doesn't already have them. One-time run.

---

## Phase 2: Content Schema Update

Add `kitEditUrls` and `kitSyncHash` to `src/content/config.ts` as optional string fields so Astro doesn't warn about unknown frontmatter.

---

## Phase 3: Content Conversion (MDX → Email-Compatible HTML)

### Constraints

Email clients render a narrow subset of HTML — no `<div>` layouts, no external CSS, no `<picture>` or `<figure>`, no JS.

Safe email tags: `<p>`, `<h1>`–`<h6>`, `<ul>`, `<ol>`, `<li>`, `<strong>`, `<em>`, `<a>`, `<img>`, `<blockquote>`, `<hr>`, `<br>`, `<pre>`, `<code>`

Images must use **absolute URLs** — relative paths don't work in email.

### Image URL strategy

Blog images are served at `https://www.rubick.com/posts/{post-slug}/{filename}` after build.

### Conversion pipeline

1. Parse frontmatter with `gray-matter`
2. Extract the MDX body (everything after the frontmatter block)
3. Pre-process MDX-specific syntax:
   - Remove `import` statements at the top
   - Replace `<Image src={varName} ... />` with `<img src="https://www.rubick.com/posts/{slug}/{resolved-filename}" alt="..." />`
   - Drop any JSX components with no HTML equivalent (e.g., custom callout components)
4. Convert processed markdown to HTML using `remark` + `remark-html`
5. Wrap with share-link paragraphs:
   ```html
   <p>Share this link: <a href="https://www.rubick.com/{slug}/">https://www.rubick.com/{slug}/</a></p>
   {content}
   <p>Share this link: <a href="https://www.rubick.com/{slug}/">https://www.rubick.com/{slug}/</a></p>
   ```

### Dependencies to add

```
npm install gray-matter remark remark-html remark-frontmatter
```

(`gray-matter` may already be installed — check before adding.)

---

## Phase 4: The Sync Script (`scripts/kit-sync.js`)

### Behavior

1. Scan all `src/content/posts/*/index.mdx` files
2. Parse frontmatter with `gray-matter`
3. Collect posts where `kitEditUrls` is non-blank
4. Report unmapped posts (no `kitEditUrls`) so the user can see what's not covered
5. Filter to posts where `kitSyncHash` is empty OR MD5 of file content differs from `kitSyncHash`
6. For each matched post × each URL in `kitEditUrls`:
   - Convert MDX → email HTML
   - Copy HTML to clipboard using Swift: `swift - << 'EOF' ... EOF`
   - Open the editor URL: `open <url>`
   - Print: `Paste content into Kit editor, then press y to confirm (or s to skip)`
   - On `y`: compute MD5 of raw MDX file, write to `kitSyncHash` in frontmatter
   - On `s`: skip this post, continue
7. Print summary: synced N, skipped M

### CLI flags

| Flag | Behavior |
|------|----------|
| `--dry-run` | Show what would be synced, no clipboard/browser/hash updates |
| `--force` | Sync all mapped posts regardless of current hash |
| `--post <slug>` | Sync a single post by slug |

---

## Phase 5: npm Scripts

Add to `package.json`:

```json
"kit-sync": "node scripts/kit-sync.js",
"kit-sync:dry-run": "node scripts/kit-sync.js --dry-run",
"kit-add-frontmatter": "node scripts/kit-add-frontmatter.js"
```

---

## Implementation Order

1. ~~**Phase 1** — Reverse engineer API~~ → replaced by clipboard approach ✅
2. **Phase 1** — `kit-add-frontmatter.js` to stamp all posts with blank fields
3. **Phase 2** — Update content schema
4. **Phase 3** — Build and test MDX → HTML conversion in isolation
5. **Phase 4** — Build `kit-sync.js`, test with `--dry-run` first
6. **Phase 5** — Add npm scripts

---

## Key Files

| File | Purpose |
|------|---------|
| `scripts/kit-sync.js` | Main interactive sync script (to build) |
| `scripts/kit-add-frontmatter.js` | One-time setup: stamps blank kitEditUrls/kitSyncHash on all posts (to build) |
| `scripts/extract-to-linkedin.js` | Existing pattern to follow |
| `src/content/posts/*/index.mdx` | Post source files (frontmatter + MDX) |
| `src/content/config.ts` | Content schema (add kitEditUrls, kitSyncHash fields) |

---

## Testing Approach

- `npm run kit-sync -- --dry-run` to verify change detection without side effects
- `npm run kit-sync -- --post <test-slug>` to test a single post end-to-end
- Verify in Kit dashboard that pasted content looks correct before confirming with `y`
