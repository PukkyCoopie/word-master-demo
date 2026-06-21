<script setup>
/**
 * 万能符材质：展示为 2D canvas，由 reglMaterialHub 离屏单 regl 贴图。
 */
import { ref, toRef } from "vue";
import { useTileMaterialRegl } from "../composables/useTileMaterialRegl.js";

const props = defineProps({
  animated: { type: Boolean, default: true },
});

const canvasRef = ref(null);
useTileMaterialRegl("wildcard", canvasRef, toRef(props, "animated"));
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
