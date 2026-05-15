<template>
  <div class="result-area">
    <div class="result-area-inset">
      <div class="result-total-anchor">
        <div v-show="showTotalBar" ref="resultTotalRef" class="result-total">
          {{ totalText }}
        </div>
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
          <div ref="resultScoreBoxRef" class="result-box result-box-score">
            <span class="result-label">{{ scoreLabel }}</span>
            <span ref="resultScoreNumRef" class="result-num">{{ scoreText }}</span>
          </div>
          <span class="result-times">×</span>
          <div ref="resultMultBoxRef" class="result-box result-box-mult">
            <span class="result-label">{{ multLabel }}</span>
            <span ref="resultMultNumRef" class="result-num">{{ multText }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

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

const resultTotalRef = ref(null);
const resultFormulaRef = ref(null);
const resultScoreNumRef = ref(null);
const resultMultNumRef = ref(null);
const resultWordlenRef = ref(null);
const resultWordlenMainRef = ref(null);
const resultWordlenLevelRef = ref(null);
const resultScoreBoxRef = ref(null);
const resultMultBoxRef = ref(null);

const wordLevelText = computed(() => `${props.levelPrefix}${props.wordLevel}`);

defineExpose({
  getTotalEl: () => resultTotalRef.value,
  getFormulaEl: () => resultFormulaRef.value,
  getScoreNumEl: () => resultScoreNumRef.value,
  getMultNumEl: () => resultMultNumRef.value,
  getWordlenEl: () => resultWordlenRef.value,
  getWordlenMainEl: () => resultWordlenMainRef.value,
  getWordlenLevelEl: () => resultWordlenLevelRef.value,
  getScoreBoxEl: () => resultScoreBoxRef.value,
  getMultBoxEl: () => resultMultBoxRef.value,
});
</script>
