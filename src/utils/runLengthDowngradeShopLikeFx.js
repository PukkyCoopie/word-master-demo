/**
 * 局内词长等级 -1：与 runClearWinLengthUpgradeShopLikeFx 同款流程，气泡为 -1 / -x。
 * 调用方负责在播动效前写入 lengthLevels；本模块只播展示数字。
 */
import gsap from "gsap";
import {
  getBaseScorePerLetterForWordLength,
  getLengthMultiplier,
  getLengthUpgradeStepAdds,
} from "../composables/useScoring.js";
import { shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bubbleAt(targetEl, text, kind) {
  if (!targetEl) return;
  const rect = targetEl.getBoundingClientRect();
  const div = document.createElement("div");
  if (kind === "mult") div.className = "mult-popup-bubble";
  else if (kind === "level") div.className = "score-popup-bubble shop-level-popup-bubble";
  else div.className = "score-popup-bubble";
  div.textContent = text;
  document.body.appendChild(div);
  const rpx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx").trim()) || 1;
  gsap.set(div, {
    position: "fixed",
    left: rect.left + rect.width / 2,
    top: rect.top - 12 * rpx,
    xPercent: -50,
    yPercent: -100,
    transformOrigin: "50% 100%",
    force3D: true,
    zIndex: 350,
  });
  gsap.fromTo(
    div,
    { opacity: 0, y: 18, scale: 0.5 },
    { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "expo.out" },
  );
  gsap.to(div, {
    opacity: 0,
    y: -14,
    scale: 0.92,
    duration: 0.28,
    delay: 0.4,
    ease: "expo.out",
    onComplete: () => div.remove(),
  });
}

function wobblePanelLikeScoreSlot(el, delayS = 0, speed = 1) {
  if (!el || shouldSkipDecorativeMotion()) return;
  const s = Math.max(0.01, Number(speed) || 1);
  gsap.killTweensOf(el, "rotation,scale,x,y");
  const tCompress = 0.11;
  const tExpand = 0.15;
  const scaleDownStart = tCompress + tExpand - 0.05;
  const rotStart = tCompress + tExpand * 0.5;
  const rotD1 = 0.034;
  const rotD2 = 0.036;
  gsap.set(el, { x: 0, y: 0, rotation: 0, scale: 1, transformOrigin: "50% 55%" });
  const tl = gsap
    .timeline({ delay: delayS })
    .to(el, { scale: 0.78, duration: tCompress, ease: "circ.out" }, 0)
    .to(el, { scale: 1.18, duration: tExpand, ease: "circ.inOut" }, tCompress)
    .to(el, { scale: 1, duration: 0.3, ease: "circ.in" }, scaleDownStart)
    .to(el, { rotation: 2.6, duration: rotD1, ease: "power2.out" }, rotStart)
    .to(el, { rotation: -1.9, duration: rotD2, ease: "power2.inOut" }, rotStart + rotD1)
    .to(el, { rotation: 0, duration: 0.12, ease: "power2.out" }, rotStart + rotD1 + rotD2);
  tl.timeScale(s);
}

async function runPanelWobbleAndBubble(panelEl, text, kind, speed = 1) {
  if (!panelEl) return;
  const s = Math.max(0.01, Number(speed) || 1);
  wobblePanelLikeScoreSlot(panelEl, 0, s);
  if (!shouldSkipDecorativeMotion()) {
    await sleep(Math.round(145 / s));
  }
  bubbleAt(panelEl, text, kind);
}

function popSettle(el, speed = 1) {
  if (!el) return;
  const s = Math.max(0.01, Number(speed) || 1);
  gsap.killTweensOf(el);
  if (shouldSkipDecorativeMotion()) {
    gsap.set(el, { transformOrigin: "50% 55%", scale: 1 });
    return;
  }
  gsap.set(el, { transformOrigin: "50% 55%", scale: 1.22 });
  gsap.to(el, { scale: 1, duration: 0.55 / s, ease: "expo.out" });
}

async function tweenResultValues(model, toScore, toMult, durationS = 0.44) {
  const state = { s: model.scoreValue.value, m: model.multValue.value };
  await new Promise((resolve) => {
    gsap.to(state, {
      s: toScore,
      m: toMult,
      duration: durationS,
      ease: "expo.out",
      onUpdate: () => {
        model.scoreValue.value = Math.max(0, Math.round(state.s));
        model.multValue.value = Math.max(0, Math.round(state.m));
      },
      onComplete: resolve,
    });
  });
  model.scoreValue.value = Math.max(0, Math.round(toScore));
  model.multValue.value = Math.max(0, Math.round(toMult));
}

async function playSwitchToLengthDefault(opts) {
  const { areaRef, model, lenLabel, level, scoreBefore, multBefore, speed = 1 } = opts;
  const s = Math.max(0.01, Number(speed) || 1);
  model.wordlenText.value = lenLabel;
  model.levelShown.value = level;
  const wordlenMainEl = areaRef.value?.getWordlenMainEl?.() ?? null;
  const scoreBoxEl = areaRef.value?.getScoreBoxEl?.() ?? null;
  const multBoxEl = areaRef.value?.getMultBoxEl?.() ?? null;
  const levelEl = areaRef.value?.getWordlenLevelEl?.() ?? null;
  popSettle(wordlenMainEl, s);
  await sleep(Math.round(60 / s));
  popSettle(levelEl, s);
  await sleep(Math.round(60 / s));
  model.scoreValue.value = Math.max(0, Math.round(scoreBefore));
  popSettle(scoreBoxEl, s);
  await sleep(Math.round(60 / s));
  model.multValue.value = Math.max(0, Math.round(multBefore));
  popSettle(multBoxEl, s);
  await sleep(Math.round(180 / s));
}

/**
 * @param {{
 *   areaRef: import('vue').Ref<{ getWordlenMainEl?: () => HTMLElement | null, getWordlenLevelEl?: () => HTMLElement | null, getScoreBoxEl?: () => HTMLElement | null, getMultBoxEl?: () => HTMLElement | null } | null | undefined>,
 *   model: { wordlenText: import('vue').Ref<string>, levelShown: import('vue').Ref<number>, scoreValue: import('vue').Ref<number>, multValue: import('vue').Ref<number> },
 *   fxActive: import('vue').Ref<boolean>,
 *   waitNextTick: () => Promise<void>,
 *   len: number,
 *   beforeLevel: number,
 *   speed?: number,
 * }} opts
 */
export async function runLengthDowngradeShopLikeFx(opts) {
  const { areaRef, model, fxActive, waitNextTick, len, beforeLevel, speed = 1 } = opts;
  const s = Math.max(0.01, Number(speed) || 1);
  const lenClamped = Math.max(3, Math.min(16, Math.round(Number(len) || 3)));
  const lenLabel = `${lenClamped}字母`;
  const lvBefore = Math.max(1, Math.round(Number(beforeLevel)) || 1);
  const nextLevel = Math.max(1, lvBefore - 1);
  const levelMapBefore = { [lenClamped]: lvBefore };
  const levelMapAfter = { [lenClamped]: nextLevel };
  const scoreBefore = getBaseScorePerLetterForWordLength(lenClamped, levelMapBefore);
  const multBefore = getLengthMultiplier(lenClamped, levelMapBefore);
  const { scoreAdd, multAdd } = getLengthUpgradeStepAdds(lenClamped);
  const scoreAfter = getBaseScorePerLetterForWordLength(lenClamped, levelMapAfter);
  const multAfter = getLengthMultiplier(lenClamped, levelMapAfter);

  fxActive.value = true;

  await playSwitchToLengthDefault({
    areaRef,
    model,
    lenLabel,
    level: lvBefore,
    scoreBefore,
    multBefore,
    speed: s,
  });

  const stepGapMs = 200;
  const valueTweenS = 0.46;
  await sleep(Math.round(stepGapMs / s));
  const levelEl = areaRef.value?.getWordlenLevelEl?.() ?? null;
  await runPanelWobbleAndBubble(levelEl, "-1", "level", s);
  model.levelShown.value = nextLevel;

  await sleep(Math.round(stepGapMs / s));
  const scoreBoxEl = areaRef.value?.getScoreBoxEl?.() ?? null;
  await runPanelWobbleAndBubble(scoreBoxEl, `-${scoreAdd}`, "score", s);
  const scoreTweenPromise = tweenResultValues(model, scoreAfter, multBefore, valueTweenS / s);

  await sleep(Math.round(stepGapMs / s));
  const multBoxEl = areaRef.value?.getMultBoxEl?.() ?? null;
  await runPanelWobbleAndBubble(multBoxEl, `-${multAdd}`, "mult", s);
  await scoreTweenPromise;
  await tweenResultValues(model, scoreAfter, multAfter, valueTweenS / s);

  await waitNextTick();
  await sleep(Math.round(460 / s));
  await tweenResultValues(model, 0, 0, 0.75 / s);
  fxActive.value = false;
}
