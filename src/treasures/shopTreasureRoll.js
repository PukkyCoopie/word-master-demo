import {
  notifyPrerequisiteTreasureShopShelfAppearance,
  pickUniformFromTierWithWeightMultipliers,
} from "./prerequisiteShopBoost.js";

/**
 * @typedef {Object} ShopTreasurePickOpts
 * @property {(treasureId: string) => number} [getPrerequisiteWeightMultiplier] 阶段二：档内权重乘数
 * @property {(treasureId: string) => void} [onPrerequisiteTreasureShopAppeared]
 * @property {boolean} [allowOwnedTreasuresInShop] 持有购物袋时：已拥有 id 仍可抽中
 */

/**
 * 商店按稀有度加权抽取（对齐 Balatro 小丑生成：Common 70% / Uncommon 25% / Rare 5%，
 * 映射到本项目的 rare / epic / legendary）；某档池空则权重落到其余档。
 *
 * @param {import('./treasureTypes.js').TreasureDef[]} pool
 * @param {() => number} rng 返回 [0,1)
 * @param {ShopTreasurePickOpts} [opts]
 */
export function pickWeightedTreasureFromPool(pool, rng = Math.random, opts) {
  if (pool.length === 0) return null;
  const common = pool.filter((t) => t.rarity === "common");
  const rare = pool.filter((t) => t.rarity === "rare");
  const epic = pool.filter((t) => t.rarity === "epic");
  const leg = pool.filter((t) => t.rarity === "legendary");
  const shopCommonTier = [...common, ...rare];
  const wR = shopCommonTier.length > 0 ? 70 : 0;
  const wE = epic.length > 0 ? 25 : 0;
  const wL = leg.length > 0 ? 5 : 0;
  const total = wR + wE + wL;
  const getMult = opts?.getPrerequisiteWeightMultiplier;
  const pickFromTier = (tier) => {
    const def = pickUniformFromTierWithWeightMultipliers(tier, rng, getMult);
    if (def) {
      notifyPrerequisiteTreasureShopShelfAppearance(def.treasureId, opts?.onPrerequisiteTreasureShopAppeared);
    }
    return def;
  };
  if (total <= 0) {
    const def = pickFromTier(pool);
    return def ?? pool[Math.floor(rng() * pool.length)];
  }
  const r = rng() * total;
  /** @type {import('./treasureTypes.js').TreasureDef[]} */
  let tier = leg;
  if (r < wR) tier = shopCommonTier;
  else if (r < wR + wE) tier = epic;
  return pickFromTier(tier);
}

/**
 * 从可用池中均匀抽取一个传说宝藏（仍受前提权重与货架出现回调约束）。
 *
 * @param {import('./treasureTypes.js').TreasureDef[]} pool
 * @param {() => number} [rng]
 * @param {ShopTreasurePickOpts} [opts]
 */
export function pickLegendaryTreasureFromPool(pool, rng = Math.random, opts) {
  if (!pool.length) return null;
  const leg = pool.filter((t) => t.rarity === "legendary");
  if (leg.length === 0) return null;
  const getMult = opts?.getPrerequisiteWeightMultiplier;
  const pickFromTier = (tier) => {
    const def = pickUniformFromTierWithWeightMultipliers(tier, rng, getMult);
    if (def) {
      notifyPrerequisiteTreasureShopShelfAppearance(def.treasureId, opts?.onPrerequisiteTreasureShopAppeared);
    }
    return def;
  };
  return pickFromTier(leg) ?? leg[Math.floor(rng() * leg.length)];
}

/**
 * 从全集中抽取若干互不重复的宝藏（排除已拥有与额外排除集）。
 *
 * @param {import('./treasureTypes.js').TreasureDef[]} all
 * @param {Set<string>} ownedTreasureIds
 * @param {Set<string>} excludeTreasureIds
 * @param {number} count
 * @param {() => number} [rng]
 * @param {ShopTreasurePickOpts} [opts]
 * @returns {import('./treasureTypes.js').TreasureDef[]}
 */
export function rollDistinctShopTreasures(
  all,
  ownedTreasureIds,
  excludeTreasureIds,
  count,
  rng = Math.random,
  opts,
) {
  const allowOwned = opts?.allowOwnedTreasuresInShop === true;
  const used = new Set([...excludeTreasureIds]);
  if (!allowOwned) {
    for (const id of ownedTreasureIds) used.add(id);
  }
  /** @type {import('./treasureTypes.js').TreasureDef[]} */
  const picks = [];
  for (let i = 0; i < count; i += 1) {
    const pool = all.filter((t) => !used.has(t.treasureId));
    if (pool.length === 0) break;
    const t = pickWeightedTreasureFromPool(pool, rng, opts);
    if (!t) break;
    picks.push(t);
    used.add(t.treasureId);
  }
  return picks;
}

/**
 * @param {import('./treasureTypes.js').TreasureDef[]} all
 * @param {Set<string>} ownedTreasureIds
 */
export function countShopPoolSize(all, ownedTreasureIds) {
  return all.filter((t) => !ownedTreasureIds.has(t.treasureId)).length;
}

/**
 * 将已展示在商店货架上的商品键写入同次进店互斥集（宝藏 / 单卡区法术·升级 / 牌包宝藏包选项）。
 *
 * @param {Set<string>} exclude
 * @param {object[]} offers
 */
export function addShopShelfTreasureIdsToExclude(exclude, offers) {
  if (!exclude || !Array.isArray(offers)) return;
  for (const o of offers) {
    if (!o || o.kind !== "offer") continue;
    if (o.offerType === "treasure" && o.treasureId) exclude.add(String(o.treasureId));
    if (o.offerType === "spell" && o.spellId) exclude.add(`spell_${o.spellId}`);
    if (o.offerType === "upgrade") {
      if (o.upgradeKind === "length" && o.lengthGroupKey) {
        exclude.add(`upgrade_${o.lengthGroupKey}`);
      } else if (o.upgradeKind === "rarity" && o.rarityKey) {
        exclude.add(`upgrade_rarity_${o.rarityKey}`);
      }
    }
    if (o.offerType === "bundlePack" && o.bundleKind === "treasure") {
      for (const opt of o.bundleOptions ?? []) {
        if (opt?.offerType === "treasure" && opt.treasureId) exclude.add(String(opt.treasureId));
      }
    }
  }
}
