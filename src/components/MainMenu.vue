<template>
  <div class="main-menu">
    <div v-if="showMenuActions" class="menu-top-left">
      <PlayerProfileChip
        :suppressed="profileLayerOpen"
        @open-profile="$emit('open-profile', $event)"
      />
      <TapTapLeaderboardButton @open="openTapTapLeaderboard" />
    </div>
    <TapTapEngagementButton
      v-if="showMenuActions"
      @open="openEngagementManual"
    />
    <Teleport defer to="#game-view-portal-frame">
      <TapTapEngagementLayer
        :open="tapTapEngagementLayerOpen"
        :show-intro-question="tapTapEngagementShowIntro"
        @close="closeTapTapEngagementLayer"
        @engaged="onTapTapEngagementAction"
      />
      <TapTapLeaderboardWebHintLayer
        :open="leaderboardWebHintOpen"
        @close="leaderboardWebHintOpen = false"
        @open-poster="openTapTapPoster"
      />
    </Teleport>
    <div
      ref="innerRef"
      class="main-menu-inner"
      :class="{
        'main-menu-inner--enter-anim': showMenuActions && !menuEnterDone,
      }"
    >
      <TileLetterShowcase
        ref="showcaseRef"
        class="menu-letter-showcase"
        aria-label="单词大师"
        :rows="showcaseRows"
      />

      <div v-if="showAuthBlocked" class="menu-auth-status menu-auth-status--blocked">
        <p class="menu-auth-message">{{ authMessage || "暂时无法进入游戏。" }}</p>
        <div v-if="phase === 'error'" class="menu-auth-actions">
          <button
            type="button"
            class="menu-btn menu-btn--settings menu-auth-action"
            @click="retryAuth"
          >
            重试
          </button>
          <button
            type="button"
            class="menu-btn menu-btn--about menu-auth-action"
            @click="playOffline"
          >
            离线游玩
          </button>
        </div>
        <div v-else-if="phase === 'blocked'" class="menu-auth-actions">
          <button
            type="button"
            class="menu-btn menu-btn--settings menu-auth-action"
            @click="switchTapTapAccount"
          >
            切换账号
          </button>
        </div>
      </div>

      <nav v-else-if="showLoginButton" class="menu-actions menu-actions--login" aria-label="TapTap 登录">
        <TapTapLoginButton :disabled="loginBusy" @click="loginWithTapTap" />
        <p v-if="authMessage" class="menu-auth-hint">{{ authMessage }}</p>
      </nav>

      <div
        v-else-if="showMenuActions"
        ref="actionsWrapRef"
        class="menu-actions-wrap"
      >
        <nav ref="actionsRef" class="menu-actions" aria-label="主菜单">
          <button type="button" class="menu-btn menu-btn--start" @click="$emit('request-start')">
            <i class="ri-play-fill menu-btn-icon" aria-hidden="true"></i>
            <span>开始游戏</span>
          </button>
          <button
            type="button"
            class="menu-btn menu-btn--collection"
            :aria-label="`收藏${collectionProgressSuffix}`"
            @click="$emit('open-collection')"
          >
            <i class="ri-bookmark-3-line menu-btn-icon" aria-hidden="true"></i>
            <span>
              收藏<span v-if="collectionProgressSuffix" class="menu-btn-progress">{{ collectionProgressSuffix }}</span>
            </span>
          </button>
          <button type="button" class="menu-btn menu-btn--settings" @click="$emit('open-settings')">
            <i class="ri-settings-3-line menu-btn-icon" aria-hidden="true"></i>
            <span>设置</span>
          </button>
          <button type="button" class="menu-btn menu-btn--about" @click="$emit('open-about')">
            <i class="ri-information-line menu-btn-icon" aria-hidden="true"></i>
            <span>关于</span>
          </button>
        </nav>
      </div>
    </div>
    <TapTapPromoIcon
      v-if="showTapTapMenuPromo"
      in-menu
      @open-poster="openTapTapPoster"
    />
  </div>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from "vue";
import TileLetterShowcase from "./TileLetterShowcase.vue";
import TapTapLoginButton from "./TapTapLoginButton.vue";
import TapTapPromoIcon from "./TapTapPromoIcon.vue";
import TapTapEngagementButton from "./TapTapEngagementButton.vue";
import TapTapEngagementLayer from "./TapTapEngagementLayer.vue";
import PlayerProfileChip from "./PlayerProfileChip.vue";
import TapTapLeaderboardButton from "./TapTapLeaderboardButton.vue";
import TapTapLeaderboardWebHintLayer from "./TapTapLeaderboardWebHintLayer.vue";
import { useTapTapAuth } from "../composables/useTapTapAuth.js";
import { useWebLayoutMode } from "../composables/useWebLayoutMode.js";
import { isTapTapWebPromoEnabled } from "../taptap/tapTapWebPromo.js";
import {
  TAP_TAP_ENGAGEMENT_AUTO_DELAY_MS,
  clearTapTapEngagementAutoPending,
  isTapTapEngagementAutoPending,
  isTapTapEngagementPromptHandled,
  markTapTapEngagementPromptHandled,
} from "../taptap/tapTapEngagementPrompt.js";
import {
  closeTapTapEngagementLayer,
  openTapTapEngagementLayer,
  tapTapEngagementLayerOpen,
  tapTapEngagementShowIntro,
} from "../taptap/tapTapEngagementUi.js";
import { openTapTapLeaderboardFromMenu } from "../taptap/tapTapLeaderboardSync.js";
import { animSleep } from "../settings/animationSpeed.js";
import { normalizeSlotCareerStats } from "../save/slotCareerStats.js";
import { getSlotCareer, mutateSlotCareer } from "../save/runSaveStorage.js";
import { getActiveSaveSlotIndex } from "../profile/playerProfile.js";
import {
  killMainMenuEnter,
  measureMainMenuEnterLayout,
  playMainMenuEnter,
  prepareMainMenuEnterHidden,
} from "../menu/mainMenuEnterAnim.js";

