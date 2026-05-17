import { LEVELS } from "../levelDefinitions.js";
import { VOUCHERS_BY_ID } from "./voucherDefinitions.js";

/** @param {Iterable<string>} owned */
function has(owned, id) {
  const s = new Set(owned);
  return s.has(id);
}

/** 货架商品标价乘数（不含商店「刷新」费用；刷新减价见 `getRerollCostDiscountDollars` / 骰子券）。 */
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

/** 纸箱券：单卡区额外槽位（对齐 Balatro Overstock / Overstock Plus）。 */
export function getShopRandomCardSlotBonus(owned) {
  let n = 0;
  if (has(owned, "v_overstock_1")) n += 1;
  if (has(owned, "v_overstock_2")) n += 1;
  return n;
}

/** @deprecated 纸箱加成已迁至单卡区；牌包区固定槽位 */
export function getPackOfferSlotBonus(owned) {
  return 0;
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
 * 「画笔」券：计分时用于词长表（长度倍率、每字基础分）的额外长度，与棋盘格数无关。
 * @param {Iterable<string>} owned
 * @returns {0|1|2}
 */
export function getWordLengthJudgmentBonus(owned) {
  if (has(owned, "v_paint_2")) return 2;
  if (has(owned, "v_paint_1")) return 1;
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
 * 卷轴券购买后跳转的关卡索引：相对「商店离开后即将进入的下一小关」回退 N 个大关，保留小关号。
 * 例：刚通关 2-2 进店时下一关本为 2-3，购买一级卷轴后变为 1-3；通关 1-1 后下一关为 1-2，购买一级卷轴后变为 0-2（Ante 0 章底 100）。
 * @param {number} currentLevelIndex `LEVELS` 下标（通常为刚通关、尚未 +1 的关卡）
 * @param {boolean} tier2 是否为「卷轴·二级」（回退 2 大关）
 * @returns {number | null}
 */
export function getGlyphPurchaseTargetLevelIndex(currentLevelIndex, tier2) {
  const ix0 = Math.max(0, Math.min(Math.floor(Number(currentLevelIndex) || 0), LEVELS.length - 1));
  const upcomingIx = Math.min(ix0 + 1, LEVELS.length - 1);
  const upcoming = LEVELS[upcomingIx];
  if (!upcoming?.id) return null;
  const major = parseMajorFromLevelId(upcoming.id);
  const minor = parseLevelSubFromId(upcoming.id);
  const delta = tier2 ? 2 : 1;
  const targetMajor = major - delta;
  if (targetMajor < 0) return null;
  const tix = LEVELS.findIndex((l) => {
    const m = parseMajorFromLevelId(l.id);
    const sub = parseLevelSubFromId(l.id);
    return m === targetMajor && sub === minor;
  });
  return tix >= 0 ? tix : null;
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
 * 望远镜二级：本次升级是否对该词长应用 1.5 倍升级步（分数/倍率增量向下取整）。
 * @param {Iterable<string>} owned
 * @param {number} len 3–16
 * @param {Record<string, number> | null | undefined} spellCountsByLength
 */
export function isLengthObservatoryBoosted(owned, len, spellCountsByLength) {
  if (!hasObservatoryVoucher(owned)) return false;
  const most = getMostPlayedWordLength(spellCountsByLength);
  if (most < 3) return false;
  const L = Math.max(0, Math.round(Number(len)) || 0);
  const clamped = L <= 0 ? 3 : L < 3 ? 3 : L > 16 ? 16 : L;
  return clamped === most;
}

/** @param {string} levelId 如 "3-1" */
export function parseMajorFromLevelId(levelId) {
  const p = String(levelId ?? "").split("-");
  return Math.max(0, Math.round(Number(p[0]) || 0) || 0);
}

/** @param {string} levelId 如 "2-3" */
export function parseLevelSubFromId(levelId) {
  const p = String(levelId ?? "").split("-");
  return Math.max(1, Math.min(3, Math.floor(Number(p[1])) || 1));
}

/**
 * 商店优惠券货架代数：同一代内未购买则保持同一商品；过关 x-3 后进店进入下一代。
 * @param {string} levelId
 */
export function getVoucherShelfGeneration(levelId) {
  const major = parseMajorFromLevelId(levelId);
  const sub = parseLevelSubFromId(levelId);
  return sub >= 3 ? major + 1 : major;
}

/** @param {string} voucherId */
export function getVoucherDefOrNull(voucherId) {
  return VOUCHERS_BY_ID.get(String(voucherId ?? "")) ?? null;
}

/** 场记板券：Boss 关离开商店前的单次重掷费用 */
export const BOSS_BLIND_REROLL_COST_DOLLARS = 10;

/** @param {Iterable<string>} owned */
export function hasBossBlindRerollVoucher(owned) {
  return has(owned, "v_director_1") || has(owned, "v_director_2");
}

/** @param {Iterable<string>} owned */
export function hasUnlimitedBossBlindRerolls(owned) {
  return has(owned, "v_director_2");
}

/**
 * @param {Iterable<string>} owned
 * @param {number} rerollsUsed 本场 Boss 入场预览中已付费重掷次数
 * @returns {number | null} 剩余次数；`null` 表示无限
 */
export function getBossBlindRerollsRemaining(owned, rerollsUsed) {
  if (hasUnlimitedBossBlindRerolls(owned)) return null;
  if (!has(owned, "v_director_1")) return 0;
  const used = Math.max(0, Math.floor(Number(rerollsUsed) || 0));
  return Math.max(0, 1 - used);
}

/**
 * @param {Iterable<string>} owned
 * @param {number} rerollsUsed
 * @param {number} money
 */
export function canPayBossBlindReroll(owned, rerollsUsed, money) {
  const remaining = getBossBlindRerollsRemaining(owned, rerollsUsed);
  if (remaining !== null && remaining <= 0) return false;
  return Math.floor(Number(money) || 0) >= BOSS_BLIND_REROLL_COST_DOLLARS;
}
