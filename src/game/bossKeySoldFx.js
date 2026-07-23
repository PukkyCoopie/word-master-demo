/**
 * 宝藏 136「钥匙」卖出后：Boss 机制解除的棋盘/分数/条带动效编排。
 */
import gsap from "gsap";
import { nextTick } from "vue";
import { reconcileContinuousBossDebuffsAfterRestrictionLifted } from "./bossTileDebuff.js";
import { resolveLevelTargetScoreForDifficulty } from "./runDifficultyRuntime.js";
import {
  createShopStylePopupBubble,
  dismissShopStylePopupBubble,
  playShopStylePopupBubbleEnter,
} from "./popupBubbleFx.js";
import { getAnimationSpeedScale } from "../settings/animationSpeed.js";
import {
  compareScore,
  interpolateScore,
  scoreLt,
} from "../utils/scoreInteger.js";

/** 通关分被 Boss 抬高、钥匙解除后应回落到默认 Boss 倍率（2×）的 slug */
export const BOSS_SCORE_MULT_RELIEF_SLUGS = Object.freeze(
  new Set(["the_wall", "violet_vessel"]),
);

/**
 * @param {string} levelId
 * @param {number} difficultyIndex
 * @returns {import('../utils/scoreInteger.js').ScoreValue}
 */
export function resolveBossTargetScoreAfterKeySold(levelId, difficultyIndex) {
  return resolveLevelTargetScoreForDifficulty(levelId, "", difficultyIndex);
}

/**
 * @param {HTMLElement | null | undefined} targetEl
 * @param {string} text
 */
export function showBossNeutralBubble(targetEl, text) {
  const div = createShopStylePopupBubble(targetEl, text, "boss-neutral");
  if (!div) return;
  const speed = getAnimationSpeedScale();
  playShopStylePopupBubbleEnter(div, speed);
  dismissShopStylePopupBubble(div, speed);
}

/**
 * Boss 条带扣款气泡（暗红 -$n）。
 * @param {HTMLElement | null | undefined} targetEl
 * @param {number} amount 正数金额
 */
export function showBossMoneyDebtBubble(targetEl, amount) {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  if (n <= 0) return;
  const div = createShopStylePopupBubble(targetEl, `-$${n}`, "money-debt");
  if (!div) return;
  const speed = getAnimationSpeedScale();
  playShopStylePopupBubbleEnter(div, speed);
  dismissShopStylePopupBubble(div, speed);
}

/**
 * @param {HTMLElement | null | undefined} el
 */
function wobbleScoreTargetCard(el) {
  if (!el) return;
  const s = Math.max(0.01, getAnimationSpeedScale());
  gsap.killTweensOf(el, "rotation,scale,x,y");
  gsap.set(el, { x: 0, y: 0, rotation: 0, scale: 1, transformOrigin: "50% 55%" });
  gsap
    .timeline()
    .to(el, { scale: 0.78, duration: 0.11 / s, ease: "circ.out" }, 0)
    .to(el, { scale: 1.18, duration: 0.15 / s, ease: "circ.inOut" }, 0.11 / s)
    .to(el, { scale: 1, duration: 0.3 / s, ease: "circ.in" }, 0.26 / s)
    .timeScale(s);
}

/**
 * @param {import('vue').Ref<import('../utils/scoreInteger.js').ScoreValue>} targetScoreRef
 * @param {import('../utils/scoreInteger.js').ScoreValue} toValue
 */
async function tweenTargetScoreDown(targetScoreRef, toValue) {
  const start = targetScoreRef.value;
  const goal = toValue;
  if (compareScore(start, goal) <= 0) {
    targetScoreRef.value = goal;
    return;
  }
  const state = { t: 0 };
  const s = Math.max(0.01, getAnimationSpeedScale());
  await new Promise((resolve) => {
    gsap.to(state, {
      t: 1,
      duration: 0.5 / s,
      ease: "expo.out",
      onUpdate: () => {
        targetScoreRef.value = interpolateScore(start, goal, state.t);
      },
      onComplete: resolve,
    });
  });
  targetScoreRef.value = goal;
}

/**
 * @param {object} deps
 * @param {string} deps.activeBossSlug
 * @param {string} deps.levelId
 * @param {number} deps.difficultyIndex
 * @param {import('vue').Ref<number>} deps.targetScore
 * @param {object[][]} deps.grid
 * @param {number} deps.rows
 * @param {number} deps.cols
 * @param {import('./bossTileDebuff.js').BossTileDebuffContext} deps.bossTileDebuffContext
 * @param {() => void} deps.touchGrid
 * @param {() => boolean} deps.releaseManacleBossTopRow
 * @param {{ captureGridRectsByTileId?: () => Map<string, DOMRect>, runGridDropAnimation?: (prev: object) => Promise<void> }} [deps.gridDropAnim]
 * @param {() => Map<string, { row: number, col: number }>} [deps.snapshotGridCellsByTileId]
 * @param {() => HTMLElement | null} [deps.getTargetScoreCardEl]
 * @param {() => { playKeySuppressedCue?: () => void } | null} [deps.getBossTapeStrip]
 */
export async function runBossKeySoldEffects(deps) {
  const slug = String(deps.activeBossSlug ?? "").trim();
  if (!slug) return;

  reconcileContinuousBossDebuffsAfterRestrictionLifted(
    deps.grid,
    slug,
    deps.bossTileDebuffContext,
    deps.rows,
    deps.cols,
  );
  deps.touchGrid();

  if (
    slug === "the_manacle" &&
    typeof deps.releaseManacleBossTopRow === "function" &&
    deps.releaseManacleBossTopRow()
  ) {
    const prevFlip = {
      cells: deps.snapshotGridCellsByTileId?.() ?? new Map(),
    };
    await nextTick();
    await deps.gridDropAnim?.runGridDropAnimation?.(prevFlip);
  }

  if (BOSS_SCORE_MULT_RELIEF_SLUGS.has(slug)) {
    const normalTarget = resolveBossTargetScoreAfterKeySold(deps.levelId, deps.difficultyIndex);
    const current = deps.targetScore.value;
    if (scoreLt(normalTarget, current)) {
      wobbleScoreTargetCard(deps.getTargetScoreCardEl?.());
      await tweenTargetScoreDown(deps.targetScore, normalTarget);
    } else if (compareScore(normalTarget, current) !== 0) {
      deps.targetScore.value = normalTarget;
    }
  }

  deps.getBossTapeStrip?.()?.playKeySuppressedCue?.();
}
