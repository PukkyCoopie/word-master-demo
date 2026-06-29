import { reactive } from "vue";
import { inferDefaultDisplayLayoutMode } from "../composables/viewportSize.js";
import { RUN_SAVES_STORAGE_KEY } from "../save/runSaveSchema.js";

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
    : "hidden";
}

/** @returns {boolean} 是否已有生涯/局内存档（用于拼词辅助设置迁移） */
function hasExistingPlayerSaveData() {
  try {
    const raw = localStorage.getItem(RUN_SAVES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const slots = Array.isArray(parsed?.slots) ? parsed.slots : [];
      for (const slot of slots) {
        if (!slot) continue;
        if (slot.payload) return true;
        const runs = Math.floor(Number(slot.career?.runsStarted) || 0);
        if (runs > 0) return true;
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const settingsRaw = localStorage.getItem(STORAGE_KEY);
    if (settingsRaw) {
      const parsed = JSON.parse(settingsRaw);
      if (parsed && typeof parsed === "object") return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** 拼词辅助三项：老玩家默认开启标记、对调最下 8 格、对调时标记 */
function applyLegacyWordAuxDefaults() {
  gameSettings.markButtonEnabled = true;
  gameSettings.swapButtonMode = "bottom8";
  gameSettings.markOnSwap = true;
}

/** 拼词辅助三项：新玩家默认开启标记、不显示对调、对调时不标记 */
function applyNewPlayerWordAuxDefaults() {
  gameSettings.markButtonEnabled = true;
  gameSettings.swapButtonMode = "hidden";
  gameSettings.markOnSwap = false;
}

/** @typedef {'slow' | 'normal' | 'fast'} AnimationSpeedTier */

/** @typedef {'centered' | 'borderless'} DisplayLayoutMode */

/** @type {readonly { id: DisplayLayoutMode; label: string }[]} */
export const DISPLAY_LAYOUT_MODE_OPTIONS = [
  { id: "centered", label: "有边框" },
  { id: "borderless", label: "无边框" },
];

const ANIMATION_SPEED_TIER_IDS = new Set(["slow", "normal", "fast"]);

/** @param {unknown} value @returns {AnimationSpeedTier} */
export function normalizeAnimationSpeedTier(value) {
  const s = String(value ?? "");
  return ANIMATION_SPEED_TIER_IDS.has(/** @type {AnimationSpeedTier} */ (s))
    ? /** @type {AnimationSpeedTier} */ (s)
    : "normal";
}

/** @param {unknown} value @returns {DisplayLayoutMode} */
export function normalizeDisplayLayoutMode(value) {
  const s = String(value ?? "");
  if (s === "centered" || s === "borderless") return s;
  return inferDefaultDisplayLayoutMode();
}

/** @typedef {'uppercase' | 'lowercase'} LetterCase */

/** @typedef {'qu' | 'q'} LetterQMode */

const LETTER_Q_MODE_IDS = new Set(["qu", "q"]);

/** @param {unknown} value @returns {LetterQMode} */
export function normalizeLetterQMode(value) {
  const s = String(value ?? "");
  return LETTER_Q_MODE_IDS.has(/** @type {LetterQMode} */ (s)) ? /** @type {LetterQMode} */ (s) : "qu";
}

const LETTER_CASE_IDS = new Set(["uppercase", "lowercase"]);

/** @param {unknown} value @returns {LetterCase} */
export function normalizeLetterCase(value) {
  const s = String(value ?? "");
  return LETTER_CASE_IDS.has(/** @type {LetterCase} */ (s)) ? /** @type {LetterCase} */ (s) : "uppercase";
}

/** @typedef {'off' | 'button' | 'definition'} WordDefinitionMode */

/** @type {readonly { id: WordDefinitionMode; label: string }[]} */
export const WORD_DEFINITION_MODE_OPTIONS = [
  { id: "off", label: "关闭" },
  { id: "button", label: "按钮" },
  { id: "definition", label: "释义" },
];

const WORD_DEFINITION_MODE_IDS = new Set(WORD_DEFINITION_MODE_OPTIONS.map((o) => o.id));

/** @param {unknown} value @returns {WordDefinitionMode} */
export function normalizeWordDefinitionMode(value) {
  const s = String(value ?? "");
  return WORD_DEFINITION_MODE_IDS.has(/** @type {WordDefinitionMode} */ (s))
    ? /** @type {WordDefinitionMode} */ (s)
    : "off";
}

/** 释义：老玩家未单独设置时沿用原默认「释义」 */
function applyLegacyWordDefinitionDefault() {
  gameSettings.wordDefinitionMode = "definition";
}

/** 释义：新玩家默认关闭 */
function applyNewPlayerWordDefinitionDefault() {
  gameSettings.wordDefinitionMode = "off";
}

/** @type {{ allowSpellingAbbreviations: boolean; uiScalePercent: number; markButtonEnabled: boolean; swapButtonMode: SwapButtonMode; markOnSwap: boolean; animationSpeedTier: AnimationSpeedTier; materialAnimationEnabled: boolean; hapticsEnabled: boolean; displayLayoutMode: DisplayLayoutMode; wordDefinitionMode: WordDefinitionMode; letterCase: LetterCase; letterQMode: LetterQMode; highRiskSpellConfirm: boolean; swapConfirmButtonSide: boolean; devSuppressAchievementsAndLeaderboards: boolean }} */
export const gameSettings = reactive({
  allowSpellingAbbreviations: false,
  uiScalePercent: UI_SCALE_DEFAULT,
  markButtonEnabled: true,
  swapButtonMode: "hidden",
  markOnSwap: false,
  animationSpeedTier: "normal",
  materialAnimationEnabled: true,
  hapticsEnabled: true,
  displayLayoutMode: inferDefaultDisplayLayoutMode(),
  wordDefinitionMode: "off",
  letterCase: "uppercase",
  letterQMode: "qu",
  highRiskSpellConfirm: true,
  swapConfirmButtonSide: false,
  /** 开发者模式下抑制成就解锁与排行榜上报；默认开启 */
  devSuppressAchievementsAndLeaderboards: true,
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
  let needsWordAuxMigration = false;
  let needsWordDefinitionMigration = false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (hasExistingPlayerSaveData()) {
        applyLegacyWordAuxDefaults();
        applyLegacyWordDefinitionDefault();
        persistGameSettings();
      }
      return;
    }
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
    if (typeof parsed.markButtonEnabled === "boolean") {
      gameSettings.markButtonEnabled = parsed.markButtonEnabled;
    } else {
      needsWordAuxMigration = true;
    }
    if (parsed.animationSpeedTier != null) {
      gameSettings.animationSpeedTier = normalizeAnimationSpeedTier(parsed.animationSpeedTier);
    }
    if (typeof parsed.materialAnimationEnabled === "boolean") {
      gameSettings.materialAnimationEnabled = parsed.materialAnimationEnabled;
    }
    if (typeof parsed.hapticsEnabled === "boolean") {
      gameSettings.hapticsEnabled = parsed.hapticsEnabled;
    }
    if (parsed.displayLayoutMode != null) {
      gameSettings.displayLayoutMode = normalizeDisplayLayoutMode(parsed.displayLayoutMode);
    }
    if (parsed.wordDefinitionMode != null) {
      gameSettings.wordDefinitionMode = normalizeWordDefinitionMode(parsed.wordDefinitionMode);
    } else {
      needsWordDefinitionMigration = true;
    }
    if (parsed.letterCase != null) {
      gameSettings.letterCase = normalizeLetterCase(parsed.letterCase);
    }
    if (parsed.letterQMode != null) {
      gameSettings.letterQMode = normalizeLetterQMode(parsed.letterQMode);
    }
    if (typeof parsed.highRiskSpellConfirm === "boolean") {
      gameSettings.highRiskSpellConfirm = parsed.highRiskSpellConfirm;
    }
    if (typeof parsed.swapConfirmButtonSide === "boolean") {
      gameSettings.swapConfirmButtonSide = parsed.swapConfirmButtonSide;
    }
    if (typeof parsed.devSuppressAchievementsAndLeaderboards === "boolean") {
      gameSettings.devSuppressAchievementsAndLeaderboards = parsed.devSuppressAchievementsAndLeaderboards;
    }
    if (needsWordAuxMigration) {
      if (hasExistingPlayerSaveData()) {
        gameSettings.markButtonEnabled = true;
        if (parsed.swapButtonMode == null) {
          gameSettings.swapButtonMode = "bottom8";
        }
        if (typeof parsed.markOnSwap !== "boolean") {
          gameSettings.markOnSwap = true;
        }
      } else {
        applyNewPlayerWordAuxDefaults();
      }
    }
    if (needsWordDefinitionMigration) {
      if (hasExistingPlayerSaveData()) {
        applyLegacyWordDefinitionDefault();
      } else {
        applyNewPlayerWordDefinitionDefault();
      }
    }
    if (needsWordAuxMigration || needsWordDefinitionMigration) {
      persistGameSettings();
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
        markButtonEnabled: gameSettings.markButtonEnabled,
        swapButtonMode: gameSettings.swapButtonMode,
        markOnSwap: gameSettings.markOnSwap,
        animationSpeedTier: gameSettings.animationSpeedTier,
        materialAnimationEnabled: gameSettings.materialAnimationEnabled,
        hapticsEnabled: gameSettings.hapticsEnabled,
        displayLayoutMode: gameSettings.displayLayoutMode,
        wordDefinitionMode: gameSettings.wordDefinitionMode,
        letterCase: gameSettings.letterCase,
        letterQMode: gameSettings.letterQMode,
        highRiskSpellConfirm: gameSettings.highRiskSpellConfirm,
        swapConfirmButtonSide: gameSettings.swapConfirmButtonSide,
        devSuppressAchievementsAndLeaderboards: gameSettings.devSuppressAchievementsAndLeaderboards,
      }),
    );
    void import("../save/cloudSave/cloudSaveSync.js").then(({ markCloudSyncDirty }) => {
      markCloudSyncDirty();
    });
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

/** @returns {boolean} */
export function getMarkButtonEnabled() {
  return gameSettings.markButtonEnabled === true;
}

/** @param {boolean} enabled */
export function setMarkButtonEnabled(enabled) {
  gameSettings.markButtonEnabled = Boolean(enabled);
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
  return gameSettings.markOnSwap === true;
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

/** @returns {AnimationSpeedTier} */
export function getAnimationSpeedTier() {
  return normalizeAnimationSpeedTier(gameSettings.animationSpeedTier);
}

/** @param {AnimationSpeedTier} tier */
export function setAnimationSpeedTier(tier) {
  gameSettings.animationSpeedTier = normalizeAnimationSpeedTier(tier);
  persistGameSettings();
}

/** @returns {boolean} */
export function getMaterialAnimationEnabled() {
  return gameSettings.materialAnimationEnabled !== false;
}

/** @param {boolean} enabled */
export function setMaterialAnimationEnabled(enabled) {
  gameSettings.materialAnimationEnabled = Boolean(enabled);
  persistGameSettings();
}

/** @returns {boolean} */
export function getHapticsEnabled() {
  return gameSettings.hapticsEnabled !== false;
}

/** @param {boolean} enabled */
export function setHapticsEnabled(enabled) {
  gameSettings.hapticsEnabled = Boolean(enabled);
  persistGameSettings();
}

/** @returns {DisplayLayoutMode} */
export function getDisplayLayoutMode() {
  return normalizeDisplayLayoutMode(gameSettings.displayLayoutMode);
}

/** @param {DisplayLayoutMode} mode */
export function setDisplayLayoutMode(mode) {
  gameSettings.displayLayoutMode = normalizeDisplayLayoutMode(mode);
  persistGameSettings();
}

/** @returns {WordDefinitionMode} */
export function getWordDefinitionMode() {
  return normalizeWordDefinitionMode(gameSettings.wordDefinitionMode);
}

/** @param {WordDefinitionMode} mode */
export function setWordDefinitionMode(mode) {
  gameSettings.wordDefinitionMode = normalizeWordDefinitionMode(mode);
  persistGameSettings();
}

/** @returns {LetterCase} */
export function getLetterCase() {
  return normalizeLetterCase(gameSettings.letterCase);
}

/** @param {LetterCase} caseMode */
export function setLetterCase(caseMode) {
  gameSettings.letterCase = normalizeLetterCase(caseMode);
  persistGameSettings();
}

/** @returns {LetterQMode} */
export function getLetterQMode() {
  return normalizeLetterQMode(gameSettings.letterQMode);
}

/** @param {LetterQMode} mode */
export function setLetterQMode(mode) {
  gameSettings.letterQMode = normalizeLetterQMode(mode);
  persistGameSettings();
}

/** @returns {boolean} */
export function getHighRiskSpellConfirmEnabled() {
  return gameSettings.highRiskSpellConfirm !== false;
}

/** @param {boolean} enabled */
export function setHighRiskSpellConfirm(enabled) {
  gameSettings.highRiskSpellConfirm = Boolean(enabled);
  persistGameSettings();
}

/** @returns {boolean} */
export function getSwapConfirmButtonSideEnabled() {
  return gameSettings.swapConfirmButtonSide === true;
}

/** @param {boolean} enabled */
export function setSwapConfirmButtonSide(enabled) {
  gameSettings.swapConfirmButtonSide = Boolean(enabled);
  persistGameSettings();
}

/** @returns {boolean} 开发者模式下是否抑制成就与排行榜 */
export function getDevSuppressAchievementsAndLeaderboards() {
  return gameSettings.devSuppressAchievementsAndLeaderboards !== false;
}

/** @param {boolean} enabled */
export function setDevSuppressAchievementsAndLeaderboards(enabled) {
  gameSettings.devSuppressAchievementsAndLeaderboards = Boolean(enabled);
  persistGameSettings();
}

loadGameSettings();
