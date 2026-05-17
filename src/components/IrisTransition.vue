<template>
  <div
    ref="overlayRef"
    class="iris-overlay"
    :style="irisStyle"
    aria-hidden="true"
  />
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue";
import { attachLastPointerClientTracking, getLastPointerClientPoint } from "../game/lastPointerClient.js";
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

/** 视口坐标 → overlay 内像素 */
function clientPointToOverlayLocal(overlayEl, point) {
  const rect = overlayEl.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  if (w <= 0 || h <= 0) {
    return { x: w / 2, y: h / 2, w, h, xPct: 50, yPct: 50 };
  }
  const x = point.clientX - rect.left;
  const y = point.clientY - rect.top;
  return {
    x,
    y,
    w,
    h,
    xPct: (x / w) * 100,
    yPct: (y / h) * 100,
  };
}

function localFromPercent(w, h, xPct, yPct) {
  return { x: (xPct / 100) * w, y: (yPct / 100) * h };
}

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

/** @param {{ onCovered?: () => void } | undefined} opts */
function resolvePlayOpts(arg1, arg2) {
  if (arg2 && typeof arg2 === "object") return arg2;
  if (arg1 && typeof arg1 === "object" && "onCovered" in arg1) return arg1;
  return undefined;
}

/**
 * 圆心始终取播放瞬间的当前指针位置（见 lastPointerClient.js），忽略历史入参 event。
 * @param {unknown} [_ignored]
 * @param {{ onCovered?: () => void } | undefined} [opts]
 */
async function play(_ignored, opts) {
  const overlayEl = overlayRef.value;
  if (!overlayEl) return;

  const resolvedOpts = resolvePlayOpts(_ignored, opts);
  const coverLocal = clientPointToOverlayLocal(overlayEl, getLastPointerClientPoint());
  const originXPct = coverLocal.xPct;
  const originYPct = coverLocal.yPct;

  iris.x = coverLocal.x;
  iris.y = coverLocal.y;
  iris.maxR = maxCoverRadiusPx(coverLocal.x, coverLocal.y, coverLocal.w, coverLocal.h);
  iris.phase = "cover";
  iris.r = 0;
  iris.active = true;

  overlayEl.style.zIndex = String(bumpOverlayZ());

  await nextTick();
  await animateIrisR(0, iris.maxR, props.coverMs);

  await resolvedOpts?.onCovered?.();

  await nextTick();
  await waitRaf(2);

  // 第二阶段：镂空圆从同一圆心扩大（onCovered 后布局可能变化，用百分比还原圆心）
  const rect2 = overlayEl.getBoundingClientRect();
  const w2 = rect2.width;
  const h2 = rect2.height;
  const origin = localFromPercent(w2, h2, originXPct, originYPct);
  iris.x = origin.x;
  iris.y = origin.y;
  iris.maxR = maxCoverRadiusPx(origin.x, origin.y, w2, h2);
  iris.phase = "reveal";
  iris.r = 0;
  await animateIrisR(0, iris.maxR, props.revealMs);

  iris.active = false;
  overlayEl.style.zIndex = "";
}

let detachPointerTracking = () => {};

onMounted(() => {
  detachPointerTracking = attachLastPointerClientTracking();
});

onUnmounted(() => {
  detachPointerTracking();
  detachPointerTracking = () => {};
});

defineExpose({ play });
</script>

<style scoped>
.iris-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>

