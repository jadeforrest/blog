// Markdown content negotiation for agents (https://acceptmarkdown.com):
// Accept: text/markdown on any page returns its build-time Markdown twin
// (scripts/build-agent-files.js) with Vary: Accept; missing pages return a
// Markdown 404; HTML responses gain Vary: Accept so caches keep the variants
// apart. Logic lives in scripts/lib/agent-edge.js, where it is unit-tested.
//
// Routing is declared in netlify.toml, not inline: the function runs only for
// requests whose Accept names text/markdown, and for direct *.md requests.
// Ordinary page views never invoke it.
import { handleAgentRequest } from "../../scripts/lib/agent-edge.js";

export default (request, context) =>
  handleAgentRequest(request, {
    next: () => context.next(),
    // redirect: "manual" so a forced redirect is never mistaken for the twin.
    fetchAsset: (path) =>
      fetch(new URL(path, request.url), {
        headers: { accept: "text/markdown" },
        redirect: "manual",
      }),
  });
