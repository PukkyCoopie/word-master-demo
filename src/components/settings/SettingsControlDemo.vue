<template>
  <div
    ref="stageRef"
    class="settings-control-demo"
    :class="[`settings-control-demo--${variant}`, { 'settings-control-demo--reduced': reducedMotion }]"
    aria-hidden="true"
  >
    <div class="settings-control-demo__stage">
      <div class="settings-control-demo__board">
        <div class="settings-control-demo__word">
          <div
            v-for="i in WORD_SLOT_COUNT"
            :key="`w-${i}`"
            :ref="(el) => setWordSlotRef(el, i - 1)"
            class="settings-control-demo__slot"
          >
            <div
              v-if="wordVisible[i - 1]"
              class="settings-control-demo__tile settings-control-demo__tile--selected"
              :class="{ 'settings-control-demo__tile--marked': wordMarked[i - 1] }"
            />
          </div>
        </div>

        <div class="settings-control-demo__grid">
          <div
            v-for="i in GRID_CELL_COUNT"
            :key="`g-${i}`"
            :ref="(el) => setGridCellRef(el, i - 1)"
            class="settings-control-demo__cell"
            :class="{ 'settings-control-demo__cell--hole': shouldShowCellHole(i - 1) }"
          >
            <div
              v-if="gridVisible[i - 1]"
              class="settings-control-demo__tile"
              :class="{
                'settings-control-demo__tile--marked': gridMarked[i - 1],
              }"
            />
          </div>
        </div>
      </div>

      <div ref="flyLayerRef" class="settings-control-demo__fly-layer">
        <div
          v-for="flyer in flyers"
          :key="flyer.id"
          class="settings-control-demo__tile settings-control-demo__flyer"
          :class="{
            'settings-control-demo__tile--selected': flyer.selected,
            'settings-control-demo__tile--marked': flyer.marked,
          }"
          :style="{
            left: `${flyer.x}px`,
            top: `${flyer.y}px`,
            opacity: flyer.opacity,
          }"
        />
      </div>

      <div class="settings-control-demo__toolbar">
        <button
          v-if="showMarkBtn"
          type="button"
          class="settings-control-demo__btn settings-control-demo__btn--mark"
          :class="{ 'settings-control-demo__btn--press': rippleMark }"
          tabindex="-1"
        >
          <span
            class="settings-control-demo__ripple settings-control-demo__ripple--mark"
            :class="{ 'settings-control-demo__ripple--active': rippleMark }"
          />
          <span class="settings-control-demo__btn-icon-stack">
            <i class="ri-bookmark-line settings-control-demo__btn-main-icon" aria-hidden="true" />
            <i
              v-if="showMarkSendArrow"
              class="ri-arrow-up-s-line settings-control-demo__btn-sub-icon"
              aria-hidden="true"
            />
          </span>
        </button>
        <button
          v-if="showSwapBtn"
          type="button"
          class="settings-control-demo__btn settings-control-demo__btn--swap"
          :class="{ 'settings-control-demo__btn--press': rippleSwap }"
          tabindex="-1"
        >
          <span
            class="settings-control-demo__ripple settings-control-demo__ripple--swap"
            :class="{ 'settings-control-demo__ripple--active': rippleSwap }"
          />
          <i class="ri-arrow-up-down-line" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import gsap from "gsap";
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import { EASE_TRANSFORM } from "../../constants.js";
import { suspendGamePauseGsapFreeze, resumeGamePauseGsapFreeze } from "../../game/gamePause.js";
import { getAnimationSpeedScale, shouldSkipDecorativeMotion } from "../../settings/animationSpeed.js";
import { gameSettings } from "../../settings/gameSettings.js";

const props = defineProps({
  /** @type {import('vue').PropType<'mark' | 'swap' | 'markOnSwapSwap' | 'markOnSwapMark'>} */
  variant: { type: String, required: true },
});

const WORD_SLOT_COUNT = 3;
const GRID_CELL_COUNT = 12;
const HOLE_INDICES = [0, 1, 2];
const PICK_INDICES = [8, 9, 10];
const LOOP_PAUSE = 0.7;
/** 与 GamePanel 拼词飞入/飞回一致 */
const FLY_DUR = 0.25;
const FLY_STAGGER = 0;

