import { reactive } from "vue";

const STORAGE_KEY = "word_master_game_settings_v1";

export const UI_SCALE_MIN = 50;
export const UI_SCALE_MAX = 110;
export const UI_SCALE_DEFAULT = 100;

/** @typedef {'bottom8' | 'top8' | 'random8' | 'all' | 'hidden'} SwapButtonMode */

/** @type {readonly { id: SwapButtonMode; label: string }[]} */
export const SWAP_BUTTON_MODE_OPTIONS = [
  { id: "bottom8", label: "最下面8个" },
  { id: "top8", label: "最上面8个" },
  { id: "random8", label: "随机8个" },
  { id: "all", label: "对调全部" },
  { id: "hidden", label: "不显示" },
];

const SWAP_BUTTON_MODE_IDS = new Set(SWAP_BUTTON_MODE_OPTIONS.map((o) => o.id));

/** bottom8 / top8 / random8：从棋盘补选的上限（与模式名一致，不随当前拼词长度变化） */
export const SWAP_FROM_GRID_PICK_LIMIT = 8;

/** @param {unknown} value @returns {SwapButtonMode} */
export function normalizeSwapButtonMode(value) {
  const s = String(value ?? "");
  return SWAP_BUTTON_MODE_IDS.has(/** @type {SwapButtonMode} */ (s))
    ? /** @type {SwapButtonMode} */ (s)
    : "bottom8";
}

/** @type {{ allowSpellingAbbreviations: boolean; uiScalePercent: number; swapButtonMode: SwapButtonMode; markOnSwap: boolean }} */
export const gameSettings = reactive({
  allowSpellingAbbreviations: false,
  uiScalePercent: UI_SCALE_DEFAULT,
  swapButtonMode: "bottom8",
  markOnSwap: true,
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
    if (parsed.swapButtonMode != null) {
      gameSettings.swapButtonMode = normalizeSwapButtonMode(parsed.swapButtonMode);
    }
    if (typeof parsed.markOnSwap === "boolean") {
      gameSettings.markOnSwap = parsed.markOnSwap;
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
        swapButtonMode: gameSettings.swapButtonMode,
        markOnSwap: gameSettings.markOnSwap,
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

export function getSwapButtonMode() {
  return normalizeSwapButtonMode(gameSettings.swapButtonMode);
}

/** @returns {number | null} 从棋盘补选数量；`all` 为 null（全选未在拼词中的格） */
export function getSwapGridPickCount() {
  const mode = getSwapButtonMode();
  if (mode === "all") return null;
  if (mode === "bottom8" || mode === "top8" || mode === "random8") {
    return SWAP_FROM_GRID_PICK_LIMIT;
  }
  return null;
}

/** @returns {boolean} */
export function getMarkOnSwap() {
  return gameSettings.markOnSwap !== false;
}

/** @param {SwapButtonMode} mode */
export function setSwapButtonMode(mode) {
  gameSettings.swapButtonMode = normalizeSwapButtonMode(mode);
  persistGameSettings();
}

/** @param {number} delta -1 上一项，+1 下一项 */
export function stepSwapButtonMode(delta) {
  const modes = SWAP_BUTTON_MODE_OPTIONS.map((o) => o.id);
  const cur = getSwapButtonMode();
  const idx = modes.indexOf(cur);
  const base = idx >= 0 ? idx : 0;
  const next = (base + delta + modes.length) % modes.length;
  setSwapButtonMode(modes[next]);
}

/**
 * @param {boolean} enabled
 */
export function setMarkOnSwap(enabled) {
  gameSettings.markOnSwap = Boolean(enabled);
  persistGameSettings();
}

loadGameSettings();
