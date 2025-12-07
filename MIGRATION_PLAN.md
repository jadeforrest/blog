# Incremental Astro Migration Plan

**Approach:** Highly incremental with verification checkpoints at each step. Always keep something working.

**Philosophy on Future Improvements:** During migration, prioritize getting things working over doing them "the best way." When you implement something pragmatically (e.g., using React components instead of native Astro, using MDX instead of custom remark plugins), immediately document it in DEFERRED.md as a future improvement. This lets us move quickly while tracking opportunities to make things more idiomatic later.

**Directory Structure:**
```
~/Documents/Activities/Code/blog/           (Gatsby - current site)
~/Documents/Activities/Code/blog/astro-blog/ (Astro - new site)
```

**Critical URL Structure:** Posts route to ROOT level (`/my-post/`), not `/posts/my-post/`

---

## Phase 0: Project Setup & Core Decisions

**Goal:** Get Astro running, make critical decisions, document them

### 0.1 Initialize Project

```bash
cd ~/Documents/Activities/Code/blog
npm create astro@latest astro-blog
cd astro-blog
npm install @astrojs/react @astrojs/sitemap remark-smartypants
npm install react react-dom react-icons
```

**✓ Checkpoint 0.1:**
```bash
npm run dev
# Visit http://localhost:4321
```
- [ ] Dev server starts without errors
- [ ] See default Astro welcome page
- [ ] Hot reload works (edit src/pages/index.astro)

### 0.2 Configure Git

```bash
# From parent directory
cd ~/Documents/Activities/Code/blog
echo "astro-blog/node_modules/" >> .gitignore
echo "astro-blog/dist/" >> .gitignore
echo "astro-blog/.astro/" >> .gitignore
git add .gitignore
git commit -m "Add astro-blog to git tracking"
```

**✓ Checkpoint 0.2:**
- [ ] .gitignore updated
- [ ] astro-blog directory tracked by git
- [ ] node_modules not tracked

### 0.3 Basic Astro Configuration

Create `astro-blog/astro.config.mjs`:
```javascript
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import remarkSmartypants from "remark-smartypants";

export default defineConfig({
  site: "https://www.rubick.com",
  integrations: [react(), sitemap()],
  markdown: {
    shikiConfig: { theme: "github-dark" },
    remarkPlugins: [remarkSmartypants],
  },
});
```

**✓ Checkpoint 0.3:**
```bash
npm run dev
```
- [ ] Server restarts successfully with new config
- [ ] No configuration errors

### 0.4 Make Critical Decisions

Create `DECISIONS.md`:

```markdown
# Migration Decisions

## Made

1. **Directory Structure:** astro-blog/ subdirectory - DONE
2. **Git Strategy:** Track in parent repo - DONE
3. **Pagination Strategy:** Traditional pagination initially - DEFERRED infinite scroll
4. **Custom Markdown:** Use MDX initially - DEFERRED native Astro conversion
5. **Search:** Switch to Pagefind - DEFERRED FlexSearch removal
6. **Syntax Highlighting:** Try Shiki - DECIDED (may revisit if issues)

## Deferred to Post-Launch

See DEFERRED.md for details
```

Create `DEFERRED.md`:

```markdown
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
```

Create `PROGRESS.md`:

```markdown
# Migration Progress

**Last Updated:** [Date]
**Current Phase:** 0 - Project Setup
**Working State:** Default Astro page loads

## What's Working
- ✅ Astro dev server runs
- ✅ Git configured
- ❌ No content yet

## Next Steps
- Phase 1: Get one post working

## Blockers
- None
```

**✓ Checkpoint 0.4:**
- [ ] DECISIONS.md created
- [ ] DEFERRED.md created
- [ ] PROGRESS.md created
- [ ] All decisions documented

> **Important:** Throughout the migration, whenever you make a pragmatic choice or take a shortcut, immediately add it to DEFERRED.md. This practice ensures nothing is forgotten and you can optimize later without losing momentum now.

---

## Phase 1: First Post Working (Minimal Viable)

**Goal:** Get ONE blog post rendering end-to-end, even if ugly

> 💡 **Remember:** As you implement, note any shortcuts or pragmatic decisions in DEFERRED.md. For example, if you use MDX for `<re-img>` instead of a more optimal solution, document it for future improvement.

### 1.1 Set Up Content Collections

Create `src/content/config.ts`:

```typescript
import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    cover: z.string().optional(),
    description: z.string().optional(),
    discussionId: z.string().optional(),
  }),
});

export const collections = { posts };
```

**✓ Checkpoint 1.1:**
```bash
npm run dev
```
- [ ] No TypeScript errors
- [ ] Collections schema compiles

### 1.2 Copy ONE Test Post

```bash
# Using "Communication is Shared State" - good test post with:
# - All typical frontmatter (title, tags, cover, author, discussionId, description)
# - Custom <re-img> component
# - Internal and external links
# - Representative content structure
cp -r ../content/posts/2021-03-20--communication-is-shared-state src/content/posts/
```

**✓ Checkpoint 1.2:**
- [ ] Post directory exists: `src/content/posts/2021-03-20--communication-is-shared-state/`
- [ ] `index.md` file present
- [ ] `serialization.jpg` image copied

### 1.3 Create Minimal Post Route

Create `src/pages/[...slug].astro`:

```astro
---
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('posts');

  return posts.map(post => {
    // Parse YYYY-MM-DD--slug format
    const slug = post.id.replace(/^\d{4}-\d{2}-\d{2}--/, '').replace(/\/index\.md$/, '');

    return {
      params: { slug },
      props: { post }
    };
  });
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<!DOCTYPE html>
<html>
<head>
  <title>{post.data.title}</title>
</head>
<body>
  <h1>{post.data.title}</h1>
  <time>{post.data.date}</time>
  <Content />
</body>
</html>
```

**✓ Checkpoint 1.3:**
```bash
npm run dev
# Visit http://localhost:4321/communication-is-shared-state/
```
- [ ] Post loads without 404
- [ ] Title displays
- [ ] Content renders (unstyled is OK)
- [ ] No console errors
- [ ] Markdown converts to HTML

**✓ Checkpoint 1.4 - Build Test:**
```bash
npm run build
npm run preview
# Visit http://localhost:4321/communication-is-shared-state/
```
- [ ] Build succeeds
- [ ] Post accessible in preview
- [ ] No build warnings about the post

### 1.5 Test Custom Markdown Elements

