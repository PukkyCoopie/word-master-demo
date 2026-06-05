<script setup>
/**
 * 材质性能实验页：10 格材质块（7 种材质各 1–2 个），显示 FPS / hub tick 统计。
 * 启用：构建时 VITE_MATERIAL_BENCH=1，或开发环境 ?materialBench=1
 */
import { computed, onMounted, onUnmounted, ref } from "vue";
import LetterTile from "../components/LetterTile.vue";
import { getMaterialTickerStats } from "../lib/reglMaterialTicker.js";
import { getMaterialBlitExperimentMode } from "../lib/reglMaterialBlitExperiment.js";
import { getMaterialBenchTileCount } from "./materialBenchTiles.js";
import {
  getMaterialRenderPipeline,
  getMaterialHubMaxHz,
  useMobileMaterialLowPower,
} from "../lib/reglMaterialPerf.js";
import { getMaterialProfilerReport } from "../lib/reglMaterialProfiler.js";
import { getTileMaterialBlockTitle } from "../game/gameConceptCopy.js";

/** 7 种材质各 1–2 个，共 10 格（固定分布便于对比） */
const BENCH_TILES = Object.freeze([
  { id: "b1", letter: "A", materialId: "gold", rarity: "rare" },
  { id: "b2", letter: "B", materialId: "steel", rarity: "epic" },
  { id: "b3", letter: "C", materialId: "steel", rarity: "common" },
  { id: "b4", letter: "D", materialId: "ice", rarity: "rare" },
  { id: "b5", letter: "E", materialId: "water", rarity: "common" },
  { id: "b6", letter: "F", materialId: "fire", rarity: "epic" },
  { id: "b7", letter: "G", materialId: "fire", rarity: "rare" },
  { id: "b8", letter: "H", materialId: "wildcard", rarity: "legendary" },
  { id: "b9", letter: "I", materialId: "lucky", rarity: "epic" },
  { id: "b10", letter: "J", materialId: "lucky", rarity: "rare" },
]);

const emit = defineEmits(["close"]);

const benchTileCount = ref(getMaterialBenchTileCount());
const benchTiles = computed(() => BENCH_TILES.slice(0, benchTileCount.value));

const displayFps = ref(0);
const frameMs = ref(0);
const rafProbeHz = ref(0);
const rafProbeIntervalMs = ref(0);
const hubTickHz = ref(0);
const hubRawCallbackHz = ref(0);
const hubScheduler = ref("raf");
const hubThrottledSkips = ref(0);
const activeHubs = ref(0);
const hubLastTickMs = ref(0);
const deviceDpr = ref(1);
const lowPowerMode = ref(false);
const renderPipeline = ref("blit");
const hubMaxHz = ref(60);
const canvasSamples = ref("—");
const profilerTickerMs = ref(0);
const profilerHubMs = ref(0);
const profilerDrawMs = ref(0);
const profilerBlitMs = ref(0);
/** @type {import("vue").Ref<Array<{ id: string, label: string, avgDrawMs: number, avgBlitMs: number, avgTotalMs: number, avgBlitCount: number, sharePct: number, texPx: number }>>} */
const profilerRows = ref([]);

let rafId = 0;
let frames = 0;
let windowStart = 0;
let lastFrameAt = 0;

/** 独立 RAF 探针：与 bench / hub 循环无关，用于判断 WebView 原生 RAF 频率 */
let probeRafId = 0;
let probeFrames = 0;
let probeWindowStart = 0;
let probeLastAt = 0;
let probeIntervalSum = 0;
let probeIntervalCount = 0;

function probeRafTick(now) {
  probeRafId = requestAnimationFrame(probeRafTick);
  if (probeLastAt > 0) {
    const dt = now - probeLastAt;
    probeIntervalSum += dt;
    probeIntervalCount += 1;
    rafProbeIntervalMs.value = Math.round(dt);
  }
  probeLastAt = now;
  if (!probeWindowStart) probeWindowStart = now;
  probeFrames += 1;
  const elapsed = now - probeWindowStart;
  if (elapsed >= 500) {
    rafProbeHz.value = Math.round((probeFrames * 1000) / elapsed);
    if (probeIntervalCount > 0) {
      rafProbeIntervalMs.value = Math.round(probeIntervalSum / probeIntervalCount);
    }
    probeFrames = 0;
    probeWindowStart = now;
    probeIntervalSum = 0;
    probeIntervalCount = 0;
  }
}

