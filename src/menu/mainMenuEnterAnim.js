import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";
import {
  shouldSkipDecorativeMotion,
} from "../settings/animationSpeed.js";

const BUTTON_DURATION = 0.42;
const BUTTON_STAGGER_SPREAD = 0.28;
const LAYOUT_EXPAND_DURATION = 0.52;
const SHOWCASE_GAP_RPX = 96;

/**
 * @param {number} count
 * @param {number} totalSpread
 */
function evenStagger(count, totalSpread) {
  if (count <= 1) return 0;
  return totalSpread / (count - 1);
}

/**
 * @param {HTMLElement | null | undefined} nav
 * @returns {HTMLElement[]}
 */
export function collectMainMenuEnterButtons(nav) {
  if (!nav) return [];
  return [...nav.querySelectorAll(".menu-btn")];
}

/**
 * @returns {number}
 */
function readShowcaseGapPx() {
  if (typeof document === "undefined") return 0;
  const rpx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx"));
  return (Number.isFinite(rpx) ? rpx : 1) * SHOWCASE_GAP_RPX;
}

/**
 * 在原始流式布局下测量按钮列高度与 logo 间距。
 * @param {HTMLElement | null | undefined} nav
 * @param {HTMLElement | null | undefined} showcase
 */
export function measureMainMenuEnterLayout(nav, showcase) {
  const buttons = collectMainMenuEnterButtons(nav);
  if (!nav || !buttons.length) {
    return { buttons, navHeight: 0, showcaseGapPx: readShowcaseGapPx() };
  }

  gsap.killTweensOf(buttons);
  gsap.set(buttons, { scale: 1, clearProps: "transform" });
  if (showcase) {
    gsap.killTweensOf(showcase);
    gsap.set(showcase, { clearProps: "marginBottom,transform" });
  }

  void nav.offsetHeight;

  return {
    buttons,
    navHeight: nav.offsetHeight,
    showcaseGapPx: readShowcaseGapPx(),
  };
}

/**
 * @param {HTMLElement | null | undefined} showcase
 * @param {HTMLElement | null | undefined} actionsWrap
 * @param {HTMLElement[]} buttons
 */
export function prepareMainMenuEnterHidden(showcase, actionsWrap, buttons) {
  if (shouldSkipDecorativeMotion()) return;
  if (actionsWrap) {
    gsap.killTweensOf(actionsWrap);
    gsap.set(actionsWrap, { height: 0, overflow: "visible" });
  }
  if (showcase) {
    gsap.killTweensOf(showcase);
    gsap.set(showcase, { marginBottom: 0 });
  }
  if (buttons.length) {
    gsap.killTweensOf(buttons);
    gsap.set(buttons, {
      scale: 0,
      transformOrigin: "50% 50%",
      force3D: true,
    });
  }
}

/**
 * @param {HTMLElement | null | undefined} showcase
 * @param {HTMLElement | null | undefined} actionsWrap
 * @param {HTMLElement[]} buttons
 */
function settleMainMenuEnterLayout(showcase, actionsWrap, buttons) {
  if (actionsWrap) {
    gsap.killTweensOf(actionsWrap);
    gsap.set(actionsWrap, { clearProps: "height,overflow" });
  }
  if (showcase) {
    gsap.killTweensOf(showcase);
    gsap.set(showcase, { clearProps: "marginBottom,transform" });
  }
  if (buttons.length) {
    gsap.killTweensOf(buttons);
    gsap.set(buttons, { clearProps: "transform" });
  }
}

/**
 * @param {object} opts
 * @param {HTMLElement | null | undefined} opts.showcase
 * @param {HTMLElement | null | undefined} opts.actionsWrap
 * @param {HTMLElement[]} opts.buttons
 * @param {number} opts.navHeight
 * @param {number} opts.showcaseGapPx
 * @param {() => void} [opts.onComplete]
 * @returns {gsap.core.Timeline | null}
 */
export function playMainMenuEnter(opts) {
  const { showcase, actionsWrap, buttons, navHeight, showcaseGapPx, onComplete } = opts;
  if (!buttons.length && !showcase && !actionsWrap) return null;

  const finish = () => {
    settleMainMenuEnterLayout(showcase, actionsWrap, buttons);
    onComplete?.();
  };

  if (shouldSkipDecorativeMotion()) {
    finish();
    return null;
  }

  prepareMainMenuEnterHidden(showcase, actionsWrap, buttons);

  const tl = gsap.timeline({
    defaults: { ease: EASE_TRANSFORM, overwrite: "auto" },
    onComplete: finish,
  });

  if (actionsWrap && navHeight > 0) {
    tl.to(
      actionsWrap,
      {
        height: navHeight,
        duration: LAYOUT_EXPAND_DURATION,
      },
      0,
    );
  }

  if (showcase && showcaseGapPx > 0) {
    tl.to(
      showcase,
      {
        marginBottom: showcaseGapPx,
        duration: LAYOUT_EXPAND_DURATION,
      },
      0,
    );
  }

  if (buttons.length) {
    tl.to(
      buttons,
      {
        scale: 1,
        duration: BUTTON_DURATION,
        stagger: evenStagger(buttons.length, BUTTON_STAGGER_SPREAD),
      },
      0,
    );
  }

  return tl;
}

/**
 * @param {HTMLElement | null | undefined} showcase
 * @param {HTMLElement | null | undefined} nav
 * @param {HTMLElement | null | undefined} actionsWrap
 */
export function killMainMenuEnter(showcase, nav, actionsWrap) {
  const targets = [showcase, actionsWrap, ...collectMainMenuEnterButtons(nav)].filter(Boolean);
  if (targets.length) gsap.killTweensOf(targets);
}
