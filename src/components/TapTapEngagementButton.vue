<template>
  <button
    type="button"
    class="taptap-engagement-btn"
    aria-label="评价和反馈"
    @click="$emit('open')"
  >
    <i class="ri-edit-line taptap-engagement-btn__icon" aria-hidden="true"></i>
  </button>
</template>

<script setup>
defineEmits(["open"]);
</script>

<style scoped>
.taptap-engagement-btn {
  position: absolute;
  top: var(--menu-padding, calc(56 * var(--rpx)));
  right: var(--menu-padding, calc(56 * var(--rpx)));
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(68 * var(--rpx));
  height: calc(68 * var(--rpx));
  padding: 0;
  border: none;
  border-radius: var(--radius);
  background: #00d9c5;
  box-shadow: var(--shadow);
  cursor: pointer;
  font-family: inherit;
  transition: filter 0.12s ease;
}

.taptap-engagement-btn:hover {
  filter: brightness(1.05);
}

.taptap-engagement-btn:active {
  filter: brightness(0.94);
}

.taptap-engagement-btn__icon {
  font-size: calc(32 * var(--rpx));
  color: #f9f6f2;
}
</style>
