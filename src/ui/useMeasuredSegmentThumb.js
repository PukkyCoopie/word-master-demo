import { nextTick, onBeforeUnmount, onMounted, ref, unref, watch } from "vue";
import { runTabThumbPulse } from "./tabThumbFlash.js";

/**
 * @param {HTMLElement} root
 */
function readSegmentPadPx(root) {
  const style = getComputedStyle(root);
  return {
    left: parseFloat(style.paddingLeft) || 0,
    right: parseFloat(style.paddingRight) || 0,
  };
}

/**
 * @param {HTMLElement} root
 * @param {number} index
 * @param {number} count
 */
function buildEqualSegmentThumbStyle(root, index, count) {
  const safeCount = Math.max(1, count);
  const safeIndex = Math.max(0, Math.min(safeCount - 1, index));
  const pad = readSegmentPadPx(root);
  const innerW = root.clientWidth - pad.left - pad.right;
  if (innerW <= 0) return null;
  const segW = innerW / safeCount;
  const x = Math.round(pad.left + safeIndex * segW);
  return {
    transform: `translateX(${x}px)`,
    width: `${Math.max(1, Math.round(segW))}px`,
  };
}

/**
 * 分段/tab 滑块定位。
 * - 等宽：pad + index * segmentWidth（与旧 GSAP xPercent 一致）
 * - 不等宽：按激活按钮 offsetLeft / offsetWidth（布局坐标，不受祖先 transform 影响）
 *
 * @param {import('vue').WatchSource<string | number>} activeIdSource
 * @param {(id: string | number) => HTMLElement | null | undefined} getTabEl
 * @param {import('vue').Ref<HTMLElement | null | undefined>} rootRef
 * @param {{
 *   repositionInstant?: import('vue').WatchSource<boolean>,
 *   variableWidth?: import('vue').WatchSource<boolean>,
 *   activeIndex?: import('vue').WatchSource<number>,
 *   tabCount?: import('vue').WatchSource<number>,
 * }} [options]
 */
export function useMeasuredSegmentThumb(activeIdSource, getTabEl, rootRef, options = {}) {
  const thumbStyle = ref(/** @type {Record<string, string>} */ ({ transform: "translateX(0)" }));
  const slideInstant = ref(true);
  const pulseRef = ref(/** @type {HTMLElement | null} */ (null));

  /** @param {{ instant?: boolean }} opts */
  function resolveInstant(opts = {}) {
    if (opts.instant === true) return true;
    if (opts.instant === false) return false;
    return unref(options.repositionInstant) === true;
  }

  /** @param {{ instant?: boolean }} opts */
  function updateThumb(opts = {}) {
    const root = rootRef.value;
    if (!root) return;

    const variableWidth = unref(options.variableWidth) === true;
    /** @type {Record<string, string>} */
    const next = { transform: "translateX(0)" };

    const count = Math.max(1, Number(unref(options.tabCount)) || 1);
    const index = Math.max(0, Math.min(count - 1, Number(unref(options.activeIndex)) || 0));

    if (!variableWidth) {
      const equal = buildEqualSegmentThumbStyle(root, index, count);
      if (!equal) {
        if (!opts._retried) {
          requestAnimationFrame(() => scheduleUpdateThumb({ ...opts, _retried: true }));
        }
        return;
      }
      next.transform = equal.transform;
    } else {
      const id = unref(activeIdSource);
      const btn = getTabEl(id);
      const x = btn ? Math.round(btn.offsetLeft) : NaN;
      const w = btn ? Math.round(btn.offsetWidth) : 0;

      if (btn && w >= 1) {
        next.transform = `translateX(${x}px)`;
        next.width = `${w}px`;
      } else {
        const retryCount = Number(opts._retryCount) || 0;
        if (retryCount < 4) {
          requestAnimationFrame(() =>
            scheduleUpdateThumb({ ...opts, _retryCount: retryCount + 1 }),
          );
          return;
        }
        const equal = buildEqualSegmentThumbStyle(root, index, count);
        if (!equal) return;
        next.transform = equal.transform;
        next.width = equal.width;
      }
    }

    const instant = resolveInstant(opts);
    if (instant) slideInstant.value = true;

    thumbStyle.value = next;
  }

  /** @param {{ instant?: boolean }} opts */
  function scheduleUpdateThumb(opts = {}) {
    const instant = resolveInstant(opts);
    slideInstant.value = instant;

    nextTick(() => {
      updateThumb(opts);
      requestAnimationFrame(() => {
        updateThumb(opts);
        if (instant) {
          requestAnimationFrame(() => {
            slideInstant.value = false;
          });
        }
      });
    });
  }

  watch(
    activeIdSource,
    (next, prev) => {
      const instant = prev === undefined || resolveInstant({});
      scheduleUpdateThumb({ instant });
      if (prev !== undefined && next !== prev) {
        void nextTick(() => {
          requestAnimationFrame(() => runTabThumbPulse(pulseRef.value));
        });
      }
    },
    { flush: "post" },
  );

  if (options.repositionInstant) {
    watch(options.repositionInstant, () => {
      scheduleUpdateThumb({ instant: true });
    });
  }

  if (options.variableWidth) {
    watch(options.variableWidth, () => {
      scheduleUpdateThumb({ instant: true });
    });
  }

  if (options.tabCount) {
    watch(options.tabCount, () => {
      scheduleUpdateThumb({ instant: true });
    });
  }

  /** @param {{ instant?: boolean }} [opts] */
  function onResize(opts = { instant: true }) {
    updateThumb(opts);
  }

  /** @type {ResizeObserver | null} */
  let resizeObserver = null;

  onMounted(() => {
    scheduleUpdateThumb({ instant: true });
    nextTick(() => {
      const root = rootRef.value;
      if (root && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => onResize({ instant: true }));
        resizeObserver.observe(root);
      }
    });
    if (typeof window !== "undefined") {
      window.addEventListener("resize", onResize);
    }
  });

  onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", onResize);
    }
  });

  return {
    thumbStyle,
    slideInstant,
    pulseRef,
    updateThumb,
    scheduleUpdateThumb,
  };
}
