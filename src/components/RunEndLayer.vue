<template>
  <Transition name="run-end-layer" :css="true">
    <div
      v-if="open"
      class="run-end-layer portal-overlay-fill"
      :class="outcome === 'win' ? 'run-end-layer--win' : 'run-end-layer--fail'"
      :style="portalStackStyle"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="run-end-card">
        <h2 :id="titleId" class="run-end-title">{{ titleText }}</h2>
        <p v-if="subtitleText" class="run-end-sub">{{ subtitleText }}</p>

        <div v-if="runSeedDisplay" class="run-end-seed-bar">
          <div class="run-end-seed-main">
            <span class="run-end-seed-label">本局种子</span>
            <span class="run-end-seed-value">{{ runSeedDisplay }}</span>
          </div>
          <button
            type="button"
            class="run-end-seed-copy"
            :title="seedCopyDone ? '已复制' : '复制种子'"
            :aria-label="seedCopyDone ? '已复制' : '复制本局种子'"
            @click="copyRunSeed"
          >
            <i :class="seedCopyDone ? 'ri-check-line' : 'ri-file-copy-line'" aria-hidden="true"></i>
          </button>
        </div>

        <div class="run-end-stats-list">
          <div class="run-end-stat-row run-end-stat-row--hero">
            <div class="run-end-stat-card">
              <span class="run-end-stat-label">抵达关卡</span>
              <span class="run-end-stat-value">{{ reachedLevelId || "—" }}</span>
            </div>
            <div class="run-end-stat-card">
              <span class="run-end-stat-label">最佳单词</span>
              <span class="run-end-stat-value">{{ bestWordValue }}</span>
            </div>
          </div>

          <div
            v-for="row in statsRows"
            :key="row.label"
            class="run-end-stat-card"
          >
            <span class="run-end-stat-label">{{ row.label }}</span>
            <span class="run-end-stat-value">{{ row.value }}</span>
          </div>

          <div class="run-end-stat-card run-end-stat-card--discoveries">
            <span class="run-end-stat-label">新发现</span>
            <RunEndDiscoveryStrip
              v-if="discoveryItems.length"
              class="run-end-stat-value run-end-stat-value--discoveries"
              :items="discoveryItems"
              @select="$emit('select-discovery', $event)"
            />
            <span v-else class="run-end-stat-value">—</span>
          </div>
        </div>

        <div class="run-end-actions">
          <button
            v-if="outcome === 'win' && showEndless"
            type="button"
            class="run-end-btn run-end-btn--endless"
            @click="$emit('endless')"
          >
            无尽模式
          </button>
          <button type="button" class="run-end-btn run-end-btn--primary" @click="$emit('retry')">
            再来一局
          </button>
          <button type="button" class="run-end-btn run-end-btn--secondary" @click="$emit('main-menu')">
            回到主菜单
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import RunEndDiscoveryStrip from "./RunEndDiscoveryStrip.vue";
import { copyTextToClipboard } from "../utils/copyTextToClipboard.js";

const props = defineProps({
  open: { type: Boolean, default: false },
  /** @type {'fail' | 'win'} */
  outcome: { type: String, default: "fail" },
  showEndless: { type: Boolean, default: true },
  portalStackStyle: { type: Object, default: () => ({}) },
  runSeedDisplay: { type: String, default: "" },
  reachedLevelId: { type: String, default: "" },
  bestWordValue: { type: String, default: "—" },
  /** @type {{ label: string, value: string }[]} */
  statsRows: { type: Array, default: () => [] },
  /** @type {import('../game/runCollectionDiscoveriesDisplay.js').RunDiscoveryDisplayItem[]} */
  discoveryItems: { type: Array, default: () => [] },
});

defineEmits(["retry", "main-menu", "endless", "select-discovery"]);

const titleId = "run-end-title";
const seedCopyDone = ref(false);
/** @type {ReturnType<typeof setTimeout> | null} */
let seedCopyResetTimer = null;

const titleText = computed(() => (props.outcome === "win" ? "通关！" : "游戏结束"));
const subtitleText = computed(() => {
  if (props.outcome === "win") return "";
  return "出牌次数已用尽，未能达到本关目标分";
});

async function copyRunSeed() {
  const ok = await copyTextToClipboard(props.runSeedDisplay);
  if (!ok) return;
  seedCopyDone.value = true;
  if (seedCopyResetTimer) clearTimeout(seedCopyResetTimer);
  seedCopyResetTimer = setTimeout(() => {
    seedCopyDone.value = false;
    seedCopyResetTimer = null;
  }, 1600);
}

onBeforeUnmount(() => {
  if (seedCopyResetTimer) clearTimeout(seedCopyResetTimer);
});
</script>

