<template>
  <Transition name="about-layer">
    <div
      v-if="open"
      class="about-layer-backdrop"
      role="presentation"
    >
      <div class="about-layer-scrim" aria-hidden="true" />
      <div
        class="about-layer-card"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.stop
      >
        <h2 :id="titleId" class="about-layer-title">关于</h2>

        <nav class="about-tabs-outer" aria-label="关于分类">
          <div
            class="about-tabs"
            role="tablist"
            :style="aboutTabSlideStyle"
          >
            <div class="about-tabs-thumb" aria-hidden="true" />
            <button
              v-for="section in ABOUT_SECTIONS"
              :key="section.id"
              type="button"
              role="tab"
              class="about-tab"
              :class="{ 'about-tab--active': activeTab === section.id }"
              :aria-selected="activeTab === section.id"
              @click="scrollToSection(section.id)"
            >
              {{ section.label }}
            </button>
          </div>
        </nav>

        <div class="about-scroll-outer">
          <div
            ref="scrollBodyRef"
            class="about-layer-body"
            :class="{ 'about-layer-body--dragging': thumbDragging }"
            @scroll.passive="onScrollBody"
          >
          <section
            :id="sectionDomId('game')"
            :ref="(el) => setSectionRef('game', el)"
            class="about-section"
            :aria-labelledby="sectionHeadingId('game')"
          >
            <h3 :id="sectionHeadingId('game')" class="about-section-title">关于本游戏</h3>
            <div class="about-panel about-panel--game">
              <article class="about-game-card">
                <header class="about-game-header">
                  <div class="about-game-title-row">
                    <p class="about-game-name">单词大师</p>
                    <button
                      type="button"
                      class="about-game-version"
                      aria-label="版本号"
                      @click="onVersionClick"
                    >
                      {{ APP_VERSION }}
                    </button>
                  </div>
                  <p class="about-game-intro">
                    一款使用Vibe Coding制作的、类小丑牌的拼单词游戏。
                  </p>
                </header>
                <footer v-if="showGameStudio" class="about-game-meta">
                  <span class="about-game-studio">时移游戏</span>
                </footer>
                <TapTapPromoIcon
                  v-if="showTapTapWebPromo"
                  in-about
                  @open-poster="openTapTapPoster"
                />
              </article>
              <button
                v-if="showPrivacyButton"
                type="button"
                class="about-privacy-btn"
                @click="emit('open-privacy')"
              >
                隐私政策
              </button>
            </div>
          </section>

          <section
            :id="sectionDomId('thirdParty')"
            :ref="(el) => setSectionRef('thirdParty', el)"
            class="about-section"
            :aria-labelledby="sectionHeadingId('thirdParty')"
          >
            <h3 :id="sectionHeadingId('thirdParty')" class="about-section-title">第三方资源</h3>
            <div class="about-panel about-panel--third-party">
              <ul class="about-resource-grid">
                <li
                  v-for="item in THIRD_PARTY_RESOURCES"
                  :key="item.label"
                  class="about-resource-card"
                >
                  <span class="about-resource-card-title">{{ item.label }}</span>
                  <a
                    class="about-resource-card-link"
                    :href="item.href"
                    target="_blank"
                    rel="noopener noreferrer"
                  >{{ item.href }}</a>
                </li>
              </ul>

              <div class="about-resource-divider" aria-hidden="true">
                <span class="about-resource-divider-label">Shaders</span>
              </div>

              <ul class="about-resource-grid">
                <li
                  v-for="shader in THIRD_PARTY_SHADERS"
                  :key="shader.label"
                  class="about-resource-card"
                >
                  <span class="about-resource-card-title">{{ shader.label }}</span>
                  <a
                    class="about-resource-card-link"
                    :href="shader.href"
                    target="_blank"
                    rel="noopener noreferrer"
                  >{{ shader.href }}</a>
                </li>
              </ul>
            </div>
          </section>

          <section
            :id="sectionDomId('changelog')"
            :ref="(el) => setSectionRef('changelog', el)"
            class="about-section about-section--last"
            :aria-labelledby="sectionHeadingId('changelog')"
          >
            <h3 :id="sectionHeadingId('changelog')" class="about-section-title">更新日志</h3>
            <div class="about-panel about-panel--changelog">
              <ul class="about-changelog-list">
                <li
                  v-for="entry in APP_CHANGELOG"
                  :key="entry.version"
                  class="about-changelog-item"
                >
                  <div class="about-changelog-head">
                    <span class="about-changelog-ver">v{{ entry.version }}</span>
                    <span v-if="entry.date" class="about-changelog-date">{{ entry.date }}</span>
                  </div>
                  <template v-if="splitSummary(entry.summary).length">
                    <p
                      v-for="(line, idx) in splitSummary(entry.summary)"
                      :key="`s-${idx}`"
                      class="about-changelog-text"
                    >
                      {{ line }}
                    </p>
                  </template>
                  <details
                    v-if="entry.autoSummary && splitSummary(entry.autoSummary).length"
                    class="about-changelog-auto"
                  >
                    <summary class="about-changelog-auto-toggle">详细信息</summary>
                    <div class="about-changelog-auto-body">
                      <p
                        v-for="(line, idx) in splitSummary(entry.autoSummary)"
                        :key="`a-${idx}`"
                        class="about-changelog-text about-changelog-text--auto"
                      >
                        {{ line }}
                      </p>
                    </div>
                  </details>
                </li>
              </ul>
            </div>
          </section>
          </div>

          <div
            v-show="scrollbarVisible"
            ref="scrollTrackRef"
            class="about-scroll-track"
            aria-hidden="true"
            @pointerdown="onTrackPointerDown"
          >
            <div
              class="about-scroll-thumb"
              :class="{ 'about-scroll-thumb--dragging': thumbDragging }"
              :style="thumbStyle"
              @pointerdown.stop="onThumbPointerDown"
            />
          </div>
        </div>

        <div class="about-layer-footer">
          <button type="button" class="about-back-btn" @click="$emit('close')">返回</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, inject, nextTick, onUnmounted, ref, watch } from "vue";
