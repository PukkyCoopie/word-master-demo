<template>
  <Teleport defer to="#game-view-portal">
    <div
      ref="backdropRef"
      class="pack-pick-backdrop portal-overlay-fill"
      :style="backdropStackStyle"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @click.self="onCancel"
    >
      <div class="pack-pick-header-panel" @click.self="onCancel">
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

      <div class="pack-pick-body" @click.self="onCancel">
        <div class="pack-pick-stack">
          <div class="pack-pick-title-block">
            <p class="treasure-detail-kind-caption">{{ kindCaption }}</p>
            <h2 :id="titleId" class="treasure-detail-name">{{ session.title }}</h2>
            <p class="pack-pick-subtitle">{{ session.subtitle }}</p>
            <p class="pack-pick-price-line">开启费用 <span class="pack-pick-price">${{ session.price }}</span></p>
          </div>

          <div class="pack-pick-grid" role="listbox" :aria-multiselectable="requiredPicks > 1" aria-label="候选内容">
            <button
              v-for="opt in session.options"
              :key="opt.optionKey || opt.offerInstanceId"
              type="button"
              class="pack-pick-cell"
              :class="{ 'pack-pick-cell--selected': selectedKeys.has(optionKeyOf(opt)) }"
              role="option"
              :aria-selected="selectedKeys.has(optionKeyOf(opt))"
              :ref="(el) => setCellRootRef(opt, el)"
              @click="toggle(opt)"
            >
              <div v-if="opt.offerType === 'spell'" class="pack-pick-face pack-pick-face--spell">
                <div class="shop-treasure-frame shop-treasure-frame--spell-offer pack-pick-fly-source">
                  <i class="shop-treasure-emoji shop-treasure-emoji--icon" :class="opt.iconClass" aria-hidden="true"></i>
                </div>
                <span class="pack-pick-cell-label">{{ opt.name }}</span>
              </div>
              <div
                v-else-if="opt.offerType === 'upgrade'"
                class="pack-pick-face pack-pick-face--upgrade"
              >
                <div
                  class="shop-treasure-frame pack-pick-fly-source"
                  :class="{
                    'shop-treasure-frame--pack-rarity': opt.upgradeKind === 'rarity',
                    'shop-treasure-frame--length-offer':
                      opt.upgradeKind !== 'rarity' && (opt.lengthBadgeLabel || opt.lengthLabel),
                  }"
                >
                  <i class="shop-treasure-emoji shop-treasure-emoji--icon ri-arrow-up-box-fill" aria-hidden="true"></i>
                  <template v-if="opt.upgradeKind === 'rarity'">
                    <div class="shop-pack-rarity-caption-row pack-pick-mini-rarity">
                      <span
                        class="letter-gem shop-pack-rarity-gem"
                        :class="`gem-${opt.letterRarity || 'common'}`"
                        aria-hidden="true"
                      />
                      <span class="shop-pack-rarity-caption">{{ opt.lengthBadgeLabel || opt.lengthLabel }}</span>
                    </div>
                  </template>
                  <span v-else class="shop-upgrade-length">{{ opt.lengthBadgeLabel || opt.lengthLabel }}</span>
                </div>
              </div>
              <div v-else-if="opt.offerType === 'treasure'" class="pack-pick-face pack-pick-face--treasure">
                <div class="shop-treasure-frame pack-pick-fly-source pack-pick-treasure-fly-mini">
                  <span class="letter-gem" :class="`gem-${gemFor(opt)}`" aria-hidden="true" />
                  <span class="shop-treasure-emoji" role="img">{{ opt.emoji }}</span>
                </div>
                <span class="pack-pick-cell-label">{{ opt.name }}</span>
              </div>
              <div
                v-else-if="opt.offerType === 'deckLetter' || opt.offerType === 'deckTile'"
                class="pack-pick-face pack-pick-face--tile"
              >
                <div class="pack-pick-fly-source pack-pick-fly-source--tile">
                  <LetterTile
                    variant="grid"
                    class="pack-pick-letter-tile"
                    :letter="displayLetter(opt)"
                    :rarity="opt.letterRarity || opt.rarity || 'common'"
                    :material-id="opt.offerType === 'deckTile' ? opt.deckTileMaterialId : undefined"
                    :tile-score-bonus="0"
                    :tile-mult-bonus="0"
                  />
                </div>
                <span class="pack-pick-cell-label">{{ opt.name }}</span>
              </div>
            </button>
          </div>

          <div class="treasure-detail-actions pack-pick-actions">
            <button
              type="button"
              class="shop-btn shop-btn--buy"
              :disabled="!canConfirm || disabled"
              @click="onConfirm"
            >
              确认获得（${{ session.price }}）
            </button>
            <button type="button" class="shop-btn shop-btn--next" :disabled="disabled" @click="onCancel">返回</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, useId } from "vue";
import LetterTile from "./LetterTile.vue";
import { bumpOverlayZ } from "../game/overlayStack.js";

const props = defineProps({
  session: { type: Object, required: true },
  walletAmount: { type: Number, default: 0 },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(["confirm", "cancel"]);

const titleId = useId();
const backdropRef = ref(null);
const stackZ = ref(0);
const backdropStackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : undefined));

const selectedKeys = ref(/** @type {Set<string>} */ (new Set()));
/** @type {string[]} */
const selectionOrder = ref([]);

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

const canConfirm = computed(() => {
  const price = Number(props.session?.price) || 0;
  const w = Number(props.walletAmount) || 0;
  return selectionOrder.value.length === requiredPicks.value && w >= price;
});

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

function displayLetter(opt) {
  const raw = String(opt?.deckLetterRaw ?? "a").toLowerCase();
  return raw === "q" ? "Qu" : raw.toUpperCase();
}

function gemFor(opt) {
  const r = opt?.rarity;
  if (r === "epic" || r === "legendary" || r === "common" || r === "rare") return r;
  return "rare";
}

function toggle(opt) {
  if (props.disabled) return;
  const key = optionKeyOf(opt);
  if (!key) return;
  const cur = new Set(selectedKeys.value);
  const ord = [...selectionOrder.value];
  if (cur.has(key)) {
    cur.delete(key);
    const ix = ord.indexOf(key);
    if (ix >= 0) ord.splice(ix, 1);
  } else {
    if (ord.length >= requiredPicks.value) {
      const drop = ord.shift();
      if (drop) cur.delete(drop);
    }
    cur.add(key);
    ord.push(key);
  }
  selectedKeys.value = cur;
  selectionOrder.value = ord;
}

function onConfirm() {
  if (!canConfirm.value || props.disabled) return;
  const opts = props.session.options ?? [];
  const map = new Map(opts.map((o) => [optionKeyOf(o), o]));
  const picked = selectionOrder.value.map((k) => map.get(k)).filter(Boolean);
  emit("confirm", { selected: picked });
}

function onCancel() {
  if (props.disabled) return;
  emit("cancel");
}

onMounted(() => {
  stackZ.value = bumpOverlayZ();
});

onUnmounted(() => {
  stackZ.value = 0;
  cellRoots.clear();
});
</script>