const props = defineProps({
  profileLayerOpen: { type: Boolean, default: false },
  collectionProgressSuffix: { type: String, default: "" },
  saveUiRefreshKey: { type: Number, default: 0 },
});

defineEmits(["request-start", "open-profile", "open-settings", "open-about", "open-collection"]);

const {
  phase,
  authMessage,
  loginBusy,
  showMenuActions,
  showLoginButton,
  showAuthBlocked,
  loginWithTapTap,
  retryAuth,
  switchTapTapAccount,
  playOffline,
} = useTapTapAuth();

const { isMobileLayout } = useWebLayoutMode();
/** @type {() => void} */
const openTapTapPoster = inject("openTapTapPoster", () => {});

const leaderboardWebHintOpen = ref(false);

function openTapTapLeaderboard() {
  openTapTapLeaderboardFromMenu({
    onWebHint: () => {
      leaderboardWebHintOpen.value = true;
    },
  });
}

/** @type {import('vue').Ref<boolean> | null} */
const developerModeEnabled = inject("developerModeEnabled", null);
const showTapTapMenuPromo = computed(
  () => isTapTapWebPromoEnabled() && isMobileLayout.value,
);

/** @type {import('vue').Ref<HTMLElement | null>} */
const innerRef = ref(null);
/** @type {import('vue').Ref<import('vue').ComponentPublicInstance | null>} */
const showcaseRef = ref(null);
/** @type {import('vue').Ref<HTMLElement | null>} */
const actionsWrapRef = ref(null);
/** @type {import('vue').Ref<HTMLElement | null>} */
const actionsRef = ref(null);
const menuEnterDone = ref(false);
/** @type {number} */
let menuEnterRunId = 0;

/** @returns {HTMLElement | null} */
function resolveShowcaseEl() {
  const raw = showcaseRef.value;
  if (!raw) return null;
  if (raw instanceof HTMLElement) return raw;
  const el = raw.$el;
  return el instanceof HTMLElement ? el : null;
}

async function runMenuEnterAnimation() {
  menuEnterRunId += 1;
  const runId = menuEnterRunId;

  if (!showMenuActions.value) return;

  menuEnterDone.value = false;
  await nextTick();
  if (runId !== menuEnterRunId) return;

  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (runId !== menuEnterRunId) return;

  const inner = innerRef.value;
  const showcase = resolveShowcaseEl();
  const actionsWrap = actionsWrapRef.value;
  const nav = actionsRef.value;
  if (!inner || !showcase || !actionsWrap || !nav) return;

  const layout = measureMainMenuEnterLayout(nav, showcase);
  prepareMainMenuEnterHidden(showcase, actionsWrap, layout.buttons);

  requestAnimationFrame(() => {
    if (runId !== menuEnterRunId) return;
    playMainMenuEnter({
      inner,
      showcase,
      actionsWrap,
      buttons: layout.buttons,
      navHeight: layout.navHeight,
      showcaseGapPx: layout.showcaseGapPx,
      onComplete: () => {
        if (runId === menuEnterRunId) menuEnterDone.value = true;
      },
    });
  });
}

watch(
  showMenuActions,
  (visible) => {
    if (visible) {
      void runMenuEnterAnimation();
    } else {
      menuEnterRunId += 1;
      menuEnterDone.value = false;
    }
  },
  { immediate: true },
);

/** @type {number} */
let autoEngagementRunId = 0;

function persistEngagementHandled(slotIndex) {
  mutateSlotCareer(slotIndex, markTapTapEngagementPromptHandled);
}

function onTapTapEngagementAction() {
  persistEngagementHandled(getActiveSaveSlotIndex());
}

function openEngagementManual() {
  const showIntro = developerModeEnabled?.value === true;
  openTapTapEngagementLayer({ showIntroQuestion: showIntro });
}

