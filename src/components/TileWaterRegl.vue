<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { attachWaterRegl, setWaterReglAnimated } from "../lib/waterReglMount.js";

const props = defineProps({
  animated: { type: Boolean, default: true },
});

const canvasRef = ref(null);
let dispose = null;

onMounted(() => {
  const c = canvasRef.value;
  if (!c) return;
  dispose = attachWaterRegl(c, { animated: props.animated });
});

watch(
  () => props.animated,
  (animated) => {
    const c = canvasRef.value;
    if (c) setWaterReglAnimated(c, animated);
  },
);

onUnmounted(() => {
  if (dispose) {
    dispose();
    dispose = null;
  }
});
</script>

<template>
  <canvas ref="canvasRef" class="tile-water-regl-canvas" aria-hidden="true" />
</template>

<style scoped>
.tile-water-regl-canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
