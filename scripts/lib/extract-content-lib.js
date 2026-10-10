/**
 * Pure helpers for scripts/extract-content.js: the extraction prompt, the
 * extracted-content/*.txt file format, approval-input parsing, and the check that
 * an extract still matches its source post.
 */

import { BLUESKY_MAX_GRAPHEMES } from "./text-limits.js";

// Upper bound on extracts kept from one Claude response (one chunk of a post).
const MAX_EXTRACTS_PER_CHUNK = 10;

/**
 * Build the Claude prompt for one chunk of a post. `alreadySelected` lists extracts
 * already in the post's file (append mode), so Claude picks different ones.
 */
function buildExtractionPrompt({ title, content, chunkInfo = "", alreadySelected = [] }) {
  const exclusions =
    alreadySelected.length > 0
      ? `\nThese passages were already selected. Do not return them again, or near-duplicates of them:\n${alreadySelected.map((text) => `- ${text}`).join("\n")}\n`
      : "";

  return `You are choosing quotes from a blog post to share on social media (Bluesky and LinkedIn). Each quote is posted on its own with a link to the post, so it has to work for a reader who has never seen the article.

Analyze this blog post${chunkInfo} and extract 0-${MAX_EXTRACTS_PER_CHUNK} sentences or short passages (1-3 sentences each). Return fewer rather than padding the list with weak ones. If nothing in this content qualifies, return an empty array.

Prioritize:
1. Contrarian statements: claims that cut against conventional wisdom and provoke a reaction of agreement or disagreement.
2. Pattern statements: observations that name a recurring pattern or dynamic and spark insight ("I've seen that happen").
3. Main points: sentences that summarize the core argument of the article.

Every extract must be comprehensible in isolation, without the surrounding context. Prefer passages that already stand alone. If an otherwise strong passage depends on context (an unresolved pronoun, "this" or "that", an undefined term), you may make minor editorial edits, solely for comprehensibility. Every edit must be marked with square brackets:
- "He said managers should have 20 direct reports" -> "[John Smith] said managers should have 20 direct reports"
- "This is why reorgs fail" -> "[Skipping the transition plan] is why reorgs fail"
- Omitted words: "[...]"
- Changed capitalization: "[M]anagers should..."

Never edit a quote to make it punchier or more provocative, and never change its meaning. Outside the brackets, the text must be exactly as written in the post. These quotes are attributed to the author, and readers who click through must find them in the article.

Length requirement: each extract must be under ${BLUESKY_MAX_GRAPHEMES} characters, including any bracketed edits. If a passage is too long, pick a different one. Never shorten a passage by summarizing or rewording it.
${exclusions}
Title: ${title}${chunkInfo}

Content:
${content}

IMPORTANT: Return ONLY a JSON array of strings, one string per extract, e.g. ["First extract.", "Second extract."]. Return [] if nothing qualifies. No explanation, analysis, or commentary anywhere: not before the array, not after it, and not inside it.`;
}

/**
 * Find the JSON array of strings in Claude's output. Extracts can contain
 * [bracketed edits], so this tries each "[" that could open a JSON array against
 * each "]" (longest first) rather than trusting the first or last bracket.
 * Returns null when there is none.
 */
function findStringArray(output) {
  const ends = [...output.matchAll(/\]/g)].map((m) => m.index).reverse();
  for (const start of output.matchAll(/\[(?=\s*["\]])/g)) {
    for (const end of ends.filter((e) => e > start.index)) {
      try {
        const value = JSON.parse(output.slice(start.index, end + 1));
        if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
      } catch {
        // Not valid JSON between these brackets; try the next pair.
      }
    }
  }
  return null;
}

/**
 * Turn Claude's raw output into extracts. Only strings inside the returned JSON array
 * count, so commentary Claude adds around it is never mistaken for an extract.
 * Whitespace is collapsed because the output file holds one extract per line.
 * Throws when the output has no JSON array of strings.
 */
function parseModelOutput(output) {
  const extracts = findStringArray(output);
  if (extracts === null) {
    throw new Error(`No JSON array of extracts in Claude's output: ${output.trim().slice(0, 200)}`);
  }
  return extracts
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 0)
    .slice(0, MAX_EXTRACTS_PER_CHUNK);
}

/**
 * Parse an extracted-content file: alternating text/URL lines, blank-line separated.
 * Mirrors the parsers in extract-to-bluesky.js and extract-to-linkedin.js.
 */
function parseExtractFile(content) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  const pairs = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    pairs.push({ text: lines[i], url: lines[i + 1] });
  }
  return pairs;
}

