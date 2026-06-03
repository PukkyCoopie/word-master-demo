<script setup>
/**
 * 火焰底纹：展示为 2D canvas，由 fireReglMount 离屏单 regl 每帧贴图。
 */
import { ref, onMounted, onUnmounted, watch } from "vue";
import { attachFireRegl, setFireReglAnimated } from "../lib/fireReglMount.js";

const props = defineProps({
  /** false 时只绘制一帧并保持静态（牌库未展开 stack 等） */
  animated: { type: Boolean, default: true },
});

const canvasRef = ref(null);
let dispose = null;

onMounted(() => {
  const c = canvasRef.value;
  if (!c) return;
  dispose = attachFireRegl(c, { animated: props.animated });
});

watch(
  () => props.animated,
  (animated) => {
    const c = canvasRef.value;
    if (c) setFireReglAnimated(c, animated);
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
