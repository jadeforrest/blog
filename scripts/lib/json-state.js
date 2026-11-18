/** A job's JSON state file: read (with a fallback for the first run) and written. */

import fs from "fs";
import path from "path";

/** The saved state in `file`, or `fallback()` when the file doesn't exist yet. */
export function loadJsonState(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return fallback();
    throw err;
  }
}

/** Write `state` to `file`, creating its directory. */
export function saveJsonState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
}
