import gsap from "gsap";
import { nextTick, unref, watch } from "vue";

/** @param {HTMLElement} pulse */
function triggerPulseClass(pulse) {
  pulse.classList.remove("tab-thumb-pulse-active");
  void pulse.offsetWidth;
  pulse.classList.add("tab-thumb-pulse-active");
  const onEnd = () => {
    pulse.classList.remove("tab-thumb-pulse-active");
    pulse.removeEventListener("animationend", onEnd);
  };
  pulse.addEventListener("animationend", onEnd);
}

/**
 * 外层 track：GSAP xPercent 位移；内层 pulse：CSS scale 按压（避免 GSAP 3.14 translate/scale 冲突）。
 * @param {import('vue').WatchSource<number | string>} indexSource
 * @param {import('vue').Ref<HTMLElement | null | undefined>} trackRef
 * @param {{ slide?: boolean, pulseRef?: import('vue').Ref<HTMLElement | null | undefined>, getSlideIndex?: (raw: number | string) => number }} [options]
 */
export function useTabThumbFlash(indexSource, trackRef, options = {}) {
  const slide = options.slide !== false;

  /** @param {number | string} raw */
  function resolveIndex(raw) {
    if (options.getSlideIndex) return options.getSlideIndex(raw);
    return Number(raw) || 0;
  }

  /** @returns {HTMLElement | null | undefined} */
  function resolvePulseEl() {
    return options.pulseRef?.value ?? null;
  }

  /** @returns {boolean} */
  function refsReady() {
    return !!(trackRef.value && resolvePulseEl());
  }

  /** @param {boolean} animate */
  function runThumbAnim(animate) {
    const track = trackRef.value;
    const pulse = resolvePulseEl();
    if (!track || !pulse) return;

    const index = resolveIndex(unref(indexSource));

    if (slide) {
      gsap.killTweensOf(track);
      if (!animate) {
        gsap.set(track, { xPercent: index * 100 });
      } else {
        gsap.to(track, {
          xPercent: index * 100,
          duration: 0.48,
          ease: "expo.out",
        });
      }
    }

    if (animate) {
      triggerPulseClass(pulse);
    }
  }

  function tryInitPosition() {
    if (!refsReady()) return;
    runThumbAnim(false);
  }

  watch(
    () => [trackRef.value, options.pulseRef?.value],
    () => {
      void nextTick(() => tryInitPosition());
    },
  );

  watch(
    indexSource,
    (next, prev) => {
      const isInit = prev === undefined;
      if (!isInit && next === prev) return;
      void nextTick(() => {
        if (!refsReady()) return;
        runThumbAnim(!isInit);
      });
    },
    { flush: "post", immediate: true },
  );

  return { runThumbAnim };
}

/** InfoModal 等：仅 CSS 按压脉冲 */
export function runTabThumbPulse(el) {
  if (!el) return;
  triggerPulseClass(el);
}
