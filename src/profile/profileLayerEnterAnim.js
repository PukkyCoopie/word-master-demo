import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";
import { portalScrimGsapVars } from "../game/portalScrimBleed.js";
import { sortElementsTopLeftToBottomRight } from "../game/deckLayerEnterAnim.js";
import {
  instantRevealGsapTargets,
  shouldSkipDecorativeMotion,
} from "../settings/animationSpeed.js";

const ENTER_DURATION = 0.48;
const SCRIM_DURATION = 0.36;
const STAGGER_DURATION = 0.34;
const STAGGER_STEP = 0.045;
/** morph 刚开始即按视口位置依次入场 */
const STAGGER_START_DURING_MORPH = 0.06;
const CARD_BG_REVEAL_DURATION = 0.16;
const ENTER_Y = 8;

/**
 * @param {DOMRect | null | undefined} r
 */
export function validProfileOriginRect(r) {
  return Boolean(r && r.width > 2 && r.height > 2);
}

/**
 * @param {{ chip?: DOMRect, avatar?: DOMRect, name?: DOMRect } | null | undefined} origin
 */
export function validProfileOriginRects(origin) {
  return validProfileOriginRect(origin?.chip);
}

/**
 * @param {{ left: number, top: number, width: number, height: number }} r
 */
function rectCenter(r) {
  return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
}

