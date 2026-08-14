import { Capacitor } from "@capacitor/core";
import { ACHIEVEMENT_DEFINITIONS } from "./achievementDefinitions.js";
import { isAchievementUnlocked } from "./achievementCareer.js";
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
 * 分步成就目标步数（与 TapTap 后台配置一致，取 condition.threshold）。
 * @param {AchievementDefinition | null | undefined} def
 * @returns {number}
 */
export function resolveTapTapIncrementTarget(def) {
  if (!shouldReportTapTapIncrement(def)) return 0;
  return Math.max(0, Math.floor(Number(def?.condition?.threshold) || 0));
}

/**
 * 生涯计数对应的当前步数（已解锁时仍返回真实进度，便于补报到阈值）。
 * 不依赖 getAchievementCollectionProgress（后者在已解锁时返回 null）。
 *
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | Record<string, unknown>} career
 * @param {AchievementDefinition} def
 * @returns {number}
 */
export function resolveTapTapIncrementCurrent(career, def) {
  const target = resolveTapTapIncrementTarget(def);
  if (target <= 0) return 0;

  const kind = def.condition?.kind;
  let raw = 0;
  if (kind === "career_words") {
    raw = Math.max(0, Math.floor(Number(career?.totalWordsSubmitted) || 0));
  } else if (kind === "career_tiles_used") {
    raw = Math.max(0, Math.floor(Number(career?.totalLettersUsed) || 0));
  } else if (kind === "career_tiles_discarded") {
    raw = Math.max(0, Math.floor(Number(career?.totalLettersDiscarded) || 0));
  } else {
    return 0;
  }
  return Math.min(raw, target);
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
 * 将生涯内分步成就进度增量同步到 TapTap。
 * 已解锁但仍未报到阈值的成就也会补报（局内达门槛时曾只调 unlock、跳过 increment 的历史缺口）。
 *
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 */
export function syncTapTapIncrementProgressInCareer(career) {
  if (shouldSuppressAchievementsAndLeaderboardsInDevMode()) return;
  if (!Capacitor.isNativePlatform()) return;

  ensureTapTapReportedStepsMap(career);

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (!shouldReportTapTapIncrement(def)) continue;

    const target = resolveTapTapIncrementTarget(def);
    if (target <= 0) continue;

    const current = resolveTapTapIncrementCurrent(career, def);
    /** 已解锁但生涯计数仍低于阈值时，直接补报到阈值（局内用 runMatchStats 达门槛的补偿）。 */
    const reportTo =
      isAchievementUnlocked(career, def.id) && current < target ? target : current;
    const prev = Math.max(0, Math.floor(Number(career.taptapReportedAchievementSteps[def.id]) || 0));
    const delta = reportTo - prev;
    if (delta <= 0) continue;

    career.taptapReportedAchievementSteps[def.id] = reportTo;
    void TapTap.incrementAchievement({ achievementId: def.id, steps: delta }).catch(() => {});
  }
}

/**
 * 解锁上报前：对分步成就先把 TapTap 步数补到阈值，再 unlock。
 * （TapTap 分步成就仅调 unlock、未够步数时后台往往不记达成。）
 *
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 * @param {AchievementDefinition} def
 */
async function catchUpTapTapIncrementBeforeUnlock(career, def) {
  if (!career || !shouldReportTapTapIncrement(def)) return;
  ensureTapTapReportedStepsMap(career);
  const target = resolveTapTapIncrementTarget(def);
  if (target <= 0) return;
  const prev = Math.max(0, Math.floor(Number(career.taptapReportedAchievementSteps[def.id]) || 0));
  const delta = target - prev;
  if (delta <= 0) return;
  career.taptapReportedAchievementSteps[def.id] = target;
  try {
    await TapTap.incrementAchievement({ achievementId: def.id, steps: delta });
  } catch {
    /* ignore */
  }
}

/**
 * @param {readonly AchievementDefinition[]} defs
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} [career]
 */
export async function reportTapTapAchievementUnlocks(defs, career = null) {
  if (shouldSuppressAchievementsAndLeaderboardsInDevMode()) return;
  if (!Capacitor.isNativePlatform() || !defs?.length) return;

  await ensureTapTapAchievementToastDisabled();

  for (const def of defs) {
    if (!def?.id) continue;
    try {
      await catchUpTapTapIncrementBeforeUnlock(career, def);
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
    /** @type {AchievementDefinition[]} */
    const defsToUnlock = [];
    for (const achievementId of unlockedAchievementIds) {
      const id = String(achievementId ?? "").trim();
      if (!id) continue;
      const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id);
      if (def) defsToUnlock.push(def);
      else {
        try {
          await TapTap.unlockAchievement({ achievementId: id });
        } catch {
          /* ignore */
        }
      }
    }
    await reportTapTapAchievementUnlocks(defsToUnlock, activeCareer);
  }

  syncTapTapIncrementProgressInCareer(activeCareer);
}

/** 切换账号时允许重新 bootstrap。 */
export function resetTapTapAchievementBootstrap() {
  bootstrappedUnionId = null;
  toastDisabled = false;
}
