import { Capacitor } from "@capacitor/core";

/** 电脑端右下角角标（低于海报弹层，高于游戏 portal 浮层 200 / 局内 350） */
export const TAP_TAP_VIEWPORT_PROMO_Z = 450;
export const TAP_TAP_POSTER_LAYER_Z = 500;
export const TAP_TAP_APP_URL = "https://www.taptap.cn/app/861643?os=android";
export const TAP_TAP_POSTER_SRC = "/images/poster.webp";
export const TAP_TAP_ICON_SRC = "/taptap/taptap.svg";
export const TAP_TAP_PROMO_LABEL = "前往TapTap体验完整游戏";
export const TAP_TAP_PROMO_ABOUT_LEAD = "前往";
export const TAP_TAP_PROMO_ABOUT_TAIL = "体验完整游戏";

/** 仅在浏览器 / 非 Capacitor 原生壳展示 TapTap 推广 */
export function isTapTapWebPromoEnabled() {
  return !Capacitor.isNativePlatform();
}

export function openTapTapAppPage() {
  window.open(TAP_TAP_APP_URL, "_blank", "noopener,noreferrer");
}
