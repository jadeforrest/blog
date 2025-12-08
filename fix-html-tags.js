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
    // Handle cells with content spanning multiple lines
    let prevContent;
    let iterations = 0;
    do {
      prevContent = content;
      iterations++;

      // Pattern: Match td/th tags with content spanning multiple lines
      // This handles cases like:
      // <td>line1
      // line2
      // line3</td>
      content = content.replace(/<(td|th)([^>]*)>([\s\S]*?)<\/(td|th)>/g, (match, tag1, attrs, cellContent, tag2) => {
        // Only modify if the content contains newlines
        if (cellContent.includes('\n')) {
          modified = true;
          // Replace all newlines and excessive whitespace with single spaces
          // But preserve <br /> tags
          const cleanedContent = cellContent
            .replace(/\n\s*/g, '\n') // Normalize line breaks
            .replace(/\n(?!<br|$)/g, ' ') // Replace line breaks with spaces except before <br tags or end
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
          return `<${tag1}${attrs}>${cleanedContent}</${tag2}>`;
        }
        return match;
      });

      if (iterations > 5) break; // Safety limit
    } while (content !== prevContent);

    if (modified) {
      fs.writeFileSync(file, content, "utf8");
      console.log(`Fixed: ${file}`);
    }
  }

  console.log("Done!");
}

fixHtmlTags().catch(console.error);
