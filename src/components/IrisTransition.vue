<template>
  <div
    ref="overlayRef"
    class="iris-overlay"
    :style="irisStyle"
    aria-hidden="true"
  />
</template>

<script setup>
import { computed, nextTick, reactive, ref } from "vue";
import { bumpOverlayZ } from "../game/overlayStack.js";

const props = defineProps({
  color: { type: String, default: "#5a8fb8" },
  coverMs: { type: Number, default: 480 },
  revealMs: { type: Number, default: 520 },
});

const overlayRef = ref(null);

const iris = reactive({
  active: false,
  phase: "cover",
  x: 0,
  y: 0,
  r: 0,
  maxR: 0,
});

const irisStyle = computed(() => {
  if (!iris.active) return {};
  const { x, y, r, phase } = iris;
  if (phase === "cover") {
    const cp = `circle(${r}px at ${x}px ${y}px)`;
    return {
      backgroundColor: props.color,
      clipPath: cp,
      WebkitClipPath: cp,
    };
  }
  const h = Math.max(0, r);
  const mask = `radial-gradient(circle at ${x}px ${y}px, transparent ${h}px, black ${h + 1}px)`;
  return {
    backgroundColor: props.color,
    clipPath: "none",
    WebkitClipPath: "none",
    WebkitMaskImage: mask,
    maskImage: mask,
  };
});

function maxCoverRadiusPx(cx, cy, w, h) {
  const corners = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ];
  let m = 0;
  for (const [px, py] of corners) {
    const d = Math.hypot(px - cx, py - cy);
    if (d > m) m = d;
  }
  return m + 24;
}

/** 与 GSAP `ease: "expo.out"` 一致（圆圈半径属尺寸动画） */
function easeExpoOut(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function waitRaf(n = 2) {
  return new Promise((resolve) => {
    let left = n;
    function step() {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

function animateIrisR(from, to, durationMs) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    function tick(now) {
      const u = Math.min(1, (now - t0) / durationMs);
      const e = easeExpoOut(u);
      iris.r = from + (to - from) * e;
      if (u < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}

/**
 * @param {MouseEvent | PointerEvent | null | undefined} event
 * @param {{ onCovered?: () => void } | undefined} opts
 */
async function play(event, opts) {
  const overlayEl = overlayRef.value;
  if (!overlayEl) return;

  const rect = overlayEl.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const e = event && "clientX" in event ? event : null;
  const cx = e ? e.clientX - rect.left : w / 2;
  const cy = e ? e.clientY - rect.top : h / 2;

  iris.x = cx;
  iris.y = cy;
  iris.maxR = maxCoverRadiusPx(cx, cy, w, h);
  iris.phase = "cover";
  iris.r = 0;
  iris.active = true;

  overlayEl.style.zIndex = String(bumpOverlayZ());

  await nextTick();
  await animateIrisR(0, iris.maxR, props.coverMs);

  await opts?.onCovered?.();

  await nextTick();
  await waitRaf(2);

  // 第二阶段：镂空圆从中心扩大（相对 overlayRef 坐标）
  const rect2 = overlayEl.getBoundingClientRect();
  const w2 = rect2.width;
  const h2 = rect2.height;
  iris.x = w2 / 2;
  iris.y = h2 / 2;
  iris.maxR = maxCoverRadiusPx(iris.x, iris.y, w2, h2);
  iris.phase = "reveal";
  iris.r = 0;
  await animateIrisR(0, iris.maxR, props.revealMs);

  iris.active = false;
  overlayEl.style.zIndex = "";
}

defineExpose({ play });
</script>

<style scoped>
.iris-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>

