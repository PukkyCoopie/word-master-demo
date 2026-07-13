import gsap from "gsap";
import { resetTreasureSlotElAfterDestroyShrink } from "./treasureDestroyFx.js";
import { EASE_TRANSFORM } from "../constants.js";
import { animSleep } from "../settings/animationSpeed.js";
import { getLevelEndAnimSpeed } from "./levelEndAnimSpeed.js";
import { runGridTileIgniteAtCell } from "./gridTileIgniteFx.js";
import { applyFireMaterialToTile } from "./tileMaterialApply.js";
import {
  buildVolcanoEruptionRippleTargets,
  collectVolcanoIgniteGridCells,
  resolveVolcanoTreasureVictimIndices,
} from "./volcanoEruptionTargets.js";
import { TREASURE_HOOKS_BY_ID, resolveTreasureVolcanoEruptionImmune } from "../treasures/treasureRegistry.js";
import { PLUS_BUBBLE_ENTER_DURATION_S } from "./scoreBubbleFx.js";

const VOLCANO_ID = "54";
const VOLCANO_BUBBLE_Z_INDEX = 420;
const RIPPLE_START_DELAY_MS = 280;
const RIPPLE_STAGGER_MS = 72;
/** 摧毁/点燃全部结束后、进入结算前的后摇 */
const ERUPTION_RECOVERY_MS = 1500;
const ERUPTION_DURATION_S = 1.35;
const VOLCANO_BUBBLE_HOLD_S = 1.05;
const VOLCANO_BUBBLE_GROW_SCALE = 1.42;
const VOLCANO_BUBBLE_OUTRO_S = 0.55;

/** @param {Element | null | undefined} slotEl */
function resolveVolcanoWobbleEl(slotEl) {
  if (
    slotEl instanceof HTMLElement &&
    slotEl.classList.contains("treasure-slot--stack-overlap")
  ) {
    const face = slotEl.querySelector(".treasure-slot-face");
    if (face instanceof HTMLElement) return face;
  }
  return slotEl instanceof HTMLElement ? slotEl : null;
}

/**
 * @param {gsap.core.Timeline} tl
 * @param {HTMLElement} el
 * @param {number} startTime
 * @param {number} endTime
 * @param {{ rot?: number, x?: number, y?: number }} [max]
 */
function appendChaoticJitter(tl, el, startTime, endTime, max = {}) {
  const rotMax = max.rot ?? 9;
  const xMax = max.x ?? 5;
  const yMax = max.y ?? 4;
  let t = startTime;
  while (t < endTime) {
    const dur = gsap.utils.random(0.018, 0.042);
    tl.to(
      el,
      {
        rotation: gsap.utils.random(-rotMax, rotMax),
        x: gsap.utils.random(-xMax, xMax),
        y: gsap.utils.random(-yMax, yMax),
        duration: dur,
        ease: "none",
      },
      t,
    );
    t += dur * gsap.utils.random(0.25, 0.72);
  }
}

/** @param {HTMLElement} slotEl @param {number} [speed=1] */
function runVolcanoSlotEruptionWobble(slotEl, speed = 1) {
  const wobbleEl = resolveVolcanoWobbleEl(slotEl);
  if (!wobbleEl) return Promise.resolve();
  const s = Math.max(0.01, Number(speed) || 1);

  gsap.killTweensOf(wobbleEl, "rotation,scale,x,y");
  gsap.set(wobbleEl, { x: 0, y: 0, rotation: 0, scale: 1, transformOrigin: "50% 55%" });

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(wobbleEl, { clearProps: "rotation,scale,x,y" });
        resolve();
      },
    });

    tl.to(wobbleEl, { scale: 1.08, duration: ERUPTION_DURATION_S * 0.35, ease: "power2.out" }, 0);
    tl.to(
      wobbleEl,
      { scale: 1.32, duration: ERUPTION_DURATION_S * 0.65, ease: "power3.inOut" },
      ERUPTION_DURATION_S * 0.35,
    );
    appendChaoticJitter(tl, wobbleEl, 0, ERUPTION_DURATION_S * 0.92, { rot: 9, x: 5, y: 4 });
    tl.to(
      wobbleEl,
      { rotation: 0, x: 0, y: 0, scale: 1.12, duration: 0.12, ease: "power2.out" },
      ERUPTION_DURATION_S * 0.92,
    );
    tl.timeScale(s);
  });
}

