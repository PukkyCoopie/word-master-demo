<template>
  <Teleport defer to="#game-view-portal">
    <div
      ref="backdropRef"
      class="treasure-detail-backdrop"
      :class="{
        'treasure-detail-backdrop--boot': bootMask,
        'treasure-detail-backdrop--deck-offer': isDeckOffer,
        'portal-overlay--shop-upgrade-suppressed': overlaySuppressed,
      }"
      :aria-label="isDeckOffer ? tileDetailLayerCopy.ariaLabelDialog : undefined"
      :style="backdropStackStyle"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="isDeckOffer ? undefined : titleId"
      @click.self="requestClose"
    >
      <!-- 与 ShopPanel.shop-header-panel 同款：左上占位宽度对齐 SHOP 招牌；右上钱包仅在商店内打开详情时显示 -->
      <div class="treasure-detail-header-panel" @click.self="requestClose">
        <div class="treasure-detail-header-logo-sizer" aria-hidden="true"></div>
        <div
          v-if="showHeaderWallet"
          ref="walletBoxRef"
          class="header-box header-box-split header-box-wallet treasure-detail-wallet"
          title="当前钱包余额"
          @click.stop
        >
          <span class="header-split-label">钱包</span>
          <span class="header-wallet-marks">
            <span class="money-dollar-char">$</span
            ><span class="header-wallet-amount">{{ formatWallet(walletAmount) }}</span>
          </span>
        </div>
      </div>

      <div class="treasure-detail-body" @click.self="requestClose">
        <div class="treasure-detail-stack" @click.self="requestClose">
          <div
            v-if="!isDeckOffer"
            ref="titleGroupRef"
            class="treasure-detail-title-group treasure-detail-stagger-el"
          >
            <p class="treasure-detail-kind-caption">{{ detailKindCaption }}</p>
            <h2 :id="titleId" ref="nameRef" class="treasure-detail-name">
              {{ displayTreasureName }}
            </h2>
          </div>

          <div class="treasure-detail-icon-column">
            <div
              ref="targetVisualRef"
              class="shop-treasure-visual shop-treasure-visual--detail"
              :class="{ 'shop-treasure-visual--deck-offer': isDeckOffer }"
            >
              <template v-if="isDeckOffer">
                <div class="shop-deck-offer-product-stack">
                  <LetterTile
                    ref="detailFlyFrameRef"
                    variant="grid"
                    class="shop-shelf-letter-tile shop-shelf-letter-tile--detail"
                    :letter="deckOfferLetter"
                    :rarity="treasure.letterRarity ?? treasure.rarity ?? 'common'"
                    :material-id="treasure.offerType === 'deckTile' ? treasure.deckTileMaterialId : undefined"
                    :accessory-id="deckOfferAccessoryId"
                    :treasure-accessory-id="deckOfferTreasureAccessoryId"
                    :tile-score-bonus="0"
                    :tile-mult-bonus="0"
                  />
                  <div
                    class="shop-treasure-price"
                    :aria-label="mode === 'pack-inner' ? '参考售价' : mode === 'offer' ? '售价' : '回收价'"
                  >
                    <div
                      class="shop-treasure-price-inner"
                      :class="{ 'shop-treasure-price-inner--pack-struck': mode === 'pack-inner' }"
                    >
                      <template v-if="mode === 'offer'">${{ offerPriceDisplayed }}</template>
                      <template v-else-if="mode === 'pack-inner'">${{ offerPriceDisplayed }}</template>
                      <template v-else>${{ sellRefund }}</template>
                    </div>
                  </div>
                </div>
              </template>
              <div
                v-else
                ref="detailFlyFrameRef"
                class="shop-treasure-frame shop-treasure-frame--detail"
                :class="{
                  'shop-treasure-frame--owned': isOwnedMode,
                  'shop-treasure-frame--bundle-pack-detail': isBundlePack,
                  'shop-treasure-frame--length-offer':
                    treasure?.offerType === 'upgrade' && treasure?.upgradeKind !== 'rarity',
                  'shop-treasure-frame--pack-rarity':
                    treasure?.offerType === 'upgrade' && treasure?.upgradeKind === 'rarity',
                  'shop-treasure-frame--spell-offer': isSpellOffer,
                  'shop-treasure-frame--voucher-stamp': isVoucherOffer,
                  'treasure-detail-frame--charge-inactive': chargeVisualState === 'inactive',
                  'treasure-detail-frame--charge-active': chargeVisualState === 'active',
                }"
                :style="{ '--charge-progress': String(chargeProgress ?? 0) }"
              >
                <template v-if="isUpgradeOffer">
                  <i
                    v-if="treasure.iconClass"
                    ref="emojiRef"
                    class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon"
                    :class="treasure.iconClass"
                    aria-hidden="true"
                  ></i>
                  <span v-else ref="emojiRef" class="shop-treasure-emoji shop-treasure-emoji--detail" role="img">{{
                    treasure.emoji
                  }}</span>
                  <span
                    v-if="isPackRarityUpgrade && (treasure.lengthBadgeLabel || treasure.lengthLabel)"
                    class="shop-pack-rarity-caption shop-upgrade-length--detail"
                    >{{ treasure.lengthBadgeLabel || treasure.lengthLabel }}</span
                  >
                  <span
                    v-else-if="treasure.lengthBadgeLabel || treasure.lengthLabel"
                    class="shop-upgrade-length shop-upgrade-length--detail"
                    :class="{
                      'shop-upgrade-length--single-digit': isSingleDigitLabel(
                        treasure.lengthBadgeLabel || treasure.lengthLabel,
                      ),
                    }"
                    >{{ treasure.lengthBadgeLabel || treasure.lengthLabel }}</span
                  >
                </template>
                <template v-else-if="isVoucherOffer">
                  <span ref="emojiRef" class="shop-treasure-emoji shop-treasure-emoji--detail" role="img">{{
                    treasure.emoji
                  }}</span>
                </template>
                <template v-else-if="isSpellOffer">
                  <i
                    v-if="treasure.iconClass"
                    ref="emojiRef"
                    class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon"
                    :class="treasure.iconClass"
                    aria-hidden="true"
                  ></i>
                </template>
                <template v-else-if="isBundlePack">
                  <i
                    ref="emojiRef"
                    class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon ri-gift-2-line"
                    aria-hidden="true"
                  ></i>
                  <span class="shop-bundle-pack-caption-detail">{{ bundlePackTypeLabel }}</span>
                </template>
                <template v-else>
                  <span class="letter-gem" :class="`gem-${gemRarityKey}`" aria-hidden="true" />
                  <i
                    v-if="treasure.iconClass"
                    ref="emojiRef"
                    class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon"
                    :class="treasure.iconClass"
                    aria-hidden="true"
                  ></i>
                  <span v-else ref="emojiRef" class="shop-treasure-emoji shop-treasure-emoji--detail" role="img">{{
                    treasure.emoji
                  }}</span>
                  <span
                    v-if="treasure.lengthBadgeLabel || treasure.lengthLabel"
                    class="shop-upgrade-length shop-upgrade-length--detail"
                    :class="{
                      'shop-upgrade-length--single-digit': isSingleDigitLabel(
                        treasure.lengthBadgeLabel || treasure.lengthLabel,
                      ),
                    }"
                    >{{
                    treasure.lengthBadgeLabel || treasure.lengthLabel
                  }}</span>
                </template>
                <span
                  v-if="accessoryChipVisual"
                  class="treasure-accessory-chip"
                  :class="accessoryChipVisual.chipClass"
                  aria-hidden="true"
                >
                  <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
                  <i class="treasure-accessory-chip-icon" :class="accessoryChipVisual.iconClass" aria-hidden="true" />
                </span>
                <i
                  v-if="chargeVisualState != null"
                  class="treasure-charge-corner-icon treasure-detail-disabled-mark ri-flashlight-fill"
                  aria-hidden="true"
                ></i>
              </div>
              <div
                v-if="!isDeckOffer"
                class="shop-treasure-price"
                :aria-label="mode === 'pack-inner' ? '参考售价' : mode === 'offer' ? '售价' : '回收价'"
              >
                <div
                  class="shop-treasure-price-inner"
                  :class="{ 'shop-treasure-price-inner--pack-struck': mode === 'pack-inner' }"
                >
                  <template v-if="mode === 'offer'">${{ offerPriceDisplayed }}</template>
                  <template v-else-if="mode === 'pack-inner'">${{ offerPriceDisplayed }}</template>
                  <template v-else>${{ sellRefund }}</template>
                </div>
              </div>
            </div>
          </div>

          <div ref="descRef" class="treasure-detail-desc-card treasure-detail-stagger-el">
            <template v-if="isDeckOffer">
              <div v-if="showDetailRarityTag" class="treasure-detail-rarity-row">
                <span
                  class="treasure-rarity-tag"
                  :class="'treasure-rarity-tag--' + deckOfferRarityKey"
                  >{{ deckOfferRarityTagLabel }}</span
                >
              </div>
              <div class="tile-detail-rarity-score-mult">
                <div class="tile-detail-score-mult-frame">
                  <div class="info-score-mult" role="group" :aria-label="deckOfferScoreMultAria">
                    <span class="tile-detail-score-mult-side-label">{{
                      tileDetailLayerCopy.rarity.scoreLabel
                    }}</span>
                    <span class="info-mini-box info-mini-box--score">{{ deckOfferScoreDisplay }}</span>
                    <span class="info-mini-times" aria-hidden="true">×</span>
                    <span class="info-mini-box info-mini-box--mult">{{ deckOfferMultDisplay }}</span>
                    <span class="tile-detail-score-mult-side-label">{{
                      tileDetailLayerCopy.rarity.multLabel
                    }}</span>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div v-if="showDetailRarityTag" class="treasure-detail-rarity-row">
                <span
                  class="treasure-rarity-tag"
                  :class="'treasure-rarity-tag--' + (treasure.rarity || 'rare')"
                  >{{ rarityTagLabel }}</span
                >
              </div>
              <TreasureDescRichText
                v-if="hasTreasureDescBody"
                :description="descriptionOverride ?? treasure.description"
              />
            </template>
          </div>

          <div
            v-if="isDeckOffer && showDeckOfferMaterialRegion"
            ref="deckOfferMaterialRef"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span class="treasure-detail-desc-panel-title-text">{{ deckOfferMaterialTitle }}</span>
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="deckOfferMaterialEffectText"
              :panel-body="true"
            />
          </div>

          <div
            v-if="isDeckOffer && showDeckOfferAccessoryRegion"
            ref="deckOfferAccessoryRef"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span
                v-if="deckOfferTileAccessoryChipVisual"
                class="tile-accessory-chip detail-panel-accessory-chip-inline"
                :class="deckOfferTileAccessoryChipVisual.chipClass"
                aria-hidden="true"
              >
                <span class="tile-accessory-chip-ripple" aria-hidden="true" />
                <i
                  class="tile-accessory-chip-icon"
                  :class="deckOfferTileAccessoryChipVisual.iconClass"
                  aria-hidden="true"
                />
              </span>
              <span class="treasure-detail-desc-panel-title-text">{{ deckOfferAccessoryTitle }}</span>
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="deckOfferAccessoryDesc"
              :panel-body="true"
            />
          </div>

          <div
            v-if="isDeckOffer && showDeckOfferTreasureAccessoryRegion"
            ref="deckOfferTreasureAccessoryRef"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span
                v-if="deckOfferTreasureAccessoryChipVisual"
                class="treasure-accessory-chip detail-panel-accessory-chip-inline"
                :class="deckOfferTreasureAccessoryChipVisual.chipClass"
                aria-hidden="true"
              >
                <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
                <i
                  class="treasure-accessory-chip-icon"
                  :class="deckOfferTreasureAccessoryChipVisual.iconClass"
                  aria-hidden="true"
                />
              </span>
              <span class="treasure-detail-desc-panel-title-text">{{ deckOfferTreasureAccessoryTitle }}</span>
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="deckOfferTreasureAccessoryDesc"
              :panel-body="true"
            />
          </div>

          <div
            v-if="showTreasureGainPanel && !isDeckOffer"
            ref="treasureGainPanelRef"
            class="treasure-detail-extra-regions treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-card treasure-detail-accessory-card">
              <div class="treasure-detail-desc-panel-title-row">
                <span class="treasure-detail-desc-panel-title-text">{{ treasureGainPanelContent.title }}</span>
              </div>
              <TreasureDescRichText
                class="treasure-detail-desc-panel-rich"
                :description="treasureGainPanelContent.description"
                :panel-body="true"
              />
            </div>
          </div>

          <div
            v-if="showSpellGainPanel && !isDeckOffer"
            ref="spellGainPanelRef"
            class="treasure-detail-extra-regions treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-card treasure-detail-accessory-card">
              <div class="treasure-detail-desc-panel-title-row">
                <span class="treasure-detail-desc-panel-title-text">{{ spellGainPanelContent.title }}</span>
              </div>
              <TreasureDescRichText
                class="treasure-detail-desc-panel-rich"
                :description="spellGainPanelContent.description"
                :panel-body="true"
              />
            </div>
          </div>

          <div
            v-if="showTreasureAccessoryPanel && !isDeckOffer"
            ref="accessoryPanelRef"
            class="treasure-detail-extra-regions treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-card treasure-detail-accessory-card">
              <div class="treasure-detail-desc-panel-title-row">
                <span
                  v-if="accessoryChipVisual"
                  class="treasure-accessory-chip detail-panel-accessory-chip-inline"
                  :class="accessoryChipVisual.chipClass"
                  aria-hidden="true"
                >
                  <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
                  <i class="treasure-accessory-chip-icon" :class="accessoryChipVisual.iconClass" aria-hidden="true" />
                </span>
                <span class="treasure-detail-desc-panel-title-text">{{ treasureAccessoryPanelTitle }}</span>
              </div>
              <TreasureDescRichText
                class="treasure-detail-desc-panel-rich"
                :description="treasureAccessoryPanelBody"
                :panel-body="true"
              />
            </div>
          </div>

          <div ref="actionsRef" class="treasure-detail-actions treasure-detail-stagger-el">
            <button
              v-if="mode === 'offer'"
              type="button"
              class="shop-btn shop-btn--buy"
              :disabled="!canBuyOffer"
              @click="emit('purchase')"
            >
              购买
            </button>
            <button
              v-if="mode === 'pack-inner'"
              type="button"
              class="shop-btn shop-btn--buy"
              :disabled="!canBuyOffer"
              @click="emit('purchase')"
            >
              {{ packInnerPrimaryLabel }}
            </button>
            <button
              v-if="isOwnedMode"
              type="button"
              class="shop-btn shop-btn--reroll"
              :disabled="!sellEnabled"
              @click="emit('sell')"
            >
              卖出 ${{ sellRefund }}
            </button>
            <button type="button" class="shop-btn shop-btn--next" @click="requestClose">返回</button>
          </div>
        </div>
      </div>

      <!-- 挂在 backdrop 内；position:fixed 相对视口，GSAP 写 left/top/width/height -->
      <div
        v-if="originRect && flyCloneActive"
        ref="flyCloneRef"
        class="treasure-detail-fly-clone-root"
        :class="
          isDeckOffer
            ? 'treasure-detail-fly-clone-root--deck-tile'
            : 'shop-treasure-visual shop-treasure-visual--detail'
        "
        :style="flyCloneStyle"
        aria-hidden="true"
      >
        <LetterTile
          v-if="isDeckOffer"
          variant="grid"
          class="shop-shelf-letter-tile"
          :letter="deckOfferLetter"
          :rarity="treasure.letterRarity ?? treasure.rarity ?? 'common'"
          :material-id="treasure.offerType === 'deckTile' ? treasure.deckTileMaterialId : undefined"
          :accessory-id="deckOfferAccessoryId"
          :treasure-accessory-id="deckOfferTreasureAccessoryId"
          :tile-score-bonus="0"
          :tile-mult-bonus="0"
        />
        <div
          v-else
          class="shop-treasure-frame shop-treasure-frame--detail"
          :class="{
            'shop-treasure-frame--owned': isOwnedMode,
            'shop-treasure-frame--bundle-pack-detail': isBundlePack,
            'shop-treasure-frame--length-offer':
              treasure?.offerType === 'upgrade' && treasure?.upgradeKind !== 'rarity',
            'shop-treasure-frame--pack-rarity':
              treasure?.offerType === 'upgrade' && treasure?.upgradeKind === 'rarity',
            'shop-treasure-frame--spell-offer': isSpellOffer,
            'shop-treasure-frame--voucher-stamp': isVoucherOffer,
            'treasure-detail-frame--charge-inactive': chargeVisualState === 'inactive',
            'treasure-detail-frame--charge-active': chargeVisualState === 'active',
          }"
          :style="{ '--charge-progress': String(chargeProgress ?? 0) }"
        >
          <template v-if="isUpgradeOffer">
            <i
              v-if="treasure.iconClass"
              class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon"
              :class="treasure.iconClass"
              aria-hidden="true"
            ></i>
            <span v-else class="shop-treasure-emoji shop-treasure-emoji--detail">{{ treasure.emoji }}</span>
            <span
              v-if="isPackRarityUpgrade && (treasure.lengthBadgeLabel || treasure.lengthLabel)"
              class="shop-pack-rarity-caption shop-upgrade-length--detail"
              >{{ treasure.lengthBadgeLabel || treasure.lengthLabel }}</span
            >
            <span
              v-else-if="treasure.lengthBadgeLabel || treasure.lengthLabel"
              class="shop-upgrade-length shop-upgrade-length--detail"
              :class="{
                'shop-upgrade-length--single-digit': isSingleDigitLabel(
                  treasure.lengthBadgeLabel || treasure.lengthLabel,
                ),
              }"
              >{{ treasure.lengthBadgeLabel || treasure.lengthLabel }}</span
            >
          </template>
          <template v-else-if="isVoucherOffer">
            <span class="shop-treasure-emoji shop-treasure-emoji--detail">{{ treasure.emoji }}</span>
          </template>
          <template v-else-if="isSpellOffer">
            <i
              v-if="treasure.iconClass"
              class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon"
              :class="treasure.iconClass"
              aria-hidden="true"
            ></i>
          </template>
          <template v-else-if="isBundlePack">
            <i
              class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon ri-gift-2-line"
              aria-hidden="true"
            ></i>
            <span class="shop-bundle-pack-caption-detail">{{ bundlePackTypeLabel }}</span>
          </template>
          <template v-else>
            <span class="letter-gem" :class="`gem-${gemRarityKey}`" aria-hidden="true" />
            <i
              v-if="treasure.iconClass"
              class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon"
              :class="treasure.iconClass"
              aria-hidden="true"
            ></i>
            <span v-else class="shop-treasure-emoji shop-treasure-emoji--detail">{{ treasure.emoji }}</span>
            <span
              v-if="treasure.lengthBadgeLabel || treasure.lengthLabel"
              class="shop-upgrade-length shop-upgrade-length--detail"
              :class="{
                'shop-upgrade-length--single-digit': isSingleDigitLabel(
                  treasure.lengthBadgeLabel || treasure.lengthLabel,
                ),
              }"
              >{{
              treasure.lengthBadgeLabel || treasure.lengthLabel
            }}</span>
          </template>
          <span
            v-if="accessoryChipVisual"
            class="treasure-accessory-chip"
            :class="accessoryChipVisual.chipClass"
            aria-hidden="true"
          >
            <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
            <i class="treasure-accessory-chip-icon" :class="accessoryChipVisual.iconClass" aria-hidden="true" />
          </span>
          <i
            v-if="chargeVisualState != null"
            class="treasure-charge-corner-icon treasure-detail-disabled-mark ri-flashlight-fill"
            aria-hidden="true"
          ></i>
        </div>
        <div v-if="!isDeckOffer" class="shop-treasure-price">
          <div
            class="shop-treasure-price-inner"
            :class="{ 'shop-treasure-price-inner--pack-struck': mode === 'pack-inner' }"
          >
            <template v-if="mode === 'offer' || mode === 'pack-inner'">${{ offerPriceDisplayed }}</template>
            <template v-else>${{ sellRefund }}</template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import gsap from "gsap";
