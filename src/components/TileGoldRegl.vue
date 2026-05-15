<script setup>
/**
 * 流动黄金底纹：展示为 2D canvas，由 goldReglMount 离屏单 regl 每帧贴图（避免每格独立 WebGL 上下文）。
 */
import { ref, onMounted, onUnmounted } from "vue";
import { attachGoldRegl } from "../lib/goldReglMount.js";

const canvasRef = ref(null);
let dispose = null;

onMounted(() => {
  const c = canvasRef.value;
  if (!c) return;
  const ownerClass = c.parentElement?.className || "";
    dispose = attachGoldRegl(c);
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
  <canvas ref="canvasRef" class="tile-gold-regl-canvas" aria-hidden="true" />
</template>

<style scoped>
.tile-gold-regl-canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
