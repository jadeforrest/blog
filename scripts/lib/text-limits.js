/**
 * Shared text-length helpers for the content extraction and publishing scripts.
 *
 * Bluesky's post limit is 300 *graphemes* and 3000 UTF-8 bytes — not 300 JavaScript
 * string units. `String.length` counts UTF-16 code units, which overcounts anything
 * outside the BMP (a family emoji is 11 code units but 1 grapheme), so it is never
 * the right measure here.
 */

const BLUESKY_MAX_GRAPHEMES = 300;
const BLUESKY_MAX_BYTES = 3000;

// Reused across calls — constructing a Segmenter is comparatively expensive.
const graphemeSegmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

/**
 * Words that end in a period but do not end a sentence. Splitting after these
 * would cut a quote mid-thought (". . . see e.g." ), which still satisfies the
 * verbatim guarantee but reads badly.
 */
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'mt', 'rev', 'gen',
  'vs', 'etc', 'e.g', 'i.e', 'al', 'cf', 'approx', 'est', 'fig', 'no',
  'inc', 'ltd', 'co', 'corp', 'dept', 'univ',
  'u.s', 'u.k', 'a.m', 'p.m',
]);

/**
 * Count grapheme clusters — what Bluesky actually limits.
 */
function graphemeCount(text) {
  let count = 0;
  for (const _ of graphemeSegmenter.segment(text)) count++;
  return count;
}

/**
 * UTF-8 byte length.
 */
function byteLength(text) {
  return Buffer.byteLength(text, 'utf8');
}

/**
 * Does this text fit in a single Bluesky post?
 */
function fitsBlueskyLimit(text) {
  return graphemeCount(text) <= BLUESKY_MAX_GRAPHEMES && byteLength(text) <= BLUESKY_MAX_BYTES;
}

/**
 * Find indices where a sentence legitimately ends.
 *
 * A boundary is a run of [.!?] plus any closing quotes/brackets, followed by
 * whitespace or end-of-string, and not preceded by a known abbreviation.
 * Returns cut positions (exclusive end indices) in ascending order.
 */
function sentenceBoundaries(text) {
  const boundaries = [];
  const pattern = /[.!?]+["'”’»)\]]*(?=\s|$)/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const terminatorStart = match.index;
    const cutAt = match.index + match[0].length;

    // Look at the word immediately preceding the terminator.
    const preceding = text.slice(0, terminatorStart);
    const wordMatch = preceding.match(/([A-Za-z][A-Za-z.]*)$/);
    if (wordMatch && ABBREVIATIONS.has(wordMatch[1].toLowerCase())) {
      continue;
    }

    boundaries.push(cutAt);
  }

  return boundaries;
}

/**
 * Shorten text to fit the limit by dropping trailing sentences.
 *
 * The result is always an exact *prefix* of the input, so an extract stays a
 * verbatim quote of the source post — it is only ever made shorter, never reworded.
 * Returns null when even the first sentence is too long to salvage.
 */
function trimToWholeSentences(text, limit = BLUESKY_MAX_GRAPHEMES) {
  const trimmed = text.trimEnd();
  if (graphemeCount(trimmed) <= limit && byteLength(trimmed) <= BLUESKY_MAX_BYTES) {
    return trimmed;
  }

  const boundaries = sentenceBoundaries(trimmed);

  // Longest leading run of whole sentences that fits.
  for (let i = boundaries.length - 1; i >= 0; i--) {
    const candidate = trimmed.slice(0, boundaries[i]).trimEnd();
    if (graphemeCount(candidate) <= limit && byteLength(candidate) <= BLUESKY_MAX_BYTES) {
      return candidate;
    }
  }

  return null;
}

/**
 * Apply the post-length limit to a list of freshly-extracted passages.
 *
 * Extracts are verbatim quotes from the source post, so an over-long one is either
 * trimmed to whole sentences (still verbatim) or dropped — never reworded. Returns
 * the kept extracts and the ones that could not be salvaged.
 */
function enforceLimits(extracts) {
  const kept = [];
  const dropped = [];

  for (const raw of extracts) {
    const text = (raw || '').trim();
    if (!text) continue;

    if (fitsBlueskyLimit(text)) {
      kept.push(text);
      continue;
    }

    const trimmedText = trimToWholeSentences(text);
    if (trimmedText && fitsBlueskyLimit(trimmedText)) {
      kept.push(trimmedText);
    } else {
      // A single sentence longer than the limit cannot be shortened verbatim.
      dropped.push(text);
    }
  }

  return { kept, dropped };
}

/**
 * Escape a string for safe interpolation into an AppleScript double-quoted literal,
 * so post text containing quotes or backslashes cannot break out of the string.
 */
function escapeForAppleScript(text) {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export {
  BLUESKY_MAX_GRAPHEMES,
  BLUESKY_MAX_BYTES,
  graphemeCount,
  byteLength,
  fitsBlueskyLimit,
  sentenceBoundaries,
  trimToWholeSentences,
  enforceLimits,
  escapeForAppleScript,
};
