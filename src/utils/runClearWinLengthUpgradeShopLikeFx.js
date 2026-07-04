/**
 * 局内通关时：与 ShopPanel.playOneLengthUpgrade 单长度分支一致的计分板动效（不含商店层、不含扣款）。
 * 调用方负责在开始前把「词长等级」写入 lengthLevels，本模块只播展示数字。
 */
import gsap from "gsap";
import {
  getBaseScorePerLetterForWordLength,
  getLengthMultiplier,
  getObservatoryBoostedLengthUpgradeStepAdds,
  getLengthUpgradeStepAdds,
} from "../composables/useScoring.js";
import { bubbleAtShopPanel } from "../game/popupBubbleFx.js";
import {
  UPGRADE_FIRST_LEAD_IN_GAP_MS,
  UPGRADE_FINAL_HOLD_MS,
  UPGRADE_STEP_GAP_MS,
  UPGRADE_SWITCH_GAP_MS,
  UPGRADE_SWITCH_SETTLE_MS,
  UPGRADE_VALUE_TWEEN_S,
  UPGRADE_WOBBLE_BUBBLE_MS,
  upgradeAnimSleep,
} from "../game/upgradePlaybackTiming.js";

function bubbleAt(targetEl, text, kind) {
  bubbleAtShopPanel(targetEl, text, kind);
}

function wobblePanelLikeScoreSlot(el, delayS = 0, speed = 1) {
  if (!el) return;
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
  await upgradeAnimSleep(UPGRADE_WOBBLE_BUBBLE_MS, s);
  bubbleAt(panelEl, text, kind);
}

function popSettle(el, speed = 1) {
  if (!el) return;
  const s = Math.max(0.01, Number(speed) || 1);
  gsap.killTweensOf(el);
  gsap.set(el, { transformOrigin: "50% 55%", scale: 1.22 });
  gsap.to(el, { scale: 1, duration: 0.55 / s, ease: "expo.out" });
}

/**
 * @param {object} model
 * @param {import('vue').Ref<number>} model.scoreValue
 * @param {import('vue').Ref<number>} model.multValue
 */
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

/**
 * @param {{
 *   areaRef: import('vue').Ref<{ getWordlenMainEl?: () => HTMLElement | null, getWordlenLevelEl?: () => HTMLElement | null, getScoreBoxEl?: () => HTMLElement | null, getMultBoxEl?: () => HTMLElement | null } | null | undefined>,
 *   model: { wordlenText: import('vue').Ref<string>, levelShown: import('vue').Ref<number>, scoreValue: import('vue').Ref<number>, multValue: import('vue').Ref<number> },
 *   lenLabel: string,
 *   level: number,
 *   scoreBefore: number,
 *   multBefore: number,
 *   speed?: number,
 * }} opts
 */
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
  await upgradeAnimSleep(UPGRADE_SWITCH_GAP_MS, s);
  popSettle(levelEl, s);
  await upgradeAnimSleep(UPGRADE_SWITCH_GAP_MS, s);
  model.scoreValue.value = Math.max(0, Math.round(scoreBefore));
  popSettle(scoreBoxEl, s);
  await upgradeAnimSleep(UPGRADE_SWITCH_GAP_MS, s);
  model.multValue.value = Math.max(0, Math.round(multBefore));
  popSettle(multBoxEl, s);
  await upgradeAnimSleep(UPGRADE_SWITCH_SETTLE_MS, s);
}

/**
 * @param {{
 *   areaRef: import('vue').Ref<{ getWordlenMainEl?: () => HTMLElement | null, getWordlenLevelEl?: () => HTMLElement | null, getScoreBoxEl?: () => HTMLElement | null, getMultBoxEl?: () => HTMLElement | null } | null | undefined>,
 *   model: { wordlenText: import('vue').Ref<string>, levelShown: import('vue').Ref<number>, scoreValue: import('vue').Ref<number>, multValue: import('vue').Ref<number> },
 *   fxActive: import('vue').Ref<boolean>,
 *   waitNextTick: () => Promise<void>,
 *   len: number,
 *   beforeLevel: number,
 *   observatoryBoost?: boolean,
 *   speed?: number,
 *   isFirstLength?: boolean,
 *   isLastLength?: boolean,
 * }} opts
 */
