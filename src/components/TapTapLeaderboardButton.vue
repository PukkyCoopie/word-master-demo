<template>
  <button
    type="button"
    class="taptap-leaderboard-btn"
    aria-label="排行榜"
    @click="$emit('open')"
  >
    <i class="ri-trophy-line taptap-leaderboard-btn__icon" aria-hidden="true"></i>
  </button>
</template>

<script setup>
defineEmits(["open"]);
</script>

<style scoped>
.taptap-leaderboard-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(68 * var(--rpx));
  height: calc(68 * var(--rpx));
  padding: 0;
  border: none;
  border-radius: var(--radius);
  background: var(--card-bright);
  box-shadow: var(--shadow);
  cursor: pointer;
  font-family: inherit;
  transition: filter 0.12s ease;
}

.taptap-leaderboard-btn:hover {
  filter: brightness(1.04);
}

.taptap-leaderboard-btn:active {
  filter: brightness(0.96);
}

.taptap-leaderboard-btn__icon {
  font-size: calc(32 * var(--rpx));
  color: #c9a227;
}
</style>
