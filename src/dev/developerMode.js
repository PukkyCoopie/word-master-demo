import { ref } from "vue";
import { getDevSuppressAchievementsAndLeaderboards } from "../settings/gameSettings.js";

const STORAGE_KEY = "word_master_developer_mode_v1";

/** @returns {boolean} */
function readStoredDeveloperMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** @param {boolean} enabled */
function persistDeveloperMode(enabled) {
  try {
    if (enabled) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 隐私模式等环境下忽略 */
  }
}

/** 是否已开启开发者模式（版本号连点 5 次切换；刷新后仍保留）。 */
export const developerModeEnabled = ref(readStoredDeveloperMode());

/** @param {boolean} enabled */
export function setDeveloperModeEnabled(enabled) {
  const next = enabled === true;
  developerModeEnabled.value = next;
  persistDeveloperMode(next);
}

export function enableDeveloperMode() {
  setDeveloperModeEnabled(true);
}

export function disableDeveloperMode() {
  setDeveloperModeEnabled(false);
}

/** @returns {boolean} 切换后的状态 */
export function toggleDeveloperMode() {
  setDeveloperModeEnabled(!developerModeEnabled.value);
  return developerModeEnabled.value;
}

/** @returns {boolean} */
export function isDeveloperModeEnabled() {
  return developerModeEnabled.value;
}

/**
 * 开发者模式下抑制：本地成就解锁、TapTap 成就同步/解锁、TapTap 排行榜上报。
 * 可在设置 → 开发者 中关闭「抑制成就与排行榜」以在开发者模式下仍正常解锁。
 * 生涯其它统计（词数、收藏等）仍照常写入。
 * @returns {boolean}
 */
export function shouldSuppressAchievementsAndLeaderboardsInDevMode() {
  if (!developerModeEnabled.value) return false;
  return getDevSuppressAchievementsAndLeaderboards();
}
