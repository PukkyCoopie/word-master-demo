/**
 * 按 design/shop_gold_items_copy.csv 回写法术单价与升级稀有度单价。
 * 运行: node scripts/apply-shop-prices-from-csv.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = path.join(root, "design", "shop_gold_items_copy.csv");
const spellPath = path.join(root, "src", "spells", "spellDefinitions.js");
const economyPath = path.join(root, "src", "shop", "shopPackEconomy.js");

function parseCsvLine(line) {
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

const raw = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
const lines = raw.trim().split(/\r?\n/);
const header = parseCsvLine(lines[0]);
const idIdx = header.indexOf("id");
const typeIdx = header.indexOf("类型");
const priceCol = header.indexOf("价格");

/** @type {Map<string, number>} */
const spellPrices = new Map();
let rarityUpgradePrice = null;

for (let i = 1; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i]);
  const id = cols[idIdx];
  const type = cols[typeIdx];
  const price = Number(cols[priceCol]);
  if (type === "法术" && id.startsWith("spell_")) {
    spellPrices.set(id.slice("spell_".length), price);
  }
  if (id === "upgrade_rarity_common") rarityUpgradePrice = price;
}

let spellSrc = fs.readFileSync(spellPath, "utf8");
for (const [spellId, price] of spellPrices) {
  const blockRe = new RegExp(
    `(\\{\\s*id:\\s*"${spellId}"[\\s\\S]*?)(\\n\\s*\\},)`,
    "m",
  );
  const m = spellSrc.match(blockRe);
  if (!m) {
    console.warn("spell block not found:", spellId);
    continue;
  }
  let block = m[1];
  if (/shopPrice:\s*\d+/.test(block)) {
    block = block.replace(/shopPrice:\s*\d+/, `shopPrice: ${price}`);
  } else if (/pickMode:\s*"/.test(block)) {
    block = block.replace(/(pickMode:\s*"[^"]+",)/, `$1\n      shopPrice: ${price},`);
  } else if (/tags:\s*SPECTRAL/.test(block)) {
    block = block.replace(/(tags:\s*SPECTRAL,)/, `$1\n      shopPrice: ${price},`);
  } else if (/pickCount:\s*-?\d+,/.test(block)) {
    block = block.replace(/(pickCount:\s*-?\d+,)/, `$1\n      shopPrice: ${price},`);
  } else {
    block = block.replace(/(description:)/, `shopPrice: ${price},\n      $1`);
  }
  spellSrc = spellSrc.replace(blockRe, `${block}${m[2]}`);
}

if (rarityUpgradePrice != null) {
  spellSrc = spellSrc;
  const econ = fs.readFileSync(economyPath, "utf8");
  const next = econ.replace(
    /rarityUpgrade:\s*\d+/,
    `rarityUpgrade: ${rarityUpgradePrice}`,
  );
  fs.writeFileSync(economyPath, next, "utf8");
  console.log("rarityUpgrade ->", rarityUpgradePrice);
}

fs.writeFileSync(spellPath, spellSrc, "utf8");
console.log("updated spells:", spellPrices.size);
