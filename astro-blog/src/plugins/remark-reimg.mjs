import { visit } from "unist-util-visit";

/**
 * Remark plugin to transform <re-img> custom HTML elements
 * into standard img tags with relative paths
 *
 * This works by modifying the MDX tree to replace mdxJsxFlowElement nodes
 */
export function remarkReimg() {
  return (tree) => {
    visit(tree, (node) => {
      // Look for mdxJsxFlowElement nodes with name "re-img"
      if (
        node.type === "mdxJsxFlowElement" &&
        node.name === "re-img"
      ) {
        // Extract src from attributes
        const srcAttr = node.attributes?.find((attr) => attr.name === "src");
        if (srcAttr && srcAttr.value) {
          const src = srcAttr.value;

          // Replace with an html node containing a standard img tag
          node.type = "html";
          node.value = `<img src="./${src}" style="margin: 2.5em 0; width: 100%; display: block; border-radius: 4px;" />`;
          delete node.name;
          delete node.attributes;
          delete node.children;
        }
      }
    });
  };
}

export default remarkReimg;
