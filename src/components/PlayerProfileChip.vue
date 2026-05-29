<template>
  <button
    ref="chipRef"
    type="button"
    class="profile-chip"
    :class="{ 'profile-chip--suppressed': suppressed }"
    :aria-label="`玩家 ${displayName}`"
    @click="onOpenProfile"
  >
    <span class="profile-chip-avatar" :style="avatarStyle">
      <img v-if="avatarUrl" :src="avatarUrl" alt="" class="profile-chip-avatar-img" />
      <span v-else class="profile-chip-avatar-letter">{{ initialLetter }}</span>
    </span>
    <span class="profile-chip-name">{{ displayName }}</span>
  </button>
</template>

<script setup>
import { computed, ref } from "vue";
import { getProfileInitialLetter, playerProfile } from "../profile/playerProfile.js";

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
const avatarUrl = computed(() => playerProfile.avatarDataUrl);
const initialLetter = computed(() => getProfileInitialLetter());

const avatarStyle = computed(() => {
  if (avatarUrl.value) return undefined;
  const ch = initialLetter.value.charCodeAt(0) || 80;
  const hue = (ch * 17) % 360;
  return { background: `hsl(${hue} 42% 62%)` };
});
</script>

<style scoped>
.profile-chip {
  position: absolute;
  top: var(--menu-padding, calc(56 * var(--rpx)));
  left: var(--menu-padding, calc(56 * var(--rpx)));
  z-index: 2;
  width: auto;
  display: flex;
  align-items: center;
  gap: calc(10 * var(--rpx));
  max-width: calc(280 * var(--rpx));
  padding: calc(8 * var(--rpx)) calc(12 * var(--rpx));
  border: none;
  border-radius: var(--radius);
  background: var(--card-bright);
  box-shadow: var(--shadow);
  cursor: pointer;
  font-family: inherit;
  transition: filter 0.12s ease;
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

.profile-chip-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