Check if your test post has `<re-img>` or other custom tags:
```bash
cd src/content/posts
grep -r "<re-img" .
grep -r "<re-icons" .
grep -r "<re-tracedsvg-gallery" .
```

**If found:** Note them in PROGRESS.md blockers

**Decision Point:**
- If custom tags found: Add MDX support NOW (see 1.6)
- If no custom tags: Proceed to Phase 2, defer MDX

### 1.6 Add MDX Support (If Needed)

```bash
npm install @astrojs/mdx
```

Update `astro.config.mjs`:
```javascript
import mdx from '@astrojs/mdx';

export default defineConfig({
  // ... existing config
  integrations: [react(), sitemap(), mdx()],
});
```

Create React components for custom tags:
```bash
mkdir -p src/components/markdown
# Copy and adapt ReImg.js, ReIcons.js, etc. from Gatsby
```

Rename test post: `index.md` → `index.mdx`

**✓ Checkpoint 1.6:**
- [ ] MDX post renders
- [ ] Custom components work
- [ ] Images display

### 1.7 Update Progress

Update `PROGRESS.md`:
```markdown
**Current Phase:** 1 - First Post Working
**Working State:** One post accessible at /communication-is-shared-state/

## What's Working
- ✅ One post renders with content
- ✅ Markdown to HTML conversion
- ✅ Custom markdown components (if using MDX)
- ❌ No styling yet
- ❌ No navigation yet
```

---

## Phase 2: Basic Layout & Styling

**Goal:** Make the test post look like the original Gatsby site

> 💡 **Remember:** If you take shortcuts with styling (e.g., inline styles, quick CSS instead of proper theme system), document in DEFERRED.md for future refinement.

### 2.1 Copy Theme Configuration

```bash
cp -r ../src/theme src/
cp ../postcss.config.js .
npm install postcss-custom-properties postcss-custom-media
```

**✓ Checkpoint 2.1:**
- [ ] Theme files copied
- [ ] PostCSS dependencies installed
- [ ] No build errors

### 2.2 Create CSS Variables

Create `src/styles/variables.css`:
```css
:root {
  /* Colors */
  --color-brand-primary: #709425;
  --color-brand-primaryActive: #95c158;
  --color-brand-light: #95c158;
  --color-brand-lightActive: #709425;
  --color-neutral-white: #fff;
  --color-neutral-gray-a: #fafafa;
  --color-neutral-gray-b: #f5f5f5;
  --color-neutral-gray-c: #ccc;
  --color-neutral-gray-d: #777;
  --color-neutral-gray-e: #555;
  --color-neutral-gray-f: #333;
  --color-neutral-gray-g: #222;
  --color-neutral-gray-h: #161616;
  --color-neutral-gray-i: #080808;
  --color-neutral-black: #000;
  --color-special-attention: #e5233d;

  /* Spacing */
  --space-inset-xs: 5px;
  --space-inset-s: 10px;
  --space-inset-m: 20px;
  --space-inset-l: 40px;
  --space-stack-xs: 0 0 5px 0;
  --space-stack-s: 0 0 10px 0;
  --space-stack-m: 0 0 20px 0;
  --space-stack-l: 0 0 40px 0;
  --space-inline-s: 0 10px 0 0;
  --space-inline-m: 0 20px 0 0;

  /* Typography */
  --font-family-base: "Open Sans", Arial, sans-serif;
  --font-family-heading: "Droid Serif", serif;
  --font-size-xs: 0.7em;
  --font-size-s: 1em;
  --font-size-m: 1.35em;
  --font-size-l: 1.7em;
  --font-size-xl: 2em;
  --font-size-xxl: 2.4em;
  --font-size-xxxl: 3em;
  --line-height-xs: 1.1;
  --line-height-s: 1.2;
  --line-height-m: 1.5;
  --line-height-l: 1.7;
  --line-height-xl: 2;

  /* Sizes */
  --size-article-maxWidth: 50em;
}
```

**✓ Checkpoint 2.2:**
```bash
# Add to <head> in post route temporarily
<link rel="stylesheet" href="/src/styles/variables.css">
```
- [ ] CSS loads
- [ ] No 404 for CSS file

### 2.3 Create Base Layout

Create `src/layouts/BaseLayout.astro`:
```astro
---
interface Props {
  title: string;
}
const { title } = Astro.props;
---

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{title}</title>
  <link rel="stylesheet" href="/src/styles/variables.css">
</head>
<body>
  <header>
    <a href="/">Home</a>
  </header>
  <main>
    <slot />
  </main>
  <footer>
    <p>Footer content</p>
  </footer>
</body>
</html>
```

**✓ Checkpoint 2.3:**
- [ ] Layout file created
- [ ] Can import in post route

### 2.4 Apply Layout to Post

Update `src/pages/[...slug].astro`:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
// ... rest of code
---

<BaseLayout title={post.data.title}>
  <article>
    <h1>{post.data.title}</h1>
    <time>{post.data.date}</time>
    <Content />
  </article>
</BaseLayout>
```

**✓ Checkpoint 2.4:**
```bash
npm run dev
# Visit http://localhost:4321/communication-is-shared-state/
```
- [ ] Layout wraps post
- [ ] Header and footer visible
- [ ] "Home" link present (doesn't work yet - that's OK)

### 2.5 Copy Header Component

Option A - Start with React:
```bash
mkdir -p src/components/Header
cp -r ../src/components/Header/* src/components/Header/
```

Option B - Create minimal Astro header for now, defer full header

**✓ Checkpoint 2.5:**
```bash
# Import and use Header in BaseLayout
```
- [ ] Header displays
- [ ] Logo/title visible
- [ ] No JavaScript errors

### 2.6 Copy Footer Component

```bash
mkdir -p src/components/Footer
cp -r ../src/components/Footer/* src/components/Footer/
```

**✓ Checkpoint 2.6:**
- [ ] Footer displays
- [ ] Links work (or noted as todo)

### 2.7 Add Article Styling

Create `src/components/Article.astro`:
```astro
---
interface Props {
  title: string;
  date: string;
}
const { title, date } = Astro.props;
---

<article class="article">
  <header class="article-header">
    <h1>{title}</h1>
    <time>{date}</time>
  </header>
  <div class="article-body">
    <slot />
  </div>
</article>

<style>
  /* Copy styles from Gatsby Article component */
