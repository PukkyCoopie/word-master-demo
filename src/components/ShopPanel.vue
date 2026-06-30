<template>
  <div class="shop-panel">
    <div class="shop-header-panel">
      <div class="shop-header-info-col">
        <div
          ref="shopWalletBoxRef"
          class="header-box header-box-split header-box-wallet"
          title="当前钱包余额"
        >
          <span class="header-split-label">钱包</span>
          <span class="header-wallet-marks" :class="{ 'money-tone--debt': walletAmount < 0 }">
            <span class="money-dollar-char">$</span
            ><span class="header-wallet-amount">{{ formatWallet(walletAmount) }}</span>
          </span>
        </div>
        <div
          class="header-box header-box-split header-box-next-level header-box-next-level--clickable"
          role="button"
          tabindex="0"
          title="查看关卡进度"
          :aria-label="nextLevelPreviewAriaLabel"
          :aria-disabled="interactionsDisabled || shopTutorialIntroActive || !nextLevelId ? true : undefined"
          :class="{ 'header-box-next-level--tutorial-blocked': shopTutorialIntroActive }"
          @click="onNextLevelPreviewClick"
          @keydown.enter.prevent="onNextLevelPreviewClick"
          @keydown.space.prevent="onNextLevelPreviewClick"
        >
          <span class="header-split-label">下一关</span>
          <span class="header-next-level-id">{{ nextLevelId || "—" }}</span>
        </div>
      </div>

      <TileLetterShowcase class="shop-logo" aria-label="商店" content-align="start" :rows="shopTitleRows" />
    </div>

    <ResultArea
      ref="shopResultAreaRef"
      class="shop-result-area"
      :show-total-bar="false"
      :total-text="''"
      :show-word-length="shopResultWordlenVisible"
      :word-length-text="shopResultWordlenText"
      :word-level="shopResultLevelShown"
      :score-text="shopResultScoreText"
      :mult-text="shopResultMultText"
      level-prefix="等级"
    />

    <div class="shop-body">
      <div class="shop-middle">
        <div class="shop-row shop-row--single-card-actions">
          <div class="shop-single-card-panel shop-section" aria-label="单卡区商品">
            <div class="shop-single-card-offers">
                <div
                  v-for="slot in shopOffersLayoutSlots"
                  :key="slot.kind === 'offer' ? 'o-' + slot.offerInstanceId : 'e-' + slot.emptySlotId"
                  class="shop-treasure-product"
                >
                  <div
                    v-if="slot.kind === 'offer'"
                    :ref="(el) => setFirstGuaranteedTreasureOfferRef(el, slot)"
                    class="shop-treasure-visual"
                    :class="{
                      'shop-treasure-visual--deck-offer': isDeckShopOffer(slot),
                      'shop-treasure-visual--tutorial-blocked':
                        shopTutorialIntroActive && !isShopTutorialTargetTreasureOffer(slot),
                    }"
                    @click.stop="canSelectShopSingleOffer(slot) && onSelectOffer(slot, $event)"
                  >
                    <LetterTile
                      v-if="isDeckShopOffer(slot)"
                      variant="grid"
                      class="shop-shelf-letter-tile"
                      v-bind="deckOfferLetterTileBind(slot)"
                    />
                    <div
                      v-else
                      class="shop-treasure-frame"
                      :class="{
                        'shop-treasure-frame--length-offer':
                          slot.offerType === 'upgrade' &&
                          slot.upgradeKind !== 'rarity' &&
                          (slot.lengthBadgeLabel || slot.lengthLabel),
                        'shop-treasure-frame--pack-rarity':
                          slot.offerType === 'upgrade' && slot.upgradeKind === 'rarity',
                        'shop-treasure-frame--spell-offer': slot.offerType === 'spell',
                      }"
                    >
                      <template v-if="slot.offerType === 'spell'">
                        <i
                          v-if="slot.iconClass"
                          class="shop-treasure-emoji shop-treasure-emoji--icon"
                          :class="slot.iconClass"
                          aria-hidden="true"
                        ></i>
                      </template>
                      <template v-else-if="slot.offerType === 'upgrade'">
                        <i
                          v-if="slot.iconClass"
                          class="shop-treasure-emoji shop-treasure-emoji--icon"
                          :class="slot.iconClass"
                          aria-hidden="true"
                        ></i>
                        <span
                          v-if="slot.upgradeKind === 'rarity' && (slot.lengthBadgeLabel || slot.lengthLabel)"
                          class="shop-pack-rarity-caption"
                          >{{ slot.lengthBadgeLabel || slot.lengthLabel }}</span
                        >
                        <span
                          v-else-if="slot.lengthBadgeLabel || slot.lengthLabel"
                          class="shop-upgrade-length"
                          :class="{
                            'shop-upgrade-length--single-digit': isSingleDigitLabel(
                              slot.lengthBadgeLabel || slot.lengthLabel,
                            ),
                          }"
                          >{{ slot.lengthBadgeLabel || slot.lengthLabel }}</span
                        >
                      </template>
                      <template v-else>
                        <span
                          class="letter-gem"
                          :class="gemClassForTreasureRarity(slot.letterRarity ?? slot.rarity)"
                          aria-hidden="true"
                        />
                        <span class="shop-treasure-emoji" role="img">{{ slot.emoji }}</span>
                        <div
                          v-if="shopOfferTreasureAccessoryChips(slot).length"
                          class="treasure-accessory-chip-stack"
                          aria-hidden="true"
                        >
                          <span
                            v-for="(chip, chipIx) in shopOfferTreasureAccessoryChips(slot)"
                            :key="`${chip.chipClass}-${chipIx}`"
                            class="treasure-accessory-chip"
                            :class="chip.chipClass"
                          >
                            <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
                            <i
                              class="treasure-accessory-chip-icon"
                              :class="chip.iconClass"
                              aria-hidden="true"
                            />
                          </span>
                        </div>
                      </template>
                    </div>
                    <div class="shop-treasure-price" aria-label="售价">
                      <div
                        class="shop-treasure-price-inner"
                        :class="shopOfferPriceView(slot.price, slot).innerClasses"
                      >
                        ${{ shopOfferPriceView(slot.price, slot).amount }}
                      </div>
                    </div>
                  </div>
                  <div v-else class="shop-treasure-visual shop-treasure-visual--slot-empty" aria-hidden="true">
                    <div class="shop-treasure-frame" />
                    <div class="shop-treasure-price">
                      <div class="shop-treasure-price-inner">&nbsp;</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          <div class="shop-actions-col">
            <button
              type="button"
              class="shop-btn shop-btn--reroll shop-btn--action-reroll"
              :disabled="interactionsDisabled || shopTutorialIntroActive || !canShopReroll"
              @click.prevent="emit('shop-reroll')"
            >
              <span class="shop-btn-reroll-price" aria-label="刷新费用">
                <span class="shop-btn-reroll-dollar">$</span>{{ shopRerollCost }}
              </span>
              <span class="shop-btn-reroll-lead">
                <i class="ri-refresh-line shop-actions-btn-icon" aria-hidden="true"></i>
                <span>刷新</span>
              </span>
            </button>
            <button
              type="button"
              class="shop-btn shop-btn--next shop-btn--action-next"
              :disabled="interactionsDisabled || shopTutorialIntroActive"
              @click="emit('next-level', $event)"
            >
              <i class="ri-corner-down-right-line shop-actions-btn-icon" aria-hidden="true"></i>
              <span>下一关</span>
            </button>
          </div>
        </div>

        <div class="shop-row shop-row--voucher-pack">
          <div class="shop-voucher-panel shop-section" aria-label="优惠券商品">
            <div class="shop-voucher-offers">
                <div
                  :key="
                    voucherSlot.kind === 'offer'
                      ? 'vo-' + voucherSlot.offerInstanceId
                      : 've-' + voucherSlot.emptySlotId
                  "
                  class="shop-treasure-product"
                >
                  <div
                    v-if="voucherSlot.kind === 'offer'"
                    class="shop-treasure-visual"
                    :class="{ 'shop-treasure-visual--tutorial-blocked': shopTutorialIntroActive }"
                    @click.stop="canSelectShopVoucherOffer() && onSelectVoucher(voucherSlot, $event)"
                  >
                    <VoucherStamp
                      :emoji="voucherSlot.emoji"
                      :display-name="voucherSlot.name"
                      :price="shopOfferPriceView(voucherSlot.price, voucherSlot).amount"
                      :price-inner-classes="shopOfferPriceView(voucherSlot.price, voucherSlot).innerClasses"
                    />
                  </div>
                  <div v-else class="shop-treasure-visual shop-treasure-visual--slot-empty" aria-hidden="true">
                    <VoucherStamp empty reserve-price-slot />
                  </div>
                </div>
                <div
                  v-if="voucherBonusSlot?.kind === 'offer'"
                  :key="'vb-' + voucherBonusSlot.offerInstanceId"
                  ref="voucherBonusProductRef"
                  class="shop-treasure-product shop-treasure-product--voucher-bonus"
                >
                  <div
                    class="shop-treasure-visual"
                    :class="{ 'shop-treasure-visual--tutorial-blocked': shopTutorialIntroActive }"
                    @click.stop="canSelectShopVoucherOffer() && onSelectVoucher(voucherBonusSlot, $event)"
                  >
                    <VoucherStamp
                      :emoji="voucherBonusSlot.emoji"
                      :display-name="voucherBonusSlot.name"
                      :price="shopOfferPriceView(voucherBonusSlot.price, voucherBonusSlot).amount"
                      :price-inner-classes="
                        shopOfferPriceView(voucherBonusSlot.price, voucherBonusSlot).innerClasses
                      "
                    />
                  </div>
                </div>
              </div>
            </div>

          <div class="shop-pack-panel shop-section">
            <div class="shop-pack-offers" aria-label="牌包区商品">
                <div
                  v-for="slot in packOffersLayoutSlots"
                  :key="slot.kind === 'offer' ? 'po-' + slot.offerInstanceId : 'pe-' + slot.emptySlotId"
                  class="shop-treasure-product shop-treasure-product--pack"
                >
                  <div
                    v-if="slot.kind === 'offer'"
                    class="shop-treasure-visual"
                    :class="{ 'shop-treasure-visual--tutorial-blocked': shopTutorialIntroActive }"
                    @click.stop="canSelectShopPackOffer() && onSelectPackOffer(slot, $event)"
                  >
                    <div
                      class="shop-treasure-frame"
                      :class="{
                        'shop-treasure-frame--bundle-pack': slot.offerType === 'bundlePack',
                        'shop-treasure-frame--length-offer':
                          slot.offerType !== 'spell' &&
                          slot.offerType !== 'bundlePack' &&
                          slot.upgradeKind !== 'rarity' &&
                          (slot.lengthBadgeLabel || slot.lengthLabel),
                        'shop-treasure-frame--pack-rarity':
                          slot.offerType !== 'bundlePack' && slot.upgradeKind === 'rarity',
                        'shop-treasure-frame--spell-offer':
                          slot.offerType === 'spell',
                      }"
                    >
                      <template v-if="slot.offerType === 'bundlePack'">
                        <i
                          class="shop-treasure-emoji shop-treasure-emoji--icon ri-gift-2-line"
                          aria-hidden="true"
                        ></i>
                        <span class="shop-bundle-pack-caption">{{ bundlePackCaption(slot) }}</span>
                      </template>
                      <template v-else>
                        <i
                          v-if="slot.iconClass"
                          class="shop-treasure-emoji shop-treasure-emoji--icon"
                          :class="slot.iconClass"
                          aria-hidden="true"
                        ></i>
                        <span v-else class="shop-treasure-emoji" role="img">{{ slot.emoji }}</span>
                        <span
                          v-if="slot.upgradeKind === 'rarity' && (slot.lengthBadgeLabel || slot.lengthLabel)"
                          class="shop-pack-rarity-caption"
                          >{{ slot.lengthBadgeLabel || slot.lengthLabel }}</span
                        >
                        <span
                          v-else-if="slot.lengthBadgeLabel || slot.lengthLabel"
                          class="shop-upgrade-length"
                          :class="{
                            'shop-upgrade-length--single-digit': isSingleDigitLabel(
                              slot.lengthBadgeLabel || slot.lengthLabel,
                            ),
                          }"
                          >{{ slot.lengthBadgeLabel || slot.lengthLabel }}</span
                        >
                      </template>
                    </div>
                    <div class="shop-treasure-price" aria-label="售价">
                      <div
                        class="shop-treasure-price-inner"
                        :class="shopOfferPriceView(slot.price, slot).innerClasses"
                      >
                        ${{ shopOfferPriceView(slot.price, slot).amount }}
                      </div>
                    </div>
                  </div>
                  <div v-else class="shop-treasure-visual shop-treasure-visual--slot-empty" aria-hidden="true">
                    <div class="shop-treasure-frame" />
                    <div class="shop-treasure-price">
                      <div class="shop-treasure-price-inner">&nbsp;</div>
                    </div>
                  </div>
                </div>
              </div>
          </div>

        </div>
      </div>
    </div>

    <div class="shop-footer-panel">
      <TreasureBarRow
        ref="shopTreasureBarRowRef"
        container-class="shop-footer-treasure-row"
        :display-slots="displayOwnedTreasures"
        :display-keys="displayOwnedTreasureKeys"
        :layout-class="treasureSlotsLayoutClass"
        :stack-mode="shopTreasureBarStackMode"
        :filled-count="shopOwnedTreasureFilledCount"
        :compact-animating="treasureBarCompactAnimating"
        :drag-active="shopOwnedDragActive"
        :drag-ghost-visible="shopOwnedDragGhostVisible"
        :drag-placeholder-visible="shopOwnedDragPlaceholderVisible"
        :drag-treasure="shopOwnedDragTreasure"
        :drag-ghost-style="shopOwnedDragGhostStyle"
        :drag-placeholder-style="shopOwnedDragPlaceholderStyle"
        :drag-gem-class="gemClassForTreasureRarity(shopOwnedDragTreasure?.rarity)"
        :drag-charge-state="shopOwnedDragChargeState"
        :drag-charge-progress="shopOwnedDragChargeProgress"
        :drag-effect-depleted="shopOwnedDragEffectDepleted"
        :gem-class-resolver="shopTreasureGemClassResolver"
        :charge-states="displayTreasureChargeBySlot"
        :charge-progresses="displayTreasureChargeProgressBySlot"
        :effect-depleted-states="displayTreasureEffectDepletedBySlot"
        :register-slot-ref="setOwnedCellRef"
        :hidden-treasure-count="shopHiddenTreasureBarCount"
        :expand-btn-highlight="treasureBarExpandBtnHighlight"
        @slot-pointerdown="onShopOwnedSlotPointerDown"
        @slot-click="onSelectOwned"
        @empty-slot-click="onShopEmptyTreasureSlotClick"
        @expand-click="onShopTreasureBarExpandClick"
      />

      <div class="shop-footer-actions" role="group" aria-label="选项、信息与牌库">
        <button
          type="button"
          class="deck-btn shop-footer-action-btn shop-footer-action-btn--options"
          :disabled="interactionsDisabled || shopTutorialIntroActive"
          @click="emit('open-options')"
        >
          <i class="ri-settings-3-line deck-btn-icon" aria-hidden="true"></i>
          <span>选项</span>
        </button>
        <button
          ref="roundInfoBtnRef"
          type="button"
          class="deck-btn shop-footer-action-btn"
          :disabled="interactionsDisabled || shopTutorialIntroActive"
          @click="emit('view-round-info')"
        >
          <i class="ri-information-line deck-btn-icon" aria-hidden="true"></i>
          <span>本轮信息</span>
        </button>
        <button
          ref="deckViewBtnRef"
          type="button"
          class="deck-btn shop-footer-action-btn"
          :disabled="interactionsDisabled || shopTutorialIntroActive"
          @click="emit('view-deck')"
        >
          <i class="ri-stack-line deck-btn-icon" aria-hidden="true"></i>
          <span>查看牌库</span>
        </button>
      </div>
    </div>
  </div>

  <SettingsHelpDialog
    :open="showEmptyTreasureSlotHelp"
    title="空的宝藏栏位"
    :paragraphs="['你获得的宝藏会放置在这里']"
    @close="showEmptyTreasureSlotHelp = false"
  />
