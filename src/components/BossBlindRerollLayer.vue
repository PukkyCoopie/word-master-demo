<template>
  <Teleport defer to="#game-view-portal-frame">
    <div
      ref="backdropRef"
      class="treasure-detail-backdrop boss-blind-reroll-backdrop portal-overlay-fill"
      :class="{ 'portal-overlay--shop-upgrade-suppressed': overlaySuppressed }"
      :style="backdropStackStyle"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="treasure-detail-header-panel boss-blind-reroll-stagger">
        <div class="treasure-detail-header-logo-sizer" aria-hidden="true"></div>
        <div
          class="header-box header-box-split header-box-wallet treasure-detail-wallet"
          title="当前钱包余额"
          @click.stop
        >
          <span class="header-split-label">钱包</span>
          <span class="header-wallet-marks" :class="{ 'money-tone--debt': walletAmount < 0 }">
            <span class="money-dollar-char">$</span>
            <span class="header-wallet-amount">{{ formatWallet(walletAmount) }}</span>
          </span>
        </div>
      </div>

      <div class="treasure-detail-body">
        <div class="treasure-detail-stack">
          <div class="treasure-detail-title-group boss-blind-reroll-stagger">
            <p class="treasure-detail-kind-caption">Boss 关</p>
            <h2 :id="titleId" class="treasure-detail-name">可用的重掷机会</h2>
            <p class="boss-blind-reroll-remaining">{{ rerollRemainingLine }}</p>
          </div>

          <div class="treasure-detail-icon-column boss-blind-reroll-stagger">
            <div class="shop-treasure-visual shop-treasure-visual--detail">
              <div class="shop-treasure-frame shop-treasure-frame--detail shop-treasure-frame--voucher-stamp">
                <span class="shop-treasure-emoji shop-treasure-emoji--detail" role="img">{{ voucherEmoji }}</span>
              </div>
            </div>
            <p class="boss-blind-reroll-voucher-name">{{ voucherDisplayName }}</p>
          </div>

          <div v-if="bossDef" class="treasure-detail-desc-card boss-blind-reroll-stagger">
            <div class="treasure-detail-desc-panel-title-row">
              <span class="treasure-detail-desc-panel-title-text">下一关 Boss</span>
            </div>
            <p class="boss-blind-reroll-boss-name">{{ bossDef.nameZh }}</p>
            <TreasureDescRichText :description="bossDef.uiDescription" />
          </div>

          <div class="treasure-detail-actions boss-blind-reroll-stagger">
            <button
              type="button"
              class="shop-btn shop-btn--reroll boss-blind-reroll-btn"
              :disabled="!canReroll"
              @click="emit('reroll')"
            >
              <span class="shop-btn-reroll-price" aria-label="重掷费用">
                <span class="shop-btn-reroll-dollar">$</span>{{ rerollCost }}
              </span>
              <span class="shop-btn-reroll-lead">重掷</span>
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
import { computed, onMounted, onUnmounted, ref, useId } from "vue";
import gsap from "gsap";
import { portalScrimGsapVars } from "../game/portalScrimBleed.js";
import { EASE_TRANSFORM } from "../constants.js";
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
import { instantPortalLayerClose, shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";
import TreasureDescRichText from "./TreasureDescRichText.vue";

const props = defineProps({
  /** @type {{ levelId: string, slug: string, rerollsUsed: number }} */
  session: { type: Object, required: true },
  walletAmount: { type: Number, default: 0 },
  walletFloor: { type: Number, default: 0 },
  ownedVoucherIds: { type: Array, default: () => [] },
  overlaySuppressed: { type: Boolean, default: false },
});

const emit = defineEmits(["reroll", "continue"]);

const titleId = useId();
const backdropRef = ref(null);
const stackZ = ref(0);
const closing = ref(false);
const backdropStackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : undefined));

const BOSS_BLIND_SCRIM_TRANSPARENT = "rgba(14, 12, 10, 0)";

/** @type {gsap.core.Timeline | null} */
let closeTl = null;

function collectStaggerEls() {
  const root = backdropRef.value;
  if (!root) return [];
  return Array.from(root.querySelectorAll(".boss-blind-reroll-stagger"));
}

/**
 * @returns {Promise<void>}
 */
function playClose() {
  if (closing.value) return Promise.resolve();
  closing.value = true;

  const backdrop = backdropRef.value;
  const staggerEls = collectStaggerEls();

  if (closeTl) {
    closeTl.kill();
    closeTl = null;
  }
  gsap.killTweensOf([backdrop, ...staggerEls].filter(Boolean));

  if (!backdrop && !staggerEls.length) {
    closing.value = false;
    return Promise.resolve();
  }

  if (shouldSkipDecorativeMotion()) {
    return instantPortalLayerClose({ backdrop, staggerEls }).then(() => {
      closing.value = false;
    });
  }

  return new Promise((resolve) => {
    closeTl = gsap.timeline({
      onComplete: () => {
        closeTl = null;
        closing.value = false;
        resolve(undefined);
      },
    });

    if (backdrop) {
      closeTl.to(
        backdrop,
        {
          ...portalScrimGsapVars(BOSS_BLIND_SCRIM_TRANSPARENT),
          duration: 0.22,
          ease: EASE_TRANSFORM,
        },
        0,
      );
    }

    const rev = [...staggerEls].reverse();
    if (rev.length) {
      closeTl.to(
        rev,
        {
          opacity: 0,
          y: 5,
          duration: 0.12,
          stagger: 0.028,
          ease: EASE_TRANSFORM,
        },
        0,
      );
    }
  });
}

defineExpose({ playClose });

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
  canPayBossBlindReroll(
    props.ownedVoucherIds ?? [],
    rerollsUsed.value,
    props.walletAmount,
    props.walletFloor,
  ),
);

function formatWallet(n) {
  return String(Math.floor(Number(n) || 0));
}

onMounted(() => {
  stackZ.value = bumpOverlayZ();
});

onUnmounted(() => {
  if (closeTl) {
    closeTl.kill();
    closeTl = null;
  }
});
</script>