</style>
```

**✓ Checkpoint 2.7:**
```bash
npm run dev
```
- [ ] Article styling applied
- [ ] Typography looks correct
- [ ] Spacing matches original

### 2.8 Visual Comparison Test

**✓ Checkpoint 2.8:**
Open side-by-side:
- Gatsby: http://localhost:8000/communication-is-shared-state/
- Astro: http://localhost:4321/communication-is-shared-state/

Compare:
- [ ] Font sizes match
- [ ] Colors match
- [ ] Spacing similar
- [ ] Header looks right
- [ ] Footer looks right

**Note differences in PROGRESS.md**

### 2.9 Update Progress

Update `PROGRESS.md`:
```markdown
**Current Phase:** 2 - Basic Layout & Styling
**Working State:** One styled post accessible

## What's Working
- ✅ Post renders with styling
- ✅ Header and footer present
- ✅ Looks similar to Gatsby site
- ❌ Navigation doesn't work yet
- ❌ Only one post
```

---

## Phase 3: Homepage & Navigation

**Goal:** Add homepage with post list, make navigation work

### 3.1 Create Homepage

Create `src/pages/index.astro`:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

const posts = await getCollection('posts');
const sortedPosts = posts.sort((a, b) =>
  new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
).slice(0, 10); // Show 10 most recent
---

<BaseLayout title="Home">
  <h1>Recent Posts</h1>
  <ul>
    {sortedPosts.map(post => {
      const slug = post.id.replace(/^\d{4}-\d{2}-\d{2}--/, '').replace(/\/index\.md$/, '');
      return (
        <li>
          <a href={`/${slug}/`}>{post.data.title}</a>
          <time>{post.data.date}</time>
        </li>
      );
    })}
  </ul>
</BaseLayout>
```

**✓ Checkpoint 3.1:**
```bash
npm run dev
# Visit http://localhost:4321/
```
- [ ] Homepage loads
- [ ] Post list displays
- [ ] Test post is in the list
- [ ] Post link is clickable

### 3.2 Test Navigation

**✓ Checkpoint 3.2:**
- [ ] Click post link from homepage → goes to post
- [ ] Click "Home" link from post → goes to homepage
- [ ] Back button works
- [ ] No 404s

### 3.3 Style Homepage

Copy styles from Gatsby Blog component:
```astro
<style>
  /* Copy from Gatsby Blog/Teaser styles */
</style>
```

**✓ Checkpoint 3.3:**
- [ ] Homepage styling matches Gatsby
- [ ] Post cards/teasers look right
- [ ] Spacing correct

### 3.4 Update Progress

Update `PROGRESS.md`:
```markdown
**Current Phase:** 3 - Homepage & Navigation
**Working State:** Homepage and one post, navigation works

## What's Working
- ✅ Homepage with post list
- ✅ Can navigate to/from post
- ✅ Basic site navigation working
- ❌ Only one post migrated
```

---

## Phase 4: Migrate All Posts

**Goal:** Get all blog posts working

### 4.1 Copy All Posts

```bash
cp -r ../content/posts/* src/content/posts/
```

**✓ Checkpoint 4.1:**
- [ ] All post directories copied
- [ ] Check count: `ls -l src/content/posts/ | wc -l` (should match Gatsby)

### 4.2 Test Build with All Posts

```bash
npm run build
```

**If build fails:**
- Note errors in PROGRESS.md
- Identify problematic posts
- Fix schema issues or frontmatter

**✓ Checkpoint 4.2:**
- [ ] Build succeeds with all posts
- [ ] No TypeScript errors
- [ ] All posts listed in build output

### 4.3 Verify Random Posts

Pick 5 random posts and test:
```bash
npm run preview
```

**✓ Checkpoint 4.3:**
For each of 5 random posts:
- [ ] Post loads without 404
- [ ] Title displays
- [ ] Content renders
- [ ] Images load (if present)
- [ ] No console errors

### 4.4 Check for Custom Markdown Issues

```bash
# Find posts with custom elements
grep -r "<re-img" src/content/posts/ > custom-img-posts.txt
grep -r "<re-icons" src/content/posts/ > custom-icons-posts.txt
grep -r "<re-tracedsvg-gallery" src/content/posts/ > custom-gallery-posts.txt
```

**✓ Checkpoint 4.4:**
- [ ] Count of posts with custom elements known
- [ ] Sample posts with custom elements tested
- [ ] Custom elements render (if MDX configured)
- [ ] OR: Added to DEFERRED.md if not critical

### 4.5 Verify Homepage Shows All Posts

**✓ Checkpoint 4.5:**
```bash
npm run dev
```
- [ ] Homepage shows multiple posts
- [ ] Posts are sorted by date (newest first)
- [ ] Can navigate to various posts
- [ ] No duplicate posts

### 4.6 Test Frontmatter Edge Cases

Check for posts with:
- Missing dates
- Missing titles
- Special characters in titles
- Different tag formats

**✓ Checkpoint 4.6:**
- [ ] All posts have valid frontmatter
- [ ] Or: Schema updated to handle variations
- [ ] No build errors

### 4.7 Update Progress

Update `PROGRESS.md`:
```markdown
**Current Phase:** 4 - All Posts Migrated
**Working State:** All blog posts accessible and rendering

## What's Working
- ✅ All posts migrated
- ✅ Homepage lists all posts
- ✅ Can navigate to any post
- ✅ Posts render correctly
- ❌ No pages (about, contact, etc.) yet
- ❌ No wiki yet
- ❌ No tags yet
```

---

## Phase 5: Pages & Wiki

**Goal:** Add static pages and wiki content

> 💡 **Remember:** If you find wiki directory indexing complex or need shortcuts for custom page components, document in DEFERRED.md for refinement later.

### 5.1 Create Pages Collection

Update `src/content/config.ts`:
```typescript
const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    // Add other page fields
  }),
});

export const collections = { posts, pages };
```

**✓ Checkpoint 5.1:**
- [ ] Pages collection defined
- [ ] No TypeScript errors

### 5.2 Copy Pages

```bash
cp -r ../content/pages src/content/
```

**✓ Checkpoint 5.2:**
- [ ] Pages copied
- [ ] Files present in src/content/pages/

### 5.3 Create Page Routes

Create `src/pages/[page].astro` (for root-level pages like /about/):
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const pages = await getCollection('pages');
  return pages.map(page => ({
    params: { page: page.slug },
    props: { page }
  }));
}

const { page } = Astro.props;
const { Content } = await page.render();
---

<BaseLayout title={page.data.title}>
  <article>
    <h1>{page.data.title}</h1>
    <Content />
  </article>
