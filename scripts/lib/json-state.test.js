import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { loadJsonState, saveJsonState } from "./json-state.js";

test("saveJsonState creates missing directories and writes indented JSON with a newline", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "json-state-"));
  const file = path.join(dir, "a", "b", "state.json");
  saveJsonState(file, { x: [1], é: "ü" });
  assert.equal(fs.readFileSync(file, "utf8"), '{\n  "x": [\n    1\n  ],\n  "é": "ü"\n}\n');
  assert.deepEqual(
    loadJsonState(file, () => null),
    { x: [1], é: "ü" },
  );
});

test("loadJsonState uses the fallback only when the file is missing", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "json-state-"));
  assert.deepEqual(
    loadJsonState(path.join(dir, "none.json"), () => ({ fresh: true })),
    { fresh: true },
  );
  fs.writeFileSync(path.join(dir, "bad.json"), "{");
  assert.throws(() => loadJsonState(path.join(dir, "bad.json"), () => ({})), SyntaxError);
});
