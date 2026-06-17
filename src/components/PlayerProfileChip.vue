<template>
  <div class="profile-chip-wrap">
    <button
      ref="chipRef"
      type="button"
      class="profile-chip"
      :class="{ 'profile-chip--suppressed': suppressed }"
      :aria-label="`玩家 ${displayName}`"
      @click="onOpenProfile"
    >
      <span class="profile-chip-avatar" :style="avatarStyle">
        <span class="profile-chip-avatar-letter">{{ initialLetter }}</span>
      </span>
      <span class="profile-chip-name">{{ displayName }}</span>
    </button>
    <div v-if="suppressed" class="profile-chip-placeholder" aria-hidden="true">
      <span class="profile-chip-avatar profile-chip-avatar--placeholder" :style="avatarStyle">
        <span class="profile-chip-avatar-letter">{{ initialLetter }}</span>
      </span>
      <span class="profile-chip-name profile-chip-name--placeholder">{{ displayName }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { getProfileInitialLetter, getProfileInitialLetterStyle, playerProfile } from "../profile/playerProfile.js";

defineProps({
  suppressed: { type: Boolean, default: false },
});

const emit = defineEmits(["open-profile"]);

const chipRef = ref(/** @type {HTMLButtonElement | null} */ (null));

function onOpenProfile() {
  const chip = chipRef.value;
  if (!chip) {
    emit("open-profile", null);
    return;
  }
  const avatar = chip.querySelector(".profile-chip-avatar");
  const name = chip.querySelector(".profile-chip-name");
  const chipStyle = getComputedStyle(chip);
  emit("open-profile", {
    chip: chip.getBoundingClientRect(),
    avatar: avatar instanceof HTMLElement ? avatar.getBoundingClientRect() : null,
    name: name instanceof HTMLElement ? name.getBoundingClientRect() : null,
    chipPaint: {
      backgroundColor: chipStyle.backgroundColor,
      boxShadow: chipStyle.boxShadow,
    },
  });
}

const displayName = computed(() => playerProfile.displayName || "Player");
const initialLetter = computed(() => getProfileInitialLetter());
const avatarStyle = computed(() => getProfileInitialLetterStyle());
</script>

<style scoped>
.profile-chip-wrap {
  position: relative;
  display: inline-flex;
  max-width: calc(280 * var(--rpx));
  min-width: 0;
}

.profile-chip {
  position: relative;
  z-index: 1;
  width: auto;
  max-width: 100%;
  display: flex;
  align-items: center;
  gap: calc(10 * var(--rpx));
  padding: calc(8 * var(--rpx)) calc(12 * var(--rpx));
  border: none;
  border-radius: var(--radius);
  background: var(--card-bright);
  box-shadow: var(--shadow);
  cursor: pointer;
  font-family: inherit;
  transition: filter 0.12s ease;
}

.profile-chip-placeholder {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  align-items: center;
  gap: calc(10 * var(--rpx));
  padding: calc(8 * var(--rpx)) calc(12 * var(--rpx));
  border-radius: var(--radius);
  background: var(--card-bright);
  box-shadow: var(--shadow);
  opacity: 0.38;
  pointer-events: none;
  box-sizing: border-box;
  overflow: hidden;
}

.profile-chip-avatar--placeholder,
.profile-chip-name--placeholder {
  opacity: 1;
}

.profile-chip:hover {
  filter: brightness(1.04);
}

.profile-chip:active {
  filter: brightness(0.96);
}

.profile-chip--suppressed {
  visibility: hidden;
  pointer-events: none;
}

.profile-chip-avatar {
  flex-shrink: 0;
  width: calc(52 * var(--rpx));
  height: calc(52 * var(--rpx));
  border-radius: calc(8 * var(--rpx));
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #5a8fb8;
}

.profile-chip-avatar-letter {
  font-size: calc(26 * var(--rpx));
  font-weight: 800;
  color: #f9f6f2;
}

.profile-chip-name {
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
