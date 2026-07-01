import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";
import { TREASURE_HOOKS_BY_ID } from "../treasures/treasureRegistry.js";
import { isIceMaterialPostLetterStep, ICE_MATERIAL_SCORE_MULT_MUL } from "./iceMaterialScoring.js";
import { isLuckyMaterialPostLetterStep } from "./luckyMaterialScoring.js";
import {
  getSubmitScoringBeatSpeed,
  getSubmitScoringTotalBeats,
  scoringSleep,
} from "./submitScoringTiming.js";
import { persistTileIntrinsicTreasureCue } from "./persistTileIntrinsicTreasureCue.js";
import { addScoreAddBank } from "../treasures/treasureBankHelpers.js";
import {
  TREASURE_ACCESSORY_DROP,
  TREASURE_ACCESSORY_FIRE,
  TREASURE_ACCESSORY_WRENCH,
} from "../game/treasureAccessories.js";
import {
  TILE_ACCESSORY_COIN,
  TILE_ACCESSORY_LEVEL_UPGRADE,
  TILE_ACCESSORY_REWIND,
  TILE_ACCESSORY_VIP_DIAMOND,
} from "../game/tileAccessories.js";
import {
  TILE_TREASURE_ACCESSORY_DROP_SCORE_ADD,
  TILE_TREASURE_ACCESSORY_FIRE_MULT_ADD,
  TILE_TREASURE_ACCESSORY_WRENCH_MULT_MUL,
} from "../treasures/treasureAccessoryScoring.js";
import {
  iterTreasureHookContributions,
  shouldTreasureRunAccumulationMutate,
} from "./treasureBlueprintMirror.js";
import {
  collectAfterTreasureContributionBoostStep,
  isMeaningfulTreasureBoostStep,
} from "../treasures/treasureContributionBoost.js";
import { snapshotMaxIntrinsicGainsFromTile } from "./tileIntrinsicGains.js";
import {
  getWordLengthScoreForTableLen,
  scaleLengthContributionForBoss,
  getLengthMultiplier,
  LETTER_RARITY_ORDER,
} from "../composables/useScoring.js";

import { submitWordLeaveStagger } from "./submitWordLeaveStagger.js";
import {
  getSeedLengthTableLenBeforeAppend,
  runNewspaperAppendSequence,
} from "./newspaperSubmitAnim.js";
import { isNewspaperTempTile } from "../treasures/items/treasure_140.js";
import { findGridCellByTileId } from "./gridTileCellLookup.js";
import { resolveSubmittedWordForHooks } from "./resolvedWordTileMapping.js";
import { resolveGridEffectTriggerCount } from "./gridEffectTriggerCount.js";
import {
  addScore,
  interpolateScore,
  scoreGte,
  scoreIsPositive,
  subtractScore,
} from "../utils/scoreInteger.js";

/** 记分步间等待、气泡延迟等统一再 ×0.7（比上一版缩短 30%） */
export const SCORING_GAP_SCALE = 0.7;
/** 每个 letter / treasure 气泡与 wobble 后的间隔 */
export const SCORING_STEP_BEAT_MS = Math.round(270 * 1.2 * SCORING_GAP_SCALE);
/** 同一槽位两步之间、切下一字母前短休 */
export const SCORING_LETTER_GAP_MS = Math.round(50 * 1.2 * SCORING_GAP_SCALE);
/** 额外整轮记分前：宝藏 wobble 结束后再休一拍 */
export const SCORING_EXTRA_LETTER_PASS_GAP_MS = SCORING_LETTER_GAP_MS;
/** 宝藏槽 ref 未就绪时的替代停顿 */
export const SCORING_TREASURE_FALLBACK_MS = Math.round(200 * 1.2 * SCORING_GAP_SCALE);
/** ±分/倍率小气泡：缩小→放大进程到 80% 后再出现 */
export const SCORING_BUBBLE_POP_DELAY_MS = Math.round(
  (0.11 + 0.15) * 0.8 * 1000 * SCORING_GAP_SCALE,
);
/** 公式区总分初显后，再触发最终得分宝藏步（电池等） */
export const FORMULA_TOTAL_HOLD_BEFORE_FINAL_SCORE_MS = Math.round(360 * SCORING_GAP_SCALE);
/** 最终得分步结束后，再让本手分汇入顶栏 score-value-wrap */
export const FINAL_SCORE_HOLD_BEFORE_HEADER_ROLL_MS = Math.round(420 * SCORING_GAP_SCALE);
/** 通关当手：首格佩戴钻石配饰 → 升级该字母稀有度对应的全局等级。 */
export const CLEAR_WIN_ACCESSORY_UPGRADE_FX_DELAY_MS = 300;
/** 关卡通关时：棋盘上每个黄金材质字母块 wobble + 金币色 $ 气泡 */
export const GOLD_MATERIAL_CLEAR_BONUS_DOLLARS = 3;
/** 字母块钱币配饰：在该字母轮到计分时触发 $3 */
export const COIN_ACCESSORY_SCORE_BONUS_DOLLARS = 3;


export { submitWordLeaveStagger } from "./submitWordLeaveStagger.js";

/**
 * @param {object} deps
 * @param {object} deps.refs Vue ref objects (do not destructure)
 * @param {object} deps.getDom DOM getters
 * @param {ReturnType<import('./scoreBubbleFx.js').createScoreBubbleFx>} deps.fx
 * @param {object} deps.callbacks game logic hooks
 * @param {ReturnType<import('./gridDropAnim.js').createGridDropAnim>} deps.gridDropAnim
 * @param {ReturnType<import('./submitTreasureSlotFx.js').createSubmitTreasureSlotFx> & ReturnType<import('./submitTileLeaveAnim.js').createSubmitTileLeaveAnim>} deps.submitFx
 * @param {object} deps.constants
 * @param {typeof import('vue').nextTick} deps.nextTick
 * @param {(ms: number) => Promise<void>} deps.sleep
 */
