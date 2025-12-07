import { visit } from "unist-util-visit";

/**
 * Remark plugin to transform <re-img> custom HTML elements
 * into standard img tags with relative paths
 */
export function remarkReimg() {
  return (tree) => {
    visit(tree, "html", (node) => {
      if (node.value && node.value.includes("<re-img")) {
        // Extract src attribute from <re-img src="filename.jpg">
        const srcMatch = node.value.match(/src=["']([^"']+)["']/);
        if (srcMatch) {
          const src = srcMatch[1];
          // Transform to standard img tag with relative path
          node.value = `<img src="./${src}" style="margin: 2.5em 0; width: 100%; display: block; border-radius: 4px;" />`;
        }
      }
    });
  };
}

export default remarkReimg;
