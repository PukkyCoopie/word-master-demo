import gsap from "gsap";
import { scoringSleep } from "./submitScoringTiming.js";
import {
  getWordLengthScoreForTableLen,
  scaleLengthContributionForBoss,
  getLengthMultiplier,
} from "../composables/useScoring.js";

/** 每个 S 落位后的短休（链式追加时除最后一次外） */
export const NEWSPAPER_CHAIN_APPEND_GAP_MS = Math.round(280 * 0.7);
/** 全部 S 追加完成后再进入字母计分的停顿 */
export const NEWSPAPER_POST_APPEND_GAP_MS = Math.round(400 * 0.7);
/** 整块词槽弹出：起始 scale */
const NEWSPAPER_APPEND_SCALE_FROM = 0.22;
/** 整块词槽弹出：过冲峰值 */
const NEWSPAPER_APPEND_POP_PEAK = 1.08;
const NEWSPAPER_APPEND_POP_IN_S = 0.32;
const NEWSPAPER_APPEND_POP_SETTLE_S = 0.22;

/**
 * 计分前：每份报纸 wobble 与 S 整块弹出同拍；链式追加后进入字母计分。
 * @param {object} params
 * @param {object} params.detailed
 * @param {object} params.refs
 * @param {object} params.getDom
 * @param {object} params.fx
 * @param {object} params.callbacks
 * @param {typeof import('vue').nextTick} params.nextTick
 * @param {number} [params.speed]
 * @param {typeof gsap} [params.gsap]
 */
export async function runNewspaperAppendSequence({
  detailed,
  refs,
  getDom,
  fx,
  callbacks,
  nextTick,
  speed = 1,
  gsap: gsapLib = gsap,
}) {
  const appended = detailed.submitScoringAppendedTiles ?? [];
  if (!appended.length || detailed.bossSoftViolation === true) return;

  const sp = Math.max(0.01, Number(speed) || 1);
  const baseCount = detailed.letterParts.length - appended.length;
  if (baseCount < 0) return;

  const preLen = getSeedLengthTableLenBeforeAppend(detailed);

  callbacks.setSubmitScoringAppendScaleLocked?.(true);
  callbacks.setSubmitScoringAppendPresentations?.([]);
  await nextTick();

  for (let a = 0; a < appended.length; a++) {
    const entry = appended[a];
    callbacks.setSubmitScoringAppendPresentations?.(
      appended.slice(0, a + 1).map((e) => e.tile),
    );
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    callbacks.ensureSlotRafRunning?.();

    const appendIndex = baseCount + a;
    const appendEl = getDom.getWordSlotEl(appendIndex);
    if (appendEl) {
      gsapLib.killTweensOf(appendEl);
      gsapLib.set(appendEl, {
        scale: NEWSPAPER_APPEND_SCALE_FROM,
        opacity: 0.42,
        transformOrigin: "50% 50%",
      });
    }

    await Promise.all([
      runNewspaperTreasureWobble(entry, refs, getDom, fx, callbacks, nextTick, sp),
      playNewspaperAppendSlotPop(appendEl, gsapLib, sp),
    ]);

    applyNewspaperFormulaLengthSeedForTableLen(preLen + a + 1, refs, getDom, fx);
    await nextTick();

    if (a < appended.length - 1) {
      await scoringSleep(NEWSPAPER_CHAIN_APPEND_GAP_MS, sp);
    }
  }

  callbacks.setSubmitScoringAppendScaleLocked?.(false);
  callbacks.ensureSlotRafRunning?.();
  await scoringSleep(NEWSPAPER_POST_APPEND_GAP_MS, sp);
}

/**
 * @param {HTMLElement | null | undefined} slotEl
 * @param {typeof gsap} gsapLib
 * @param {number} sp
 */
function playNewspaperAppendSlotPop(slotEl, gsapLib, sp) {
  if (!slotEl) return Promise.resolve();
  gsapLib.killTweensOf(slotEl);
  return new Promise((resolve) => {
    const tl = gsapLib.timeline({
      onComplete: () => {
        gsapLib.set(slotEl, { clearProps: "scale,opacity,transform" });
        resolve();
      },
    });
    tl.to(
      slotEl,
      {
        scale: NEWSPAPER_APPEND_POP_PEAK,
        opacity: 1,
        duration: NEWSPAPER_APPEND_POP_IN_S,
        ease: "circ.out",
      },
      0,
    );
    tl.to(
      slotEl,
      {
        scale: 1,
        duration: NEWSPAPER_APPEND_POP_SETTLE_S,
        ease: "circ.in",
      },
      NEWSPAPER_APPEND_POP_IN_S,
    );
    tl.timeScale(sp);
  });
}