function sampleCanvases() {
  const nodes = document.querySelectorAll(".material-bench-tile canvas");
  if (!nodes.length) {
    canvasSamples.value = "—";
    return;
  }
  const parts = [];
  for (const c of nodes) {
    if (!(c instanceof HTMLCanvasElement)) continue;
    parts.push(`${c.width}×${c.height}`);
    if (parts.length >= 3) break;
  }
  canvasSamples.value = parts.join(", ");
}

function tick(now) {
  rafId = requestAnimationFrame(tick);
  if (!windowStart) windowStart = now;
  frames += 1;
  frameMs.value = lastFrameAt > 0 ? Math.round(now - lastFrameAt) : 0;
  lastFrameAt = now;

  const elapsed = now - windowStart;
  if (elapsed >= 500) {
    displayFps.value = Math.round((frames * 1000) / elapsed);
    frames = 0;
    windowStart = now;
    const hub = getMaterialTickerStats();
    hubTickHz.value = hub.hubTickHz;
    hubRawCallbackHz.value = hub.rawCallbackHz;
    hubScheduler.value = hub.scheduler;
    hubThrottledSkips.value = hub.throttledSkips;
    activeHubs.value = hub.activeHubs;
    hubLastTickMs.value = hub.lastTickMs;
    hubMaxHz.value = hub.maxHz;
    sampleCanvases();
    const profile = getMaterialProfilerReport();
    profilerTickerMs.value = profile.ticker.avgMs;
    profilerHubMs.value = profile.totals.hubMs;
    profilerDrawMs.value = profile.totals.drawMs;
    profilerBlitMs.value = profile.totals.blitMs;
    profilerRows.value = profile.materials.map((row) => ({
      id: row.id,
      label: getTileMaterialBlockTitle(row.id) ?? row.id,
      avgDrawMs: row.avgDrawMs,
      avgBlitMs: row.avgBlitMs,
      avgTotalMs: row.avgTotalMs,
      avgBlitCount: row.avgBlitCount,
      sharePct: row.sharePct,
      texPx: row.texPx,
    }));
    const payload = {
      uiFps: displayFps.value,
      rafProbeHz: rafProbeHz.value,
      rafProbeIntervalMs: rafProbeIntervalMs.value,
      hubTickHz: hub.hubTickHz,
      hubRawCallbackHz: hub.rawCallbackHz,
      hubScheduler: hub.scheduler,
      hubThrottledSkips: hub.throttledSkips,
      hubMaxHz: hub.maxHz,
      activeHubs: hub.activeHubs,
      hubTickIntervalMs: hub.lastTickMs,
      frameMs: frameMs.value,
      canvasSamples: canvasSamples.value,
      deviceDpr: deviceDpr.value,
      lowPowerMode: lowPowerMode.value,
      renderPipeline: renderPipeline.value,
      blitExperiment: getMaterialBlitExperimentMode(),
      benchTiles: benchTileCount.value,
      materialProfile: profile,
    };
    globalThis.__WM_MATERIAL_BENCH_STATS__ = payload;
    console.log("[material-bench]", JSON.stringify(payload));
  }
}

const materialSummary = computed(() => {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const t of benchTiles.value) {
    counts[t.materialId] = (counts[t.materialId] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([id, n]) => `${getTileMaterialBlockTitle(id) ?? id}×${n}`)
    .join(" · ");
});

/** @param {Event} ev */
function onBenchTileCountChange(ev) {
  const detail = /** @type {{ count?: number } | undefined} */ (ev?.detail);
  benchTileCount.value =
    typeof detail?.count === "number" && Number.isFinite(detail.count)
      ? Math.min(10, Math.max(1, Math.round(detail.count)))
      : getMaterialBenchTileCount();
}

onMounted(() => {
  deviceDpr.value = window.devicePixelRatio || 1;
  lowPowerMode.value = useMobileMaterialLowPower();
  renderPipeline.value = getMaterialRenderPipeline();
  hubMaxHz.value = getMaterialHubMaxHz();
  window.addEventListener("wm-bench-tile-count", onBenchTileCountChange);
  rafId = requestAnimationFrame(tick);
  probeRafId = requestAnimationFrame(probeRafTick);
  sampleCanvases();
});

