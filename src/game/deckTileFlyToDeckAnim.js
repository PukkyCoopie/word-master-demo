import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";

/** 位移基础时长（略长于旧版，给末段 pop 留余量） */
const MOVE_BASE_S = 0.46;
/** 参考飞行距离（px），超出部分按比例加时 */
const MOVE_DIST_REF_PX = 720;
/** 距离附加时长上限 */
const MOVE_DIST_EXTRA_MAX_S = 0.26;
/** 抵达字母库：scale 1 → 1.2 */
const POP_UP_S = 0.12;
/** 字母库上方：scale 1.2 → 0 */
const POP_DOWN_S = 0.14;
const POP_UP_EASE = "back.out(1.6)";
const POP_DOWN_EASE = "power2.in";
export const DECK_TILE_FLY_POP_SCALE = 1.2;

/**
 * @param {number} distPx
 * @returns {number}
 */
export function deckTileFlyMoveDuration(distPx) {
  const d = Math.max(0, Number(distPx) || 0);
  const extra = Math.min(MOVE_DIST_EXTRA_MAX_S, (d / MOVE_DIST_REF_PX) * MOVE_DIST_EXTRA_MAX_S);
  return MOVE_BASE_S + extra;
}

/**
 * 飞行末段 scale：使固定尺寸飞入盒在字母库按钮处的视觉边长与目标一致。
 * @param {{ width: number, height: number }} flyBox
 * @param {DOMRect | { width: number, height: number }} toRect
 */
export function resolveDeckTileFlyMoveEndScale(flyBox, toRect) {
  const fromSide = Math.max(flyBox.width, flyBox.height, 1);
  const toSide = Math.max(toRect.width, toRect.height, 1);
  return Math.min(1, Math.max(0.06, toSide / fromSide));
}

/**
 * 归一化正方形容器时，视觉字母可能小于容器；飞行初段 scale 略小再趋近 moveEndScale。
 * @param {{ width: number, height: number }} flyBox
 * @param {DOMRect | { width: number, height: number }} rawRect
 * @param {boolean} exactFromRect
 */
export function resolveDeckTileFlyStartScale(flyBox, rawRect, exactFromRect) {
  if (exactFromRect) return 1;
  const side = Math.max(flyBox.width, flyBox.height, 1);
  const rawW = Math.max(rawRect.width, 1);
  const rawH = Math.max(rawRect.height, 1);
  const fill = Math.min(rawW, rawH) / side;
  return Math.min(1, Math.max(0.72, fill));
}

/**
 * 字母块飞入字母库：位移 expo.out；scale startScale→moveEndScale→moveEnd×1.2→0。
 * @param {HTMLElement} flyEl
 * @param {number} dx
 * @param {number} dy
 * @param {{ startScale?: number, moveEndScale?: number, onComplete?: () => void }} [opts]
 * @returns {Promise<void>}
 */
export function runDeckTileFlyToDeckTween(flyEl, dx, dy, opts = {}) {
  const startScale = opts.startScale ?? 1;
  const moveEndScale = opts.moveEndScale ?? 1;
  const dist = Math.hypot(dx, dy);
  const moveDuration = deckTileFlyMoveDuration(dist);
  const popPeakScale = moveEndScale * DECK_TILE_FLY_POP_SCALE;

  return new Promise((resolve) => {
    const finish = () => {
      opts.onComplete?.();
      resolve(undefined);
    };

    const tl = gsap.timeline({ onComplete: finish });

    tl.fromTo(
      flyEl,
      { x: 0, y: 0, scale: startScale, opacity: 1 },
      {
        x: dx,
        y: dy,
        scale: moveEndScale,
        duration: moveDuration,
        ease: EASE_TRANSFORM,
      },
      0,
    );

    tl.to(
      flyEl,
      {
        scale: popPeakScale,
        duration: POP_UP_S,
        ease: POP_UP_EASE,
      },
      moveDuration,
    );

    tl.to(
      flyEl,
      {
        scale: 0,
        opacity: 0.35,
        duration: POP_DOWN_S,
        ease: POP_DOWN_EASE,
      },
      moveDuration + POP_UP_S,
    );
  });
}