export function createSubmitScoringAnimController(deps) {
  const { refs, getDom, fx, callbacks, gridDropAnim, submitFx, constants, nextTick, sleep } = deps;
  const gsapLib = deps.gsap ?? gsap;

  const { SHOW_SUBMIT_TRANSLATION, ROWS, COLS } = constants;

  const {
    pulseFill,
    pulseFormulaPanelNum,
    pulseFormulaMultMultiplyBurst,
    showScoreBubble,
    wobbleScoreSlot,
    createWobbleScoreSlotTimeline,
    awaitWobbleScoreSlotTimeline,
    triggerAccessoryChipRipple,
    showMultMultiplyBubble,
    scheduleSmallPlusBubbleOutro,
    scheduleMultMultiplyBubbleOutro,
    formatMoneyBubbleLabel,
    clearAllTreasureSlotWobbleFront,
    scoreBubbleAnchorRect,
  } = fx;

  const getResultScoreNumEl = () => getDom.getResultScoreNumEl();
  const getResultMultNumEl = () => getDom.getResultMultNumEl();
  const getResultTotalEl = () => getDom.getResultTotalEl();
  const getOwnedTreasureBarFxEl = (i) => getDom.getOwnedTreasureBarFxEl(i);
  const getGridTileElByIndex = (i) => getDom.getGridTileElByIndex(i);

  /** @type {DOMRect | null} 当前逐字计分步内词槽气泡锚点（同字母多泡复用，避免每泡 measure） */
  let scoringWordSlotBubbleAnchor = null;

  function showWordSlotBubble(slotEl, text, kind, speed = 1, bubbleZIndex = 350) {
    return showScoreBubble(slotEl, text, kind, speed, bubbleZIndex, scoringWordSlotBubbleAnchor);
  }

  function showWordSlotMultMultiplyBubble(slotEl, factor, speed = 1) {
    return showMultMultiplyBubble(slotEl, factor, speed, scoringWordSlotBubbleAnchor);
  }

async function expandSubmitTranslation() {
  if (!SHOW_SUBMIT_TRANSLATION) return;
  if (!refs.submitTranslationLines.value.length) return;
  await nextTick();
  const wrap = getDom.getWordTranslationWrap();
  const inner = getDom.getWordTranslationInner();
  if (!wrap || !inner) return;
  /* 同一帧内立刻收起，避免先画出整段译文再收高度（此前多了一帧 rAF 会闪全文） */
  wrap.style.overflow = "hidden";
  wrap.style.height = "0";
  wrap.style.opacity = "0";
  gsapLib.killTweensOf(wrap);
  await nextTick();
  const h = inner.scrollHeight;
  if (h <= 0) {
    wrap.style.height = "";
    wrap.style.overflow = "";
    wrap.style.opacity = "";
    return;
  }
  await new Promise((res) => {
    gsapLib.fromTo(
      wrap,
      { height: 0, opacity: 0 },
      {
        height: h,
        opacity: 1,
        duration: 0.42,
        ease: EASE_TRANSFORM,
        onComplete: () => {
          wrap.style.height = "auto";
          wrap.style.overflow = "";
          wrap.style.opacity = "";
          res();
        },
      }
    );
  });
}

function collapseSubmitTranslation() {
  if (!SHOW_SUBMIT_TRANSLATION) return Promise.resolve();
  if (!refs.submitTranslationLines.value.length) return Promise.resolve();
  const wrap = getDom.getWordTranslationWrap();
  if (!wrap) {
    refs.submitTranslationLines.value = [];
    return Promise.resolve();
  }
  wrap.style.overflow = "hidden";
  const h = wrap.offsetHeight || innerScrollHeight(wrap);
  if (h <= 0) {
    refs.submitTranslationLines.value = [];
    wrap.style.height = "";
    wrap.style.overflow = "";
    return Promise.resolve();
  }
  wrap.style.height = `${h}px`;
  return new Promise((res) => {
    nextTick().then(() => {
      gsapLib.to(wrap, {
        height: 0,
        duration: 0.38,
        ease: EASE_TRANSFORM,
        onComplete: () => {
          refs.submitTranslationLines.value = [];
          wrap.style.height = "";
          wrap.style.overflow = "";
          res();
        },
      });
    });
  });
}

function innerScrollHeight(wrap) {
  const inner = wrap.querySelector(".word-translation-inner");
  return inner ? inner.scrollHeight : 0;
}

/** Boss debuff / 软违规：弹出「跳过」后与单步 +分 气泡相同的步间、切下一字母间隔 */
async function runLetterScoringSkipStep(slotEl, speed = 1, slotIndex = -1) {
  if (!slotEl) return;
  const sp = Math.max(0.01, Number(speed) || 1);
  if (slotIndex >= 0) {
    refs.scoringLetterIndex.value = slotIndex;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    scoringWordSlotBubbleAnchor = scoreBubbleAnchorRect(slotEl);
  }
  wobbleScoreSlot(slotEl, sp);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  const bubble = showWordSlotBubble(slotEl, "跳过", "skip", sp);
  scheduleSmallPlusBubbleOutro(bubble, sp);
  await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  if (slotIndex >= 0) {
    refs.scoringLetterIndex.value = -1;
    scoringWordSlotBubbleAnchor = null;
  }
  await scoringSleep(SCORING_LETTER_GAP_MS, sp);
}

/**
 * 按字母稀有度的宝藏倍率（铅笔/钢笔 +n；阳光等 ×n）：宝藏槽与词槽同时 wobble，字母上出倍率气泡。
 * @param {object} part letterParts[i]
 * @param {HTMLElement | null | undefined} slotEl
 * @param {{ treasureId: string, multDelta?: number, multMul?: number, bubbleLabel: string, rarity?: string, active: boolean, slotIndex?: number, matchesPart?: (part: object) => boolean }} cfg
 */
async function runLetterRarityTreasureMultStep(part, slotEl, cfg, speed = 1) {
  if (!cfg.active || !slotEl) return false;
  if (typeof cfg.matchesPart === "function") {
    if (!cfg.matchesPart(part)) return false;
  } else if (cfg.rarity != null && part.rarity !== cfg.rarity) {
    return false;
  }
  const multMul = Number(cfg.multMul) || 0;
  const multDelta = Number(cfg.multDelta) || 0;
  if (multMul <= 1 && multDelta <= 0) return false;
  const sp = Math.max(0.01, Number(speed) || 1);
  const ti =
    typeof cfg.slotIndex === "number" && cfg.slotIndex >= 0
      ? cfg.slotIndex
      : callbacks.findFirstOwnedTreasureSlotIndex(cfg.treasureId);
  const tel = ti >= 0 ? getOwnedTreasureBarFxEl(ti) : null;
  if (tel) {
    refs.scoringTreasureBarIndex.value = ti;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    wobbleScoreSlot(tel, sp);
  }
  wobbleScoreSlot(slotEl, sp);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  if (multMul > 1) {
    refs.animMultTotal.value = Math.round(refs.animMultTotal.value * multMul);
    const bubbleEl = showWordSlotMultMultiplyBubble(slotEl, multMul, sp);
    await nextTick();
    pulseFormulaMultMultiplyBurst(getResultMultNumEl());
    scheduleMultMultiplyBubbleOutro(bubbleEl, sp);
    await scoringSleep(SCORING_STEP_BEAT_MS + 120, sp);
  } else {
    refs.animMultTotal.value += multDelta;
    const bubbleEl = showWordSlotBubble(slotEl, cfg.bubbleLabel, "mult", sp);
    await nextTick();
    pulseFormulaPanelNum(getResultMultNumEl());
    scheduleSmallPlusBubbleOutro(bubbleEl, sp);
    await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  }
  refs.scoringTreasureBarIndex.value = null;
  return true;
}

/** 持有奖杯时：目标宝藏自身贡献（分/倍率/倍率倍数）后、配饰前，于该宝藏槽再 wobble + 倍率乘法气泡 */
async function runAfterTreasureContributionBoostAnim(treasureId, slotIndex, speed = 1) {
  const ownedSlotIds = refs.ownedTreasures.value.map((s) => s?.treasureId ?? null);
  const boost = collectAfterTreasureContributionBoostStep(
    {
      ownedSlotTreasureIds: ownedSlotIds,
      treasureRun: refs.treasureRunState.value,
    },
    ownedSlotIds,
    { treasureId: String(treasureId ?? ""), slotIndex },
  );
  if (!isMeaningfulTreasureBoostStep(boost)) return false;
  const multMul = Number(boost.multMul) || 0;
  const sp = Math.max(0.01, Number(speed) || 1);
  const ti =
    typeof slotIndex === "number" && slotIndex >= 0
      ? slotIndex
      : callbacks.findFirstOwnedTreasureSlotIndex(treasureId);
  refs.scoringTreasureBarIndex.value = ti >= 0 ? ti : null;
  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));
  const tel = ti >= 0 ? getOwnedTreasureBarFxEl(ti) : null;
  if (tel) {
    if (multMul >= 2) callbacks.triggerHaptic("scoreTotal");
    wobbleScoreSlot(tel, sp);
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    refs.animMultTotal.value = Math.round(refs.animMultTotal.value * multMul);
    await nextTick();
    const bubbleX = showMultMultiplyBubble(tel, multMul, sp);
    pulseFormulaMultMultiplyBurst(getResultMultNumEl());
    scheduleMultMultiplyBubbleOutro(bubbleX, sp);
    await scoringSleep(SCORING_STEP_BEAT_MS + 120, sp);
  } else {
    await scoringSleep(SCORING_TREASURE_FALLBACK_MS, sp);
    refs.animMultTotal.value = Math.round(refs.animMultTotal.value * multMul);
    await nextTick();
    pulseFormulaMultMultiplyBurst(getResultMultNumEl());
  }
  refs.scoringTreasureBarIndex.value = null;
  return true;
}

/** 宝藏提供的加分：紧跟该字母「稀有度基础分」动画之后，与词槽同节拍 */
async function runLetterTreasureScoreBurst(
  slotEl,
  treasureSlotIndex,
  amount,
  bubbleText,
  speed = 1,
  persistCtx = null,
) {
  if (!slotEl || amount <= 0) return false;
  const sp = Math.max(0.01, Number(speed) || 1);
  const tel = treasureSlotIndex >= 0 ? getOwnedTreasureBarFxEl(treasureSlotIndex) : null;
  const tid = treasureSlotIndex >= 0 ? refs.ownedTreasures.value[treasureSlotIndex]?.treasureId : null;

  let slotPillAug = undefined;
  if (tid && persistCtx?.realTile) {
    const did = persistTileIntrinsicTreasureCue({
      treasureId: tid,
      realTile: persistCtx.realTile,
      scoringTile: persistCtx.scoringTile,
      band: "score",
      delta: amount,
    });
    if (did) {
      callbacks.touchGrid();
      await nextTick();
      slotPillAug = { scorePill: true };
    }
  }

  if (treasureSlotIndex >= 0) {
    refs.scoringTreasureBarIndex.value = treasureSlotIndex;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
  }
  if (tel) wobbleScoreSlot(tel, sp);
  const slotTl = createWobbleScoreSlotTimeline(slotEl, slotPillAug);
  if (slotTl) {
    slotTl.timeScale(sp);
    slotTl.play(0);
  }
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  refs.animScoreSum.value += amount;
  const bubbleS = showWordSlotBubble(slotEl, bubbleText, "score", sp);
  await nextTick();
  pulseFormulaPanelNum(getResultScoreNumEl());
  scheduleSmallPlusBubbleOutro(bubbleS, sp);
  await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  refs.scoringTreasureBarIndex.value = null;
  return true;
}

/** 宝藏提供的倍率加法：紧跟该字母「字母块自带倍率」动画之后，再接铅笔～王冠 */
async function runLetterTreasureMultBurst(
  slotEl,
  treasureSlotIndex,
  amount,
  bubbleText,
  speed = 1,
  persistCtx = null,
) {
  if (!slotEl || amount <= 0) return false;
  const sp = Math.max(0.01, Number(speed) || 1);
  const tel = treasureSlotIndex >= 0 ? getOwnedTreasureBarFxEl(treasureSlotIndex) : null;
  const tid = treasureSlotIndex >= 0 ? refs.ownedTreasures.value[treasureSlotIndex]?.treasureId : null;

  let slotPillAug = undefined;
  if (tid && persistCtx?.realTile) {
    const did = persistTileIntrinsicTreasureCue({
      treasureId: tid,
      realTile: persistCtx.realTile,
      scoringTile: persistCtx.scoringTile,
      band: "mult",
      delta: amount,
    });
    if (did) {
      callbacks.touchGrid();
      await nextTick();
      slotPillAug = { multPill: true };
    }
  }

  if (treasureSlotIndex >= 0) {
    refs.scoringTreasureBarIndex.value = treasureSlotIndex;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
  }
  if (tel) wobbleScoreSlot(tel, sp);
  const slotTl = createWobbleScoreSlotTimeline(slotEl, slotPillAug);
  if (slotTl) {
    slotTl.timeScale(sp);
    slotTl.play(0);
  }
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  refs.animMultTotal.value += amount;
  const bubbleM = showWordSlotBubble(slotEl, bubbleText, "mult", sp);
  await nextTick();
  pulseFormulaPanelNum(getResultMultNumEl());
  scheduleSmallPlusBubbleOutro(bubbleM, sp);
  await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  refs.scoringTreasureBarIndex.value = null;
  return true;
}

async function runSlotPerLetterTreasureScoreStep(
  treasureSlotIndex,
  effectiveTreasureId,
  part,
  letterIndex,
  slotEl,
  speed = 1,
  realTile = null,
  scoringVisitIndex = 0,
  hookSource = "self",
  scoringTile = null,
) {
  const tid = String(effectiveTreasureId ?? "");
  if (!tid || !slotEl) return false;
  const hooks = TREASURE_HOOKS_BY_ID.get(tid);
  const ownedSlotIds = refs.ownedTreasures.value.map((s) => s?.treasureId ?? null);
  const ctx = {
    ownedSlotTreasureIds: ownedSlotIds,
    treasureRun: refs.treasureRunState.value,
    scoringVisitIndex,
  };
  const cue = hooks?.getPerLetterScoreCue?.(ctx, part, letterIndex);
  if (!cue?.delta) return false;
  if (hooks?.perLetterScoreCueDepositsTreasureBank) {
    if (
      shouldTreasureRunAccumulationMutate(
        ownedSlotIds,
        treasureSlotIndex,
        tid,
        hookSource,
      )
    ) {
      addScoreAddBank(refs.treasureRunState.value, tid, cue.delta);
    }
    if (hooks?.showPerLetterScoreCueBubble === false) {
      await callbacks.wobbleGameTreasureSlot(treasureSlotIndex);
      return true;
    }
    await submitFx.playTreasureSlotScoreBurstAtPeak(treasureSlotIndex, cue.delta);
    return true;
  }
  return runLetterTreasureScoreBurst(
    slotEl,
    treasureSlotIndex,
    cue.delta,
    cue.label ?? `+${cue.delta}`,
    speed,
    realTile ? { realTile, scoringTile: scoringTile ?? undefined } : null,
  );
}