import { computed, nextTick, onMounted, onUnmounted, ref, useId, watch } from "vue";
import { EASE_TRANSFORM } from "../constants.js";
import {
  getTreasureAccessoryChipVisual,
  getTreasureAccessoryPanelTitle,
  getTreasureAccessoryPanelDescription,
} from "../game/treasureAccessories.js";
import { getTileAccessoryChipVisual } from "../game/tileAccessories.js";
import { getTileMaterialEffectDescription, getTileAccessoryEffectDescription } from "../game/tileDetailDescriptions.js";
import { resolveTreasureDetailGainPanel } from "../treasures/treasureRegistry.js";
import { getSpellGainPanel } from "../spells/spellGainPanel.js";
import TreasureDescRichText from "./TreasureDescRichText.vue";
import LetterTile from "./LetterTile.vue";
import { bumpOverlayZ } from "../game/overlayStack.js";
import { applyShopDiscountPrice } from "../vouchers/voucherRuntime.js";
import {
  getPerLetterIntrinsicMultDisplay,
  getPerLetterIntrinsicScoreDisplay,
  getRarityForLetter,
} from "../composables/useScoring.js";
import {
  tileDetailLayerCopy,
  getTileDetailRarityTierLabel,
  getTileDetailMaterialTitle,
  getTileDetailAccessoryTitle,
} from "../game/tileDetailLayerCopy.js";

