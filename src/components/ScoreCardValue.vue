<template>
  <div ref="wrapRef" class="score-value-wrap">
    <div
      ref="textRef"
      class="score-value"
      :class="{
        'score-value--wrapped': wrapped,
        'score-value--scientific': scientific,
      }"
    >
      {{ displayText }}
    </div>
  </div>
</template>

<script setup>
import { ref, toRef } from "vue";
import { useFitNumericDisplay } from "../composables/useFitNumericDisplay.js";

const props = defineProps({
  value: { type: Number, default: 0 },
});

const wrapRef = ref(null);
const textRef = ref(null);
const valueProp = toRef(props, "value");

const { displayText, wrapped, scientific } = useFitNumericDisplay(wrapRef, textRef, valueProp);
</script>
