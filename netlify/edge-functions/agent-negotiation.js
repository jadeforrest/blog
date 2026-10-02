// Markdown content negotiation for agents (https://acceptmarkdown.com):
// Accept: text/markdown on any page returns its build-time Markdown twin
// (scripts/build-agent-files.js) with Vary: Accept; missing pages return a
// Markdown 404; HTML responses gain Vary: Accept so caches keep the variants
// apart. Logic lives in scripts/lib/agent-edge.js, where it is unit-tested.
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

export const config = {
  path: "/*",
  // Static assets (anything with a file extension other than .md) skip the
  // function entirely; pages and Markdown twins go through it.
  excludedPattern: "^/.*\\.(?!md$)[A-Za-z0-9]+$",
};