const props = defineProps({
  treasure: { type: Object, required: true },
  /** 非 null 时替换简介（如篮球动态括号行） */
  descriptionOverride: { type: [Array, String], default: null },
  mode: { type: String, required: true },
  /** null | inactive | active（由拥有槽位状态透传） */
  chargeVisualState: { type: String, default: null },
  /** 0~1 充能进度（由拥有槽位状态透传） */
  chargeProgress: { type: Number, default: 0 },
  walletAmount: { type: Number, default: 0 },
  sellRefund: { type: Number, default: 0 },
  canBuyOffer: { type: Boolean, default: false },
  packInnerAlreadyClaimed: { type: Boolean, default: false },
  /** @type {{ left: number, top: number, width: number, height: number } | null} */
  originRect: { type: Object, default: null },
  /** 法术「重播」预览用：上一张可重播法术 id */
  spellReplayTargetSpellId: { type: String, default: null },
  /** 已拥有优惠券 id（商店内标价折扣用） */
  ownedVoucherIds: { type: Array, default: () => [] },
  overlaySuppressed: { type: Boolean, default: false },
  /** 字母块预览：分数×倍率与 TileDetailLayer 一致 */
  rarityLevelsByRarity: { type: Object, default: null },
});

const offerPriceDisplayed = computed(() =>
  applyShopDiscountPrice(Number(props.treasure?.price) || 0, props.ownedVoucherIds ?? []),
);

