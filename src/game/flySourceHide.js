import gsap from "gsap";

/**
 * 飞行克隆体期间隐藏原位置可见物，避免原址与克隆重叠。
 * 须在完成 measure / cloneNode 之后再调用，否则克隆体会继承 opacity:0。
 * @param {HTMLElement | null | undefined} el
 * @returns {() => void}
 */
export function beginFlySourceHide(el) {
  if (!(el instanceof HTMLElement)) return () => {};
  const prev = {
    opacity: el.style.opacity,
    visibility: el.style.visibility,
    pointerEvents: el.style.pointerEvents,
  };
  gsap.set(el, { opacity: 0, visibility: "hidden", pointerEvents: "none" });
  return () => {
    if (!el.isConnected) return;
    gsap.set(el, {
      opacity: prev.opacity || "",
      visibility: prev.visibility || "",
      pointerEvents: prev.pointerEvents || "",
    });
  };
}

/** @param {HTMLElement | null | undefined} clone */
export function ensureFlyCloneVisible(clone) {
  if (!(clone instanceof HTMLElement)) return;
  gsap.set(clone, { opacity: 1, visibility: "visible" });
}

/**
 * @template T
 * @param {HTMLElement | null | undefined} sourceEl
 * @param {() => Promise<T>} flyFn
 * @returns {Promise<T>}
 */
export async function withFlySourceHidden(sourceEl, flyFn) {
  const restore = beginFlySourceHide(sourceEl);
  try {
    return await flyFn();
  } finally {
    restore();
  }
}