</BaseLayout>
```

**✓ Checkpoint 5.3:**
```bash
npm run dev
# Test each page
```
- [ ] /about/ loads
- [ ] /contact/ loads
- [ ] Other pages load
- [ ] Content renders

### 5.4 Add Pages to Navigation

Update Header component to include page links:
```astro
<nav>
  <a href="/">Home</a>
  <a href="/about/">About</a>
  <a href="/contact/">Contact</a>
</nav>
```

**✓ Checkpoint 5.4:**
- [ ] Page links in navigation
- [ ] Links work
- [ ] Active page indicated (optional)

### 5.5 Create Wiki Collection

Update `src/content/config.ts`:
```typescript
const wiki = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    // Add wiki fields
  }),
});

export const collections = { posts, pages, wiki };
```

**✓ Checkpoint 5.5:**
- [ ] Wiki collection defined
- [ ] Build succeeds

### 5.6 Copy Wiki Content

```bash
cp -r ../content/wiki src/content/
```

**✓ Checkpoint 5.6:**
- [ ] Wiki files copied
- [ ] Nested directory structure preserved
- [ ] Check file count matches Gatsby

### 5.7 Create Wiki Routes

Create `src/pages/wiki/[...slug].astro`:
```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const wikiPages = await getCollection('wiki');
  const paths = [];

  // Individual wiki pages
  wikiPages.forEach(page => {
    paths.push({
      params: { slug: page.slug },
      props: { page, type: 'page' }
    });
  });

  // Directory indexes (collect all unique directory paths)
  const directories = new Set();
  wikiPages.forEach(p => {
    const parts = p.slug.split('/');
    for (let i = 1; i < parts.length; i++) {
      directories.add(parts.slice(0, i).join('/'));
    }
  });

  directories.forEach(dir => {
    const dirPages = wikiPages.filter(p => {
      const parentDir = p.slug.substring(0, p.slug.lastIndexOf('/'));
      return parentDir === dir;
    });

    if (dirPages.length > 0) {
      paths.push({
        params: { slug: dir },
        props: { directory: dir, pages: dirPages, type: 'directory' }
      });
    }
  });

  return paths;
}

const { type } = Astro.props;

// Render directory or page based on type
---

<BaseLayout title={type === 'directory' ? 'Wiki Directory' : Astro.props.page.data.title}>
  {type === 'directory' ? (
    <div>
      <h1>Wiki: {Astro.props.directory}</h1>
      <ul>
        {Astro.props.pages.map(p => (
          <li><a href={`/wiki/${p.slug}/`}>{p.data.title}</a></li>
        ))}
      </ul>
    </div>
  ) : (
    <article>
      <h1>{Astro.props.page.data.title}</h1>
      {/* Need to render content - add const { Content } = await Astro.props.page.render() in the script */}
    </article>
  )}
</BaseLayout>
```

**✓ Checkpoint 5.7:**
```bash
npm run build
npm run preview
```
- [ ] Build succeeds with wiki
- [ ] Individual wiki pages load
- [ ] Wiki directory indexes load
- [ ] Directory indexes list child pages

### 5.8 Test Wiki Navigation

Pick a wiki category with subdirectories:

**✓ Checkpoint 5.8:**
- [ ] Can navigate to /wiki/category/
- [ ] See list of pages in category
- [ ] Can click to individual page
- [ ] Can navigate back

### 5.9 Update Progress

Update `PROGRESS.md`:
```markdown
**Current Phase:** 5 - Pages & Wiki Complete
**Working State:** All content types accessible

## What's Working
- ✅ All blog posts
- ✅ Static pages (about, contact, etc.)
- ✅ Wiki with nested directories
- ✅ Navigation between all content types
- ❌ No tags/categories yet
- ❌ No search yet
- ❌ No interactive features yet
```

---

## Phase 6: Tags & Categories

**Goal:** Add tag pages and tag navigation

> 💡 **Remember:** If you implement simple pagination instead of infinite scroll, or take shortcuts with tag organization, document in DEFERRED.md for future enhancement.

### 6.1 Create Tags Page

Create `src/pages/tags.astro`:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

const posts = await getCollection('posts');
const allTags = new Set();
posts.forEach(post => {
  post.data.tags?.forEach(tag => allTags.add(tag));
});

const tags = Array.from(allTags).sort();
---

<BaseLayout title="Tags">
  <h1>Tags</h1>
  <ul>
    {tags.map(tag => (
      <li><a href={`/tags/${tag}/`}>{tag}</a></li>
    ))}
  </ul>
</BaseLayout>
```

**✓ Checkpoint 6.1:**
```bash
npm run dev
# Visit http://localhost:4321/tags
```
- [ ] Tags page loads
- [ ] All tags listed
- [ ] Tags are clickable (404 expected for now)

### 6.2 Create Individual Tag Pages

Create `src/pages/tags/[tag].astro`:
```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('posts');
  const allTags = new Set();

  posts.forEach(post => {
    post.data.tags?.forEach(tag => allTags.add(tag));
  });

  return Array.from(allTags).map(tag => {
    const tagPosts = posts.filter(post =>
      post.data.tags?.includes(tag)
    );

    return {
      params: { tag },
      props: { tag, posts: tagPosts }
    };
  });
}

const { tag, posts } = Astro.props;
---

<BaseLayout title={`Posts tagged: ${tag}`}>
  <h1>Posts tagged: {tag}</h1>
  <ul>
    {posts.map(post => {
      const slug = post.id.replace(/^\d{4}-\d{2}-\d{2}--/, '').replace(/\/index\.md$/, '');
      return (
        <li>
          <a href={`/${slug}/`}>{post.data.title}</a>
        </li>
      );
    })}
  </ul>
</BaseLayout>
```

**✓ Checkpoint 6.2:**
```bash
npm run dev
```
- [ ] Tag pages load
- [ ] Posts listed for each tag
- [ ] Can navigate to posts from tag page
- [ ] Count of posts per tag is correct

### 6.3 Add Tags to Post Display

Update post template to show tags:
```astro
<div class="post-meta">
  <time>{post.data.date}</time>
  {post.data.tags && (
    <div class="tags">
      {post.data.tags.map(tag => (
        <a href={`/tags/${tag}/`}>#{tag}</a>
      ))}
    </div>
  )}
</div>
```

**✓ Checkpoint 6.3:**
- [ ] Tags display on post pages
- [ ] Tag links work
- [ ] Clicking tag goes to tag page

### 6.4 Update Progress

