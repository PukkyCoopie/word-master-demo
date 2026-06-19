import { RUN_START_LEVEL_INDEX } from "../levelDefinitions.js";

export const CERULEAN_BELL_DEV_QUERY = "ceruleanBell";
export const CERULEAN_BELL_BOSS_SLUG = "cerulean_bell";

/** 1-3 在 LEVELS 中的下标（RUN_START_LEVEL_INDEX 起为 1-1） */
export const CHAPTER_1_BOSS_LEVEL_INDEX = RUN_START_LEVEL_INDEX + 2;

/**
 * @param {() => number} [rng]
 */
export function isCeruleanBellDevScenario(rng) {
  void rng;
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(globalThis.location?.search ?? "").get("dev") === CERULEAN_BELL_DEV_QUERY;
}
