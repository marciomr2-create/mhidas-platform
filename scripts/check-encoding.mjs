import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".scss",
  ".sql",
  ".html",
  ".yml",
  ".yaml",
]);

const HISTORICAL_EXCEPTIONS = new Map([
  [
    "supabase/migrations/20260913210000_event_meetup_set_context_foundation_mvp2.sql",
    "365d6129b749c7bea33e33647ca567a24a9f596d",
  ],
]);

const SUSPICIOUS_PATTERNS = [
  /\uFFFD/u,
  /\u00C3[\u0080-\u00BF]/u,
  /\u00C2[\u0080-\u00BF]/u,
  /\u00C3[\u0192\u2020\u201A]/u,
  /\u00E2[\u0080-\u00BF\u20AC\u2122]/u,
  /\u00C6\u2019/u,
  /\u00EF\u00BF\u00BD/u,
  /\u00F0\u0178/u,
];

const listed = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" }
);

const files = listed
  .split("\0")
  .filter(Boolean)
  .filter((file) => TEXT_EXTENSIONS.has(extname(file).toLowerCase()));

const decoder = new TextDecoder("utf-8", { fatal: true });
const invalidUtf8Files = [];
const mojibakeFiles = new Map();
const exceptionHashMismatch = [];
let historicalExceptionCount = 0;

for (const file of files) {
  const bytes = readFileSync(file);

  if (HISTORICAL_EXCEPTIONS.has(file)) {
    const expectedBlob = HISTORICAL_EXCEPTIONS.get(file);

    let actualBlob = "";
    let worktreeClean = false;

    try {
      actualBlob = execFileSync(
        "git",
        ["rev-parse", `HEAD:${file}`],
        { encoding: "utf8" }
      ).trim();

      execFileSync(
        "git",
        ["diff", "--quiet", "HEAD", "--", file],
        { stdio: "ignore" }
      );

      worktreeClean = true;
    } catch {
      worktreeClean = false;
    }

    if (actualBlob === expectedBlob && worktreeClean) {
      historicalExceptionCount += 1;
      continue;
    }

    exceptionHashMismatch.push(file);
    continue;
  }

  let text;

  try {
    text = decoder.decode(bytes);
  } catch {
    invalidUtf8Files.push(file);
    continue;
  }

  const lines = text.split(/\r?\n/);
  const badLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(lines[index]))) {
      badLines.push(index + 1);
    }
  }

  if (badLines.length > 0) {
    mojibakeFiles.set(file, badLines);
  }
}

const mojibakeLineCount = [...mojibakeFiles.values()].reduce(
  (total, lines) => total + lines.length,
  0
);

const failed =
  invalidUtf8Files.length > 0 ||
  mojibakeFiles.size > 0 ||
  exceptionHashMismatch.length > 0;

console.log("ENCODING_GUARD=" + (failed ? "FAIL" : "PASS"));
console.log("SCANNED_FILE_COUNT=" + files.length);
console.log("INVALID_UTF8_FILE_COUNT=" + invalidUtf8Files.length);
console.log("MOJIBAKE_FILE_COUNT=" + mojibakeFiles.size);
console.log("MOJIBAKE_LINE_COUNT=" + mojibakeLineCount);
console.log("HISTORICAL_EXCEPTION_COUNT=" + historicalExceptionCount);
console.log(
  "EXCEPTION_HASH_MISMATCH_COUNT=" + exceptionHashMismatch.length
);

for (const file of mojibakeFiles.keys()) {
  console.log("ISSUE_FILE=" + file);
}

if (failed) {
  process.exitCode = 1;
}