Update `PROGRESS.md`:
```markdown
**Current Phase:** 6 - Tags Complete
**Working State:** Tags and tag navigation working

## What's Working
- ✅ All content (posts, pages, wiki)
- ✅ Tags system
- ✅ Tag navigation
- ❌ No search yet
- ❌ No RSS/sitemap yet
- ❌ No forms/comments yet
```

---

## Phase 7: Search

**Goal:** Add search functionality with Pagefind

### 7.1 Install Pagefind

```bash
npm install -D pagefind
```

Update `package.json`:
```json
{
  "scripts": {
    "build": "astro build && npx pagefind --site dist"
  }
}
```

**✓ Checkpoint 7.1:**
```bash
npm run build
```
- [ ] Build succeeds
- [ ] Pagefind runs after build
- [ ] pagefind/ directory created in dist/

### 7.2 Create Search Page

Create `src/pages/search.astro`:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Search">
  <h1>Search</h1>
  <div id="search"></div>
</BaseLayout>

<script>
  // Pagefind integration
  window.addEventListener('DOMContentLoaded', () => {
    new PagefindUI({ element: "#search" });
  });
</script>

<link href="/_pagefind/pagefind-ui.css" rel="stylesheet">
<script src="/_pagefind/pagefind-ui.js"></script>
```

**✓ Checkpoint 7.2:**
```bash
npm run build
npm run preview
# Visit http://localhost:4321/search
```
- [ ] Search page loads
- [ ] Search box appears
- [ ] No JavaScript errors

### 7.3 Test Search Functionality

**✓ Checkpoint 7.3:**
- [ ] Type in search box
- [ ] Results appear
- [ ] Can click result to go to post
- [ ] Search is fast
- [ ] Results are relevant

### 7.4 Add Search to Navigation

Add search link to header/navigation.

**✓ Checkpoint 7.4:**
- [ ] Search link in navigation
- [ ] Can access search from any page

### 7.5 Update Progress

Update `PROGRESS.md`:
```markdown
**Current Phase:** 7 - Search Complete
**Working State:** Full content search working

## What's Working
- ✅ All content
- ✅ Tags
- ✅ Search with Pagefind
- ❌ No RSS/sitemap yet
- ❌ No forms/comments yet
- ❌ Not production-ready yet
```

---

## Phase 8: RSS, Sitemap, SEO

**Goal:** Add RSS feed, sitemap, and SEO metadata

### 8.1 Create RSS Feed

Install RSS plugin (already installed in Phase 0):
```bash
npm install @astrojs/rss
```

Create `src/pages/rss.xml.js`:
```javascript
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('posts');

  return rss({
    title: 'Rubick.com',
    description: 'Engineering Leadership',
    site: context.site,
    items: posts.map((post) => {
      const slug = post.id.replace(/^\d{4}-\d{2}-\d{2}--/, '').replace(/\/index\.md$/, '');
      return {
        title: post.data.title,
        pubDate: new Date(post.data.date),
        description: post.data.description,
        link: `/${slug}/`,
      };
    }),
  });
}
```

**✓ Checkpoint 8.1:**
```bash
npm run build
npm run preview
# Visit http://localhost:4321/rss.xml
```
- [ ] RSS feed loads
- [ ] Valid XML format
- [ ] All posts listed
- [ ] Links are correct (root level, not /posts/)

### 8.2 Validate RSS Feed

Use https://validator.w3.org/feed/

**✓ Checkpoint 8.2:**
- [ ] RSS validates
- [ ] No errors
- [ ] All required fields present

### 8.3 Verify Sitemap

Sitemap should be auto-generated by @astrojs/sitemap.

**✓ Checkpoint 8.3:**
```bash
npm run build
npm run preview
# Visit http://localhost:4321/sitemap-index.xml
```
- [ ] Sitemap loads
- [ ] All pages listed
- [ ] URLs are correct
- [ ] No duplicate URLs

### 8.4 Create SEO Component

Create `src/components/Seo.astro`:
```astro
---
interface Props {
  title: string;
  description?: string;
  image?: string;
  article?: boolean;
}

const { title, description, image, article } = Astro.props;
const siteUrl = 'https://www.rubick.com';
---

<head>
  <title>{title}</title>
  {description && <meta name="description" content={description}>}

  <!-- Open Graph -->
  <meta property="og:title" content={title}>
  <meta property="og:type" content={article ? 'article' : 'website'}>
  {description && <meta property="og:description" content={description}>}
  {image && <meta property="og:image" content={`${siteUrl}${image}`}>}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content={title}>
  {description && <meta name="twitter:description" content={description}>}

  <!-- Analytics: Plausible -->
  <script defer data-domain="rubick.com" src="https://plausible.io/js/plausible.js"></script>
</head>
```

**✓ Checkpoint 8.4:**
- [ ] SEO component created
- [ ] Integrated into layouts
- [ ] Meta tags render in HTML

### 8.5 Test Social Sharing

Use https://www.opengraph.xyz/ or similar to test.

**✓ Checkpoint 8.5:**
- [ ] Open Graph tags present
- [ ] Twitter Card tags present
- [ ] Preview looks correct

### 8.6 Update Progress

Update `PROGRESS.md`:
```markdown
**Current Phase:** 8 - RSS/Sitemap/SEO Complete
**Working State:** SEO and feeds ready

