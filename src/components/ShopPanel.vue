<template>
  <div class="shop-panel">
    <div class="shop-header-panel">
      <TileLetterShowcase class="shop-logo" aria-label="商店" content-align="start" :rows="shopTitleRows" />

      <div
        ref="shopWalletBoxRef"
        class="header-box header-box-split header-box-wallet"
        title="当前钱包余额"
      >
        <span class="header-split-label">钱包</span>
        <span class="header-wallet-marks">
          <span class="money-dollar-char">$</span
          ><span class="header-wallet-amount">{{ formatWallet(walletAmount) }}</span>
        </span>
      </div>
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
                    class="shop-treasure-visual"
                    :class="{ 'shop-treasure-visual--deck-offer': isDeckShopOffer(slot) }"
                    @pointerdown.stop="!interactionsDisabled && onSelectOffer(slot, $event)"
                  >
                    <LetterTile
                      v-if="isDeckShopOffer(slot)"
                      variant="grid"
                      class="shop-shelf-letter-tile"
                      :letter="displayLetterForOffer(slot)"
                      :rarity="slot.letterRarity ?? slot.rarity ?? 'common'"
                      :material-id="slot.offerType === 'deckTile' ? slot.deckTileMaterialId : undefined"
                      :accessory-id="deckOfferAccessoryId(slot)"
                      :treasure-accessory-id="deckOfferTreasureAccessoryId(slot)"
                      :tile-score-bonus="0"
                      :tile-mult-bonus="0"
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
                        <span
                          v-if="shopOfferTreasureAccessoryChip(slot)"
                          class="treasure-accessory-chip"
                          :class="shopOfferTreasureAccessoryChip(slot).chipClass"
                          aria-hidden="true"
                        >
                          <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
                          <i
                            class="treasure-accessory-chip-icon"
                            :class="shopOfferTreasureAccessoryChip(slot).iconClass"
                            aria-hidden="true"
                          />
                        </span>
                      </template>
                    </div>
                    <div class="shop-treasure-price" aria-label="售价">
                      <div class="shop-treasure-price-inner">${{ shopMarkPrice(slot.price) }}</div>
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
              :disabled="interactionsDisabled || !canShopReroll"
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
              :disabled="interactionsDisabled"
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
                    @pointerdown.stop="!interactionsDisabled && onSelectVoucher(voucherSlot, $event)"
                  >
                    <VoucherStamp
                      :emoji="voucherSlot.emoji"
                      :display-name="voucherSlot.name"
                      :price="shopMarkPrice(voucherSlot.price)"
                    />
                  </div>
                  <div v-else class="shop-treasure-visual shop-treasure-visual--slot-empty" aria-hidden="true">
                    <VoucherStamp empty reserve-price-slot />
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
                    @pointerdown.stop="!interactionsDisabled && onSelectPackOffer(slot, $event)"
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
                      <div class="shop-treasure-price-inner">${{ shopMarkPrice(slot.price) }}</div>
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
      <div class="shop-footer-actions" role="group" aria-label="牌库与信息">
        <button type="button" class="deck-btn shop-footer-action-btn" :disabled="interactionsDisabled" @click="emit('view-round-info')">
          <i class="ri-information-line deck-btn-icon" aria-hidden="true"></i>
          <span>本轮信息</span>
        </button>
        <button
          ref="deckViewBtnRef"
          type="button"
          class="deck-btn shop-footer-action-btn"
          :disabled="interactionsDisabled"
          @click="emit('view-deck')"
        >
          <i class="ri-stack-line deck-btn-icon" aria-hidden="true"></i>
          <span>查看牌库</span>
        </button>
      </div>

      <div class="treasure-slots-ctn shop-footer-treasure-row" aria-label="已拥有的宝藏">
        <TransitionGroup
          name="treasure-slot-reorder"
          tag="div"
          :class="['treasure-slots', { 'treasure-slots--dragging': shopOwnedDragActive }]"
        >
          <TreasureSlot
            v-for="(slot, i) in displayOwnedTreasures"
            :key="displayOwnedTreasureKeys[i]"
            :treasure="slot"
            :gem-class="gemClassForTreasureRarity(slot?.rarity)"
            :charge-state="displayTreasureChargeBySlot[i]"
            :charge-progress="displayTreasureChargeProgressBySlot[i] ?? 0"
            :slot-class="{
              'treasure-slot--dragging': shopOwnedDragActive && i === shopOwnedDragCurrentIndex,
            }"
            draggable="true"
            :ref="(el) => setOwnedCellRef(i, el)"
            @dragstart="onShopOwnedDragStart(i, $event)"
            @dragover="onShopOwnedDragOver(i, $event)"
            @drop="onShopOwnedDrop(i, $event)"
            @dragend="onShopOwnedDragEnd"
            @click.stop="onSelectOwned(i, slot, $event)"
          />
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick, watch } from "vue";
import gsap from "gsap";
import TileLetterShowcase from "./TileLetterShowcase.vue";
import TreasureSlot from "./TreasureSlot.vue";
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
import { getTreasureAccessoryChipVisual } from "../game/treasureAccessories.js";
import { applyShopDiscountPrice } from "../vouchers/voucherRuntime.js";

