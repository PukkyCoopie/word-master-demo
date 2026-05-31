<template>
  <span class="unlock-fresh-pill" aria-label="新解锁">新！</span>
</template>

<style scoped>
.unlock-fresh-pill {
  position: absolute;
  top: calc(8 * var(--rpx));
  right: calc(8 * var(--rpx));
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: calc(2 * var(--rpx)) calc(8 * var(--rpx));
  border-radius: calc(999 * var(--rpx));
  background: #7ec89a;
  color: #fff;
  font-size: calc(16 * var(--rpx));
  font-weight: 700;
  line-height: 1.2;
  box-shadow: var(--shadow, 0 calc(2 * var(--rpx)) calc(4 * var(--rpx)) rgba(0, 0, 0, 0.12));
  pointer-events: none;
}
</style>
