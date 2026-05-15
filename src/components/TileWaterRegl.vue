<script setup>
/**
 * 水波底纹：展示为 2D canvas，由 waterReglMount 离屏单 regl 每帧贴图。
 */
import { ref, onMounted, onUnmounted } from "vue";
import { attachWaterRegl } from "../lib/waterReglMount.js";

const canvasRef = ref(null);
let dispose = null;

onMounted(() => {
  const c = canvasRef.value;
  if (!c) return;
  const ownerClass = c.parentElement?.className || "";
    dispose = attachWaterRegl(c);
});

onUnmounted(() => {
  const c = canvasRef.value;
  const ownerClass = c?.parentElement?.className || "";
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