const hasTreasureDescBody = computed(() => {
  const raw = props.descriptionOverride ?? props.treasure?.description;
  if (raw == null) return false;
  if (Array.isArray(raw)) return raw.length > 0;
  return String(raw).trim().length > 0;
});

const isOwnedMode = computed(() => props.mode === "owned-shop" || props.mode === "owned-game");
const sellEnabled = computed(() => isOwnedMode.value);

/** 局内棋盘打开宝藏详情（owned-game）不重复显示余额，与主界面顶栏一致 */
const showHeaderWallet = computed(
  () => props.mode === "offer" || props.mode === "owned-shop" || props.mode === "pack-inner",
);

const isDeckOffer = computed(
  () => props.treasure?.offerType === "deckLetter" || props.treasure?.offerType === "deckTile",
);

const deckOfferLetter = computed(() => {
  const raw = String(props.treasure?.deckLetterRaw ?? "a").toLowerCase();
  return raw === "q" ? "Qu" : raw.toUpperCase();
});

const deckOfferAccessoryId = computed(() => {
  if (props.treasure?.offerType !== "deckTile") return undefined;
  const id = props.treasure?.deckTileAccessoryId;
  const s = id != null ? String(id).trim() : "";
  return s || undefined;
});

const deckOfferTreasureAccessoryId = computed(() => {
  if (props.treasure?.offerType !== "deckTile") return undefined;
  const id = props.treasure?.deckTileTreasureAccessoryId;
  const s = id != null ? String(id).trim() : "";
  return s || undefined;
});

