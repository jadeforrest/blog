# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development
- Build: `npm run build`
- Develop: `npm run develop` or `npm run devhost` (for network access). But when doing this for verification, just prompt me and I will do it manually and let you know the response.
- Format code: `npm run format`
- Lint: `npm run lint` (all errors/warnings) or `npm run lint-errors` (errors only)
- Style lint: `npm run stylelint`

## Code Style Guidelines
- Uses ESLint with Google, Prettier, and React recommended configs
- Code formatting: 100 char line length, double quotes for strings
- Naming: camelCase for variables and functions
- React components: PascalCase for component names
- Error handling: console errors allowed but use sparingly
- TypeScript is used for some components (`.tsx` files)
- Import order: React, libraries, local components, styles
- Prefer destructuring for props in React components
- Follow JSX-a11y accessibility guidelines for React components