/** @param {HTMLElement} bubble @param {number} [speed=1] */
function runVolcanoEruptionBubbleFx(bubble, speed = 1) {
  if (!(bubble instanceof HTMLElement)) return Promise.resolve();
  const s = Math.max(0.01, Number(speed) || 1);

  gsap.killTweensOf(bubble, "x,y,rotation,scale,opacity");
  gsap.set(bubble, { opacity: 1, scale: 1, x: 0, y: 0, rotation: 0, transformOrigin: "50% 100%" });

  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve });
    tl.to(bubble, { scale: 1.08, duration: 0.18 / s, ease: "power2.out" }, 0);
    appendChaoticJitter(tl, bubble, 0.08 / s, VOLCANO_BUBBLE_HOLD_S, { rot: 12, x: 8, y: 6 });
    tl.to(
      bubble,
      { scale: VOLCANO_BUBBLE_GROW_SCALE, duration: VOLCANO_BUBBLE_HOLD_S * 0.55 / s, ease: "power2.inOut" },
      0.2 / s,
    );
    tl.to(
      bubble,
      {
        opacity: 0,
        y: "-=18",
        scale: VOLCANO_BUBBLE_GROW_SCALE * 1.08,
        duration: VOLCANO_BUBBLE_OUTRO_S / s,
        ease: EASE_TRANSFORM,
        onComplete: () => bubble.remove(),
      },
      VOLCANO_BUBBLE_HOLD_S / s,
    );
  });
}

/**
 * @typedef {Object} VolcanoEruptionFxDeps
 * @property {number} volcanoSlotIndex
 * @property {readonly (object | null | undefined)[]} ownedTreasures
 * @property {import('vue').ShallowRef<Record<string, unknown>[][]>} grid
 * @property {number} ROWS
 * @property {number} COLS
 * @property {(slotIndex: number) => HTMLElement | undefined} getOwnedTreasureSlotEl
 * @property {(slotIndex: number) => HTMLElement | null | undefined} getOwnedTreasureBubbleAnchorEl
 * @property {(row: number, col: number) => HTMLElement | undefined} getGridTileEl
 * @property {(slotIndex: number) => boolean} isOwnedTreasureSlotNoSell
 * @property {(slotIndex: number) => boolean} isTreasureBarSlotVisible
 * @property {(slotEl: unknown, text: string, kind: string, speed?: number, bubbleZIndex?: number) => HTMLElement | null} showScoreBubble
 * @property {(bubble: HTMLElement | null, speed?: number) => void} scheduleSmallPlusBubbleOutro
 * @property {(slotIndex: number, el: HTMLElement, sp: number, bubbleOpts?: { feint?: boolean }) => Promise<HTMLElement | null>} wobbleTreasureSlotWithDestroyBubbleConcurrent
 * @property {(el: HTMLElement, bubble: HTMLElement | null, sp: number, opts?: { feint?: boolean }) => Promise<void>} shrinkTreasureSlotElOnly
 * @property {(slotIndex: number) => void} clearOwnedTreasureSlotLeaveGapAtIndex
 * @property {(opts?: { triggerBarCompactAnim?: boolean }) => boolean} [reconcileOwnedTreasureSlotsAfterLeaveGapDestruction]
 * @property {() => void} scheduleRunAutoSave
 * @property {() => void} touchGrid
 * @property {() => Promise<void>} nextTick
 * @property {(v: boolean) => void} setShopOverlayLayersSuppressed
 * @property {(slotEl: unknown) => DOMRect | null} scoreBubbleAnchorRect
 */

/** @param {VolcanoEruptionFxDeps} deps @param {number} slotIndex @param {number} sp */
async function runVolcanoDestroyTreasureAtSlot(deps, slotIndex, sp) {
  const ix = Math.floor(Number(slotIndex));
  const feint = deps.isOwnedTreasureSlotNoSell(ix);
  if (!deps.isTreasureBarSlotVisible(ix)) {
    if (!feint) deps.clearOwnedTreasureSlotLeaveGapAtIndex(ix);
    return;
  }
  const el = deps.getOwnedTreasureSlotEl(ix);
  if (!el) {
    if (!feint) deps.clearOwnedTreasureSlotLeaveGapAtIndex(ix);
    return;
  }
  const bubble = await deps.wobbleTreasureSlotWithDestroyBubbleConcurrent(ix, el, sp, { feint });
  await deps.shrinkTreasureSlotElOnly(el, bubble, sp, { feint });
  if (!feint) {
    deps.clearOwnedTreasureSlotLeaveGapAtIndex(ix);
    await deps.nextTick();
    resetTreasureSlotElAfterDestroyShrink(deps.getOwnedTreasureSlotEl(ix) ?? el);
  }
}

/** @param {VolcanoEruptionFxDeps} deps @param {number} row @param {number} col @param {number} sp */
async function runVolcanoIgniteGridCell(deps, row, col, sp) {
  const g = deps.grid.value;
  const cell = g[row]?.[col];
  if (!cell || typeof cell !== "object") return;

  await runGridTileIgniteAtCell(
    {
      getGridTileEl: deps.getGridTileEl,
      touchGrid: deps.touchGrid,
      showScoreBubble: deps.showScoreBubble,
      scheduleSmallPlusBubbleOutro: deps.scheduleSmallPlusBubbleOutro,
    },
    row,
    col,
    () => {
      const c = g[row]?.[col];
      if (c && typeof c === "object") applyFireMaterialToTile(/** @type {Record<string, unknown>} */ (c));
    },
    sp,
  );
}