/**
 * @param {{ treasureId?: string, treasureBarSlotIndex?: number }} entry
 * @param {object} refs
 * @param {object} getDom
 * @param {object} fx
 * @param {object} callbacks
 * @param {typeof import('vue').nextTick} nextTick
 * @param {number} sp
 */
async function runNewspaperTreasureWobble(entry, refs, getDom, fx, callbacks, nextTick, sp) {
  const ti =
    typeof entry.treasureBarSlotIndex === "number" && entry.treasureBarSlotIndex >= 0
      ? entry.treasureBarSlotIndex
      : entry.treasureId
        ? callbacks.findFirstOwnedTreasureSlotIndex?.(entry.treasureId) ?? -1
        : -1;
  if (ti == null || ti < 0) {
    await scoringSleep(Math.round(320 * 0.7), sp);
    return;
  }

  refs.scoringTreasureBarIndex.value = ti;
  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));
  const tel = getDom.getOwnedTreasureBarFxEl(ti);
  const wobbleTl = tel ? fx.createWobbleScoreSlotTimeline(tel) : null;
  if (wobbleTl) {
    wobbleTl.timeScale(sp);
    wobbleTl.play(0);
    await fx.awaitWobbleScoreSlotTimeline(wobbleTl);
  } else {
    await scoringSleep(Math.round(320 * 0.7), sp);
  }
  refs.scoringTreasureBarIndex.value = null;
}

/**
 * @param {number} lenTb
 * @param {object} refs
 * @param {object} getDom
 * @param {object} fx
 */
export function applyNewspaperFormulaLengthSeedForTableLen(lenTb, refs, getDom, fx) {
  const len = Math.max(1, Math.round(Number(lenTb)) || 1);
  refs.animScoreSum.value = Math.round(
    scaleLengthContributionForBoss(
      getWordLengthScoreForTableLen(
        len,
        refs.lengthLevelsByLength.value,
        refs.lengthUpgradeObservatoryExtra.value,
      ),
      refs.isFlintBossActive.value,
    ),
  );
  refs.animMultTotal.value = scaleLengthContributionForBoss(
    getLengthMultiplier(
      len,
      refs.lengthLevelsByLength.value,
      refs.lengthUpgradeObservatoryExtra.value,
    ),
    refs.isFlintBossActive.value,
  );
  fx.pulseFormulaPanelNum?.(getDom.getResultScoreNumEl?.() ?? null);
  fx.pulseFormulaPanelNum?.(getDom.getResultMultNumEl?.() ?? null);
}

/**
 * 追加 S 后：将 result-formula 基础分/长度倍率更新为最终词长。
 * @param {object} detailed
 * @param {object} refs
 * @param {object} getDom
 * @param {object} fx
 */
export function applyNewspaperFormulaLengthSeed(detailed, refs, getDom, fx) {
  const lenTb =
    detailed.lengthTableLen != null && Number.isFinite(Number(detailed.lengthTableLen))
      ? Math.max(1, Math.round(Number(detailed.lengthTableLen)))
      : detailed.letterParts?.length ?? 0;
  applyNewspaperFormulaLengthSeedForTableLen(lenTb, refs, getDom, fx);
}

/**
 * @param {object} detailed
 * @returns {number}
 */
export function getSeedLengthTableLenBeforeAppend(detailed) {
  const full =
    detailed.lengthTableLen != null && Number.isFinite(Number(detailed.lengthTableLen))
      ? Math.max(1, Math.round(Number(detailed.lengthTableLen)))
      : detailed.letterParts?.length ?? 0;
  const bonus = Math.max(0, Math.floor(Number(detailed.submitScoringWordLetterCountBonus) || 0));
  const appended = detailed.submitScoringAppendedTiles ?? [];
  if (appended.length > 0 && bonus > 0) {
    return Math.max(1, full - bonus);
  }
  return full;
}
