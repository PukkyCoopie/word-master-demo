/**
 * 导出商店内可用金币购买的商品清单（CSV UTF-8 BOM，便于 Excel 编辑 emoji）。
 * 运行: npm run shop:export-csv
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "design", "shop_gold_items.csv");

/** @param {string} rel */
async function loadModule(rel) {
  return import(pathToFileURL(path.join(root, rel)).href);
}

/** @param {unknown} description */
function descriptionToPlain(description) {
  if (!Array.isArray(description)) return String(description ?? "");
  /** @type {string[]} */
  const parts = [];
  /** @param {unknown[]} segs */
  function walk(segs) {
    for (const seg of segs) {
      if (!seg || typeof seg !== "object") continue;
      const t = /** @type {{ type?: string, v?: string, parts?: unknown[] }} */ (seg).type;
      const v = String(/** @type {{ v?: string }} */ (seg).v ?? "");
      if (t === "text" || t === "gain" || t === "concept" || t === "mult" || t === "prob") {
        parts.push(v);
      } else if (t === "score") parts.push(`${v}分`);
      else if (t === "money") parts.push(`$${v}`);
      else if (t === "rarity") parts.push(v);
      else if (t === "br") parts.push(" ");
      else if (t === "gainBlock" && Array.isArray(/** @type {{ parts?: unknown[] }} */ (seg).parts)) {
        walk(/** @type {{ parts: unknown[] }} */ (seg).parts);
      }
    }
  }
  walk(description);
  return parts.join("").replace(/\s+/g, " ").trim();
}

/** @param {string} s */
function csvEscape(s) {
  const t = String(s ?? "");
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

/** @param {string[]} cols */
function csvRow(cols) {
  return cols.map(csvEscape).join(",");
}

/** @param {string} name @param {string} emoji */
function nameWithEmoji(name, emoji) {
  const n = String(name ?? "").trim();
  const e = String(emoji ?? "").trim();
  if (n && e) return `${n} ${e}`;
  return n || e;
}

const BUNDLE_NAMES = {
  spell: { normal: "法术包", jumbo: "巨型法术包", mega: "超级法术包" },
  upgrade: { normal: "升级包", jumbo: "巨型升级包", mega: "超级升级包" },
  treasure: { normal: "宝藏包", jumbo: "巨型宝藏包", mega: "超级宝藏包" },
  tile: { normal: "字母包", jumbo: "巨型字母包", mega: "超级字母包" },
};

const BUNDLE_EFFECTS = {
  spell: { normal: "从3张法术卡中选择1张并使用", jumbo: "从5张法术卡中选择1张并使用", mega: "从5张法术卡中选择至多2张并使用" },
  upgrade: { normal: "从3张升级卡中选择1张并使用", jumbo: "从5张升级卡中选择1张并使用", mega: "从5张升级卡中选择至多2张并使用" },
  treasure: { normal: "从2个宝藏中选择1个并获取", jumbo: "从4个宝藏中选择1个并获取", mega: "从4个宝藏中选择至多2个并获取" },
  tile: { normal: "从3个字母块中选择1个并加入牌库", jumbo: "从5个字母块中选择1个并加入牌库", mega: "从5个字母块中选择至多2个并加入牌库" },
};

async function loadShopTreasures() {
  const { TREASURE_CATALOG_BY_ID, IMPLEMENTED_TREASURE_ID_SET } = await loadModule(
    "src/treasures/treasureCatalog.js",
  );
  const itemsDir = path.join(root, "src", "treasures", "items");
  const files = fs.readdirSync(itemsDir).filter((f) => /^treasure_\d+\.js$/.test(f));
  /** @type {object[]} */
  const rows = [];
  for (const file of files.sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0))) {
    const treasureId = String(Number(file.match(/treasure_(\d+)\.js/)?.[1]));
    if (!IMPLEMENTED_TREASURE_ID_SET.has(treasureId)) continue;
    const mod = await loadModule(`src/treasures/items/${file}`);
    const def = mod.default;
    if (!def) continue;
    if (def.shopEligible === false) continue;
    const catalog = TREASURE_CATALOG_BY_ID.get(treasureId);
    const name = catalog?.name ?? def.name ?? "";
    const emoji = catalog?.emoji ?? def.emoji ?? "";
    rows.push({
      id: `treasure_${treasureId}`,
      name,
      emoji,
      type: "宝藏",
      effect: descriptionToPlain(def.description),
      price: def.price ?? 0,
      note: "单卡区随机上架；带配饰时售价+0~+3",
    });
  }
  return rows;
}

