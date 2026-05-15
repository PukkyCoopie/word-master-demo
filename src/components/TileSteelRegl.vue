<script setup>
/**
 * 不锈钢底纹：展示为 2D canvas，由 steelReglMount 离屏单 regl 每帧贴图。
 */
import { ref, onMounted, onUnmounted } from "vue";
import { attachSteelRegl } from "../lib/steelReglMount.js";

const canvasRef = ref(null);
let dispose = null;

onMounted(() => {
  const c = canvasRef.value;
  if (!c) return;
  const ownerClass = c.parentElement?.className || "";
    dispose = attachSteelRegl(c);
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
  <canvas ref="canvasRef" class="tile-steel-regl-canvas" aria-hidden="true" />
</template>

<style scoped>
.tile-steel-regl-canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
