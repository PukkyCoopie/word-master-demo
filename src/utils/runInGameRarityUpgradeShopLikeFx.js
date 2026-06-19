/**
 * 局内：与 ShopPanel.playOneRarityUpgrade 一致的顶栏稀有度升级动效（不含商店、不含扣款）。
 * 调用方须已写入 rarityLevels，再传入 beforeLevel 供展示从旧级到新级。
 */
import gsap from "gsap";
import {
  getRarityBonusForRarity,
  getRarityMultBonusForRarity,
  RARITY_UPGRADE_BALANCE,
} from "../composables/useScoring.js";
import { shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";
import { bubbleAtShopPanel } from "../game/popupBubbleFx.js";
import { createWobbleHighlightTimeline } from "../game/wobbleHighlightFx.js";

const RARITY_RESULT_LINE = Object.freeze({
  common: "稀有度 · 普通",
  rare: "稀有度 · 稀有",
  epic: "稀有度 · 史诗",
  legendary: "稀有度 · 传说",
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bubbleAt(targetEl, text, kind) {
  bubbleAtShopPanel(targetEl, text, kind);
}

function wobblePanelLikeScoreSlot(el, delayS = 0, speed = 1) {
  if (!el) return;
  const s = Math.max(0.01, Number(speed) || 1);
  if (shouldSkipDecorativeMotion()) {
    const tl = createWobbleHighlightTimeline(el, { delayS });
    if (tl) tl.timeScale(s);
    return;
  }
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
  await sleep(Math.round(145 / s));
  bubbleAt(panelEl, text, kind);
}

function popSettle(el, speed = 1) {
  if (!el) return;
  const s = Math.max(0.01, Number(speed) || 1);
  gsap.killTweensOf(el);
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

/**
 * @param {{
 *   areaRef: import('vue').Ref<{ getWordlenMainEl?: () => HTMLElement | null, getWordlenLevelEl?: () => HTMLElement | null, getScoreBoxEl?: () => HTMLElement | null, getMultBoxEl?: () => HTMLElement | null } | null | undefined>,
 *   model: { wordlenText: import('vue').Ref<string>, levelShown: import('vue').Ref<number>, scoreValue: import('vue').Ref<number>, multValue: import('vue').Ref<number> },
 *   line: string,
 *   level: number,
 *   scoreBefore: number,
 *   multBefore: number,
 *   speed?: number,
 * }} opts
 */
async function playSwitchToRarityDefault(opts) {
  const { areaRef, model, line, level, scoreBefore, multBefore, speed = 1 } = opts;
  const s = Math.max(0.01, Number(speed) || 1);
  model.wordlenText.value = line;
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
 *   rarityKey: string,
 *   beforeLevel: number,
 *   speed?: number,
 *   isFirstRarity?: boolean,
 *   isLastRarity?: boolean,
 * }} opts
 */
export async function runInGameRarityUpgradeShopLikeFx(opts) {
  const {
    areaRef,
    model,
    fxActive,
    waitNextTick,
    rarityKey,
    beforeLevel,
    speed = 1,
    isFirstRarity = true,
    isLastRarity = true,
  } = opts;
  const s = Math.max(0.01, Number(speed) || 1);
  const backToNormalMid = isLastRarity ? s - (s - 1) * 0.5 : s;
  const backToNormalEnd = isLastRarity ? 1 : s;
  const rk = String(rarityKey ?? "common");
  const line = RARITY_RESULT_LINE[rk] ?? `稀有度 · ${rk}`;
  const nextLevel = beforeLevel + 1;
  const levelMapBefore = { [rk]: beforeLevel };
  const levelMapAfter = { [rk]: nextLevel };
  const scoreBefore = getRarityBonusForRarity(rk, levelMapBefore);
  const multBefore = getRarityMultBonusForRarity(rk, levelMapBefore);
  const scoreAdd = Number(RARITY_UPGRADE_BALANCE[rk]?.scorePerLevel) || 0;
  const scoreAfter = scoreBefore + scoreAdd;
  const multAfter = getRarityMultBonusForRarity(rk, levelMapAfter);
  const multDelta = multAfter - multBefore;

  fxActive.value = true;

  if (
    isFirstRarity &&
    Math.max(0, Math.round(model.scoreValue.value)) === 0 &&
    Math.max(0, Math.round(model.multValue.value)) === 0
  ) {
    model.wordlenText.value = line;
    model.levelShown.value = beforeLevel;
    await waitNextTick();
    void tweenResultValues(model, scoreBefore, multBefore, 0.42 / s);
  } else if (isFirstRarity) {
    model.wordlenText.value = line;
    model.levelShown.value = beforeLevel;
    model.scoreValue.value = Math.max(0, Math.round(scoreBefore));
    model.multValue.value = Math.max(0, Math.round(multBefore));
    await waitNextTick();
    const wordlenMainEl = areaRef.value?.getWordlenMainEl?.() ?? null;
    popSettle(wordlenMainEl, s);
    await sleep(Math.round(120 / s));
  } else {
    await playSwitchToRarityDefault({
      areaRef,
      model,
      line,
      level: beforeLevel,
      scoreBefore,
      multBefore,
      speed: s,
    });
  }

  const levelEl = areaRef.value?.getWordlenLevelEl?.() ?? null;
  const scoreBoxEl = areaRef.value?.getScoreBoxEl?.() ?? null;
  const multBoxEl = areaRef.value?.getMultBoxEl?.() ?? null;

  const stepGapMs = 200;
  const firstRarityLeadInGapMs = 160;
  const valueTweenS = 0.46;
  await sleep(Math.round((isFirstRarity ? firstRarityLeadInGapMs : stepGapMs) / s));
  await runPanelWobbleAndBubble(levelEl, "+1", "level", s);
  model.levelShown.value = nextLevel;

  await sleep(Math.round(stepGapMs / s));
  const scoreTweenPromise = tweenResultValues(model, scoreAfter, multBefore, valueTweenS / s);
  await runPanelWobbleAndBubble(scoreBoxEl, `+${scoreAdd}`, "score", s);

  await sleep(Math.round(stepGapMs / s));
  if (multDelta > 0) {
    await runPanelWobbleAndBubble(multBoxEl, `+${multDelta}`, "mult", backToNormalMid);
  }
  await scoreTweenPromise;
  await tweenResultValues(model, scoreAfter, multAfter, valueTweenS / backToNormalMid);

  if (isLastRarity) {
    fxActive.value = false;
    await waitNextTick();
    await sleep(Math.round(460 / backToNormalEnd));
    await tweenResultValues(model, 0, 0, 0.75 / backToNormalEnd);
  }
}
