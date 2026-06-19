<template>
  <div
    ref="rootRef"
    class="treasure-slot"
    :data-treasure-slot-index="slotIndex != null ? String(slotIndex) : undefined"
    :class="[
      slotClass,
      {
        filled: treasure != null,
        'treasure-slot--effect-charge': chargeState != null,
        'treasure-slot--effect-charge-active': chargeState === 'active',
        'treasure-slot--boss-hand-disabled': crimsonHandDisabled,
        'treasure-slot--accessory-expired': accessoryExpired,
        'treasure-slot--amber-mask': amberBossMask,
      },
    ]"
    :style="{ '--charge-progress': String(clampedChargeProgress) }"
  >
    <template v-if="treasure">
      <span class="letter-gem" :class="gemClass" aria-hidden="true" />
      <span class="treasure-slot-emoji" role="img">{{ amberBossMask ? "?" : treasure.emoji }}</span>
      <div
        v-if="accessoryChipVisuals.length && !amberBossMask"
        class="treasure-accessory-chip-stack"
        aria-hidden="true"
      >
        <span
          v-for="(chip, i) in accessoryChipVisuals"
          :key="`${chip.chipClass}-${i}`"
          class="treasure-accessory-chip"
          :class="chip.chipClass"
        >
          <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
          <i class="treasure-accessory-chip-icon" :class="chip.iconClass" aria-hidden="true" />
        </span>
      </div>
      <i v-if="chargeState != null" class="treasure-charge-corner-icon ri-flashlight-fill" aria-hidden="true"></i>
      <i v-if="crimsonHandDisabled" class="treasure-boss-hand-lock ri-lock-fill" aria-hidden="true"></i>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { getTreasureAccessoryChipVisualsFromEntity } from "../game/treasureAccessories.js";

const props = defineProps({
  /** 槽位索引：供 pointer 拖动时 hit-test */
  slotIndex: { type: Number, default: null },
  treasure: { type: Object, default: null },
  gemClass: { type: String, default: "gem-rare" },
  chargeState: { type: String, default: null },
  chargeProgress: { type: Number, default: 0 },
  slotClass: { type: [String, Array, Object], default: null },
  /** 终局琥珀橡子：槽位显示问号并隐藏配饰角标 */
  amberBossMask: { type: Boolean, default: false },
  /** 绯红之心：本手计分禁用槽压暗 + 锁角标 */
  crimsonHandDisabled: { type: Boolean, default: false },
});

const rootRef = ref(null);

const accessoryChipVisuals = computed(() =>
  props.treasure ? getTreasureAccessoryChipVisualsFromEntity(props.treasure) : [],
);

const accessoryExpired = computed(() => props.treasure?.treasureAccessoryExpired === true);

const clampedChargeProgress = computed(() => {
  const n = Number(props.chargeProgress);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
});

defineExpose({
  getEl: () => rootRef.value,
});
</script>
