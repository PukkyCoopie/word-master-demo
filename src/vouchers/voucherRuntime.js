import { LEVELS } from "../levelDefinitions.js";
import { VOUCHERS_BY_ID } from "./voucherDefinitions.js";

/** @param {Iterable<string>} owned */
function has(owned, id) {
  const s = new Set(owned);
  return s.has(id);
}

/** @param {Iterable<string>} owned */
export function getShopDiscountMultiplier(owned) {
  if (has(owned, "v_clearance_2")) return 0.5;
  if (has(owned, "v_clearance_1")) return 0.75;
  return 1;
}

/**
 * @param {number} price
 * @param {Iterable<string>} owned
 */
export function applyShopDiscountPrice(price, owned) {
  const p = Math.max(0, Number(price) || 0);
  return Math.max(0, Math.floor(p * getShopDiscountMultiplier(owned)));
}

/** @param {Iterable<string>} owned */
export function getPackOfferSlotBonus(owned) {
  let n = 0;
  if (has(owned, "v_overstock_1")) n += 1;
  if (has(owned, "v_overstock_2")) n += 1;
  return n;
}

/** @param {Iterable<string>} owned */
export function getShopAccessoryChanceMultiplier(owned) {
  if (has(owned, "v_hone_2")) return 4;
  if (has(owned, "v_hone_1")) return 2;
  return 1;
}

/** @param {Iterable<string>} owned */
export function getRerollCostDiscountDollars(owned) {
  let d = 0;
  if (has(owned, "v_reroll_1")) d += 2;
  if (has(owned, "v_reroll_2")) d += 2;
  return d;
}

/**
 * @param {Iterable<string>} owned
 * @param {number} baseCost
 */
export function getEffectiveShopRerollCost(owned, baseCost) {
  return Math.max(0, Math.floor(Number(baseCost) || 0) - getRerollCostDiscountDollars(owned));
}

/** @param {Iterable<string>} owned */
export function getSpellCategoryWeightMultiplier(owned) {
  if (has(owned, "v_tarot_2")) return 4;
  if (has(owned, "v_tarot_1")) return 2;
  return 1;
}

/** @param {Iterable<string>} owned */
export function getUpgradeCategoryWeightMultiplier(owned) {
  if (has(owned, "v_planet_2")) return 4;
  if (has(owned, "v_planet_1")) return 2;
  return 1;
}

/** @param {Iterable<string>} owned */
export function getEconomyInterestCap(owned) {
  if (has(owned, "v_seed_2")) return 20;
  if (has(owned, "v_seed_1")) return 10;
  return null;
}

/** 细针 Boss：以 1 手为基底，再叠加手套等额外次数（卷轴已体现在 baseHands 中）。 */
export function getSubmitHandsForNeedleBoss(baseHandsFromVouchers) {
  const b = Math.max(1, Math.floor(Number(baseHandsFromVouchers) || 4));
  return Math.max(1, 1 + Math.max(0, b - 4));
}

/** @param {Iterable<string>} owned */
export function getBaseHandsPerLevel(owned) {
  let n = 4;
  if (has(owned, "v_grabber_2")) n += 2;
  else if (has(owned, "v_grabber_1")) n += 1;
  if (has(owned, "v_glyph_1")) n -= 1;
  return Math.max(1, n);
}

/**
 * 「直尺」券：计分时用于词长表（长度倍率、每字基础分）的额外长度，与棋盘格数无关。
 * @param {Iterable<string>} owned
 * @returns {0|1|2}
 */
export function getWordLengthJudgmentBonus(owned) {
  if (has(owned, "v_ruler_2")) return 2;
  if (has(owned, "v_ruler_1")) return 1;
  return 0;
}

/**
 * 与 `getLengthMultiplier` 内对词长的 clamp 一致：用于「格数 + 判定加成」后的等效词长。
 * @param {number} tileCount 入词字母块数（Qu 算 1）
 * @param {number} judgmentBonus 优惠券等给出的非负整数加成
 */
export function getLengthTableLenFromTileCountAndBonus(tileCount, judgmentBonus) {
  const t = Math.max(0, Math.round(Number(tileCount)) || 0);
  const b = Math.max(0, Math.floor(Number(judgmentBonus) || 0));
  const L = t + b;
  return L <= 0 ? 3 : L < 3 ? 3 : L > 16 ? 16 : L;
}

/**
 * @param {number} tileCount
 * @param {Iterable<string>} owned
 */
