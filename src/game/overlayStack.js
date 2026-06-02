/**
 * 局内浮层 z-index：后出现者在上（单调递增），避免各组件写死 magic number。
 * 在浮层根节点 mount / 打开时调用 `bumpOverlayZ()` 写入 style.zIndex。
 */
let seq = 0;
const FLOOR = 1000;

/** 设置层相对当前栈顶的固定余量（不推进 seq，仅供 `settingsOverlayZ`） */
export const SETTINGS_OVERLAY_Z_MARGIN = 10;

/** @returns {number} 当前已 bump 的最高 z-index（未 bump 时为 FLOOR） */
export function getOverlayStackTop() {
  return FLOOR + seq;
}

export function bumpOverlayZ() {
  seq += 1;
  return FLOOR + seq;
}

/**
 * 设置层专用：栈顶 + 余量，不写入 seq。
 * 例：seq=5 → 栈顶 1005，设置 1015；之后 bump 仍从 1006 起，无法盖过设置。
 * @returns {number}
 */
export function settingsOverlayZ() {
  return getOverlayStackTop() + SETTINGS_OVERLAY_Z_MARGIN;
}
