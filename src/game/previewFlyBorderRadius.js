import gsap from "gsap";

/** @param {Element | null | undefined} el */
export function readBorderRadiusPx(el) {
  if (!el) return 0;
  const raw = getComputedStyle(el).borderTopLeftRadius;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 布局 border-radius × 祖先 transform 后的屏上视觉半径（不含飞入根 GSAP scale）。
 * @param {Element | null | undefined} el
 */
export function readVisualBorderRadiusPx(el) {
  const layoutR = readBorderRadiusPx(el);
  if (!(el instanceof HTMLElement) || layoutR <= 0) return layoutR;
  const ow = el.offsetWidth;
  if (ow <= 0) return layoutR;
  const visualScale = el.getBoundingClientRect().width / ow;
  if (!Number.isFinite(visualScale) || visualScale <= 0) return layoutR;
  return layoutR * visualScale;
}

/** @param {ParentNode | null | undefined} root */
export function queryPreviewFlyTileEl(root) {
  const el = root?.querySelector?.(".grid-tile");
  return el instanceof HTMLElement ? el : null;
}

/**
 * 飞入/飞出：配合根节点 uniform scale，反算 LetterTile 上应 tween 的 border-radius。
 * visual ≈ cssRadius × tileStaticScale × gsapScale
 *
 * @param {{
 *   tileEl: HTMLElement,
 *   gsapScaleEnd: number,
 *   borderRadiusFromVisual: number,
 *   borderRadiusToVisual: number,
 * }} opts
 */
export function resolvePreviewFlyBorderRadiusCssRange(opts) {
  const { tileEl, gsapScaleEnd, borderRadiusFromVisual, borderRadiusToVisual } = opts;
  const layoutR = readBorderRadiusPx(tileEl);
  if (layoutR <= 0) return null;
  const tileStaticScale =
    borderRadiusFromVisual > 0 ? borderRadiusFromVisual / layoutR : readVisualBorderRadiusPx(tileEl) / layoutR;
  const staticScale = Number.isFinite(tileStaticScale) && tileStaticScale > 0 ? tileStaticScale : 1;
  const scaleEnd = Math.max(0.06, gsapScaleEnd);
  return {
    cssStart: borderRadiusFromVisual / staticScale,
    cssEnd: borderRadiusToVisual / (staticScale * scaleEnd),
  };
}

/**
 * @param {gsap.core.Timeline} tl
 * @param {{
 *   cloneRoot: HTMLElement,
 *   targetRoot: HTMLElement,
 *   gsapScaleEnd: number,
 *   direction: "enter" | "close",
 *   duration: number,
 *   position?: gsap.Position,
 * }} opts
 */
export function appendPreviewFlyTileBorderRadiusTween(tl, opts) {
  const { cloneRoot, targetRoot, gsapScaleEnd, direction, duration, position = 0 } = opts;
  const cloneTile = queryPreviewFlyTileEl(cloneRoot);
  const targetTile = queryPreviewFlyTileEl(targetRoot);
  if (!cloneTile || !targetTile) return;

  const layoutR = readBorderRadiusPx(cloneTile);
  if (layoutR <= 0) return;

  const targetVisual = readVisualBorderRadiusPx(targetTile);
  const originVisual =
    direction === "enter" ? readVisualBorderRadiusPx(cloneTile) : layoutR;
  const borderRadiusFromVisual = direction === "enter" ? originVisual : targetVisual;
  const borderRadiusToVisual = direction === "enter" ? targetVisual : originVisual;

  const range = resolvePreviewFlyBorderRadiusCssRange({
    tileEl: cloneTile,
    gsapScaleEnd,
    borderRadiusFromVisual,
    borderRadiusToVisual,
  });
  if (!range) return;

  gsap.set(cloneTile, { borderRadius: range.cssStart });
  tl.to(
    cloneTile,
    {
      borderRadius: range.cssEnd,
      duration,
    },
    position,
  );
}

/** @param {ParentNode | null | undefined} cloneRoot */
export function clearPreviewFlyTileBorderRadius(cloneRoot) {
  const tile = queryPreviewFlyTileEl(cloneRoot);
  if (tile instanceof HTMLElement) {
    gsap.set(tile, { clearProps: "borderRadius" });
  }
}