async function runSlotPerLetterTreasureMultStep(
  treasureSlotIndex,
  effectiveTreasureId,
  part,
  letterIndex,
  slotEl,
  speed = 1,
  realTile = null,
  scoringTile = null,
) {
  const tid = String(effectiveTreasureId ?? "");
  if (!tid || !slotEl) return false;
  const ctx = { ownedSlotTreasureIds: refs.ownedTreasures.value.map((s) => s?.treasureId ?? null) };
  const cue = TREASURE_HOOKS_BY_ID.get(tid)?.getPerLetterMultCue?.(ctx, part, letterIndex);
  if (!cue?.delta) return false;
  return runLetterTreasureMultBurst(
    slotEl,
    treasureSlotIndex,
    cue.delta,
    cue.label ?? `+${cue.delta}`,
    speed,
    realTile ? { realTile, scoringTile: scoringTile ?? undefined } : null,
  );
}

/** 字母块宝藏配饰「水滴」：该字母每次计分时 +50 分（与 `accumulateTileTreasureAccessoryPerLetter` 一致）。 */
async function runTileTreasureAccessoryDropScoreBurst(tile, slotEl, speed = 1) {
  if (!slotEl || String(tile?.treasureAccessoryId ?? "").trim() !== TREASURE_ACCESSORY_DROP) return false;
  const sp = Math.max(0.01, Number(speed) || 1);
  wobbleScoreSlot(slotEl, sp);
  triggerAccessoryChipRipple(slotEl, sp, true);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  refs.animScoreSum.value += TILE_TREASURE_ACCESSORY_DROP_SCORE_ADD;
  const bubble = showWordSlotBubble(
    slotEl,
    `+${TILE_TREASURE_ACCESSORY_DROP_SCORE_ADD}`,
    "score",
    sp,
  );
  await nextTick();
  pulseFormulaPanelNum(getResultScoreNumEl());
  scheduleSmallPlusBubbleOutro(bubble, sp);
  await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  return true;
}

/** 字母块宝藏配饰「火焰」：该字母每次计分时 +10 倍率。 */
async function runTileTreasureAccessoryFireMultBurst(tile, slotEl, speed = 1) {
  if (!slotEl || String(tile?.treasureAccessoryId ?? "").trim() !== TREASURE_ACCESSORY_FIRE) return false;
  const sp = Math.max(0.01, Number(speed) || 1);
  wobbleScoreSlot(slotEl, sp);
  triggerAccessoryChipRipple(slotEl, sp, true);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  refs.animMultTotal.value += TILE_TREASURE_ACCESSORY_FIRE_MULT_ADD;
  const bubble = showWordSlotBubble(slotEl, `+${TILE_TREASURE_ACCESSORY_FIRE_MULT_ADD}`, "mult", sp);
  await nextTick();
  pulseFormulaPanelNum(getResultMultNumEl());
  scheduleSmallPlusBubbleOutro(bubble, sp);
  await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  return true;
}

/** 碎冰块：该字母每次计分时 ×2.5 倍率（晚于本体与宝藏 +分/+倍率，早于宝藏 ×n）。 */
async function runIceMaterialMultBurst(tile, slotEl, speed = 1) {
  if (!slotEl || tile?.materialId !== "ice" || callbacks.isBossTileDebuffed(tile)) return false;
  const sp = Math.max(0.01, Number(speed) || 1);
  const multMul = ICE_MATERIAL_SCORE_MULT_MUL;
  wobbleScoreSlot(slotEl, sp);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  refs.animMultTotal.value = Math.round(refs.animMultTotal.value * multMul);
  const bubbleX = showWordSlotMultMultiplyBubble(slotEl, multMul, sp);
  await nextTick();
  callbacks.triggerHaptic("scoreTotal");
  pulseFormulaMultMultiplyBurst(getResultMultNumEl());
  scheduleMultMultiplyBubbleOutro(bubbleX, sp);
  await scoringSleep(SCORING_STEP_BEAT_MS + 120, sp);
  return true;
}

/** 幸运块：掷中 +20 倍率（晚于本体倍率，早于宝藏 +倍率；存在字后 ×倍率时仅播动效，公式区在字后步同步）。 */
async function runLuckyMaterialMultAddBurst(tile, slotEl, luckyRoll, speed = 1, deferFormulaUpdate = false) {
  if (!slotEl || tile?.materialId !== "lucky" || callbacks.isBossTileDebuffed(tile)) return false;
  const multAdd = Math.max(0, Math.floor(Number(luckyRoll?.multAdd) || 0));
  if (multAdd <= 0) return false;
  const sp = Math.max(0.01, Number(speed) || 1);
  wobbleScoreSlot(slotEl, sp);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  if (!deferFormulaUpdate) {
    refs.animMultTotal.value += multAdd;
  }
  const bubbleM = showWordSlotBubble(slotEl, `+${Math.round(multAdd)}`, "mult", sp);
  if (!deferFormulaUpdate) {
    await nextTick();
    pulseFormulaPanelNum(getResultMultNumEl());
  }
  scheduleSmallPlusBubbleOutro(bubbleM, sp);
  await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  return true;
}

/** 字母块宝藏配饰「扳手」：该字母每次计分时 ×1.5 倍率。 */
async function runTileTreasureAccessoryWrenchMultBurst(tile, slotEl, speed = 1) {
  if (!slotEl || String(tile?.treasureAccessoryId ?? "").trim() !== TREASURE_ACCESSORY_WRENCH) return false;
  const sp = Math.max(0.01, Number(speed) || 1);
  const multMul = TILE_TREASURE_ACCESSORY_WRENCH_MULT_MUL;
  wobbleScoreSlot(slotEl, sp);
  triggerAccessoryChipRipple(slotEl, sp, true);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  refs.animMultTotal.value = Math.round(refs.animMultTotal.value * multMul);
  const bubbleX = showWordSlotMultMultiplyBubble(slotEl, multMul, sp);
  await nextTick();
  pulseFormulaMultMultiplyBurst(getResultMultNumEl());
  scheduleMultMultiplyBubbleOutro(bubbleX, sp);
  await scoringSleep(SCORING_STEP_BEAT_MS + 120, sp);
  return true;
}

/** 字母块配饰「钱币」：该字母轮到计分时，wobble 并弹出 $ 气泡。 */
async function runLetterAccessoryCoinMoneyBurst(tile, slotEl, speed = 1) {
  if (!slotEl || tile?.accessoryId !== TILE_ACCESSORY_COIN) return;
  const sp = Math.max(0.01, Number(speed) || 1);
  wobbleScoreSlot(slotEl, sp);
  triggerAccessoryChipRipple(slotEl, sp);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  const bubble = showWordSlotBubble(
    slotEl,
    formatMoneyBubbleLabel(COIN_ACCESSORY_SCORE_BONUS_DOLLARS),
    "money",
    sp,
  );
  scheduleSmallPlusBubbleOutro(bubble, sp);
  refs.money.value += COIN_ACCESSORY_SCORE_BONUS_DOLLARS;
  await scoringSleep(SCORING_STEP_BEAT_MS, sp);
}

/**
 * 逐字金币 cue（如摇杆）：该字母计分后 wobble 并弹出 $ 气泡；每次 visit 独立判定。
 * @param {object} detailed
 * @param {number} letterIndex
 * @param {number} luckyVisitIndex
 */
async function runPerLetterTreasureMoneyCues(detailed, letterIndex, luckyVisitIndex, slotEl, speed = 1) {
  const cues = detailed.perLetterMoneyCuesByLetter?.[letterIndex]?.[luckyVisitIndex] ?? [];
  if (!cues.length || !slotEl) return false;
  const sp = Math.max(0.01, Number(speed) || 1);
  let played = false;
  for (const cue of cues) {
    const moneyAmt = Math.max(0, Math.round(Number(cue.money) || 0));
    if (moneyAmt <= 0) continue;
    if (typeof cue.slotIndex === "number" && cue.slotIndex >= 0) {
      refs.scoringTreasureBarIndex.value = cue.slotIndex;
      await nextTick();
      await new Promise((r) => requestAnimationFrame(r));
      const tel = getOwnedTreasureBarFxEl(cue.slotIndex);
      if (tel) wobbleScoreSlot(tel, sp);
    }
    wobbleScoreSlot(slotEl, sp);
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    const bubble = showWordSlotBubble(slotEl, formatMoneyBubbleLabel(moneyAmt), "money", sp);
    scheduleSmallPlusBubbleOutro(bubble, sp);
    refs.money.value += moneyAmt;
    await scoringSleep(SCORING_STEP_BEAT_MS, sp);
    refs.scoringTreasureBarIndex.value = null;
    played = true;
  }
  return played;
}

/**
 * 单字母一轮：与 **tile 本体**同拍的只有——稀有度基础分 + tile/材质平面分 + tile 角标分；以及声明了
 * `mergeLetter*IntoIntrinsic*` 的宝藏（当前：海螺平面分、回形针倍率加法）。元音倍率、某字母加分等仍走单独步。
 * 顺序：上述「本体同一拍」→ 水滴 +50 → 其余逐字加分宝藏 → 逐字金币宝藏（摇杆等）→ 钱币 →「本体倍率」→ 幸运 +20 倍率 → 火焰 +10 → 其余逐字 +倍率宝藏 → 铅笔等 +倍率 → 碎冰 ×2.5 → 扳手 ×1.5 → 阳光等 ×倍率 → 幸运金币。
 * （宝藏槽火焰/水滴/扳手仍在整词字后步，见 postLetterTreasureSteps。）
 */