</template>

<script setup>
import { computed, ref, nextTick, watch } from "vue";
import { useTreasureSlotReorder } from "../composables/useTreasureSlotReorder.js";
import gsap from "gsap";
import TileLetterShowcase from "./TileLetterShowcase.vue";
import TreasureBarRow from "./TreasureBarRow.vue";
import SettingsHelpDialog from "./settings/SettingsHelpDialog.vue";
import {
  countFilledTreasureSlots,
  countHiddenBarTreasures,
  isTreasureBarSlotVisible,
  isTreasureBarStackMode,
  TREASURE_BAR_VISIBLE_MAX,
} from "../game/treasureBarLayout.js";
import ResultArea from "./ResultArea.vue";
import VoucherStamp from "./VoucherStamp.vue";
import LetterTile from "./LetterTile.vue";
import {
  getBaseScorePerLetterForWordLength,
  getLengthMultiplier,
  getObservatoryBoostedLengthUpgradeStepAdds,
  getLengthUpgradeStepAdds,
  getRarityBonusForRarity,
  getRarityMultBonusForRarity,
  RARITY_UPGRADE_BALANCE,
} from "../composables/useScoring";
import { resolveUpgradePlaybackSpeed } from "../shop/randomUpgradeRoll.js";
import { bubbleAtShopPanel } from "../game/popupBubbleFx.js";
import { getTreasureAccessoryChipVisualsFromEntity } from "../game/treasureAccessories.js";
import { buildShopOfferPriceView } from "../shop/shopOfferPriceDisplay.js";
import { isSingleDigitLabel } from "./detailLayerFormatters.js";
import { buildPackDeckOfferLetterTileProps } from "../game/packDeckOfferVisual.js";
import { resolveLetterFromRaw } from "../settings/letterQ.js";
import { runVoucherShelfEnterPopAnim } from "../game/voucherShelfEnterAnim.js";
import { resolveOfferFlyOriginEl } from "../game/offerFlyOrigin.js";

