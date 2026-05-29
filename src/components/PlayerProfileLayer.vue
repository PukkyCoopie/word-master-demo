<template>
  <div
    v-if="open"
    ref="backdropRef"
    class="profile-layer-backdrop"
    :class="{ 'profile-layer-backdrop--boot': enterPending }"
    role="presentation"
  >
    <div ref="scrimRef" class="profile-layer-scrim" aria-hidden="true" @click="requestClose" />
    <div
      ref="cardRef"
      class="profile-layer-card"
      :class="{ 'profile-layer-card--enter-pending': enterPending }"
      role="dialog"
      aria-modal="true"
      aria-label="玩家资料"
      @click.stop
    >
      <button
        type="button"
        class="profile-layer-close profile-layer-enter-stagger"
        aria-label="关闭"
        @click="requestClose"
      >
        <i class="ri-close-line" aria-hidden="true" />
      </button>

      <section class="profile-section">
        <button
          type="button"
          class="profile-avatar-btn profile-layer-enter-stagger profile-layer-enter-sync-avatar-fly"
          @click="triggerAvatarPick"
        >
          <span ref="avatarMeasureRef" class="profile-avatar-large" :style="avatarBlockStyle">
            <img v-if="avatarUrl" :src="avatarUrl" alt="" class="profile-avatar-img" />
            <span v-else class="profile-avatar-letter">{{ initialLetter }}</span>
          </span>
          <span class="profile-avatar-hint profile-layer-enter-stagger">点击更换头像</span>
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="profile-file-input"
          @change="onAvatarFileChange"
        />
        <div class="profile-name-toolbar profile-layer-enter-stagger profile-layer-enter-sync-name-fly">
          <div class="profile-name-input-shell">
            <input
              :id="nameInputId"
              v-model="nameDraft"
              type="text"
              class="profile-name-input"
              aria-label="昵称"
              maxlength="16"
              @blur="commitName"
              @keydown.enter.prevent="commitName"
            />
            <span ref="nameTextMeasureRef" class="profile-name-text-measure" aria-hidden="true">{{
              nameDraft
            }}</span>
          </div>
          <button
            type="button"
            class="profile-icon-btn profile-icon-btn--switch"
            aria-label="切换存档"
            @click="$emit('switch-save')"
          >
            <i class="ri-arrow-left-right-line" aria-hidden="true" />
          </button>
        </div>
        <button
          v-if="avatarUrl"
          type="button"
          class="profile-clear-avatar profile-layer-enter-stagger"
          @click="onClearAvatar"
        >
          清除头像
        </button>
      </section>

      <section class="profile-section">
        <h3 class="profile-section-title profile-layer-enter-stagger">生涯数据</h3>
        <div class="profile-stats-grid">
          <div
            v-for="row in careerRows"
            :key="row.label"
            class="profile-stat-cell profile-layer-enter-stagger"
          >
            <span class="profile-stat-value">{{ row.value }}</span>
            <span class="profile-stat-label">{{ row.label }}</span>
          </div>
        </div>
      </section>

      <p v-if="avatarError" class="profile-error profile-layer-enter-stagger" role="alert">{{ avatarError }}</p>
    </div>

    <div v-if="flyClonesActive" class="profile-fly-layer" aria-hidden="true">
      <div
        ref="avatarFlyRef"
        class="profile-fly-clone profile-fly-clone--avatar"
        :style="[avatarFlyBoxStyle, avatarBlockStyle]"
      >
        <img v-if="avatarUrl" :src="avatarUrl" alt="" class="profile-fly-clone-img" />
        <span v-else ref="avatarFlyLetterRef" class="profile-fly-clone-letter">{{ initialLetter }}</span>
      </div>
      <div ref="nameFlyRef" class="profile-fly-clone profile-fly-clone--name" :style="nameFlyBoxStyle">
        {{ displayName }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import {
  clearAvatar,
  getProfileInitialLetter,
  playerProfile,
  setAvatarFromFile,
  setDisplayName,
} from "../profile/playerProfile.js";
import {
  collectProfileEnterStaggerEls,
  killProfileLayerAnim,
  playProfileLayerEnter,
  playProfileLayerLeave,
  profileFlyBoxStyle,
  profileTextFlyBoxStyle,
  validProfileOriginRects,
} from "../profile/profileLayerEnterAnim.js";
import { getSlotCareer } from "../save/runSaveStorage.js";
import { getSlotCareerStatRows } from "../save/slotCareerStats.js";

const props = defineProps({
  open: { type: Boolean, default: false },
  originRects: { type: /** @type {import('vue').PropType<{ chip: DOMRect, avatar: DOMRect | null, name: DOMRect | null } | null>} */ (Object), default: null },
  activeSlot: { type: Number, default: 0 },
  refreshKey: { type: Number, default: 0 },
});

const emit = defineEmits(["close", "switch-save"]);

const nameInputId = "player-profile-name";
const nameDraft = ref(playerProfile.displayName);
const fileInputRef = ref(/** @type {HTMLInputElement | null} */ (null));
const avatarError = ref("");
const closing = ref(false);
const flyClonesActive = ref(false);
const enterPending = ref(false);

const backdropRef = ref(/** @type {HTMLElement | null} */ (null));
const scrimRef = ref(/** @type {HTMLElement | null} */ (null));
const cardRef = ref(/** @type {HTMLElement | null} */ (null));
const avatarMeasureRef = ref(/** @type {HTMLElement | null} */ (null));
const nameTextMeasureRef = ref(/** @type {HTMLSpanElement | null} */ (null));
const avatarFlyRef = ref(/** @type {HTMLElement | null} */ (null));
const avatarFlyLetterRef = ref(/** @type {HTMLSpanElement | null} */ (null));
const nameFlyRef = ref(/** @type {HTMLElement | null} */ (null));

/** @type {import('gsap').core.Timeline | null} */
let enterTl = null;

const displayName = computed(() => playerProfile.displayName || "Player");
const avatarUrl = computed(() => playerProfile.avatarDataUrl);
const initialLetter = computed(() => getProfileInitialLetter());

const avatarBlockStyle = computed(() => {
  if (avatarUrl.value) return undefined;
  const ch = initialLetter.value.charCodeAt(0) || 80;
  const hue = (ch * 17) % 360;
  return { background: `hsl(${hue} 42% 62%)` };
});

const careerRows = computed(() => {
  void props.refreshKey;
  return getSlotCareerStatRows(getSlotCareer(props.activeSlot));
});

const avatarFlyBoxStyle = computed(() => {
  if (!flyClonesActive.value) return profileFlyBoxStyle(null);
  return profileFlyBoxStyle(props.originRects?.avatar ?? null);
});

const nameFlyBoxStyle = computed(() => {
  if (!flyClonesActive.value) return profileTextFlyBoxStyle(null);
  return profileTextFlyBoxStyle(props.originRects?.name ?? null);
});

function collectAnimRefs() {
  const card = cardRef.value;
  return {
    backdrop: backdropRef.value,
    scrim: scrimRef.value,
    card,
    avatarMeasure: avatarMeasureRef.value,
    nameMeasure: nameTextMeasureRef.value,
    avatarFly: avatarFlyRef.value,
    avatarFlyLetter: avatarFlyLetterRef.value,
    nameFly: nameFlyRef.value,
    enterStaggerEls: collectProfileEnterStaggerEls(card),
  };
}

function waitForLayout() {
  return nextTick()
    .then(() => (document.fonts?.ready != null ? document.fonts.ready : Promise.resolve()))
    .then(
      () =>
        new Promise((r) => {
          requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)));
        }),
    );
}

