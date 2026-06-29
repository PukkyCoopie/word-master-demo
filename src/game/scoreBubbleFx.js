import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";
import { schedulePopupBubbleDismiss } from "./popupBubbleFx.js";
import { isDebtMoneyBubbleLabel } from "./moneyDisplay.js";
import { scoringSleep } from "./submitScoringTiming.js";

/** 与 wobbleScoreSlot 内「缩小 + 放大」两段时长一致（秒） */
export const WOBBLE_SCALE_COMPRESS_S = 0.11;
export const WOBBLE_SCALE_EXPAND_S = 0.15;
/** 缩小目标 scale（越大 = 缩得越少） */
export const WOBBLE_SCALE_COMPRESS_TO = 0.78;

export const PLUS_BUBBLE_ENTER_DURATION_S = 0.14;
/** 「跳过」气泡：yPercent 30→-5（circ.out）→0（circ.in），与开始弹窗一致 */
export const SKIP_BUBBLE_RISE_S = 0.2;
export const SKIP_BUBBLE_SETTLE_S = 0.22;
export const PLUS_BUBBLE_OUTRO_DELAY_S = 0.48;
export const PLUS_BUBBLE_OUTRO_DURATION_S = 0.42;
export const PLUS_BUBBLE_OUTRO_SCALE = 0.5;

/** 记分区数字「先瞬间放大再缓落回 1」：峰值倍率 / 回落时长（秒） */
export const VALUE_NUM_PULSE_PEAK_SCALE = 1.42;
export const VALUE_NUM_PULSE_SHRINK_S = 0.5;

const MULT_MULTIPLY_BUBBLE_OUTRO_DELAY_S = 0.38;
const MULT_MULTIPLY_BUBBLE_OUTRO_DURATION_S = 0.22;

/** 记分步间等待统一再 ×0.7（与 submitScoringAnim 一致，供 GamePanel 非 submit 气泡时序） */
export const SCORING_GAP_SCALE = 0.7;
export const SCORING_BUBBLE_POP_DELAY_MS = Math.round(
  (WOBBLE_SCALE_COMPRESS_S + WOBBLE_SCALE_EXPAND_S) * 0.8 * 1000 * SCORING_GAP_SCALE,
);
export const SCORING_STEP_BEAT_MS = Math.round(270 * 1.2 * SCORING_GAP_SCALE);
export const SCORING_TREASURE_FALLBACK_MS = Math.round(200 * 1.2 * SCORING_GAP_SCALE);
export const LEVEL_COMPLETE_MONEY_FX_OUTRO_WAIT_MS = Math.round(
  (PLUS_BUBBLE_OUTRO_DELAY_S + PLUS_BUBBLE_OUTRO_DURATION_S) * 1000,
);
export const HOURGLASS_STAGE_END_BUBBLE_HOLD_MS = Math.round(320 * SCORING_GAP_SCALE);

const TILE_AUGMENT_BADGE_BOUNCE_SCALE = 2;

/** @type {WeakMap<HTMLElement, number>} */
const treasureSlotWobbleFrontCounts = new WeakMap();

/** @type {WeakMap<HTMLElement, gsap.core.Timeline>} */
const treasureSlotWobbleTimelines = new WeakMap();

const accessoryRippleTimers = new WeakMap();

/** @param {import('vue').ComponentPublicInstance | HTMLElement | null | undefined} el */
function refToDom(el) {
  if (!el) return undefined;
  if (typeof el.getEl === "function") return el.getEl() ?? undefined;
  // @ts-expect-error Vue component instance
  return el.$el != null ? el.$el : el;
}

/** @param {Element | null | undefined} el */
function resolveTreasureSlotRootEl(el) {
  if (!(el instanceof HTMLElement)) return null;
  if (el.classList.contains("treasure-slot")) return el;
  const root = el.closest(".treasure-slot");
  return root instanceof HTMLElement ? root : null;
}

