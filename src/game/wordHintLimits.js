import { getRunPresetDef } from "./runPresetDefinitions.js";

/** 每小关提示次数基础上限（不含预设加成） */
export const BASE_HINT_MAX_PER_LEVEL = 1;

/**
 * @param {string | null | undefined} presetId
 * @returns {number}
 */
export function resolveHintMaxPerLevel(presetId) {
  const delta = Math.floor(Number(getRunPresetDef(presetId).effects?.hintsPerLevelDelta) || 0);
  return Math.max(0, BASE_HINT_MAX_PER_LEVEL + delta);
}