function runEnterAnimation() {
  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }

  enterPending.value = true;
  flyClonesActive.value = false;

  waitForLayout()
    .then(() => nextTick())
    .then(() => {
      if (!props.open || !backdropRef.value) {
        enterPending.value = false;
        return null;
      }
      if (validProfileOriginRects(props.originRects)) {
        flyClonesActive.value = true;
      }
      return nextTick();
    })
    .then(() => {
      if (!props.open || !backdropRef.value) {
        enterPending.value = false;
        return;
      }
      enterTl = playProfileLayerEnter(collectAnimRefs(), props.originRects);
      requestAnimationFrame(() => {
        if (props.open) enterPending.value = false;
      });
    });
}

async function requestClose() {
  if (closing.value) return;
  closing.value = true;
  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }
  await playProfileLayerLeave(collectAnimRefs());
  closing.value = false;
  flyClonesActive.value = false;
  emit("close");
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      enterPending.value = true;
      nameDraft.value = playerProfile.displayName;
      avatarError.value = "";
      runEnterAnimation();
      return;
    }
    enterPending.value = false;
    if (enterTl) {
      enterTl.kill();
      enterTl = null;
    }
    flyClonesActive.value = false;
  },
  { immediate: true, flush: "sync" },
);

function commitName() {
  setDisplayName(nameDraft.value);
  nameDraft.value = playerProfile.displayName;
}

function triggerAvatarPick() {
  fileInputRef.value?.click();
}

/** @param {Event} e */
async function onAvatarFileChange(e) {
  const input = /** @type {HTMLInputElement} */ (e.target);
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  avatarError.value = "";
  const ok = await setAvatarFromFile(file, "upload");
  if (!ok) avatarError.value = "头像过大或格式不支持，请换一张较小的图片";
}

function onClearAvatar() {
  clearAvatar();
  avatarError.value = "";
}

onUnmounted(() => {
  if (enterTl) enterTl.kill();
  killProfileLayerAnim(collectAnimRefs());
});
</script>

<style scoped>
.profile-layer-backdrop {
  position: absolute;
  inset: 0;
  z-index: 280;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24 * var(--rpx));
  box-sizing: border-box;
}

.profile-layer-backdrop--boot .profile-layer-scrim {
  opacity: 0;
}

.profile-layer-backdrop--boot .profile-fly-layer {
  visibility: hidden;
}