function formatExtracts(pairs) {
  return pairs.map(({ text, url }) => `${text}\n${url}`).join("\n\n");
}

/**
 * Append extracts to an existing file's content, separated exactly as a freshly
 * generated file would be. Existing content is kept byte-for-byte apart from trailing
 * whitespace, so the posting scripts' position-based ids for sent extracts stay valid.
 */
function appendExtracts(existing, pairs) {
  const head = existing.trimEnd();
  const tail = formatExtracts(pairs);
  if (!head) return tail;
  if (!tail) return head;
  return `${head}\n\n${tail}`;
}

function normalizeForCompare(text) {
  return text
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    // Dashes: smartypants renders "--" as an em dash, and spacing around dashes varies.
    .replace(/\s*(?:-{2,3}|[–—])\s*|\s+-\s+/g, " -- ")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Drop candidates that duplicate an existing extract or an earlier candidate.
 */
function removeDuplicates(candidates, existingTexts = []) {
  const seen = new Set(existingTexts.map(normalizeForCompare));
  const unique = [];
  for (const candidate of candidates) {
    const key = normalizeForCompare(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }
  return unique;
}

/**
 * Reduce post source (Markdown/MDX) to comparable prose: link text without URLs,
 * no emphasis markers, HTML/JSX tags, or blockquote markers.
 */
function normalizeSource(source) {
  const prose = source
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_]/g, "");
  return normalizeForCompare(prose);
}

/**
 * Return the parts of an extract, outside its [bracketed edits], that cannot be found
 * in the source post. An empty result means the quote checks out. Fragments shorter
 * than a few characters (stray punctuation between edits) are not checked.
 */
function unverifiedFragments(extract, source) {
  const haystack = normalizeSource(source);
  return extract
    .split(/\[[^\]]*\]/)
    .map((fragment) => normalizeForCompare(fragment.replace(/[*_]/g, "")))
    .map((fragment) => fragment.replace(/^[\s.,;:'"-]+|[\s.,;:'"-]+$/g, ""))
    .filter((fragment) => fragment.length >= 4 && !haystack.includes(fragment));
}

/**
 * Parse the approval answer for `count` candidates.
 *   ""/"a"/"all" -> keep all, "n"/"none" -> keep none, "q"/"quit" -> stop the run,
 *   "1,3,5-7" -> keep those (1-based). Returns { action, indices } (0-based indices)
 *   or { error }.
 */
function parseSelection(input, count) {
  const answer = input.trim().toLowerCase();
  const all = [...Array(count).keys()];

  if (answer === "" || answer === "a" || answer === "all") return { action: "keep", indices: all };
  if (answer === "n" || answer === "none") return { action: "keep", indices: [] };
  if (answer === "q" || answer === "quit") return { action: "quit", indices: [] };

  const picked = new Set();
  for (const part of answer.split(/[\s,]+/).filter(Boolean)) {
    const range = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!range) return { error: `Not a number or range: "${part}"` };

    const start = Number(range[1]);
    const end = range[2] === undefined ? start : Number(range[2]);
    if (start < 1 || end > count || start > end) {
      return { error: `"${part}" is outside 1-${count}` };
    }
    for (let n = start; n <= end; n++) picked.add(n - 1);
  }
  return { action: "keep", indices: [...picked].sort((a, b) => a - b) };
}

export {
  MAX_EXTRACTS_PER_CHUNK,
  buildExtractionPrompt,
  parseModelOutput,
  parseExtractFile,
  formatExtracts,
  appendExtracts,
  normalizeForCompare,
  removeDuplicates,
  unverifiedFragments,
  parseSelection,
};
