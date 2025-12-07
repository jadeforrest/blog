import { visit } from "unist-util-visit";

/**
 * Remark plugin to transform <re-img> custom HTML elements
 * into standard img tags with absolute paths
 *
 * This works by modifying the MDX tree to replace mdxJsxFlowElement nodes
 */
export function remarkReimg() {
  return (tree, file) => {
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

          // Extract slug from file path
          // File path format: src/content/posts/YYYY-MM-DD--slug/index.mdx
          const filePath = file.history[0] || file.path || "";
          const match = filePath.match(/\/(\d{4}-\d{2}-\d{2}--[^/]+)\//);
          let imagePath = src;

          if (match) {
            // Remove date prefix from slug
            const slug = match[1].replace(/^\d{4}-\d{2}-\d{2}--/, "");
            // Create absolute path: /slug/image.jpg
            imagePath = `/${slug}/${src}`;
          }

          // Replace with an html node containing a standard img tag
          node.type = "html";
          node.value = `<img src="${imagePath}" style="margin: 2.5em 0; width: 100%; display: block; border-radius: 4px;" />`;
          delete node.name;
          delete node.attributes;
          delete node.children;
        }
      }
    });
  };
}

export default remarkReimg;
