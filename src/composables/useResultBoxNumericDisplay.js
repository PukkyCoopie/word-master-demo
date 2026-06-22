import { nextTick, onMounted, ref, unref, watch } from "vue";
import {
  formatScoreIntegerLocale,
  formatScoreScientificNotation,
  SCORE_SCI_NOTATION_MAX_DECIMALS,
} from "../utils/scoreNumericFormat.js";

const MIN_FONT_SCALE = 0.5;

/**
 * result-box 数字：正常字号 → 盒子随内容撑宽（至 max）→ 缩字至 50% → 原始字号科学计数法。
 *
 * @param {import('vue').Ref<HTMLElement | null>} boxRef
 * @param {import('vue').Ref<HTMLElement | null>} textRef
 * @param {import('vue').MaybeRefOrGetter<number | string | null | undefined>} valueSource
 * @param {import('vue').MaybeRefOrGetter<number | null | undefined>} maxBoxWidthSource
 */
export function useResultBoxNumericDisplay(boxRef, textRef, valueSource, maxBoxWidthSource) {
  const displayText = ref("0");
  const scientific = ref(false);
  let lastValue = null;
  let lastMaxBoxWidth = 0;

  function resetTextInline(textEl) {
    textEl.style.fontSize = "";
    textEl.style.whiteSpace = "nowrap";
    textEl.style.display = "";
  }

  function applyTextForMeasure(textEl, text) {
    textEl.textContent = text;
  }

  function measureTextWidth(textEl, text, fontSize) {
    resetTextInline(textEl);
    textEl.style.fontSize = `${fontSize}px`;
    applyTextForMeasure(textEl, text);
    return textEl.scrollWidth;
  }

  function shrinkFontToFit(textEl, text, baseFontSize, minFontSize, maxWidth) {
    let lo = minFontSize;
    let hi = baseFontSize;
    let best = null;

    while (lo <= hi) {
      const mid = (lo + hi) / 2;
      textEl.style.fontSize = `${mid}px`;
      applyTextForMeasure(textEl, text);
      if (textEl.scrollWidth <= maxWidth) {
        best = mid;
        lo = mid + 0.25;
      } else {
        hi = mid - 0.25;
      }
    }

    return best;
  }

  function pickScientificAtBaseFont(textEl, value, baseFontSize, maxWidth) {
    let lo = 0;
    let hi = SCORE_SCI_NOTATION_MAX_DECIMALS;
    let bestDp = 0;
    let bestText = formatScoreScientificNotation(value, 0);

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const text = formatScoreScientificNotation(value, mid);
      if (measureTextWidth(textEl, text, baseFontSize) <= maxWidth) {
        bestDp = mid;
        bestText = text;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    return { text: bestText, fontSize: baseFontSize, decimalPlaces: bestDp };
  }

  function syncBoxWidth(lockedToMax) {
    const box = boxRef.value;
    if (!box) return;
    const maxBoxW = Number(unref(maxBoxWidthSource)) || 0;
    if (lockedToMax && maxBoxW > 0) {
      box.style.width = `${maxBoxW}px`;
    } else {
      box.style.width = "";
    }
  }

  function applyPresentation(textEl, text, fontSize, isScientific) {
    applyTextForMeasure(textEl, text);
    displayText.value = text;
    scientific.value = isScientific;
    resetTextInline(textEl);
    textEl.style.fontSize = `${fontSize}px`;
  }

  function refit(options = {}) {
    const force = options.force === true;
    const box = boxRef.value;
    const textEl = textRef.value;
    if (!box || !textEl) return;

    const maxBoxW = Number(unref(maxBoxWidthSource)) || 0;
    if (maxBoxW <= 0) return;

    const raw = Math.round(Number(unref(valueSource)) || 0);
    if (!force && raw === lastValue && maxBoxW === lastMaxBoxWidth) return;
    lastValue = raw;
    lastMaxBoxWidth = maxBoxW;

    if (raw === 0) {
      displayText.value = "0";
      scientific.value = false;
      resetTextInline(textEl);
      textEl.style.fontSize = "";
      applyTextForMeasure(textEl, "0");
      syncBoxWidth(false);
      return;
    }

    resetTextInline(textEl);
    const baseFontSize = parseFloat(getComputedStyle(textEl).fontSize);
    if (!baseFontSize) return;

    const minFontSize = baseFontSize * MIN_FONT_SCALE;
    const localeText = formatScoreIntegerLocale(raw);
    const textNaturalW = measureTextWidth(textEl, localeText, baseFontSize);

    const labelEl = box.querySelector(".result-label");
    const labelW = labelEl instanceof HTMLElement ? labelEl.scrollWidth : 0;
    const boxStyle = getComputedStyle(box);
    const padL = parseFloat(boxStyle.paddingLeft) || 0;
    const padR = parseFloat(boxStyle.paddingRight) || 0;
    const minBoxW = parseFloat(boxStyle.minWidth) || 0;

    const contentInnerW = Math.max(labelW, textNaturalW);
    const neededBoxW = contentInnerW + padL + padR;
    const atMaxBoxWidth = neededBoxW > maxBoxW;
    const effectiveBoxW = Math.min(Math.max(neededBoxW, minBoxW), maxBoxW);
    const numAreaW = Math.max(0, effectiveBoxW - padL - padR);

    if (textNaturalW <= numAreaW) {
      syncBoxWidth(false);
      applyPresentation(textEl, localeText, baseFontSize, false);
      return;
    }

    const shrunk = shrinkFontToFit(textEl, localeText, baseFontSize, minFontSize, numAreaW);
    if (shrunk != null) {
      syncBoxWidth(true);
      applyPresentation(textEl, localeText, shrunk, false);
      return;
    }

    syncBoxWidth(true);
    const sci = pickScientificAtBaseFont(textEl, raw, baseFontSize, numAreaW);
    applyPresentation(textEl, sci.text, sci.fontSize, true);
  }

  function scheduleRefit(options = {}) {
    nextTick(() => refit(options));
  }

  function forceRefit() {
    scheduleRefit({ force: true });
  }

  onMounted(() => {
    scheduleRefit();
  });

  watch(boxRef, () => scheduleRefit({ force: true }));

  watch(() => unref(valueSource), forceRefit);
  watch(() => unref(maxBoxWidthSource), forceRefit);

  return { displayText, scientific, refit: forceRefit };
}