<style scoped>
.run-end-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(32 * var(--rpx)) calc(24 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
  box-sizing: border-box;
}

.run-end-layer--fail {
  background: rgba(196, 74, 74, 0.88);
}

.run-end-layer--win {
  background: rgba(142, 204, 142, 0.88);
}

.run-end-card {
  width: 100%;
  max-width: calc(680 * var(--rpx));
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(32 * var(--rpx)) calc(26 * var(--rpx)) calc(28 * var(--rpx));
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.run-end-title {
  margin: 0 0 calc(18 * var(--rpx));
  font-size: calc(40 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  text-align: center;
}

.run-end-sub {
  margin: 0 0 calc(18 * var(--rpx));
  font-size: calc(24 * var(--rpx));
  font-weight: 600;
  color: var(--text-soft);
  text-align: center;
  line-height: 1.45;
}

.run-end-seed-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: calc(10 * var(--rpx));
  width: 100%;
  box-sizing: border-box;
  margin: 0 0 calc(18 * var(--rpx));
  padding: calc(12 * var(--rpx)) calc(14 * var(--rpx));
  border-radius: calc(10 * var(--rpx));
  background: #eee4da;
}

.run-end-seed-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: calc(6 * var(--rpx));
  text-align: left;
}

.run-end-seed-label {
  font-size: calc(22 * var(--rpx));
  font-weight: 700;
  color: #8f7a66;
}

.run-end-seed-value {
  font-size: calc(30 * var(--rpx));
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #3c3a32;
  word-break: break-all;
  line-height: 1.2;
}

.run-end-seed-copy {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(50 * var(--rpx));
  height: calc(50 * var(--rpx));
  border: none;
  border-radius: calc(8 * var(--rpx));
  background: rgba(0, 0, 0, 0.06);
  color: #776e65;
  font-size: calc(26 * var(--rpx));
  cursor: pointer;
}

.run-end-seed-copy:hover {
  filter: brightness(1.04);
}

.run-end-seed-copy:active {
  filter: brightness(0.94);
}

.run-end-stats-list {
  margin: 0 0 calc(22 * var(--rpx));
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(10 * var(--rpx));
}

.run-end-stat-row--hero {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: calc(10 * var(--rpx));
  min-width: 0;
}

.run-end-stat-card {
  min-width: 0;
  padding: calc(14 * var(--rpx)) calc(16 * var(--rpx));
  background: rgba(0, 0, 0, 0.04);
  border-radius: calc(10 * var(--rpx));
  box-sizing: border-box;
}

.run-end-stat-card--discoveries {
  grid-column: 1 / -1;
}

.run-end-stat-label {
  display: block;
  margin: 0 0 calc(4 * var(--rpx));
  font-size: calc(24 * var(--rpx));
  font-weight: 600;
  color: var(--text-soft);
}

.run-end-stat-value {
  display: block;
  font-size: calc(28 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
  line-height: 1.35;
  word-break: break-word;
}

.run-end-stat-value--discoveries {
  font-size: inherit;
  font-weight: inherit;
  margin-top: calc(4 * var(--rpx));
  min-height: calc(var(--shop-shelf-cell-size) * 0.5);
  flex-shrink: 0;
}

.run-end-actions {
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
}

.run-end-btn {
  width: 100%;
  border: none;
  border-radius: var(--radius);
  padding: calc(16 * var(--rpx)) calc(20 * var(--rpx));
  font-family: inherit;
  font-size: calc(28 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow);
  color: #f9f6f2;
}

.run-end-btn--primary {
  background: #5a8fb8;
}

.run-end-btn--endless {
  background: #6a9e5c;
}

.run-end-btn--secondary {
  background: var(--card, #eee4da);
  color: var(--text-dark, #3c3a32);
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.1);
  box-shadow: none;
}

.run-end-btn:hover {
  filter: brightness(1.05);
}

.run-end-btn:active {
  filter: brightness(0.92);
}

.run-end-layer-enter-active,
.run-end-layer-leave-active {
  transition: opacity 0.28s var(--ease-expo-out, ease-out);
}

.run-end-layer-enter-active .run-end-card,
.run-end-layer-leave-active .run-end-card {
  transition:
    opacity 0.32s var(--ease-expo-out, ease-out),
    transform 0.32s var(--ease-expo-out, ease-out);
}

.run-end-layer-enter-from,
.run-end-layer-leave-to {
  opacity: 0;
}

.run-end-layer-enter-from .run-end-card,
.run-end-layer-leave-to .run-end-card {
  opacity: 0;
  transform: scale(0.94) translateY(calc(12 * var(--rpx)));
}
</style>
