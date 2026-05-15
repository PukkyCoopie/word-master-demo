<script setup>
/**
 * Lucky 底纹：展示为 2D canvas，由 luckyReglMount 离屏单 regl 每帧贴图。
 */
import { ref, onMounted, onUnmounted } from "vue";
import { attachLuckyRegl } from "../lib/luckyReglMount.js";

const canvasRef = ref(null);
let dispose = null;

onMounted(() => {
  const c = canvasRef.value;
  if (!c) return;
  dispose = attachLuckyRegl(c);
});

onUnmounted(() => {
  if (dispose) {
    dispose();
    dispose = null;
  }
});
</script>

<template>
  <canvas ref="canvasRef" class="tile-lucky-regl-canvas" aria-hidden="true" />
</template>

<style scoped>
.tile-lucky-regl-canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