/** @param {Element | null | undefined} el */
function readBorderRadiusPx(el) {
  if (!el) return 0;
  const raw = getComputedStyle(el).borderTopLeftRadius;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/** @param {{ chipPaint?: { backgroundColor: string, boxShadow: string } }} originRects */
function readChipPaint(originRects, cardPaint) {
  const paint = originRects?.chipPaint;
  if (paint?.backgroundColor) {
    return {
      backgroundColor: paint.backgroundColor,
      boxShadow: paint.boxShadow || "none",
    };
  }
  return { ...cardPaint };
}

/**
 * @param {HTMLElement} card
 * @returns {{ backgroundColor: string, boxShadow: string }}
 */
function readCardPaint(card) {
  const style = getComputedStyle(card);
  return {
    backgroundColor: style.backgroundColor,
    boxShadow: style.boxShadow,
  };
}

/**
 * 视口固定定位飞入盒（与 TileDetailLayer flyCloneBoxStyle 一致，GSAP 只改 transform）
 * @param {DOMRect | { left: number, top: number, width: number, height: number } | null | undefined} r
 */
export function profileFlyBoxStyle(r) {
  if (!validProfileOriginRect(r)) {
    return {
      position: "fixed",
      left: "-9999px",
      top: "0",
      width: "1px",
      height: "1px",
      zIndex: "291",
      boxSizing: "border-box",
      margin: "0",
      pointerEvents: "none",
    };
  }
  const cx = r.left + r.width * 0.5;
  const cy = r.top + r.height * 0.5;
  return {
    position: "fixed",
    zIndex: "291",
    boxSizing: "border-box",
    margin: "0",
    pointerEvents: "none",
    left: `${cx}px`,
    top: `${cy}px`,
    marginLeft: `${-r.width / 2}px`,
    marginTop: `${-r.height / 2}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  };
}

/**
 * 文字飞入：只钉中心点，不锁宽高（避免 scale 压扁）
 * @param {DOMRect | { left: number, top: number, width: number, height: number } | null | undefined} r
 */
export function profileTextFlyBoxStyle(r) {
  if (!validProfileOriginRect(r)) {
    return {
      position: "fixed",
      left: "-9999px",
      top: "0",
      zIndex: "291",
      pointerEvents: "none",
    };
  }
  const cx = r.left + r.width * 0.5;
  const cy = r.top + r.height * 0.5;
  return {
    position: "fixed",
    zIndex: "291",
    margin: "0",
    pointerEvents: "none",
    left: `${cx}px`,
    top: `${cy}px`,
    width: "auto",
    height: "auto",
  };
}

/**
 * @param {HTMLElement} el
 * @param {DOMRect} fromRect
 * @param {DOMRect} targetRect
 * @param {number} duration
 * @param {{ borderRadiusFrom?: number, borderRadiusToVisual?: number, uniformScale?: boolean }} [opts]
 */
function runAvatarBoxFlyTween(el, fromRect, targetRect, duration, opts = {}) {
  const fc = rectCenter(fromRect);
  const tc = rectCenter(targetRect);
  const w0 = Math.max(2, fromRect.width);
  const h0 = Math.max(2, fromRect.height);
  const w1 = Math.max(2, targetRect.width);
  const h1 = Math.max(2, targetRect.height);
  let scaleX = Math.min(24, Math.max(0.06, w1 / w0));
  let scaleY = Math.min(24, Math.max(0.06, h1 / h0));
  if (opts.uniformScale !== false) {
    const uniform = Math.min(scaleX, scaleY);
    scaleX = uniform;
    scaleY = uniform;
  }
  const scaleEnd = scaleX;

  gsap.killTweensOf(el);

  const borderFrom = opts.borderRadiusFrom;
  const borderToVisual = opts.borderRadiusToVisual;
  const borderSet = {};
  if (borderFrom != null && borderFrom > 0) {
    borderSet.borderRadius = borderFrom;
  }

  gsap.set(el, {
    visibility: "visible",
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    transformOrigin: "50% 50%",
    force3D: true,
    immediateRender: true,
    ...borderSet,
  });

  const vars = {
    x: tc.x - fc.x,
    y: tc.y - fc.y,
    scale: scaleEnd,
    duration,
  };
  if (borderToVisual != null && borderToVisual > 0) {
    vars.borderRadius = borderToVisual / Math.max(0.06, scaleEnd);
  }
  return vars;
}

/** @param {Element | null | undefined} el */
function readFontSizePx(el) {
  if (!el) return 0;
  const n = parseFloat(getComputedStyle(el).fontSize);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {HTMLElement | null | undefined} letterEl
 * @param {number} boxScaleEnd 头像盒 uniform scale 终点
 */
function prepareAvatarLetterFly(letterEl, boxScaleEnd) {
  if (!letterEl || boxScaleEnd <= 0) return;
  /** chip 26rpx → large 42rpx；克隆层用目标字号，再叠 scale 对齐视觉 */
  const startScale = 26 / 42;
  gsap.set(letterEl, {
    scale: startScale,
    transformOrigin: "50% 50%",
    force3D: true,
  });
}

/**
 * @param {number} boxScaleEnd
 */
function avatarLetterScaleEnd(boxScaleEnd) {
  return 1 / Math.max(0.06, boxScaleEnd);
}

/**
 * @param {HTMLElement} el
 * @param {DOMRect} fromRect
 * @param {DOMRect} targetRect
 * @param {HTMLElement} targetTextEl
 * @param {number} duration
 */
function runNameFlyTween(el, fromRect, targetRect, targetTextEl, duration) {
  const fc = rectCenter(fromRect);
  const tc = rectCenter(targetRect);
  const fromFont = readFontSizePx(el);
  const toFont = readFontSizePx(targetTextEl) || fromFont;

  gsap.killTweensOf(el);
  gsap.set(el, {
    visibility: "visible",
    opacity: 1,
    xPercent: -50,
    yPercent: -50,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    transformOrigin: "50% 50%",
    fontSize: fromFont,
    force3D: true,
    immediateRender: true,
  });

  return {
    x: tc.x - fc.x,
    y: tc.y - fc.y,
    fontSize: toFont,
    duration,
  };
}

/**
 * @typedef {Object} ProfileLayerAnimRefs
 * @property {HTMLElement | null | undefined} backdrop
 * @property {HTMLElement | null | undefined} scrim
 * @property {HTMLElement | null | undefined} card
 * @property {HTMLElement | null | undefined} avatarMeasure
 * @property {HTMLElement | null | undefined} nameMeasure
 * @property {HTMLElement | null | undefined} avatarFly
 * @property {HTMLElement | null | undefined} avatarFlyLetter
 * @property {HTMLElement | null | undefined} nameFly
 * @property {HTMLElement[]} enterStaggerEls
 */

/**
 * @param {HTMLElement | null | undefined} card
 * @returns {HTMLElement[]}
 */
export function collectProfileEnterStaggerEls(card) {
  if (!card) return [];
  return sortElementsTopLeftToBottomRight([...card.querySelectorAll(".profile-layer-enter-stagger")]);
}

/**
 * @param {HTMLElement[]} enterStaggerEls
 */
function prepareEnterStagger(enterStaggerEls) {
  if (!enterStaggerEls.length) return;
  gsap.set(enterStaggerEls, { opacity: 0, y: ENTER_Y });
}

function hideAvatarFlyClone(refs) {
  const { avatarFly, avatarFlyLetter } = refs;
  if (avatarFly) {
    gsap.set(avatarFly, { opacity: 0, visibility: "hidden" });
    requestAnimationFrame(() => {
      if (avatarFly.isConnected) gsap.set(avatarFly, { clearProps: "transform,borderRadius" });
    });
  }
  if (avatarFlyLetter) {
    requestAnimationFrame(() => {
      if (avatarFlyLetter.isConnected) gsap.set(avatarFlyLetter, { clearProps: "transform" });
    });
  }
}

function hideNameFlyClone(refs) {
  const { nameFly } = refs;
  if (!nameFly) return;
  gsap.set(nameFly, { opacity: 0, visibility: "hidden" });
  requestAnimationFrame(() => {
    if (nameFly.isConnected) gsap.set(nameFly, { clearProps: "transform,fontSize,xPercent,yPercent" });
  });
}

/**
 * @param {gsap.core.Timeline} tl
 * @param {ProfileLayerAnimRefs} refs
 * @param {HTMLElement[]} els
 * @param {number} startAt
 */
function appendSpatialEnterStagger(tl, refs, els, startAt) {
  if (!els.length) return;

  els.forEach((el, i) => {
    const at = startAt + i * STAGGER_STEP;
    if (el.classList.contains("profile-layer-enter-sync-avatar-fly")) {
      tl.add(() => hideAvatarFlyClone(refs), at);
    }
    if (el.classList.contains("profile-layer-enter-sync-name-fly")) {
      tl.add(() => hideNameFlyClone(refs), at);
    }
    tl.to(
      el,
      {
        opacity: 1,
        y: 0,
        duration: STAGGER_DURATION,
        ease: EASE_TRANSFORM,
        clearProps: "opacity,transform",
      },
      at,
    );
  });
}

/**
 * @param {ProfileLayerAnimRefs} refs
 * @param {{ chip: DOMRect, avatar?: DOMRect, name?: DOMRect } | null | undefined} originRects
 * @returns {gsap.core.Timeline}
 */
export function playProfileLayerEnter(refs, originRects) {
  const {
    backdrop,
    scrim,
    card,
    avatarMeasure,
    nameMeasure,
    avatarFly,
    avatarFlyLetter,
    nameFly,
    enterStaggerEls,
  } = refs;

  if (shouldSkipDecorativeMotion()) {
    const reduceTargets = [
      backdrop,
      scrim,
      card,
      avatarFly,
      avatarFlyLetter,
      nameFly,
      ...enterStaggerEls,
    ].filter(Boolean);
    gsap.killTweensOf(reduceTargets);
    if (scrim) gsap.set(scrim, portalScrimGsapVars("rgba(60, 58, 50, 0.45)"));
    if (card) {
      gsap.set(card, { opacity: 1, clearProps: "transform,overflow,backgroundColor,boxShadow" });
    }
    hideAvatarFlyClone(refs);
    hideNameFlyClone(refs);
    instantRevealGsapTargets(collectProfileEnterStaggerEls(card), {
      opacity: 1,
      y: 0,
      clearProps: "opacity,transform",
    });
    return gsap.timeline();
  }

  const targets = [
    backdrop,
    scrim,
    card,
    avatarFly,
    avatarFlyLetter,
    nameFly,
    ...enterStaggerEls,
  ].filter(Boolean);
  gsap.killTweensOf(targets);

  const hasMorph = validProfileOriginRects(originRects) && backdrop && scrim && card;
  const hasAvatarFly = hasMorph && validProfileOriginRect(originRects.avatar) && avatarFly && avatarMeasure;
  const hasNameFly = hasMorph && validProfileOriginRect(originRects.name) && nameFly && nameMeasure;

  if (scrim) {
    gsap.set(scrim, portalScrimGsapVars("rgba(60, 58, 50, 0)"));
  }
  if (card && hasMorph) {
    gsap.set(card, { opacity: 0 });
  }

  const tl = gsap.timeline({ defaults: { ease: EASE_TRANSFORM, overwrite: "auto" } });

  if (!hasMorph) {
    const sortedEnterEls = collectProfileEnterStaggerEls(card);
    prepareEnterStagger(sortedEnterEls);
    gsap.set(scrim, portalScrimGsapVars("rgba(60, 58, 50, 0)"));
    gsap.set(card, { opacity: 0, y: 10, clearProps: "transform" });
    tl.to(scrim, { ...portalScrimGsapVars("rgba(60, 58, 50, 0.45)"), duration: SCRIM_DURATION }, 0);
    tl.to(card, { opacity: 1, y: 0, duration: 0.28 }, 0.04);
    appendSpatialEnterStagger(tl, refs, sortedEnterEls, 0.08);
    return tl;
  }

  gsap.set(scrim, portalScrimGsapVars("rgba(60, 58, 50, 0)"));
  const cardPaint = readCardPaint(card);
  const chipPaint = readChipPaint(originRects, cardPaint);
  gsap.set(card, {
    opacity: 0,
    overflow: "hidden",
    transformOrigin: "50% 50%",
    backgroundColor: chipPaint.backgroundColor,
    boxShadow: chipPaint.boxShadow,
  });

  tl.to(scrim, { ...portalScrimGsapVars("rgba(60, 58, 50, 0.45)"), duration: SCRIM_DURATION }, 0);

  void card.offsetHeight;
  const cardFinalRect = card.getBoundingClientRect();
  /** 须在卡片 morph 之前测量，否则目标位会随 transform 偏移 */
  const sortedEnterElsForMorph = collectProfileEnterStaggerEls(card);
  if (sortedEnterElsForMorph.length) {
    prepareEnterStagger(sortedEnterElsForMorph);
  }
  const avatarTargetRect =
    hasAvatarFly && avatarMeasure ? avatarMeasure.getBoundingClientRect() : null;
  const nameTargetRect = hasNameFly && nameMeasure ? nameMeasure.getBoundingClientRect() : null;

  const chip = originRects.chip;
  const scaleX = chip.width / Math.max(2, cardFinalRect.width);
  const scaleY = chip.height / Math.max(2, cardFinalRect.height);
  const chipCx = chip.left + chip.width * 0.5;
  const chipCy = chip.top + chip.height * 0.5;
  const cardCx = cardFinalRect.left + cardFinalRect.width * 0.5;
  const cardCy = cardFinalRect.top + cardFinalRect.height * 0.5;

  gsap.set(card, {
    opacity: 0,
    x: chipCx - cardCx,
    y: chipCy - cardCy,
    scaleX,
    scaleY,
    force3D: true,
  });

  tl.to(
    card,
    {
      opacity: 1,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      duration: ENTER_DURATION,
    },
    0,
  );

  if (hasAvatarFly && avatarTargetRect && originRects.avatar) {
    const flyVars = runAvatarBoxFlyTween(avatarFly, originRects.avatar, avatarTargetRect, ENTER_DURATION, {
      borderRadiusFrom: readBorderRadiusPx(avatarFly),
      borderRadiusToVisual: readBorderRadiusPx(avatarMeasure),
    });
    const boxScaleEnd = flyVars.scale ?? 1;
    tl.to(avatarFly, flyVars, 0);
    if (avatarFlyLetter) {
      prepareAvatarLetterFly(avatarFlyLetter, boxScaleEnd);
      tl.to(avatarFlyLetter, { scale: avatarLetterScaleEnd(boxScaleEnd), duration: ENTER_DURATION }, 0);
    }
  }

  if (hasNameFly && nameTargetRect && originRects.name) {
    const flyVars = runNameFlyTween(nameFly, originRects.name, nameTargetRect, nameMeasure, ENTER_DURATION);
    tl.to(nameFly, flyVars, 0);
  }

  const revealAt = ENTER_DURATION - 0.04;
  tl.add(() => {
    hideAvatarFlyClone(refs);
    hideNameFlyClone(refs);
    gsap.set(card, { clearProps: "transform,overflow" });
  }, revealAt);

  tl.to(
    card,
    {
      backgroundColor: cardPaint.backgroundColor,
      boxShadow: cardPaint.boxShadow,
      duration: CARD_BG_REVEAL_DURATION,
      ease: EASE_TRANSFORM,
    },
    revealAt,
  );

  appendSpatialEnterStagger(tl, refs, sortedEnterElsForMorph, STAGGER_START_DURING_MORPH);

  return tl;
}

/**
 * @param {ProfileLayerAnimRefs} refs
 * @returns {Promise<void>}
 */
export function playProfileLayerLeave(refs) {
  const { backdrop, scrim, card, avatarFly, avatarFlyLetter, nameFly, enterStaggerEls } = refs;
  const targets = [scrim, card, avatarFly, avatarFlyLetter, nameFly, ...enterStaggerEls].filter(Boolean);
  gsap.killTweensOf(targets);

  if (shouldSkipDecorativeMotion()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    if (!backdrop || !scrim || !card) {
      resolve();
      return;
    }
    gsap.to([scrim, card, ...enterStaggerEls], {
      opacity: 0,
      duration: 0.16,
      ease: "power1.in",
      onComplete: resolve,
    });
  });
}

/**
 * @param {ProfileLayerAnimRefs} refs
 */
export function killProfileLayerAnim(refs) {
  const { backdrop, scrim, card, avatarFly, avatarFlyLetter, nameFly, enterStaggerEls } = refs;
  const targets = [backdrop, scrim, card, avatarFly, avatarFlyLetter, nameFly, ...enterStaggerEls].filter(Boolean);
  if (targets.length) gsap.killTweensOf(targets);
}