const props = defineProps({
  walletAmount: { type: Number, default: 0 },
  shopOffers: { type: Array, required: true },
  packOffers: { type: Array, default: () => [] },
  /** 单槽优惠券行：与 pack slot 同构 `{ kind:'offer'|'empty', ... }` */
  voucherSlot: {
    type: Object,
    default: () => ({ kind: "empty", emptySlotId: 0 }),
  },
  /** 法术「促销」追加的额外优惠券（至多 1 张） */
  voucherBonusSlot: {
    type: Object,
    default: null,
  },
  ownedVoucherIds: { type: Array, default: () => [] },
  /** 动态长度（默认 5；装备裁剪配饰时可扩栏）：(Treasure | null)[] */
  ownedTreasures: { type: Array, required: true },
  /** 与 ownedTreasures 同索引：null=无充能皮、inactive=未就绪、active=就绪（仅 footer 已拥有格） */
  treasureChargeBySlot: {
    type: Array,
    default: () => [null, null, null, null, null],
  },
  /** 与 ownedTreasures 同索引：0~1 充能进度（仅 footer 已拥有格） */
  treasureChargeProgressBySlot: {
    type: Array,
    default: () => [0, 0, 0, 0, 0],
  },
  /** 与 ownedTreasures 同索引：效果已永久耗尽（仅压暗，无充能角标） */
  treasureEffectDepletedBySlot: {
    type: Array,
    default: () => [false, false, false, false, false],
  },
  shopRerollCost: { type: Number, default: 5 },
  canShopReroll: { type: Boolean, default: false },
  interactionsDisabled: { type: Boolean, default: false },
  /** preset 10 等：四栏按五栏宽度居中；叠放模式由父级传入 class */
  treasureSlotsLayoutClass: { type: String, default: "" },
  treasureBarCompactAnimating: { type: Boolean, default: false },
  /** 隐藏槽位宝藏生效时：展开按钮记分高光（由 GamePanel 传入） */
  treasureBarExpandBtnHighlight: { type: Boolean, default: false },
  /** @type {import('vue').PropType<{ ref: import('vue').Ref<string[]> }>} */
  ownedTreasureKeyOrderBag: { type: Object, required: true },
  /** 本局预设 id（商店标价） */
  runPresetId: { type: String, default: "preset_01" },
  /** 钱包下限（宝藏等；价签「买不起」着色） */
  walletFloor: { type: Number, default: 0 },
  /** 离店后将进入的小关 id（如 3-1） */
  nextLevelId: { type: String, default: "" },
  /** 宝藏「门票」：升级卡/升级包免费 */
  shopUpgradesFree: { type: Boolean, default: false },
  /** 新手教程进行中：屏蔽空宝藏栏说明弹窗 */
  tutorialActive: { type: Boolean, default: false },
  /** 商店引导：仅允许点击目标宝藏 */
  shopTutorialIntroActive: { type: Boolean, default: false },
  shopTutorialTargetTreasureId: { type: String, default: "" },
});

