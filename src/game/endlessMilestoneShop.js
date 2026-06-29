import { parseLevelSubFromId, parseMajorFromLevelId } from "../vouchers/voucherRuntime.js";

/** 无尽里程碑 Boss 章间隔：8-3、16-3、24-3… 后的首次进店 */
export const ENDLESS_MILESTONE_BOSS_CHAPTER_INTERVAL = 8;

/**
 * 是否为无尽里程碑 Boss 小关（8-3、16-3、24-3…）。
 * @param {string | null | undefined} levelId
 */
export function isEndlessMilestoneBossShopLevel(levelId) {
  if (parseLevelSubFromId(levelId) !== 3) return false;
  const chapter = parseMajorFromLevelId(levelId);
  return (
    chapter >= ENDLESS_MILESTONE_BOSS_CHAPTER_INTERVAL &&
    chapter % ENDLESS_MILESTONE_BOSS_CHAPTER_INTERVAL === 0
  );
}

/**
 * 通关该 Boss 小关后首次进店：单卡区保底 1 个传说宝藏。
 * @param {{ isEndlessRun?: boolean, completedLevelId?: string | null }} opts
 */
export function shouldGuaranteeEndlessMilestoneLegendaryShop(opts = {}) {
  if (opts.isEndlessRun !== true) return false;
  return isEndlessMilestoneBossShopLevel(opts.completedLevelId);
}
