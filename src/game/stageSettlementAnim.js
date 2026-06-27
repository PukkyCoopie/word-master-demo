import gsap from "gsap";
import { watch } from "vue";
import { EASE_TRANSFORM } from "../constants.js";
import { shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";

/** @param {unknown} el */
function refToDom(el) {
  if (el == null) return null;
  if (el instanceof HTMLElement) return el;
  if (typeof el === "object" && el !== null && "$el" in el) {
    const node = /** @type {{ $el?: unknown }} */ (el).$el;
    return node instanceof HTMLElement ? node : null;
  }
  return null;
}

/** @param {number} n */
export function settlementAbsDollarCount(n) {
  return Math.abs(Math.round(Number(n) || 0));
}

/**
 * @param {import('./buildSettlementSnapshot.js').SettlementSnapshot | null} s
 */
export function settlementTotalDollarCount(s) {
  if (!s) return 0;
  if (s.mode === "convertRemainsNoInterest") {
    return (
      settlementAbsDollarCount(s.clearReward) +
      settlementAbsDollarCount(s.spareWordsReward) +
      settlementAbsDollarCount(s.spareDiscardsReward) +
      settlementAbsDollarCount(s.interest) +
      settlementAbsDollarCount(s.total)
    );
  }
  return (
    settlementAbsDollarCount(s.clearReward) +
    settlementAbsDollarCount(s.spareMoves) +
    settlementAbsDollarCount(s.interest) +
    settlementAbsDollarCount(s.extraInterest) +
    settlementAbsDollarCount(s.total)
  );
}

/**
 * @param {readonly { count: number }[]} rowSpecs
 */
export function settlementDollarGapCount(rowSpecs) {
  let g = 0;
  for (const spec of rowSpecs) {
    const n = settlementAbsDollarCount(spec.count);
    g += Math.max(0, n - 1);
  }
  return g;
}

/** 相对原版 pace 略快约 4%（原版 k=0.052 b=0.1） */
const SETTLEMENT_PACE_K_S = 0.05;
const SETTLEMENT_PACE_B_S = 0.096;
const SETTLEMENT_PACE_MIN_S = 0.115;
const SETTLEMENT_PACE_MAX_S = 2.74;

/** @param {number} S */
function settlementPaceBudgetSeconds(S) {
  if (S <= 0) return 0;
  const p = SETTLEMENT_PACE_K_S * S + SETTLEMENT_PACE_B_S;
  return Math.min(SETTLEMENT_PACE_MAX_S, Math.max(SETTLEMENT_PACE_MIN_S, p));
}

/**
 * @param {number} S
 * @param {number} gapCount
 * @param {number} SPositiveRows
 */
function settlementDollarStepGap(S, gapCount, SPositiveRows) {
  const P = settlementPaceBudgetSeconds(S);
  if (P <= 0) return 0.09;
  if (gapCount > 0) {
    const g = P / gapCount;
    return Math.min(0.21, Math.max(0.031, g));
  }
  const slots = Math.max(1, SPositiveRows - 1);
  const g = P / slots;
  return Math.min(0.21, Math.max(0.031, g));
}

/** @param {number} S */
function settlementRowIntroDuration(S) {
  const d = 0.31 + 0.0135 * S;
  return Math.min(0.48, Math.max(0.27, d));
}

/**
 * @param {import('vue').Ref<number>} animRef
 * @param {number} count
 * @param {HTMLElement | null} rowEl
 * @param {number} stepGap
 * @param {() => void} shakeRow
 * @param {() => void} onDollarStep
 * @param {number} [interRowPadS=0]
 */
function buildSettlementDollarSubTimeline(
  animRef,
  count,
  rowEl,
  stepGap,
  shakeRow,
  onDollarStep,
  interRowPadS = 0,
) {
  const st = gsap.timeline();
  const signed = Math.round(Number(count) || 0);
  const steps = settlementAbsDollarCount(signed);
  const sign = signed < 0 ? -1 : 1;
  st.call(() => {
    animRef.value = 0;
  });
  if (steps <= 0) {
    if (interRowPadS > 0) st.to({}, { duration: interRowPadS });
    return st;
  }
  for (let k = 1; k <= steps; k++) {
    st.call(() => {
      animRef.value = sign * k;
      shakeRow();
      onDollarStep();
    });
    if (k < steps) st.to({}, { duration: stepGap });
  }
  if (interRowPadS > 0) st.to({}, { duration: interRowPadS });
  return st;
}

/**
 * @param {HTMLElement | null} rowEl
 */
function shakeSettlementRow(rowEl) {
  if (!rowEl) return;
  gsap.killTweensOf(rowEl, "rotation");
  gsap.set(rowEl, { rotation: 0, transformOrigin: "50% 50%" });
  gsap
    .timeline()
    .to(rowEl, {
      rotation: 1,
      duration: 0.09,
      ease: EASE_TRANSFORM,
    })
    .to(rowEl, {
      rotation: 0,
      duration: 0.52,
      ease: EASE_TRANSFORM,
    });
}

/**
 * @param {Object} deps
 * @param {() => import('./buildSettlementSnapshot.js').SettlementSnapshot | null} deps.getSnapshot
 * @param {() => readonly import('./buildSettlementSnapshot.js').SettlementDisplayRow[]} deps.getDisplayRows
 * @param {(row: import('./buildSettlementSnapshot.js').SettlementDisplayRow) => number} deps.getCountForRow
 * @param {import('vue').Ref<number[]>} deps.animSettleRows
 * @param {import('vue').Ref<HTMLElement | null>} deps.settlementCardRef
 * @param {import('vue').Ref<HTMLButtonElement | null>} deps.settlementContinueBtnRef
 * @param {() => (HTMLElement | null)[]} deps.getRowEls
 * @param {() => boolean} deps.isOpen
 * @param {() => void} [deps.triggerHaptic]
 */
export function createStageSettlementAnimController(deps) {
  /** @type {import('gsap').Timeline | null} */
  let settlementTl = null;
  /** @type {(() => void) | null} */
  let settlementIntroResolve = null;

  /** @param {number} i */
  function animSettleRowRef(i) {
    return {
      get value() {
        return deps.animSettleRows.value[i] ?? 0;
      },
      set value(v) {
        const next = [...deps.animSettleRows.value];
        next[i] = v;
        deps.animSettleRows.value = next;
      },
    };
  }

  function resetAnimValues() {
    const n = deps.getDisplayRows().length || 4;
    deps.animSettleRows.value = Array.from({ length: n }, () => 0);
    const rowEls = deps.getRowEls();
    rowEls.length = 0;
    settlementIntroResolve = null;
  }

  function finishIntroInstant() {
    const s = deps.getSnapshot();
    if (!s || !deps.isOpen()) return false;

    if (settlementTl) {
      settlementTl.kill();
      settlementTl = null;
    }

    const card = deps.settlementCardRef.value;
    const continueBtn = deps.settlementContinueBtnRef.value;
    if (card) {
      gsap.killTweensOf(card);
      gsap.set(card, { opacity: 1, scale: 1, y: 0 });
    }
    const displayRows = deps.getDisplayRows();
    deps.animSettleRows.value = displayRows.map((row) => deps.getCountForRow(row));
    const rowEls = deps.getRowEls();
    for (let i = 0; i < rowEls.length; i++) {
      const el = rowEls[i];
      if (!el) continue;
      gsap.killTweensOf(el);
      gsap.set(el, {
        opacity: deps.getCountForRow(displayRows[i]) === 0 ? 0.42 : 1,
        y: 0,
        rotation: 0,
        transformOrigin: "50% 50%",
      });
    }
    if (continueBtn) {
      gsap.killTweensOf(continueBtn);
      gsap.set(continueBtn, { opacity: 1, y: 0 });
    }

    if (settlementIntroResolve) {
      const done = settlementIntroResolve;
      settlementIntroResolve = null;
      done();
    }
    return true;
  }

  function isIntroPending() {
    return settlementIntroResolve != null;
  }

  function runIntro() {
    return new Promise((resolve) => {
      settlementIntroResolve = resolve;
      if (settlementTl) {
        settlementTl.kill();
        settlementTl = null;
      }
      const card = deps.settlementCardRef.value;
      const s = deps.getSnapshot();
      if (!card || !s) {
        settlementIntroResolve = null;
        resolve();
        return;
      }
      if (shouldSkipDecorativeMotion()) {
        finishIntroInstant();
        resolve();
        return;
      }
      gsap.killTweensOf(card);
      const rowEls = deps.getRowEls();
      for (const el of rowEls) {
        if (el) gsap.killTweensOf(el);
      }
      const continueBtn = deps.settlementContinueBtnRef.value;
      if (continueBtn) gsap.killTweensOf(continueBtn);

      const displayRows = deps.getDisplayRows();
      const rowSpecs = displayRows.map((row, i) => {
        const count = deps.getCountForRow(row);
        return {
          el: rowEls[i],
          anim: animSettleRowRef(i),
          count,
          empty: count === 0,
        };
      });

      for (const { el } of rowSpecs) {
        if (el) gsap.set(el, { opacity: 0, y: 18 });
      }
      if (continueBtn) gsap.set(continueBtn, { opacity: 0, y: 18 });

      const tl = gsap.timeline({
        onComplete: () => {
          settlementTl = null;
          settlementIntroResolve = null;
          resolve();
        },
      });
      settlementTl = tl;

      tl.fromTo(
        card,
        { opacity: 0, scale: 0.92, y: 24 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: EASE_TRANSFORM },
      );

      const S = settlementTotalDollarCount(s);
      const G = settlementDollarGapCount(rowSpecs);
      const SPositiveRows = rowSpecs.filter((x) => settlementAbsDollarCount(x.count) > 0).length;
      let lastIdxWithDollars = -1;
      for (let ri = 0; ri < rowSpecs.length; ri++) {
        if (settlementAbsDollarCount(rowSpecs[ri].count) > 0) lastIdxWithDollars = ri;
      }
      const innerGap = G > 0 ? settlementDollarStepGap(S, G, SPositiveRows) : 0;
      const interPad = G === 0 && S > 0 ? settlementDollarStepGap(S, 0, SPositiveRows) : 0;
      const rowIntroDur = settlementRowIntroDuration(S);

      let firstRow = true;
      for (let i = 0; i < rowSpecs.length; i++) {
        const spec = rowSpecs[i];
        const { el, anim, count, empty } = spec;
        const n = settlementAbsDollarCount(count);
        const targetOpacity = empty ? 0.42 : 1;
        const introPos = firstRow ? ">-0.07" : ">";
        firstRow = false;
        if (el) {
          tl.fromTo(
            el,
            { opacity: 0, y: 18 },
            { opacity: targetOpacity, y: 0, duration: rowIntroDur, ease: EASE_TRANSFORM },
            introPos,
          );
        }
        const padAfter =
          G === 0 &&
          S > 0 &&
          n > 0 &&
          (i < lastIdxWithDollars || (SPositiveRows === 1 && i === lastIdxWithDollars))
            ? interPad
            : 0;
        const dollarSub = buildSettlementDollarSubTimeline(
          anim,
          count,
          el,
          innerGap,
          () => shakeSettlementRow(el),
          () => deps.triggerHaptic?.("settleDollar"),
          padAfter,
        );
        tl.add(dollarSub, ">");
      }

      if (continueBtn) {
        tl.fromTo(
          continueBtn,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: rowIntroDur, ease: EASE_TRANSFORM },
          ">",
        );
      }
    });
  }

  function dispose() {
    if (settlementTl) {
      settlementTl.kill();
      settlementTl = null;
    }
    settlementIntroResolve = null;
    const card = deps.settlementCardRef.value;
    if (card) gsap.killTweensOf(card);
    for (const el of deps.getRowEls()) {
      if (el) gsap.killTweensOf(el);
    }
    const continueBtn = deps.settlementContinueBtnRef.value;
    if (continueBtn) gsap.killTweensOf(continueBtn);
  }

  return {
    resetAnimValues,
    finishIntroInstant,
    isIntroPending,
    runIntro,
    dispose,
  };
}

