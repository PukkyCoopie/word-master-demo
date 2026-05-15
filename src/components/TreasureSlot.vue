<template>
  <div
    ref="rootRef"
    class="treasure-slot"
    :class="[
      slotClass,
      {
        filled: treasure != null,
        'treasure-slot--effect-charge': chargeState != null,
        'treasure-slot--effect-charge-active': chargeState === 'active',
      },
    ]"
    :style="{ '--charge-progress': String(clampedChargeProgress) }"
  >
    <template v-if="treasure">
      <span class="letter-gem" :class="gemClass" aria-hidden="true" />
      <span class="treasure-slot-emoji" role="img">{{ treasure.emoji }}</span>
      <span
        v-if="accessoryChipVisual"
        class="treasure-accessory-chip"
        :class="accessoryChipVisual.chipClass"
        aria-hidden="true"
      >
        <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
        <i class="treasure-accessory-chip-icon" :class="accessoryChipVisual.iconClass" aria-hidden="true" />
      </span>
      <i v-if="chargeState != null" class="treasure-charge-corner-icon ri-flashlight-fill" aria-hidden="true"></i>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { getTreasureAccessoryChipVisual } from "../game/treasureAccessories.js";

const props = defineProps({
  treasure: { type: Object, default: null },
  gemClass: { type: String, default: "gem-rare" },
  chargeState: { type: String, default: null },
  chargeProgress: { type: Number, default: 0 },
  slotClass: { type: [String, Array, Object], default: null },
});

const rootRef = ref(null);

const accessoryChipVisual = computed(() =>
  props.treasure ? getTreasureAccessoryChipVisual(props.treasure.treasureAccessoryId) : null,
);

const clampedChargeProgress = computed(() => {
  const n = Number(props.chargeProgress);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
});

defineExpose({
  getEl: () => rootRef.value,
});
</script>
