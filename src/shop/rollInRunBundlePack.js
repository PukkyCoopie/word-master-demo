import { rollPackOfferStock } from "./rollPackStock.js";

/**
 * 对局内随机掷一包组合包（复用商店包池逻辑，不占货架槽位）。
 * @param {Parameters<typeof rollPackOfferStock>[0]} ctx
 */
export function rollOneRandomBundlePackOffer(ctx) {
  const stock = rollPackOfferStock(ctx);
  const bundles = stock.filter((s) => s?.kind === "offer" && s?.offerType === "bundlePack");
  if (!bundles.length) return null;
  const rng = typeof ctx.rng === "function" ? ctx.rng : Math.random;
  return bundles[Math.floor(rng() * bundles.length)];
}

/** @typedef {'spell' | 'treasure' | 'upgrade' | 'letter'} InRunBundlePackKind */

/** @type {Record<InRunBundlePackKind, readonly string[]>} */
const KIND_TO_CATEGORIES = Object.freeze({
  spell: ["bundleSpellNormal"],
  treasure: ["bundleTreasureNormal"],
  upgrade: ["bundleUpgradeNormal"],
  letter: ["bundleTileNormal"],
});

/**
 * @param {object} row
 * @param {string} cat
 */
function bundleRowMatchesCategory(row, cat) {
  if (!row || row.offerType !== "bundlePack") return false;
  const tier = cat.includes("Mega") ? "mega" : cat.includes("Jumbo") ? "jumbo" : "normal";
  /** @type {Record<string, InRunBundlePackKind>} */
  const prefixKind = {
    bundleSpell: "spell",
    bundleTreasure: "treasure",
    bundleUpgrade: "upgrade",
    bundleTile: "tile",
  };
  let kind = "";
  for (const [prefix, k] of Object.entries(prefixKind)) {
    if (cat.startsWith(prefix)) {
      kind = k;
      break;
    }
  }
  return row.bundleKind === kind && row.bundleSize === tier;
}

/**
 * 对局内掷出指定类型的普通组合包（法术 / 宝藏 / 升级 / 字母）。
 * @param {InRunBundlePackKind} kind
 * @param {Parameters<typeof rollPackOfferStock>[0]} ctx
 */
export function rollInRunBundlePackOfKind(kind, ctx) {
  const cats = KIND_TO_CATEGORIES[kind];
  if (!cats?.length) return null;
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const stock = rollPackOfferStock({
      ...ctx,
      guaranteeBalatroFirstShopBuffoonSlot: false,
    });
    for (const row of stock) {
      if (row?.kind !== "offer" || row.offerType !== "bundlePack") continue;
      if (cats.some((cat) => bundleRowMatchesCategory(row, cat))) return row;
    }
  }
  return null;
}