/** @param {VolcanoEruptionFxDeps} deps */
export async function runVolcanoEruptionFx(deps) {
  const volcanoIx = Math.floor(Number(deps.volcanoSlotIndex));
  if (!Number.isFinite(volcanoIx) || volcanoIx < 0) return;

  const bubbleCfg = TREASURE_HOOKS_BY_ID.get(VOLCANO_ID)?.resolveVolcanoEruptionBubble?.() ?? {
    text: "火山喷发！",
    kind: "volcano-eruption",
  };
  const bubbleText = String(bubbleCfg?.text ?? "火山喷发！");
  const bubbleKind = String(bubbleCfg?.kind ?? "volcano-eruption");
  const sp = getLevelEndAnimSpeed();

  const volcanoSlotEl = deps.getOwnedTreasureSlotEl(volcanoIx);
  const bubbleAnchorEl = deps.getOwnedTreasureBubbleAnchorEl(volcanoIx) ?? volcanoSlotEl;

  await deps.nextTick();

  const victimIndices = resolveVolcanoTreasureVictimIndices(deps.ownedTreasures, volcanoIx, (_ix, slot) =>
    resolveTreasureVolcanoEruptionImmune(String(slot?.treasureId ?? "").trim(), slot),
  );
  const igniteCells = collectVolcanoIgniteGridCells(deps.grid.value, deps.ROWS, deps.COLS);
  const anchorRect = bubbleAnchorEl ? deps.scoreBubbleAnchorRect(bubbleAnchorEl) : null;

  const rippleTargets = buildVolcanoEruptionRippleTargets({
    victimSlotIndices: victimIndices,
    igniteGridCells: igniteCells,
    anchorRect,
    getTreasureSlotRect: (ix) => {
      const el = deps.getOwnedTreasureSlotEl(ix);
      if (!(el instanceof HTMLElement)) return null;
      return el.getBoundingClientRect();
    },
    getGridCellRect: (row, col) => {
      const el = deps.getGridTileEl(row, col);
      if (!(el instanceof HTMLElement)) return null;
      return el.getBoundingClientRect();
    },
  });

  if (rippleTargets.length) {
    deps.setShopOverlayLayersSuppressed(true);
    await deps.nextTick();
  }

  /** 火山本体喷发（与扩散 ripple 并行，计时均从 eruption t=0 起算） */
  const volcanoPhaseP = (async () => {
    if (!volcanoSlotEl || !deps.isTreasureBarSlotVisible(volcanoIx)) return;
    const wobbleP = runVolcanoSlotEruptionWobble(volcanoSlotEl, sp);
    const bubbleP = (async () => {
      await deps.nextTick();
      await new Promise((r) => requestAnimationFrame(r));
      const bubble = deps.showScoreBubble(
        bubbleAnchorEl,
        bubbleText,
        bubbleKind,
        sp,
        VOLCANO_BUBBLE_Z_INDEX,
      );
      if (!bubble) return null;
      await animSleep(Math.ceil(PLUS_BUBBLE_ENTER_DURATION_S * 1000 / sp));
      await runVolcanoEruptionBubbleFx(bubble, sp);
      return bubble;
    })();
    await Promise.all([wobbleP, bubbleP]);
    const wobbleEl = resolveVolcanoWobbleEl(volcanoSlotEl);
    if (wobbleEl) gsap.set(wobbleEl, { clearProps: "rotation,scale,x,y" });
  })();

  /** 扩散：t=280ms 起按 DOM 距离 stagger 启动，彼此重叠进行 */
  const ripplePs = rippleTargets.map((target, i) =>
    (async () => {
      await animSleep(RIPPLE_START_DELAY_MS + i * RIPPLE_STAGGER_MS, sp);
      if (target.kind === "treasure") {
        await runVolcanoDestroyTreasureAtSlot(deps, target.slotIndex, sp);
      } else {
        await runVolcanoIgniteGridCell(deps, target.row, target.col, sp);
      }
    })(),
  );

  await Promise.all([volcanoPhaseP, ...ripplePs]);

  const destroyedTreasures = rippleTargets.some((t) => t.kind === "treasure");
  if (destroyedTreasures) {
    deps.reconcileOwnedTreasureSlotsAfterLeaveGapDestruction?.({ triggerBarCompactAnim: true });
    await deps.nextTick();
  }

  await animSleep(ERUPTION_RECOVERY_MS, sp);

  if (rippleTargets.length) {
    deps.setShopOverlayLayersSuppressed(false);
  }
  deps.scheduleRunAutoSave();
  await deps.nextTick();
}