const emit = defineEmits([
  "open-options",
  "view-deck",
  "view-round-info",
  "view-stage-info",
  "next-level",
  "select-offer",
  "select-pack-offer",
  "select-voucher",
  "select-owned",
  "shop-reroll",
  "reorder-owned",
  "upgrade-interaction-unlock",
  "open-treasure-collection",
]);

/** 货架标价（含预设减价、随机优惠与清仓券） */
function shopOfferPriceView(base, offer = {}) {
  return buildShopOfferPriceView(base, offer, {
    wallet: props.walletAmount,
    ownedVoucherIds: props.ownedVoucherIds ?? [],
    runPresetId: props.runPresetId,
    walletFloor: props.walletFloor,
    shopUpgradesFree: props.shopUpgradesFree,
  });
}

/** @param {object} slot shopOffers 项 */
function shopOfferTreasureAccessoryChips(slot) {
  if (!slot || slot.kind !== "offer" || slot.offerType !== "treasure") return [];
  return getTreasureAccessoryChipVisualsFromEntity(slot);
}

/** @param {object} slot */
function isDeckShopOffer(slot) {
  return slot?.offerType === "deckTile" || slot?.offerType === "deckLetter";
}

/** @param {object} slot */
function deckOfferLetterTileBind(slot) {
  const p = buildPackDeckOfferLetterTileProps(slot);
  if (!p) {
    const raw = String(slot?.deckLetterRaw ?? "e").toLowerCase();
    return {
      letter: resolveLetterFromRaw(raw),
      rarity: slot?.letterRarity ?? slot?.rarity ?? "common",
      tileScoreBonus: 0,
      tileMultBonus: 0,
    };
  }
  return {
    letter: p.letter,
    rarity: p.rarity,
    materialId: p.materialId ?? undefined,
    accessoryId: p.accessoryId ?? undefined,
    treasureAccessoryId: p.treasureAccessoryId ?? undefined,
    tileScoreBonus: p.tileScoreBonus,
    tileMultBonus: p.tileMultBonus,
  };
}

const shopTitleRows = [
  [
    { letter: "S", rarity: "legendary" },
    { letter: "H", rarity: "epic" },
    { letter: "O", rarity: "rare" },
    { letter: "P", rarity: "common" },
  ],
];

const nextLevelPreviewAriaLabel = computed(() => {
  const id = String(props.nextLevelId ?? "").trim();
  return id ? `下一关 ${id}，点击查看关卡进度` : "下一关，点击查看关卡进度";
});

function onNextLevelPreviewClick() {
  if (props.interactionsDisabled || props.shopTutorialIntroActive) return;
  if (!String(props.nextLevelId ?? "").trim()) return;
  emit("view-stage-info");
}

/** @param {object} slot */
function isShopTutorialTargetTreasureOffer(slot) {
  if (!props.shopTutorialIntroActive) return false;
  if (slot?.kind !== "offer" || slot.offerType !== "treasure") return false;
  const target = String(props.shopTutorialTargetTreasureId ?? "").trim();
  if (!target) return false;
  return String(slot.treasureId ?? "") === target;
}

/** @param {object} slot */
function canSelectShopSingleOffer(slot) {
  if (props.interactionsDisabled) return false;
  if (props.shopTutorialIntroActive) return isShopTutorialTargetTreasureOffer(slot);
  return true;
}

function canSelectShopVoucherOffer() {
  if (props.interactionsDisabled) return false;
  if (props.shopTutorialIntroActive) return false;
  return true;
}

function canSelectShopPackOffer() {
  if (props.interactionsDisabled) return false;
  if (props.shopTutorialIntroActive) return false;
  return true;
}

function canSelectShopOwned() {
  if (props.interactionsDisabled) return false;
  if (props.shopTutorialIntroActive) return false;
  return true;
}

function onShopTreasureBarExpandClick() {
  if (props.shopTutorialIntroActive) return;
  emit("open-treasure-collection");
}

const shopWalletBoxRef = ref(null);
const deckViewBtnRef = ref(null);
const roundInfoBtnRef = ref(null);
const shopResultAreaRef = ref(null);
/** @type {(HTMLElement | undefined)[]} */
const ownedCellEls = [];

const shopResultWordlenVisible = ref(false);
const shopResultWordlenText = ref("");
const shopResultLevelShown = ref(0);
const shopResultScoreValue = ref(0);
const shopResultMultValue = ref(0);

const shopResultScoreText = computed(() => String(Math.max(0, Math.round(shopResultScoreValue.value))));
const shopResultMultText = computed(() => String(Math.max(0, Math.round(shopResultMultValue.value))));

/** 已购格保留空槽占位（kind:'empty'），避免其它商品位移；空槽用 visibility 隐藏但仍占格 */
const packOffersLayoutSlots = computed(() =>
  Array.isArray(props.packOffers) ? props.packOffers : [],
);

const shopOffersLayoutSlots = computed(() =>
  Array.isArray(props.shopOffers) ? props.shopOffers : [],
);

const firstGuaranteedTreasureOfferRef = ref(null);

function isFirstGuaranteedTreasureOffer(slot) {
  if (slot?.kind !== "offer" || slot.offerType !== "treasure") return false;
  const first = shopOffersLayoutSlots.value.find(
    (s) => s.kind === "offer" && s.offerType === "treasure",
  );
  return !!first && first.offerInstanceId === slot.offerInstanceId;
}

/** @param {unknown} el @param {object} slot */
function setFirstGuaranteedTreasureOfferRef(el, slot) {
  if (!isFirstGuaranteedTreasureOffer(slot)) return;
  firstGuaranteedTreasureOfferRef.value = el ? toDom(el) : null;
}

function setOwnedCellRef(i, el) {
  const node = toDom(el);
  if (node) ownedCellEls[i] = node;
  else delete ownedCellEls[i];
}

