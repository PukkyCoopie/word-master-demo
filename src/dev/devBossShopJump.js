import { BOSS_BY_SLUG } from "../game/bossBlindDefinitions.js";
import { getRunLevelIndexForId } from "../levelDefinitions.js";
import { parseMajorFromLevelId } from "../vouchers/voucherRuntime.js";

/** @returns {{ value: string, label: string, description: string }[]} */
export function buildDevBossJumpSelectOptions() {
  return Object.values(BOSS_BY_SLUG)
    .filter((b) => b.kind !== "disabled")
    .map((b) => ({
      value: b.slug,
      label: b.nameZh,
      description: String(b.uiDescription ?? "").trim(),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "zh"));
}

/**
 * 解析「Boss 前商店」目标：当前关为 x-2，离店后进 x-3。
 * @param {string} [levelInputRaw] 章号（如 `2`、`8`）或关卡 id（如 `3-2`、`5-3`）；空为第 1 章
 * @returns {{ preLevelId: string, preLevelIndex: number, bossLevelId: string, chapter: number } | null}
 */
export function resolveDevBossShopJumpTarget(levelInputRaw) {
  const raw = String(levelInputRaw ?? "").trim();
  let chapter = 1;
  if (raw) {
    if (/^\d+$/.test(raw)) {
      chapter = Math.max(1, Math.floor(Number(raw)));
    } else if (getRunLevelIndexForId(raw) != null) {
      chapter = Math.max(1, parseMajorFromLevelId(raw));
    } else {
      return null;
    }
  }
  const preLevelId = `${chapter}-2`;
  const bossLevelId = `${chapter}-3`;
  const preLevelIndex = getRunLevelIndexForId(preLevelId);
  if (preLevelIndex == null) return null;
  return { preLevelId, preLevelIndex, bossLevelId, chapter };
}

/**
 * @param {string} bossSlug
 * @returns {boolean}
 */
export function isValidDevBossJumpSlug(bossSlug) {
  const slug = String(bossSlug ?? "").trim();
  if (!slug) return false;
  const def = BOSS_BY_SLUG[slug];
  return def != null && def.kind !== "disabled";
}
