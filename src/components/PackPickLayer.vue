<template>
  <Teleport defer to="#game-view-portal">
    <div
      ref="backdropRef"
      class="pack-pick-backdrop portal-overlay-fill"
      :class="{ 'portal-overlay--shop-upgrade-suppressed': overlaySuppressed }"
      :style="backdropStackStyle"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="pack-pick-header-panel">
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

      <div class="pack-pick-body">
        <div class="pack-pick-stack" :class="{ 'pack-pick-stack--wide': isWideOfferRow }">
          <div class="pack-pick-title-block">
            <p class="treasure-detail-kind-caption">{{ kindCaption }}</p>
            <h2 :id="titleId" class="treasure-detail-name">{{ session.title }}</h2>
            <p class="pack-pick-instruction">{{ pickInstruction }}</p>
          </div>

          <div class="pack-pick-offers-panel" :class="{ 'pack-pick-offers-panel--wide': isWideOfferRow }">
            <div class="pack-pick-grid" role="list" aria-label="包内物品">
              <div
                v-for="opt in session.options"
                :key="opt.optionKey || opt.offerInstanceId"
              class="shop-treasure-product pack-pick-offer-product"
              :class="{ 'pack-pick-offer-product--claimed': isClaimed(opt) }"
            >
              <div
                class="shop-treasure-visual"
                :class="{ 'shop-treasure-visual--deck-offer': isDeckOffer(opt) }"
                :ref="(el) => setCellRootRef(opt, el)"
                @pointerdown.stop="!disabled && onOpenItem(opt, $event)"
              >
                <LetterTile
                  v-if="isDeckOffer(opt)"
                  variant="grid"
                  class="shop-shelf-letter-tile pack-pick-fly-source"
                  :letter="displayLetter(opt)"
                  :rarity="opt.letterRarity ?? opt.rarity ?? 'common'"
                  :material-id="opt.offerType === 'deckTile' ? opt.deckTileMaterialId : undefined"
                  :accessory-id="deckOfferAccessoryId(opt)"
                  :treasure-accessory-id="deckOfferTreasureAccessoryId(opt)"
                  :tile-score-bonus="0"
                  :tile-mult-bonus="0"
                />
                <div v-else class="shop-treasure-frame pack-pick-fly-source" :class="frameClassFor(opt)">
                  <template v-if="opt.offerType === 'spell'">
                    <i
                      v-if="opt.iconClass"
                      class="shop-treasure-emoji shop-treasure-emoji--icon"
                      :class="opt.iconClass"
                      aria-hidden="true"
                    ></i>
                  </template>
                  <template v-else-if="opt.offerType === 'upgrade'">
                    <i
                      v-if="opt.iconClass"
                      class="shop-treasure-emoji shop-treasure-emoji--icon"
                      :class="opt.iconClass"
                      aria-hidden="true"
                    ></i>
                    <span
                      v-if="opt.upgradeKind === 'rarity' && (opt.lengthBadgeLabel || opt.lengthLabel)"
                      class="shop-pack-rarity-caption"
                      >{{ opt.lengthBadgeLabel || opt.lengthLabel }}</span
                    >
                    <span
                      v-else-if="opt.lengthBadgeLabel || opt.lengthLabel"
                      class="shop-upgrade-length"
                      :class="{
                        'shop-upgrade-length--single-digit': isSingleDigitLabel(
                          opt.lengthBadgeLabel || opt.lengthLabel,
                        ),
                      }"
                      >{{ opt.lengthBadgeLabel || opt.lengthLabel }}</span
                    >
                  </template>
                  <template v-else>
                    <span
                      class="letter-gem"
                      :class="gemClassFor(opt.letterRarity ?? opt.rarity)"
                      aria-hidden="true"
                    />
                    <span class="shop-treasure-emoji" role="img">{{ opt.emoji }}</span>
                    <span
                      v-if="treasureAccessoryChip(opt)"
                      class="treasure-accessory-chip"
                      :class="treasureAccessoryChip(opt).chipClass"
                      aria-hidden="true"
                    >
                      <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
                      <i
                        class="treasure-accessory-chip-icon"
                        :class="treasureAccessoryChip(opt).iconClass"
                        aria-hidden="true"
                      />
                    </span>
                  </template>
                </div>
                <div class="shop-treasure-price" aria-label="参考售价">
                  <div class="shop-treasure-price-inner shop-treasure-price-inner--pack-struck">
                    ${{ markPrice(opt.price) }}
                  </div>
                </div>
                <span v-if="isClaimed(opt)" class="pack-pick-claimed-badge" aria-hidden="true">已获取</span>
              </div>
            </div>
            </div>
          </div>

          <div class="treasure-detail-actions pack-pick-actions">
            <button type="button" class="shop-btn shop-btn--next" :disabled="disabled" @click="onSkip">
              跳过
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, useId } from "vue";
import LetterTile from "./LetterTile.vue";
import { getTreasureAccessoryChipVisual } from "../game/treasureAccessories.js";
import { applyShopDiscountPrice } from "../vouchers/voucherRuntime.js";
import { bumpOverlayZ } from "../game/overlayStack.js";