async function runSingleLetterScoringStep(tile, i, detailed, speed = 1, luckyVisitIndex = 0) {
  const sp = Math.max(0.01, Number(speed) || 1);
  const slotEl = getDom.getWordSlotEl(i);
  if (!slotEl) return;
  if (callbacks.isBossDebuffedSubmitTile(tile)) {
    await runLetterScoringSkipStep(slotEl, sp, i);
    return;
  }
  const part = detailed.letterParts[i];
  const luckyRoll = detailed.luckyMaterialRollsByLetter?.[i]?.[luckyVisitIndex] ?? null;
  /** 本字母本轮是否已播过词槽「逐字」缩放 wobble（用于幸运金币：尽量与已有分/倍率步同拍，避免单独再晃一格） */
  let wordSlotIntrinsicWobblePlayed = false;
  refs.scoringLetterIndex.value = i;
  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));
  scoringWordSlotBubbleAnchor = scoreBubbleAnchorRect(slotEl);

  if (callbacks.bossSlugForMechanics() === "the_tooth" && detailed.bossSoftViolation !== true && luckyVisitIndex === 0) {
    if (getDom.getBossTapeStrip()?.tryPlaySubmitToothCue()) {
      await callbacks.notifyBossRestrictionTreasures("the_tooth");
    }
    wobbleScoreSlot(slotEl, sp);
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    refs.money.value = callbacks.applyWalletDeltaClamped(refs.money.value, -1, refs.runWalletFloor.value);
    const bubbleTooth = showWordSlotBubble(slotEl, "-$1", "money", sp);
    scheduleSmallPlusBubbleOutro(bubbleTooth, sp);
    await scoringSleep(SCORING_STEP_BEAT_MS * 0.55, sp);
  }

  const realTile = callbacks.resolveRealSubmitTileForWordSlot(i, tile);
  const { sb: liveTileScoreBonus, mb: liveTileMultBonus } = realTile
    ? snapshotMaxIntrinsicGainsFromTile(realTile)
    : {
        sb: Math.max(0, Math.floor(Number(part.tileScoreBonus) || 0)),
        mb: Math.max(0, Math.round(Number(part.tileLetterMultBonus) || 0)),
      };

  const ownedSlotIds = refs.ownedTreasures.value.map((s) => s?.treasureId ?? null);
  const ctxScoreMerge = {
    ownedSlotTreasureIds: ownedSlotIds,
    treasureRun: refs.treasureRunState.value,
    scoringVisitIndex: luckyVisitIndex,
  };
  /** @type {{ si: number, delta: number, label?: string, treasureId: string, source: "self" | "blueprint" }[]} */
  const mergedIntrinsicScoreSlots = [];
  for (const { slotIndex: si, treasureId: tid, source } of iterTreasureHookContributions(ownedSlotIds)) {
    const hooks = TREASURE_HOOKS_BY_ID.get(tid);
    if (!hooks?.mergeLetterScoreCueIntoIntrinsicLetterScoreStep) continue;
    const cue = hooks.getPerLetterScoreCue?.(ctxScoreMerge, part, i);
    const d = Math.max(0, Math.floor(Number(cue?.delta) || 0));
    if (d <= 0) continue;
    mergedIntrinsicScoreSlots.push({ si, delta: d, label: cue?.label, treasureId: tid, source });
  }
  const mergedIntrinsicScoreAdd = mergedIntrinsicScoreSlots.reduce((s, x) => s + x.delta, 0);
  const baseLetterScore =
    (part.rarityBonus ?? 0) + liveTileScoreBonus + (part.materialScoreBonus ?? 0);
  /** @type {{ si: number, delta: number, treasureId: string }[]} */
  const mergedScoreBeats =
    mergedIntrinsicScoreSlots.length > 0
      ? mergedIntrinsicScoreSlots
      : baseLetterScore > 0
        ? [{ si: -1, delta: 0, treasureId: "" }]
        : [];

  for (let beatIdx = 0; beatIdx < mergedScoreBeats.length; beatIdx++) {
    const row = mergedScoreBeats[beatIdx];
    const rowHooks = row.treasureId ? TREASURE_HOOKS_BY_ID.get(row.treasureId) : null;
    const rowDelta = Math.max(0, Math.floor(Number(row.delta) || 0));
    const bankOnlyTreasureCue = !!rowHooks?.perLetterScoreCueDepositsTreasureBank;
    const wordScoreDelta = bankOnlyTreasureCue ? 0 : rowDelta;
    const stepScore = (beatIdx === 0 ? baseLetterScore : 0) + wordScoreDelta;

    if (row.treasureId && rowDelta > 0) {
      let touchedGrid = false;
      if (realTile) {
        const didPersist = persistTileIntrinsicTreasureCue({
          treasureId: row.treasureId,
          realTile,
          scoringTile: tile,
          band: "score",
          delta: rowDelta,
        });
        if (didPersist) touchedGrid = true;
      }
      if (bankOnlyTreasureCue) {
        if (shouldTreasureRunAccumulationMutate(ownedSlotIds, row.si, row.treasureId, row.source)) {
          addScoreAddBank(refs.treasureRunState.value, row.treasureId, rowDelta);
        }
      }
      if (touchedGrid) callbacks.touchGrid();
      await nextTick();
    }

    if (stepScore <= 0) {
      if (bankOnlyTreasureCue && rowDelta > 0 && row.si >= 0) {
        wordSlotIntrinsicWobblePlayed = true;
        refs.scoringTreasureBarIndex.value = row.si;
        await nextTick();
        await new Promise((r) => requestAnimationFrame(r));
        const telBank = getOwnedTreasureBarFxEl(row.si);
        if (telBank) wobbleScoreSlot(telBank, sp);
        await scoringSleep(SCORING_STEP_BEAT_MS, sp);
        refs.scoringTreasureBarIndex.value = null;
        if (row.treasureId) {
          await runAfterTreasureContributionBoostAnim(row.treasureId, row.si, sp);
        }
      }
      continue;
    }

    wordSlotIntrinsicWobblePlayed = true;
    if (row.si >= 0) {
      refs.scoringTreasureBarIndex.value = row.si;
      await nextTick();
      await new Promise((r) => requestAnimationFrame(r));
      const telS = getOwnedTreasureBarFxEl(row.si);
      if (telS) wobbleScoreSlot(telS, sp);
    }

    const scorePillAug =
      beatIdx === 0 &&
      (liveTileScoreBonus > 0 ||
        (part.materialScoreBonus ?? 0) > 0 ||
        mergedIntrinsicScoreAdd > 0);
    const slotTl = createWobbleScoreSlotTimeline(
      slotEl,
      scorePillAug ? { scorePill: true } : undefined,
    );
    if (slotTl) {
      slotTl.timeScale(sp);
      slotTl.play(0);
    }
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    refs.animScoreSum.value += stepScore;
    const bubbleS = showWordSlotBubble(slotEl, `+${Math.round(stepScore)}`, "score", sp);
    await nextTick();
    pulseFormulaPanelNum(getResultScoreNumEl());
    scheduleSmallPlusBubbleOutro(bubbleS, sp);
    await scoringSleep(SCORING_STEP_BEAT_MS, sp);
    refs.scoringTreasureBarIndex.value = null;
    if (row.treasureId && rowDelta > 0) {
      await runAfterTreasureContributionBoostAnim(row.treasureId, row.si, sp);
    }
  }

  if (await runTileTreasureAccessoryDropScoreBurst(tile, slotEl, sp)) {
    wordSlotIntrinsicWobblePlayed = true;
  }

  const mergedScoreSiSkip = new Set(mergedIntrinsicScoreSlots.map((x) => x.si));
  for (const { slotIndex: si, treasureId: tid, source } of iterTreasureHookContributions(ownedSlotIds)) {
    if (mergedScoreSiSkip.has(si)) continue;
    const didTreasureScore = await runSlotPerLetterTreasureScoreStep(
      si,
      tid,
      part,
      i,
      slotEl,
      sp,
      realTile,
      luckyVisitIndex,
      source,
      tile,
    );
    if (didTreasureScore) {
      wordSlotIntrinsicWobblePlayed = true;
      await runAfterTreasureContributionBoostAnim(tid, si, sp);
    }
  }
  if (await runPerLetterTreasureMoneyCues(detailed, i, luckyVisitIndex, slotEl, sp)) {
    wordSlotIntrinsicWobblePlayed = true;
  }
  await runLetterAccessoryCoinMoneyBurst(tile, slotEl, sp);
  if (tile?.accessoryId === TILE_ACCESSORY_COIN) wordSlotIntrinsicWobblePlayed = true;

  const ctxMultMerge = { ownedSlotTreasureIds: ownedSlotIds };
  /** @type {{ si: number, delta: number, label?: string, treasureId: string }[]} */
  const mergedIntrinsicMultSlots = [];
  for (const { slotIndex: si, treasureId: tid } of iterTreasureHookContributions(ownedSlotIds)) {
    const hooks = TREASURE_HOOKS_BY_ID.get(tid);
    if (!hooks?.mergeLetterMultCueIntoIntrinsicLetterMultStep) continue;
    const cue = hooks.getPerLetterMultCue?.(ctxMultMerge, part, i);
    const d = Math.max(0, Math.round(Number(cue?.delta) || 0));
    if (d <= 0) continue;
    mergedIntrinsicMultSlots.push({ si, delta: d, label: cue?.label, treasureId: tid });
  }
  const mergedIntrinsicMultAdd = mergedIntrinsicMultSlots.reduce((s, x) => s + x.delta, 0);
  const intrinsicLetterMult =
    (part.rarityMultBonus ?? 0) + (part.materialMultBonus ?? 0) + liveTileMultBonus;
  /** @type {{ si: number, delta: number, treasureId: string }[]} */
  const mergedMultBeats =
    mergedIntrinsicMultSlots.length > 0
      ? mergedIntrinsicMultSlots
      : intrinsicLetterMult > 0
        ? [{ si: -1, delta: 0, treasureId: "" }]
        : [];

  for (let beatIdx = 0; beatIdx < mergedMultBeats.length; beatIdx++) {
    const row = mergedMultBeats[beatIdx];
    const baseMultChunk = beatIdx === 0 ? intrinsicLetterMult : 0;
    const stepMult = baseMultChunk + Math.max(0, Math.round(Number(row.delta) || 0));
    if (stepMult <= 0) continue;

    wordSlotIntrinsicWobblePlayed = true;
    if (realTile && row.treasureId && row.delta > 0) {
      persistTileIntrinsicTreasureCue({
        treasureId: row.treasureId,
        realTile,
        scoringTile: tile,
        band: "mult",
        delta: row.delta,
      });
      callbacks.touchGrid();
      await nextTick();
    }

    if (row.si >= 0) {
      refs.scoringTreasureBarIndex.value = row.si;
      await nextTick();
      await new Promise((r) => requestAnimationFrame(r));
      const telM = getOwnedTreasureBarFxEl(row.si);
      if (telM) wobbleScoreSlot(telM, sp);
    }

    const mb = `+${Math.round(stepMult)}`;
    const multPillAug =
      beatIdx === 0 &&
      (liveTileMultBonus > 0 ||
        (Number(part.materialMultBonus) || 0) !== 0 ||
        mergedIntrinsicMultAdd > 0);
    const slotTlM = createWobbleScoreSlotTimeline(
      slotEl,
      multPillAug ? { multPill: true } : undefined,
    );
    if (slotTlM) {
      slotTlM.timeScale(sp);
      slotTlM.play(0);
    }
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    refs.animMultTotal.value += stepMult;
    const bubbleM = showWordSlotBubble(slotEl, mb, "mult", sp);
    await nextTick();
    pulseFormulaPanelNum(getResultMultNumEl());
    scheduleSmallPlusBubbleOutro(bubbleM, sp);
    await scoringSleep(SCORING_STEP_BEAT_MS, sp);
    refs.scoringTreasureBarIndex.value = null;
    if (row.treasureId && row.delta > 0) {
      await runAfterTreasureContributionBoostAnim(row.treasureId, row.si, sp);
    }
  }

  if (
    await runLuckyMaterialMultAddBurst(
      tile,
      slotEl,
      luckyRoll,
      sp,
      detailed.hasPostLetterMultMul === true,
    )
  ) {
    wordSlotIntrinsicWobblePlayed = true;
  }

  if (await runTileTreasureAccessoryFireMultBurst(tile, slotEl, sp)) {
    wordSlotIntrinsicWobblePlayed = true;
  }

  const mergedMultSiSkip = new Set(mergedIntrinsicMultSlots.map((x) => x.si));
  for (const { slotIndex: si, treasureId: tid } of iterTreasureHookContributions(ownedSlotIds)) {
    if (mergedMultSiSkip.has(si)) continue;
    const didTreasureMult = await runSlotPerLetterTreasureMultStep(
      si,
      tid,
      part,
      i,
      slotEl,
      sp,
      realTile,
      tile,
    );
    if (didTreasureMult) {
      wordSlotIntrinsicWobblePlayed = true;
      await runAfterTreasureContributionBoostAnim(tid, si, sp);
    }
  }

  const ctxLetterRarityMult = {
    ownedSlotTreasureIds: ownedSlotIds,
    treasureRun: refs.treasureRunState.value,
  };
  for (const { slotIndex: si, treasureId: tid } of iterTreasureHookContributions(ownedSlotIds)) {
    const animCfg = TREASURE_HOOKS_BY_ID.get(tid)?.getLetterRarityMultAnimConfig?.(ctxLetterRarityMult);
    if (!animCfg) continue;
    const multMul = Number(animCfg.multMul) || 0;
    const multDelta = Number(animCfg.multDelta) || 0;
    if (multMul > 1 || multDelta <= 0) continue;
    const didRarity = await runLetterRarityTreasureMultStep(part, slotEl, {
      treasureId: tid,
      slotIndex: si,
      multDelta,
      multMul: 0,
      bubbleLabel: animCfg.bubbleLabel,
      rarity: animCfg.targetRarity,
      matchesPart: animCfg.matchesPart,
      active: true,
    }, sp);
    if (didRarity) {
      wordSlotIntrinsicWobblePlayed = true;
      await runAfterTreasureContributionBoostAnim(tid, si, sp);
    }
  }

  if (await runIceMaterialMultBurst(tile, slotEl, sp)) {
    wordSlotIntrinsicWobblePlayed = true;
  }

  if (await runTileTreasureAccessoryWrenchMultBurst(tile, slotEl, sp)) {
    wordSlotIntrinsicWobblePlayed = true;
  }

  for (const { slotIndex: si, treasureId: tid } of iterTreasureHookContributions(ownedSlotIds)) {
    const animCfg = TREASURE_HOOKS_BY_ID.get(tid)?.getLetterRarityMultAnimConfig?.(ctxLetterRarityMult);
    if (!animCfg) continue;
    const multMul = Number(animCfg.multMul) || 0;
    if (multMul <= 1) continue;
    const didRarity = await runLetterRarityTreasureMultStep(part, slotEl, {
      treasureId: tid,
      slotIndex: si,
      multDelta: 0,
      multMul,
      bubbleLabel: animCfg.bubbleLabel,
      rarity: animCfg.targetRarity,
      matchesPart: animCfg.matchesPart,
      active: true,
    }, sp);
    if (didRarity) {
      wordSlotIntrinsicWobblePlayed = true;
      await runAfterTreasureContributionBoostAnim(tid, si, sp);
    }
  }

  if (luckyRoll?.moneyAdd > 0) {
    if (!wordSlotIntrinsicWobblePlayed) {
      wobbleScoreSlot(slotEl, sp);
      await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
      wordSlotIntrinsicWobblePlayed = true;
    }
    const bubbleLuckyMoney = showWordSlotBubble(slotEl, formatMoneyBubbleLabel(luckyRoll.moneyAdd), "money", sp);
    scheduleSmallPlusBubbleOutro(bubbleLuckyMoney, sp);
    refs.money.value += luckyRoll.moneyAdd;
    await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  }

  refs.scoringLetterIndex.value = -1;
  scoringWordSlotBubbleAnchor = null;
  await scoringSleep(SCORING_LETTER_GAP_MS, sp);
}