/** 演示 GSAP 不受设置页「动画速度」全局 timeScale 影响 */
function getDemoAnimTimeScale() {
  return 1 / getAnimationSpeedScale();
}

/** @param {gsap.core.Timeline | null | undefined} tl */
function applyDemoTimeScale(tl) {
  if (!tl) return tl;
  tl.timeScale(getDemoAnimTimeScale());
  return tl;
}

const stageRef = ref(null);
const flyLayerRef = ref(null);
/** @type {(HTMLElement | null)[]} */
const wordSlotEls = [];
/** @type {(HTMLElement | null)[]} */
const gridCellEls = [];

/** @param {unknown} el @param {number} ix */
function setWordSlotRef(el, ix) {
  wordSlotEls[ix] = el instanceof HTMLElement ? el : null;
}

/** @param {unknown} el @param {number} ix */
function setGridCellRef(el, ix) {
  gridCellEls[ix] = el instanceof HTMLElement ? el : null;
}

const reducedMotion = computed(() => shouldSkipDecorativeMotion());

const showMarkBtn = computed(
  () => props.variant === "mark" || props.variant === "markOnSwapMark",
);

/** 标记键「快速选入拼词」演示：标记键右下角显示上箭头 */
const showMarkSendArrow = computed(() => props.variant === "markOnSwapMark");
const showSwapBtn = computed(
  () => props.variant === "swap" || props.variant === "markOnSwapSwap",
);

const isSwapDemo = computed(
  () => props.variant === "swap" || props.variant === "markOnSwapSwap",
);

/** @type {import('vue').Ref<boolean[]>} */
const wordVisible = ref([true, true, true]);
/** @type {import('vue').Ref<boolean[]>} */
const wordMarked = ref([false, false, false]);
/** @type {import('vue').Ref<boolean[]>} */
const gridVisible = ref(initGridVisible());
/** @type {import('vue').Ref<boolean[]>} */
const gridMarked = ref(Array(GRID_CELL_COUNT).fill(false));

/** @type {import('vue').ShallowRef<{ id: number; x: number; y: number; opacity: number; selected?: boolean; marked?: boolean }[]>} */
const flyers = shallowRef([]);

const rippleMark = ref(false);
const rippleSwap = ref(false);

/** @type {gsap.core.Timeline | null} */
let mainTl = null;
let flyerId = 0;
/** 用于 timeline 内可靠延时（勿用 tl.to({}, { duration })） */
const pauseStub = { v: 0 };
let pauseTick = 0;

/** @param {gsap.core.Timeline} tl @param {number} seconds */
function delay(tl, seconds) {
  pauseTick += 1;
  tl.to(pauseStub, { v: pauseTick, duration: seconds, ease: "none" });
}

function initGridVisible() {
  const vis = Array(GRID_CELL_COUNT).fill(true);
  for (const ix of HOLE_INDICES) vis[ix] = false;
  return vis;
}

/** @param {number} ix */
function shouldShowCellHole(ix) {
  if (gridVisible.value[ix]) return false;
  if (HOLE_INDICES.includes(ix)) return true;
  if (isSwapDemo.value && PICK_INDICES.includes(ix)) return true;
  return false;
}

function resetVisualState() {
  wordVisible.value = [true, true, true];
  wordMarked.value = [false, false, false];
  gridVisible.value = initGridVisible();
  gridMarked.value = Array(GRID_CELL_COUNT).fill(false);
  flyers.value = [];
  rippleMark.value = false;
  rippleSwap.value = false;
}

function touchGridVisible() {
  gridVisible.value = [...gridVisible.value];
}

function touchGridMarked() {
  gridMarked.value = [...gridMarked.value];
}

function resetMarkOnSwapMarkState() {
  wordVisible.value = [false, false, false];
  wordMarked.value = [false, false, false];
  const vis = initGridVisible();
  const marks = Array(GRID_CELL_COUNT).fill(false);
  for (const ix of HOLE_INDICES) {
    vis[ix] = true;
    marks[ix] = true;
  }
  gridVisible.value = vis;
  gridMarked.value = marks;
  flyers.value = [];
  rippleMark.value = false;
  rippleSwap.value = false;
}

