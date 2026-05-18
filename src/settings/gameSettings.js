import { reactive } from "vue";

const STORAGE_KEY = "word_master_game_settings_v1";

/** @type {{ allowSpellingAbbreviations: boolean }} */
export const gameSettings = reactive({
  allowSpellingAbbreviations: false,
});

export function loadGameSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed.allowSpellingAbbreviations === "boolean") {
      gameSettings.allowSpellingAbbreviations = parsed.allowSpellingAbbreviations;
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

loadGameSettings();
