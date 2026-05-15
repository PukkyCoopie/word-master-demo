<script setup>
/**
 * 万能符材质：固定的单面 Liquid Squircle 观感（无旋转动画）。
 */
import { ref, onMounted, onUnmounted } from "vue";
import { attachWildcardRegl } from "../lib/wildcardReglMount.js";

const canvasRef = ref(null);
let dispose = null;

onMounted(() => {
  const c = canvasRef.value;
  if (!c) return;
  dispose = attachWildcardRegl(c);
});

onUnmounted(() => {
  if (dispose) {
    dispose();
    dispose = null;
  }
});
</script>

<template>
  <canvas ref="canvasRef" class="tile-wildcard-regl-canvas" aria-hidden="true" />
</template>

<style scoped>
.tile-wildcard-regl-canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
