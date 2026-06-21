import gsap from "gsap";

/** 飞入结束前不久：在仍被克隆层盖住时让真目标先绘好，避免交接闪一帧 */
export const PREVIEW_FLY_COMMIT_LEAD_SEC = 0.04;

/** @returns {gsap.TweenVars} */
export function previewFlyTargetHiddenVars() {
  return {
    opacity: 0,
    visibility: "visible",
    pointerEvents: "none",
  };
}

/** @param {HTMLElement | null | undefined} targetEl */
export function preparePreviewFlyTargetHidden(targetEl) {
  if (!(targetEl instanceof HTMLElement)) return;
  gsap.set(targetEl, previewFlyTargetHiddenVars());
}

/**
 * 飞入克隆仍不透明时，提前让真目标处于可见绘制态（pointerEvents 仍关闭）。
 * @param {HTMLElement | null | undefined} targetEl
 */
export function preRevealPreviewFlyTargetUnderClone(targetEl) {
  if (!(targetEl instanceof HTMLElement)) return;
  void targetEl.offsetHeight;
  gsap.set(targetEl, {
    opacity: 1,
    visibility: "visible",
    pointerEvents: "none",
  });
}

/**
 * 飞入结束：揭开真目标并移除克隆层（同步，不用 rAF）。
 * @param {{
 *   targetEl: HTMLElement | null | undefined,
 *   flyCloneEl?: HTMLElement | null | undefined,
 *   onDeactivateClone?: () => void,
 *   targetClearProps?: string,
 * }} opts
 */
export function commitPreviewFlyCloneSwap(opts) {
  const { targetEl, flyCloneEl, onDeactivateClone, targetClearProps } = opts;
  if (targetEl instanceof HTMLElement) {
    /** @type {gsap.TweenVars} */
    const vars = {
      opacity: 1,
      visibility: "visible",
      pointerEvents: "auto",
    };
    if (targetClearProps) vars.clearProps = targetClearProps;
    gsap.set(targetEl, vars);
  }
  if (flyCloneEl instanceof HTMLElement) {
    gsap.set(flyCloneEl, { opacity: 0, visibility: "hidden", pointerEvents: "none" });
  }
  onDeactivateClone?.();
}
