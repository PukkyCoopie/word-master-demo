<template>
  <div ref="pulseRef" class="result-fit-num-pulse">
    <div class="result-box-fit-num-wrap">
      <span
        ref="textRef"
        class="result-fit-num result-num"
        :class="{ 'result-fit-num--scientific': scientific }"
      >
        {{ displayText }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, toRef } from "vue";
import { useResultBoxNumericDisplay } from "../composables/useResultBoxNumericDisplay.js";

const props = defineProps({
  value: { type: Number, default: 0 },
  maxBoxWidthPx: { type: Number, default: null },
});

const textRef = ref(null);
const pulseRef = ref(null);
const boxRef = ref(null);

const maxBoxWidthRef = toRef(props, "maxBoxWidthPx");

const { displayText, scientific, refit } = useResultBoxNumericDisplay(
  boxRef,
  textRef,
  toRef(props, "value"),
  maxBoxWidthRef,
);

onMounted(() => {
  boxRef.value = pulseRef.value?.closest(".result-box") ?? null;
  refit();
});

defineExpose({
  getTextEl: () => pulseRef.value,
  refit,
});
</script>