async function tryScheduleAutoEngagementPrompt() {
  autoEngagementRunId += 1;
  const runId = autoEngagementRunId;

  if (!showMenuActions.value) return;

  const slotIndex = getActiveSaveSlotIndex();
  const career = normalizeSlotCareerStats(getSlotCareer(slotIndex));
  if (!isTapTapEngagementAutoPending(career) || isTapTapEngagementPromptHandled(career)) {
    return;
  }

  await animSleep(TAP_TAP_ENGAGEMENT_AUTO_DELAY_MS);
  if (runId !== autoEngagementRunId || !showMenuActions.value) return;

  const careerAfterWait = normalizeSlotCareerStats(getSlotCareer(slotIndex));
  if (!isTapTapEngagementAutoPending(careerAfterWait) || isTapTapEngagementPromptHandled(careerAfterWait)) {
    return;
  }

  mutateSlotCareer(slotIndex, (nextCareer) => {
    clearTapTapEngagementAutoPending(nextCareer);
    markTapTapEngagementPromptHandled(nextCareer);
  });
  openTapTapEngagementLayer({ showIntroQuestion: true });
}

watch(
  () => [showMenuActions.value, props.saveUiRefreshKey],
  () => {
    if (showMenuActions.value) {
      void tryScheduleAutoEngagementPrompt();
    } else {
      autoEngagementRunId += 1;
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  autoEngagementRunId += 1;
  menuEnterRunId += 1;
  killMainMenuEnter(resolveShowcaseEl(), actionsRef.value, actionsWrapRef.value);
});

const showcaseRows = [
  [
    { letter: "W", rarity: "legendary" },
    { letter: "O", rarity: "epic" },
    { letter: "R", rarity: "rare" },
    { letter: "D", rarity: "common" },
  ],
  [
    { letter: "M", rarity: "legendary" },
    { letter: "A", rarity: "epic" },
    { letter: "S", rarity: "rare" },
    { letter: "T", rarity: "common" },
    { letter: "E", rarity: "rare" },
    { letter: "R", rarity: "epic" },
  ],
];
</script>

<style scoped>
.main-menu {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--card);
  border-radius: calc(12 * var(--rpx));
  box-shadow: var(--shadow);
  padding: var(--menu-padding);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.menu-top-left {
  position: absolute;
  top: var(--menu-padding, calc(56 * var(--rpx)));
  left: var(--menu-padding, calc(56 * var(--rpx)));
  z-index: 2;
  display: flex;
  align-items: center;
  gap: calc(10 * var(--rpx));
  max-width: calc(100% - 2 * var(--menu-padding, calc(56 * var(--rpx))) - calc(80 * var(--rpx)));
}

.main-menu-inner {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.main-menu-inner--enter-anim .menu-letter-showcase {
  margin-bottom: 0;
}

.menu-actions-wrap {
  width: 100%;
  overflow: hidden;
}

.main-menu-inner--enter-anim .menu-actions-wrap {
  height: 0;
  overflow: visible;
}

.main-menu-inner--enter-anim .menu-btn {
  transform: scale(0);
  transform-origin: 50% 50%;
}

.menu-letter-showcase {
  width: fit-content;
  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: calc(96 * var(--rpx));
  box-sizing: border-box;
}

.menu-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
  padding-bottom: calc(4 * var(--rpx));
}

.menu-actions--login {
  align-items: center;
  width: 100%;
}

.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(10 * var(--rpx));
  width: 100%;
  border: none;
  border-radius: var(--radius);
  padding: calc(18 * var(--rpx)) calc(20 * var(--rpx));
  font-family: inherit;
  font-size: calc(30 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow);
  color: #f9f6f2;
  transition: filter 0.12s ease;
}

.menu-btn:disabled {
  cursor: wait;
  filter: brightness(0.95);
}

.menu-btn-icon {
  font-size: calc(32 * var(--rpx));
  opacity: 1;
}

.menu-btn-progress {
  font-size: calc(24 * var(--rpx));
  font-weight: 600;
  opacity: 0.72;
}

.menu-btn:hover:not(:disabled) {
  filter: brightness(1.05);
}

.menu-btn:active:not(:disabled) {
  filter: brightness(0.92);
}

.menu-btn--start {
  background: #5a8fb8;
}

.menu-btn--collection {
  background: #7b68a8;
}

.menu-btn--settings {
  background: #d4954a;
}

.menu-btn--about {
  background: var(--btn-green);
}

.menu-auth-status {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(16 * var(--rpx));
  min-height: calc(120 * var(--rpx));
  font-size: calc(26 * var(--rpx));
  color: var(--text-muted, #776e65);
  text-align: center;
}

.menu-auth-status--blocked {
  gap: calc(20 * var(--rpx));
}

.menu-auth-message,
.menu-auth-hint {
  margin: 0;
  font-size: calc(24 * var(--rpx));
  line-height: 1.45;
  color: var(--text-muted, #776e65);
}

.menu-auth-actions {
  display: flex;
  gap: calc(12 * var(--rpx));
  width: 100%;
  max-width: calc(520 * var(--rpx));
}

.menu-auth-action {
  flex: 1;
  min-width: 0;
}

.menu-auth-spinner {
  width: calc(36 * var(--rpx));
  height: calc(36 * var(--rpx));
  border-radius: 50%;
  border: calc(4 * var(--rpx)) solid rgba(90, 143, 184, 0.22);
  border-top-color: #5a8fb8;
  animation: menu-auth-spin 0.8s linear infinite;
}

@keyframes menu-auth-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