/**
 * 额外逐字母记分轮开始前：对触发该轮的宝藏槽做一次与公式区相同的 wobble，再留一拍间隔。
 * @param {{ extraLetterPassCueSteps?: { slotIndex: number, treasureId: string }[] }} detailed
 * @param {number} cueIndex 第几轮「额外」轮（0 = 第一轮额外，即整词第 2 遍开始前）
 */
async function runExtraLetterScoringPassCue(detailed, cueIndex, speed = 1) {
  const sp = Math.max(0.01, Number(speed) || 1);
  const steps = detailed.extraLetterPassCueSteps ?? [];
  const cue = steps[cueIndex];
  if (cue && cue.slotIndex >= 0) {
    refs.scoringTreasureBarIndex.value = cue.slotIndex;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    const tel = getOwnedTreasureBarFxEl(cue.slotIndex);
    if (tel) {
      const tl = createWobbleScoreSlotTimeline(tel);
      if (tl) {
        tl.timeScale(sp);
        tl.play(0);
        await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
        const bubbleReplay = showScoreBubble(tel, "再来一次！", "replay", sp);
        scheduleSmallPlusBubbleOutro(bubbleReplay, sp);
        await awaitWobbleScoreSlotTimeline(tl);
      } else {
        await scoringSleep(SCORING_TREASURE_FALLBACK_MS, sp);
      }
    } else {
      await scoringSleep(SCORING_TREASURE_FALLBACK_MS, sp);
    }
    refs.scoringTreasureBarIndex.value = null;
  }
  await scoringSleep(SCORING_EXTRA_LETTER_PASS_GAP_MS, sp);
}

/**
 * 单字母由宝藏 `getLetterReplayCountForLetter` 触发的重播前：对应宝藏槽 wobble（无气泡，字母步紧随其后）。
 * @param {{ slotIndex: number, treasureId: string }} cue
 */
async function runPerLetterTreasureReplayCue(cue, speed = 1) {
  const sp = Math.max(0.01, Number(speed) || 1);
  const ti = cue?.slotIndex;
  if (typeof ti !== "number" || ti < 0) return;
  refs.scoringTreasureBarIndex.value = ti;
  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));
  const tel = getOwnedTreasureBarFxEl(ti);
  if (tel) {
    const tl = createWobbleScoreSlotTimeline(tel);
    if (tl) {
      tl.timeScale(sp);
      tl.play(0);
      await awaitWobbleScoreSlotTimeline(tl);
    } else {
      await scoringSleep(SCORING_TREASURE_FALLBACK_MS, sp);
    }
  } else {
    await scoringSleep(SCORING_TREASURE_FALLBACK_MS, sp);
  }
  refs.scoringTreasureBarIndex.value = null;
}

/** 关卡通关时：棋盘上每个黄金材质字母块 wobble + 金币色 $ 气泡，金额直接进钱包（计入结算前利息基数，不在通关弹层单列） */
const GOLD_MATERIAL_CLEAR_BONUS_DOLLARS = 3;
/** 字母块钱币配饰：在该字母轮到计分时触发 $3 */
const COIN_ACCESSORY_SCORE_BONUS_DOLLARS = 3;

/** @param {{ accessoryId?: string | null } | null | undefined} tile */
function gridEffectTriggerCountForTile(tile) {
  return resolveGridEffectTriggerCount(tile, callbacks.ownedSlotTreasureIdList());
}

/** 通关黄金材质：按格子入场顺序交错触发 */
function buildClearWinGoldEffectQueue() {
  const g = refs.grid.value;
  /** @type {{ r: number, c: number, delay: number, accessoryTriggered?: boolean }[]} */
  const items = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = g[r][c];
      if (!t?.letter || t.selected || callbacks.isBossTileDebuffed(t)) continue;
      if (t.materialId !== "gold") continue;
      const delay = callbacks.gridTileEntranceDelay(r, c);
      const triggerCount = gridEffectTriggerCountForTile(t);
      for (let k = 0; k < triggerCount; k++) {
        items.push({ r, c, delay, accessoryTriggered: k > 0 });
      }
    }
  }
  items.sort((a, b) => a.delay - b.delay);
  return items;
}

/** 通关「升级配饰」：登记到计分清空结束队列（排在飞机等宝藏之后） */
function buildClearWinLengthUpgradeAccessoryEntries() {
  const g = refs.grid.value;
  /** @type {{ tileId: string, delay: number, accessoryTriggered?: boolean }[]} */
  const items = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = g[r][c];
      if (!t?.letter || t.selected || callbacks.isBossTileDebuffed(t)) continue;
      if (t.accessoryId !== TILE_ACCESSORY_LEVEL_UPGRADE) continue;
      const tileId = t.id != null && String(t.id) !== "" ? String(t.id) : "";
      if (!tileId) continue;
      const delay = callbacks.gridTileEntranceDelay(r, c);
      const triggerCount = gridEffectTriggerCountForTile(t);
      for (let k = 0; k < triggerCount; k++) {
        items.push({ tileId, delay, accessoryTriggered: k > 0 });
      }
    }
  }
  items.sort((a, b) => a.delay - b.delay);
  return items;
}

/**
 * @param {(() => Promise<void>)[]} fxQueue
 * @param {number} judgedLen 本手判定词长（查表用）
 */
function registerClearWinLengthUpgradePostScoreFx(fxQueue, judgedLen) {
  const len = Math.max(3, Math.min(16, Math.round(Number(judgedLen)) || 0));
  if (len < 3 || len > 16) return;
  for (const { tileId, accessoryTriggered } of buildClearWinLengthUpgradeAccessoryEntries()) {
    fxQueue.push(() => runClearWinLengthUpgradeAccessoryTileFx(tileId, len, accessoryTriggered));
  }
}

/**
 * 折臂 Boss：单词消散后于 result-area 播词长降级动效。
 * @param {(() => Promise<void>)[]} fxQueue
 * @param {number} judgedLen
 */
function registerArmBossLengthDowngradePostScoreFx(fxQueue, judgedLen) {
  if (callbacks.bossSlugForMechanics() !== "the_arm") return;
  const len = Math.max(3, Math.min(16, Math.round(Number(judgedLen)) || 0));
  if (len < 3 || len > 16) return;
  fxQueue.push(() => runArmBossLengthDowngradePostScoreFx(len));
}