/** @param {HTMLElement} root */
function incrementTreasureSlotWobbleFront(root) {
  const next = (treasureSlotWobbleFrontCounts.get(root) ?? 0) + 1;
  treasureSlotWobbleFrontCounts.set(root, next);
  root.classList.add("treasure-slot--wobble-front");
}

/** @param {HTMLElement} root */
function decrementTreasureSlotWobbleFront(root) {
  const next = (treasureSlotWobbleFrontCounts.get(root) ?? 0) - 1;
  if (next <= 0) {
    treasureSlotWobbleFrontCounts.delete(root);
    root.classList.remove("treasure-slot--wobble-front");
    return;
  }
  treasureSlotWobbleFrontCounts.set(root, next);
}

/** @param {gsap.core.Timeline} tl @param {"onComplete" | "onInterrupt"} eventName @param {() => void} fn */
function chainTimelineCallback(tl, eventName, fn) {
  const prev = tl.eventCallback(eventName);
  tl.eventCallback(eventName, () => {
    fn();
    if (typeof prev === "function") prev();
  });
}

/** 叠放 gradient 左缘与卡面衔接位置（同 CSS left:75%） */
const TREASURE_STACK_SHADOW_ATTACH_X = 0.75;

/**
 * face 以 50%/55% 均匀缩放时，gradient 左缘应随动之横向偏移（px）。
 * @param {number} cardWidthPx
 * @param {number} scale
 */
function treasureStackShadowWobbleOffsetPx(cardWidthPx, scale) {
  return (TREASURE_STACK_SHADOW_ATTACH_X - 0.5) * (scale - 1) * cardWidthPx;
}

/**
 * 叠放 wobble：stack-shadow 单独 scaleY + 左移，与 face 缩/放节拍同步（不随父级 scale）。
 * @param {gsap.core.Timeline} tl
 * @param {Element | null | undefined} slotEl
 * @param {{ t0: number, tCompress: number, tExpand: number, scaleDownStart: number }} phase
 */
function attachTreasureStackShadowWobble(tl, slotEl, phase) {
  const root = resolveTreasureSlotRootEl(slotEl);
  if (!root?.classList.contains("treasure-slot--stack-overlap")) return;
  const shadowEl = root.querySelector(".treasure-slot-stack-shadow");
  if (!(shadowEl instanceof HTMLElement)) return;

  const cardW = Math.max(1, root.offsetWidth || 0);
  const { t0, tCompress, tExpand, scaleDownStart } = phase;
  const origin = "0% 55%";

  gsap.killTweensOf(shadowEl, "scaleY,x,rotation,scale");
  gsap.set(shadowEl, { scaleY: 1, x: 0, transformOrigin: origin });

  tl.to(
    shadowEl,
    {
      scaleY: WOBBLE_SCALE_COMPRESS_TO,
      x: treasureStackShadowWobbleOffsetPx(cardW, WOBBLE_SCALE_COMPRESS_TO),
      duration: tCompress,
      ease: "circ.out",
    },
    t0,
  );
  tl.to(
    shadowEl,
    {
      scaleY: 1.18,
      x: treasureStackShadowWobbleOffsetPx(cardW, 1.18),
      duration: tExpand,
      ease: "circ.inOut",
    },
    tCompress,
  );
  tl.to(shadowEl, { scaleY: 1, x: 0, duration: 0.3, ease: "circ.in" }, scaleDownStart);

  chainTimelineCallback(tl, "onInterrupt", () => {
    gsap.killTweensOf(shadowEl, "scaleY,x");
    gsap.set(shadowEl, { scaleY: 1, x: 0 });
  });
}

/** 叠放槽：wobble 只动 face；stack-shadow 由 attachTreasureStackShadowWobble 单独配合 */
function resolveWobbleTransformEl(slotEl) {
  if (
    slotEl instanceof HTMLElement &&
    slotEl.classList.contains("treasure-slot--stack-overlap")
  ) {
    const face = slotEl.querySelector(".treasure-slot-face");
    if (face instanceof HTMLElement) return face;
  }
  return slotEl;
}