## What's Working
- ✅ All content
- ✅ Search, tags
- ✅ RSS feed
- ✅ Sitemap
- ✅ SEO metadata
- ❌ No forms/comments yet
- ❌ Deployment config needed
```

---

## Phase 9: Forms & Comments

**Goal:** Add ConvertKit forms and Talkyard comments

> 💡 **Remember:** If you keep React components with client:load instead of converting to native Astro, document in DEFERRED.md. This is fine for launch but could be optimized later.

### 9.1 Copy ConvertKit Form Component

```bash
mkdir -p src/components/ConvertKitForm
cp -r ../src/components/ConvertKitForm/* src/components/ConvertKitForm/
```

**✓ Checkpoint 9.1:**
- [ ] Component files copied
- [ ] Dependencies present

### 9.2 Test Newsletter Page

Create or update newsletter page to use ConvertKitForm:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import ConvertKitForm from '../components/ConvertKitForm/index.jsx';
---

<BaseLayout title="Newsletter">
  <h1>Subscribe to Newsletter</h1>
  <ConvertKitForm client:load />
</BaseLayout>
```

**✓ Checkpoint 9.2:**
```bash
npm run dev
# Visit /newsletter/
```
- [ ] Form displays
- [ ] Form styling correct
- [ ] Can submit form (test with real email)
- [ ] Submission works
- [ ] Success message appears

### 9.3 Add Talkyard Comments to Posts

Create `src/components/TalkyardComments.astro`:
```astro
---
interface Props {
  discussionId?: string;
}

const { discussionId } = Astro.props;
---

{discussionId && (
  <div id="talkyard-comments">
    <script>
      // Talkyard initialization
      talkyardServerUrl = 'https://comments-for-rubick-com.talkyard.net';
      talkyardScriptUrl = talkyardServerUrl + '/talkyard-comments.min.js';

      var d = document;
      var t = d.createElement('script');
      t.type = 'text/javascript';
      t.async = true;
      t.defer = true;
      t.src = talkyardScriptUrl;
      (d.head || d.body).appendChild(t);
    </script>
    <div class="talkyard-comments" data-discussion-id={discussionId}></div>
  </div>
)}
```

**✓ Checkpoint 9.3:**
- [ ] Comments component created
- [ ] No syntax errors

### 9.4 Add Comments to Post Template

Update `src/pages/[...slug].astro`:
```astro
---
import TalkyardComments from '../components/TalkyardComments.astro';
// ... existing code
---

<BaseLayout title={post.data.title}>
  <article>
    <!-- Post content -->
  </article>

  <TalkyardComments discussionId={post.data.discussionId} />
</BaseLayout>
```

**✓ Checkpoint 9.4:**
```bash
npm run dev
# Visit a post with discussionId
```
- [ ] Comments section appears
- [ ] Comments load
- [ ] Can view existing comments
- [ ] Can post new comment (if logged in)

### 9.5 Test on Multiple Posts

Find posts with discussionId:
```bash
grep -r "discussionId" src/content/posts/ | head -5
```

**✓ Checkpoint 9.5:**
Test 3-5 posts with comments:
- [ ] Comments load on each
- [ ] Correct comments for each post
- [ ] No comment mixing between posts

### 9.6 Update Progress

Update `PROGRESS.md`:
```markdown
**Current Phase:** 9 - Forms & Comments Complete
**Working State:** Interactive features working

## What's Working
- ✅ All content
- ✅ Search, tags
- ✅ RSS, sitemap, SEO
- ✅ Newsletter forms
- ✅ Comments
- ❌ Deployment config needed
- ❌ Not production-ready yet
```

---

## Phase 10: Deployment Configuration

**Goal:** Set up Netlify configuration for production deployment

### 10.1 Create Netlify Configuration

Create `astro-blog/netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

# Domain consolidation
[[redirects]]
  from = "https://rubick.com/*"
  to = "https://www.rubick.com/:splat"
  status = 301
  force = true

# Legacy redirects
[[redirects]]
  from = "/blog"
  to = "/"
  status = 301

[[redirects]]
  from = "/subscribe"
  to = "/newsletter/"
  status = 301

[[redirects]]
  from = "/sitemap.xml"
  to = "/sitemap-index.xml"
  status = 301

# OpenACS legacy
[[redirects]]
  from = "/openacs/*"
  to = "https://openacs.org/:splat"
  status = 301

[[redirects]]
  from = "/aquarium/*"
  to = "/"
  status = 301

[[redirects]]
  from = "/bookshelf/*"
  to = "/"
  status = 301

[[redirects]]
  from = "/blogger/*"
  to = "/blogger/"
  status = 301

# Security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

# Cache control for HTML
[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

# Cache control for assets
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

**✓ Checkpoint 10.1:**
- [ ] netlify.toml created
- [ ] All redirects from Gatsby migrated
- [ ] Headers configured

### 10.2 Copy Static Files

```bash
cp -r ../static/* public/
```

**✓ Checkpoint 10.2:**
- [ ] All static files copied
- [ ] App icons present
- [ ] Favicon present
- [ ] google verification file present
- [ ] preview.jpg present

### 10.3 Set Environment Variables

Document required env vars in `.env.example`:
```bash
PLAUSIBLE_DOMAIN=rubick.com
CONTACT_POST_ADDRESS=
EMAIL_SUB_LINK=
```

**✓ Checkpoint 10.3:**
- [ ] .env.example created
- [ ] All required vars documented
- [ ] Add these to Netlify UI later

### 10.4 Test Production Build Locally

```bash
npm run build
npm run preview
```

**✓ Checkpoint 10.4:**
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No missing dependencies
- [ ] Preview works
- [ ] All pages accessible in preview

### 10.5 Check Build Output

```bash
ls -la dist/
```

**✓ Checkpoint 10.5:**
- [ ] All pages built (check dist/ for HTML files)
- [ ] Static assets present
- [ ] Pagefind files present
- [ ] Sitemap present
- [ ] RSS feed present

### 10.6 Performance Check

Run Lighthouse on preview:
```bash
npm run preview
# Open Chrome DevTools > Lighthouse
# Test homepage and a blog post
```

**✓ Checkpoint 10.6:**
- [ ] Performance score > 90
- [ ] Accessibility score > 90
- [ ] Best Practices score > 90
- [ ] SEO score > 90

If scores low, note issues in DEFERRED.md.

### 10.7 Update Progress

Update `PROGRESS.md`:
```markdown
**Current Phase:** 10 - Deployment Config Complete
**Working State:** Ready for staging deployment

## What's Working
- ✅ All features implemented
- ✅ Production build works
- ✅ Netlify config ready
- ❌ Not deployed yet
```

---

## Phase 11: Testing & Validation

**Goal:** Comprehensive testing before deployment

### 11.1 Cross-Browser Testing

Test in multiple browsers:

**✓ Checkpoint 11.1 - Chrome/Edge:**
- [ ] Homepage loads
- [ ] Posts load
- [ ] Navigation works
- [ ] Search works
- [ ] Forms work

**✓ Checkpoint 11.2 - Firefox:**
- [ ] Homepage loads
- [ ] Posts load
- [ ] Navigation works
- [ ] Search works
- [ ] Forms work

**✓ Checkpoint 11.3 - Safari:**
- [ ] Homepage loads
- [ ] Posts load
- [ ] Navigation works
- [ ] Search works
- [ ] Forms work

**✓ Checkpoint 11.4 - Mobile (iOS):**
- [ ] Responsive design works
- [ ] Touch navigation works
- [ ] No horizontal scroll

**✓ Checkpoint 11.5 - Mobile (Android):**
- [ ] Responsive design works
- [ ] Touch navigation works
- [ ] No horizontal scroll

### 11.2 Content Verification

**✓ Checkpoint 11.6:**
```bash
# Count posts in Gatsby
cd ~/Documents/Activities/Code/blog
ls content/posts/ | wc -l

# Count posts in Astro
cd astro-blog
ls src/content/posts/ | wc -l
```
- [ ] Post counts match
- [ ] Page counts match
- [ ] Wiki counts match

### 11.3 URL Structure Validation

Test these URLs exist:
```bash
npm run preview
# Test each manually or with script
```

**✓ Checkpoint 11.7:**
- [ ] Homepage: /
- [ ] Sample post: /communication-is-shared-state/ (root level, not /posts/)
- [ ] About: /about/
- [ ] Tags: /tags/
- [ ] Sample tag: /tags/leadership/
- [ ] Wiki: /wiki/
- [ ] Search: /search/
- [ ] RSS: /rss.xml
- [ ] Sitemap: /sitemap-index.xml

### 11.4 Custom Markdown Component Testing

Find posts with custom elements:
```bash
grep -l "<re-img" src/content/posts/**/*.md* | head -3
```

**✓ Checkpoint 11.8:**
Test 3 posts with `<re-img>`:
- [ ] Images display
- [ ] Styling correct
- [ ] No broken images

**✓ Checkpoint 11.9:**
Test posts with `<re-icons>` if present:
- [ ] Icons display
- [ ] Correct icons shown

**✓ Checkpoint 11.10:**
Test posts with `<re-tracedsvg-gallery>` if present:
- [ ] Gallery displays
- [ ] Images load
- [ ] Gallery interactions work

### 11.5 Typography Testing

**✓ Checkpoint 11.11:**
Find a post with quotes and dashes:
- [ ] Curly quotes render correctly (" " ' ')
- [ ] Em dashes render (—)
- [ ] En dashes render (–)
- [ ] remark-smartypants working

### 11.6 Link Verification

**✓ Checkpoint 11.12:**
Test internal links on 5 random posts:
- [ ] Links between posts work
- [ ] Links to pages work
- [ ] Links to wiki work
- [ ] No 404s from internal links

**✓ Checkpoint 11.13:**
Test external links on 3 random posts:
- [ ] External links open
- [ ] External links open in new tab (if configured)
- [ ] No broken external links (sample)

### 11.7 Form & Comment Testing

**✓ Checkpoint 11.14:**
Test newsletter form:
- [ ] Form displays correctly
- [ ] Can enter email
- [ ] Submit works
- [ ] Success message appears
- [ ] Email received in ConvertKit

**✓ Checkpoint 11.15:**
Test comments on 3 posts:
- [ ] Comments load
- [ ] Can post comment (if logged in)
- [ ] Comments appear correctly

### 11.8 Search Testing

**✓ Checkpoint 11.16:**
Test search functionality:
- [ ] Search box works
- [ ] Type query: shows results
- [ ] Results are relevant
- [ ] Can navigate to result
- [ ] Search on mobile works

### 11.9 Tag Testing

**✓ Checkpoint 11.17:**
Test tag pages:
- [ ] /tags/ lists all tags
- [ ] Pick 3 tags, test each tag page
- [ ] Posts listed are correct
- [ ] Can navigate from tag to post

### 11.10 Update Progress

Update `PROGRESS.md`:
```markdown
**Current Phase:** 11 - Testing Complete
**Working State:** Fully tested, ready for staging

