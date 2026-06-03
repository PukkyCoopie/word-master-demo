<template>
  <span
    class="collection-prerequisite-badge"
    :class="{ 'collection-prerequisite-badge--panel': panel }"
    aria-hidden="true"
  >
    <i class="ri-error-warning-fill collection-prerequisite-badge__icon" aria-hidden="true"></i>
  </span>
</template>

<script setup>
defineProps({
  /** 详情「前置条件」标题行：略大一号 */
  panel: { type: Boolean, default: false },
});
</script>