import { APP_CHANGELOG, APP_VERSION } from "../appVersion.js";
import TapTapPromoIcon from "./TapTapPromoIcon.vue";
import { isTapTapWebPromoEnabled } from "../taptap/tapTapWebPromo.js";

const props = defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "openMaterialBench", "enableDeveloperMode", "open-privacy"]);

/** 仅在 Capacitor 原生 App 内展示工作室名称 */
const showGameStudio =
  typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() === true;

/** @type {import('vue').Ref<boolean> | null} */
const developerModeEnabled = inject("developerModeEnabled", null);
const devModeActive = computed(() => developerModeEnabled?.value === true);
/** 原生壳内，或已开启开发者模式时展示隐私入口 */
const showPrivacyButton = computed(() => showGameStudio || devModeActive.value);

const showTapTapWebPromo = isTapTapWebPromoEnabled();
/** @type {() => void} */
const openTapTapPoster = inject("openTapTapPoster", () => {});

const ABOUT_SECTIONS = [
  { id: "game", label: "关于本游戏" },
  { id: "thirdParty", label: "第三方资源" },
  { id: "changelog", label: "更新日志" },
];

const titleId = "about-layer-title";
/** @type {import('vue').Ref<'game' | 'thirdParty' | 'changelog'>} */
const activeTab = ref("game");

const activeTabIndex = computed(() => {
  const idx = ABOUT_SECTIONS.findIndex((s) => s.id === activeTab.value);
  return idx >= 0 ? idx : 0;
});

const aboutTabSlideStyle = computed(() => ({
  "--about-tab-count": String(ABOUT_SECTIONS.length),
  "--about-tab-index": String(activeTabIndex.value),
}));

const scrollBodyRef = ref(null);
const scrollTrackRef = ref(null);
const scrollbarVisible = ref(false);
const thumbDragging = ref(false);
const thumbHeightPx = ref(0);
const thumbTopPx = ref(0);
/** @type {Record<string, HTMLElement | undefined>} */
const sectionElById = {};

