import { Capacitor } from "@capacitor/core";
import { ACHIEVEMENT_DEFINITIONS } from "./achievementDefinitions.js";
import { isAchievementUnlocked } from "./achievementCareer.js";
import { getAchievementCollectionProgress } from "./achievementCollectionProgress.js";
import { shouldSuppressAchievementsAndLeaderboardsInDevMode } from "../dev/developerMode.js";
import { TapTap } from "../taptap/tapTapPlugin.js";

/** @typedef {import('./achievementTypes.js').AchievementDefinition} AchievementDefinition */

/** 收藏页可显示进度、且可向 TapTap 上报分步增量的成就（不含 all_* 收集类）。 */
const TAPTAP_INCREMENT_CONDITION_KINDS = new Set([
  "career_words",
  "career_tiles_used",
  "career_tiles_discarded",
]);

let toastDisabled = false;
/** @type {string | null} */
let bootstrappedUnionId = null;

/**
 * @param {AchievementDefinition | null | undefined} def
 * @returns {boolean}
 */
export function shouldReportTapTapIncrement(def) {
  if (!def?.condition) return false;
  if (String(def.id).startsWith("all_")) return false;
  return TAPTAP_INCREMENT_CONDITION_KINDS.has(def.condition.kind);
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | Record<string, unknown>} career
 * @param {AchievementDefinition} def
 * @returns {number}
 */
export function resolveTapTapIncrementCurrent(career, def) {
  const progress = getAchievementCollectionProgress(career, def);
  return Math.max(0, Math.floor(Number(progress?.current) || 0));
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 */
function ensureTapTapReportedStepsMap(career) {
  if (!career.taptapReportedAchievementSteps || typeof career.taptapReportedAchievementSteps !== "object") {
    career.taptapReportedAchievementSteps = {};
  }
}

/**
 * 将生涯内分步成就进度增量同步到 TapTap（all_* 等仅解锁时上报，不走此路径）。
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 */
export function syncTapTapIncrementProgressInCareer(career) {
  if (shouldSuppressAchievementsAndLeaderboardsInDevMode()) return;
  if (!Capacitor.isNativePlatform()) return;

  ensureTapTapReportedStepsMap(career);

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (!shouldReportTapTapIncrement(def)) continue;
    if (isAchievementUnlocked(career, def.id)) continue;

    const current = resolveTapTapIncrementCurrent(career, def);
    const prev = Math.max(0, Math.floor(Number(career.taptapReportedAchievementSteps[def.id]) || 0));
    const delta = current - prev;
    if (delta <= 0) continue;

    career.taptapReportedAchievementSteps[def.id] = current;
    void TapTap.incrementAchievement({ achievementId: def.id, steps: delta }).catch(() => {});
  }
}

/**
 * @param {readonly AchievementDefinition[]} defs
 */
export async function reportTapTapAchievementUnlocks(defs) {
  if (shouldSuppressAchievementsAndLeaderboardsInDevMode()) return;
  if (!Capacitor.isNativePlatform() || !defs?.length) return;

  await ensureTapTapAchievementToastDisabled();

  for (const def of defs) {
    if (!def?.id) continue;
    try {
      await TapTap.unlockAchievement({ achievementId: def.id });
    } catch {
      /* 未登录或后台未配置时忽略，避免阻断游戏 */
    }
  }
}

async function ensureTapTapAchievementToastDisabled() {
  if (toastDisabled) return;
  try {
    await TapTap.setAchievementToastEnabled({ enabled: false });
    toastDisabled = true;
  } catch {
    /* ignore */
  }
}

/**
 * TapTap 登录就绪后：关闭 SDK 气泡、补报各槽位已解锁成就、同步当前槽位分步进度。
 * @param {string} unionId
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} activeCareer
 * @param {Iterable<string>} [unlockedAchievementIds] 各存档槽位已解锁成就 id 合集
 */
export async function bootstrapTapTapAchievements(unionId, activeCareer, unlockedAchievementIds = []) {
  if (shouldSuppressAchievementsAndLeaderboardsInDevMode()) return;
  if (!Capacitor.isNativePlatform()) return;
  const uid = String(unionId ?? "").trim();
  if (!uid) return;

  await ensureTapTapAchievementToastDisabled();

  const shouldFullUnlockBootstrap = bootstrappedUnionId !== uid;
  if (shouldFullUnlockBootstrap) {
    bootstrappedUnionId = uid;
    for (const achievementId of unlockedAchievementIds) {
      try {
        await TapTap.unlockAchievement({ achievementId });
      } catch {
        /* ignore */
      }
    }
  }

  syncTapTapIncrementProgressInCareer(activeCareer);
}

/** 切换账号时允许重新 bootstrap。 */
export function resetTapTapAchievementBootstrap() {
  bootstrappedUnionId = null;
  toastDisabled = false;
}
