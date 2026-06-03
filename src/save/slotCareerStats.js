import { createEmptySlotCareerStats } from "./runSaveSchema.js";
import { normalizeCollectionCareerFields } from "../collection/collectionCareer.js";
import { normalizeAchievementCareerFields } from "../achievements/achievementCareer.js";
import { formatCollectionUnlockProgressDisplay } from "../collection/collectionProgress.js";

/**
 * @param {unknown} raw
 * @returns {import('./runSaveSchema.js').SlotCareerStats}
 */
export function normalizeSlotCareerStats(raw) {
  const base = createEmptySlotCareerStats();
  if (!raw || typeof raw !== "object") return base;
  const o = /** @type {Record<string, unknown>} */ (raw);
  /** @type {import('./runSaveSchema.js').SlotCareerStats} */
  const career = {
    ...base,
    runsStarted: Math.max(0, Math.floor(Number(o.runsStarted) || 0)),
    runsCompleted: Math.max(0, Math.floor(Number(o.runsCompleted) || 0)),
    runsWon: Math.max(0, Math.floor(Number(o.runsWon) || 0)),
    bestWord: String(o.bestWord ?? ""),
    bestWordScore: Math.max(0, Math.floor(Number(o.bestWordScore) || 0)),
    totalLettersUsed: Math.max(0, Math.floor(Number(o.totalLettersUsed) || 0)),
    totalLettersDiscarded: Math.max(0, Math.floor(Number(o.totalLettersDiscarded) || 0)),
    totalShopPurchases: Math.max(0, Math.floor(Number(o.totalShopPurchases) || 0)),
    totalRerolls: Math.max(0, Math.floor(Number(o.totalRerolls) || 0)),
    lastRunEndedAt:
      o.lastRunEndedAt != null && Number.isFinite(Number(o.lastRunEndedAt))
        ? Math.floor(Number(o.lastRunEndedAt))
        : null,
    presetsWonWith: Array.isArray(o.presetsWonWith)
      ? o.presetsWonWith.map(String).filter(Boolean)
      : [],
    lastSelectedPresetId: typeof o.lastSelectedPresetId === "string" ? o.lastSelectedPresetId : "",
    highestDifficultyBeaten: Number.isFinite(Number(o.highestDifficultyBeaten))
      ? Math.max(-1, Math.min(7, Math.floor(Number(o.highestDifficultyBeaten))))
      : -1,
    presetHighestDifficultyWon:
      o.presetHighestDifficultyWon && typeof o.presetHighestDifficultyWon === "object"
        ? Object.fromEntries(
            Object.entries(/** @type {Record<string, unknown>} */ (o.presetHighestDifficultyWon)).map(
              ([k, v]) => [String(k), Math.max(-1, Math.min(7, Math.floor(Number(v) || 0)))],
            ),
          )
        : {},
    lastSelectedDifficultyIndex: Number.isFinite(Number(o.lastSelectedDifficultyIndex))
      ? Math.max(0, Math.min(7, Math.floor(Number(o.lastSelectedDifficultyIndex))))
      : 0,
  };
  normalizeCollectionCareerFields(career, o);
  normalizeAchievementCareerFields(career, o);
  return career;
}

/**
 * @param {import('./runSaveSchema.js').SlotCareerStats} career
 * @param {import('../game/runMatchStats.js').RunMatchStats} runStats
 * @param {'win' | 'fail'} outcome
 */
export function mergeRunMatchStatsIntoCareer(career, runStats, outcome) {
  career.runsCompleted += 1;
  if (outcome === "win") career.runsWon += 1;
  career.totalLettersUsed += Math.max(0, Math.floor(Number(runStats.lettersUsed) || 0));
  career.totalLettersDiscarded += Math.max(0, Math.floor(Number(runStats.lettersDiscarded) || 0));
  career.totalWordsSubmitted =
    Math.max(0, Math.floor(Number(career.totalWordsSubmitted) || 0)) +
    Math.max(0, Math.floor(Number(runStats.wordsSubmitted) || 0));
  career.totalShopPurchases += Math.max(0, Math.floor(Number(runStats.shopPurchases) || 0));
  career.totalRerolls += Math.max(0, Math.floor(Number(runStats.rerolls) || 0));
  const sc = Math.max(0, Math.floor(Number(runStats.bestWordScore) || 0));
  const w = String(runStats.bestWord ?? "").trim();
  if (w && sc >= career.bestWordScore) {
    career.bestWord = w;
    career.bestWordScore = sc;
  }
  career.lastRunEndedAt = Date.now();
}

/** @param {import('./runSaveSchema.js').SlotCareerStats} career */
export function recordCareerRunStarted(career) {
  career.runsStarted += 1;
}

/**
 * @param {import('./runSaveSchema.js').SlotCareerStats} career
 * @returns {{ label: string, value: string }[]}
 */
export function getSlotCareerStatRows(career) {
  const c = normalizeSlotCareerStats(career);
  const best = c.bestWord
    ? `${c.bestWord.toUpperCase()}（${c.bestWordScore.toLocaleString("zh-CN")}）`
    : "—";
  return [
    { label: "开局次数", value: String(c.runsStarted) },
    { label: "胜利局数", value: String(c.runsWon) },
    { label: "历史最佳单词", value: best },
    { label: "累计拼词", value: c.totalLettersUsed > 0 ? String(c.totalLettersUsed) : "—" },
    { label: "累计弃牌", value: c.totalLettersDiscarded > 0 ? String(c.totalLettersDiscarded) : "—" },
    { label: "累计购物", value: c.totalShopPurchases > 0 ? String(c.totalShopPurchases) : "—" },
    { label: "累计重掷", value: c.totalRerolls > 0 ? String(c.totalRerolls) : "—" },
    { label: "收藏解锁进度", value: formatCollectionUnlockProgressDisplay(c) },
  ];
}

/** 该栏位是否曾完整结束过至少一局（胜利或失败均计入 runsCompleted） */
export function hasSlotCompletedAnyRun(career) {
  return normalizeSlotCareerStats(career).runsCompleted > 0;
}

/** 存档栏位卡片摘要：仅开局次数与胜利局数 */
export function getSlotCareerSummaryRows(career) {
  const c = normalizeSlotCareerStats(career);
  return [
    { label: "开局次数", value: String(c.runsStarted) },
    { label: "胜利局数", value: String(c.runsWon) },
  ];
}