/** @param {number} len */
async function runArmBossLengthDowngradePostScoreFx(len) {
  const beforeLevel = Math.max(1, Math.round(Number(refs.lengthLevelsByLength.value?.[len])) || 1);
  if (beforeLevel <= 1) return;
  const sp = 1;
  callbacks.setWordLengthLevel(len, Math.max(1, beforeLevel - 1));
  refs.armBossLengthDowngradeFxActive.value = true;
  refs.shopOverlayLayersSuppressed.value = true;
  callbacks.playBossTapeTriggerCue();
  await callbacks.notifyBossRestrictionTreasures("the_arm");
  await nextTick();
  try {
    await callbacks.runLengthDowngradeShopLikeFx({
      areaRef: getDom.getGameResultAreaRef(),
      model: refs.armBossDowngradeFxModel,
      fxActive: refs.armBossLengthDowngradeFxActive,
      waitNextTick: () => nextTick(),
      len,
      beforeLevel,
      speed: sp,
    });
  } finally {
    refs.armBossLengthDowngradeFxActive.value = false;
    refs.shopOverlayLayersSuppressed.value = false;
  }
}

/** 与飞机升级：格子上 wobble + 升级气泡后，顶栏播词长升级动效 */
const CLEAR_WIN_ACCESSORY_UPGRADE_FX_DELAY_MS = 300;

/**
 * 通关当手：首格佩戴钻石配饰 → 升级该字母稀有度对应的全局等级。
 * @param {Record<string, unknown>[]} tiles
 * @param {boolean} willClearLevelThisSubmit 本手计分后达到通关分
 * @returns {{ rk: string, beforeLevel: number, slotIndex: number } | null}
 */
function resolveClearWinVipDiamondRarityUpgrade(tiles, willClearLevelThisSubmit) {
  if (!willClearLevelThisSubmit || !Array.isArray(tiles) || tiles.length === 0) return null;
  const first = tiles[0];
  if (!first || first.accessoryId !== TILE_ACCESSORY_VIP_DIAMOND) return null;
  const rk = String(first.rarity ?? "common");
  if (!LETTER_RARITY_ORDER.includes(rk)) return null;
  const beforeLevel = Math.max(1, Math.round(Number(refs.rarityLevelsByRarity.value?.[rk])) || 1);
  return { rk, beforeLevel, slotIndex: 0 };
}

/**
 * 通关当手、首格钻石配饰：登记 post-clear 顶栏稀有度升级动效（字母消散后、结算层前）。
 * @param {(() => Promise<void>)[]} fxQueue
 * @param {Record<string, unknown>[]} tiles
 * @param {boolean} willClearLevelThisSubmit
 */
function registerClearWinVipDiamondRarityPostScoreFx(fxQueue, tiles, willClearLevelThisSubmit) {
  const upgrade = resolveClearWinVipDiamondRarityUpgrade(tiles, willClearLevelThisSubmit);
  if (!upgrade) return;
  const { rk, beforeLevel } = upgrade;
  fxQueue.push(() => runClearWinVipDiamondRarityPostScoreFx(rk, beforeLevel));
}

/**
 * 计分结束后、词槽离场前：带钻石配饰的 tile wobble +「升级」气泡。
 * @param {Record<string, unknown>[]} tiles
 * @param {boolean} willClearLevelThisSubmit
 * @param {HTMLElement[]} slotTileEls
 */
async function runClearWinVipDiamondSlotCueBeforeLeave(tiles, willClearLevelThisSubmit, slotTileEls) {
  const upgrade = resolveClearWinVipDiamondRarityUpgrade(tiles, willClearLevelThisSubmit);
  if (!upgrade) return;
  const slotEl = slotTileEls[upgrade.slotIndex] ?? getDom.getWordSlotEl(upgrade.slotIndex);
  if (!(slotEl instanceof HTMLElement)) return;
  const sp = 1;
  const wobbleTl = createWobbleScoreSlotTimeline(slotEl);
  if (wobbleTl) {
    wobbleTl.timeScale(sp);
    wobbleTl.play(0);
  }
  triggerAccessoryChipRipple(slotEl, sp);
  const bubbleTask = (async () => {
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    const bubble = showScoreBubble(slotEl, "升级", "upgrade", sp);
    scheduleSmallPlusBubbleOutro(bubble, sp);
  })();
  const wobbleDone = wobbleTl ? wobbleTl.then() : Promise.resolve();
  await Promise.all([bubbleTask, wobbleDone]);
  await sleep(CLEAR_WIN_ACCESSORY_UPGRADE_FX_DELAY_MS);
}

/** @param {string} rk @param {number} beforeLevel */
async function runClearWinVipDiamondRarityPostScoreFx(rk, beforeLevel) {
  const sp = 1;
  refs.shopOverlayLayersSuppressed.value = true;
  await nextTick();
  try {
    callbacks.noteCollectionUpgradeUsed(callbacks.getUpgradeTreasureIdForRarityKey(rk));
    callbacks.setRarityLevelWithTreasurePairs(rk, beforeLevel + 1);
    callbacks.refreshGridTileBaseScoresFromLevels();
    await callbacks.runInGameRarityUpgradeShopLikeFx({
      areaRef: getDom.getGameResultAreaRef(),
      model: refs.lastSubmitRarityFxModel,
      fxActive: refs.lastSubmitRarityFxActive,
      waitNextTick: () => nextTick(),
      rarityKey: rk,
      beforeLevel,
      speed: sp,
    });
  } finally {
    refs.shopOverlayLayersSuppressed.value = false;
    refs.lastSubmitRarityFxActive.value = false;
  }
}

/** @param {string} tileId @param {number} len @param {boolean} [accessoryTriggered] */
async function runClearWinLengthUpgradeAccessoryTileFx(tileId, len, accessoryTriggered = false) {
  await nextTick();
  const cell = findGridCellByTileId(refs.grid.value, tileId, ROWS, COLS);
  if (!cell) return;
  const idx = cell.row * COLS + cell.col;
  const el = getGridTileElByIndex(idx);
  if (!el) return;
  const sp = 1;
  const wobbleTl = createWobbleScoreSlotTimeline(el);
  if (wobbleTl) {
    wobbleTl.timeScale(sp);
    wobbleTl.play(0);
  }
  triggerAccessoryChipRipple(el, sp, accessoryTriggered === true);
  const bubbleTask = (async () => {
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    const bubble = showScoreBubble(el, "升级", "upgrade", sp);
    scheduleSmallPlusBubbleOutro(bubble, sp);
  })();
  const wobbleDone = wobbleTl ? wobbleTl.then() : Promise.resolve();
  await Promise.all([bubbleTask, wobbleDone]);
  await sleep(CLEAR_WIN_ACCESSORY_UPGRADE_FX_DELAY_MS);

  const beforeLevel = Math.max(1, Math.round(Number(refs.lengthLevelsByLength.value?.[len])) || 1);
  const observatoryBoost = callbacks.isLengthObservatoryBoosted(
    refs.ownedVoucherIds.value,
    len,
    refs.spellCountsByLength.value,
  );
  callbacks.noteTreasureRunUpgradeUsed(refs.treasureRunState.value);
  callbacks.noteCollectionUpgradeForWordLen(len);
  callbacks.bumpWordLengthLevel(len, { observatoryBoost });
  await callbacks.runClearWinLengthUpgradeShopLikeFx({
    areaRef: getDom.getGameResultAreaRef(),
    model: refs.clearWinFxModel,
    fxActive: refs.clearWinLengthUpgradeFxActive,
    waitNextTick: () => nextTick(),
    len,
    beforeLevel,
    observatoryBoost,
    speed: sp,
  });
}

/** 通关当手、补牌前：仅黄金材质 wobble + 金币（升级配饰改在计分清空结束后队列执行） */
async function runClearWinGoldEffectsBeforeRefill() {
  const queue = buildClearWinGoldEffectQueue();
  if (queue.length === 0) return;
  const sp = 1;
  for (const item of queue) {
    const idx = item.r * COLS + item.c;
    const el = getGridTileElByIndex(idx);
    if (!el) continue;
    const wobbleTl = createWobbleScoreSlotTimeline(el);
    if (wobbleTl) {
      wobbleTl.timeScale(sp);
      wobbleTl.play(0);
    }
    if (item.accessoryTriggered) triggerAccessoryChipRipple(el, sp, true);
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    const bubble = showScoreBubble(
      el,
      formatMoneyBubbleLabel(GOLD_MATERIAL_CLEAR_BONUS_DOLLARS),
      "money",
      sp,
    );
    scheduleSmallPlusBubbleOutro(bubble, sp);
    await scoringSleep(SCORING_STEP_BEAT_MS, sp);
    refs.money.value += GOLD_MATERIAL_CLEAR_BONUS_DOLLARS;
    if (wobbleTl) await wobbleTl.then();
  }
}

/** 计分动画起始：result-area 分数×倍率与 detailed 词长段对齐（提交瞬间即设，避免先闪 0×0） */
function seedAnimFormulaFromSubmitDetailed(detailed) {
  const skipLetters = detailed.bossSoftViolation === true;
  const lenTb = getSeedLengthTableLenBeforeAppend(detailed);
  refs.animScoreSum.value = skipLetters
    ? 0
    : Math.round(
        scaleLengthContributionForBoss(
          getWordLengthScoreForTableLen(
            lenTb,
            refs.lengthLevelsByLength.value,
            refs.lengthUpgradeObservatoryExtra.value,
          ),
          refs.isFlintBossActive.value,
        ),
      );
  refs.animMultTotal.value = skipLetters
    ? 0
    : scaleLengthContributionForBoss(
        getLengthMultiplier(
          lenTb,
          refs.lengthLevelsByLength.value,
          refs.lengthUpgradeObservatoryExtra.value,
        ),
        refs.isFlintBossActive.value,
      );
  refs.animResultTotal.value = 0;
}

