<script setup>
/**
 * 火焰底纹：展示为 2D canvas，由 fireReglMount 离屏单 regl 每帧贴图。
 */
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { attachFireRegl } from "../lib/fireReglMount.js";

const canvasRef = ref(null);
let dispose = null;

onMounted(() => {
  const c = canvasRef.value;
  if (!c) return;
  const ownerClass = c.parentElement?.className || "";
    dispose = attachFireRegl(c);
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
  <canvas ref="canvasRef" class="tile-fire-regl-canvas" aria-hidden="true" />
</template>

<style scoped>
.tile-fire-regl-canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