## What's Working
- ✅ All features tested
- ✅ Cross-browser verified
- ✅ Content verified
- ✅ Links validated
- ✅ Ready for staging deployment
```

---

## Phase 12: Staging Deployment

**Goal:** Deploy to Netlify staging for final verification

### 12.1 Create Netlify Site

In Netlify UI:
1. New site from Git
2. Connect to repository
3. Configure build settings

**✓ Checkpoint 12.1:**
- [ ] Netlify site created
- [ ] Build settings configured
- [ ] Connected to git repo

### 12.2 Configure Environment Variables

In Netlify UI, add:
- PLAUSIBLE_DOMAIN=rubick.com
- Other vars from .env.example

**✓ Checkpoint 12.2:**
- [ ] All env vars added to Netlify
- [ ] Values correct

### 12.3 Deploy to Staging

```bash
git add .
git commit -m "Ready for staging deployment"
git push
```

Or use Netlify CLI:
```bash
npm install -g netlify-cli
netlify login
netlify deploy --build
```

**✓ Checkpoint 12.3:**
- [ ] Deploy initiated
- [ ] Build succeeds on Netlify
- [ ] Site is live at staging URL

### 12.4 Test Staging Site

**✓ Checkpoint 12.4:**
Test staging URL (e.g., https://random-name.netlify.app):
- [ ] Homepage loads
- [ ] Posts load
- [ ] Navigation works
- [ ] Search works
- [ ] Forms work
- [ ] Comments load
- [ ] RSS feed works
- [ ] Sitemap works

### 12.5 Performance Testing on Staging

Run Lighthouse on staging:

**✓ Checkpoint 12.5:**
- [ ] Performance score acceptable
- [ ] No critical issues
- [ ] Load time acceptable

### 12.6 Share Staging Link

Share staging link with others for testing (optional).

**✓ Checkpoint 12.6:**
- [ ] Get feedback
- [ ] Note any issues
- [ ] Fix critical issues

### 12.7 Update Progress

Update `PROGRESS.md`:
```markdown
**Current Phase:** 12 - Staging Deployed
**Working State:** Live on staging, being tested

## What's Working
- ✅ Deployed to Netlify staging
- ✅ All features working on staging
- ✅ Ready for production deployment

