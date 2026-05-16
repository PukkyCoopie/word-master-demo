<template>
  <Teleport defer to="#game-view-portal">
    <div
      ref="backdropRef"
      class="treasure-detail-backdrop boss-blind-reroll-backdrop"
      :class="{ 'portal-overlay--shop-upgrade-suppressed': overlaySuppressed }"
      :style="backdropStackStyle"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="treasure-detail-header-panel">
        <div class="treasure-detail-header-logo-sizer" aria-hidden="true"></div>
        <div
          class="header-box header-box-split header-box-wallet treasure-detail-wallet"
          title="当前钱包余额"
          @click.stop
        >
          <span class="header-split-label">钱包</span>
          <span class="header-wallet-marks">
            <span class="money-dollar-char">$</span>
            <span class="header-wallet-amount">{{ formatWallet(walletAmount) }}</span>
          </span>
        </div>
      </div>

      <div class="treasure-detail-body">
        <div class="treasure-detail-stack">
          <div class="treasure-detail-title-group">
            <p class="treasure-detail-kind-caption">Boss 关</p>
            <h2 :id="titleId" class="treasure-detail-name">可用的重掷机会</h2>
            <p class="boss-blind-reroll-remaining">{{ rerollRemainingLine }}</p>
          </div>

          <div class="treasure-detail-icon-column">
            <div class="shop-treasure-visual shop-treasure-visual--detail">
              <div class="shop-treasure-frame shop-treasure-frame--detail shop-treasure-frame--voucher-stamp">
                <span class="shop-treasure-emoji shop-treasure-emoji--detail" role="img">{{ voucherEmoji }}</span>
              </div>
            </div>
            <p class="boss-blind-reroll-voucher-name">{{ voucherDisplayName }}</p>
          </div>

          <div v-if="bossDef" class="treasure-detail-desc-card">
            <div class="treasure-detail-desc-panel-title-row">
              <span class="treasure-detail-desc-panel-title-text">下一关 Boss</span>
            </div>
            <p class="boss-blind-reroll-boss-name">{{ bossDef.nameZh }}</p>
            <TreasureDescRichText :description="bossDef.uiDescription" />
          </div>

          <div class="treasure-detail-actions">
            <button
              type="button"
              class="shop-btn shop-btn--reroll"
              :disabled="!canReroll"
              @click="emit('reroll')"
            >
              重掷 ${{ rerollCost }}
            </button>
            <button type="button" class="shop-btn shop-btn--next" @click="emit('continue', $event)">
              继续
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, ref, useId } from "vue";
import { getBossDef } from "../game/bossBlindDefinitions.js";
import { formatVoucherDisplayName } from "../vouchers/voucherDisplay.js";
import { pairHasTier2Owned, getTier2DefForPair } from "../vouchers/voucherDefinitions.js";
import {
  BOSS_BLIND_REROLL_COST_DOLLARS,
  canPayBossBlindReroll,
  getBossBlindRerollsRemaining,
  getVoucherDefOrNull,
} from "../vouchers/voucherRuntime.js";
import { bumpOverlayZ } from "../game/overlayStack.js";
import TreasureDescRichText from "./TreasureDescRichText.vue";

const props = defineProps({
  /** @type {{ levelId: string, slug: string, rerollsUsed: number }} */
  session: { type: Object, required: true },
  walletAmount: { type: Number, default: 0 },
  ownedVoucherIds: { type: Array, default: () => [] },
  overlaySuppressed: { type: Boolean, default: false },
});

const emit = defineEmits(["reroll", "continue"]);

const titleId = useId();
const stackZ = ref(0);
const backdropStackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : undefined));

const rerollCost = BOSS_BLIND_REROLL_COST_DOLLARS;

const ownedSet = computed(() => new Set((props.ownedVoucherIds ?? []).map(String)));

const directorVoucherDef = computed(() => {
  if (ownedSet.value.has("v_director_2")) return getVoucherDefOrNull("v_director_2");
  if (ownedSet.value.has("v_director_1")) return getVoucherDefOrNull("v_director_1");
  return null;
});

const voucherEmoji = computed(() => directorVoucherDef.value?.emoji ?? "🎬");

const voucherDisplayName = computed(() => {
  const d = directorVoucherDef.value;
  if (!d) return "场记板";
  return formatVoucherDisplayName(d, {
    pairHasTier2Owned: pairHasTier2Owned(d.pairId, props.ownedVoucherIds ?? []),
    showTier1Suffix: d.tier === 1 && ownedSet.value.has(getTier2DefForPair("director")?.id ?? ""),
  });
});

const bossDef = computed(() => getBossDef(props.session?.slug));

const rerollsUsed = computed(() => Math.max(0, Math.floor(Number(props.session?.rerollsUsed) || 0)));

const rerollRemainingLine = computed(() => {
  const rem = getBossBlindRerollsRemaining(props.ownedVoucherIds ?? [], rerollsUsed.value);
  if (rem === null) return `可无限重掷（每次 $${rerollCost}）`;
  if (rem <= 0) return "本关重掷次数已用完";
  return `剩余 ${rem} 次重掷（每次 $${rerollCost}）`;
});

const canReroll = computed(() =>
  canPayBossBlindReroll(props.ownedVoucherIds ?? [], rerollsUsed.value, props.walletAmount),
);

function formatWallet(n) {
  return String(Math.max(0, Math.floor(Number(n) || 0)));
}

onMounted(() => {
  stackZ.value = bumpOverlayZ();
});
</script>
