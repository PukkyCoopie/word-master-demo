/**
 * 扫描 css/vue 样式中相对 Chrome 70 的风险特性（只读报告）。
 * 用法：node scripts/scan-css-chrome70-risks.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (
        [
          "node_modules",
          "dist",
          ".git",
          "android",
          ".apk-analysis",
          ".apk-analysis2",
          "tmp-lb-aar",
          "tmp",
          ".cursor",
        ].includes(ent.name)
      ) {
        continue;
      }
      walk(p, acc);
    } else if (/\.(css|vue)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

function styleChunks(file, text) {
  if (file.endsWith(".css")) return [text];
  const chunks = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(text))) chunks.push(m[1]);
  return chunks;
}

const patterns = [
  { id: "min()", re: /(?<![\w-])min\s*\(/g, chrome: 79, polyfill: "postcss-min-max-clamp-legacy" },
  { id: "max()", re: /(?<![\w-])max\s*\(/g, chrome: 79, polyfill: "postcss-min-max-clamp-legacy" },
  { id: "clamp()", re: /(?<![\w-])clamp\s*\(/g, chrome: 79, polyfill: "postcss-min-max-clamp-legacy" },
  { id: "inset", re: /(?<!-)inset\s*:/g, chrome: 87, polyfill: "postcss-logical" },
  { id: "flex gap", re: /\bgap\s*:/g, chrome: 84, polyfill: "postcss-flex-gap-legacy + html.no-flex-gap" },
  { id: "aspect-ratio", re: /aspect-ratio\s*:/g, chrome: 88, polyfill: "legacy-aspect-ratio.css + JS" },
  { id: "@container / cq*", re: /@container\b|\bcq(?:min|max|w|h|i|b)\b/g, chrome: 105, polyfill: "源码内变量回退（不自动）" },
  { id: ":has()", re: /:has\s*\(/g, chrome: 105, polyfill: "渐进增强（可忽略）" },
  { id: "text-wrap", re: /text-wrap\s*:/g, chrome: 114, polyfill: "渐进增强（可忽略）" },
  { id: "dvh/svh/lvh", re: /\d(?:dvh|svh|lvh)\b/g, chrome: 108, polyfill: "已有 min-height:100% 在前" },
  { id: ":focus-visible", re: /:focus-visible\b/g, chrome: 86, polyfill: "渐进增强（可忽略）" },
  { id: "backdrop-filter", re: /backdrop-filter\s*:/g, chrome: 76, polyfill: "装饰性；已有 -webkit-" },
  { id: "margin/padding-block|inline", re: /(?:margin|padding)-(?:inline|block)/g, chrome: 87, polyfill: "postcss-logical" },
];

const report = {};
for (const p of patterns) report[p.id] = { ...p, total: 0 };

for (const file of walk(root)) {
  const text = fs.readFileSync(file, "utf8");
  for (const chunk of styleChunks(file, text)) {
    for (const p of patterns) {
      const n = chunk.match(p.re)?.length ?? 0;
      report[p.id].total += n;
    }
  }
}

console.log("Chrome 70 CSS risk scan\n");
for (const p of Object.values(report).sort((a, b) => b.total - a.total)) {
  if (!p.total) continue;
  console.log(
    `${String(p.total).padStart(4)}×  ${p.id.padEnd(28)} ≥${String(p.chrome).padEnd(4)}  → ${p.polyfill}`,
  );
}
