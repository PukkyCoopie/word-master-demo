/**
 * Scan treasure_*.js for bare calls to cross-module exports without import.
 * Usage: node scripts/scan-treasure-missing-imports.mjs
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = "src";
const TREASURE_DIR = "src/treasures/items";

function walk(dir, acc = []) {
  for (const ent of readdirSync(dir)) {
    const p = join(dir, ent);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (p.includes("treasures/items")) continue;
      walk(p, acc);
    } else if (ent.endsWith(".js")) acc.push(p);
  }
  return acc;
}

function extractExports(content) {
  const names = new Set();
  for (const m of content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) names.add(m[1]);
  for (const m of content.matchAll(/export\s+const\s+(\w+)\s*=/g)) names.add(m[1]);
  for (const m of content.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name && /^[A-Za-z_]/.test(name)) names.add(name);
    }
  }
  return names;
}

const moduleExports = new Map();
for (const file of walk(ROOT)) {
  const rel = relative(".", file).replace(/\\/g, "/");
  if (!rel.startsWith("src/game/") && !rel.startsWith("src/treasures/")) continue;
  if (rel.startsWith("src/treasures/items/")) continue;
  const content = readFileSync(file, "utf8");
  const ex = extractExports(content);
  if (ex.size) moduleExports.set(rel, ex);
}

const allExported = new Set([...moduleExports.values()].flatMap((s) => [...s]));

function parseImportsLocal(content) {
  const imported = new Set();
  const local = new Set();
  for (const m of content.matchAll(/import\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+))\s+from/g)) {
    if (m[1]) {
      for (const part of m[1].split(",")) {
        const name = part.trim().split(/\s+as\s+/).pop().trim();
        if (name) imported.add(name);
      }
    }
    if (m[2]) imported.add(m[2]);
  }
  for (const m of content.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/g)) local.add(m[1]);
  for (const m of content.matchAll(/(?:^|\n)\s*(?:export\s+)?const\s+(\w+)\s*=/g)) local.add(m[1]);
  return { imported, local };
}

/** Bare identifier call: not preceded by `.`, not a method definition `(...) {` */
function findBareCalls(content, symbol) {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![.\\w$])${escaped}\\s*\\(`, "g");
  const lines = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    const lineStart = content.lastIndexOf("\n", m.index) + 1;
    const lineEnd = content.indexOf("\n", m.index);
    const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (/\)\s*\{/.test(line)) continue; // `foo(ctx) {` method shorthand
    lines.push(content.slice(0, m.index).split("\n").length);
  }
  return lines;
}

const issues = [];
for (const file of readdirSync(TREASURE_DIR)
  .filter((f) => f.startsWith("treasure_") && f.endsWith(".js"))
  .sort()) {
  const path = join(TREASURE_DIR, file);
  const content = readFileSync(path, "utf8");
  const { imported, local } = parseImportsLocal(content);
  const missing = [];
  for (const sym of allExported) {
    if (local.has(sym) || imported.has(sym)) continue;
    const lines = findBareCalls(content, sym);
    if (!lines.length) continue;
    const from = [...moduleExports.entries()].filter(([, s]) => s.has(sym)).map(([p]) => p);
    missing.push({ sym, lines, from });
  }
  if (missing.length) issues.push({ file, missing });
}

if (!issues.length) {
  console.log("OK: no missing imports for cross-module exported symbols");
  process.exit(0);
}

for (const { file, missing } of issues) {
  console.log(`${file}:`);
  for (const { sym, lines, from } of missing.sort((a, b) => a.sym.localeCompare(b.sym))) {
    console.log(
      `  MISSING ${sym} @ lines ${[...new Set(lines)].join(",")} (from ${from.join(" | ")})`,
    );
  }
}
console.log("---");
console.log(`Files with missing imports: ${issues.length}`);
process.exit(issues.length ? 1 : 0);
