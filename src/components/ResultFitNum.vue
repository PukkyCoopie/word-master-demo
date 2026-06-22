<template>
  <div ref="pulseRef" class="result-fit-num-pulse">
    <div ref="wrapRef" class="result-fit-num-wrap">
      <span
        ref="textRef"
        class="result-fit-num"
        :class="[textClass, { 'result-fit-num--scientific': scientific }]"
      >
        {{ displayText }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, toRef } from "vue";
import { useFitNumericDisplay } from "../composables/useFitNumericDisplay.js";

const props = defineProps({
  value: { type: Number, default: 0 },
  /** 附加在 `.result-fit-num` 上的类，如 `result-total` / `result-num` */
  textClass: { type: String, default: "" },
});

const wrapRef = ref(null);
const textRef = ref(null);
const pulseRef = ref(null);

const { displayText, scientific, refit } = useFitNumericDisplay(
  wrapRef,
  textRef,
  toRef(props, "value"),
  { singleLine: true },
);

defineExpose({
  /** GSAP 脉冲目标：外层不参与宽度测量，缩放时不被内层裁切 */
  getTextEl: () => pulseRef.value,
  refit,
});
</script>