const offerTreasureAccessoryId = computed(() => {
  if (props.treasure?.offerType === "deckTile") return deckOfferTreasureAccessoryId.value ?? null;
  return props.treasure?.treasureAccessoryId ?? null;
});

const deckOfferRarityKey = computed(() => {
  const raw = String(props.treasure?.deckLetterRaw ?? "").toLowerCase();
  const fromLetter = raw ? getRarityForLetter(raw === "qu" ? "q" : raw) : "";
  const r = String(props.treasure?.letterRarity ?? props.treasure?.rarity ?? (fromLetter || "common"));
  if (r === "rare" || r === "epic" || r === "legendary") return r;
  return "common";
});

const deckOfferRarityTagLabel = computed(() => getTileDetailRarityTierLabel(deckOfferRarityKey.value));

function formatDeckOfferMultDisplay(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  if (Math.abs(x - Math.round(x)) < 1e-6) return String(Math.round(x));
  const s = x.toFixed(1);
  return s.endsWith(".0") ? String(Math.round(x)) : s;
}

const deckOfferScoreDisplay = computed(() => {
  const n = getPerLetterIntrinsicScoreDisplay(deckOfferRarityKey.value, props.rarityLevelsByRarity);
  return String(Math.max(0, Math.round(n)));
});

const deckOfferMultDisplay = computed(() => {
  const n = getPerLetterIntrinsicMultDisplay(deckOfferRarityKey.value, props.rarityLevelsByRarity);
  return formatDeckOfferMultDisplay(n);
});

const deckOfferScoreMultAria = computed(() =>
  tileDetailLayerCopy.rarity.formatTotalPerLetterAria(deckOfferScoreDisplay.value, deckOfferMultDisplay.value),
);

const deckOfferMaterialIdNorm = computed(() => {
  if (props.treasure?.offerType !== "deckTile") return "";
  const id = props.treasure?.deckTileMaterialId;
  return id != null ? String(id).trim() : "";
});

const deckOfferMaterialDesc = computed(() =>
  getTileMaterialEffectDescription(deckOfferMaterialIdNorm.value || null),
);

const deckOfferMaterialTitle = computed(() =>
  getTileDetailMaterialTitle(deckOfferMaterialIdNorm.value || null),
);

const deckOfferMaterialEffectText = computed(() => deckOfferMaterialDesc.value || "");

const showDeckOfferMaterialRegion = computed(
  () => Boolean(deckOfferMaterialIdNorm.value && String(deckOfferMaterialEffectText.value ?? "").trim()),
);

const deckOfferAccessoryIdNorm = computed(() => {
  const id = deckOfferAccessoryId.value;
  return id != null ? String(id).trim() : "";
});

const deckOfferAccessoryDesc = computed(() =>
  getTileAccessoryEffectDescription(deckOfferAccessoryIdNorm.value || null),
);

const deckOfferAccessoryTitle = computed(() =>
  getTileDetailAccessoryTitle(deckOfferAccessoryIdNorm.value || null),
);

const deckOfferTileAccessoryChipVisual = computed(() =>
  getTileAccessoryChipVisual(deckOfferAccessoryId.value),
);

const showDeckOfferAccessoryRegion = computed(
  () => Boolean(deckOfferAccessoryIdNorm.value && deckOfferAccessoryDesc.value),
);

const deckOfferTreasureAccessoryIdNorm = computed(() => {
  const id = deckOfferTreasureAccessoryId.value;
  return id != null ? String(id).trim() : "";
});

const deckOfferTreasureAccessoryTitle = computed(() =>
  getTreasureAccessoryPanelTitle(deckOfferTreasureAccessoryIdNorm.value || null),
);

const deckOfferTreasureAccessoryDesc = computed(() =>
  getTreasureAccessoryPanelDescription(deckOfferTreasureAccessoryIdNorm.value || null),
);

const deckOfferTreasureAccessoryChipVisual = computed(() =>
  getTreasureAccessoryChipVisual(deckOfferTreasureAccessoryIdNorm.value || null),
);