/**
 * @param {Object} deps
 * @param {import('vue').Ref<boolean>} deps.showSettlement
 * @param {import('vue').Ref<boolean>} deps.disableSettlementLayerAnim
 * @param {import('vue').Ref<import('./buildSettlementSnapshot.js').SettlementSnapshot | null>} deps.settlementSnapshot
 * @param {import('vue').Ref<number>} deps.settlementPortalZ
 * @param {() => number} deps.bumpOverlayZ
 * @param {() => void} deps.scheduleOverlayPresent
 * @param {() => void} deps.scheduleOverlayDismiss
 * @param {import('vue').Ref<boolean>} deps.showDeckLayer
 * @param {import('vue').Ref<boolean>} deps.showPauseOptions
 * @param {() => Promise<void>} deps.dismissTileDetailLayer
 * @param {import('vue').Ref<boolean>} deps.transitionBusy
 * @param {import('vue').Ref<number>} deps.money
 * @param {import('vue').Ref<boolean>} deps.showShop
 * @param {() => void} deps.resetDeckAfterStageEnd
 * @param {(start: number, end: number, el?: HTMLElement | null) => Promise<void>} deps.playWalletHeaderGainAnim
 * @param {() => HTMLElement | null | undefined} deps.getShopWalletEl
 * @param {() => void} deps.flushAchievementUnlocks
 * @param {() => void} deps.scheduleRunAutoSave
 * @param {(state: unknown, interest: number) => void} deps.recordAchievementRunInterest
 * @param {import('vue').Ref<unknown>} deps.achievementRunState
 * @param {() => { play?: (opts: object) => Promise<void> } | null | undefined} deps.getIrisTransition
 * @param {() => Promise<void>} deps.runHourglassStageEndFx
 * @param {() => Promise<void>} deps.runTreasureLevelCompleteHooks
 * @param {(event: Event | undefined) => void} deps.recordPointerClientFromEvent
 * @param {(kind: string) => void} deps.triggerHaptic
 * @param {typeof import('vue').nextTick} deps.nextTick
 * @param {() => import('./buildSettlementSnapshot.js').SettlementSnapshot} deps.buildSnapshot
 * @param {() => { runIntro: () => Promise<void>, finishIntroInstant: () => boolean, resetAnimValues: () => void }} deps.getLayerAnim
 */