onUnmounted(() => {
  window.removeEventListener("wm-bench-tile-count", onBenchTileCountChange);
  if (rafId) cancelAnimationFrame(rafId);
  if (probeRafId) cancelAnimationFrame(probeRafId);
});
</script>

<template>
  <div class="material-bench" role="dialog" aria-modal="true" aria-labelledby="material-bench-title">
    <div class="material-bench-panel">
      <header class="material-bench-header">
        <h1 id="material-bench-title" class="material-bench-title">
          材质性能实验（{{ benchTileCount }} 格）
        </h1>
        <button type="button" class="material-bench-close" @click="emit('close')">关闭</button>
      </header>

      <div class="material-bench-stats" aria-live="polite">
        <div class="material-bench-stat">
          <span class="material-bench-stat-label">界面 FPS（bench RAF）</span>
          <span class="material-bench-stat-value">{{ displayFps }}</span>
        </div>
        <div class="material-bench-stat">
          <span class="material-bench-stat-label">RAF 探针 Hz</span>
          <span class="material-bench-stat-value">{{ rafProbeHz }}</span>
        </div>
        <div class="material-bench-stat">
          <span class="material-bench-stat-label">RAF 探针间隔 ms</span>
          <span class="material-bench-stat-value">{{ rafProbeIntervalMs }}</span>
        </div>
        <div class="material-bench-stat">
          <span class="material-bench-stat-label">材质 hub Hz</span>
          <span class="material-bench-stat-value">{{ hubTickHz }} / {{ hubMaxHz }}</span>
        </div>
        <div class="material-bench-stat material-bench-stat--wide">
          <span class="material-bench-stat-label">hub 调度</span>
          <span class="material-bench-stat-value material-bench-stat-value--mono"
            >{{ hubScheduler }} · raw {{ hubRawCallbackHz }}Hz · skip {{ hubThrottledSkips }}</span
          >
        </div>
        <div class="material-bench-stat">
          <span class="material-bench-stat-label">活跃 hub</span>
          <span class="material-bench-stat-value">{{ activeHubs }}</span>
        </div>
        <div class="material-bench-stat">
          <span class="material-bench-stat-label">帧间隔 ms</span>
          <span class="material-bench-stat-value">{{ frameMs }}</span>
        </div>
        <div class="material-bench-stat material-bench-stat--wide">
          <span class="material-bench-stat-label">canvas 缓冲（抽样）</span>
          <span class="material-bench-stat-value material-bench-stat-value--mono">{{ canvasSamples }}</span>
        </div>
        <div class="material-bench-stat material-bench-stat--wide">
          <span class="material-bench-stat-label">设备 DPR（未用于材质）</span>
          <span class="material-bench-stat-value">{{ deviceDpr }}</span>
        </div>
        <div class="material-bench-stat">
          <span class="material-bench-stat-label">hub 间隔 ms</span>
          <span class="material-bench-stat-value">{{ hubLastTickMs }}</span>
        </div>
        <div class="material-bench-stat material-bench-stat--wide">
          <span class="material-bench-stat-label">移动端低功耗动态</span>
          <span class="material-bench-stat-value">{{ lowPowerMode ? "是" : "否" }}</span>
        </div>
        <div class="material-bench-stat material-bench-stat--wide">
          <span class="material-bench-stat-label">材质渲染管线</span>
          <span class="material-bench-stat-value material-bench-stat-value--mono">{{ renderPipeline }}</span>
        </div>
      </div>

      <div v-if="profilerRows.length" class="material-bench-profile" aria-label="材质耗时剖析">
        <p class="material-bench-profile-title">
          剖析（每 tick 均值）：ticker {{ profilerTickerMs }}ms · hub 合计 {{ profilerHubMs }}ms（draw
          {{ profilerDrawMs }} + blit {{ profilerBlitMs }}）
        </p>
        <table class="material-bench-profile-table">
          <thead>
            <tr>
              <th>材质</th>
              <th>draw</th>
              <th>blit</th>
              <th>合计</th>
              <th>占比</th>
              <th>blit×</th>
              <th>tex</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in profilerRows" :key="row.id">
              <td>{{ row.label }}</td>
              <td>{{ row.avgDrawMs }}</td>
              <td>{{ row.avgBlitMs }}</td>
              <td>{{ row.avgTotalMs }}</td>
              <td>{{ row.sharePct }}%</td>
              <td>{{ row.avgBlitCount }}</td>
              <td>{{ row.texPx }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="material-bench-desc">{{ materialSummary }}</p>

      <div class="material-bench-grid" :aria-label="`${benchTileCount} 个材质字母块`">
        <LetterTile
          v-for="tile in benchTiles"
          :key="tile.id"
          variant="grid"
          class="material-bench-tile grid-tile"
          :letter="tile.letter"
          :rarity="tile.rarity"
          :material-id="tile.materialId"
          :material-animate="true"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.material-bench {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(18, 16, 14, 0.92);
  padding: calc(16 * var(--rpx));
  box-sizing: border-box;
}

.material-bench-panel {
  width: min(100%, calc(700 * var(--rpx)));
  max-height: 100%;
  overflow: auto;
  background: #2a2622;
  border-radius: calc(12 * var(--rpx));
  border: calc(1 * var(--rpx)) solid rgba(255, 255, 255, 0.1);
  padding: calc(20 * var(--rpx));
  box-sizing: border-box;
}

.material-bench-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(12 * var(--rpx));
  margin-bottom: calc(16 * var(--rpx));
}