const props = defineProps({
  session: { type: Object, required: true },
  walletAmount: { type: Number, default: 0 },
  ownedVoucherIds: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  /** 商店升级动效播放时暂隐（保留 session，动效结束后再显示） */
  overlaySuppressed: { type: Boolean, default: false },
});

const emit = defineEmits(["open-item", "skip"]);

const titleId = useId();
const backdropRef = ref(null);
const stackZ = ref(0);
const backdropStackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : undefined));

/** @type {Map<string, HTMLElement | null>} */
const cellRoots = new Map();

function optionKeyOf(opt) {
  return String(opt?.optionKey ?? opt?.offerInstanceId ?? "");
}

function setCellRootRef(opt, el) {
  const k = optionKeyOf(opt);
  if (!k) return;
  const node = /** @type {HTMLElement | null} */ (el);
  if (node) cellRoots.set(k, node);
  else cellRoots.delete(k);
}

function getFlySourceEl(opt) {
  const root = cellRoots.get(optionKeyOf(opt));
  return root?.querySelector?.(".pack-pick-fly-source") ?? root ?? null;
}

defineExpose({ getFlySourceEl });

const requiredPicks = computed(() => {
  const pc = Math.max(1, Math.floor(Number(props.session?.pickCount) || 1));
  const n = Array.isArray(props.session?.options) ? props.session.options.length : 0;
  return Math.min(pc, Math.max(1, n));
});

const optionCount = computed(() =>
  Array.isArray(props.session?.options) ? props.session.options.length : 0,
);

/** 巨型/超级包 5 选：单行排满货架格 */
const isWideOfferRow = computed(() => optionCount.value >= 5);

const pickInstruction = computed(
  () => `从下列 ${optionCount.value} 项中选择 ${requiredPicks.value} 项`,
);

const kindCaption = computed(() => {
  const k = String(props.session?.bundleKind ?? "");
  if (k === "spell") return "法术包";
  if (k === "upgrade") return "升级包";
  if (k === "treasure") return "宝藏包";
  if (k === "letter") return "字母包";
  if (k === "tile") return "字母包";
  return "组合包";
});

function formatWallet(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

function markPrice(base) {
  return applyShopDiscountPrice(Number(base) || 0, props.ownedVoucherIds ?? []);
}

function displayLetter(opt) {
  const raw = String(opt?.deckLetterRaw ?? "a").toLowerCase();
  return raw === "q" ? "Qu" : raw.toUpperCase();
}

function isDeckOffer(opt) {
  return opt?.offerType === "deckLetter" || opt?.offerType === "deckTile";
}

function deckOfferAccessoryId(opt) {
  if (!opt || opt.offerType !== "deckTile") return undefined;
  const id = opt.deckTileAccessoryId;
  const s = id != null ? String(id).trim() : "";
  return s || undefined;
}

function deckOfferTreasureAccessoryId(opt) {
  if (!opt || opt.offerType !== "deckTile") return undefined;
  const id = opt.deckTileTreasureAccessoryId;
  const s = id != null ? String(id).trim() : "";
  return s || undefined;
}

function gemClassFor(rarity) {
  if (rarity === "epic") return "gem-epic";
  if (rarity === "legendary") return "gem-legendary";
  if (rarity === "common") return "gem-common";
  return "gem-rare";
}

function isSingleDigitLabel(label) {
  return /^\d$/.test(String(label ?? "").trim());
}

function treasureAccessoryChip(opt) {
  if (!opt || opt.offerType !== "treasure") return null;
  return getTreasureAccessoryChipVisual(opt.treasureAccessoryId);
}

function frameClassFor(opt) {
  return {
    "shop-treasure-frame--length-offer":
      opt.offerType === "upgrade" &&
      opt.upgradeKind !== "rarity" &&
      (opt.lengthBadgeLabel || opt.lengthLabel),
    "shop-treasure-frame--pack-rarity": opt.offerType === "upgrade" && opt.upgradeKind === "rarity",
    "shop-treasure-frame--spell-offer": opt.offerType === "spell",
  };
}

function isClaimed(opt) {
  const keys = props.session?.claimedKeys;
  if (!Array.isArray(keys)) return false;
  return keys.includes(optionKeyOf(opt));
}

function onOpenItem(opt, e) {
  const root = e?.currentTarget;
  const flySrc = getFlySourceEl(opt) ?? root;
  emit("open-item", {
    item: opt,
    optionKey: optionKeyOf(opt),
    originEl: flySrc,
  });
}

function onSkip() {
  if (props.disabled) return;
  emit("skip");
}

onMounted(() => {
  stackZ.value = bumpOverlayZ();
});

onUnmounted(() => {
  stackZ.value = 0;
  cellRoots.clear();
});
</script>