const showDeckOfferTreasureAccessoryRegion = computed(() =>
  Boolean(String(deckOfferTreasureAccessoryDesc.value ?? "").trim()),
);

const packInnerPrimaryLabel = computed(() => {
  if (props.packInnerAlreadyClaimed) return "已获取";
  if (props.treasure?.offerType === "upgrade") return "使用";
  return "获取";
});

const rarityTagLabel = computed(() => {
  const lr = props.treasure?.letterRarity;
  if (lr === "common") return "普通";
  if (lr === "rare") return "稀有";
  if (lr === "epic") return "史诗";
  if (lr === "legendary") return "传说";
  const r = props.treasure?.rarity;
  if (r === "epic") return "史诗";
  if (r === "legendary") return "传说";
  if (r === "common") return "普通";
  return "稀有";
});

/** 保证标题行在首帧即有占位高度，避免 flex 测量时 targetVisual 上移 */
const displayTreasureName = computed(() => {
  const n = props.treasure?.name;
  if (n == null || String(n).trim() === "") return "\u00a0";
  return String(n);
});

/** 与 LetterTile / grid-tile .letter-gem 的 gem-* 一致 */
const gemRarityKey = computed(() => {
  const lr = props.treasure?.letterRarity;
  if (lr === "epic" || lr === "legendary" || lr === "common" || lr === "rare") return lr;
  const r = props.treasure?.rarity;
  if (r === "epic") return "epic";
  if (r === "legendary") return "legendary";
  if (r === "common") return "common";
  return "rare";
});

const isUpgradeOffer = computed(() => props.treasure?.offerType === "upgrade");

const isPackRarityUpgrade = computed(
  () => isUpgradeOffer.value && props.treasure?.upgradeKind === "rarity",
);

const isSpellOffer = computed(() => props.treasure?.offerType === "spell");

const isBundlePack = computed(() => props.treasure?.offerType === "bundlePack");

const isVoucherOffer = computed(() => props.treasure?.offerType === "voucher");

const bundlePackTypeLabel = computed(() => {
  if (!isBundlePack.value) return "";
  const k = String(props.treasure?.bundleKind ?? "");
  if (k === "spell") return "法术";
  if (k === "upgrade") return "升级";
  if (k === "treasure") return "宝藏";
  if (k === "letter") return "字母";
  if (k === "tile") return "字母";
  return "组合包";
});

/** 与法术选格层、商店货架详情一致：名称上一行淡淡分类 */
const detailKindCaption = computed(() => {
  if (isBundlePack.value) return "组合包";
  if (isVoucherOffer.value) return "优惠券";
  if (isSpellOffer.value) return "法术卡";
  if (isDeckOffer.value) return "字母块";
  if (props.treasure?.offerType === "upgrade") return "升级卡";
  return "宝藏";
});

/** 牌包「升级卡」无宝藏稀有度，描述框不展示价签式稀有度 tag */
const showDetailRarityTag = computed(
  () =>
    props.treasure?.offerType !== "upgrade" &&
    props.treasure?.offerType !== "bundlePack" &&
    props.treasure?.offerType !== "voucher",
);

const accessoryChipVisual = computed(() => getTreasureAccessoryChipVisual(offerTreasureAccessoryId.value));

const treasureAccessoryPanelTitle = computed(() =>
  getTreasureAccessoryPanelTitle(offerTreasureAccessoryId.value),
);
const treasureAccessoryPanelBody = computed(() =>
  getTreasureAccessoryPanelDescription(offerTreasureAccessoryId.value),
);
const showTreasureAccessoryPanel = computed(() => Boolean(String(treasureAccessoryPanelBody.value ?? "").trim()));

const spellGainPanelContent = computed(() => {
  if (!isSpellOffer.value) return null;
  const sid = String(props.treasure?.spellId ?? "").trim();
  if (!sid) return null;
  return getSpellGainPanel(sid, { replayTargetSpellId: props.spellReplayTargetSpellId ?? null });
});

const showSpellGainPanel = computed(() => Boolean(String(spellGainPanelContent.value?.description ?? "").trim()));

const treasureGainPanelContent = computed(() => {
  if (isSpellOffer.value) return null;
  if (props.treasure?.offerType === "upgrade") return null;
  if (props.treasure?.offerType === "bundlePack") return null;
  if (isVoucherOffer.value) return null;
  const tid = String(props.treasure?.treasureId ?? "").trim();
  if (!tid) return null;
  return resolveTreasureDetailGainPanel(tid);
});

function treasureGainDescriptionNonEmpty(desc) {
  if (desc == null) return false;
  if (typeof desc === "string") return String(desc).trim().length > 0;
  return Array.isArray(desc) && desc.length > 0;
}

const showTreasureGainPanel = computed(
  () =>
    Boolean(treasureGainPanelContent.value?.title) &&
    treasureGainDescriptionNonEmpty(treasureGainPanelContent.value?.description),
);

const emit = defineEmits(["close", "purchase", "sell"]);

const titleId = useId();
const backdropRef = ref(null);
const stackZ = ref(0);
const backdropStackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : undefined));
const targetVisualRef = ref(null);
const detailFlyFrameRef = ref(null);
const flyCloneRef = ref(null);
const emojiRef = ref(null);
const walletBoxRef = ref(null);
const nameRef = ref(null);
const descRef = ref(null);
const deckOfferMaterialRef = ref(null);
const deckOfferAccessoryRef = ref(null);
const deckOfferTreasureAccessoryRef = ref(null);
const spellGainPanelRef = ref(null);
const treasureGainPanelRef = ref(null);
const accessoryPanelRef = ref(null);
const actionsRef = ref(null);
const titleGroupRef = ref(null);

const closing = ref(false);
const bootMask = ref(true);

