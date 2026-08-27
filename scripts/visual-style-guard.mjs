import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baselinePath = path.join(root, "config", "visual-style-debt-baseline.json");
const tokenPath = path.join(root, "src", "app", "mhidas-visual-tokens.css");

const canonicalTokens = {
  "--mhidas-bg-main": "#050505",
  "--mhidas-card-dark": "#0E0E0E",
  "--mhidas-card-secondary": "#111111",
  "--mhidas-text-primary": "#F8FAFC",
  "--mhidas-text-secondary": "#CBD5E1",
  "--mhidas-border": "rgba(255,255,255,0.10)",
  "--mhidas-clubber-action": "#2A8694",
  "--mhidas-clubber-action-strong": "#247C88",
  "--mhidas-pro-blue": "#1D4ED8",
  "--mhidas-pro-deep": "#0F172A",
  "--mhidas-pro-indigo": "#4F46E5",
};

const forbiddenHex = [
  "#00FFBE", "#00F5C8", "#00DCEC", "#5EEAD4", "#2DD4BF",
  "#7C5CFF", "#7D5CFF", "#3A227A", "#08717B", "#04171C", "#10091F",
];

const greenPattern =
  /(#00FFBE|#00F5C8|#00DCEC|#5EEAD4|#2DD4BF|#14B8A6|#0D9488|rgba\(\s*0\s*,\s*(?:245|255)\s*,\s*(?:190|200)\s*,|rgba\(\s*0\s*,\s*220\s*,\s*255\s*,|rgba\(\s*20\s*,\s*184\s*,\s*166\s*,|rgba\(\s*13\s*,\s*148\s*,\s*136\s*,)/i;

const purplePattern =
  /(#7C5CFF|#7D5CFF|#3A227A|#10091F|rgba\(\s*(?:124|125|132)\s*,\s*92\s*,\s*255\s*,)/i;

const uiExtensions = new Set([".tsx", ".ts", ".css", ".scss"]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (uiExtensions.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function normalizeLine(line) {
  return line.trim().replace(/\s+/g, " ").slice(0, 260);
}

function relative(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function classifyFile(file) {
  const rel = relative(file);
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const violations = new Set();

  lines.forEach((line, index) => {
    const compact = normalizeLine(line);
    if (!compact) return;

    const isShadow = /(box-shadow|boxShadow|text-shadow|drop-shadow)/i.test(line);
    const isGradient = /(linear-gradient|radial-gradient)/i.test(line);
    const isBackground = /(background|backgroundColor|background-color)/i.test(line);
    const hasGreen = greenPattern.test(line);
    const hasPurple = purplePattern.test(line);

    for (const hex of forbiddenHex) {
      if (line.toUpperCase().includes(hex)) {
        violations.add(`FORBIDDEN_COLOR|${index + 1}|${compact}`);
      }
    }

    if (isShadow && hasGreen) {
      violations.add(`GREEN_GLOW|${index + 1}|${compact}`);
    }

    if ((isGradient || isBackground) && hasGreen) {
      violations.add(`GREEN_SURFACE|${index + 1}|${compact}`);
    }

    if (hasPurple) {
      violations.add(`PURPLE_DRIFT|${index + 1}|${compact}`);
    }

    if (rel.includes("/pro/") && /var\(--mhidas-clubber-/i.test(line)) {
      violations.add(`MODE_MIX_PRO_USES_CLUBBER|${index + 1}|${compact}`);
    }

    const clubberPath =
      rel.includes("/clubbers/") ||
      rel.includes("/event/") ||
      rel === "src/app/[slug]/page.tsx" ||
      rel.includes("/dashboard/organizations/");

    if (clubberPath && /var\(--mhidas-pro-/i.test(line)) {
      violations.add(`MODE_MIX_CLUBBER_USES_PRO|${index + 1}|${compact}`);
    }
  });

  return [...violations].sort();
}

function scan() {
  const roots = [
    path.join(root, "src", "app"),
    path.join(root, "src", "components"),
  ];

  const files = roots.flatMap((dir) => walk(dir));
  const result = {};

  for (const file of files) {
    const violations = classifyFile(file);
    if (violations.length) result[relative(file)] = violations;
  }

  return result;
}

function validateTokens() {
  if (!fs.existsSync(tokenPath)) {
    throw new Error("VISUAL_TOKENS_FILE_MISSING");
  }

  const text = fs.readFileSync(tokenPath, "utf8");

  for (const [name, value] of Object.entries(canonicalTokens)) {
    const expected = `${name}: ${value};`;
    if (!text.includes(expected)) {
      throw new Error(`VISUAL_TOKEN_MISMATCH=${name}`);
    }
  }
}

function totals(snapshot) {
  const files = Object.keys(snapshot).length;
  const violations = Object.values(snapshot).reduce((sum, items) => sum + items.length, 0);
  return { files, violations };
}

function writeBaseline(snapshot) {
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  const payload = {
    visual_standard: "MHIDAS_VISUAL_STANDARD_LOCK_V1",
    policy: {
      shared: ["#050505", "#0E0E0E", "#111111", "#F8FAFC", "#CBD5E1", "rgba(255,255,255,0.10)"],
      clubber_action: ["#2A8694", "#247C88"],
      pro: ["#1D4ED8", "#0F172A", "#4F46E5"],
      green_large_surfaces: "FORBIDDEN",
      green_dominant_glow: "FORBIDDEN",
      mode_mixing: "FORBIDDEN",
    },
    debt: snapshot,
  };
  fs.writeFileSync(baselinePath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

validateTokens();
const current = scan();

if (process.argv.includes("--write-baseline")) {
  writeBaseline(current);
  const t = totals(current);
  console.log("VISUAL_BASELINE_WRITTEN=True");
  console.log(`BASELINE_FILES_WITH_DEBT=${t.files}`);
  console.log(`BASELINE_VIOLATIONS=${t.violations}`);
  process.exit(0);
}

if (!fs.existsSync(baselinePath)) {
  console.error("VISUAL_GUARD_RESULT=FAIL");
  console.error("REASON=BASELINE_MISSING");
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")).debt ?? {};
const regressions = [];

for (const [file, violations] of Object.entries(current)) {
  const allowed = new Set(baseline[file] ?? []);
  for (const violation of violations) {
    if (!allowed.has(violation)) {
      regressions.push(`${file} :: ${violation}`);
    }
  }
}

const currentTotals = totals(current);
const baselineTotals = totals(baseline);

if (regressions.length) {
  console.error("VISUAL_GUARD_RESULT=FAIL");
  console.error(`NEW_VISUAL_VIOLATIONS=${regressions.length}`);
  for (const item of regressions.slice(0, 40)) console.error(item);
  process.exit(1);
}

console.log("VISUAL_GUARD_RESULT=OK");
console.log("VISUAL_STANDARD=MHIDAS_VISUAL_STANDARD_LOCK_V1");
console.log(`BASELINE_DEBT_FILES=${baselineTotals.files}`);
console.log(`CURRENT_DEBT_FILES=${currentTotals.files}`);
console.log(`BASELINE_VIOLATIONS=${baselineTotals.violations}`);
console.log(`CURRENT_VIOLATIONS=${currentTotals.violations}`);
console.log("NEW_VISUAL_VIOLATIONS=0");