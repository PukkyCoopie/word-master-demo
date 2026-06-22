import { nextTick, onMounted, onUnmounted, ref, unref, watch } from "vue";
import {
  formatScoreIntegerLocale,
  formatScoreScientificNotation,
  SCORE_SCI_NOTATION_MAX_DECIMALS,
  SCORE_SCI_NOTATION_MIN_DECIMALS,
} from "../utils/scoreNumericFormat.js";

/** 单行缩放下限；达到后若仍放不下则折为最多两行 */
const MIN_FONT_SCALE = 0.5;

/**
 * @typedef {object} FitNumericDisplayOptions
 * @property {boolean} [singleLine] 为 true 时不折行，缩至最小字号后直接用科学计数法
 */

/**
 * 在固定宽度容器内自适应数字展示：先 locale 整数 → 缩小/两行 → 仍溢出则科学计数法（默认字号单行）。
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
  /** @type {ResizeObserver | null} */
  let resizeObserver = null;
  let lastValue = null;
  let lastContainerWidth = 0;

  function resetTextInline(textEl) {
    textEl.style.fontSize = "";
    textEl.style.whiteSpace = "nowrap";
    textEl.style.display = "";
    textEl.style.webkitBoxOrient = "";
    textEl.style.webkitLineClamp = "";
    textEl.style.overflow = "";
  }

  function applyWrapMeasureStyles(textEl) {
    textEl.style.display = "-webkit-box";
    textEl.style.webkitBoxOrient = "vertical";
    textEl.style.webkitLineClamp = "2";
    textEl.style.overflow = "hidden";
  }

  function applyTextForMeasure(textEl, text) {
    textEl.textContent = text;
  }

  /** 清除内联字号后读取 CSS 基准字号，避免上次 refit 留下的 inline fontSize 被当作基准。 */
  function readBaseFontSize(textEl) {
    resetTextInline(textEl);
    return parseFloat(getComputedStyle(textEl).fontSize) || 0;
  }

  /**
   * @param {HTMLElement} textEl
   * @param {number} baseFontSize
   * @param {number} minFontSize
   * @param {number} containerWidth
   * @param {number} containerHeight
   */
  function localeTextFits(textEl, text, baseFontSize, minFontSize, containerWidth, containerHeight) {
    resetTextInline(textEl);
    applyTextForMeasure(textEl, text);

    if (textEl.scrollWidth <= containerWidth) {
      const actualFontSize = parseFloat(getComputedStyle(textEl).fontSize) || baseFontSize;
      return { mode: "single-base", fontSize: actualFontSize };
    }

    let lo = minFontSize;
    let hi = baseFontSize;
    let best = minFontSize;

    while (lo <= hi) {
      const mid = (lo + hi) / 2;
      textEl.style.fontSize = `${mid}px`;
      if (textEl.scrollWidth <= containerWidth) {
        best = mid;
        lo = mid + 0.25;
      } else {
        hi = mid - 0.25;
      }
    }

    textEl.style.fontSize = `${best}px`;
    if (textEl.scrollWidth <= containerWidth) {
      return { mode: "single-shrink", fontSize: best };
    }

    if (singleLine) {
      return null;
    }

    textEl.style.fontSize = `${minFontSize}px`;
    textEl.style.whiteSpace = "normal";
    applyWrapMeasureStyles(textEl);
    const wrappedOverflow =
      textEl.scrollWidth > containerWidth + 1 || textEl.scrollHeight > containerHeight + 1;
    if (!wrappedOverflow) {
      return { mode: "wrap", fontSize: minFontSize };
    }

    return null;
  }

  /**
   * @param {HTMLElement} textEl
   * @param {number} value
   * @param {number} baseFontSize
   * @param {number} containerWidth
   */
  function pickScientificText(textEl, value, baseFontSize, containerWidth) {
    resetTextInline(textEl);
    textEl.style.fontSize = `${baseFontSize}px`;

    for (let dp = SCORE_SCI_NOTATION_MAX_DECIMALS; dp >= SCORE_SCI_NOTATION_MIN_DECIMALS; dp--) {
      const text = formatScoreScientificNotation(value, dp);
      applyTextForMeasure(textEl, text);
      if (textEl.scrollWidth <= containerWidth) {
        return { text, decimalPlaces: dp, fontSize: baseFontSize };
      }
    }

    const fallbackText = formatScoreScientificNotation(value, SCORE_SCI_NOTATION_MIN_DECIMALS);
    applyTextForMeasure(textEl, fallbackText);
    let fontSize = baseFontSize;
    const minFontSize = baseFontSize * MIN_FONT_SCALE;
    if (textEl.scrollWidth > containerWidth) {
      let lo = minFontSize;
      let hi = baseFontSize;
      let best = minFontSize;
      while (lo <= hi) {
        const mid = (lo + hi) / 2;
        textEl.style.fontSize = `${mid}px`;
        if (textEl.scrollWidth <= containerWidth) {
          best = mid;
          lo = mid + 0.25;
        } else {
          hi = mid - 0.25;
        }
      }
      fontSize = best;
    }
    return {
      text: fallbackText,
      decimalPlaces: SCORE_SCI_NOTATION_MIN_DECIMALS,
      fontSize,
    };
  }

  function applyPresentation(textEl, text, mode, fontSize) {
    applyTextForMeasure(textEl, text);
    displayText.value = text;
    wrapped.value = mode === "wrap";
    scientific.value = mode === "scientific" || mode === "scientific-shrink";
    resetTextInline(textEl);
    textEl.style.fontSize = `${fontSize}px`;
    if (mode === "wrap") {
      textEl.style.whiteSpace = "normal";
    }
  }

  function refit(options = {}) {
    const force = options.force === true;
    const wrap = wrapRef.value;
    const textEl = textRef.value;
    if (!wrap || !textEl) return;

    const containerWidth = wrap.clientWidth;
    const containerHeight = wrap.clientHeight;
    if (containerWidth <= 0) return;

    const raw = Math.round(Number(unref(valueSource)) || 0);
    if (!force && raw === lastValue && containerWidth === lastContainerWidth) return;
    lastValue = raw;
    lastContainerWidth = containerWidth;

    if (raw === 0) {
      displayText.value = "0";
      wrapped.value = false;
      scientific.value = false;
      resetTextInline(textEl);
      textEl.style.fontSize = "";
      applyTextForMeasure(textEl, "0");
      return;
    }

    const baseFontSize = readBaseFontSize(textEl);
    if (!baseFontSize) return;

    const minFontSize = baseFontSize * MIN_FONT_SCALE;
    const localeText = formatScoreIntegerLocale(raw);
    const localeFit = localeTextFits(
      textEl,
      localeText,
      baseFontSize,
      minFontSize,
      containerWidth,
      containerHeight,
    );

    if (localeFit) {
      applyPresentation(textEl, localeText, localeFit.mode, localeFit.fontSize);
      return;
    }

    const sci = pickScientificText(textEl, raw, baseFontSize, containerWidth);
    const sciMode = sci.fontSize < baseFontSize - 0.25 ? "scientific-shrink" : "scientific";
    applyPresentation(textEl, sci.text, sciMode, sci.fontSize);
  }

  function scheduleRefit(options = {}) {
    nextTick(() => refit(options));
  }

  function forceRefit() {
    scheduleRefit({ force: true });
  }

  onMounted(() => {
    scheduleRefit();
    const wrap = wrapRef.value;
    if (wrap && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => scheduleRefit());
      resizeObserver.observe(wrap);
    }
  });

  onUnmounted(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
  });

  watch(() => unref(valueSource), scheduleRefit);

  return { displayText, wrapped, scientific, refit: forceRefit };
}
