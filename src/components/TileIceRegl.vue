<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { attachIceRegl, setIceReglAnimated } from "../lib/iceReglMount.js";

const props = defineProps({
  animated: { type: Boolean, default: true },
});

const canvasRef = ref(null);
let dispose = null;

onMounted(() => {
  const c = canvasRef.value;
  if (!c) return;
  dispose = attachIceRegl(c, { animated: props.animated });
});

watch(
  () => props.animated,
  (animated) => {
    const c = canvasRef.value;
    if (c) setIceReglAnimated(c, animated);
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
  <canvas ref="canvasRef" class="tile-ice-regl-canvas" aria-hidden="true" />
</template>

<style scoped>
.tile-ice-regl-canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
