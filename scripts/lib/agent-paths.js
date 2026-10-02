// Dependency-free (it is bundled into the Netlify edge function): where the
// Markdown twin of a page lives.
export const SITE = "https://www.rubick.com";

// "/" -> "/index.md", "/foo/" and "/foo" -> "/foo/index.md". Mirrors Astro's
// directory build format, where /foo/ is served from foo/index.html.
export function markdownPathFor(pathname) {
  const dir = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return `${dir}index.md`;
}
