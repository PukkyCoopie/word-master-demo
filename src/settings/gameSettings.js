import { reactive } from "vue";

const STORAGE_KEY = "word_master_game_settings_v1";

export const UI_SCALE_MIN = 50;
export const UI_SCALE_MAX = 110;
export const UI_SCALE_DEFAULT = 100;

/** @type {{ allowSpellingAbbreviations: boolean; uiScalePercent: number }} */
export const gameSettings = reactive({
  allowSpellingAbbreviations: false,
  uiScalePercent: UI_SCALE_DEFAULT,
});

/**
 * @param {unknown} value
 * @returns {number}
 */
export function clampUiScalePercent(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return UI_SCALE_DEFAULT;
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, n));
}

export function loadGameSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed.allowSpellingAbbreviations === "boolean") {
      gameSettings.allowSpellingAbbreviations = parsed.allowSpellingAbbreviations;
    }
    if (parsed.uiScalePercent != null) {
      gameSettings.uiScalePercent = clampUiScalePercent(parsed.uiScalePercent);
    }
  } catch {
    /* 损坏或不可读时沿用默认 */
  }
}

export function persistGameSettings() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        allowSpellingAbbreviations: gameSettings.allowSpellingAbbreviations,
        uiScalePercent: gameSettings.uiScalePercent,
      }),
    );
  } catch {
    /* 隐私模式等 */
  }
}

export function getAllowSpellingAbbreviations() {
  return gameSettings.allowSpellingAbbreviations === true;
}

/**
 * @param {boolean} enabled
 */
export function setAllowSpellingAbbreviations(enabled) {
  gameSettings.allowSpellingAbbreviations = Boolean(enabled);
  persistGameSettings();
}

/**
 * @param {unknown} percent
 */
export function setUiScalePercent(percent) {
  gameSettings.uiScalePercent = clampUiScalePercent(percent);
  persistGameSettings();
}

loadGameSettings();