async function main() {
  const { VOUCHER_DEFINITIONS } = await loadModule("src/vouchers/voucherDefinitions.js");
  const { formatVoucherDisplayName } = await loadModule("src/vouchers/voucherDisplay.js");
  const { SPELL_DEFINITIONS, getSpellShopPrice } = await loadModule("src/spells/spellDefinitions.js");
  const { SHOP_BUNDLE_PACK_PRICES, SHOP_SINGLE_ROW_PRICES, SHOP_WILDCARD_TILE_PRICE } =
    await loadModule("src/shop/shopPackEconomy.js");
  const { UPGRADE_LENGTH_GROUPS, UPGRADE_RARITY_LETTER_LABEL } = await loadModule(
    "src/shop/shopOfferRowBuilders.js",
  );
  const { LETTER_RARITY_ORDER } = await loadModule("src/composables/useScoring.js");

  /** @type {object[]} */
  const all = [];

  for (const v of VOUCHER_DEFINITIONS) {
    if (!v.inShopPool) continue;
    const name = formatVoucherDisplayName(v, { pairHasTier2Owned: false, showTier1Suffix: true });
    all.push({
      id: v.id,
      name,
      emoji: v.emoji ?? "",
      type: "优惠券",
      effect: descriptionToPlain(v.description),
      price: v.price ?? 10,
      note: v.tier === 2 ? "需已拥有同系列一级券" : "",
    });
  }

  const treasures = await loadShopTreasures();
  all.push(...treasures);

  for (const def of SPELL_DEFINITIONS) {
    if (def.id === "restart") {
      all.push({
        id: "spell_restart",
        name: def.name,
        emoji: "",
        type: "法术",
        effect: descriptionToPlain(def.description),
        price: getSpellShopPrice(def),
        note: "仅当上张可重播法术存在时出现在商店",
      });
      continue;
    }
    all.push({
      id: `spell_${def.id}`,
      name: def.name,
      emoji: "",
      type: "法术",
      effect: descriptionToPlain(def.description),
      price: getSpellShopPrice(def),
      note: def.tags?.includes?.("spectral") ? "幻灵标签" : "",
    });
  }

  for (const g of UPGRADE_LENGTH_GROUPS) {
    all.push({
      id: `upgrade_length_${g.key}`,
      name: `升级 · ${g.label}`,
      emoji: "",
      type: "升级",
      effect: `${g.label}单词的等级提升1级`,
      price: SHOP_SINGLE_ROW_PRICES.lengthUpgrade,
      note: "单卡区随机上架；亦可出现在升级组合包内",
    });
  }
  for (const rk of LETTER_RARITY_ORDER) {
    const label = UPGRADE_RARITY_LETTER_LABEL[rk] ?? rk;
    all.push({
      id: `upgrade_rarity_${rk}`,
      name: `升级 · ${label}`,
      emoji: "",
      type: "升级",
      effect: `「${label}」稀有度字母的等级提升 1 级`,
      price: SHOP_SINGLE_ROW_PRICES.rarityUpgrade,
      note: "单卡区随机上架；亦可出现在升级组合包内",
    });
  }

  for (const kind of /** @type {const} */ (["spell", "upgrade", "treasure", "tile"])) {
    for (const tier of /** @type {const} */ (["normal", "jumbo", "mega"])) {
      all.push({
        id: `bundle_${kind}_${tier}`,
        name: BUNDLE_NAMES[kind][tier],
        emoji: "",
        type: "组合包",
        effect: BUNDLE_EFFECTS[kind][tier],
        price: SHOP_BUNDLE_PACK_PRICES[kind][tier],
        note: "牌包区随机上架（进店生成，刷新不重掷）",
      });
    }
  }

  all.push({
    id: "deck_tile_random",
    name: "字母块",
    emoji: "",
    type: "字母块",
    effect: "随机字母块加入牌库（二级打字机后可能带材质/配饰）",
    price: SHOP_SINGLE_ROW_PRICES.deckTilePlain,
    note: `需优惠券「打字机」；无增益 $${SHOP_SINGLE_ROW_PRICES.deckTilePlain}、有增益 $${SHOP_SINGLE_ROW_PRICES.deckTile}（万能块 $${SHOP_WILDCARD_TILE_PRICE}）；亦可出现在字母包`,
  });

  const header = ["id", "名称", "emoji", "名称与emoji", "类型", "效果", "价格", "备注"];
  const lines = [csvRow(header)];
  for (const r of all) {
    lines.push(
      csvRow([
        r.id,
        r.name,
        r.emoji,
        nameWithEmoji(r.name, r.emoji),
        r.type,
        r.effect,
        String(r.price),
        r.note ?? "",
      ]),
    );
  }

  const bom = "\uFEFF";
  fs.writeFileSync(outPath, bom + lines.join("\r\n") + "\r\n", "utf8");
  console.log(`Wrote ${all.length} rows -> ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