/**
 * @param {HTMLElement} el
 * @param {HTMLElement} parent
 */
function centerIn(el, parent) {
  const a = el.getBoundingClientRect();
  const p = parent.getBoundingClientRect();
  return {
    x: a.left + a.width / 2 - p.left - a.width / 2,
    y: a.top + a.height / 2 - p.top - a.height / 2,
  };
}

function pulseRipple(kind) {
  if (kind === "mark") {
    rippleMark.value = true;
    window.setTimeout(() => {
      rippleMark.value = false;
    }, 520);
    return;
  }
  rippleSwap.value = true;
  window.setTimeout(() => {
    rippleSwap.value = false;
  }, 520);
}

/** @type {{ x: number; y: number }[]} */
let cachedWordSlotPos = [];
/** @type {{ x: number; y: number }[]} */
let cachedGridCellPos = [];

/** @param {number} ix */
function captureWordSlotPos(ix) {
  const layer = flyLayerRef.value;
  const slot = wordSlotEls[ix];
  if (!layer || !slot) return { x: 0, y: 0 };
  const tile = slot.querySelector(".settings-control-demo__tile");
  const el = tile instanceof HTMLElement ? tile : slot;
  return centerIn(el, layer);
}

/** @param {number} ix */
function captureGridCellPos(ix) {
  const layer = flyLayerRef.value;
  const cell = gridCellEls[ix];
  if (!layer || !cell) return { x: 0, y: 0 };
  const tile = cell.querySelector(".settings-control-demo__tile");
  const el = tile instanceof HTMLElement ? tile : cell;
  return centerIn(el, layer);
}

function cacheFlyAnchors() {
  cachedWordSlotPos = [0, 1, 2].map(captureWordSlotPos);
  cachedGridCellPos = Array.from({ length: GRID_CELL_COUNT }, (_, i) => captureGridCellPos(i));
}

/**
 * @param {{ start: { x: number; y: number }; end: { x: number; y: number }; selected?: boolean; marked?: boolean }[]} pairs
 * @param {{ duration?: number }} [opts]
 */
function playFlyBatch(pairs, opts = {}) {
  const batch = gsap.timeline();
  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i];
    const inner = buildFlyPosToPosInner(p.start, p.end, {
      ...opts,
      selected: p.selected ?? true,
      marked: p.marked ?? false,
    });
    if (inner) batch.add(inner, i * FLY_STAGGER);
  }
  applyDemoTimeScale(batch);
  batch.play();
  return batch;
}

/** @param {{ x: number; y: number }} start @param {{ x: number; y: number }} end @param {{ selected?: boolean; marked?: boolean; duration?: number }} [opts] @returns {gsap.core.Timeline | null} */
function buildFlyPosToPosInner(start, end, opts = {}) {
  const layer = flyLayerRef.value;
  if (!layer) return null;

  const id = ++flyerId;
  const pos = { x: start.x, y: start.y, opacity: 1 };
  const dur = opts.duration ?? FLY_DUR;

  flyers.value = [
    ...flyers.value,
    {
      id,
      x: pos.x,
      y: pos.y,
      opacity: pos.opacity,
      selected: opts.selected ?? true,
      marked: opts.marked ?? false,
    },
  ];

  const inner = gsap.timeline();
  inner.to(pos, {
    duration: dur,
    x: end.x,
    y: end.y,
    ease: EASE_TRANSFORM,
    onUpdate: () => syncFlyer(id, pos),
  });
  inner.call(() => {
    flyers.value = flyers.value.filter((f) => f.id !== id);
  });
  return inner;
}

function buildSwapFlyOutPairs(marked = false) {
  return [0, 1, 2].map((slot) => ({
    start: cachedWordSlotPos[slot],
    end: cachedGridCellPos[HOLE_INDICES[slot]],
    selected: true,
    marked,
  }));
}

function buildSwapFlyInPairs() {
  return [0, 1, 2].map((slot) => ({
    start: cachedGridCellPos[PICK_INDICES[slot]],
    end: cachedWordSlotPos[slot],
    selected: true,
    marked: false,
  }));
}