const props = defineProps({
  walletAmount: { type: Number, default: 0 },
  shopOffers: { type: Array, required: true },
  packOffers: { type: Array, default: () => [] },
  /** 单槽优惠券行：与 pack slot 同构 `{ kind:'offer'|'empty', ... }` */
  voucherSlot: {
    type: Object,
    default: () => ({ kind: "empty", emptySlotId: 0 }),
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
  shopRerollCost: { type: Number, default: 5 },
  canShopReroll: { type: Boolean, default: false },
  interactionsDisabled: { type: Boolean, default: false },
});

const emit = defineEmits([
  "view-deck",
  "view-round-info",
  "next-level",
  "select-offer",
  "select-pack-offer",
  "select-voucher",
  "select-owned",
  "shop-reroll",
  "reorder-owned",
  "upgrade-interaction-unlock",
]);

/** 货架标价（含清仓/半价券） */
function shopMarkPrice(base) {
  return applyShopDiscountPrice(Number(base) || 0, props.ownedVoucherIds ?? []);
}

/** @param {object} slot shopOffers 项 */
function shopOfferTreasureAccessoryChip(slot) {
  if (!slot || slot.kind !== "offer" || slot.offerType !== "treasure") return null;
  return getTreasureAccessoryChipVisual(slot.treasureAccessoryId);
}

/** @param {object} slot */
function displayLetterForOffer(slot) {
  const raw = String(slot?.deckLetterRaw ?? "e").toLowerCase();
  return raw === "q" ? "Qu" : raw.toUpperCase();
}

/** @param {object} slot */
function isDeckShopOffer(slot) {
  return slot?.offerType === "deckLetter" || slot?.offerType === "deckTile";
}

/** @param {object} slot */
function deckOfferAccessoryId(slot) {
  if (!slot || slot.offerType !== "deckTile") return undefined;
  const id = slot.deckTileAccessoryId;
  const s = id != null ? String(id).trim() : "";
  return s || undefined;
}

function deckOfferTreasureAccessoryId(slot) {
  if (!slot || slot.offerType !== "deckTile") return undefined;
  const id = slot.deckTileTreasureAccessoryId;
  const s = id != null ? String(id).trim() : "";
  return s || undefined;
}

const shopTitleRows = [
  [
    { letter: "S", rarity: "legendary" },
    { letter: "H", rarity: "epic" },
    { letter: "O", rarity: "rare" },
    { letter: "P", rarity: "common" },
  ],
];

const shopWalletBoxRef = ref(null);
const deckViewBtnRef = ref(null);
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

/** 尾部仅占位的空槽不渲染，避免 2 个实货 + 1 空槽时整体被拉成居左 */
const packOffersLayoutSlots = computed(() => {
  const slots = props.packOffers;
  if (!Array.isArray(slots) || slots.length === 0) return [];
  const out = [...slots];
  while (out.length > 0 && out[out.length - 1]?.kind !== "offer") {
    out.pop();
  }
  return out.length > 0 ? out : [...slots];
});

const shopOffersLayoutSlots = computed(() => {
  const slots = props.shopOffers;
  if (!Array.isArray(slots) || slots.length === 0) return [];
  const out = [...slots];
  while (out.length > 0 && out[out.length - 1]?.kind !== "offer") {
    out.pop();
  }
  return out.length > 0 ? out : [...slots];
});

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
  if (!targetEl) return;
  const rect = targetEl.getBoundingClientRect();
  const div = document.createElement("div");
  if (kind === "mult") div.className = "mult-popup-bubble";
  else if (kind === "level") div.className = "score-popup-bubble shop-level-popup-bubble";
  else div.className = "score-popup-bubble";
  div.textContent = text;
  document.body.appendChild(div);
  const rpx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx").trim()) || 1;
  gsap.set(div, {
    position: "fixed",
    left: rect.left + rect.width / 2,
    top: rect.top - 12 * rpx,
    xPercent: -50,
    yPercent: -100,
    transformOrigin: "50% 100%",
    force3D: true,
    zIndex: 350,
  });
  gsap.fromTo(
    div,
    { opacity: 0, y: 18, scale: 0.5 },
    { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "expo.out" },
  );
  gsap.to(div, {
    opacity: 0,
    y: -14,
    scale: 0.92,
    duration: 0.28,
    delay: 0.4,
    ease: "expo.out",
    onComplete: () => div.remove(),
  });
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
  // 与记分 letter-tile 一致：在缩小+放大到约 80% 进度时弹出 +x
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

async function playOneRarityUpgrade(rarityKey, beforeLevel, speed = 1) {
  const s = Math.max(0.01, Number(speed) || 1);
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

  shopResultWordlenText.value = line;
  shopResultLevelShown.value = beforeLevel;
  shopResultScoreValue.value = Math.max(0, Math.round(scoreBefore));
  shopResultMultValue.value = Math.max(0, Math.round(multBefore));
  shopResultWordlenVisible.value = true;
  await nextTick();

  const wordlenMainEl = shopResultAreaRef.value?.getWordlenMainEl?.() ?? null;
  const levelEl = shopResultAreaRef.value?.getWordlenLevelEl?.() ?? null;
  const scoreBoxEl = shopResultAreaRef.value?.getScoreBoxEl?.() ?? null;
  const multBoxEl = shopResultAreaRef.value?.getMultBoxEl?.() ?? null;
  popSettle(wordlenMainEl, s);
  await sleep(Math.round(120 / s));

  const stepGapMs = 200;
  const valueTweenS = 0.46;
  await sleep(Math.round(stepGapMs / s));
  await runPanelWobbleAndBubble(levelEl, "+1", "level", s);
  shopResultLevelShown.value = nextLevel;

  await sleep(Math.round(stepGapMs / s));
  const scoreTweenPromise = tweenResultValues(scoreAfter, multBefore, valueTweenS / s);
  await runPanelWobbleAndBubble(scoreBoxEl, `+${scoreAdd}`, "score", s);

  await sleep(Math.round(stepGapMs / s));
  if (multDelta > 0) {
    await runPanelWobbleAndBubble(multBoxEl, `+${multDelta}`, "mult", s);
  }
  await scoreTweenPromise;
  await tweenResultValues(scoreAfter, multAfter, valueTweenS / s);

  shopResultWordlenVisible.value = false;
  await nextTick();
  emit("upgrade-interaction-unlock");
  await sleep(Math.round(460 / s));
  await tweenResultValues(0, 0, 0.75 / s);
}

async function playUpgradeResult(payload) {
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

  for (let len = lenMin; len <= lenMax; len++) {
    const isFirst = len === lenMin;
    const isLast = len === lenMax;
    const speed = 1 + 0.3 * (len - lenMin);
    await playOneLengthUpgrade(len, beforeLevel, isFirst, isLast, speed, isObsBoost(len));
    if (!isLast) await sleep(Math.round(30 / speed));
  }
}

function formatWallet(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

function isSingleDigitLabel(label) {
  return /^\d$/.test(String(label ?? "").trim());
}

/** 牌包区组合包角标：类型简称（与详情层一致） */
function bundlePackCaption(slot) {
  const k = String(slot?.bundleKind ?? "");
  if (k === "spell") return "法术";
  if (k === "upgrade") return "升级";
  if (k === "treasure") return "宝藏";
  if (k === "letter") return "字母";
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

function onSelectOffer(slot, e) {
  if (props.interactionsDisabled) return;
  const root = e.currentTarget;
  const originEl =
    isDeckShopOffer(slot) ? root.querySelector(".shop-shelf-letter-tile") ?? root : root;
  emit("select-offer", { treasure: slot, originEl });
}

function onSelectPackOffer(slot, e) {
  if (props.interactionsDisabled) return;
  const root = e.currentTarget;
  emit("select-pack-offer", { treasure: slot, originEl: root });
}

function onSelectVoucher(slot, e) {
  if (props.interactionsDisabled) return;
  const root = e.currentTarget;
  emit("select-voucher", { treasure: slot, originEl: root });
}

function onSelectOwned(index, treasure, e) {
  if (props.interactionsDisabled) return;
  if (shopOwnedDragMoved.value) return;
  emit("select-owned", { index, treasure, originEl: e.currentTarget });
}

function swapArrayItems(list, a, b) {
  if (!Array.isArray(list)) return list;
  if (a < 0 || b < 0 || a >= list.length || b >= list.length) return list;
  if (a === b) return list;
  const next = [...list];
  const t = next[a];
  next[a] = next[b];
  next[b] = t;
  return next;
}

const shopOwnedDragActive = ref(false);
const shopOwnedDragCurrentIndex = ref(-1);
const shopOwnedDragMoved = ref(false);
const shopOwnedDragDroppedInside = ref(false);
const shopOwnedDragPreview = ref(null);
const shopOwnedKeyOrder = ref(props.ownedTreasures.map((_, i) => `s-slot-${i}`));

watch(
  () => props.ownedTreasures.length,
  (len) => {
    if (shopOwnedKeyOrder.value.length < len) {
      while (shopOwnedKeyOrder.value.length < len) {
        shopOwnedKeyOrder.value.push(`s-slot-${shopOwnedKeyOrder.value.length}`);
      }
    } else if (shopOwnedKeyOrder.value.length > len) {
      shopOwnedKeyOrder.value = shopOwnedKeyOrder.value.slice(0, len);
    }
  },
);
const shopOwnedDragKeySnapshot = ref(null);
const shopOwnedDragPreviewCharge = ref(null);
const shopOwnedDragPreviewProgress = ref(null);

const displayOwnedTreasures = computed(() => shopOwnedDragPreview.value ?? props.ownedTreasures);
const displayOwnedTreasureKeys = computed(() => {
  return shopOwnedKeyOrder.value;
});
const displayTreasureChargeBySlot = computed(
  () => shopOwnedDragPreviewCharge.value ?? props.treasureChargeBySlot,
);
const displayTreasureChargeProgressBySlot = computed(
  () => shopOwnedDragPreviewProgress.value ?? props.treasureChargeProgressBySlot,
);

function onShopOwnedDragStart(index, e) {
  if (props.interactionsDisabled) {
    e.preventDefault();
    return;
  }
  const slot = displayOwnedTreasures.value[index];
  if (!slot) {
    e.preventDefault();
    return;
  }
  shopOwnedDragActive.value = true;
  shopOwnedDragCurrentIndex.value = index;
  shopOwnedDragMoved.value = false;
  shopOwnedDragDroppedInside.value = false;
  shopOwnedDragPreview.value = [...props.ownedTreasures];
  shopOwnedDragKeySnapshot.value = [...shopOwnedKeyOrder.value];
  shopOwnedDragPreviewCharge.value = [...props.treasureChargeBySlot];
  shopOwnedDragPreviewProgress.value = [...props.treasureChargeProgressBySlot];
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.dropEffect = "move";
    try {
      e.dataTransfer.setData("text/plain", String(index));
    } catch {
      // no-op
    }
  }
}

function onShopOwnedDragOver(index, e) {
  if (props.interactionsDisabled) return;
  if (!shopOwnedDragActive.value || !shopOwnedDragPreview.value) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  const from = shopOwnedDragCurrentIndex.value;
  if (index === from) return;
  shopOwnedDragPreview.value = swapArrayItems(shopOwnedDragPreview.value, from, index);
  shopOwnedKeyOrder.value = swapArrayItems(shopOwnedKeyOrder.value, from, index);
  shopOwnedDragPreviewCharge.value = swapArrayItems(shopOwnedDragPreviewCharge.value, from, index);
  shopOwnedDragPreviewProgress.value = swapArrayItems(shopOwnedDragPreviewProgress.value, from, index);
  shopOwnedDragCurrentIndex.value = index;
  shopOwnedDragMoved.value = true;
}

function onShopOwnedDrop(index, e) {
  if (props.interactionsDisabled) return;
  if (!shopOwnedDragActive.value || !shopOwnedDragPreview.value) return;
  e.preventDefault();
  const from = shopOwnedDragCurrentIndex.value;
  if (index !== from) {
    shopOwnedDragPreview.value = swapArrayItems(shopOwnedDragPreview.value, from, index);
    shopOwnedKeyOrder.value = swapArrayItems(shopOwnedKeyOrder.value, from, index);
    shopOwnedDragPreviewCharge.value = swapArrayItems(shopOwnedDragPreviewCharge.value, from, index);
    shopOwnedDragPreviewProgress.value = swapArrayItems(shopOwnedDragPreviewProgress.value, from, index);
    shopOwnedDragCurrentIndex.value = index;
    shopOwnedDragMoved.value = true;
  }
  emit("reorder-owned", [...shopOwnedDragPreview.value]);
  shopOwnedDragDroppedInside.value = true;
}

function onShopOwnedDragEnd() {
  if (!shopOwnedDragActive.value) return;
  if (!shopOwnedDragDroppedInside.value && shopOwnedDragKeySnapshot.value) {
    shopOwnedKeyOrder.value = [...shopOwnedDragKeySnapshot.value];
  }
  shopOwnedDragActive.value = false;
  shopOwnedDragCurrentIndex.value = -1;
  shopOwnedDragDroppedInside.value = false;
  shopOwnedDragPreview.value = null;
  shopOwnedDragKeySnapshot.value = null;
  shopOwnedDragPreviewCharge.value = null;
  shopOwnedDragPreviewProgress.value = null;
  setTimeout(() => {
    shopOwnedDragMoved.value = false;
  }, 0);
}

defineExpose({
  getWalletEl: () => shopWalletBoxRef.value,
  getOwnedSlotEl: (i) => ownedCellEls[i] ?? null,
  getDeckViewBtnEl: () => deckViewBtnRef.value ?? null,
  playUpgradeResult,
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
  --shop-header-h: calc(110 * var(--rpx));
  --shop-row-single-card-actions-h: calc(215 * var(--rpx));
  --shop-row-voucher-pack-h: calc(215 * var(--rpx));
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

.shop-treasure-product {
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
  font-size: calc(30 * var(--rpx));
  font-weight: 700;
  line-height: 1.1;
  color: var(--shop-reroll-price-green);
}

.shop-actions-col .shop-btn-reroll-dollar {
  font-weight: 800;
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
  justify-content: center;
}

:global(.shop-level-popup-bubble) {
  background: var(--btn-yellow);
  text-shadow: 0 calc(1 * var(--rpx)) 0 rgba(120, 84, 40, 0.5);
}
</style>