function toDom(el) {
  if (!el) return null;
  if (typeof el.getEl === "function") return el.getEl?.() ?? null;
  return el.$el ?? el;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bubbleAt(targetEl, text, kind) {
  bubbleAtShopPanel(targetEl, text, kind);
}

function wobblePanelLikeScoreSlot(el, delayS = 0, speed = 1) {
  if (!el) return;
  const s = Math.max(0.01, Number(speed) || 1);
  gsap.killTweensOf(el, "rotation,scale,x,y");
  const tCompress = 0.11;
  const tExpand = 0.15;
  const scaleDownStart = tCompress + tExpand - 0.05;
  const rotStart = tCompress + tExpand * 0.5;
  const rotD1 = 0.034;
  const rotD2 = 0.036;
  gsap.set(el, { x: 0, y: 0, rotation: 0, scale: 1, transformOrigin: "50% 55%" });
  const tl = gsap
    .timeline({ delay: delayS })
    .to(el, { scale: 0.78, duration: tCompress, ease: "circ.out" }, 0)
    .to(el, { scale: 1.18, duration: tExpand, ease: "circ.inOut" }, tCompress)
    .to(el, { scale: 1, duration: 0.3, ease: "circ.in" }, scaleDownStart)
    .to(el, { rotation: 2.6, duration: rotD1, ease: "power2.out" }, rotStart)
    .to(el, { rotation: -1.9, duration: rotD2, ease: "power2.inOut" }, rotStart + rotD1)
    .to(el, { rotation: 0, duration: 0.12, ease: "power2.out" }, rotStart + rotD1 + rotD2);
  tl.timeScale(s);
}

async function runPanelWobbleAndBubble(panelEl, text, kind, speed = 1) {
  if (!panelEl) return;
  const s = Math.max(0.01, Number(speed) || 1);
  wobblePanelLikeScoreSlot(panelEl, 0, s);
  await sleep(Math.round(145 / s));
  bubbleAt(panelEl, text, kind);
}

async function tweenResultValues(toScore, toMult, durationS = 0.44) {
  const state = { s: shopResultScoreValue.value, m: shopResultMultValue.value };
  await new Promise((resolve) => {
    gsap.to(state, {
      s: toScore,
      m: toMult,
      duration: durationS,
      ease: "expo.out",
      onUpdate: () => {
        shopResultScoreValue.value = Math.max(0, Math.round(state.s));
        shopResultMultValue.value = Math.max(0, Math.round(state.m));
      },
      onComplete: resolve,
    });
  });
  shopResultScoreValue.value = Math.max(0, Math.round(toScore));
  shopResultMultValue.value = Math.max(0, Math.round(toMult));
}

function popSettle(el, speed = 1) {
  if (!el) return;
  const s = Math.max(0.01, Number(speed) || 1);
  gsap.killTweensOf(el);
  gsap.set(el, { transformOrigin: "50% 55%", scale: 1.22 });
  gsap.to(el, { scale: 1, duration: 0.55 / s, ease: "expo.out" });
}

async function playSwitchToLengthDefault(lenLabel, level, scoreBefore, multBefore, speed = 1) {
  const s = Math.max(0.01, Number(speed) || 1);
  shopResultWordlenText.value = `${lenLabel}`;
  shopResultLevelShown.value = level;
  const wordlenMainEl = shopResultAreaRef.value?.getWordlenMainEl?.() ?? null;
  const scoreBoxEl = shopResultAreaRef.value?.getScoreBoxEl?.() ?? null;
  const multBoxEl = shopResultAreaRef.value?.getMultBoxEl?.() ?? null;
  const levelEl = shopResultAreaRef.value?.getWordlenLevelEl?.() ?? null;
  // 多长度切换：不归零，直接切到新长度默认值；x字母也加入序列动画
  popSettle(wordlenMainEl, s);
  await sleep(Math.round(60 / s));
  popSettle(levelEl, s);
  await sleep(Math.round(60 / s));
  shopResultScoreValue.value = Math.max(0, Math.round(scoreBefore));
  popSettle(scoreBoxEl, s);
  await sleep(Math.round(60 / s));
  shopResultMultValue.value = Math.max(0, Math.round(multBefore));
  popSettle(multBoxEl, s);
  await sleep(Math.round(180 / s));
}

async function playOneLengthUpgrade(
  lenValue,
  beforeLevel,
  isFirstLength,
  isLastLength,
  speed = 1,
  observatoryBoost = false,
) {
  const s = Math.max(0.01, Number(speed) || 1);
  const backToNormalMid = isLastLength ? s - (s - 1) * 0.5 : s;
  const backToNormalEnd = isLastLength ? 1 : s;
  const len = Math.max(3, Math.min(16, Math.round(Number(lenValue) || 3)));
  const lenLabel = `${len}字母`;
  const nextLevel = beforeLevel + 1;
  const levelMap = { [len]: beforeLevel };
  /** 分数面板展示单字母分数，不乘词长 */
  const scoreBefore = getBaseScorePerLetterForWordLength(len, levelMap);
  const multBefore = getLengthMultiplier(len, levelMap);
  const stepAdds = observatoryBoost
    ? getObservatoryBoostedLengthUpgradeStepAdds(len)
    : getLengthUpgradeStepAdds(len);
  const scoreAdd = stepAdds.scoreAdd;
  const multAdd = stepAdds.multAdd;
  const scoreAfter = scoreBefore + scoreAdd;
  const multAfter = multBefore + multAdd;

  if (
    isFirstLength &&
    Math.max(0, Math.round(shopResultScoreValue.value)) === 0 &&
    Math.max(0, Math.round(shopResultMultValue.value)) === 0
  ) {
    shopResultWordlenText.value = `${lenLabel}`;
    shopResultLevelShown.value = beforeLevel;
    // 首个长度允许与后续 +x 动画重叠，压缩体感间隔
    void tweenResultValues(scoreBefore, multBefore, 0.42 / s);
  } else {
    await playSwitchToLengthDefault(lenLabel, beforeLevel, scoreBefore, multBefore, s);
  }

  const stepGapMs = 200;
  const firstLengthLeadInGapMs = 160;
  const valueTweenS = 0.46;
  await sleep(Math.round((isFirstLength ? firstLengthLeadInGapMs : stepGapMs) / s));
  const levelEl = shopResultAreaRef.value?.getWordlenLevelEl?.() ?? null;
  await runPanelWobbleAndBubble(levelEl, "+1", "level", s);
  shopResultLevelShown.value = nextLevel;

  await sleep(Math.round(stepGapMs / s));
  const scoreBoxEl = shopResultAreaRef.value?.getScoreBoxEl?.() ?? null;
  await runPanelWobbleAndBubble(scoreBoxEl, `+${scoreAdd}`, "score", s);
  // 分数补间并行进行，不阻塞倍率 +x 的触发节拍
  const scoreTweenPromise = tweenResultValues(scoreAfter, multBefore, valueTweenS / s);

  await sleep(Math.round(stepGapMs / s));
  const multBoxEl = shopResultAreaRef.value?.getMultBoxEl?.() ?? null;
  await runPanelWobbleAndBubble(multBoxEl, `+${multAdd}`, "mult", backToNormalMid);
  await scoreTweenPromise;
  await tweenResultValues(scoreAfter, multAfter, valueTweenS / backToNormalMid);

  if (isLastLength) {
    shopResultWordlenVisible.value = false;
    await nextTick();
    emit("upgrade-interaction-unlock");
    await sleep(Math.round(460 / backToNormalEnd));
    await tweenResultValues(0, 0, 0.75 / backToNormalEnd);
  }
}

const RARITY_RESULT_LINE = Object.freeze({
  common: "稀有度 · 普通",
  rare: "稀有度 · 稀有",
  epic: "稀有度 · 史诗",
  legendary: "稀有度 · 传说",
});

async function playSwitchToRarityDefault(line, level, scoreBefore, multBefore, speed = 1) {
  const s = Math.max(0.01, Number(speed) || 1);
  shopResultWordlenText.value = line;
  shopResultLevelShown.value = level;
  const wordlenMainEl = shopResultAreaRef.value?.getWordlenMainEl?.() ?? null;
  const scoreBoxEl = shopResultAreaRef.value?.getScoreBoxEl?.() ?? null;
  const multBoxEl = shopResultAreaRef.value?.getMultBoxEl?.() ?? null;
  const levelEl = shopResultAreaRef.value?.getWordlenLevelEl?.() ?? null;
  popSettle(wordlenMainEl, s);
  await sleep(Math.round(60 / s));
  popSettle(levelEl, s);
  await sleep(Math.round(60 / s));
  shopResultScoreValue.value = Math.max(0, Math.round(scoreBefore));
  popSettle(scoreBoxEl, s);
  await sleep(Math.round(60 / s));
  shopResultMultValue.value = Math.max(0, Math.round(multBefore));
  popSettle(multBoxEl, s);
  await sleep(Math.round(180 / s));
}

async function playOneRarityUpgrade(
  rarityKey,
  beforeLevel,
  speed = 1,
  isFirstRarity = true,
  isLastRarity = true,
) {
  const s = Math.max(0.01, Number(speed) || 1);
  const backToNormalMid = isLastRarity ? s - (s - 1) * 0.5 : s;
  const backToNormalEnd = isLastRarity ? 1 : s;
  const rk = String(rarityKey ?? "common");
  const line = RARITY_RESULT_LINE[rk] ?? `稀有度 · ${rk}`;
  const nextLevel = beforeLevel + 1;
  const levelMapBefore = { [rk]: beforeLevel };
  const levelMapAfter = { [rk]: nextLevel };
  const scoreBefore = getRarityBonusForRarity(rk, levelMapBefore);
  const multBefore = getRarityMultBonusForRarity(rk, levelMapBefore);
  const scoreAdd = Number(RARITY_UPGRADE_BALANCE[rk]?.scorePerLevel) || 0;
  const scoreAfter = scoreBefore + scoreAdd;
  const multAfter = getRarityMultBonusForRarity(rk, levelMapAfter);
  const multDelta = multAfter - multBefore;

  if (
    isFirstRarity &&
    Math.max(0, Math.round(shopResultScoreValue.value)) === 0 &&
    Math.max(0, Math.round(shopResultMultValue.value)) === 0
  ) {
    shopResultWordlenText.value = line;
    shopResultLevelShown.value = beforeLevel;
    void tweenResultValues(scoreBefore, multBefore, 0.42 / s);
  } else if (isFirstRarity) {
    shopResultWordlenText.value = line;
    shopResultLevelShown.value = beforeLevel;
    shopResultScoreValue.value = Math.max(0, Math.round(scoreBefore));
    shopResultMultValue.value = Math.max(0, Math.round(multBefore));
    shopResultWordlenVisible.value = true;
    await nextTick();
    const wordlenMainEl = shopResultAreaRef.value?.getWordlenMainEl?.() ?? null;
    popSettle(wordlenMainEl, s);
    await sleep(Math.round(120 / s));
  } else {
    await playSwitchToRarityDefault(line, beforeLevel, scoreBefore, multBefore, s);
  }

  const levelEl = shopResultAreaRef.value?.getWordlenLevelEl?.() ?? null;
  const scoreBoxEl = shopResultAreaRef.value?.getScoreBoxEl?.() ?? null;
  const multBoxEl = shopResultAreaRef.value?.getMultBoxEl?.() ?? null;

  const stepGapMs = 200;
  const firstRarityLeadInGapMs = 160;
  const valueTweenS = 0.46;
  await sleep(Math.round((isFirstRarity ? firstRarityLeadInGapMs : stepGapMs) / s));
  await runPanelWobbleAndBubble(levelEl, "+1", "level", s);
  shopResultLevelShown.value = nextLevel;

  await sleep(Math.round(stepGapMs / s));
  const scoreTweenPromise = tweenResultValues(scoreAfter, multBefore, valueTweenS / s);
  await runPanelWobbleAndBubble(scoreBoxEl, `+${scoreAdd}`, "score", s);

  await sleep(Math.round(stepGapMs / s));
  if (multDelta > 0) {
    await runPanelWobbleAndBubble(multBoxEl, `+${multDelta}`, "mult", backToNormalMid);
  }
  await scoreTweenPromise;
  await tweenResultValues(scoreAfter, multAfter, valueTweenS / backToNormalMid);

  if (isLastRarity) {
    shopResultWordlenVisible.value = false;
    await nextTick();
    emit("upgrade-interaction-unlock");
    await sleep(Math.round(460 / backToNormalEnd));
    await tweenResultValues(0, 0, 0.75 / backToNormalEnd);
  }
}

async function playUpgradeResult(payload) {
  if (payload?.upgradeKind === "rarity_sequence") {
    const rarities = Array.isArray(payload.rarities) ? payload.rarities : [];
    shopResultWordlenVisible.value = true;
    shopResultScoreValue.value = 0;
    shopResultMultValue.value = 0;
    for (let i = 0; i < rarities.length; i += 1) {
      const row = rarities[i];
      const rarityKey = String(row?.rarityKey ?? "common");
      const beforeLevel = Math.max(1, Math.round(Number(row?.beforeLevel) || 1));
      const isFirst = i === 0;
      const isLast = i === rarities.length - 1;
      const speed = resolveUpgradePlaybackSpeed(i, payload);
      await playOneRarityUpgrade(rarityKey, beforeLevel, speed, isFirst, isLast);
      if (!isLast) await sleep(Math.round(30 / speed));
    }
    return;
  }

  if (payload?.upgradeKind === "rarity") {
    shopResultWordlenVisible.value = true;
    shopResultScoreValue.value = 0;
    shopResultMultValue.value = 0;
    const beforeLevel = Math.max(1, Math.round(Number(payload?.beforeLevel) || 1));
    await playOneRarityUpgrade(payload.rarityKey, beforeLevel, 1);
    return;
  }

  const lenMin = Math.max(3, Math.min(16, Math.round(Number(payload?.lengthMin) || 3)));
  const lenMax = Math.max(lenMin, Math.min(16, Math.round(Number(payload?.lengthMax) || lenMin)));
  const beforeLevel = Math.max(1, Math.round(Number(payload?.beforeLevel) || 1));
  const isObsBoost =
    typeof payload?.isLengthObservatoryBoosted === "function"
      ? payload.isLengthObservatoryBoosted
      : () => false;

  shopResultWordlenVisible.value = true;
  shopResultScoreValue.value = 0;
  shopResultMultValue.value = 0;

  const beforeLevelsByLen = payload?.beforeLevelsByLen;
  for (let len = lenMin; len <= lenMax; len++) {
    const isFirst = len === lenMin;
    const isLast = len === lenMax;
    const speed = resolveUpgradePlaybackSpeed(len - lenMin, payload);
    const lenBeforeLevel =
      beforeLevelsByLen != null && beforeLevelsByLen[len] != null
        ? Math.max(1, Math.round(Number(beforeLevelsByLen[len])) || 1)
        : beforeLevel;
    await playOneLengthUpgrade(len, lenBeforeLevel, isFirst, isLast, speed, isObsBoost(len));
    if (!isLast) await sleep(Math.round(30 / speed));
  }
}

function formatWallet(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

/** 牌包区组合包角标：类型简称（与详情层一致） */
function bundlePackCaption(slot) {
  const k = String(slot?.bundleKind ?? "");
  if (k === "spell") return "法术";
  if (k === "upgrade") return "升级";
  if (k === "treasure") return "宝藏";
  if (k === "tile") return "字母";
  return "组合包";
}

/** 与棋盘 / TreasureDetailLayer letter-gem 的 gem-* 一致 */
function gemClassForTreasureRarity(rarity) {
  if (rarity === "epic") return "gem-epic";
  if (rarity === "legendary") return "gem-legendary";
  if (rarity === "common") return "gem-common";
  return "gem-rare";
}

/** 飞入详情：起点用 icon 框，不用含价签的整列 shop-treasure-visual */
function shopOfferFlyOriginEl(root) {
  return resolveOfferFlyOriginEl(root) ?? root;
}

function onSelectOffer(slot, e) {
  if (!canSelectShopSingleOffer(slot)) return;
  const root = e.currentTarget;
  const originEl = isDeckShopOffer(slot) ? root : shopOfferFlyOriginEl(root);
  emit("select-offer", { treasure: slot, originEl });
}

function onSelectPackOffer(slot, e) {
  if (!canSelectShopPackOffer()) return;
  const root = e.currentTarget;
  emit("select-pack-offer", { treasure: slot, originEl: shopOfferFlyOriginEl(root) });
}

function onSelectVoucher(slot, e) {
  if (!canSelectShopVoucherOffer()) return;
  const root = e.currentTarget;
  emit("select-voucher", { treasure: slot, originEl: shopOfferFlyOriginEl(root) });
}

function onSelectOwned(index, treasure, e) {
  if (!canSelectShopOwned()) return;
  if (shopOwnedDragMoved.value) return;
  if (!treasure) return;
  emit("select-owned", { index, treasure, originEl: e.currentTarget });
}

const showEmptyTreasureSlotHelp = ref(false);
const shopTreasureBarRowRef = ref(null);
const shopOwnedTreasureFilledCount = computed(() => countFilledTreasureSlots(props.ownedTreasures));
const shopTreasureBarStackMode = computed(() => isTreasureBarStackMode(shopOwnedTreasureFilledCount.value));
const shopHiddenTreasureBarCount = computed(() => countHiddenBarTreasures(props.ownedTreasures));

function onShopEmptyTreasureSlotClick() {
  if (props.tutorialActive) return;
  showEmptyTreasureSlotHelp.value = true;
}

/** @param {number} i @param {object | null} slot */
function shopTreasureGemClassResolver(i, slot) {
  void i;
  return gemClassForTreasureRarity(slot?.rarity);
}

const shopTreasureSlotsCtnRef = ref(null);

const {
  dragActive: shopOwnedDragActive,
  dragGhostVisible: shopOwnedDragGhostVisible,
  dragPlaceholderVisible: shopOwnedDragPlaceholderVisible,
  dragSourceIndex: shopOwnedDragSourceIndex,
  dragMoved: shopOwnedDragMoved,
  dragTreasure: shopOwnedDragTreasure,
  dragGhostStyle: shopOwnedDragGhostStyle,
  dragPlaceholderStyle: shopOwnedDragPlaceholderStyle,
  displaySlots: displayOwnedTreasures,
  displayKeys: displayOwnedTreasureKeys,
  onSlotPointerDown: onShopOwnedSlotPointerDown,
} = useTreasureSlotReorder({
  getSourceSlots: () => props.ownedTreasures,
  keyOrder: props.ownedTreasureKeyOrderBag.ref,
  canDrag: () => !props.interactionsDisabled && !props.shopTutorialIntroActive,
  onCommit: (preview) => emit("reorder-owned", [...preview]),
  getSlotElement: (i) => ownedCellEls[i] ?? null,
  getOverlayContainer: () =>
    shopTreasureBarRowRef.value?.getContainerEl?.() ?? shopTreasureSlotsCtnRef.value,
  stackMode: () => shopTreasureBarStackMode.value,
  visibleSlotMax: TREASURE_BAR_VISIBLE_MAX,
});

const displayTreasureChargeBySlot = computed(() =>
  props.treasureChargeBySlot.slice(0, TREASURE_BAR_VISIBLE_MAX),
);
const displayTreasureChargeProgressBySlot = computed(() =>
  props.treasureChargeProgressBySlot.slice(0, TREASURE_BAR_VISIBLE_MAX),
);
const displayTreasureEffectDepletedBySlot = computed(() =>
  props.treasureEffectDepletedBySlot.slice(0, TREASURE_BAR_VISIBLE_MAX),
);

const shopOwnedDragChargeState = computed(() => {
  const treasure = shopOwnedDragTreasure.value;
  if (!treasure?.treasureId) return null;
  const idx = props.ownedTreasures.findIndex((s) => s?.treasureId === treasure.treasureId);
  if (idx < 0) return null;
  return displayTreasureChargeBySlot.value[idx] ?? null;
});
const shopOwnedDragChargeProgress = computed(() => {
  const treasure = shopOwnedDragTreasure.value;
  if (!treasure?.treasureId) return 0;
  const idx = props.ownedTreasures.findIndex((s) => s?.treasureId === treasure.treasureId);
  if (idx < 0) return 0;
  return displayTreasureChargeProgressBySlot.value[idx] ?? 0;
});
const shopOwnedDragEffectDepleted = computed(() => {
  const treasure = shopOwnedDragTreasure.value;
  if (!treasure?.treasureId) return false;
  const idx = props.ownedTreasures.findIndex((s) => s?.treasureId === treasure.treasureId);
  if (idx < 0) return false;
  return displayTreasureEffectDepletedBySlot.value[idx] === true;
});

/** 卷轴券生效：本轮信息按钮 wobble + 白色「-N大关」气泡 */
async function playGlyphRoundInfoFx(text, speed = 1) {
  await runPanelWobbleAndBubble(roundInfoBtnRef.value, text, "info", speed);
}

const voucherBonusProductRef = ref(null);

/** 法术促销：额外优惠券格 scale 0 → 过冲 → 回落 */
async function playVoucherBonusEnterAnim() {
  await nextTick();
  const root = voucherBonusProductRef.value;
  const visual =
    root instanceof HTMLElement
      ? root.querySelector(".shop-treasure-visual") ?? root
      : null;
  await runVoucherShelfEnterPopAnim(visual);
}

defineExpose({
  getWalletEl: () => shopWalletBoxRef.value,
  getOwnedSlotEl: (i) => {
    const ix = Math.floor(Number(i));
    if (!Number.isFinite(ix) || ix < 0 || !isTreasureBarSlotVisible(ix)) return null;
    return ownedCellEls[ix] ?? null;
  },
  getTreasureBarExpandBtnEl: () => shopTreasureBarRowRef.value?.getExpandBtnEl?.() ?? null,
  getDeckViewBtnEl: () => deckViewBtnRef.value ?? null,
  getFirstGuaranteedTreasureOfferEl: () => firstGuaranteedTreasureOfferRef.value,
  playGlyphRoundInfoFx,
  playUpgradeResult,
  playVoucherBonusEnterAnim,
});
</script>

<style scoped>
.shop-panel {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
  --shop-header-h: calc(140 * var(--rpx));
  --shop-row-single-card-actions-h: calc(215 * var(--rpx));
  --shop-row-voucher-pack-h: calc(232 * var(--rpx));
  --shop-footer-h: calc(185 * var(--rpx));
}

.shop-section {
  background: #6b5f55;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  border: calc(2 * var(--rpx)) solid rgba(255, 255, 255, 0.1);
}

.shop-header-panel {
  flex: 0 0 var(--shop-header-h);
  padding: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: calc(12 * var(--rpx));
}

.shop-logo {
  flex-shrink: 0;
  min-width: 0;
}

.shop-header-info-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: calc(6 * var(--rpx));
}

.shop-header-info-col .header-box {
  flex: 0 0 auto;
  width: 100%;
}

.header-box-next-level--clickable {
  cursor: pointer;
  position: relative;
}

.header-box-next-level--clickable::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: transparent;
  transition: background 0.1s ease;
}

