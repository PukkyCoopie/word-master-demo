<template>
  <span v-if="show" class="collection-new-mark" aria-hidden="true">新！</span>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
});
</script>

<style scoped>
.collection-new-mark {
  position: absolute;
  top: calc(-4 * var(--rpx));
  right: calc(-2 * var(--rpx));
  z-index: 4;
  pointer-events: none;
  font-size: calc(22 * var(--rpx));
  font-weight: 900;
  line-height: 1;
  letter-spacing: calc(-0.5 * var(--rpx));
  color: #fff4a8;
  -webkit-text-stroke: calc(2 * var(--rpx)) rgba(36, 28, 8, 0.94);
  paint-order: stroke fill;
  text-shadow:
    0 calc(1 * var(--rpx)) 0 rgba(24, 18, 4, 0.55),
    0 0 calc(4 * var(--rpx)) rgba(255, 220, 80, 0.75);
  animation: collection-new-mark-glow 1.8s ease-in-out infinite;
}

@keyframes collection-new-mark-glow {
  0%,
  100% {
    opacity: 1;
    filter: brightness(1);
  }
  50% {
    opacity: 0.88;
    filter: brightness(1.12);
  }
}

html.reduce-motion .collection-new-mark {
  animation: none;
}
</style>
