import {
  getSupportsMaterialAnimation,
  initWebViewCapabilities,
} from "../platform/webViewCapabilities.js";
import { gameSettings, setMaterialAnimationEnabled } from "./gameSettings.js";

/** 设置页「材质动画」是否可交互（设备能力允许） */
export function isMaterialAnimationSettingSupported() {
  return getSupportsMaterialAnimation();
}

/**
 * @param {boolean | undefined} propAnimate LetterTile 传入的 materialAnimate
 * @returns {boolean}
 */
export function resolveEffectiveMaterialAnimate(propAnimate) {
  if (!getSupportsMaterialAnimation()) return false;
  if (gameSettings.materialAnimationEnabled === false) return false;
  if (propAnimate === false) return false;
  return true;
}

/** 设备不支持材质动画时强制关闭用户设置 */
export function applyMaterialAnimationCapabilityConstraints() {
  initWebViewCapabilities();
  if (!getSupportsMaterialAnimation()) {
    setMaterialAnimationEnabled(false);
  }
}
