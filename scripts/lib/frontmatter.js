/**
 * YAML frontmatter read/write for the Kit sync scripts, replacing gray-matter (whose
 * js-yaml 3 → argparse 1 → sprintf-js chain carried an unfixable advisory).
 *
 * When it replaced gray-matter (Oct 2026) it read every Kit email and post the same way,
 * checked once by a differential property run that isn't kept, since gray-matter is gone.
 * It deliberately differs on inputs gray-matter mishandles:
 * - No cache: gray-matter caches by content and hands back the same `data` object, so
 *   mutating one result leaks into the next parse of an identical file.
 * - An unterminated block is not frontmatter (gray-matter swallows the whole file).
 * - `stringify` never re-parses the body (gray-matter treats a body that starts with
 *   `---` as more frontmatter and merges it in).
 * - A block that isn't a YAML mapping throws instead of returning a scalar or array.
 *
 * js-yaml 4 quotes fewer strings than gray-matter's js-yaml 3 did, so the first rewrite
 * of a file may drop quotes (`subject: 'A, B'` → `subject: A, B`); the data is the same.
 */

import yaml from "js-yaml";

// Lazy throughout so the first closing `---` line ends the block, as in gray-matter.
const BLOCK = /^---[ \t]*(?:\r?\n([\s\S]*?))??\r?\n---[ \t]*(?:\r?\n|$)/;

/**
 * Split `raw` into `{ data, content }`. A file without a frontmatter block has `data` {}.
 * `filename`, when given, is named in parse errors (YAML line numbers count from the
 * line after the opening `---`).
 */
export function parseFrontmatter(raw, filename) {
  const str = String(raw).replace(/^﻿/, "");
  const match = str.match(BLOCK);
  if (!match) return { data: {}, content: str };

  const data = yaml.load(match[1] ?? "", { filename }) ?? {};
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError(`frontmatter must be a YAML mapping${filename ? ` in ${filename}` : ""}`);
  }
  return { data, content: str.slice(match[0].length) };
}

// js-yaml 4 silently drops undefined values; js-yaml 3 threw. Keep throwing so a missing
// Kit field (say, an undefined kitEmailId) fails the write instead of vanishing from it.
function rejectUndefined(key, value) {
  if (value === undefined) throw new TypeError(`frontmatter value for "${key}" is undefined`);
  return value;
}

/**
 * Serialize `data` as a frontmatter block above `content` (which gets a trailing newline).
 * Empty `data` writes no block, as gray-matter did, so the body alone must not start with one.
 */
export function stringifyFrontmatter(content, data) {
  const body = content.endsWith("\n") ? content : `${content}\n`;
  const block = yaml.dump(data, { replacer: rejectUndefined }).trim();
  return block === "{}" ? body : `---\n${block}\n---\n${body}`;
}