/** @type {ReturnType<typeof setTimeout> | null} */
let scrollSpyLockTimer = null;
let scrollSpyLocked = false;
/** @type {string | null} */
let programmaticScrollTargetId = null;
let scrollEndBound = false;

const SCROLL_SPY_FALLBACK_MS = 1200;
const SCROLL_POSITION_TOLERANCE_PX = 4;
let versionTapCount = 0;
/** @type {ReturnType<typeof setTimeout> | null} */
let versionTapTimer = null;
/** @type {ResizeObserver | null} */
let scrollResizeObserver = null;
/** @type {{ startY: number; startScrollTop: number; maxThumbTop: number; scrollRange: number } | null} */
let thumbDragState = null;

const SCROLLBAR_TRACK_INSET = 4;
const SCROLLBAR_MIN_THUMB = 28;

const thumbStyle = computed(() => ({
  height: `${thumbHeightPx.value}px`,
  transform: `translateY(${thumbTopPx.value}px)`,
}));

const THIRD_PARTY_RESOURCES = [
  { label: "ECDICT", href: "https://github.com/skywind3000/ECDICT" },
  { label: "GSAP", href: "https://gsap.com/" },
  { label: "Remix Icon", href: "https://remixicon.com/" },
  { label: "regl", href: "https://regl-project.github.io/" },
];

const THIRD_PARTY_SHADERS = [
  { label: "Steel", href: "https://www.shadertoy.com/view/MdBGWG" },
  { label: "Fire", href: "https://www.shadertoy.com/view/4ttGWM" },
  { label: "Ice", href: "https://www.shadertoy.com/view/MsXyzN" },
  { label: "Water", href: "https://www.shadertoy.com/view/MdlXz8" },
  { label: "Lucky", href: "https://www.shadertoy.com/view/lX2GDR" },
  { label: "Wildcard", href: "https://www.shadertoy.com/view/M3dSzs" },
  { label: "Gold", href: "https://www.shadertoy.com/view/3tyBRW" },
];

/**
 * @param {string} id
 */
function sectionDomId(id) {
  return `about-section-${id}`;
}

/**
 * @param {string} id
 */
function sectionHeadingId(id) {
  return `about-section-heading-${id}`;
}

/**
 * @param {string} id
 * @param {import('vue').ComponentPublicInstance | Element | null} el
 */
function setSectionRef(id, el) {
  const node = el instanceof HTMLElement ? el : null;
  if (node) {
    sectionElById[id] = node;
  } else {
    delete sectionElById[id];
  }
}

/**
 * @param {HTMLElement} container
 * @param {HTMLElement} sectionEl
 */
function getSectionScrollTop(container, sectionEl) {
  return (
    sectionEl.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    container.scrollTop
  );
}

function clearScrollSpyLockTimer() {
  if (scrollSpyLockTimer != null) {
    window.clearTimeout(scrollSpyLockTimer);
    scrollSpyLockTimer = null;
  }
}

function releaseProgrammaticScrollLock() {
  scrollSpyLocked = false;
  clearScrollSpyLockTimer();
  if (programmaticScrollTargetId) {
    activeTab.value = programmaticScrollTargetId;
    programmaticScrollTargetId = null;
  }
}

/**
 * @param {HTMLElement} container
 * @param {string} sectionId
 */
function isScrollNearSection(container, sectionId) {
  const sectionEl = sectionElById[sectionId];
  if (!sectionEl) return false;
  const targetTop = getSectionScrollTop(container, sectionEl);
  return Math.abs(container.scrollTop - targetTop) <= SCROLL_POSITION_TOLERANCE_PX;
}

function onScrollBodyScrollEnd() {
  if (!scrollSpyLocked || !programmaticScrollTargetId) return;
  releaseProgrammaticScrollLock();
}

function bindScrollEndListener() {
  const container = scrollBodyRef.value;
  if (!container || scrollEndBound) return;
  container.addEventListener("scrollend", onScrollBodyScrollEnd);
  scrollEndBound = true;
}

function unbindScrollEndListener() {
  const container = scrollBodyRef.value;
  if (!container || !scrollEndBound) return;
  container.removeEventListener("scrollend", onScrollBodyScrollEnd);
  scrollEndBound = false;
}

