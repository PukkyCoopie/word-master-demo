<template>
  <div class="result-area">
    <div ref="resultAreaInsetRef" class="result-area-inset">
      <div class="result-total-anchor">
        <transition name="result-total-fade-scale">
          <div v-if="showTotalBar" class="result-total-wrap">
            <ResultFitNum
              ref="resultTotalFitRef"
              :value="totalNumeric"
              text-class="result-total"
            />
          </div>
        </transition>
      </div>
      <div class="result-wordlen-anchor">
        <transition name="result-wordlen-fade-scale">
          <div v-if="showWordLength" ref="resultWordlenRef" class="result-wordlen">
            <span ref="resultWordlenMainRef" class="result-wordlen-main">{{ wordLengthText }}</span>
            <span ref="resultWordlenLevelRef" class="result-wordlen-level">{{ wordLevelText }}</span>
          </div>
        </transition>
      </div>
      <div class="result-formula-anchor">
        <div ref="resultFormulaRef" class="result-formula">
          <div
            ref="resultScoreBoxRef"
            class="result-box result-box-score"
            :style="formulaBoxStyle"
          >
            <span class="result-label">{{ scoreLabel }}</span>
            <ResultBoxFitNum
              ref="resultScoreFitRef"
              :max-box-width-px="formulaBoxMaxWidthPx"
              :value="scoreNumeric"
            />
          </div>
          <span ref="resultTimesRef" class="result-times">×</span>
          <div
            ref="resultMultBoxRef"
            class="result-box result-box-mult"
            :style="formulaBoxStyle"
          >
            <span class="result-label">{{ multLabel }}</span>
            <ResultBoxFitNum
              ref="resultMultFitRef"
              :max-box-width-px="formulaBoxMaxWidthPx"
              :value="multNumeric"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import ResultFitNum from "./ResultFitNum.vue";
import ResultBoxFitNum from "./ResultBoxFitNum.vue";

const props = defineProps({
  showTotalBar: { type: Boolean, default: false },
  totalText: { type: String, default: "" },
  showWordLength: { type: Boolean, default: false },
  wordLengthText: { type: String, default: "" },
  wordLevel: { type: [Number, String], default: 0 },
  scoreLabel: { type: String, default: "分数" },
  scoreText: { type: String, default: "0" },
  multLabel: { type: String, default: "倍率" },
  multText: { type: String, default: "0" },
  levelPrefix: { type: String, default: "等级" },
});

const resultAreaInsetRef = ref(null);
const resultFormulaRef = ref(null);
const resultTimesRef = ref(null);
const resultWordlenRef = ref(null);
const resultWordlenMainRef = ref(null);
const resultWordlenLevelRef = ref(null);
const resultScoreBoxRef = ref(null);
const resultMultBoxRef = ref(null);
const resultTotalFitRef = ref(null);
const resultScoreFitRef = ref(null);
const resultMultFitRef = ref(null);

const formulaBoxMaxWidthPx = ref(null);

/** @type {ResizeObserver | null} */
let layoutObserver = null;

function parseLocaleIntegerText(text) {
  const n = Number(String(text ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

const totalNumeric = computed(() => parseLocaleIntegerText(props.totalText));
const scoreNumeric = computed(() => parseLocaleIntegerText(props.scoreText));
const multNumeric = computed(() => parseLocaleIntegerText(props.multText));

const formulaBoxStyle = computed(() => {
  const w = formulaBoxMaxWidthPx.value;
  if (w == null || w <= 0) return undefined;
  return { maxWidth: `${w}px` };
});

const wordLevelText = computed(() => `${props.levelPrefix}${props.wordLevel}`);

function refitAllFitNums() {
  resultTotalFitRef.value?.refit?.();
  resultScoreFitRef.value?.refit?.();
  resultMultFitRef.value?.refit?.();
}

function syncFormulaBoxMaxWidth() {
  const inset = resultAreaInsetRef.value;
  const formula = resultFormulaRef.value;
  const times = resultTimesRef.value;
  if (!inset || !formula) return;

  const insetWidth = inset.clientWidth;
  if (insetWidth <= 0) return;

  const timesWidth = times?.getBoundingClientRect().width ?? 0;
  const gap = parseFloat(getComputedStyle(formula).columnGap || getComputedStyle(formula).gap) || 0;
  const available = insetWidth - timesWidth - gap * 2;
  const next = Math.max(0, available / 2);

  if (formulaBoxMaxWidthPx.value !== next) {
    formulaBoxMaxWidthPx.value = next;
    nextTick(() => refitAllFitNums());
  }
}

function scheduleLayoutSync() {
  nextTick(() => syncFormulaBoxMaxWidth());
}

onMounted(() => {
  scheduleLayoutSync();
  const inset = resultAreaInsetRef.value;
  if (inset && typeof ResizeObserver !== "undefined") {
    layoutObserver = new ResizeObserver(() => scheduleLayoutSync());
    layoutObserver.observe(inset);
  }
});

onUnmounted(() => {
  layoutObserver?.disconnect();
  layoutObserver = null;
});

defineExpose({
  getTotalEl: () => resultTotalFitRef.value?.getTextEl?.() ?? null,
  getFormulaEl: () => resultFormulaRef.value,
  getScoreNumEl: () => resultScoreFitRef.value?.getTextEl?.() ?? null,
  getMultNumEl: () => resultMultFitRef.value?.getTextEl?.() ?? null,
  getWordlenEl: () => resultWordlenRef.value,
  getWordlenMainEl: () => resultWordlenMainRef.value,
  getWordlenLevelEl: () => resultWordlenLevelRef.value,
  getScoreBoxEl: () => resultScoreBoxRef.value,
  getMultBoxEl: () => resultMultBoxRef.value,
});
</script>
