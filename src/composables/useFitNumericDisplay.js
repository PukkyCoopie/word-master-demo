import { nextTick, onMounted, ref, unref, watch } from "vue";
import { parseScore } from "../utils/scoreInteger.js";
import {
  resolveScoreNumericPresentation,
  scoreNumericPresentationKey,
} from "../utils/scoreNumericFormat.js";

/**
 * @typedef {object} FitNumericDisplayOptions
 * @property {boolean} [singleLine] 为 true 时不折行，8 位及以上直出科学计数法
 */

/**
 * 固定宽容器内数字展示：按数量级选 locale / 科学计数法及字号比例，不测量 DOM 宽度。
 *
 * @param {import('vue').Ref<HTMLElement | null>} wrapRef
 * @param {import('vue').Ref<HTMLElement | null>} textRef
 * @param {import('vue').MaybeRefOrGetter<number | string | null | undefined>} valueSource
 * @param {FitNumericDisplayOptions} [options]
 */
export function useFitNumericDisplay(wrapRef, textRef, valueSource, options = {}) {
  const singleLine = options.singleLine === true;
  const displayText = ref("0");
  const wrapped = ref(false);
  const scientific = ref(false);
  let lastPresentationKey = "";
  let cachedBaseFontSize = 0;

  function resetTextInline(textEl) {
    textEl.style.fontSize = "";
    textEl.style.whiteSpace = "nowrap";
    textEl.style.display = "";
    textEl.style.webkitBoxOrient = "";
    textEl.style.webkitLineClamp = "";
    textEl.style.overflow = "";
  }

  function readBaseFontSize(textEl, force = false) {
    if (!force && cachedBaseFontSize > 0) return cachedBaseFontSize;
    resetTextInline(textEl);
    cachedBaseFontSize = parseFloat(getComputedStyle(textEl).fontSize) || 0;
    return cachedBaseFontSize;
  }

  /**
   * @param {HTMLElement} textEl
   * @param {import("../utils/scoreNumericFormat.js").ScoreNumericPresentation} presentation
   * @param {number} baseFontSize
   */
  function applyPresentation(textEl, presentation, baseFontSize) {
    displayText.value = presentation.text;
    wrapped.value = presentation.wrapped;
    scientific.value = presentation.scientific;
    textEl.textContent = presentation.text;
    resetTextInline(textEl);
    const px = baseFontSize * presentation.fontScale;
    textEl.style.fontSize = px >= baseFontSize - 0.01 ? "" : `${px}px`;
    if (presentation.wrapped) {
      textEl.style.whiteSpace = "normal";
      textEl.style.display = "-webkit-box";
      textEl.style.webkitBoxOrient = "vertical";
      textEl.style.webkitLineClamp = "2";
      textEl.style.overflow = "hidden";
    }
  }

  function refit(options = {}) {
    const force = options.force === true;
    const textEl = textRef.value;
    if (!textEl) return;

    const raw = parseScore(unref(valueSource));

    if (raw === 0n) {
      const zeroKey = "0|1|0|0|0";
      if (!force && lastPresentationKey === zeroKey) return;
      lastPresentationKey = zeroKey;
      displayText.value = "0";
      wrapped.value = false;
      scientific.value = false;
      resetTextInline(textEl);
      textEl.textContent = "0";
      return;
    }

    const presentation = resolveScoreNumericPresentation(raw, { singleLine });
    const key = scoreNumericPresentationKey(presentation);
    if (!force && key === lastPresentationKey) return;
    lastPresentationKey = key;

    const baseFontSize = readBaseFontSize(textEl, force);
    if (!baseFontSize) return;

    applyPresentation(textEl, presentation, baseFontSize);
  }

  function scheduleRefit(options = {}) {
    nextTick(() => refit(options));
  }

  function forceRefit() {
    cachedBaseFontSize = 0;
    lastPresentationKey = "";
    scheduleRefit({ force: true });
  }

  onMounted(() => {
    scheduleRefit({ force: true });
  });

  watch(() => unref(valueSource), () => scheduleRefit());

  return { displayText, wrapped, scientific, refit: forceRefit };
}