/**
 * @param {string} id
 */
function scrollToSection(id) {
  const container = scrollBodyRef.value;
  const sectionEl = sectionElById[id];
  if (!container || !sectionEl) return;

  activeTab.value = id;
  programmaticScrollTargetId = id;
  scrollSpyLocked = true;
  clearScrollSpyLockTimer();

  container.scrollTo({
    top: getSectionScrollTop(container, sectionEl),
    behavior: "smooth",
  });

  scrollSpyLockTimer = window.setTimeout(releaseProgrammaticScrollLock, SCROLL_SPY_FALLBACK_MS);
}

function updateScrollbarMetrics() {
  const container = scrollBodyRef.value;
  if (!container) return;

  const { scrollTop, scrollHeight, clientHeight } = container;
  const canScroll = scrollHeight > clientHeight + 1;
  scrollbarVisible.value = canScroll;

  if (!canScroll) {
    thumbHeightPx.value = 0;
    thumbTopPx.value = 0;
    return;
  }

  const trackInner = Math.max(0, clientHeight - SCROLLBAR_TRACK_INSET * 2);
  thumbHeightPx.value = Math.max(
    SCROLLBAR_MIN_THUMB,
    (clientHeight / scrollHeight) * trackInner,
  );

  const maxThumbTop = Math.max(0, trackInner - thumbHeightPx.value);
  const scrollRange = scrollHeight - clientHeight;
  if (!thumbDragging.value) {
    const ratio = scrollRange > 0 ? scrollTop / scrollRange : 0;
    thumbTopPx.value = SCROLLBAR_TRACK_INSET + ratio * maxThumbTop;
  }
}

function onScrollBody() {
  const container = scrollBodyRef.value;
  if (!thumbDragging.value && container) {
    if (scrollSpyLocked && programmaticScrollTargetId) {
      if (isScrollNearSection(container, programmaticScrollTargetId)) {
        releaseProgrammaticScrollLock();
      }
    } else if (!scrollSpyLocked) {
      updateActiveFromScroll();
    }
  }
  updateScrollbarMetrics();
}

/**
 * @param {PointerEvent} event
 */
function onThumbPointerDown(event) {
  const container = scrollBodyRef.value;
  const track = scrollTrackRef.value;
  if (!container || !track) return;

  const trackInner = Math.max(0, track.clientHeight - SCROLLBAR_TRACK_INSET * 2);
  const maxThumbTop = Math.max(0, trackInner - thumbHeightPx.value);
  const scrollRange = container.scrollHeight - container.clientHeight;

  thumbDragState = {
    startY: event.clientY,
    startScrollTop: container.scrollTop,
    maxThumbTop,
    scrollRange,
  };
  thumbDragging.value = true;

  window.addEventListener("pointermove", onThumbPointerMove);
  window.addEventListener("pointerup", onThumbPointerUp);
  window.addEventListener("pointercancel", onThumbPointerUp);
}

/**
 * @param {PointerEvent} event
 */
function onThumbPointerMove(event) {
  if (!thumbDragState || !scrollBodyRef.value) return;

  const deltaY = event.clientY - thumbDragState.startY;
  const { maxThumbTop, scrollRange, startScrollTop } = thumbDragState;
  if (maxThumbTop <= 0) return;

  const nextScrollTop = Math.max(
    0,
    Math.min(scrollRange, startScrollTop + (deltaY / maxThumbTop) * scrollRange),
  );
  scrollBodyRef.value.scrollTop = nextScrollTop;

  const ratio = scrollRange > 0 ? nextScrollTop / scrollRange : 0;
  thumbTopPx.value = SCROLLBAR_TRACK_INSET + ratio * maxThumbTop;
}

/**
 * @param {PointerEvent} event
 */
