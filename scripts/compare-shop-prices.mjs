import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(root, "..");

/** @param {string} path */
function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.trim().split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const priceIdx = header.indexOf("价格");
  const idIdx = header.indexOf("id");
  const typeIdx = header.indexOf("类型");
  /** @type {Map<string, { price: number, type: string }>} */
  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    map.set(cols[idIdx], { price: Number(cols[priceIdx]), type: cols[typeIdx] });
  }
  return map;
}

/** @param {string} line */
function parseCsvLine(line) {
  /** @type {string[]} */
  const cols = [];
  let cur = "";
  let inQ = false;
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if (inQ) {
      if (c === '"' && line[j + 1] === '"') {
        cur += '"';
        j++;
      } else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === ",") {
      cols.push(cur);
      cur = "";
    } else if (c === '"') inQ = true;
    else cur += c;
  }
  cols.push(cur);
  return cols;
}

const src = parseCsv(path.join(rootDir, "design", "shop_gold_items.csv"));
const want = parseCsv(path.join(rootDir, "design", "shop_gold_items_copy.csv"));
/** @type {{ id: string, type: string, from: number, to: number }[]} */
const diffs = [];
for (const [id, w] of want) {
  const s = src.get(id);
  if (!s) {
    diffs.push({ id, type: w.type, from: NaN, to: w.price });
    continue;
  }
  if (s.price !== w.price) diffs.push({ id, type: w.type, from: s.price, to: w.price });
}
console.log(`diffs: ${diffs.length}`);
for (const d of diffs) console.log(`${d.type}\t${d.id}\t${d.from}\t->\t${d.to}`);
fs.writeFileSync(
  path.join(rootDir, "design", "shop_price_diffs.json"),
  JSON.stringify(diffs, null, 2),
  "utf8",
);
