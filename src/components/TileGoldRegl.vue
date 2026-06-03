<script setup>
/**
 * 流动黄金底纹：展示为 2D canvas，由 goldReglMount 离屏单 regl 每帧贴图（避免每格独立 WebGL 上下文）。
 */
import { ref, onMounted, onUnmounted, watch } from "vue";
import { attachGoldRegl, setGoldReglAnimated } from "../lib/goldReglMount.js";

const props = defineProps({
  animated: { type: Boolean, default: true },
});

const canvasRef = ref(null);
let dispose = null;

onMounted(() => {
  const c = canvasRef.value;
  if (!c) return;
  dispose = attachGoldRegl(c, { animated: props.animated });
});

watch(
  () => props.animated,
  (animated) => {
    const c = canvasRef.value;
    if (c) setGoldReglAnimated(c, animated);
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
