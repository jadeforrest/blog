import { test } from "node:test";
import assert from "node:assert/strict";
import { addVary, handleAgentRequest } from "./agent-edge.js";

const ORIGIN = "https://www.rubick.com";
const html = (status = 200, body = "<h1>page</h1>") =>
  new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=UTF-8", vary: "Accept-Encoding" },
  });

// A fake site: `pages` are HTML paths that exist, `assets` are static files.
function site({ pages = ["/foo/"], assets = { "/foo/index.md": "# Foo\n", "/404.md": "# Page not found\n" } } = {}) {
  const calls = { next: 0, fetched: [] };
  return {
    calls,
    deps: (pathname) => ({
      next: async () => {
        calls.next++;
        if (pathname in assets) {
          return new Response(assets[pathname], { headers: { "content-type": "text/markdown" } });
        }
        return pages.includes(pathname) ? html() : html(404, "<h1>404</h1>");
      },
      fetchAsset: async (path) => {
        calls.fetched.push(path);
        if (path in assets) {
          return new Response(assets[path], { headers: { "content-type": "text/markdown" } });
        }
        return html(404);
      },
    }),
  };
}

async function run(path, { accept, method = "GET", ...opts } = {}) {
  const s = site(opts);
  const headers = accept === undefined ? {} : { accept };
  const request = new Request(`${ORIGIN}${path}`, { method, headers });
  const res = await handleAgentRequest(request, s.deps(path));
  return { res, calls: s.calls };
}

test("Accept: text/markdown serves the twin with markdown headers", async () => {
  const { res } = await run("/foo/", { accept: "text/markdown" });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.match(res.headers.get("vary"), /\bAccept\b/);
  assert.equal(res.headers.get("link"), `<${ORIGIN}/foo/>; rel="canonical"`);
  assert.equal(res.headers.get("cache-control"), "public, max-age=0, must-revalidate");
  assert.equal(await res.text(), "# Foo\n");
});

test("a path without trailing slash maps to the same twin and canonical", async () => {
  const { res, calls } = await run("/foo", { accept: "text/markdown" });
  assert.deepEqual(calls.fetched, ["/foo/index.md"]);
  assert.equal(res.headers.get("link"), `<${ORIGIN}/foo/>; rel="canonical"`);
});

test("HEAD gets markdown headers without a body", async () => {
  const { res } = await run("/foo/", { accept: "text/markdown", method: "HEAD" });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.equal(await res.text(), "");
});

