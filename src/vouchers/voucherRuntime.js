import { getRunLevelAtIndex, getRunLevelIndexForId, LEVELS } from "../levelDefinitions.js";
import { getLengthUpgradeLookupKey, normalizeJudgedWordLength } from "../game/wordLengthBalance.js";
import { canAffordWallet } from "../treasures/treasureWalletFloor.js";
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

/** 细针 Boss：本关固定 1 次拼词，覆盖预设/券/宝藏的额外次数。 */
export function getSubmitHandsForNeedleBoss(_baseHandsFromVouchers) {
  return 1;
}

/** 细针 Boss 本关拼词次数上限（与 `getSubmitHandsForNeedleBoss` 一致）。 */
export function getNeedleBossSubmitHandsCap() {
  return 1;
}

/**
 * 细针 Boss 优先：本关 `remainingWords` 不得超过 1（含宝藏/法术中途加成）。
 * @param {number} count
 * @param {string} bossSlug
 */
export function clampRemainingWordsForBossMechanics(count, bossSlug) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (String(bossSlug ?? "") !== "the_needle") return n;
  return Math.min(getNeedleBossSubmitHandsCap(), n);
}

/** 死水 Boss：本关固定 0 次丢弃，覆盖预设/券/宝藏的额外次数。 */
export function getRemovalsForWaterBoss(_baseRemovalsFromVouchers) {
  return 0;
}

/** 死水 Boss 本关丢弃次数上限（与 `getRemovalsForWaterBoss` 一致）。 */
export function getWaterBossRemovalsCap() {
  return 0;
}

/**
 * 死水 Boss 优先：本关 `remainingRemovals` 不得超过 0（含宝藏/法术中途加成）。
 * @param {number} count
 * @param {string} bossSlug
 */
export function clampRemainingRemovalsForBossMechanics(count, bossSlug) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (String(bossSlug ?? "") !== "the_water") return n;
  return Math.min(getWaterBossRemovalsCap(), n);
}

