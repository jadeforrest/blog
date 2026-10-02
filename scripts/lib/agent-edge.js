// Request handling for the agent-negotiation edge function, kept free of
// Netlify APIs so it can be unit-tested under node. The edge function passes
// `next` (serve the request as normal) and `fetchAsset` (fetch another static
// path on this site).
import { HTML, MARKDOWN, isAcceptable, negotiate } from "./accept.js";
import { SITE, markdownPathFor } from "./agent-paths.js";

const MARKDOWN_TYPE = "text/markdown; charset=utf-8";

export function addVary(headers, value) {
  const current = headers.get("vary");
  const parts = current ? current.split(",").map((s) => s.trim()).filter(Boolean) : [];
  if (parts.some((p) => p === "*" || p.toLowerCase() === value.toLowerCase())) return;
  headers.set("vary", [value, ...parts].join(", "));
}

function withVary(response) {
  const out = new Response(response.body, response);
  addVary(out.headers, "Accept");
  return out;
}

function markdownResponse(request, body, status, extra = {}) {
  const headers = new Headers({
    "content-type": MARKDOWN_TYPE,
    vary: "Accept, Accept-Encoding",
    "cache-control": "public, max-age=0, must-revalidate",
    ...extra,
  });
  return new Response(request.method === "HEAD" ? null : body, { status, headers });
}

function notAcceptable(request) {
  const body = [
    "406 Not Acceptable",
    "",
    "This resource is available as:",
    `- ${HTML}`,
    `- ${MARKDOWN}`,
    "",
    `You requested: ${request.headers.get("accept")}`,
    "",
  ].join("\n");
  return new Response(request.method === "HEAD" ? null : body, {
    status: 406,
    headers: { "content-type": "text/plain; charset=utf-8", vary: "Accept", "cache-control": "no-store" },
  });
}

const isHtml = (res) => (res.headers.get("content-type") || "").toLowerCase().startsWith(HTML);

// Direct requests for a Markdown twin: fix the media type (static hosting
// would say text/markdown without a charset, or octet-stream) and point search
// engines at the HTML page as canonical.
async function serveMarkdownFile(pathname, next) {
  const res = await next();
  if (!res.ok) return res;
  const out = new Response(res.body, res);
  out.headers.set("content-type", MARKDOWN_TYPE);
  if (pathname.endsWith("/index.md")) {
    out.headers.set("link", `<${SITE}${pathname.slice(0, -"index.md".length)}>; rel="canonical"`);
  }
  return out;
}

// The client prefers Markdown: the twin if there is one, a Markdown 404 if the
// page does not exist, else HTML when that is acceptable too, else 406.
async function serveMarkdownVariant(request, pathname, { next, fetchAsset }) {
  const mdPath = markdownPathFor(pathname);
  const md = await fetchAsset(mdPath);
  // !isHtml: a missing twin can come back as the HTML 404 page, or as HTML
  // via a forced redirect if fetchAsset follows redirects.
  if (md.ok && !isHtml(md)) {
    return markdownResponse(request, await md.text(), 200, {
      link: `<${SITE}${mdPath.slice(0, -"index.md".length)}>; rel="canonical"`,
    });
  }
  const res = await next();
  if (res.status === 404) {
    const body = await fetchAsset("/404.md");
    return markdownResponse(request, body.ok ? await body.text() : "# Page not found\n", 404);
  }
  if (res.ok && isHtml(res) && !isAcceptable(request.headers.get("accept"), HTML)) {
    return notAcceptable(request);
  }
  return withVary(res);
}

export async function handleAgentRequest(request, deps) {
  if (request.method !== "GET" && request.method !== "HEAD") return undefined;
  const { pathname } = new URL(request.url);
  if (pathname.endsWith(".md")) return serveMarkdownFile(pathname, deps.next);

  const choice = negotiate(request.headers.get("accept"));
  if (choice === MARKDOWN) return serveMarkdownVariant(request, pathname, deps);

  const res = await deps.next();
  if (choice === null && res.ok && isHtml(res)) return notAcceptable(request);
  return withVary(res);
}