test("browsers get HTML with Vary: Accept added", async () => {
  const { res, calls } = await run("/foo/", {
    accept: "text/html,application/xhtml+xml,*/*;q=0.8",
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/html/);
  assert.equal(res.headers.get("vary"), "Accept, Accept-Encoding");
  assert.deepEqual(calls.fetched, []);
});

test("no Accept header and */* get HTML", async () => {
  for (const accept of [undefined, "*/*"]) {
    const { res } = await run("/foo/", { accept });
    assert.match(res.headers.get("content-type"), /^text\/html/);
  }
});

test("missing page requested as markdown: 404 with markdown guidance", async () => {
  const { res, calls } = await run("/nope/", { accept: "text/markdown" });
  assert.deepEqual(calls.fetched, ["/nope/index.md", "/404.md"]);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.match(res.headers.get("vary"), /\bAccept\b/);
  assert.equal(await res.text(), "# Page not found\n");
});

test("missing 404.md falls back to a minimal markdown body", async () => {
  const { res } = await run("/nope/", { accept: "text/markdown", assets: {} });
  assert.equal(res.status, 404);
  assert.equal(await res.text(), "# Page not found\n");
});

test("missing page requested as HTML keeps the HTML 404", async () => {
  const { res } = await run("/nope/", { accept: "text/html" });
  assert.equal(res.status, 404);
  assert.match(res.headers.get("content-type"), /^text\/html/);
  assert.match(res.headers.get("vary"), /\bAccept\b/);
});

test("unsupported types get 406 listing what is available", async () => {
  const { res } = await run("/foo/", { accept: "application/pdf" });
  assert.equal(res.status, 406);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.match(res.headers.get("vary"), /\bAccept\b/);
  assert.equal(res.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(
    await res.text(),
    "406 Not Acceptable\n\nThis resource is available as:\n- text/html\n- text/markdown\n\nYou requested: application/pdf\n"
  );
});

test("406 on HEAD has no body", async () => {
  const { res } = await run("/foo/", { accept: "application/pdf", method: "HEAD" });
  assert.equal(res.status, 406);
  assert.equal(await res.text(), "");
});

test("unsupported Accept on a missing page stays 404, not 406", async () => {
  const { res } = await run("/nope/", { accept: "application/pdf" });
  assert.equal(res.status, 404);
});

test("page with no twin: markdown-only client gets 406", async () => {
  const { res } = await run("/stub/", { accept: "text/markdown", pages: ["/stub/"] });
  assert.equal(res.status, 406);
});

test("page with no twin: falls back to HTML when HTML is acceptable", async () => {
  const { res } = await run("/stub/", {
    accept: "text/markdown, text/html;q=0.5",
    pages: ["/stub/"],
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/html/);
  assert.match(res.headers.get("vary"), /\bAccept\b/);
});

test("a twin fetch that comes back as HTML is not served as markdown", async () => {
  const s = site();
  const request = new Request(`${ORIGIN}/foo/`, { headers: { accept: "text/markdown" } });
  const deps = s.deps("/foo/");
  deps.fetchAsset = async () => html(200, "<h1>redirect target</h1>");
  const res = await handleAgentRequest(request, deps);
  assert.equal(res.status, 406);
});

test("direct .md requests get charset and a canonical link", async () => {
  const { res } = await run("/foo/index.md");
  assert.equal(res.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.equal(res.headers.get("link"), `<${ORIGIN}/foo/>; rel="canonical"`);
});

test("direct .md that is not an index twin gets no canonical", async () => {
  const { res } = await run("/404.md");
  assert.equal(res.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.equal(res.headers.get("link"), null);
});

test("direct .md that does not exist passes the 404 through", async () => {
  const { res } = await run("/nope/index.md");
  assert.equal(res.status, 404);
  assert.match(res.headers.get("content-type"), /^text\/html/);
});

test("a redirect is passed through to a markdown-only client, not 406", async () => {
  const request = new Request(`${ORIGIN}/old/`, { headers: { accept: "text/markdown" } });
  const res = await handleAgentRequest(request, {
    next: async () => new Response(null, { status: 301, headers: { location: "/new/" } }),
    fetchAsset: async () => html(404),
  });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "/new/");
  assert.equal(res.headers.get("vary"), "Accept");
});

test("non-GET/HEAD requests are left alone", async () => {
  const { res, calls } = await run("/foo/", { accept: "text/markdown", method: "POST" });
  assert.equal(res, undefined);
  assert.equal(calls.next, 0);
});

test("addVary merges without duplicating", () => {
  const h = new Headers();
  addVary(h, "Accept");
  assert.equal(h.get("vary"), "Accept");
  addVary(h, "accept");
  assert.equal(h.get("vary"), "Accept");
  const star = new Headers({ vary: "*" });
  addVary(star, "Accept");
  assert.equal(star.get("vary"), "*");
  const spaced = new Headers({ vary: "Accept-Encoding,  Accept " });
  addVary(spaced, "Accept");
  assert.equal(spaced.get("vary"), "Accept-Encoding,  Accept");
  const enc = new Headers({ vary: "Accept-Encoding, " });
  addVary(enc, "Accept");
  assert.equal(enc.get("vary"), "Accept, Accept-Encoding");
});

test("a non-HTML page with no twin is passed through, not 406", async () => {
  const request = new Request(`${ORIGIN}/feed/`, { headers: { accept: "text/markdown" } });
  const res = await handleAgentRequest(request, {
    next: async () => new Response("{}", { headers: { "content-type": "application/json" } }),
    fetchAsset: async () => html(404),
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/json");
});