.header-box-next-level--clickable:hover::after {
  background: rgba(255, 255, 255, 0.06);
}

.header-box-next-level--clickable:active::after {
  background: rgba(0, 0, 0, 0.05);
}

.header-box-next-level--clickable:focus-visible {
  outline: calc(2 * var(--rpx)) solid #edc22e;
  outline-offset: calc(2 * var(--rpx));
}

.header-box-next-level--clickable[aria-disabled="true"],
.header-box-next-level--clickable.header-box-next-level--tutorial-blocked {
  cursor: not-allowed;
  opacity: 0.48;
  pointer-events: none;
}

.shop-treasure-visual--tutorial-blocked {
  opacity: 0.48;
  pointer-events: none;
  cursor: not-allowed;
}

.header-next-level-id {
  flex-shrink: 0;
  font-size: calc(26 * var(--rpx));
  font-weight: 800;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.shop-result-area {
  flex: 0 0 auto;
}

.shop-result-area :deep(.result-wordlen) {
  align-items: center;
}

.shop-result-area :deep(.result-wordlen-level) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: calc(38 * var(--rpx));
  padding: calc(2 * var(--rpx)) calc(14 * var(--rpx));
  border-radius: calc(8 * var(--rpx));
  background: var(--btn-yellow);
  color: #fff;
  opacity: 1;
  text-shadow: 0 calc(1 * var(--rpx)) 0 rgba(120, 84, 40, 0.5);
}

