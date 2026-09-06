import { publicUrl } from "../assets/publicUrl.js";

/**
 * TapTap「TapTap 登录」文字按钮资源（移动端）。
 *
 * 规范：https://developer.taptap.cn/docs/design/
 * - 官方资源：默认圆角矩形 + 品牌蓝（SVG 270×50）
 * - 移动端默认高度 50pt；此处 1pt = 1×--rpx，仅等比缩放
 */
export const TAP_TAP_LOGIN_BUTTON_HEIGHT_RPX = 50;

/** @type {string} 官方「TapTap 登录」文字按钮 SVG */
export const TAP_TAP_LOGIN_BUTTON_SRC = publicUrl(
  "taptap/login/button-text-default-radius-brand-blue.svg",
);