/** @param {Iterable<string>} owned */
export function getBaseHandsPerLevel(owned) {
  let n = 3;
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
 * 与 `getLengthMultiplier` 内对词长的处理一致：用于「实际字母数 + 判定加成」后的等效词长（下限 3，可超过 16）。
 * @param {number} wordLetterCount 单词实际字母数（`Qu` 块计 2，非棋盘格数）
 * @param {number} judgmentBonus 优惠券等给出的非负整数加成
 */
export function getLengthTableLenFromTileCountAndBonus(wordLetterCount, judgmentBonus) {
  const t = Math.max(0, Math.round(Number(wordLetterCount)) || 0);
  const b = Math.floor(Number(judgmentBonus) || 0);
  return normalizeJudgedWordLength(t + b);
}

/**
 * @param {number} wordLetterCount 单词实际字母数
 * @param {Iterable<string>} owned
 */
export function getJudgedLengthTableLenForOwnedVouchers(wordLetterCount, owned) {
  return getLengthTableLenFromTileCountAndBonus(wordLetterCount, getWordLengthJudgmentBonus(owned));
}

/**
 * 在券加成判定词长后再施加整局减益（如幻灵烛台 -1 长度）。
 * @param {number} wordLetterCount
 * @param {Iterable<string>} owned
 * @param {number} [extraPenalty=0]
 */
export function getJudgedLengthTableLenWithPenalty(wordLetterCount, owned, extraPenalty = 0) {
  const p = Math.max(0, Math.floor(Number(extraPenalty) || 0));
  const bonus = getWordLengthJudgmentBonus(owned) - p;
  return getLengthTableLenFromTileCountAndBonus(wordLetterCount, bonus);
}

/** @param {Iterable<string>} owned */
export function getBaseRemovalsPerLevel(owned) {
  let n = 3;
  if (has(owned, "v_wasteful_2")) n += 2;
  else if (has(owned, "v_wasteful_1")) n += 1;
  if (has(owned, "v_glyph_2")) n -= 1;
  return Math.max(1, n);
}

/** 空白格·二级：宝藏栏额外格数 */
export function getOwnedTreasureSlotBonusFromVouchers(owned) {
  return has(owned, "v_blank_2") ? 1 : 0;
}

/** 无尽模式起始大关（通关 8-3 后进入 9-1） */
export const ENDLESS_RUN_START_CHAPTER = 9;

/**
 * 卷轴券购买后跳转的关卡索引：相对「商店离开后即将进入的下一小关」回退 1 个大关，保留小关号。
 * 例：刚通关 2-2 进店时下一关本为 2-3，购买卷轴后变为 1-3；通关 1-1 后下一关为 1-2，购买卷轴后变为 0-2（Ante 0 章底 100）。
 * 无尽模式下同样回退 1 大关，但不低于 9 章；且支持 `levelIndex` 超过标准流程终局下标。
 * @param {number} currentLevelIndex 当前关卡下标（通常为刚通关、尚未 +1 的关卡）
 * @param {{ isEndlessRun?: boolean }} [opts]
 * @returns {number | null}
 */
export function getGlyphPurchaseTargetLevelIndex(currentLevelIndex, opts = {}) {
  const isEndlessRun = opts.isEndlessRun === true;
  const ix0 = Math.max(0, Math.floor(Number(currentLevelIndex) || 0));
  const upcoming = getRunLevelAtIndex(ix0 + 1);
  if (!upcoming?.id) return null;
  const major = parseMajorFromLevelId(upcoming.id);
  const minor = parseLevelSubFromId(upcoming.id);
  const targetMajor = major - 1;
  if (targetMajor < 0) return null;
  if (isEndlessRun && targetMajor < ENDLESS_RUN_START_CHAPTER) return null;
  const tix = getRunLevelIndexForId(`${targetMajor}-${minor}`);
  return tix != null && tix >= 0 ? tix : null;
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
 * 望远镜：最常拼写判定词长映射到商店可升级槽位（3–16）。
 * 判定词长 > 16 时归入 16 槽位（对应「11+字母」升级组）。
 * @param {number} judgedLen
 * @returns {number} 0 表示无效
 */
export function getTelescopeLengthUpgradeSlot(judgedLen) {
  const raw = Math.max(0, Math.round(Number(judgedLen)) || 0);
  if (raw < 3) return 0;
  return getLengthUpgradeLookupKey(normalizeJudgedWordLength(raw));
}

/**
 * 望远镜二级：本次升级是否对该词长应用 1.5 倍升级步（分数/倍率增量向下取整）。
 * @param {Iterable<string>} owned
 * @param {number} len 判定词长（可超过 16）
 * @param {Record<string, number> | null | undefined} spellCountsByLength
 */
export function isLengthObservatoryBoosted(owned, len, spellCountsByLength) {
  if (!hasObservatoryVoucher(owned)) return false;
  const mostSlot = getTelescopeLengthUpgradeSlot(getMostPlayedWordLength(spellCountsByLength));
  if (mostSlot < 3) return false;
  const slot = getTelescopeLengthUpgradeSlot(len);
  return slot >= 3 && slot === mostSlot;
}

/**
 * 望远镜一级：最常拼写长度对应的商店词长升级组 key（如 `len11_plus`）。
 * @param {number} mostPlayedLen
 * @param {readonly { key: string, minLen: number, maxLen: number }[]} lengthGroups
 * @returns {string | null}
 */
export function resolveTelescopeLengthUpgradeGroupKey(mostPlayedLen, lengthGroups) {
  const slotLen = getTelescopeLengthUpgradeSlot(mostPlayedLen);
  if (slotLen < 3) return null;
  const g = lengthGroups.find((x) => slotLen >= x.minLen && slotLen <= x.maxLen);
  return g?.key ?? null;
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
 * @param {number} [walletFloor]
 */
export function canPayBossBlindReroll(owned, rerollsUsed, money, walletFloor = 0) {
  const remaining = getBossBlindRerollsRemaining(owned, rerollsUsed);
  if (remaining !== null && remaining <= 0) return false;
  return canAffordWallet(money, BOSS_BLIND_REROLL_COST_DOLLARS, walletFloor);
}