function flyBatchDuration(dur = FLY_DUR) {
  return FLY_STAGGER * (WORD_SLOT_COUNT - 1) + dur;
}

function appendSwapFlyOutPhase(tl, { marked = false } = {}) {
  tl.call(() => {
    cacheFlyAnchors();
    wordVisible.value = [false, false, false];
    playFlyBatch(buildSwapFlyOutPairs(marked));
  });
  delay(tl, flyBatchDuration());
}

function appendSwapFlyInPhase(tl) {
  delay(tl, 0.04);
  tl.call(() => {
    for (const ix of PICK_INDICES) {
      gridVisible.value[ix] = false;
    }
    touchGridVisible();
    playFlyBatch(buildSwapFlyInPairs());
  });
  delay(tl, flyBatchDuration());
  tl.call(() => {
    wordVisible.value = [true, true, true];
  });
}

function afterSwapFlyOutGridUpdate(tl, { marked = false } = {}) {
  tl.call(() => {
    for (let i = 0; i < WORD_SLOT_COUNT; i++) {
      gridVisible.value[HOLE_INDICES[i]] = true;
      gridMarked.value[HOLE_INDICES[i]] = marked;
    }
    touchGridVisible();
    touchGridMarked();
  });
}

/** @param {number} id @param {{ x: number; y: number; opacity: number }} pos */
function syncFlyer(id, pos) {
  const list = flyers.value;
  const ix = list.findIndex((f) => f.id === id);
  if (ix < 0) return;
  const next = list.slice();
  next[ix] = { ...next[ix], x: pos.x, y: pos.y, opacity: pos.opacity };
  flyers.value = next;
}

function appendMarkFlyToWordPhase(tl) {
  tl.call(() => {
    cacheFlyAnchors();
    for (const ix of HOLE_INDICES) {
      gridVisible.value[ix] = false;
    }
    touchGridVisible();
    const wordEnds = [0, 1, 2].map(captureWordSlotPos);
    playFlyBatch(
      HOLE_INDICES.map((cell, slot) => ({
        start: cachedGridCellPos[cell],
        end: wordEnds[slot],
        selected: true,
        marked: true,
      })),
    );
  });
  delay(tl, flyBatchDuration());
  tl.call(() => {
    wordVisible.value = [true, true, true];
    wordMarked.value = [true, true, true];
  });
}

function buildMarkTimeline() {
  const tl = gsap.timeline({ repeat: -1, repeatDelay: LOOP_PAUSE });
  tl.call(() => resetVisualState());
  delay(tl, 0.75);
  tl.call(() => pulseRipple("mark"));
  delay(tl, 0.12);
  tl.call(() => {
    wordMarked.value = [true, true, true];
  });
  delay(tl, 1.35);
  tl.call(() => {
    wordMarked.value = [false, false, false];
  });
  delay(tl, 0.2);
  return applyDemoTimeScale(tl);
}

function buildSwapTimeline() {
  const tl = gsap.timeline({ repeat: -1, repeatDelay: LOOP_PAUSE });
  tl.call(() => resetVisualState());
  delay(tl, 0.75);
  tl.call(() => pulseRipple("swap"));
  delay(tl, 0.1);

  appendSwapFlyOutPhase(tl);
  afterSwapFlyOutGridUpdate(tl);
  appendSwapFlyInPhase(tl);

  delay(tl, 1.1);
  return applyDemoTimeScale(tl);
}

function buildMarkOnSwapSwapTimeline() {
  const tl = gsap.timeline({ repeat: -1, repeatDelay: LOOP_PAUSE });
  tl.call(() => resetVisualState());
  delay(tl, 0.75);
  tl.call(() => pulseRipple("swap"));
  delay(tl, 0.1);

  appendSwapFlyOutPhase(tl, { marked: true });
  afterSwapFlyOutGridUpdate(tl, { marked: true });
  appendSwapFlyInPhase(tl);

  delay(tl, 1.1);
  return applyDemoTimeScale(tl);
}

