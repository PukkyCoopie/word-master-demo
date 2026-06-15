import { Capacitor, registerPlugin } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { getAnimationSpeedScale, shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";
import { isE2eMode } from "../e2e/isE2eMode.js";
import { getHapticsEnabled } from "../settings/gameSettings.js";

/** 触感分层、预设与挂接约定见同目录 `haptics.md`。 */

/**
 * @typedef {{
 *   click: () => Promise<void>;
 *   tabSwitch: () => Promise<void>;
 *   overlayPresent: () => Promise<void>;
 *   overlayDismiss: () => Promise<void>;
 *   gameSelect: () => Promise<void>;
 *   gameLand: () => Promise<void>;
 *   gameConfirm: () => Promise<void>;
 *   gameReject: () => Promise<void>;
 *   gameScorePulse: () => Promise<void>;
 *   gameMilestone: () => Promise<void>;
 *   gameWarning: () => Promise<void>;
 *   gameCelebrate: () => Promise<void>;
 *   gamePreviewOpen: () => Promise<void>;
 *   gameWobble: () => Promise<void>;
 *   gameTileRemove: () => Promise<void>;
 *   gameSettleDollar: () => Promise<void>;
 * }} UiHapticsPlugin
 */

const UiHapticsNative = registerPlugin("UiHaptics");

/** @type {UiHapticsPlugin} */
const UiHaptics = {
  click: () => invokeNative("click"),
  tabSwitch: () => invokeNative("tabSwitch"),
  overlayPresent: () => invokeNative("overlayPresent"),
  overlayDismiss: () => invokeNative("overlayDismiss"),
  gameSelect: () => invokeNative("gameSelect"),
  gameLand: () => invokeNative("gameLand"),
  gameConfirm: () => invokeNative("gameConfirm"),
  gameReject: () => invokeNative("gameReject"),
  gameScorePulse: () => invokeNative("gameScorePulse"),
  gameMilestone: () => invokeNative("gameMilestone"),
  gameWarning: () => invokeNative("gameWarning"),
  gameCelebrate: () => invokeNative("gameCelebrate"),
  gamePreviewOpen: () => invokeNative("gamePreviewOpen"),
  gameWobble: () => invokeNative("gameWobble"),
  gameTileRemove: () => invokeNative("gameTileRemove"),
  gameSettleDollar: () => invokeNative("gameSettleDollar"),
};

/** @typedef {'tap' | 'tabSwitch' | 'overlayPresent' | 'overlayPresentLight' | 'overlayDismiss' | 'selection' | 'land' | 'confirm' | 'reject' | 'scoreTotal' | 'milestone' | 'success' | 'warning' | 'celebrate' | 'previewOpen' | 'wobble' | 'tileRemove' | 'settleDollar'} HapticPreset */

const THROTTLE_MS = 70;
const LAND_THROTTLE_MS = 100;
const UI_TAP_THROTTLE_MS = 32;
const WOBBLE_THROTTLE_MS = 120;
const TILE_REMOVE_THROTTLE_MS = 70;
const SETTLE_DOLLAR_THROTTLE_MS = 85;
const PREVIEW_OPEN_THROTTLE_MS = 48;
const REJECT_GAP_MS = 40;
const MILESTONE_GAP_MS = 50;
/** 浮层刚展开时抑制 Tab 双相位震（避免与入场动画叠震） */
const TAB_SWITCH_SUPPRESS_AFTER_OVERLAY_MS = 420;

const TAB_SWITCH_SELECTOR = [
  '[role="tab"]',
  ".settings-layer-tab",
  ".settings-segment-btn",
  ".collection-icon-segment-btn",
  ".run-start-dialog-tab",
  ".about-tab",
].join(", ");

const BUTTON_LIKE_SELECTOR = [
  "button",
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  '[role="button"]',
  '[class*="--clickable"]',
].join(", ");

const BUTTON_UI_TAP_EXCLUDE_SELECTOR =
  ".grid-tile, .word-slot-tile, .word-slot-content, .letter-grid";

/** @type {Record<HapticPreset, keyof UiHapticsPlugin>} */
const PRESET_NATIVE_METHOD = {
  tap: "click",
  tabSwitch: "tabSwitch",
  overlayPresent: "overlayPresent",
  overlayPresentLight: "gamePreviewOpen",
  overlayDismiss: "overlayDismiss",
  selection: "gameSelect",
  land: "gameLand",
  confirm: "gameConfirm",
  reject: "gameReject",
  scoreTotal: "gameScorePulse",
  milestone: "gameMilestone",
  success: "gameScorePulse",
  warning: "gameWarning",
  celebrate: "gameCelebrate",
  previewOpen: "gamePreviewOpen",
  wobble: "gameWobble",
  tileRemove: "gameTileRemove",
  settleDollar: "gameSettleDollar",
};

let lastFiredAt = 0;
let lastLandFiredAt = 0;
let lastUiTapFiredAt = 0;
let lastWobbleFiredAt = 0;
let lastTileRemoveFiredAt = 0;
let lastSettleDollarFiredAt = 0;
let lastPreviewOpenFiredAt = 0;
let tabSwitchSuppressedUntil = 0;
let uiButtonHapticsInstalled = false;

/** @param {keyof UiHapticsPlugin} method */
function invokeNative(method) {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  const fn = UiHapticsNative[method];
  return typeof fn === "function" ? fn.call(UiHapticsNative) : Promise.resolve();
}

/** @returns {boolean} */
export function isHapticsAvailable() {
  return Capacitor.isNativePlatform();
}

/** @returns {boolean} */
function isHapticsGateOpen() {
  return isHapticsAvailable() && !isE2eMode() && getHapticsEnabled();
}

/**
 * 浮层/弹窗刚出现时调用：短暂抑制 Tab 切换震感。
 * @param {number} [graceMs]
 */
export function notifyOverlayOpened(graceMs = TAB_SWITCH_SUPPRESS_AFTER_OVERLAY_MS) {
  if (!isHapticsAvailable()) return;
  tabSwitchSuppressedUntil = performance.now() + Math.max(0, graceMs);
}

/**
 * @param {number} [now]
 * @param {{ bypassThrottle?: boolean; land?: boolean; wobble?: boolean; tileRemove?: boolean; settleDollar?: boolean; previewOpen?: boolean }} [opts]
 * @returns {boolean}
 */
function shouldFire(now = performance.now(), opts = {}) {
  if (!isHapticsGateOpen()) return false;
  if (opts.bypassThrottle) return true;
  if (opts.land) {
    if (now - lastLandFiredAt < LAND_THROTTLE_MS) return false;
    lastLandFiredAt = now;
  }
  if (opts.wobble) {
    if (now - lastWobbleFiredAt < WOBBLE_THROTTLE_MS) return false;
    lastWobbleFiredAt = now;
  }
  if (opts.tileRemove) {
    if (now - lastTileRemoveFiredAt < TILE_REMOVE_THROTTLE_MS) return false;
    lastTileRemoveFiredAt = now;
  }
  if (opts.settleDollar) {
    if (now - lastSettleDollarFiredAt < SETTLE_DOLLAR_THROTTLE_MS) return false;
    lastSettleDollarFiredAt = now;
  }
  if (opts.previewOpen) {
    if (now - lastPreviewOpenFiredAt < PREVIEW_OPEN_THROTTLE_MS) return false;
    lastPreviewOpenFiredAt = now;
  }
  if (now - lastFiredAt < THROTTLE_MS) return false;
  lastFiredAt = now;
  return true;
}

/** @param {ImpactStyle} style */
async function impact(style) {
  try {
    await Haptics.impact({ style });
  } catch {
    /* 忽略 */
  }
}

/**
 * @param {Element} el
 * @returns {boolean}
 */
function isUiTapDisabled(el) {
  const button =
    el instanceof HTMLButtonElement
      ? el
      : el instanceof HTMLInputElement
        ? el
        : el.querySelector("button, input[type='button'], input[type='submit'], input[type='reset']");
  if (button instanceof HTMLButtonElement && button.disabled) return true;
  if (button instanceof HTMLInputElement && button.disabled) return true;
  if (el.getAttribute("aria-disabled") === "true") return true;
  if (
    el.classList.contains("action-btn-disabled") &&
    !el.classList.contains("action-btn-disabled--interactive")
  ) {
    return true;
  }
  if (el.classList.contains("action-aux-btn--disabled")) return true;
  return false;
}

/**
 * @param {EventTarget | null} target
 * @returns {Element | null}
 */
function resolveUITapTarget(target) {
  if (!(target instanceof Element)) return null;
  if (target.closest(TAB_SWITCH_SELECTOR)) return null;

  let el = target.closest(BUTTON_LIKE_SELECTOR);
  if (!el) {
    const settingsRow = target.closest(".settings-row");
    if (settingsRow instanceof Element && settingsRow.querySelector("button, [role='switch']")) {
      el = settingsRow;
    }
  }
  if (!(el instanceof Element)) return null;
  if (el.hasAttribute("data-haptic-skip-ui-tap")) return null;
  if (el.closest(BUTTON_UI_TAP_EXCLUDE_SELECTOR)) return null;
  if (isUiTapDisabled(el)) return null;
  return el;
}

/**
 * @param {number} [now]
 * @param {{ bypassThrottle?: boolean }} [opts]
 * @returns {boolean}
 */
function shouldFireUiTap(now = performance.now(), opts = {}) {
  if (!isHapticsGateOpen()) return false;
  if (opts.bypassThrottle) return true;
  if (now - lastUiTapFiredAt < UI_TAP_THROTTLE_MS) return false;
  lastUiTapFiredAt = now;
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** @param {HapticPreset} preset */
async function performPresetNative(preset) {
  const method = PRESET_NATIVE_METHOD[preset];
  if (!method) return;
  try {
    await invokeNative(method);
  } catch {
    /* 忽略 */
  }
}

/** @param {HapticPreset} preset */
async function performPresetFallback(preset) {
  switch (preset) {
    case "tap":
    case "land":
    case "settleDollar":
    case "celebrate":
      await impact(ImpactStyle.Light);
      break;
    case "selection":
    case "tileRemove":
      await impact(ImpactStyle.Medium);
      break;
    case "wobble":
      await impact(ImpactStyle.Light);
      break;
    case "tabSwitch":
      await impact(ImpactStyle.Light);
      await sleep(110);
      await impact(ImpactStyle.Medium);
      break;
    case "overlayPresent":
    case "confirm":
    case "scoreTotal":
    case "success":
      await impact(ImpactStyle.Medium);
      break;
    case "overlayPresentLight":
    case "previewOpen":
    case "overlayDismiss":
    case "warning":
      await impact(ImpactStyle.Light);
      break;
    case "reject":
      await impact(ImpactStyle.Light);
      await sleep(REJECT_GAP_MS);
      await impact(ImpactStyle.Light);
      break;
    case "milestone":
      await impact(ImpactStyle.Light);
      await sleep(MILESTONE_GAP_MS);
      await impact(ImpactStyle.Medium);
      await sleep(MILESTONE_GAP_MS);
      await impact(ImpactStyle.Light);
      break;
    default:
      break;
  }
}

/** @param {HapticPreset} preset */
async function performPreset(preset) {
  if (Capacitor.getPlatform() === "android") {
    await performPresetNative(preset);
    return;
  }
  await performPresetFallback(preset);
}

/**
 * @param {HapticPreset} preset
 * @param {{ bypassThrottle?: boolean }} [opts]
 */
export function triggerHaptic(preset, opts = {}) {
  if (!isHapticsAvailable()) return;
  const now = performance.now();
  if (preset === "tap") {
    if (!shouldFireUiTap(now, opts)) return;
    void performPreset("tap");
    return;
  }

  if (preset === "tabSwitch" && now < tabSwitchSuppressedUntil && !opts.bypassThrottle) {
    return;
  }

  const land = preset === "land";
  const wobble = preset === "wobble";
  const tileRemove = preset === "tileRemove";
  const settleDollar = preset === "settleDollar";
  const previewOpen = preset === "previewOpen";
  if (
    !shouldFire(now, {
      ...opts,
      land,
      wobble,
      tileRemove,
      settleDollar,
      previewOpen,
    })
  ) {
    return;
  }
  if (!land) lastFiredAt = now;

  void performPreset(preset);
}

/**
 * 浮层 enter/leave：按动画时长在峰值/收尾触发（已乘动画速度倍率）。
 * @param {HapticPreset} preset
 * @param {number} delayMs
 */
export function scheduleHapticAt(preset, delayMs) {
  if (!isHapticsAvailable() || !isHapticsGateOpen() || shouldSkipDecorativeMotion()) return;
  const ms = Math.max(0, Math.round(delayMs / getAnimationSpeedScale()));
  window.setTimeout(() => triggerHaptic(preset, { bypassThrottle: true }), ms);
}

/** @param {number} [enterMs] */
export function scheduleOverlayPresent(enterMs = 280) {
  notifyOverlayOpened();
  scheduleHapticAt("overlayPresent", enterMs);
}

/** 宝藏/字母详情等预览层：展开峰值用轻震（非 bloom） */
export function schedulePreviewLayerPresent(enterMs = 280) {
  notifyOverlayOpened();
  scheduleHapticAt("overlayPresentLight", enterMs);
}

/** @param {number} [leaveMs] */
export function scheduleOverlayDismiss(leaveMs = 240) {
  scheduleHapticAt("overlayDismiss", leaveMs);
}

/** 设置页试震：忽略节流，仍受开关与 E2E 约束。 */
export function previewHaptic(preset = "tap") {
  triggerHaptic(preset, { bypassThrottle: true });
}

/** 全局：普通按钮 tap；Tab/分段由业务侧 triggerHaptic('tabSwitch')。 */
export function initUIButtonHaptics() {
  if (!Capacitor.isNativePlatform()) return;
  if (typeof document === "undefined" || uiButtonHapticsInstalled) return;
  uiButtonHapticsInstalled = true;

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0) return;
      if (!resolveUITapTarget(e.target)) return;
      triggerHaptic("tap");
    },
    { capture: true, passive: true },
  );

  document.addEventListener(
    "click",
    (e) => {
      if (e.pointerType === "touch" || e.pointerType === "pen") return;
      if (!resolveUITapTarget(e.target)) return;
      triggerHaptic("tap");
    },
    { capture: true, passive: true },
  );
}