async function runSubmitScoringSequence(tiles, detailed, resolvedWord = null, isLastSubmitChance = false) {
  refs.scoringTreasureBarIndex.value = null;
  getDom.getBossTapeStrip()?.resetSubmitToothCue();
  let iceShatterCount = 0;
  try {
  refs.hideResultWordLengthBeforeTotal.value = false;
  refs.suppressResultWordLengthUntilScoringEnd.value = false;
  const n = detailed.letterParts.length;
  const persistedSubmitTiles = tiles.filter((t) => !isNewspaperTempTile(t));
  const lenTb =
    detailed.lengthTableLen != null && Number.isFinite(Number(detailed.lengthTableLen))
      ? Math.max(1, Math.round(Number(detailed.lengthTableLen)))
      : n;
  const skipLetters = detailed.bossSoftViolation === true;
  if (
    !skipLetters &&
    callbacks.bossSlugForMechanics() === "crimson_heart" &&
    refs.crimsonTreasureDisabledSlotIndex.value != null
  ) {
    callbacks.playBossTapeTriggerCue();
    await callbacks.notifyBossRestrictionTreasures("crimson_heart");
  }
  if (!skipLetters && refs.isFlintBossActive.value) {
    await callbacks.notifyBossRestrictionTreasures("the_flint");
  }
  seedAnimFormulaFromSubmitDetailed(detailed);

  const wordStr = resolveSubmittedWordForHooks(resolvedWord, tiles);
  const def = callbacks.getWordDefinition(wordStr);
  if (SHOW_SUBMIT_TRANSLATION) {
    refs.submitTranslationLines.value = callbacks.parseTranslationLines(def?.translation_zh);
    await expandSubmitTranslation();
  } else {
    refs.submitTranslationLines.value = [];
  }

  const letterPassCount = Math.max(1, Math.round(Number(detailed.letterScoringPassCount)) || 1);
  const letterReplayExtraCounts = detailed.letterReplayExtraCounts ?? [];
  const perLetterTreasureReplayCueSteps = detailed.perLetterTreasureReplayCueSteps ?? [];
  const perLetterTreasureReplayCueCursor = perLetterTreasureReplayCueSteps.map(() => 0);
  /** 与 `luckyMaterialRollsByLetter[i]` 对齐：该字母第几次逐字结算（首遍 + replay + 整词额外轮） */
  const luckyVisitByLetter = detailed.letterParts.map(() => 0);
  const totalScoringBeats = getSubmitScoringTotalBeats(detailed);
  let scoringBeat = 0;
  const hasNewspaperAppend = (detailed.submitScoringAppendedTiles?.length ?? 0) > 0;
  if (!skipLetters && hasNewspaperAppend) {
    await runNewspaperAppendSequence({
      detailed,
      refs,
      getDom,
      fx,
      callbacks,
      nextTick,
      speed: getSubmitScoringBeatSpeed(scoringBeat, totalScoringBeats),
      gsap: gsapLib,
    });
    scoringBeat += detailed.submitScoringAppendedTiles?.length ?? 0;
  }
  if (skipLetters) {
    const spSkip = 1.05;
    for (let i = 0; i < n; i++) {
      await runLetterScoringSkipStep(getDom.getWordSlotEl(i), spSkip, i);
    }
  } else {
    for (let pass = 0; pass < letterPassCount; pass++) {
      if (pass > 0) {
        const spCue = getSubmitScoringBeatSpeed(scoringBeat, totalScoringBeats);
        await runExtraLetterScoringPassCue(detailed, pass - 1, spCue);
        scoringBeat += 1;
      }
      for (let i = 0; i < n; i++) {
        const spLetter = getSubmitScoringBeatSpeed(scoringBeat, totalScoringBeats);
        if (callbacks.isBossDebuffedSubmitTile(tiles[i])) {
          await runLetterScoringSkipStep(getDom.getWordSlotEl(i), spLetter, i);
          scoringBeat += 1;
          continue;
        }
        await runSingleLetterScoringStep(tiles[i], i, detailed, spLetter, luckyVisitByLetter[i]++);
        scoringBeat += 1;
        if (pass === 0) {
          const replayExtra = Math.max(0, Math.floor(Number(letterReplayExtraCounts[i]) || 0));
          const letterTreasureReplayCues = perLetterTreasureReplayCueSteps[i] ?? [];
          for (let r = 0; r < replayExtra; r++) {
            const cueIdx = perLetterTreasureReplayCueCursor[i] ?? 0;
            if (cueIdx < letterTreasureReplayCues.length) {
              perLetterTreasureReplayCueCursor[i] = cueIdx + 1;
              const spTreasureCue = getSubmitScoringBeatSpeed(scoringBeat, totalScoringBeats);
              await runPerLetterTreasureReplayCue(letterTreasureReplayCues[cueIdx], spTreasureCue);
              scoringBeat += 1;
            } else if (tiles[i]?.accessoryId === TILE_ACCESSORY_REWIND) {
              triggerAccessoryChipRipple(getDom.getWordSlotEl(i), spLetter, true);
            }
            const spReplay = getSubmitScoringBeatSpeed(scoringBeat, totalScoringBeats);
            await runSingleLetterScoringStep(tiles[i], i, detailed, spReplay, luckyVisitByLetter[i]++);
            scoringBeat += 1;
          }
        }
      }
    }

    if (detailed.bossSoftViolation !== true) {
      await callbacks.notifySubmitAfterLettersBeforePostSteps(
        callbacks.ownedSlotTreasureIdList(),
        callbacks.buildSubmitAfterLettersContext(tiles, detailed),
      );
      if (callbacks.deferredWordSubmitPayload) {
        callbacks.flushDeferredWordSubmitRecord();
      }
    }

    const postSteps = detailed.postLetterTreasureSteps ?? [];
    for (const step of postSteps) {
    if (isIceMaterialPostLetterStep(step)) continue;
    if (isLuckyMaterialPostLetterStep(step)) {
      const luckyMultAdd = Number(step.multAdd) || 0;
      if (luckyMultAdd > 0 && detailed.hasPostLetterMultMul === true) {
        refs.animMultTotal.value += luckyMultAdd;
        await nextTick();
        pulseFormulaPanelNum(getResultMultNumEl());
      }
      continue;
    }
    const multAdd = Number(step.multAdd) || 0;
    const scoreAdd = Number(step.scoreAdd) || 0;
    const multMul = Number(step.multMul) || 0;
    const moneyAdd = Number(step.moneyAdd) || 0;
    const hasMultMul = multMul > 0 && multMul !== 1;
    if (multAdd <= 0 && scoreAdd <= 0 && !hasMultMul && moneyAdd <= 0) continue;
    const spPost = getSubmitScoringBeatSpeed(scoringBeat, totalScoringBeats);
    scoringBeat += 1;
    const ti =
      typeof step.slotIndex === "number" && step.slotIndex >= 0
        ? step.slotIndex
        : callbacks.findFirstOwnedTreasureSlotIndex(step.treasureId);
    refs.scoringTreasureBarIndex.value = ti >= 0 ? ti : null;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    const tel = ti >= 0 ? getOwnedTreasureBarFxEl(ti) : null;
    const gridFxEl =
      typeof step.scoreFxGridTileIndex === "number" && step.scoreFxGridTileIndex >= 0
        ? getGridTileElByIndex(step.scoreFxGridTileIndex)
        : null;
    const wordSlotFxEl =
      typeof step.scoreFxWordSlotIndex === "number" && step.scoreFxWordSlotIndex >= 0
        ? getDom.getWordSlotEl(step.scoreFxWordSlotIndex)
        : null;
    const fxTargetEl = gridFxEl || wordSlotFxEl || tel;
    if (hasMultMul) {
      if (multMul >= 2) callbacks.triggerHaptic("scoreTotal");
      if (fxTargetEl) {
        wobbleScoreSlot(fxTargetEl, spPost);
        if (step.accessoryTriggered) triggerAccessoryChipRipple(fxTargetEl, spPost, true);
        await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, spPost);
        refs.animMultTotal.value = Math.round(refs.animMultTotal.value * multMul);
        await nextTick();
        const bubbleX = showMultMultiplyBubble(fxTargetEl, multMul, spPost);
        pulseFormulaMultMultiplyBurst(getResultMultNumEl());
        scheduleMultMultiplyBubbleOutro(bubbleX, spPost);
        await scoringSleep(SCORING_STEP_BEAT_MS + 120, spPost);
      } else {
        await scoringSleep(SCORING_TREASURE_FALLBACK_MS, spPost);
        refs.animMultTotal.value = Math.round(refs.animMultTotal.value * multMul);
        await nextTick();
        pulseFormulaMultMultiplyBurst(getResultMultNumEl());
      }
    } else if (multAdd > 0) {
      if (fxTargetEl) {
        wobbleScoreSlot(fxTargetEl, spPost);
        await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, spPost);
        refs.animMultTotal.value += multAdd;
        await nextTick();
        const bubbleM = showScoreBubble(fxTargetEl, `+${Math.round(multAdd)}`, "mult", spPost);
        pulseFormulaPanelNum(getResultMultNumEl());
        scheduleSmallPlusBubbleOutro(bubbleM, spPost);
        await scoringSleep(SCORING_STEP_BEAT_MS, spPost);
      } else {
        await scoringSleep(SCORING_TREASURE_FALLBACK_MS, spPost);
        refs.animMultTotal.value += multAdd;
        await nextTick();
        pulseFormulaPanelNum(getResultMultNumEl());
      }
    } else if (scoreAdd > 0) {
      if (fxTargetEl) {
        wobbleScoreSlot(fxTargetEl, spPost);
        await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, spPost);
        refs.animScoreSum.value += scoreAdd;
        await nextTick();
        const bubbleS = showScoreBubble(fxTargetEl, `+${Math.round(scoreAdd)}`, "score", spPost);
        pulseFormulaPanelNum(getResultScoreNumEl());
        scheduleSmallPlusBubbleOutro(bubbleS, spPost);
        await scoringSleep(SCORING_STEP_BEAT_MS, spPost);
      } else {
        await scoringSleep(SCORING_TREASURE_FALLBACK_MS, spPost);
        refs.animScoreSum.value += scoreAdd;
        await nextTick();
        pulseFormulaPanelNum(getResultScoreNumEl());
      }
    } else if (moneyAdd > 0) {
      if (fxTargetEl) {
        wobbleScoreSlot(fxTargetEl, spPost);
        await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, spPost);
        const bubbleMoney = showScoreBubble(
          fxTargetEl,
          formatMoneyBubbleLabel(moneyAdd),
          "money",
          spPost,
        );
        scheduleSmallPlusBubbleOutro(bubbleMoney, spPost);
        refs.money.value += Math.round(moneyAdd);
        await scoringSleep(SCORING_STEP_BEAT_MS, spPost);
      } else {
        await scoringSleep(SCORING_TREASURE_FALLBACK_MS, spPost);
        refs.money.value += Math.round(moneyAdd);
      }
    }
    refs.scoringTreasureBarIndex.value = null;
    }
  }

  refs.hideResultWordLengthBeforeTotal.value = true;
  refs.suppressResultWordLengthUntilScoringEnd.value = true;
  await sleep(200);
  const formulaFinalScore =
    detailed.formulaFinalScore != null
      ? detailed.formulaFinalScore
      : subtractScore(
          detailed.finalScore,
          (detailed.finalScoreTreasureSteps ?? []).reduce(
            (s, st) => addScore(s, Math.max(0, Math.round(Number(st?.finalScoreAdd) || 0))),
            0,
          ),
        );
  refs.animResultTotal.value = formulaFinalScore;
  refs.hideResultWordLengthBeforeTotal.value = false;
  await nextTick();
  pulseFill(getResultTotalEl());
  callbacks.triggerHaptic("scoreTotal");

  const finalScoreSteps = detailed.finalScoreTreasureSteps ?? [];
  const hasFinalScoreTreasureSteps = finalScoreSteps.some(
    (st) => Math.round(Number(st?.finalScoreAdd) || 0) > 0,
  );
  if (hasFinalScoreTreasureSteps) {
    await scoringSleep(FORMULA_TOTAL_HOLD_BEFORE_FINAL_SCORE_MS, 1);
  }
  for (const step of finalScoreSteps) {
    const add = Math.round(Number(step.finalScoreAdd) || 0);
    if (add <= 0) continue;
    const spFinal = getSubmitScoringBeatSpeed(scoringBeat, totalScoringBeats);
    scoringBeat += 1;
    const ti =
      typeof step.slotIndex === "number" && step.slotIndex >= 0
        ? step.slotIndex
        : callbacks.findFirstOwnedTreasureSlotIndex(step.treasureId);
    refs.scoringTreasureBarIndex.value = ti >= 0 ? ti : null;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    const tel = ti >= 0 ? getOwnedTreasureBarFxEl(ti) : null;
    if (tel) {
      wobbleScoreSlot(tel, spFinal);
      await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, spFinal);
      refs.animResultTotal.value = addScore(refs.animResultTotal.value, add);
      await nextTick();
      const bubbleFinal = showScoreBubble(tel, `+${add}`, "final-total", spFinal);
      pulseFill(getResultTotalEl());
      scheduleSmallPlusBubbleOutro(bubbleFinal, spFinal);
      await scoringSleep(SCORING_STEP_BEAT_MS, spFinal);
    } else {
      await scoringSleep(SCORING_TREASURE_FALLBACK_MS, spFinal);
      refs.animResultTotal.value = addScore(refs.animResultTotal.value, add);
      await nextTick();
      pulseFill(getResultTotalEl());
    }
    refs.scoringTreasureBarIndex.value = null;
  }

  await sleep(220);

  await new Promise((resolve) => {
    const o = { s: refs.animScoreSum.value, m: refs.animMultTotal.value };
    gsapLib.to(o, {
      s: 0,
      m: 0,
      duration: 0.5,
      ease: EASE_TRANSFORM,
      onUpdate: () => {
        refs.animScoreSum.value = Math.round(o.s);
        refs.animMultTotal.value = Math.round(o.m);
      },
      onComplete: resolve,
    });
  });

  await sleep(220);

  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));

  if (detailed.bossSoftViolation !== true) {
    const gridTiles = tiles.filter((t) => !isNewspaperTempTile(t));
    iceShatterCount = await submitFx.runSubmittedIceShatterEffects(gridTiles);
  }
  /** @type {import('../treasures/treasureTypes.js').SubmitWordLeaveFxRunner[]} */
  let submitWordLeaveFx = [];
  /** @type {(() => Promise<void>)[]} */
  let submitAfterWordLeaveFx = [];
  /** @type {(() => Promise<void>)[]} */
  let submitPostScoreClearFx = [];
  callbacks.submitUpgradeFxRegistrarState.current = (runner) => {
    if (typeof runner === "function") submitPostScoreClearFx.push(runner);
  };
  if (detailed.bossSoftViolation !== true) {
    const grantWord = resolveSubmittedWordForHooks(resolvedWord, persistedSubmitTiles);
    const pending = await callbacks.runPendingInRunGrantsAfterSubmit(
      persistedSubmitTiles,
      grantWord,
      lenTb,
      refs.currentScore.value,
    );
    submitWordLeaveFx = pending.submitWordLeaveFx;
    submitPostScoreClearFx.push(...pending.submitPostScoreClearFx);
    submitAfterWordLeaveFx.push(...pending.submitAfterWordLeaveFx);
  }

  const startRound = refs.currentScore.value;
  const endRound = addScore(startRound, detailed.finalScore);
  const willClearLevelThisSubmit = scoreGte(endRound, refs.targetScore.value);

  if (detailed.bossSoftViolation !== true && scoreIsPositive(detailed.finalScore)) {
    registerClearWinVipDiamondRarityPostScoreFx(
      submitPostScoreClearFx,
      persistedSubmitTiles,
      willClearLevelThisSubmit,
    );
    registerArmBossLengthDowngradePostScoreFx(submitPostScoreClearFx, lenTb);
  }
  /** 整格依次消失（占位+字母一起），按槽位索引 0..n-1（含报纸临时 S） */
  const leaveSlotCount = n;
  const slotTileEls = [];
  for (let i = 0; i < leaveSlotCount; i++) {
    const el = getDom.getWordSlotEl(i);
    if (el) slotTileEls.push(el);
  }
  gsapLib.killTweensOf(slotTileEls);
  gsapLib.set(slotTileEls, {
    opacity: 1,
    scale: 1,
    y: 0,
    transformOrigin: "50% 50%",
  });
  for (const slotEl of slotTileEls) {
    const ph = slotEl.querySelector(".word-slot-placeholder");
    if (ph) ph.classList.add("word-slot-placeholder--shell");
  }
  await runClearWinVipDiamondSlotCueBeforeLeave(tiles, willClearLevelThisSubmit, slotTileEls);

  const submitGridLeaveEls = getDom.getSelectedGridCellElsInOrder();
  gsapLib.killTweensOf(submitGridLeaveEls);
  gsapLib.set(submitGridLeaveEls, {
    scale: 1,
    y: 0,
    transformOrigin: "50% 50%",
  });

  const collapseTrans = collapseSubmitTranslation();

  /** 快照与补牌同一瞬：rect 与 cells 对齐，避免间隔内布局漂移导致 FLIP 误判 */
  const prevFlip = {
    rects: gridDropAnim.captureGridRectsByTileId(),
    cells: callbacks.snapshotGridCellsByTileId(),
  };
  const leaveDuration = 0.28;
  const leaveStagger = submitWordLeaveStagger(leaveSlotCount);
  const leavePromise = (async () => {
    if (submitWordLeaveFx.length > 0) {
      for (const fx of submitWordLeaveFx) {
        await fx({
          slotEls: slotTileEls,
          gridEls: submitGridLeaveEls,
          duration: leaveDuration,
          stagger: leaveStagger,
        });
      }
      return;
    }
    await callbacks.runSlotAndGridLeaveAnimation(slotTileEls, submitGridLeaveEls, {
      duration: leaveDuration,
      stagger: leaveStagger,
    });
  })();

  const scorePromise = (async () => {
    if (hasFinalScoreTreasureSteps) {
      await scoringSleep(FINAL_SCORE_HOLD_BEFORE_HEADER_ROLL_MS, 1);
    }
    const handScore = detailed.finalScore;
    const scoreRollSteps = 26;
    const scoreRollStepMs = Math.round(520 / scoreRollSteps);
    const easeFn = gsapLib.parseEase(EASE_TRANSFORM);

    // 先入库再播顶栏滚分：原先依赖 GSAP onComplete，局内 pause 冻结 globalTimeline 时 onComplete 永不触发，会出现「计分播完但关卡分不变」。
    if (detailed.bossSoftViolation !== true) {
      refs.currentScore.value = endRound;
      callbacks.setLastWordFromSubmit(callbacks.getWordDefinition, persistedSubmitTiles, detailed, {
        resolvedWord: wordStr,
      });
    }

    refs.roundScoreOverride.value = startRound;
    for (let step = 0; step <= scoreRollSteps; step++) {
      const t = easeFn(step / scoreRollSteps);
      refs.animResultTotal.value = interpolateScore(handScore, 0, 1 - t);
      refs.roundScoreOverride.value = interpolateScore(startRound, endRound, t);
      if (step < scoreRollSteps) {
        await scoringSleep(scoreRollStepMs, 1);
      }
    }
    refs.roundScoreOverride.value = null;
    refs.animResultTotal.value = 0;
  })();

  await leavePromise;

  callbacks.beginSubmitWordLeaveHide?.(leaveSlotCount);
  await nextTick();

  if (submitAfterWordLeaveFx.length > 0) {
    for (const fx of submitAfterWordLeaveFx) {
      await fx();
    }
  }

  callbacks.setSubmitScoringAppendPresentation?.(null);
  callbacks.setSubmitScoringAppendPresentations?.([]);
  await nextTick();

  const willWinThisSubmit = willClearLevelThisSubmit;
  const noSubmitsLeft = refs.remainingWords.value <= 0;
  const skipNewFromDeck = willWinThisSubmit || noSubmitsLeft;

  if (willWinThisSubmit) {
    registerClearWinLengthUpgradePostScoreFx(submitPostScoreClearFx, lenTb);
    await runClearWinGoldEffectsBeforeRefill();
  }

  callbacks.applySubmitRefill({ skipNewFromDeck });
  for (const slotEl of slotTileEls) {
    callbacks.clearWordSlotGsapAfterSubmitLeave?.(slotEl);
  }
  callbacks.endSubmitWordLeaveHide?.();
  await callbacks.applyHookBossAfterSubmit();
  refs.gridRefillAnimating.value = true;
  const dropPromise = (async () => {
    await nextTick();
    try {
      /* 关内已结束：不补新块（顶部为 void），仅让已有字母 FLIP 落位 */
      await gridDropAnim.runGridDropAnimation(prevFlip);
    } finally {
      refs.gridRefillAnimating.value = false;
      await callbacks.tryCeruleanBellFlyInAfterGridStable();
    }
  })();

  await Promise.all([dropPromise, scorePromise]);

  callbacks.submitUpgradeFxRegistrarState.current = null;
  if (submitPostScoreClearFx.length > 0) {
    for (const fx of submitPostScoreClearFx) {
      await fx();
    }
  }

  await collapseTrans;

  refs.scoringAnimating.value = false;
  refs.suppressResultWordLengthUntilScoringEnd.value = false;
  await nextTick();
  callbacks.updateSlotPositions(true);
  callbacks.scheduleRunAutoSave();
  return iceShatterCount;
  } finally {
    callbacks.submitUpgradeFxRegistrarState.current = null;
    callbacks.setSubmitScoringAppendPresentation?.(null);
    callbacks.setSubmitScoringAppendPresentations?.([]);
    callbacks.endSubmitWordLeaveHide?.();
    refs.scoringTreasureBarIndex.value = null;
    clearAllTreasureSlotWobbleFront();
    refs.crimsonTreasureDisabledSlotIndex.value = null;
    refs.hideResultWordLengthBeforeTotal.value = false;
    refs.suppressResultWordLengthUntilScoringEnd.value = false;
    refs.wordDefinitionHiddenForWordLeave.value = false;
  }
}

  return {
    seedAnimFormulaFromSubmitDetailed,
    runSubmitScoringSequence,
    expandSubmitTranslation,
    collapseSubmitTranslation,
    clearAllTreasureSlotWobbleFront,
  };
}