.profile-layer-scrim {
  position: absolute;
  inset: 0;
  background: rgba(60, 58, 50, 0.45);
  border-radius: calc(12 * var(--rpx));
}

.profile-layer-card {
  position: relative;
  width: 100%;
  max-width: calc(680 * var(--rpx));
  max-height: 90%;
  overflow-y: auto;
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(28 * var(--rpx)) calc(24 * var(--rpx)) calc(22 * var(--rpx));
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.profile-layer-card--enter-pending {
  opacity: 0;
  pointer-events: none;
}

.profile-fly-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.profile-fly-clone {
  visibility: hidden;
  opacity: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.profile-fly-clone--avatar {
  border-radius: calc(8 * var(--rpx));
  background: #5a8fb8;
}

.profile-fly-clone-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.profile-fly-clone-letter {
  font-size: calc(42 * var(--rpx));
  font-weight: 800;
  color: #f9f6f2;
  line-height: 1;
}

.profile-fly-clone--name {
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
  white-space: nowrap;
  overflow: visible;
  justify-content: flex-start;
  align-items: center;
  width: auto;
  height: auto;
  min-width: 0;
}

.profile-layer-close {
  position: absolute;
  top: calc(12 * var(--rpx));
  right: calc(12 * var(--rpx));
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(44 * var(--rpx));
  height: calc(44 * var(--rpx));
  padding: 0;
  border: none;
  border-radius: calc(8 * var(--rpx));
  background: var(--card);
  color: var(--text-muted, #776e65);
  cursor: pointer;
  box-shadow: var(--shadow);
  font-family: inherit;
  transition: filter 0.12s ease;
}

.profile-layer-close i {
  font-size: calc(28 * var(--rpx));
  line-height: 1;
}

.profile-layer-close:hover {
  filter: brightness(1.05);
}

.profile-layer-close:active {
  filter: brightness(0.94);
}

.profile-section {
  margin-bottom: calc(18 * var(--rpx));
}

.profile-section-title {
  margin: 0 0 calc(10 * var(--rpx));
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
}

.profile-avatar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(8 * var(--rpx));
  margin: 0 auto calc(14 * var(--rpx));
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-family: inherit;
}

.profile-avatar-large {
  width: calc(96 * var(--rpx));
  height: calc(96 * var(--rpx));
  border-radius: calc(10 * var(--rpx));
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #5a8fb8;
  box-shadow: var(--shadow);
}

.profile-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar-letter {
  font-size: calc(42 * var(--rpx));
  font-weight: 800;
  color: #f9f6f2;
}

.profile-avatar-hint {
  font-size: calc(20 * var(--rpx));
  color: var(--text-muted, #776e65);
}

.profile-file-input {
  display: none;
}

.profile-name-toolbar {
  display: flex;
  align-items: center;
  gap: calc(8 * var(--rpx));
}

.profile-name-input-shell {
  flex: 1;
  min-width: 0;
  position: relative;
}

.profile-name-text-measure {
  position: absolute;
  left: calc(14 * var(--rpx));
  top: 50%;
  visibility: hidden;
  pointer-events: none;
  white-space: nowrap;
  font-family: inherit;
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  line-height: 1;
  transform: translateY(-50%);
}

.profile-name-input {
  width: 100%;
  box-sizing: border-box;
  padding: calc(12 * var(--rpx)) calc(14 * var(--rpx));
  border: none;
  border-radius: calc(8 * var(--rpx));
  background: var(--card);
  font-family: inherit;
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
}

.profile-icon-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(52 * var(--rpx));
  height: calc(52 * var(--rpx));
  padding: 0;
  border: none;
  border-radius: calc(8 * var(--rpx));
  cursor: pointer;
  font-family: inherit;
  box-shadow: var(--shadow);
  transition: filter 0.12s ease;
}

.profile-icon-btn i {
  font-size: calc(28 * var(--rpx));
  line-height: 1;
}

.profile-icon-btn--switch {
  background: #5a8fb8;
  color: #f9f6f2;
}

.profile-icon-btn:hover {
  filter: brightness(1.05);
}

.profile-icon-btn:active {
  filter: brightness(0.92);
}

.profile-clear-avatar {
  margin-top: calc(8 * var(--rpx));
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: calc(20 * var(--rpx));
  color: var(--text-muted, #776e65);
  cursor: pointer;
  text-decoration: underline;
}

.profile-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(8 * var(--rpx));
}

.profile-stat-cell {
  background: var(--card);
  border-radius: calc(8 * var(--rpx));
  padding: calc(12 * var(--rpx));
  display: flex;
  flex-direction: column;
  gap: calc(4 * var(--rpx));
}

.profile-stat-value {
  font-size: calc(22 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
  word-break: break-word;
}

.profile-stat-label {
  font-size: calc(18 * var(--rpx));
  color: var(--text-muted, #776e65);
}

.profile-error {
  margin: calc(10 * var(--rpx)) 0 0;
  font-size: calc(20 * var(--rpx));
  color: #c85a54;
  text-align: center;
}
</style>