/**
 * @param {{ triggerHaptic: (kind: string) => void, getTreasureSlotRoots?: () => Iterable<unknown> }} deps
 */
export function createScoreBubbleFx(deps) {
  const triggerHaptic = deps.triggerHaptic;
  const getTreasureSlotRoots = deps.getTreasureSlotRoots ?? (() => []);

  /**
   * 宝藏槽 wobble 期间 z-index 置顶；支持同槽并发 wobble（引用计数）。
   * @param {gsap.core.Timeline} tl
   * @param {Element | null | undefined} slotEl
   */
  function attachTreasureSlotWobbleZFront(tl, slotEl) {
    const root = resolveTreasureSlotRootEl(slotEl);
    if (!root) return;
    const prevTl = treasureSlotWobbleTimelines.get(root);
    if (prevTl && prevTl !== tl) prevTl.kill();
    treasureSlotWobbleTimelines.set(root, tl);
    incrementTreasureSlotWobbleFront(root);
    const restore = () => {
      if (treasureSlotWobbleTimelines.get(root) === tl) {
        treasureSlotWobbleTimelines.delete(root);
      }
      decrementTreasureSlotWobbleFront(root);
    };
    chainTimelineCallback(tl, "onComplete", restore);
    chainTimelineCallback(tl, "onInterrupt", restore);
  }

  /** 计分/动画异常中断后兜底：清除所有宝藏槽 wobble 置顶 class 与残留 timeline。 */
  function clearAllTreasureSlotWobbleFront() {
    for (const el of getTreasureSlotRoots()) {
      const root = resolveTreasureSlotRootEl(el);
      if (!root) continue;
      treasureSlotWobbleFrontCounts.delete(root);
      root.classList.remove("treasure-slot--wobble-front");
      const tl = treasureSlotWobbleTimelines.get(root);
      if (tl?.isActive?.()) tl.kill();
      treasureSlotWobbleTimelines.delete(root);
    }
  }

  function pulseFill(el) {
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.set(el, {
      scale: VALUE_NUM_PULSE_PEAK_SCALE,
      transformOrigin: "50% 50%",
    });
    gsap.to(el, {
      scale: 1,
      duration: VALUE_NUM_PULSE_SHRINK_S,
      ease: EASE_TRANSFORM,
    });
  }

  /** 公式区「分数 / 倍率」数字：瞬间放大到峰值，再缓落回 1（无放大段 tween） */
  function pulseFormulaPanelNum(el) {
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.set(el, {
      scale: VALUE_NUM_PULSE_PEAK_SCALE,
      transformOrigin: "50% 55%",
    });
    gsap.to(el, {
      scale: 1,
      duration: VALUE_NUM_PULSE_SHRINK_S,
      ease: EASE_TRANSFORM,
    });
  }

  /** 乘倍率（篮球 ×n）：倍率数字先瞬间拉大再弹性回落 */
  function pulseFormulaMultMultiplyBurst(el) {
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.set(el, { transformOrigin: "50% 55%", scale: 1 });
    gsap.set(el, { scale: 1.72 });
    gsap.to(el, {
      scale: 1,
      duration: 0.72,
      ease: "elastic.out(1, 0.3)",
    });
  }

  /** 倍率乘数气泡文案（整数不保留小数，非整数最多保留两位并去尾零） */
  function formatMultMultiplyLabel(factor) {
    const x = Number(factor);
    if (!Number.isFinite(x) || x <= 0) return "0";
    const r = Math.round(x);
    if (Math.abs(x - r) < 1e-4) return String(r);
    return x.toFixed(2).replace(/\.?0+$/, "");
  }

  /** 宝藏槽上方 ×n 气泡：比 +倍率 更夸张的弹出与回弹 */
  function showMultMultiplyBubble(slotEl, factor, speed = 1) {
    const s = Math.max(0.01, Number(speed) || 1);
    const rect = slotEl.getBoundingClientRect();
    const div = document.createElement("div");
    div.className = "mult-popup-bubble mult-popup-bubble--multiply-burst";
    div.textContent = `×${formatMultMultiplyLabel(factor)}`;
    document.body.appendChild(div);
    const rpx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx").trim()) || 1;
    const gapAboveSlotPx = 11 * rpx;
    gsap.set(div, {
      position: "fixed",
      left: rect.left + rect.width / 2,
      top: rect.top - gapAboveSlotPx,
      xPercent: -50,
      yPercent: -100,
      transformOrigin: "50% 100%",
      force3D: true,
      zIndex: 360,
    });
    gsap.fromTo(
      div,
      { opacity: 0, scale: 0.22, y: 36, rotation: -14 },
      {
        opacity: 1,
        scale: 1.28,
        y: 0,
        rotation: 0,
        duration: 0.32 / s,
        ease: "back.out(2.35)",
      },
    );
    gsap.to(div, {
      scale: 1.02,
      duration: 0.42 / s,
      ease: "elastic.out(1, 0.38)",
      delay: 0.1 / s,
    });
    return div;
  }

  /** @param {HTMLElement | null | undefined} el @param {number} [speed] */
  function scheduleMultMultiplyBubbleOutro(el, speed = 1) {
    schedulePopupBubbleDismiss(el, {
      delayS: MULT_MULTIPLY_BUBBLE_OUTRO_DELAY_S,
      durationS: MULT_MULTIPLY_BUBBLE_OUTRO_DURATION_S,
      speed,
      onAnimateOutro: (s) =>
        gsap.to(el, {
          opacity: 0,
          y: -22,
          scale: 0.85,
          duration: MULT_MULTIPLY_BUBBLE_OUTRO_DURATION_S / s,
          delay: MULT_MULTIPLY_BUBBLE_OUTRO_DELAY_S / s,
          ease: EASE_TRANSFORM,
          onComplete: () => el.remove(),
        }),
    });
  }

  /** 记分气泡锚点：用词槽外框（含 debuff 滤镜 / wobble 缩放），与棋盘格视觉一致 */
  function scoreBubbleAnchorRect(slotEl) {
    const node = refToDom(slotEl) ?? (slotEl instanceof HTMLElement ? slotEl : null);
    if (!node || typeof node.getBoundingClientRect !== "function") return null;
    const r = node.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    return r;
  }

  /** 金币气泡：显示 $n，不带前导 +（负值仍保留 -$） */
  function formatMoneyBubbleLabel(amount) {
    const n = Math.round(Number(amount) || 0);
    return n < 0 ? `-$${Math.abs(n)}` : `$${n}`;
  }

  function normalizeScoreBubbleDisplayText(text, kind) {
    const raw = String(text ?? "");
    if (kind !== "money") return raw;
    if (raw.startsWith("+$")) return raw.slice(1);
    return raw;
  }

  /**
   * @param {import('vue').ComponentPublicInstance | HTMLElement | null | undefined} slotEl
   * @param {string} text
   * @param {string} kind
   * @param {number} [speed]
   * @param {number} [bubbleZIndex]
   */
  function showScoreBubble(slotEl, text, kind, speed = 1, bubbleZIndex = 350) {
    const s = Math.max(0.01, Number(speed) || 1);
    const rect = scoreBubbleAnchorRect(slotEl);
    if (!rect) return null;
    const displayText = normalizeScoreBubbleDisplayText(text, kind);
    const div = document.createElement("div");
    div.className =
      kind === "mult"
        ? "mult-popup-bubble"
        : kind === "replay"
          ? "score-popup-bubble score-popup-bubble--replay-again"
          : kind === "upgrade"
            ? "score-popup-bubble score-popup-bubble--upgrade"
            : kind === "money"
              ? isDebtMoneyBubbleLabel(displayText)
                ? "score-popup-bubble score-popup-bubble--money score-popup-bubble--money-debt"
                : "score-popup-bubble score-popup-bubble--money"
              : kind === "destroy"
                ? "score-popup-bubble score-popup-bubble--destroy"
                : kind === "bomb-blast"
                  ? "score-popup-bubble score-popup-bubble--bomb-blast"
                  : kind === "volcano-eruption"
                    ? "score-popup-bubble score-popup-bubble--volcano-eruption"
                    : kind === "ignite"
                      ? "score-popup-bubble score-popup-bubble--ignite"
                      : kind === "ice-shatter"
                        ? "score-popup-bubble score-popup-bubble--ice-shatter"
                        : kind === "copy"
                          ? "score-popup-bubble score-popup-bubble--copy"
                          : kind === "skip"
                      ? "score-popup-bubble score-popup-bubble--skip"
                      : kind === "star-miss"
                        ? "score-popup-bubble score-popup-bubble--star-miss"
                        : kind === "hourglass"
                          ? "score-popup-bubble score-popup-bubble--hourglass"
                          : kind === "accessory-expired"
                            ? "score-popup-bubble score-popup-bubble--accessory-expired"
                            : kind === "sponge-erase"
                              ? "score-popup-bubble score-popup-bubble--sponge-erase"
                              : kind === "final-total"
                                ? "score-popup-bubble score-popup-bubble--final-total"
                                : "score-popup-bubble";
    if (kind === "hourglass") {
      const countLabel = displayText
        ? `<span class="score-popup-bubble-hourglass-count">${displayText}</span>`
        : "";
      div.innerHTML = `<span class="score-popup-bubble-hourglass-inner"><i class="ri-hourglass-fill score-popup-bubble-hourglass-icon" aria-hidden="true"></i>${countLabel}</span>`;
    } else {
      div.textContent = displayText;
    }
    document.body.appendChild(div);
    const rpx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx").trim()) || 1;
    const gapAboveSlotPx = 12 * rpx;
    gsap.set(div, {
      position: "fixed",
      left: rect.left + rect.width / 2,
      top: rect.top - gapAboveSlotPx,
      xPercent: -50,
      yPercent: -100,
      transformOrigin: "50% 100%",
      zIndex: bubbleZIndex,
      pointerEvents: "none",
      force3D: true,
    });
    if (kind === "skip") {
      const risePx = Math.max(10 * rpx, rect.height * 0.2);
      gsap.fromTo(
        div,
        { opacity: 1, scale: 1, y: risePx },
        {
          y: 0,
          duration: (SKIP_BUBBLE_RISE_S + SKIP_BUBBLE_SETTLE_S) / s,
          ease: EASE_TRANSFORM,
        },
      );
      return div;
    }
    gsap.fromTo(
      div,
      { opacity: 0, y: 18, scale: 0.5 },
      { opacity: 1, y: 0, scale: 1, duration: PLUS_BUBBLE_ENTER_DURATION_S / s, ease: EASE_TRANSFORM },
    );
    return div;
  }

  /** 小气泡淡出：在格子上多停一阵再离场，与记分步 sleep 解耦（可与其他气泡重叠） */
  function scheduleSmallPlusBubbleOutro(el, speed = 1) {
    schedulePopupBubbleDismiss(el, {
      delayS: PLUS_BUBBLE_OUTRO_DELAY_S,
      durationS: PLUS_BUBBLE_OUTRO_DURATION_S,
      speed,
      onAnimateOutro: (s) =>
        gsap.to(el, {
          opacity: 0,
          y: -14,
          scale: PLUS_BUBBLE_OUTRO_SCALE,
          duration: PLUS_BUBBLE_OUTRO_DURATION_S / s,
          delay: PLUS_BUBBLE_OUTRO_DELAY_S / s,
          ease: EASE_TRANSFORM,
          onComplete: () => el.remove(),
        }),
    });
  }

  /**
   * @param {HTMLElement | null | undefined} slotEl
   * @param {{ scorePill?: boolean, multPill?: boolean } | null | undefined} pillAugment
   */
  function createWobbleScoreSlotTimeline(slotEl, pillAugment) {
    if (!slotEl) return null;
    const wobbleEl = resolveWobbleTransformEl(slotEl);
    /** @type {gsap.core.Timeline | null} */
    let tl = null;
    gsap.killTweensOf(wobbleEl, "rotation,scale,x,y");
    const origin = "50% 55%";
    gsap.set(wobbleEl, { x: 0, y: 0, rotation: 0, scale: 1, transformOrigin: origin });

    const t0 = 0;
    const tCompress = WOBBLE_SCALE_COMPRESS_S;
    const tExpand = WOBBLE_SCALE_EXPAND_S;
    const peak = tCompress + tExpand;
    const scaleDownStart = peak - 0.05;
    const rotStart = tCompress + tExpand * 0.5;
    const rotD1 = 0.034;
    const rotD2 = 0.036;

    const scorePillEl =
      pillAugment?.scorePill === true ? slotEl.querySelector(".tile-bonus-pill--score") : null;
    const multPillEl =
      pillAugment?.multPill === true ? slotEl.querySelector(".tile-bonus-pill--mult") : null;
    /** @type {HTMLElement[]} */
    const pillEls = [];
    if (scorePillEl instanceof HTMLElement) pillEls.push(scorePillEl);
    if (multPillEl instanceof HTMLElement) pillEls.push(multPillEl);
    for (const pill of pillEls) {
      gsap.killTweensOf(pill, "scale");
      gsap.set(pill, { scale: 1, transformOrigin: "50% 50%" });
    }

    const tlBuilt = gsap.timeline();
    tlBuilt.to(wobbleEl, { scale: WOBBLE_SCALE_COMPRESS_TO, duration: tCompress, ease: "circ.out" }, t0);
    tlBuilt.to(wobbleEl, { scale: 1.18, duration: tExpand, ease: "circ.inOut" }, tCompress);
    tlBuilt.to(wobbleEl, { scale: 1, duration: 0.3, ease: "circ.in" }, scaleDownStart);
    tlBuilt.call(() => triggerHaptic("wobble"), null, rotStart);
    tlBuilt.to(wobbleEl, { rotation: 2.6, duration: rotD1, ease: "power2.out" }, rotStart);
    tlBuilt.to(wobbleEl, { rotation: -1.9, duration: rotD2, ease: "power2.inOut" }, rotStart + rotD1);
    tlBuilt.to(wobbleEl, { rotation: 0, duration: 0.12, ease: "power2.out" }, rotStart + rotD1 + rotD2);

    if (pillEls.length) {
      tlBuilt.to(
        pillEls,
        { scale: TILE_AUGMENT_BADGE_BOUNCE_SCALE, duration: tCompress, ease: "circ.out" },
        t0,
      );
      tlBuilt.to(pillEls, { scale: 1, duration: tExpand + 0.12, ease: "circ.inOut" }, tCompress);
    }

    attachTreasureStackShadowWobble(tlBuilt, slotEl, {
      t0,
      tCompress,
      tExpand,
      scaleDownStart,
    });

    tl = tlBuilt;

    if (tl) attachTreasureSlotWobbleZFront(tl, slotEl);
    return tl;
  }

  function wobbleScoreSlot(slotEl, speed = 1, pillAugment) {
    const tl = createWobbleScoreSlotTimeline(slotEl, pillAugment);
    if (tl) {
      const s = Math.max(0.01, Number(speed) || 1);
      tl.timeScale(s);
      tl.play(0);
    }
  }

  /** @param {gsap.core.Timeline | null | undefined} tl */
  async function awaitWobbleScoreSlotTimeline(tl) {
    if (!tl) {
      await scoringSleep(SCORING_TREASURE_FALLBACK_MS, 1);
      return;
    }
    await new Promise((resolve) => {
      chainTimelineCallback(tl, "onComplete", resolve);
    });
  }

  /**
   * 宝藏槽上方：组合包礼物图标气泡（锚点/进入动效与 showScoreBubble 一致）。
   * @param {import('vue').ComponentPublicInstance | HTMLElement | null | undefined} slotEl
   * @param {string} [_bundleKind]
   * @param {number} [speed]
   */
  function showBundlePackBubble(slotEl, _bundleKind, speed = 1) {
    const s = Math.max(0.01, Number(speed) || 1);
    const rect = scoreBubbleAnchorRect(slotEl);
    if (!rect) return null;
    const div = document.createElement("div");
    div.className = "score-popup-bubble score-popup-bubble--bundle-pack";
    const icon = document.createElement("i");
    icon.className = "score-popup-bubble__pack-icon ri-gift-2-line";
    icon.setAttribute("aria-hidden", "true");
    div.appendChild(icon);
    document.body.appendChild(div);
    const rpx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx").trim()) || 1;
    const gapAboveSlotPx = 12 * rpx;
    gsap.set(div, {
      position: "fixed",
      left: rect.left + rect.width / 2,
      top: rect.top - gapAboveSlotPx,
      xPercent: -50,
      yPercent: -100,
      transformOrigin: "50% 100%",
      zIndex: 350,
      pointerEvents: "none",
      force3D: true,
    });
    gsap.fromTo(
      div,
      { opacity: 0, y: 18, scale: 0.5 },
      { opacity: 1, y: 0, scale: 1, duration: PLUS_BUBBLE_ENTER_DURATION_S / s, ease: EASE_TRANSFORM },
    );
    return div;
  }

  function triggerAccessoryChipRipple(slotEl, speed = 1, strong = false) {
    if (!slotEl) return;
    const s = Math.max(0.01, Number(speed) || 1);
    /** @param {HTMLElement} chip */
    function rippleOne(chip, isTreasure) {
      const oldTimer = accessoryRippleTimers.get(chip);
      if (oldTimer != null) {
        clearTimeout(oldTimer);
        accessoryRippleTimers.delete(chip);
      }
      chip.classList.remove(
        isTreasure ? "treasure-accessory-chip--ripple-active" : "tile-accessory-chip--ripple-active",
      );
      if (!isTreasure) chip.classList.remove("tile-accessory-chip--ripple-strong");
      void chip.offsetWidth;
      const baseDuration = strong ? 0.62 : 0.46;
      const dur = `${Math.max(0.26, baseDuration / s).toFixed(3)}s`;
      if (isTreasure) {
        chip.style.setProperty("--treasure-acc-ripple-duration", dur);
        chip.classList.add("treasure-accessory-chip--ripple-active");
      } else {
        chip.style.setProperty("--tile-accessory-ripple-duration", dur);
        if (strong) chip.classList.add("tile-accessory-chip--ripple-strong");
        chip.classList.add("tile-accessory-chip--ripple-active");
      }
      const timer = setTimeout(() => {
        chip.classList.remove(
          isTreasure ? "treasure-accessory-chip--ripple-active" : "tile-accessory-chip--ripple-active",
        );
        if (!isTreasure) chip.classList.remove("tile-accessory-chip--ripple-strong");
        chip.style.removeProperty(isTreasure ? "--treasure-acc-ripple-duration" : "--tile-accessory-ripple-duration");
        accessoryRippleTimers.delete(chip);
      }, Math.max(220, Math.round(((strong ? 700 : 520) / s))));
      accessoryRippleTimers.set(chip, timer);
    }
    const tileChip = slotEl.querySelector?.(".tile-accessory-chip");
    if (tileChip instanceof HTMLElement) rippleOne(tileChip, false);
    const treChip = slotEl.querySelector?.(".tile-treasure-accessory-chip");
    if (treChip instanceof HTMLElement) rippleOne(treChip, true);
  }

  return {
    pulseFill,
    pulseFormulaPanelNum,
    pulseFormulaMultMultiplyBurst,
    formatMultMultiplyLabel,
    showMultMultiplyBubble,
    scheduleMultMultiplyBubbleOutro,
    formatMoneyBubbleLabel,
    scoreBubbleAnchorRect,
    showScoreBubble,
    showBundlePackBubble,
    scheduleSmallPlusBubbleOutro,
    createWobbleScoreSlotTimeline,
    wobbleScoreSlot,
    awaitWobbleScoreSlotTimeline,
    triggerAccessoryChipRipple,
    clearAllTreasureSlotWobbleFront,
  };
}