/** @type {gsap.core.Timeline | null} */
let enterTl = null;

function formatWallet(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

/** 与 `game.css` `:root --shop-shelf-spell-icon-units` 一致，供法术飞入动画算字号 */
function resolveShopSpellIconNumer() {
  if (typeof document === "undefined") return 40;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--shop-shelf-spell-icon-units").trim();
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 40;
}

function isSingleDigitLabel(label) {
  return /^\d$/.test(String(label ?? "").trim());
}

function staggerTargets() {
  return [
    titleGroupRef.value,
    descRef.value,
    deckOfferMaterialRef.value,
    deckOfferAccessoryRef.value,
    deckOfferTreasureAccessoryRef.value,
    treasureGainPanelRef.value,
    spellGainPanelRef.value,
    accessoryPanelRef.value,
    actionsRef.value,
  ].filter(Boolean);
}

/** 克隆用 position:fixed + 视口坐标，不做 backdrop 相对换算 */

function validOrigin(r) {
  return (
    r &&
    typeof r.left === "number" &&
    typeof r.top === "number" &&
    r.width > 2 &&
    r.height > 2
  );
}

/** @param {DOMRect | { left: number, top: number, width: number, height: number }} r */
function rectToFlyBox(r) {
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/** @param {{ left: number, top: number, width: number, height: number }} r */
function rectCenter(r) {
  return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
}

/** @param {unknown} refVal */
function refToFlyFrameEl(refVal) {
  if (!refVal) return null;
  if (refVal instanceof HTMLElement) return refVal;
  const el = /** @type {{ $el?: unknown }} */ (refVal).$el;
  return el instanceof HTMLElement ? el : null;
}

/** 货架字母块飞入：只量 LetterTile 框，不含价签列高度 */
function resolveDeckOfferFlyTargetRect() {
  const frame = refToFlyFrameEl(detailFlyFrameRef.value);
  const r = frame?.getBoundingClientRect?.();
  if (r && r.width > 2 && r.height > 2) return rectToFlyBox(r);
  const visual = targetVisualRef.value;
  const vr = visual?.getBoundingClientRect?.();
  if (vr && vr.width > 2 && vr.height > 2) return rectToFlyBox(vr);
  return null;
}

const flyCloneActive = ref(validOrigin(props.originRect));

/** 首帧即落在起点，避免未定位前露在错误位置；显隐由 CSS visibility + RAF 内 GSAP 接管 */
const flyCloneStyle = computed(() => {
  const r = props.originRect;
  if (!validOrigin(r)) return {};
  if (isDeckOffer.value) {
    const cx = r.left + r.width * 0.5;
    const cy = r.top + r.height * 0.5;
    return {
      position: "fixed",
      left: `${cx}px`,
      top: `${cy}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
      marginLeft: `${-r.width / 2}px`,
      marginTop: `${-r.height / 2}px`,
      zIndex: 9999,
      boxSizing: "border-box",
    };
  }
  return {
    position: "fixed",
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    zIndex: 9999,
    boxSizing: "border-box",
    margin: "0",
  };
});

function runEnterAnimation() {
  const backdrop = backdropRef.value;
  const targetVisual = targetVisualRef.value;
  const clone = flyCloneRef.value;
  if (!backdrop || !targetVisual) return;

  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }

  const staggerEls = staggerTargets();
  const hasFly = validOrigin(props.originRect) && clone;

  gsap.killTweensOf([backdrop, targetVisual, clone, ...staggerEls].filter(Boolean));

  gsap.set(backdrop, { backgroundColor: "rgba(14, 12, 10, 0)" });
  gsap.set(staggerEls, { opacity: 0, y: 7 });

  /* 遮罩与测量解耦：立刻从透明匀缓加深，避免等字体/RAF 后再起 tween 像闪一下 */
  gsap.fromTo(
    backdrop,
    { backgroundColor: "rgba(14, 12, 10, 0)" },
    {
      backgroundColor: "rgba(14, 12, 10, 0.78)",
      duration: 0.42,
      ease: EASE_TRANSFORM,
    },
  );

  /* 有飞行时立刻藏住终点处的真卡片，否则 boot 解除后 icon 列会先亮一帧在目标位 */
  if (validOrigin(props.originRect) && targetVisual) {
    gsap.set(targetVisual, { opacity: 0, pointerEvents: "none" });
  }

  if (!hasFly) {
    gsap.set(targetVisual, { opacity: 0, scale: 0.94, transformOrigin: "50% 50%" });
  }

  bootMask.value = false;

  void nextTick()
    .then(() => (document.fonts?.ready != null ? document.fonts.ready : Promise.resolve()))
    .then(
      () =>
        new Promise((r) => {
          requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)));
        }),
    )
    .then(() => {
      /** @type {{ left: number, top: number, width: number, height: number } | null} */
      let flyTo = null;
      /** @type {{ left: number, top: number, width: number, height: number } | null} */
      let flyFrom = null;

      if (hasFly) {
        void backdrop.offsetHeight;
        flyFrom = props.originRect;
        flyTo = isDeckOffer.value
          ? resolveDeckOfferFlyTargetRect()
          : rectToFlyBox(targetVisual.getBoundingClientRect());

        if (!flyTo) {
          flyCloneActive.value = false;
          gsap.set(targetVisual, {
            opacity: 1,
            pointerEvents: "auto",
            clearProps: "opacity,pointerEvents",
          });
          enterTl = gsap.timeline();
          enterTl.to(
            staggerEls,
            {
              opacity: 1,
              y: 0,
              duration: 0.18,
              stagger: 0.038,
              ease: EASE_TRANSFORM,
              clearProps: "opacity,transform",
            },
            0.05,
          );
          return;
        }

        gsap.killTweensOf(clone);
        const deckTileFly = isDeckOffer.value;
        if (deckTileFly) {
          const fc = rectCenter(flyFrom);
          gsap.set(clone, {
            clearProps: "transform",
            visibility: "visible",
            opacity: 1,
            left: fc.x,
            top: fc.y,
            width: flyFrom.width,
            height: flyFrom.height,
            marginLeft: -flyFrom.width / 2,
            marginTop: -flyFrom.height / 2,
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            transformOrigin: "50% 50%",
            force3D: true,
            pointerEvents: "none",
          });
        } else {
          gsap.set(clone, { clearProps: "transform" });
          gsap.set(clone, {
            visibility: "visible",
            opacity: 1,
            left: flyFrom.left,
            top: flyFrom.top,
            width: flyFrom.width,
            height: flyFrom.height,
            pointerEvents: "none",
          });
        }
      }

      enterTl = gsap.timeline();

      if (hasFly) {
        if (isDeckOffer.value) {
          const fc = rectCenter(flyFrom);
          const tc = rectCenter(flyTo);
          const scaleEnd = Math.min(32, Math.max(0.06, flyTo.width / Math.max(2, flyFrom.width)));
          enterTl.to(
            clone,
            {
              x: tc.x - fc.x,
              y: tc.y - fc.y,
              scale: scaleEnd,
              duration: 0.36,
              ease: EASE_TRANSFORM,
            },
            0,
          );
        } else {
          enterTl.to(
            clone,
            {
              left: flyTo.left,
              top: flyTo.top,
              width: flyTo.width,
              height: flyTo.height,
              duration: 0.36,
              ease: EASE_TRANSFORM,
            },
            0,
          );
        }

        const cloneEmoji = clone.querySelector(".shop-treasure-emoji");
        const wStart = flyFrom.width;
        const wEndFrame = refToFlyFrameEl(detailFlyFrameRef.value)?.getBoundingClientRect?.()?.width;
        const wEnd = wEndFrame && wEndFrame > 2 ? wEndFrame : flyTo.width;
        /** 法术格 Remix 图标与 `--shop-shelf-spell-icon-units`/108；宝藏格 emoji 约 42/108 */
        const isSpellFly = props.treasure?.offerType === "spell";
        const spellIconNumer = resolveShopSpellIconNumer();
        const fsStart = isSpellFly ? (spellIconNumer / 108) * wStart : (42 / 108) * wStart;
        const fsEnd = isSpellFly ? (spellIconNumer / 108) * wEnd : (42 / 108) * wEnd;
        if (cloneEmoji && Number.isFinite(fsStart) && Number.isFinite(fsEnd) && fsStart > 1 && fsEnd > 1) {
          gsap.set(cloneEmoji, { fontSize: fsStart });
          enterTl.to(
            cloneEmoji,
            {
              fontSize: fsEnd,
              duration: 0.36,
              ease: EASE_TRANSFORM,
            },
            0,
          );
        }

        enterTl.add(() => {
          gsap.set(targetVisual, { opacity: 1, pointerEvents: "auto", clearProps: "opacity,pointerEvents" });
          flyCloneActive.value = false;
        });
      } else {
        flyCloneActive.value = false;
        enterTl.to(
          targetVisual,
          { opacity: 1, scale: 1, duration: 0.22, ease: EASE_TRANSFORM, clearProps: "opacity,scale" },
          0.06,
        );
      }

      enterTl.to(
        staggerEls,
        {
          opacity: 1,
          y: 0,
          duration: 0.18,
          stagger: 0.038,
          ease: EASE_TRANSFORM,
          clearProps: "opacity,transform",
        },
        hasFly ? 0.12 : 0.05,
      );
    });
}

function runCloseAnimation(shouldEmit) {
  if (closing.value) {
    return Promise.resolve();
  }
  closing.value = true;
  const backdrop = backdropRef.value;
  const targetVisual = targetVisualRef.value;
  const staggerEls = staggerTargets();

  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }

  gsap.killTweensOf([backdrop, targetVisual, ...staggerEls].filter(Boolean));

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        if (shouldEmit) {
          emit("close");
        }
        resolve(undefined);
      },
    });

    if (backdrop) {
      tl.to(
        backdrop,
        {
          backgroundColor: "rgba(14, 12, 10, 0)",
          duration: 0.2,
          ease: EASE_TRANSFORM,
        },
        0,
      );
    }

    const rev = [...staggerEls].reverse();
    if (rev.length) {
      tl.to(
        rev,
        {
          opacity: 0,
          y: 5,
          duration: 0.11,
          stagger: 0.028,
          ease: EASE_TRANSFORM,
        },
        0,
      );
    }

    if (targetVisual) {
      tl.to(
        targetVisual,
        {
          opacity: 0,
          scale: 0.94,
          duration: 0.16,
          ease: EASE_TRANSFORM,
          transformOrigin: "50% 50%",
        },
        0.02,
      );
    }
  });
}

function requestClose() {
  if (closing.value) return;
  void runCloseAnimation(true);
}

function playClose() {
  return runCloseAnimation(false);
}

function onEsc(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    requestClose();
  }
}

watch(
  () => props.treasure,
  () => {
    nextTick(() => {
      stackZ.value = bumpOverlayZ();
    });
  },
  { deep: true, immediate: true },
);

onMounted(() => {
  document.addEventListener("keydown", onEsc);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => runEnterAnimation());
  });
});

onUnmounted(() => {
  document.removeEventListener("keydown", onEsc);
  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }
});

defineExpose({
  getEmojiEl: () => emojiRef.value,
  /** 购买飞入槽位：整框 shop-treasure-frame 起点 */
  getFlyFrameEl: () => detailFlyFrameRef.value,
  getWalletEl: () => walletBoxRef.value,
  playClose,
});
</script>