.material-bench-title {
  margin: 0;
  font-size: calc(32 * var(--rpx));
  font-weight: 600;
  color: rgba(252, 248, 242, 0.96);
}

.material-bench-close {
  flex: 0 0 auto;
  padding: calc(10 * var(--rpx)) calc(18 * var(--rpx));
  border: none;
  border-radius: calc(8 * var(--rpx));
  background: rgba(255, 255, 255, 0.12);
  color: rgba(252, 248, 242, 0.9);
  font-size: calc(24 * var(--rpx));
}

.material-bench-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: calc(10 * var(--rpx));
  margin-bottom: calc(14 * var(--rpx));
}

.material-bench-stat {
  padding: calc(12 * var(--rpx));
  border-radius: calc(8 * var(--rpx));
  background: rgba(0, 0, 0, 0.22);
}

.material-bench-stat--wide {
  grid-column: 1 / -1;
}

.material-bench-stat-label {
  display: block;
  font-size: calc(20 * var(--rpx));
  color: rgba(248, 244, 238, 0.55);
  margin-bottom: calc(4 * var(--rpx));
}

.material-bench-stat-value {
  font-size: calc(28 * var(--rpx));
  font-weight: 600;
  color: rgba(252, 248, 242, 0.95);
}

.material-bench-stat-value--mono {
  font-size: calc(22 * var(--rpx));
  font-weight: 500;
  font-family: ui-monospace, monospace;
}

.material-bench-profile {
  margin-bottom: calc(14 * var(--rpx));
  padding: calc(12 * var(--rpx));
  border-radius: calc(8 * var(--rpx));
  background: rgba(0, 0, 0, 0.28);
  overflow-x: auto;
}

.material-bench-profile-title {
  margin: 0 0 calc(10 * var(--rpx));
  font-size: calc(20 * var(--rpx));
  color: rgba(248, 244, 238, 0.78);
  line-height: 1.4;
}

.material-bench-profile-table {
  width: 100%;
  border-collapse: collapse;
  font-size: calc(18 * var(--rpx));
  color: rgba(252, 248, 242, 0.92);
}

.material-bench-profile-table th,
.material-bench-profile-table td {
  padding: calc(6 * var(--rpx)) calc(8 * var(--rpx));
  text-align: right;
  border-bottom: calc(1 * var(--rpx)) solid rgba(255, 255, 255, 0.08);
}

.material-bench-profile-table th:first-child,
.material-bench-profile-table td:first-child {
  text-align: left;
}

.material-bench-desc {
  margin: 0 0 calc(16 * var(--rpx));
  font-size: calc(22 * var(--rpx));
  color: rgba(248, 244, 238, 0.72);
  line-height: 1.4;
}

.material-bench-grid {
  display: grid;
  grid-template-columns: repeat(5, var(--letter-grid-cell-size));
  gap: var(--letter-grid-gap);
  justify-content: center;
}

.material-bench-tile {
  width: var(--letter-grid-cell-size);
  height: var(--letter-grid-cell-size);
}
</style>
