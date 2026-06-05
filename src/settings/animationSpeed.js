import gsap from "gsap";
import { ref, watch } from "vue";
import { pauseAwareDelay } from "../game/gamePause.js";
import { gameSettings, normalizeAnimationSpeedTier } from "./gameSettings.js";

/** @typedef {import('./gameSettings.js').AnimationSpeedTier} AnimationSpeedTier */

/** @type {readonly { id: AnimationSpeedTier; label: string; scale: number }[]} */
export const ANIMATION_SPEED_OPTIONS = [
  { id: "slow", label: "慢", scale: 0.75 },
  { id: "normal", label: "正常", scale: 1 },
  { id: "fast", label: "快", scale: 1.5 },
];

export const reducedMotionSignal = ref(0);

/**
 * 系统「减少动态效果」或用户勾选「减少动画」。
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  if (gameSettings.reduceMotion === true) return true;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** @returns {boolean} 跳过入场、切换、wobble 等非必要动效 */
export function shouldSkipDecorativeMotion() {
  return prefersReducedMotion();
}

/**
 * 减少动画：保留 stagger 间隔，元素瞬间隐藏（无位移/透明度 tween）。
 * @param {HTMLElement[]} slotEls
 * @param {HTMLElement[]} gridEls
 * @param {{ stagger?: number }} [options]
 * @returns {Promise<void>}
 */
export function runStaggeredInstantLeave(slotEls, gridEls, options = {}) {
  const stagger = Number.isFinite(options.stagger) ? options.stagger : 0.12;
  const slots = Array.isArray(slotEls) ? slotEls.filter(Boolean) : [];
  const grids = Array.isArray(gridEls) ? gridEls.filter(Boolean) : [];
  const count = Math.max(slots.length, grids.length);
  if (count === 0) return Promise.resolve();

  /** @param {HTMLElement} el */
  const hideInstant = (el) => {
    gsap.killTweensOf(el);
    gsap.set(el, { opacity: 0, visibility: "hidden", pointerEvents: "none" });
  };

  return new Promise((resolve) => {
    let pending = count;
    const tick = () => {
      pending -= 1;
      if (pending <= 0) resolve();
    };
    for (let i = 0; i < count; i += 1) {
      const delayMs = Math.max(0, Math.round(i * stagger * 1000));
      window.setTimeout(() => {
        if (slots[i]) hideInstant(slots[i]);
        if (grids[i]) hideInstant(grids[i]);
        tick();
      }, delayMs);
    }
  });
}

/** @returns {number} 用户动画速度倍率（减少动画模式下固定为 1） */
export function getAnimationSpeedScale() {
  if (prefersReducedMotion()) return 1;
  const tier = normalizeAnimationSpeedTier(gameSettings.animationSpeedTier);
  return ANIMATION_SPEED_OPTIONS.find((o) => o.id === tier)?.scale ?? 1;
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

/** 同步 document 类名、CSS 变量与 GSAP 全局 timeScale */
export function applyAnimationSpeedGlobals() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const reduce = prefersReducedMotion();
  const scale = getAnimationSpeedScale();
  root.style.setProperty("--anim-speed-scale", String(scale));
  root.classList.toggle("reduce-motion", reduce);
  gsap.globalTimeline.timeScale(scale);
  reducedMotionSignal.value += 1;
}

let initialized = false;

/** 启动时调用一次；监听设置与系统 reduced-motion 变化 */
export function initAnimationSpeedSettings() {
  if (initialized) return;
  initialized = true;
  applyAnimationSpeedGlobals();
  watch(
    () => [gameSettings.animationSpeedTier, gameSettings.reduceMotion],
    () => applyAnimationSpeedGlobals(),
  );
  if (typeof window !== "undefined") {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => applyAnimationSpeedGlobals();
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
    } else if (typeof mql.addListener === "function") {
      mql.addListener(onChange);
    }
  }
}

/**
 * 减少动画：将目标元素设为最终态（用于入场 stagger 等）。
 * @param {gsap.TweenTarget} targets
 * @param {gsap.TweenVars} [finalVars]
 */
export function instantRevealGsapTargets(targets, finalVars = { opacity: 1, y: 0, scale: 1 }) {
  if (!targets || (Array.isArray(targets) && !targets.length)) return;
  gsap.killTweensOf(targets);
  gsap.set(targets, finalVars);
}

/**
 * 减少动画：预览/浮层瞬间展开（遮罩、stagger、主视觉区）。
 * @param {object} opts
 * @param {HTMLElement | null | undefined} opts.backdrop
 * @param {gsap.TweenVars} opts.backdropFinal
 * @param {HTMLElement[]} [opts.staggerEls]
 * @param {HTMLElement | null | undefined} [opts.primaryEl]
 * @param {gsap.TweenVars} [opts.primaryFinal]
 * @param {HTMLElement[]} [opts.extraEls]
 */
export function instantPortalLayerEnter(opts) {
  const {
    backdrop,
    backdropFinal,
    staggerEls = [],
    primaryEl,
    primaryFinal = { opacity: 1, pointerEvents: "auto", y: 0, scale: 1 },
    extraEls = [],
  } = opts;
  const all = [backdrop, primaryEl, ...extraEls, ...staggerEls].filter(Boolean);
  gsap.killTweensOf(all);
  if (backdrop && backdropFinal) gsap.set(backdrop, backdropFinal);
  const primaryVars = { ...primaryFinal, clearProps: "opacity,transform,pointerEvents,scale" };
  if (primaryEl) gsap.set(primaryEl, primaryVars);
  for (const el of extraEls) {
    if (el) gsap.set(el, primaryVars);
  }
  instantRevealGsapTargets(staggerEls, {
    opacity: 1,
    y: 0,
    scale: 1,
    clearProps: "opacity,transform",
  });
}

/**
 * 减少动画：预览/浮层瞬间关闭（由父级卸载）。
 * @param {object} [opts]
 * @param {HTMLElement | null | undefined} [opts.backdrop]
 * @param {HTMLElement[]} [opts.staggerEls]
 * @param {HTMLElement | null | undefined} [opts.primaryEl]
 * @param {HTMLElement[]} [opts.extraEls]
 * @returns {Promise<void>}
 */
export function instantPortalLayerClose(opts = {}) {
  const { backdrop, staggerEls = [], primaryEl, extraEls = [] } = opts;
  const all = [backdrop, primaryEl, ...extraEls, ...staggerEls].filter(Boolean);
  gsap.killTweensOf(all);
  return Promise.resolve();
}