export function getJudgedLengthTableLenForOwnedVouchers(tileCount, owned) {
  return getLengthTableLenFromTileCountAndBonus(tileCount, getWordLengthJudgmentBonus(owned));
}

/** @param {Iterable<string>} owned */
export function getBaseRemovalsPerLevel(owned) {
  let n = 3;
  if (has(owned, "v_wasteful_2")) n += 2;
  else if (has(owned, "v_wasteful_1")) n += 1;
  if (has(owned, "v_glyph_2")) n -= 1;
  return Math.max(1, n);
}

/** 白方块·二级：宝藏栏额外格数 */
export function getOwnedTreasureSlotBonusFromVouchers(owned) {
  return has(owned, "v_blank_2") ? 1 : 0;
}

/**
 * 卷轴券购买后跳转的关卡索引（上一大关或上两大关的首小关）。
 * @param {number} currentLevelIndex `LEVELS` 下标
 * @param {boolean} tier2 是否为「卷轴·二级」
 * @returns {number | null}
 */
export function getGlyphPurchaseTargetLevelIndex(currentLevelIndex, tier2) {
  const ix0 = Math.max(0, Math.min(Math.floor(Number(currentLevelIndex) || 0), LEVELS.length - 1));
  const cur = LEVELS[ix0];
  if (!cur?.id) return null;
  const major = parseMajorFromLevelId(cur.id);
  const delta = tier2 ? 2 : 1;
  if (major <= delta) return null;
  const targetMajor = major - delta;
  const tix = LEVELS.findIndex((l) => {
    const parts = String(l.id).split("-");
    const m = parseMajorFromLevelId(l.id);
    const minor = Math.max(1, Math.round(Number(parts[1]) || 0) || 1);
    return m === targetMajor && minor === 1;
  });
  return tix >= 0 ? tix : null;
}

/** @param {Iterable<string>} owned */
export function getRemovalLetterCapBonus(owned) {
  let b = 0;
  if (has(owned, "v_paint_2")) b += 2;
  else if (has(owned, "v_paint_1")) b += 1;
  return b;
}

/** @param {Iterable<string>} owned */
export function hasTelescopeVoucher(owned) {
  return has(owned, "v_telescope_1") || has(owned, "v_telescope_2");
}

/** @param {Iterable<string>} owned */
export function hasObservatoryVoucher(owned) {
  return has(owned, "v_telescope_2");
}

/** @param {Iterable<string>} owned */
export function hasMagicTrick(owned) {
  return has(owned, "v_magic_1") || has(owned, "v_magic_2");
}

/** @param {Iterable<string>} owned */
export function hasIllusion(owned) {
  return has(owned, "v_magic_2");
}

/**
 * @param {Record<string, number> | null | undefined} spellCountsByLength
 * @returns {number} 0 表示无记录
 */
export function getMostPlayedWordLength(spellCountsByLength) {
  if (!spellCountsByLength || typeof spellCountsByLength !== "object") return 0;
  let bestLen = 0;
  let bestC = -1;
  for (const [k, v] of Object.entries(spellCountsByLength)) {
    const len = Math.max(0, Math.round(Number(k)) || 0);
    const c = Math.max(0, Math.round(Number(v)) || 0);
    if (c > bestC || (c === bestC && len > bestLen)) {
      bestC = c;
      bestLen = len;
    }
  }
  return bestLen;
}

/**
 * @param {Iterable<string>} owned
 * @param {number} wordLen
 * @param {number} maxSubmittedBeforeThisWord 本词提交前，已成功提交中的最大词长
 */
export function getObservatoryLengthMultFactor(owned, wordLen, maxSubmittedBeforeThisWord) {
  if (!hasObservatoryVoucher(owned)) return 1;
  const L = Math.max(0, Math.round(Number(wordLen)) || 0);
  const prev = Math.max(0, Math.round(Number(maxSubmittedBeforeThisWord)) || 0);
  if (L <= 0) return 1;
  return L >= prev ? 1.5 : 1;
}

/** @param {string} levelId 如 "3-1" */
export function parseMajorFromLevelId(levelId) {
  const p = String(levelId ?? "").split("-");
  const m = Math.max(1, Math.round(Number(p[0]) || 0) || 1);
  return m;
}

/** @param {string} voucherId */
export function getVoucherDefOrNull(voucherId) {
  return VOUCHERS_BY_ID.get(String(voucherId ?? "")) ?? null;
}
