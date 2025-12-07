import fs from "fs";
import path from "path";

// Find all MDX files
const postsDir = "src/content/posts";

function findMdxFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findMdxFiles(filePath));
    } else if (file.endsWith(".mdx")) {
      results.push(filePath);
    }
  });
  return results;
}

async function fixHtmlTags() {
  const files = findMdxFiles(postsDir);

  console.log(`Found ${files.length} MDX files`);

  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    let modified = false;

    // Fix multi-line table cells: <td>content</td> or <td attrs>content</td> on multiple lines
    // This may need to run multiple times to catch nested cases
    let prevContent;
    do {
      prevContent = content;
      // Pattern 1: Tag with content on next line
      content = content.replace(/<(td|th)([^>]*)>([^<]*)\n\s*<\/(td|th)>/g, (match, tag1, attrs, cellContent, tag2) => {
        modified = true;
        return `<${tag1}${attrs}>${cellContent.trim()}</${tag2}>`;
      });
      // Pattern 2: Tag with content split across lines with whitespace
      content = content.replace(/<(td|th)([^>]*)>\s*([^<\n]+)\s*\n+\s*([^<]*?)\s*<\/(td|th)>/g, (match, tag1, attrs, content1, content2, tag2) => {
        modified = true;
        return `<${tag1}${attrs}>${content1.trim()} ${content2.trim()}</${tag2}>`;
      });
    } while (content !== prevContent);

    if (modified) {
      fs.writeFileSync(file, content, "utf8");
      console.log(`Fixed: ${file}`);
    }
  }

  console.log("Done!");
}

fixHtmlTags().catch(console.error);