export function createStageSettlementFlow(deps) {
  watch(deps.showSettlement, (open, prev) => {
    if (open) {
      deps.scheduleOverlayPresent(280);
      deps.settlementPortalZ.value = deps.bumpOverlayZ();
      deps.showDeckLayer.value = false;
      void deps.dismissTileDetailLayer();
    } else if (prev) {
      deps.scheduleOverlayDismiss(240);
    }
  });

  async function openStageSettlement() {
    deps.triggerHaptic("milestone");
    await deps.runHourglassStageEndFx();
    await deps.runTreasureLevelCompleteHooks();
    deps.disableSettlementLayerAnim.value = false;
    deps.settlementSnapshot.value = deps.buildSnapshot();
    deps.getLayerAnim().resetAnimValues();
    deps.showDeckLayer.value = false;
    deps.showPauseOptions.value = false;
    deps.showSettlement.value = true;
    await deps.nextTick();
    await deps.getLayerAnim().runIntro();
    deps.scheduleRunAutoSave();
  }

  /**
   * @param {Event} [event]
   */
  async function onSettlementContinue(event) {
    event?.stopPropagation?.();
    deps.recordPointerClientFromEvent(event);
    if (deps.transitionBusy.value) return;
    const s = deps.settlementSnapshot.value;
    if (!s) return;

    deps.recordAchievementRunInterest(
      deps.achievementRunState.value,
      Math.max(0, Math.round(Number(s.interest) || 0)) +
        Math.max(0, Math.round(Number(s.extraInterest) || 0)),
    );

    deps.getLayerAnim().finishIntroInstant();
    deps.disableSettlementLayerAnim.value = true;

    deps.transitionBusy.value = true;
    const startMoney = deps.money.value;
    const endMoney = startMoney + s.total;

    try {
      const playFx = deps.getIrisTransition()?.play;
      if (typeof playFx === "function") {
        await playFx({
          onCovered: () => {
            deps.showSettlement.value = false;
            deps.settlementSnapshot.value = null;
            resetDeckAfterStageEnd();
            deps.showShop.value = true;
          },
        });
      } else {
        deps.showSettlement.value = false;
        deps.settlementSnapshot.value = null;
        resetDeckAfterStageEnd();
        deps.showShop.value = true;
      }

      await deps.nextTick();
      const shopWalletEl = deps.getShopWalletEl() ?? null;
      await deps.playWalletHeaderGainAnim(startMoney, endMoney, shopWalletEl);
      deps.flushAchievementUnlocks();
      deps.scheduleRunAutoSave();
    } finally {
      deps.transitionBusy.value = false;
    }
  }

  function resetDeckAfterStageEnd() {
    deps.resetDeckAfterStageEnd();
  }

  /**
   * @param {() => Promise<void>} syncEndlessBaseline
   */
  async function enterEndlessModeAfterWin(syncEndlessBaseline) {
    if (deps.transitionBusy.value) return;
    syncEndlessBaseline();
    if (!deps.settlementSnapshot.value) {
      deps.settlementSnapshot.value = deps.buildSnapshot();
    }
    deps.disableSettlementLayerAnim.value = false;
    deps.getLayerAnim().resetAnimValues();
    deps.showDeckLayer.value = false;
    deps.showPauseOptions.value = false;
    deps.showSettlement.value = true;
    await deps.nextTick();
    await deps.getLayerAnim().runIntro();
    deps.scheduleRunAutoSave();
  }

  return {
    openStageSettlement,
    onSettlementContinue,
    enterEndlessModeAfterWin,
  };
}

export { refToDom };