function buildMarkOnSwapMarkTimeline() {
  const tl = gsap.timeline({ repeat: -1, repeatDelay: LOOP_PAUSE });
  tl.call(() => resetMarkOnSwapMarkState());
  delay(tl, 0.8);
  tl.call(() => pulseRipple("mark"));
  delay(tl, 0.12);

  appendMarkFlyToWordPhase(tl);

  delay(tl, 1.2);
  return applyDemoTimeScale(tl);
}

function applyReducedStatic() {
  resetVisualState();
  if (props.variant === "mark") {
    wordMarked.value = [true, true, true];
    return;
  }
  if (props.variant === "swap") {
    wordVisible.value = [true, true, true];
    return;
  }
  if (props.variant === "markOnSwapSwap") {
    for (const ix of HOLE_INDICES) {
      gridVisible.value[ix] = true;
      gridMarked.value[ix] = true;
    }
    wordVisible.value = [true, true, true];
    return;
  }
  if (props.variant === "markOnSwapMark") {
    resetMarkOnSwapMarkState();
    wordVisible.value = [true, true, true];
    wordMarked.value = [true, true, true];
  }
}

function rebuildTimeline() {
  mainTl?.kill();
  mainTl = null;
  if (!stageRef.value) return;

  if (reducedMotion.value) {
    applyReducedStatic();
    return;
  }

  if (props.variant === "mark") mainTl = buildMarkTimeline();
  else if (props.variant === "swap") mainTl = buildSwapTimeline();
  else if (props.variant === "markOnSwapSwap") mainTl = buildMarkOnSwapSwapTimeline();
  else if (props.variant === "markOnSwapMark") mainTl = buildMarkOnSwapMarkTimeline();

  mainTl?.play(0);
}

function syncDemoTimeScale() {
  if (!mainTl || reducedMotion.value) return;
  applyDemoTimeScale(mainTl);
}

function scheduleRebuild() {
  nextTick(() => {
    requestAnimationFrame(() => rebuildTimeline());
  });
}

let gsapFreezeDepth = 0;

function enterDemoGsap() {
  gsapFreezeDepth += 1;
  if (gsapFreezeDepth === 1) suspendGamePauseGsapFreeze();
}

function exitDemoGsap() {
  if (gsapFreezeDepth <= 0) return;
  gsapFreezeDepth -= 1;
  if (gsapFreezeDepth === 0) resumeGamePauseGsapFreeze();
}

onMounted(() => {
  enterDemoGsap();
  scheduleRebuild();
});

onUnmounted(() => {
  mainTl?.kill();
  mainTl = null;
  exitDemoGsap();
});

watch(
  () => [props.variant, reducedMotion.value],
  () => {
    scheduleRebuild();
  },
);

watch(
  () => gameSettings.animationSpeedTier,
  () => {
    syncDemoTimeScale();
  },
);
</script>

<style scoped>
.settings-control-demo {
  --scd-tile: calc(56 * var(--rpx));
  --scd-gap: calc(5 * var(--rpx));
  --scd-word-gap: calc(10 * var(--rpx));
  --scd-mark: #5b9bd5;
  --scd-swap: #9b7bb8;
  --scd-color-transition: 0.28s ease;
  --scd-mark-size: calc(18 * var(--rpx));

  width: 100%;
  aspect-ratio: 1 / 1;
  box-sizing: border-box;
}

.settings-control-demo__stage {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: calc(16 * var(--rpx)) calc(16 * var(--rpx)) calc(14 * var(--rpx));
  border-radius: calc(10 * var(--rpx));
  background: #d8cfc4;
  box-sizing: border-box;
  overflow: hidden;
}

.settings-control-demo__board {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
  gap: var(--scd-word-gap);
}

.settings-control-demo__word {
  display: flex;
  justify-content: center;
  gap: var(--scd-gap);
}

.settings-control-demo__grid {
  display: grid;
  grid-template-columns: repeat(4, var(--scd-tile));
  gap: var(--scd-gap);
}

.settings-control-demo__slot,
.settings-control-demo__cell {
  position: relative;
  width: var(--scd-tile);
  height: var(--scd-tile);
  border-radius: calc(7 * var(--rpx));
  box-sizing: border-box;
  transition:
    background-color var(--scd-color-transition),
    box-shadow var(--scd-color-transition);
}

