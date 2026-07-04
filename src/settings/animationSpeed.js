import gsap from "gsap";
import { watch } from "vue";
import { pauseAwareDelay } from "../game/gamePause.js";
import { gameSettings, normalizeAnimationSpeedTier } from "./gameSettings.js";

/** @typedef {import('./gameSettings.js').AnimationSpeedTier} AnimationSpeedTier */

/** @type {readonly { id: AnimationSpeedTier; label: string; scale: number }[]} */
export const ANIMATION_SPEED_OPTIONS = [
  { id: "slow", label: "慢", scale: 0.75 },
  { id: "normal", label: "正常", scale: 1 },
  { id: "fast", label: "快", scale: 1.5 },
];

/** @returns {number} 用户动画速度倍率 */
export function getAnimationSpeedScale() {
  const tier = normalizeAnimationSpeedTier(gameSettings.animationSpeedTier);
  return ANIMATION_SPEED_OPTIONS.find((o) => o.id === tier)?.scale ?? 1;
}

/** @returns {boolean} */
export function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** @returns {boolean} 是否跳过装饰性动效（bounce、ripple 等） */
export function shouldSkipDecorativeMotion() {
  return prefersReducedMotion();
}

/**
 * 局部速度（如计分渐进加速）× 用户全局倍率。
 * @param {number} [localSpeed]
 * @returns {number}
 */
export function getEffectiveAnimSpeed(localSpeed = 1) {
  return Math.max(0.01, Number(localSpeed) || 1) * getAnimationSpeedScale();
}

/**
 * @param {number} ms
 * @param {number} [localSpeed]
 * @returns {Promise<void>}
 */
export function animSleep(ms, localSpeed = 1) {
  const s = getEffectiveAnimSpeed(localSpeed);
  return pauseAwareDelay(Math.max(1, Math.round(ms / s)));
}

/** 同步 document CSS 变量与 GSAP 全局 timeScale */
export function applyAnimationSpeedGlobals() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const scale = getAnimationSpeedScale();
  root.style.setProperty("--anim-speed-scale", String(scale));
  gsap.globalTimeline.timeScale(scale);
}

let initialized = false;

/** 启动时调用一次；监听动画速度设置变化 */
export function initAnimationSpeedSettings() {
  if (initialized) return;
  initialized = true;
  applyAnimationSpeedGlobals();
  watch(
    () => gameSettings.animationSpeedTier,
    () => applyAnimationSpeedGlobals(),
  );
}
