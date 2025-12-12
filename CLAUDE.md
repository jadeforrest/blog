# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains two blog implementations:
1. **Legacy Gatsby blog** - Located in `gatsby-blog/` directory (being phased out)
2. **Current Astro blog** - Located at repository root (primary codebase)

All commands below refer to the Astro blog unless specified otherwise.

## Build and Development

### Astro Blog (Current)
- **Dev server**: `npm run dev` (runs at `localhost:4321`)
  - Automatically copies post images from `src/content/posts/` to `public/` before starting
- **Build**: `npm run build`
  - Copies images, builds the site to `dist/`, and generates search index with Pagefind
- **Preview**: `npm run preview` (preview production build)

#### Image Processing Scripts
- **Incremental build** (default): `npm run copy-images`
  - Skips existing images for faster builds (generated WebP files are checked in)
- **Force regeneration**: `npm run copy-images:force`
  - Regenerates all images even if they exist
- **Clean old images**: `npm run images:clean` or `npm run copy-images:clean`
  - Removes directories for deleted posts (safely checks for WebP files)

### Gatsby Blog (Legacy)
Navigate to `gatsby-blog/` directory first:
- **Dev server**: `npm run develop` or `npm run devhost` (network access)
- **Build**: `npm run build`
- **Format**: `npm run format`
- **Lint**: `npm run lint` (all) or `npm run lint-errors` (errors only)

## Architecture

### Content Management
- **Blog posts**: Located in `src/content/posts/`
  - Directory naming: `YYYY-MM-DD--slug-name/index.mdx` (date prefix required)
  - Images stored alongside post content files
  - Content images use Astro's native Image component (imported at top of MDX)
  - Cover images still use `copy-post-images.js` build script (see TODO.md for future migration)
  - Content schema defined in `src/content/config.ts` (title, tags, cover, description, etc.)

- **Wiki pages**: Located in `src/content/wiki/`
  - Separate content collection with icon and description fields

### Routing
- **Dynamic post routes**: `src/pages/[...slug].astro` handles individual post pages
- **Paginated index**: `src/pages/[...page].astro` handles homepage pagination
- **Tag pages**: `src/pages/tags/` for tag-based filtering
- **Wiki routes**: `src/pages/wiki/` for wiki content

### Key Features
- **Search**: Pagefind integration (`npx pagefind --site dist` during build)
- **RSS**: Generated at `src/pages/rss.xml.ts`
- **Sitemap**: Automatic via `@astrojs/sitemap`
- **MDX support**: Uses `remarkSmartypants` for typography
- **Images**: Astro's native Image component for optimization and responsive images

### Styling
- PostCSS with plugins: nested, preset-env, easy-media-query, text-remove-gap
- Configuration in `postcss.config.cjs`
- Theme configuration in `src/theme/`

### Components
- React components used via `@astrojs/react`
- Located in `src/components/`
- Astro layouts in `src/layouts/`

## Code Style Guidelines

- **Formatting**: 100 char line length, double quotes for strings (Prettier)
- **Linting**: ESLint with Google, Prettier, React recommended configs
- **Naming conventions**:
  - camelCase for variables and functions
  - PascalCase for React component names
- **TypeScript**: Used for some components (`.tsx` files) and config
- **Import order**: React, libraries, local components, styles
- **React patterns**: Prefer destructuring for props, follow JSX-a11y accessibility guidelines
- **Error handling**: console errors allowed but use sparingly

## Image Handling

### Content Images (in MDX posts)
- Use Astro's native Image component
- Import images at top of MDX file:
  ```mdx
  import { Image } from 'astro:assets';
  import myImage from './my-image.jpg';
  ```
- Use in content:
  ```mdx
  <Image src={myImage} alt="Descriptive alt text" width={800} />
  ```

### Width Control Classes
Available CSS classes for controlling image width:
- `img-30` - 30% width
- `img-50` - 50% width
- `img-60` - 60% width
- `img-75` - 75% width
- `img-80` - 80% width
- `img-meme` - 30% width with meme styling

Usage: `<Image src={img} alt="..." width={400} class="img-50" />`

### Cover Images (listing pages)
- Use string paths in frontmatter: `cover: "image.jpg"`
- Build script generates WebP thumbnails (240px, 400px) via `copy-post-images.js`
- Displayed using manual `<picture>` elements in listing page templates
- Future migration to Astro Image planned (see TODO.md)

## Important Notes

- Content image imports use relative paths: `import img from './image.png'`
- Site URL configured as `https://www.rubick.com` in `astro.config.mjs`
- Syntax highlighting via Shiki with `github-dark` theme
- The Astro blog does not have lint/format scripts configured (linting only set up for Gatsby)
