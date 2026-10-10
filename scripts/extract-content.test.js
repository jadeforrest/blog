import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import {
  analyzeChunkWithClaudeCode,
  analyzeWithClaudeCode,
  approveExtracts,
  processFile,
  resolvePostTargets,
} from "./extract-content.js";

const BODY = `Most reorgs fail because nobody owns the transition.

Managers who never say no end up with teams that cannot say yes.

He said managers should have 20 direct reports.`;

function makePost() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "extract-content-"));
  const postDir = path.join(root, "2020-01-01--reorgs");
  fs.mkdirSync(postDir);
  const postFile = path.join(postDir, "index.mdx");
  fs.writeFileSync(postFile, `---\ntitle: "Reorgs"\n---\n${BODY}\n`);
  const outputDir = path.join(root, "out");
  fs.mkdirSync(outputDir);
  return { postFile, outputDir, outputPath: path.join(outputDir, "2020-01-01--reorgs.txt") };
}

const URL = "https://www.rubick.com/reorgs/";
const quiet = (fn) => async (...args) => {
  const log = console.log;
  console.log = () => {};
  try {
    return await fn(...args);
  } finally {
    console.log = log;
  }
};
const answers = (...replies) => async () => replies.shift();

test("processFile writes only the approved extracts", quiet(async () => {
  const { postFile, outputDir, outputPath } = makePost();
  const analyze = async () => [
    "Most reorgs fail because nobody owns the transition.",
    "Managers who never say no end up with teams that cannot say yes.",
  ];
  const result = await processFile(postFile, { outputDir, analyze, ask: answers("bogus", "2") });

  assert.equal(result.extractCount, 1);
  assert.equal(
    fs.readFileSync(outputPath, "utf8"),
    `Managers who never say no end up with teams that cannot say yes.\n${URL}`,
  );
}));

test("processFile --append adds new extracts after the existing ones, skipping duplicates", quiet(async () => {
  const { postFile, outputDir, outputPath } = makePost();
  const existing = `Most reorgs fail because nobody owns the transition.\n${URL}\n`;
  fs.writeFileSync(outputPath, existing);

  let seenExisting;
  const analyze = async (_content, _title, alreadySelected) => {
    seenExisting = alreadySelected;
    return [
      "Most reorgs fail because nobody owns the transition.",
      "[John Smith] said managers should have 20 direct reports.",
    ];
  };
  const result = await processFile(postFile, { outputDir, analyze, append: true, ask: answers("") });

  assert.deepEqual(seenExisting, ["Most reorgs fail because nobody owns the transition."]);
  assert.equal(result.extractCount, 1);
  assert.equal(
    fs.readFileSync(outputPath, "utf8"),
    `Most reorgs fail because nobody owns the transition.\n${URL}\n\n` +
      `[John Smith] said managers should have 20 direct reports.\n${URL}`,
  );
}));

test("processFile leaves the file alone when nothing is approved, and returns null on quit", quiet(async () => {
  const { postFile, outputDir, outputPath } = makePost();
  const analyze = async () => ["Most reorgs fail because nobody owns the transition."];

  const none = await processFile(postFile, { outputDir, analyze, ask: answers("n") });
  assert.equal(none.extractCount, 0);
  assert.equal(fs.existsSync(outputPath), false);

  assert.equal(await processFile(postFile, { outputDir, analyze, ask: answers("q") }), null);
  assert.equal(fs.existsSync(outputPath), false);
}));

test("processFile without approval keeps everything and falls back when Claude fails", quiet(async () => {
  const { postFile, outputDir, outputPath } = makePost();
  const analyze = async () => {
    throw new Error("no claude");
  };
  const result = await processFile(postFile, { outputDir, analyze });

  assert.ok(result.extractCount > 0);
  assert.ok(fs.readFileSync(outputPath, "utf8").includes(URL));
}));

test("approveExtracts flags text that is not verbatim from the post", async () => {
  const lines = [];
  const log = console.log;
  console.log = (msg) => lines.push(msg);
  try {
    const decision = await approveExtracts(
      ["Most reorgs collapse because nobody owns the transition."],
      { label: "Reorgs", source: BODY, ask: answers("1") },
    );
    assert.deepEqual(decision, {
      action: "keep",
      kept: ["Most reorgs collapse because nobody owns the transition."],
    });
  } finally {
    console.log = log;
  }
  assert.ok(lines.some((l) => l.includes("not found verbatim")));
});

test("resolvePostTargets accepts slugs, directory names, index files, and .txt files", () => {
  const files = [
    "src/content/posts/2020-01-01--reorgs/index.mdx",
    "src/content/posts/2021-01-01--reorgs-two/index.md",
  ];
  for (const target of [
    "reorgs",
    "2020-01-01--reorgs",
    "src/content/posts/2020-01-01--reorgs/index.mdx",
    "src/content/posts/2020-01-01--reorgs",
    "extracted-content/2020-01-01--reorgs.txt",
  ]) {
    assert.deepEqual(resolvePostTargets([target], files), [files[0]], target);
  }
  assert.throws(() => resolvePostTargets(["nope"], files), /matched 0 posts/);
});

