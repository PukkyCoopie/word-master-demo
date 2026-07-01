import { nextTick, onMounted, ref, unref, watch } from "vue";
import { parseScore } from "../utils/scoreInteger.js";
import {
  resolveScoreNumericPresentation,
  scoreNumericPresentationKey,
  shouldLockScoreResultBoxWidth,
} from "../utils/scoreNumericFormat.js";

/**
 * result-box 数字：按数量级展示，不测量 DOM 宽度。
 *
 * @param {import('vue').Ref<HTMLElement | null>} boxRef
 * @param {import('vue').Ref<HTMLElement | null>} textRef
 * @param {import('vue').MaybeRefOrGetter<number | string | null | undefined>} valueSource
 * @param {import('vue').MaybeRefOrGetter<number | null | undefined>} maxBoxWidthSource
 */
export function useResultBoxNumericDisplay(boxRef, textRef, valueSource, maxBoxWidthSource) {
  const displayText = ref("0");
  const scientific = ref(false);
  let lastPresentationKey = "";
  let cachedBaseFontSize = 0;

  function resetTextInline(textEl) {
    textEl.style.fontSize = "";
    textEl.style.whiteSpace = "nowrap";
    textEl.style.display = "";
  }

  function syncBoxWidth(lockedToMax) {
    const box = boxRef.value;
    if (!box) return;
    const maxBoxW = Number(unref(maxBoxWidthSource)) || 0;
    const nextWidth = lockedToMax && maxBoxW > 0 ? `${maxBoxW}px` : "";
    if (box.style.width === nextWidth) return;
    box.style.width = nextWidth;
  }

  /**
   * @param {HTMLElement} textEl
   * @param {import("../utils/scoreNumericFormat.js").ScoreNumericPresentation} presentation
   * @param {number} baseFontSize
   */
  function applyPresentation(textEl, presentation, baseFontSize) {
    displayText.value = presentation.text;
    scientific.value = presentation.scientific;
    textEl.textContent = presentation.text;
    resetTextInline(textEl);
    const px = baseFontSize * presentation.fontScale;
    textEl.style.fontSize = px >= baseFontSize - 0.01 ? "" : `${px}px`;
  }

  function refit(options = {}) {
    const force = options.force === true;
    const box = boxRef.value;
    const textEl = textRef.value;
    if (!box || !textEl) return;

    const maxBoxW = Number(unref(maxBoxWidthSource)) || 0;
    if (maxBoxW <= 0) return;

    const raw = parseScore(unref(valueSource));

    if (raw === 0n) {
      const zeroKey = "0|1|0|0|0";
      if (!force && lastPresentationKey === zeroKey) return;
      lastPresentationKey = zeroKey;
      displayText.value = "0";
      scientific.value = false;
      resetTextInline(textEl);
      textEl.textContent = "0";
      syncBoxWidth(false);
      return;
    }

    const presentation = resolveScoreNumericPresentation(raw, { singleLine: true });
    const boxLocked = shouldLockScoreResultBoxWidth(raw, presentation);
    const key = scoreNumericPresentationKey(presentation, boxLocked);
    if (!force && key === lastPresentationKey) return;
    lastPresentationKey = key;

    const baseFontSize =
      force || cachedBaseFontSize <= 0
        ? (() => {
            resetTextInline(textEl);
            cachedBaseFontSize = parseFloat(getComputedStyle(textEl).fontSize) || 0;
            return cachedBaseFontSize;
          })()
        : cachedBaseFontSize;
    if (!baseFontSize) return;

    syncBoxWidth(boxLocked);
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

  watch(boxRef, () => forceRefit());

  watch(() => unref(valueSource), () => scheduleRefit());
  watch(() => unref(maxBoxWidthSource), () => forceRefit());

  return { displayText, scientific, refit: forceRefit };
}