.settings-control-demo__cell--hole {
  background: rgba(236, 228, 218, 0.45);
  box-shadow: inset 0 0 0 calc(2 * var(--rpx)) rgba(236, 228, 218, 0.55);
}

.settings-control-demo__tile {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: calc(7 * var(--rpx));
  background: #ece4da;
  box-shadow: inset 0 calc(-2 * var(--rpx)) 0 rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
  overflow: hidden;
  transition:
    background-color var(--scd-color-transition),
    box-shadow var(--scd-color-transition);
}

.settings-control-demo__tile::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: var(--scd-mark-size);
  height: var(--scd-mark-size);
  background: var(--scd-mark);
  clip-path: polygon(100% 0, 0 0, 100% 100%);
  opacity: 0;
  transition: opacity var(--scd-color-transition);
  pointer-events: none;
  z-index: 1;
}

.settings-control-demo__tile--selected {
  background: #c8e0c0;
}

.settings-control-demo__tile--marked::after {
  opacity: 1;
}

.settings-control-demo__fly-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.settings-control-demo__flyer {
  position: absolute;
  width: var(--scd-tile);
  height: var(--scd-tile);
  will-change: transform, left, top, opacity;
  transition: none;
}

.settings-control-demo__toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(52 * var(--rpx));
  margin-top: calc(6 * var(--rpx));
}

.settings-control-demo__btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(48 * var(--rpx));
  height: calc(48 * var(--rpx));
  padding: 0;
  border: none;
  border-radius: calc(10 * var(--rpx));
  color: #f9f6f2;
  font-size: calc(26 * var(--rpx));
  overflow: visible;
  pointer-events: none;
  transform: scale(1);
  transform-origin: center center;
}

.settings-control-demo__btn--press {
  animation: scd-btn-press 0.52s ease-out forwards;
}

.settings-control-demo--reduced .settings-control-demo__btn--press {
  animation: none;
}

@keyframes scd-btn-press {
  0% {
    transform: scale(1);
  }
  22% {
    transform: scale(0.88);
  }
  52% {
    transform: scale(1.06);
  }
  78% {
    transform: scale(0.98);
  }
  100% {
    transform: scale(1);
  }
}

.settings-control-demo__btn--mark {
  background: var(--scd-mark);
}

.settings-control-demo__btn-icon-stack {
  position: relative;
  z-index: 1;
  display: inline-flex;
  line-height: 1;
}

.settings-control-demo__btn-main-icon {
  display: block;
}

.settings-control-demo__btn-sub-icon {
  position: absolute;
  right: calc(-3 * var(--rpx));
  bottom: calc(-2 * var(--rpx));
  font-size: calc(13 * var(--rpx));
  line-height: 1;
  color: #fff;
  background: var(--scd-mark);
  border-radius: calc(4 * var(--rpx));
  padding: calc(1 * var(--rpx));
  pointer-events: none;
}

.settings-control-demo__btn--swap {
  background: var(--scd-swap);
}

.settings-control-demo__ripple {
  position: absolute;
  inset: 0;
  margin: auto;
  width: calc(48 * var(--rpx));
  height: calc(48 * var(--rpx));
  border-radius: 50%;
  opacity: 0;
  transform: scale(0.15);
  pointer-events: none;
  transition: none;
}

.settings-control-demo__ripple--mark {
  background: rgba(91, 155, 213, 0.68);
  box-shadow: 0 0 0 calc(5 * var(--rpx)) rgba(91, 155, 213, 0.42);
}

.settings-control-demo__ripple--swap {
  background: rgba(155, 123, 184, 0.68);
  box-shadow: 0 0 0 calc(5 * var(--rpx)) rgba(155, 123, 184, 0.42);
}

.settings-control-demo__ripple--active {
  animation: scd-ripple-burst 0.52s ease-out forwards;
}

@keyframes scd-ripple-burst {
  0% {
    opacity: 0.95;
    transform: scale(0.15);
  }
  100% {
    opacity: 0;
    transform: scale(3.8);
  }
}
</style>
