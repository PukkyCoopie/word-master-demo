import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";
import { shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";
import { beginFlySourceHide, ensureFlyCloneVisible } from "./flySourceHide.js";
import {
  buildPackDeckOfferFlySnapshot,
  mountDeckOfferFlyProductStack,
  normalizeSquareFlyRect,
} from "./packDeckOfferVisual.js";
import {
  resolveDeckTileFlyMoveEndScale,
  resolveDeckTileFlyStartScale,
  runDeckTileFlyToDeckTween,
} from "./deckTileFlyToDeckAnim.js";

/** 购买后：克隆详情框中心对齐飞入宝藏槽（expo.out，无回弹 overshoot） */
const TREASURE_PURCHASE_FLY_S = 0.4;
const TREASURE_PURCHASE_FLY_LAND_AT = 0.36;
const TREASURE_PURCHASE_FLY_FADE_AT = 0.39;

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

/**
 * @param {HTMLElement} fromFrameEl
 * @param {HTMLElement | DOMRect} toTarget
 * @param {{ onLanding?: () => void, keepSourceHidden?: boolean }} [opts]
 */
export async function animateTreasureFrameFly(fromFrameEl, toTarget, opts = {}) {
  if (!fromFrameEl || !toTarget) return;
  if (shouldSkipDecorativeMotion()) return;
  const from = fromFrameEl.getBoundingClientRect();
  const clone = fromFrameEl.cloneNode(true);
  ensureFlyCloneVisible(clone);
  clone.setAttribute("aria-hidden", "true");
  clone.classList.remove("shop-treasure-frame--detail");
  clone.classList.add("treasure-purchase-fly-clone");

  gsap.killTweensOf(clone);

  document.body.appendChild(clone);
  const restoreSourceHide = beginFlySourceHide(fromFrameEl);
  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const to =
      typeof toTarget.getBoundingClientRect === "function"
        ? toTarget.getBoundingClientRect()
        : /** @type {DOMRect} */ (toTarget);
    const tw = Math.max(to.width, 1e-6);
    const th = Math.max(to.height, 1e-6);

    const cx0 = from.left + from.width / 2;
    const cy0 = from.top + from.height / 2;
    const cx1 = to.left + to.width / 2;
    const cy1 = to.top + to.height / 2;
    const scale0 = Math.min(from.width / tw, from.height / th);

    gsap.set(clone, {
      position: "fixed",
      left: cx0,
      top: cy0,
      width: tw,
      height: th,
      margin: 0,
      xPercent: -50,
      yPercent: -50,
      x: 0,
      y: 0,
      scale: scale0,
      zIndex: 9999,
      pointerEvents: "none",
      boxSizing: "border-box",
      transformOrigin: "50% 50%",
      force3D: true,
      willChange: "transform",
    });

    const onLanding = typeof opts.onLanding === "function" ? opts.onLanding : null;
    let landed = false;
    const fireLanding = () => {
      if (landed) return;
      landed = true;
      onLanding?.();
    };

    await new Promise((resolve) => {
      const tl = gsap.timeline({
        onComplete: () => {
          clone.remove();
          resolve(undefined);
        },
      });
      tl.to(
        clone,
        {
          x: cx1 - cx0,
          y: cy1 - cy0,
          scale: 1,
          duration: TREASURE_PURCHASE_FLY_S,
          ease: EASE_TRANSFORM,
        },
        0,
      );
      if (onLanding) {
        tl.call(fireLanding, null, TREASURE_PURCHASE_FLY_LAND_AT);
        tl.to(
          clone,
          {
            opacity: 0,
            duration: 0.08,
            ease: "power1.out",
          },
          TREASURE_PURCHASE_FLY_FADE_AT,
        );
      }
    });
  } finally {
    if (!opts.keepSourceHidden) restoreSourceHide();
  }
}

/**
 * 字母块飞入牌库：位移 expo.out；scale 初值→1→1.2→0（见 deckTileFlyToDeckAnim.js）。
 * @param {unknown} fromEl
 * @param {unknown} toTarget
 * @param {{ flyLiveElement?: boolean; deckTileFly?: boolean; skipInitialRaf?: boolean; fromRect?: { left: number, top: number, width: number, height: number } | null; exactFromRect?: boolean }} [options]
 */
