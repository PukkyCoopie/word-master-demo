import { ref } from "vue";

/** 本会话是否已开启开发者模式（版本号连点 5 次）。 */
export const developerModeEnabled = ref(false);

export function enableDeveloperMode() {
  developerModeEnabled.value = true;
}

/** @returns {boolean} */
export function isDeveloperModeEnabled() {
  return developerModeEnabled.value;
}

/**
 * 开发者模式下抑制：本地成就解锁、TapTap 成就同步/解锁、TapTap 排行榜上报。
 * 生涯其它统计（词数、收藏等）仍照常写入。
 * @returns {boolean}
 */
export function shouldSuppressAchievementsAndLeaderboardsInDevMode() {
  return developerModeEnabled.value;
}