test("analyzeChunkWithClaudeCode sends the prompt to claude and parses its output", async () => {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "fake-claude-"));
  const promptFile = path.join(bin, "prompt.txt");
  fs.writeFileSync(
    path.join(bin, "claude"),
    `#!/bin/sh\ncat > "${promptFile}"\nprintf '%s\\n' 'Sure:' '["Managers who never say no end up with teams that cannot say yes."]'\n`,
    { mode: 0o755 },
  );
  const originalPath = process.env.PATH;
  process.env.PATH = `${bin}:${originalPath}`;
  try {
    const extracts = await analyzeChunkWithClaudeCode(BODY, "Reorgs", 0, 2, ["Old pick."]);
    assert.deepEqual(extracts, ["Managers who never say no end up with teams that cannot say yes."]);
    const prompt = fs.readFileSync(promptFile, "utf8");
    assert.match(prompt, /Title: Reorgs \(Part 1 of 2\)/);
    assert.match(prompt, /- Old pick\./);

    fs.writeFileSync(path.join(bin, "claude"), "#!/bin/sh\ncat >/dev/null\necho No new qualifying extracts found.\n");
    await assert.rejects(analyzeChunkWithClaudeCode(BODY, "Reorgs", 0, 1), /No JSON array/);

    fs.writeFileSync(path.join(bin, "claude"), "#!/bin/sh\ncat >/dev/null\necho boom >&2\nexit 3\n");
    await assert.rejects(analyzeChunkWithClaudeCode(BODY, "Reorgs", 0, 1), /exited with code 3: boom/);
  } finally {
    process.env.PATH = originalPath;
  }
});

const SCRIPT = path.resolve("scripts/extract-content.js");

// A fake `claude` on PATH that answers with fixed extracts (or fails on "FAIL").
function fakeClaudeBin() {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "fake-claude-"));
  fs.writeFileSync(
    path.join(bin, "claude"),
    `#!/bin/sh
prompt=$(cat)
case "$prompt" in *FAIL*) exit 1;; esac
case "$prompt" in
  *"already selected"*) echo '["Managers who never say no end up with teams that cannot say yes."]' ;;
  *) echo '["Most reorgs fail because nobody owns the transition."]' ;;
esac
`,
    { mode: 0o755 },
  );
  return bin;
}

function runScript(cwd, args, env = {}) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  return { code: result.status, out: result.stdout + result.stderr };
}

test("analyzeWithClaudeCode collects extracts across chunks and skips failed ones", async () => {
  const originalPath = process.env.PATH;
  process.env.PATH = `${fakeClaudeBin()}:${originalPath}`;
  const log = console.log;
  console.log = () => {};
  try {
    const long = `${"Filler sentence for chunking. ".repeat(220)}\n\nFAIL\n\n${"More filler here. ".repeat(10)}`;
    const extracts = await analyzeWithClaudeCode(long, "Reorgs");
    assert.deepEqual(extracts, ["Most reorgs fail because nobody owns the transition."]);
  } finally {
    console.log = log;
    process.env.PATH = originalPath;
  }
});

test("processFile quarantines extracts too long to keep verbatim", quiet(async () => {
  const { postFile, outputDir } = makePost();
  const tooLong = `${"word ".repeat(80)}end.`;
  const result = await processFile(postFile, { outputDir, analyze: async () => [tooLong] });
  assert.equal(result.extractCount, 0);
}));

test("CLI: refuses --append without targets and approval without a terminal", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "extract-cli-"));
  const noTargets = runScript(cwd, ["--append", "--yes"]);
  assert.equal(noTargets.code, 1);
  assert.match(noTargets.out, /--append needs at least one post/);

  const noTty = runScript(cwd, []);
  assert.equal(noTty.code, 1);
  assert.match(noTty.out, /pass --yes/);
});

test("CLI: extracts new posts, appends to processed ones, and skips finished work", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "extract-cli-"));
  const postDir = path.join(cwd, "src/content/posts/2020-01-01--reorgs");
  fs.mkdirSync(postDir, { recursive: true });
  fs.writeFileSync(path.join(postDir, "index.md"), `---\ntitle: Reorgs\n---\n${BODY}\n`);
  const env = {
    PATH: `${fakeClaudeBin()}:${process.env.PATH}`,
    EXTRACT_QUARANTINE_FILE: path.join(cwd, "quarantine.json"),
  };
  const output = path.join(cwd, "extracted-content/2020-01-01--reorgs.txt");

  assert.equal(runScript(cwd, ["--yes"], env).code, 0);
  assert.equal(fs.readFileSync(output, "utf8"), `Most reorgs fail because nobody owns the transition.\n${URL}`);

  const again = runScript(cwd, ["--yes"], env);
  assert.match(again.out, /All files have already been processed/);

  assert.match(runScript(cwd, ["--test-mode", "--yes"], env).out, /TEST MODE/);
  assert.match(runScript(cwd, ["--revalidate"], env).out, /Files scanned: 1/);

  const appended = runScript(cwd, ["--append", "reorgs", "--yes"], env);
  assert.equal(appended.code, 0);
  assert.match(appended.out, /Total extracts appended: 1/);
  assert.equal(
    fs.readFileSync(output, "utf8"),
    `Most reorgs fail because nobody owns the transition.\n${URL}\n\n` +
      `Managers who never say no end up with teams that cannot say yes.\n${URL}`,
  );
});
