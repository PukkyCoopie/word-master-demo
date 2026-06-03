import { getSpellShopPrice } from "./spellDefinitions.js";

/** 线性价差锚点；叠加基础权重压低高低价倍率（约 $2:$7 ≈ 2.25:1）。 */
const SPELL_PACK_WEIGHT_PRICE_ANCHOR = 8;
const SPELL_PACK_WEIGHT_BASE = 3;

/**
 * 法术包内单张法术的出现权重：基础值 + 与单价成反比的线性项（非平方）。
 * @param {import("./spellDefinitions.js").SpellDefinition} def
 */
export function getSpellPackOfferWeight(def) {
  const price = getSpellShopPrice(def);
  const delta = Math.max(1, SPELL_PACK_WEIGHT_PRICE_ANCHOR - price);
  return SPELL_PACK_WEIGHT_BASE + delta;
}

/**
 * @param {import("./spellDefinitions.js").SpellDefinition[]} pool
 * @param {() => number} rng
 * @returns {import("./spellDefinitions.js").SpellDefinition | null}
 */
export function pickWeightedSpellFromPool(pool, rng = Math.random) {
  if (!pool.length) return null;
  const weights = pool.map((d) => getSpellPackOfferWeight(d));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return pool[Math.floor(rng() * pool.length)] ?? null;
  let u = rng() * sum;
  for (let i = 0; i < pool.length; i += 1) {
    u -= weights[i];
    if (u < 0) return pool[i] ?? null;
  }
  return pool[pool.length - 1] ?? null;
}

/**
 * 法术包：按单价加权、无放回抽取若干张互不重复的法术。
 * @param {import("./spellDefinitions.js").SpellDefinition[]} defs
 * @param {number} count
 * @param {() => number} [rng]
 */
export function pickDistinctSpellDefsForPack(defs, count, rng = Math.random) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (!n || !Array.isArray(defs) || !defs.length) return [];
  /** @type {import("./spellDefinitions.js").SpellDefinition[]} */
  const pool = defs.filter(Boolean);
  /** @type {import("./spellDefinitions.js").SpellDefinition[]} */
  const picks = [];
  for (let i = 0; i < n; i += 1) {
    if (!pool.length) break;
    const def = pickWeightedSpellFromPool(pool, rng);
    if (!def) break;
    picks.push(def);
    const idx = pool.indexOf(def);
    if (idx >= 0) pool.splice(idx, 1);
  }
  return picks;
}
