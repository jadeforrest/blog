/**
 * Marks the LCP candidate image in each MDX post.
 *
 * Nearly every post opens with a full-width `<Image>` a paragraph or two in. That image is the
 * Largest Contentful Paint element on the page, and Astro's default is `loading="lazy"` — which
 * hides it from the browser's preload scanner, so it isn't requested until layout runs. This
 * plugin adds Astro's `priority` prop (loading=eager + decoding=sync + fetchpriority=high) plus a
 * srcset/sizes pair matched to the article column, without touching 107 MDX files by hand.
 *
 * Only the MDX pipeline produces `mdxJsxFlowElement` nodes, so this is a structural no-op on
 * plain Markdown (the wiki). Author-supplied attributes always win — nothing is overwritten.
 */

/**
 * The article column is `min(700px, 100vw - 40px)`:
 *   src/styles/variables.css      --size-article-max-width: 700px
 *   src/layouts/BaseLayout.astro  .site-main horizontal padding, 20px per side
 * Crossover at a 740px viewport. Keep in sync with those two rules.
 */
export const LCP_IMAGE_SIZES = "(min-width: 740px) 700px, calc(100vw - 40px)";

/**
 * 400  small phone @1x
 * 700  desktop column @1x
 * 800  the width the posts already declare, so it is built either way
 * 1400 desktop column @2x
 * Astro clamps anything wider than the source and substitutes the intrinsic width instead, so
 * small sources degrade gracefully rather than upscaling.
 */
export const LCP_IMAGE_WIDTHS = [400, 700, 800, 1400];

/**
 * How far into the document an image can sit and still be the LCP element. Measured across all
 * 108 posts, the first `<Image>` lands at content index 0/1/2/3/4 in 36/55/13/2/1 posts. The one
 * at index 4 sits below a paragraph, a list and two more paragraphs — genuinely below the fold,
 * so excluding it is correct.
 */
const MAX_CONTENT_INDEX = 3;

const COMPONENT_NAME = "Image";

/** Nodes that render nothing: frontmatter, imports, `{/* comments *\/}`, link definitions. */
const NON_RENDERING = new Set([
  "yaml",
  "toml",
  "mdxjsEsm",
  "mdxFlowExpression",
  "definition",
  "footnoteDefinition",
]);

/**
 * Build a `name={[1, 2, 3]}` JSX attribute. The estree shape mirrors the one @astrojs/mdx builds
 * in rehype-images-to-component.js, so it stays compatible with the installed MDX compiler.
 */
function arrayAttribute(name, values) {
  return {
    type: "mdxJsxAttribute",
    name,
    value: {
      type: "mdxJsxAttributeValueExpression",
      value: `[${values.join(", ")}]`,
      data: {
        estree: {
          type: "Program",
          sourceType: "module",
          comments: [],
          body: [
            {
              type: "ExpressionStatement",
              expression: {
                type: "ArrayExpression",
                elements: values.map((value) => ({
                  type: "Literal",
                  value,
                  raw: String(value),
                })),
              },
            },
          ],
        },
      },
    },
  };
}

export default function remarkLcpImage(options = {}) {
  const componentName = options.componentName ?? COMPONENT_NAME;
  const sizes = options.sizes ?? LCP_IMAGE_SIZES;
  const widths = options.widths ?? LCP_IMAGE_WIDTHS;
  const maxContentIndex = options.maxContentIndex ?? MAX_CONTENT_INDEX;

  return function transformer(tree) {
    if (!tree || tree.type !== "root" || !Array.isArray(tree.children)) return;

    let contentIndex = 0;
    for (const node of tree.children) {
      if (NON_RENDERING.has(node.type)) continue;
      if (contentIndex > maxContentIndex) return;
      contentIndex += 1;

      if (node.type !== "mdxJsxFlowElement" || node.name !== componentName) continue;
      if (!Array.isArray(node.attributes)) return;

      // A spread (`{...props}`) means we cannot tell what is already set. Leave it alone.
      if (node.attributes.some((a) => a && a.type === "mdxJsxExpressionAttribute")) return;

      const declared = new Set(
        node.attributes.filter((a) => a && a.type === "mdxJsxAttribute").map((a) => a.name)
      );

      // Any hand-tuned loading hint doubles as a per-post opt-out.
      if (declared.has("priority") || declared.has("loading") || declared.has("fetchpriority")) {
        return;
      }

      node.attributes.push({ type: "mdxJsxAttribute", name: "priority", value: null });
      if (!declared.has("sizes")) {
        node.attributes.push({ type: "mdxJsxAttribute", name: "sizes", value: sizes });
      }
      if (!declared.has("widths") && !declared.has("densities")) {
        node.attributes.push(arrayAttribute("widths", widths));
      }
      return; // first image only
    }
  };
}