## Staging URL
https://[your-staging-url].netlify.app
```

---

## Phase 13: Production Deployment

**Goal:** Deploy to production

### 13.1 Final Pre-Production Checks

**✓ Checkpoint 13.1:**
- [ ] All staging tests passed
- [ ] No critical bugs
- [ ] Analytics configured
- [ ] Forms tested
- [ ] Comments tested
- [ ] Redirects configured
- [ ] DNS ready (if needed)

### 13.2 Deploy to Production

In Netlify:
```bash
netlify deploy --prod
```

Or promote staging deployment to production in Netlify UI.

**✓ Checkpoint 13.2:**
- [ ] Production deployment initiated
- [ ] Build succeeds
- [ ] Site live at production URL

### 13.3 Configure Custom Domain

In Netlify UI:
1. Add custom domain: www.rubick.com
2. Configure DNS
3. Enable HTTPS

**✓ Checkpoint 13.3:**
- [ ] Custom domain configured
- [ ] DNS propagated
- [ ] HTTPS enabled
- [ ] www.rubick.com loads correctly

### 13.4 Verify Production

**✓ Checkpoint 13.4:**
Visit https://www.rubick.com:
- [ ] Homepage loads
- [ ] Pick 5 random posts, test each
- [ ] Test pages (about, contact)
- [ ] Test tags
- [ ] Test search
- [ ] Test forms
- [ ] Test comments

### 13.5 Test Redirects

**✓ Checkpoint 13.5:**
Test legacy redirects:
- [ ] http://rubick.com → https://www.rubick.com
- [ ] /blog → /
- [ ] /subscribe → /newsletter/
- [ ] /sitemap.xml → /sitemap-index.xml
- [ ] /openacs/test → https://openacs.org/test

### 13.6 Monitor Initial Traffic

**✓ Checkpoint 13.6:**
For first hour:
- [ ] Check Netlify logs for errors
- [ ] Check Plausible for traffic
- [ ] Monitor for 404s
- [ ] Check for broken images

### 13.7 Verify Analytics

**✓ Checkpoint 13.7:**
- [ ] Plausible tracking working
- [ ] Page views recorded
- [ ] No JavaScript errors

### 13.8 Submit to Search Engines

**✓ Checkpoint 13.8:**
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster
- [ ] Verify site ownership

### 13.9 Update Progress

Update `PROGRESS.md`:
```markdown
**Current Phase:** 13 - PRODUCTION LIVE! 🎉
**Working State:** Live at https://www.rubick.com

## What's Working
- ✅ Production deployment successful
- ✅ All features working
- ✅ Analytics tracking
- ✅ Migration complete!

## Post-Launch Monitoring
- Monitor for 48 hours
- Track analytics
- Watch for issues
```

---

## Phase 14: Post-Launch & Deferred Work

**Goal:** Monitor, optimize, and address deferred items

### 14.1 Initial Monitoring

**✓ Checkpoint 14.1 (24 hours):**
- [ ] No critical errors
- [ ] Traffic normal
- [ ] Forms working
- [ ] Comments working
- [ ] No increase in 404s

**✓ Checkpoint 14.2 (48 hours):**
- [ ] Stable performance
- [ ] No user complaints
- [ ] Analytics data looks normal

### 14.2 Address Deferred Items

Review `DEFERRED.md` and prioritize:

**Item #1 - Infinite Scroll**
- Status: Deferred
- Priority: Low
- Decision: Implement or leave as traditional pagination?

**Item #2 - Convert React to Astro**
- Status: Deferred
- Priority: Medium
- Decision: Start with which components?

**Item #3 - Utility Scripts**
- Status: Deferred
- Priority: Medium
- Action: Migrate link verification script first

**✓ Checkpoint 14.3:**
- [ ] Deferred items reviewed
- [ ] Priorities set
- [ ] Plan for addressing top items

### 14.3 Performance Optimization

**✓ Checkpoint 14.4:**
Run performance audit:
- [ ] Identify slow pages
- [ ] Optimize images if needed
- [ ] Check bundle sizes
- [ ] Optimize fonts if needed

### 14.4 Backup Gatsby Site

**✓ Checkpoint 14.5:**
- [ ] Gatsby site still accessible at old URL (if kept)
- [ ] OR: Gatsby site archived locally
- [ ] Don't delete Gatsby code until Astro stable for 2 weeks

### 14.5 Update Documentation

**✓ Checkpoint 14.6:**
- [ ] Update README.md in repo
- [ ] Document any gotchas
- [ ] Document deployment process
- [ ] Document how to add new posts

### 14.6 Celebrate!

**✓ Checkpoint 14.7:**
- [ ] Migration complete! 🎉
- [ ] Blog is faster
- [ ] Easier to maintain
- [ ] Modern tooling

---

## Appendix A: Quick Reference

### File Locations

```
astro-blog/
├── src/
│   ├── pages/
│   │   ├── index.astro          # Homepage
│   │   ├── [...slug].astro      # Blog posts (root level)
│   │   ├── [page].astro         # Pages (about, contact, etc.)
│   │   ├── tags.astro           # Tags listing
│   │   ├── tags/[tag].astro     # Individual tag pages
│   │   ├── wiki/[...slug].astro # Wiki pages
│   │   ├── search.astro         # Search page
│   │   └── rss.xml.js          # RSS feed
│   ├── content/
│   │   ├── config.ts           # Content collections schema
│   │   ├── posts/              # Blog post markdown files
│   │   ├── pages/              # Page markdown files
│   │   └── wiki/               # Wiki markdown files
│   ├── layouts/
│   │   └── BaseLayout.astro    # Main layout
│   ├── components/
│   │   ├── Header/             # Header component
│   │   ├── Footer/             # Footer component
│   │   ├── Seo.astro          # SEO component
│   │   └── TalkyardComments.astro
│   └── styles/
│       └── variables.css       # CSS custom properties
├── public/                     # Static files
├── astro.config.mjs           # Astro configuration
├── netlify.toml               # Netlify configuration
├── PROGRESS.md                # Current status
├── DECISIONS.md               # Decisions log
└── DEFERRED.md                # Deferred work log
```

### Common Commands

```bash
# Development
cd astro-blog
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview build

# Deployment
netlify deploy        # Deploy to staging
netlify deploy --prod # Deploy to production
```

### Key URLs

- Homepage: /
- Posts: /[post-slug]/ (root level!)
- Pages: /about/, /contact/, etc.
- Tags: /tags/, /tags/[tag]/
- Wiki: /wiki/, /wiki/[...path]/
- Search: /search/
- RSS: /rss.xml
- Sitemap: /sitemap-index.xml

### Important Notes

1. **Posts route to ROOT**: `/my-post/` not `/posts/my-post/`
2. **Always test after each checkpoint**: Don't skip ahead
3. **Keep Gatsby running**: Until Astro proven stable
4. **Document decisions**: In DECISIONS.md
5. **Track deferred work**: In DEFERRED.md
6. **Update progress**: After each phase

## Appendix B: Utility Scripts (Post-Launch)

### Link Verification Script

Update `scripts/verify-links.js` for Astro:
```javascript
// Use Astro's getCollection instead of GraphQL
// Posts at root: /{slug}/ not /posts/{slug}/
// See original plan for full details
```

### Podcast RSS Refresh Script

Update `scripts/refresh-podcast-feed.js` for Astro content collections.

### Icon Generation Script

Should work as-is, just verify paths point to `astro-blog/public/`.
