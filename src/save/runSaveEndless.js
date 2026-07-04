import { STANDARD_RUN_FINAL_LEVEL_INDEX } from "../levelDefinitions.js";

/**
 * 从存档 payload 解析是否处于无尽模式（兼容缺字段的旧档：关卡下标已超过标准终局）。
 * @param {import('./runSavePayload.js').RunSavePayload | null | undefined} payload
 */
export function resolveSavedIsEndlessRun(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.isEndlessRun === true) return true;
  const levelIndex = Math.max(0, Math.floor(Number(payload.levelIndex) || 0));
  return levelIndex > STANDARD_RUN_FINAL_LEVEL_INDEX;
}