export async function runClearWinLengthUpgradeShopLikeFx(opts) {
  const {
    areaRef,
    model,
    fxActive,
    waitNextTick,
    len,
    beforeLevel,
    observatoryBoost = false,
    speed = 1,
    isFirstLength = true,
    isLastLength = true,
  } = opts;
  const s = Math.max(0.01, Number(speed) || 1);
  const backToNormalMid = isLastLength ? s - (s - 1) * 0.5 : s;
  const backToNormalEnd = isLastLength ? 1 : s;
  const lenClamped = Math.max(3, Math.min(16, Math.round(Number(len) || 3)));
  const lenLabel = `${lenClamped}字母`;
  const nextLevel = beforeLevel + 1;
  const levelMap = { [lenClamped]: beforeLevel };
  const scoreBefore = getBaseScorePerLetterForWordLength(lenClamped, levelMap);
  const multBefore = getLengthMultiplier(lenClamped, levelMap);
  const stepAdds = observatoryBoost
    ? getObservatoryBoostedLengthUpgradeStepAdds(lenClamped)
    : getLengthUpgradeStepAdds(lenClamped);
  const scoreAdd = stepAdds.scoreAdd;
  const multAdd = stepAdds.multAdd;
  const scoreAfter = scoreBefore + scoreAdd;
  const multAfter = multBefore + multAdd;

  fxActive.value = true;

  if (
    isFirstLength &&
    Math.max(0, Math.round(model.scoreValue.value)) === 0 &&
    Math.max(0, Math.round(model.multValue.value)) === 0
  ) {
    model.wordlenText.value = lenLabel;
    model.levelShown.value = beforeLevel;
    await waitNextTick();
    void tweenResultValues(model, scoreBefore, multBefore, 0.42 / s);
  } else {
    await playSwitchToLengthDefault({
      areaRef,
      model,
      lenLabel,
      level: beforeLevel,
      scoreBefore,
      multBefore,
      speed: s,
    });
  }

  await upgradeAnimSleep(isFirstLength ? UPGRADE_FIRST_LEAD_IN_GAP_MS : UPGRADE_STEP_GAP_MS, s);
  const levelEl = areaRef.value?.getWordlenLevelEl?.() ?? null;
  await runPanelWobbleAndBubble(levelEl, "+1", "level", s);
  model.levelShown.value = nextLevel;

  await upgradeAnimSleep(UPGRADE_STEP_GAP_MS, s);
  const scoreBoxEl = areaRef.value?.getScoreBoxEl?.() ?? null;
  await runPanelWobbleAndBubble(scoreBoxEl, `+${scoreAdd}`, "score", s);
  const scoreTweenPromise = tweenResultValues(model, scoreAfter, multBefore, UPGRADE_VALUE_TWEEN_S / s);

  await upgradeAnimSleep(UPGRADE_STEP_GAP_MS, s);
  const multBoxEl = areaRef.value?.getMultBoxEl?.() ?? null;
  await runPanelWobbleAndBubble(multBoxEl, `+${multAdd}`, "mult", backToNormalMid);
  await scoreTweenPromise;
  await tweenResultValues(model, scoreAfter, multAfter, UPGRADE_VALUE_TWEEN_S / backToNormalMid);

  if (isLastLength) {
    await waitNextTick();
    await upgradeAnimSleep(UPGRADE_FINAL_HOLD_MS, backToNormalEnd);
    await tweenResultValues(model, 0, 0, 0.75 / backToNormalEnd);
    fxActive.value = false;
  }
}