export async function animatePackTileFlyToDeck(fromEl, toTarget, options = {}) {
  const fromNode = refToDom(fromEl) ?? (fromEl instanceof HTMLElement ? fromEl : null);
  const toNode = refToDom(toTarget) ?? (toTarget instanceof HTMLElement ? toTarget : null);
  if (!fromNode || typeof fromNode.getBoundingClientRect !== "function") return;
  if (shouldSkipDecorativeMotion()) return;
  const fromRaw = fromNode.getBoundingClientRect();
  const from =
    options.fromRect && options.fromRect.width >= 2
      ? options.fromRect
      : options.deckTileFly
        ? normalizeSquareFlyRect(fromRaw)
        : fromRaw;
  const to =
    toNode && typeof toNode.getBoundingClientRect === "function"
      ? toNode.getBoundingClientRect()
      : typeof toTarget?.getBoundingClientRect === "function"
        ? toTarget.getBoundingClientRect()
        : /** @type {DOMRect} */ (toTarget);
  if (!to || !Number.isFinite(to.width)) return;

  const flyLive = options.flyLiveElement === true;
  const flyEl = flyLive ? fromNode : /** @type {HTMLElement} */ (fromNode.cloneNode(true));
  if (!flyLive) {
    flyEl.setAttribute("aria-hidden", "true");
    flyEl.classList.add("pack-tile-purchase-fly-clone");
    if (options.deckTileFly) flyEl.classList.add("pack-tile-purchase-fly-clone--deck-tile");
    flyEl.querySelectorAll("canvas").forEach((c) => c.remove());
    ensureFlyCloneVisible(flyEl);
  } else {
    flyEl.setAttribute("aria-hidden", "true");
    flyEl.classList.add("pack-tile-purchase-fly-clone");
    if (options.deckTileFly) flyEl.classList.add("pack-tile-purchase-fly-clone--deck-tile");
  }

  gsap.killTweensOf(flyEl);

  Object.assign(flyEl.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: "0",
    zIndex: "9999",
    pointerEvents: "none",
    boxSizing: "border-box",
    transformOrigin: "50% 50%",
    willChange: "transform, opacity",
  });

  if (!flyLive) document.body.appendChild(flyEl);
  else if (flyEl.parentElement !== document.body) document.body.appendChild(flyEl);

  if (!options.skipInitialRaf) {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  const cx0 = from.left + from.width / 2;
  const cy0 = from.top + from.height / 2;
  const cx1 = to.left + to.width / 2;
  const cy1 = to.top + to.height / 2;
  const dx = cx1 - cx0;
  const dy = cy1 - cy0;
  const exactFrom = options.exactFromRect === true || Boolean(options.fromRect);
  const startScale = resolveDeckTileFlyStartScale(from, fromRaw, exactFrom);
  const moveEndScale = resolveDeckTileFlyMoveEndScale(from, to);

  await runDeckTileFlyToDeckTween(flyEl, dx, dy, {
    startScale,
    moveEndScale,
    onComplete: () => {
      flyEl.remove();
    },
  });
}

/**
 * 牌包/商店字母选项飞入牌库：用完整 LetterTile（材质 Regl、配饰、角标）而非 DOM clone。
 * @param {Record<string, unknown>} offer deckLetter / deckTile 选项
 * @param {unknown} fromEl 起点 DOM（取 rect）
 * @param {unknown} toTarget 牌库按钮
 * @param {{ keepSourceHidden?: boolean; fromRect?: { left: number, top: number, width: number, height: number } | null; priceStruck?: boolean }} [opts]
 */
export async function animatePackDeckOfferFlyToDeck(offer, fromEl, toTarget, opts = {}) {
  const fromNode = refToDom(fromEl) ?? (fromEl instanceof HTMLElement ? fromEl : null);
  if (!fromNode || typeof fromNode.getBoundingClientRect !== "function") return;
  const snap = buildPackDeckOfferFlySnapshot(offer);
  const priceStruck = opts.priceStruck === true;
  if (!snap) {
    const restoreSourceHide = beginFlySourceHide(fromNode);
    try {
      await animatePackTileFlyToDeck(fromNode, toTarget, { deckTileFly: true });
    } finally {
      if (!opts.keepSourceHidden) restoreSourceHide();
    }
    return;
  }
  const from =
    opts.fromRect && opts.fromRect.width >= 2 && opts.fromRect.height >= 2
      ? opts.fromRect
      : (() => {
          const visual =
            fromNode.closest?.(".shop-treasure-visual") ??
            fromNode.closest?.(".shop-deck-offer-product-stack") ??
            (fromNode.classList.contains("shop-treasure-visual") ||
            fromNode.classList.contains("shop-deck-offer-product-stack")
              ? fromNode
              : null);
          const measure = visual ?? fromNode;
          const r = measure.getBoundingClientRect();
          return r.width >= 2 && r.height >= 2
            ? { left: r.left, top: r.top, width: r.width, height: r.height }
            : normalizeSquareFlyRect(fromNode.getBoundingClientRect());
        })();
  if (!from.width || !from.height) return;

  const host = document.createElement("div");
  host.className = "pack-tile-purchase-fly-clone pack-tile-purchase-fly-clone--deck-tile";
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: "0",
    zIndex: "9999",
    pointerEvents: "none",
    boxSizing: "border-box",
    transformOrigin: "50% 50%",
  });
  document.body.appendChild(host);
  const disposeTile = mountDeckOfferFlyProductStack(host, offer, { priceStruck });
  ensureFlyCloneVisible(host);
  gsap.set(host, {
    x: 0,
    y: 0,
    scale: 1,
    opacity: 1,
    visibility: "visible",
    force3D: true,
  });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (!opts.keepSourceHidden) {
    beginFlySourceHide(fromNode);
  }
  try {
    await animatePackTileFlyToDeck(host, toTarget, {
      flyLiveElement: true,
      deckTileFly: true,
      skipInitialRaf: true,
      fromRect: from,
      exactFromRect: Boolean(opts.fromRect),
    });
  } finally {
    disposeTile();
    host.remove();
  }
}