.shop-body {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(6 * var(--rpx)) 0;
}

.shop-middle {
  width: 100%;
  height: calc(var(--shop-row-single-card-actions-h) + var(--shop-row-voucher-pack-h) + calc(10 * var(--rpx)));
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
}

.shop-row {
  width: 100%;
  min-height: 0;
}

.shop-row--single-card-actions {
  flex: 0 0 var(--shop-row-single-card-actions-h);
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: calc(12 * var(--rpx));
}

.shop-row--voucher-pack {
  flex: 0 0 var(--shop-row-voucher-pack-h);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(10 * var(--rpx));
  align-items: stretch;
}

.shop-pack-panel,
.shop-voucher-panel,
.shop-single-card-panel {
  width: 100%;
  height: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(14 * var(--rpx));
  box-sizing: border-box;
}

.shop-single-card-panel {
  flex: 1;
}

.shop-pack-offers {
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  gap: calc(8 * var(--rpx));
}

.shop-single-card-offers {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: calc(8 * var(--rpx));
  align-items: center;
  justify-content: center;
  overflow: visible;
}

/* 单卡区 / 优惠券 / 牌包区：与 --shop-shelf-cell-size 统一 */
.shop-single-card-offers .shop-treasure-product,
.shop-voucher-offers .shop-treasure-product,
.shop-pack-offers .shop-treasure-product {
  position: relative;
  width: var(--shop-shelf-cell-size);
  flex: 0 0 var(--shop-shelf-cell-size);
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.shop-treasure-product--pack {
  flex-shrink: 0;
}

.shop-treasure-emoji--icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 已购：占位与可购列同尺寸，内容不可见、不占交互，防止另一格位移 */
.shop-treasure-visual--slot-empty {
  visibility: hidden;
  pointer-events: none;
}

.shop-actions-col {
  flex: 0 0 calc(200 * var(--rpx));
  width: calc(200 * var(--rpx));
  display: flex;
  flex-direction: column;
  gap: calc(12 * var(--rpx));
  justify-content: stretch;
  align-items: stretch;
  height: 100%;
}

.shop-actions-col .shop-btn {
  flex: 1 1 0;
  min-height: 0;
}

.shop-actions-col .shop-btn--action-reroll {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: calc(10 * var(--rpx));
  text-align: left;
}

.shop-actions-col .shop-btn-reroll-price {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.shop-actions-col .shop-btn-reroll-dollar {
  margin-right: calc(1 * var(--rpx));
}

.shop-actions-col .shop-btn-reroll-lead {
  display: flex;
  align-items: center;
  gap: calc(8 * var(--rpx));
  min-width: 0;
  flex-shrink: 0;
}

.shop-actions-col .shop-btn--action-next {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(8 * var(--rpx));
}

.shop-actions-col .shop-actions-btn-icon {
  font-size: calc(28 * var(--rpx));
  flex-shrink: 0;
  line-height: 1;
}

.shop-footer-panel {
  flex: 0 0 var(--shop-footer-h);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: calc(12 * var(--rpx));
}

.shop-footer-actions {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: calc(10 * var(--rpx));
  width: 100%;
}

.shop-footer-action-btn {
  flex: 1;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(6 * var(--rpx));
  min-height: calc(72 * var(--rpx));
  padding: calc(12 * var(--rpx)) calc(10 * var(--rpx));
}

.shop-footer-action-btn--options {
  background: var(--btn-yellow);
  color: #776e65;
}

:global(.shop-level-popup-bubble) {
  background: var(--btn-yellow);
  text-shadow: 0 calc(1 * var(--rpx)) 0 rgba(120, 84, 40, 0.5);
}

:global(.shop-round-info-popup-bubble) {
  background: var(--btn-white);
  color: var(--text);
  font-weight: 600;
}
</style>
