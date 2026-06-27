import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");
const ENTRY = path.join(SRC, "main.js");

/** @param {string} dir */
function walkJsFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === "dist") continue;
      out.push(...walkJsFiles(full));
      continue;
    }
    if (!/\.(js|mjs|vue)$/.test(name.name)) continue;
    if (/\.test\.mjs$/.test(name.name)) continue;
    out.push(full);
  }
  return out;
}

/** @param {string} file */
function fileToModuleId(file) {
  const rel = path.relative(SRC, file).replace(/\\/g, "/");
  if (rel.endsWith(".vue")) return `./${rel}`;
  return `./${rel.replace(/\.js$/, ".js")}`;
}

/** @param {string} text */
function extractImportSpecifiers(text) {
  /** @type {Set<string>} */
  const specs = new Set();
  const re = /(?:import|export)\s+(?:[\s\S]*?\sfrom\s*)?["'](\.[^"']+)["']/g;
  let m;
  while ((m = re.exec(text)) !== null) specs.add(m[1]);
  const dyn = /import\s*\(\s*["'](\.[^"']+)["']\s*\)/g;
  while ((m = dyn.exec(text)) !== null) specs.add(m[1]);
  return specs;
}

/** @param {string} fromDir @param {string} spec */
function resolveSpec(fromDir, spec) {
  const base = path.resolve(fromDir, spec);
  const candidates = [
    base,
    `${base}.js`,
    `${base}.mjs`,
    `${base}.vue`,
    path.join(base, "index.js"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

/** @param {string} startFile */
function reachableFrom(startFile) {
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {string[]} */
  const queue = [path.resolve(startFile)];
  while (queue.length) {
    const file = queue.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    let text = "";
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (file.endsWith(".vue")) {
      const script = text.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1] ?? "";
      text = script;
    }
    const fromDir = path.dirname(file);
    for (const spec of extractImportSpecifiers(text)) {
      if (!spec.startsWith(".")) continue;
      const resolved = resolveSpec(fromDir, spec);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

const allFiles = walkJsFiles(SRC);
const reachable = reachableFrom(ENTRY);

/** @type {{ id: string, path: string }[]} */
const orphans = [];
for (const file of allFiles) {
  if (reachable.has(file)) continue;
  orphans.push({ id: fileToModuleId(file), path: path.relative(ROOT, file).replace(/\\/g, "/") });
}

orphans.sort((a, b) => a.path.localeCompare(b.path));
console.log(`Scanned ${allFiles.length} src files`);
console.log(`Reachable from main.js: ${reachable.size}`);
console.log(`Orphan candidates: ${orphans.length}`);
for (const o of orphans) console.log(o.path);