function onTrackPointerDown(event) {
  if (event.target !== scrollTrackRef.value) return;

  const container = scrollBodyRef.value;
  const track = scrollTrackRef.value;
  if (!container || !track) return;

  const rect = track.getBoundingClientRect();
  const trackInner = Math.max(0, rect.height - SCROLLBAR_TRACK_INSET * 2);
  const maxThumbTop = Math.max(0, trackInner - thumbHeightPx.value);
  const y = event.clientY - rect.top - SCROLLBAR_TRACK_INSET;
  const targetTop = Math.max(0, Math.min(maxThumbTop, y - thumbHeightPx.value / 2));
  const scrollRange = container.scrollHeight - container.clientHeight;

  if (maxThumbTop > 0 && scrollRange > 0) {
    container.scrollTop = (targetTop / maxThumbTop) * scrollRange;
  }
}

function onThumbPointerUp() {
  thumbDragging.value = false;
  thumbDragState = null;
  window.removeEventListener("pointermove", onThumbPointerMove);
  window.removeEventListener("pointerup", onThumbPointerUp);
  window.removeEventListener("pointercancel", onThumbPointerUp);
  updateScrollbarMetrics();
  updateActiveFromScroll();
}

function resetVersionTapCount() {
  versionTapCount = 0;
  if (versionTapTimer != null) {
    window.clearTimeout(versionTapTimer);
    versionTapTimer = null;
  }
}

function onVersionClick() {
  versionTapCount += 1;
  if (versionTapTimer != null) {
    window.clearTimeout(versionTapTimer);
  }
  versionTapTimer = window.setTimeout(() => {
    resetVersionTapCount();
  }, 1600);

  if (versionTapCount < 5) return;
  resetVersionTapCount();
  emit("enableDeveloperMode");
  emit("openMaterialBench");
}

function bindScrollResizeObserver() {
  const container = scrollBodyRef.value;
  if (!container || scrollResizeObserver) return;
  scrollResizeObserver = new ResizeObserver(() => {
    updateScrollbarMetrics();
  });
  scrollResizeObserver.observe(container);
}

function unbindScrollResizeObserver() {
  scrollResizeObserver?.disconnect();
  scrollResizeObserver = null;
}

function updateActiveFromScroll() {
  if (scrollSpyLocked) return;

  const container = scrollBodyRef.value;
  if (!container) return;

  const scrollTop = container.scrollTop;
  const tops = ABOUT_SECTIONS.map((section) => {
    const sectionEl = sectionElById[section.id];
    if (!sectionEl) return 0;
    return getSectionScrollTop(container, sectionEl);
  });

  let sectionIndex = 0;
  for (let i = 0; i < ABOUT_SECTIONS.length - 1; i++) {
    const boundary = (tops[i] + tops[i + 1]) / 2;
    if (scrollTop >= boundary) {
      sectionIndex = i + 1;
    }
  }

  activeTab.value = ABOUT_SECTIONS[sectionIndex].id;
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) {
      scrollSpyLocked = false;
      programmaticScrollTargetId = null;
      clearScrollSpyLockTimer();
      unbindScrollEndListener();
      unbindScrollResizeObserver();
      onThumbPointerUp();
      return;
    }

    activeTab.value = "game";
    scrollSpyLocked = false;
    programmaticScrollTargetId = null;
    clearScrollSpyLockTimer();
    await nextTick();
    bindScrollResizeObserver();
    bindScrollEndListener();
    const container = scrollBodyRef.value;
    if (container) {
      container.scrollTop = 0;
    }
    updateScrollbarMetrics();
  },
);

onUnmounted(() => {
  clearScrollSpyLockTimer();
  unbindScrollEndListener();
  resetVersionTapCount();
  unbindScrollResizeObserver();
  onThumbPointerUp();
});

/**
 * @param {string} summary
 */
