import { Capacitor } from "@capacitor/core";
import { publicUrl } from "../assets/publicUrl.js";

/** 电脑端右下角角标（低于海报弹层，高于游戏 portal 浮层 200 / 局内 350） */
export const TAP_TAP_VIEWPORT_PROMO_Z = 450;
export const TAP_TAP_POSTER_LAYER_Z = 500;
export const TAP_TAP_APP_URL = "https://www.taptap.cn/app/861643?os=android";
export const TAP_TAP_POSTER_SRC = publicUrl("images/poster.webp");
export const TAP_TAP_ICON_SRC = publicUrl("taptap/taptap.svg");

/**
 * 完整版 TapTap 推广文案开关。
 * - false（默认）：即将上线文案
 * - true：可前往 TapTap 体验完整游戏
 */
export const TAP_TAP_EXPERIENCE_PROMO_ENABLED = false;

const TAP_TAP_PROMO_LABEL_LIVE = "前往TapTap体验完整游戏";
const TAP_TAP_PROMO_LABEL_COMING_SOON = "已在TapTap上线，欢迎关注";
const TAP_TAP_PROMO_ABOUT_LEAD_LIVE = "前往";
const TAP_TAP_PROMO_ABOUT_TAIL_LIVE = "体验完整游戏";
const TAP_TAP_PROMO_ABOUT_LEAD_COMING_SOON = "已在";
const TAP_TAP_PROMO_ABOUT_TAIL_COMING_SOON = "上线，欢迎关注";

export function getTapTapPromoLabel() {
  return TAP_TAP_EXPERIENCE_PROMO_ENABLED
    ? TAP_TAP_PROMO_LABEL_LIVE
    : TAP_TAP_PROMO_LABEL_COMING_SOON;
}

export function getTapTapPromoAboutLead() {
  return TAP_TAP_EXPERIENCE_PROMO_ENABLED
    ? TAP_TAP_PROMO_ABOUT_LEAD_LIVE
    : TAP_TAP_PROMO_ABOUT_LEAD_COMING_SOON;
}

export function getTapTapPromoAboutTail() {
  return TAP_TAP_EXPERIENCE_PROMO_ENABLED
    ? TAP_TAP_PROMO_ABOUT_TAIL_LIVE
    : TAP_TAP_PROMO_ABOUT_TAIL_COMING_SOON;
}

/** 仅在浏览器 / 非 Capacitor 原生壳展示 TapTap 推广 */
export function isTapTapWebPromoEnabled() {
  return !Capacitor.isNativePlatform();
}

export function openTapTapAppPage() {
  window.open(TAP_TAP_APP_URL, "_blank", "noopener,noreferrer");
}
