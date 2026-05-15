/**
 * 局内浮层 z-index：后出现者在上（单调递增），避免各组件写死 magic number。
 * 在浮层根节点 mount / 打开时调用 `bumpOverlayZ()` 写入 style.zIndex。
 */
let seq = 0;
const FLOOR = 1000;

export function bumpOverlayZ() {
  seq += 1;
  return FLOOR + seq;
}