function splitSummary(summary) {
  return String(summary ?? "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
</script>

<style scoped>
.about-layer-backdrop {
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(32 * var(--rpx)) calc(24 * var(--rpx));
  box-sizing: border-box;
}

.about-layer-scrim {
  background: rgba(124, 179, 66, 0.88);
  pointer-events: none;
}

.about-layer-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: min(var(--menu-actions-width), calc(100% - 40 * var(--rpx)));
  height: min(calc(880 * var(--rpx)), calc(100% - 40 * var(--rpx)));
  --about-text-size: calc(26 * var(--rpx));
  --about-text-lh: 1.45;
  overflow: hidden;
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(32 * var(--rpx)) calc(28 * var(--rpx)) calc(24 * var(--rpx));
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.about-layer-title {
  margin: 0 0 calc(22 * var(--rpx));
  font-size: calc(40 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  text-align: center;
}

.about-tabs-outer {
  flex-shrink: 0;
  margin: calc(-6 * var(--rpx)) 0 calc(18 * var(--rpx));
}

.about-tabs {
  --about-tab-pad: calc(4 * var(--rpx));
  --about-green: var(--btn-green, #7cb342);
  --about-green-fg: #f9f6f2;
  position: relative;
  display: flex;
  gap: 0;
  padding: var(--about-tab-pad);
  border-radius: calc(8 * var(--rpx));
  background: rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

.about-tabs-thumb {
  position: absolute;
  top: var(--about-tab-pad);
  bottom: var(--about-tab-pad);
  left: var(--about-tab-pad);
  width: calc((100% - 2 * var(--about-tab-pad)) / var(--about-tab-count));
  border-radius: calc(6 * var(--rpx));
  background: var(--about-green);
  box-shadow: 0 calc(1 * var(--rpx)) calc(3 * var(--rpx)) rgba(0, 0, 0, 0.14);
  pointer-events: none;
  transition: transform calc(0.22s / var(--anim-speed-scale, 1)) var(--ease-expo-out, ease-out);
  transform: translateX(calc(var(--about-tab-index) * 100%));
  z-index: 0;
}

.about-tab {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
  border: none;
  border-radius: calc(6 * var(--rpx));
  padding: calc(10 * var(--rpx)) calc(12 * var(--rpx));
  font-family: inherit;
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  color: var(--text-dark, #3c3a32);
  background: transparent;
  opacity: 0.72;
  transition:
    color 0.12s ease,
    opacity 0.12s ease;
}

.about-tab:hover:not(.about-tab--active) {
  opacity: 0.88;
}

.about-tab--active {
  color: var(--about-green-fg);
  opacity: 1;
}

.about-tab:focus-visible {
  outline: calc(2 * var(--rpx)) solid var(--about-green);
  outline-offset: calc(1 * var(--rpx));
}

.about-scroll-outer {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: calc(10 * var(--rpx));
}

.about-layer-body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  scroll-behavior: smooth;
  box-sizing: border-box;
  padding: calc(12 * var(--rpx)) calc(2 * var(--rpx)) calc(14 * var(--rpx));
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.about-layer-body--dragging {
  scroll-behavior: auto;
}

.about-layer-body::-webkit-scrollbar {
  display: none;
}

.about-scroll-track {
  flex-shrink: 0;
  width: calc(10 * var(--rpx));
  position: relative;
  border-radius: calc(6 * var(--rpx));
  background: rgba(60, 58, 50, 0.08);
  touch-action: none;
  user-select: none;
}

.about-scroll-thumb {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  border-radius: calc(6 * var(--rpx));
  background: var(--btn-green, #7cb342);
  box-shadow: 0 calc(1 * var(--rpx)) calc(3 * var(--rpx)) rgba(0, 0, 0, 0.12);
  cursor: grab;
  touch-action: none;
}

.about-scroll-thumb--dragging,
.about-scroll-thumb:active {
  cursor: grabbing;
  filter: brightness(1.06);
}

.about-section {
  scroll-margin-top: calc(4 * var(--rpx));
}

.about-section + .about-section {
  margin-top: calc(32 * var(--rpx));
  padding-top: calc(32 * var(--rpx));
  border-top: calc(2 * var(--rpx)) solid rgba(60, 58, 50, 0.1);
}

.about-section--last {
  padding-bottom: calc(10 * var(--rpx));
}

.about-section-title {
  margin: 0 0 calc(12 * var(--rpx));
  font-size: calc(28 * var(--rpx));
  font-weight: 800;
  line-height: var(--about-text-lh);
  color: var(--text-dark, #3c3a32);
}

.about-panel {
  padding: calc(4 * var(--rpx)) calc(4 * var(--rpx)) calc(8 * var(--rpx));
}

.about-panel--game {
  display: flex;
  flex-direction: column;
  gap: calc(12 * var(--rpx));
  padding: 0;
}

.about-game-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: calc(18 * var(--rpx));
  padding: calc(22 * var(--rpx)) calc(20 * var(--rpx));
  background: var(--card, #eee4da);
  border: calc(1 * var(--rpx)) solid rgba(60, 58, 50, 0.14);
  border-radius: var(--radius);
  box-sizing: border-box;
}

.about-game-header {
  display: flex;
  flex-direction: column;
  gap: calc(12 * var(--rpx));
}

.about-game-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(12 * var(--rpx));
}

.about-game-name {
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  font-size: calc(34 * var(--rpx));
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: calc(0.5 * var(--rpx));
  color: var(--text-dark, #3c3a32);
}

.about-game-intro {
  margin: 0;
  font-size: var(--about-text-size);
  font-weight: 600;
  line-height: 1.55;
  color: rgba(60, 58, 50, 0.82);
}

.about-game-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: calc(12 * var(--rpx));
  margin: 0;
  padding-top: calc(16 * var(--rpx));
  border-top: calc(2 * var(--rpx)) solid rgba(60, 58, 50, 0.1);
}

.about-game-version {
  border: none;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: calc(6 * var(--rpx)) calc(14 * var(--rpx));
  font-size: calc(20 * var(--rpx));
  font-weight: 800;
  line-height: 1.25;
  color: #f9f6f2;
  background: var(--btn-green, #7cb342);
  border-radius: calc(8 * var(--rpx));
  box-shadow: 0 calc(1 * var(--rpx)) calc(2 * var(--rpx)) rgba(0, 0, 0, 0.08);
  cursor: pointer;
  touch-action: manipulation;
}

.about-game-version:active {
  filter: brightness(0.94);
}

.about-game-version:focus-visible {
  outline: calc(2 * var(--rpx)) solid rgba(60, 58, 50, 0.55);
  outline-offset: calc(2 * var(--rpx));
}

.about-game-meta-divider {
  flex-shrink: 0;
  width: calc(4 * var(--rpx));
  height: calc(4 * var(--rpx));
  border-radius: 50%;
  background: rgba(60, 58, 50, 0.28);
}

.about-game-studio {
  font-size: calc(22 * var(--rpx));
  font-weight: 800;
  line-height: 1.25;
  color: var(--text-soft, #8f7a66);
  letter-spacing: calc(0.3 * var(--rpx));
}

.about-privacy-btn {
  width: 100%;
  border: none;
  font-family: inherit;
  padding: calc(14 * var(--rpx)) calc(16 * var(--rpx));
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  line-height: 1.25;
  color: var(--text-dark, #3c3a32);
  background: var(--card, #eee4da);
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.1);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  cursor: pointer;
  touch-action: manipulation;
  box-sizing: border-box;
}

.about-privacy-btn:hover {
  filter: brightness(1.03);
}

.about-privacy-btn:active {
  filter: brightness(0.94);
}

.about-privacy-btn:focus-visible {
  outline: calc(2 * var(--rpx)) solid rgba(60, 58, 50, 0.55);
  outline-offset: calc(2 * var(--rpx));
}

.about-panel--third-party {
  padding-top: 0;
}

.about-resource-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: calc(12 * var(--rpx));
}

.about-resource-card {
  display: flex;
  flex-direction: column;
  gap: calc(8 * var(--rpx));
  min-width: 0;
  padding: calc(12 * var(--rpx)) calc(14 * var(--rpx));
  background: #fff;
  border: calc(1 * var(--rpx)) solid rgba(60, 58, 50, 0.28);
  border-radius: var(--radius);
  box-sizing: border-box;
}

.about-resource-card-title {
  font-size: var(--about-text-size);
  font-weight: 800;
  line-height: var(--about-text-lh);
  color: var(--text-dark, #3c3a32);
}

.about-resource-card-link {
  font-size: calc(20 * var(--rpx));
  font-weight: 600;
  line-height: 1.35;
  color: #5a8fb8;
  text-decoration: underline;
  text-underline-offset: calc(2 * var(--rpx));
  word-break: break-all;
}

.about-resource-card-link:hover {
  filter: brightness(1.08);
}

.about-resource-divider {
  display: flex;
  align-items: center;
  gap: calc(12 * var(--rpx));
  margin: calc(16 * var(--rpx)) 0 calc(12 * var(--rpx));
}

.about-resource-divider::before,
.about-resource-divider::after {
  content: "";
  flex: 1;
  height: calc(2 * var(--rpx));
  background: rgba(60, 58, 50, 0.1);
}

.about-resource-divider-label {
  flex-shrink: 0;
  font-size: var(--about-text-size);
  font-weight: 800;
  line-height: var(--about-text-lh);
  color: var(--text-dark, #3c3a32);
}

.about-changelog-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: calc(14 * var(--rpx));
}

.about-changelog-item {
  padding: calc(12 * var(--rpx)) calc(14 * var(--rpx));
  background: var(--card, #eee4da);
  border-radius: var(--radius);
}

.about-changelog-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: calc(12 * var(--rpx));
  margin-bottom: calc(10 * var(--rpx));
}

.about-changelog-ver {
  font-size: var(--about-text-size);
  font-weight: 800;
  line-height: var(--about-text-lh);
  color: var(--text-dark, #3c3a32);
}

.about-changelog-date {
  font-size: var(--about-text-size);
  font-weight: 600;
  line-height: var(--about-text-lh);
  color: rgba(60, 58, 50, 0.55);
}

.about-changelog-text {
  margin: 0 0 calc(6 * var(--rpx));
  font-size: var(--about-text-size);
  line-height: var(--about-text-lh);
  color: var(--text-dark, #3c3a32);
}

.about-changelog-text:last-child {
  margin-bottom: 0;
}

.about-changelog-auto {
  margin-top: calc(6 * var(--rpx));
}

.about-changelog-auto-toggle {
  font-size: calc(20 * var(--rpx));
  font-weight: 700;
  line-height: var(--about-text-lh);
  color: rgba(60, 58, 50, 0.65);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.about-changelog-auto-toggle::-webkit-details-marker {
  display: none;
}

.about-changelog-auto-toggle::before {
  content: "▸ ";
  display: inline-block;
  transition: transform 0.15s ease;
}

.about-changelog-auto[open] .about-changelog-auto-toggle::before {
  transform: rotate(90deg);
}

.about-changelog-auto-body {
  margin-top: calc(6 * var(--rpx));
  padding-top: calc(6 * var(--rpx));
  border-top: calc(1 * var(--rpx)) solid rgba(60, 58, 50, 0.12);
}

.about-changelog-text--auto {
  font-size: calc(20 * var(--rpx));
  color: rgba(60, 58, 50, 0.72);
}

.about-layer-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  margin-top: calc(16 * var(--rpx));
}

.about-back-btn {
  width: 100%;
  border: none;
  border-radius: var(--radius);
  padding: calc(16 * var(--rpx)) calc(20 * var(--rpx));
  font-family: inherit;
  font-size: calc(28 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow);
  color: var(--text-dark, #3c3a32);
  background: var(--card, #eee4da);
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.1);
}

.about-back-btn:hover {
  filter: brightness(1.05);
}

.about-back-btn:active {
  filter: brightness(0.92);
}

.about-layer-enter-active,
.about-layer-leave-active {
  transition: opacity 0.28s var(--ease-expo-out, ease-out);
}

.about-layer-enter-active .about-layer-card,
.about-layer-leave-active .about-layer-card {
  transition:
    opacity 0.32s var(--ease-expo-out, ease-out),
    transform 0.32s var(--ease-expo-out, ease-out);
}

.about-layer-enter-from,
.about-layer-leave-to {
  opacity: 0;
}

.about-layer-enter-from .about-layer-card,
.about-layer-leave-to .about-layer-card {
  opacity: 0;
  transform: scale(0.94) translateY(calc(12 * var(--rpx)));
}

:global(html.reduce-motion) .about-tabs-thumb {
  transition: none;
}
</style>
