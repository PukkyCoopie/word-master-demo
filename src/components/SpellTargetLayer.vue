<template>
  <Teleport defer to="#game-view-portal-frame">
    <div
      v-if="session"
      ref="backdropRef"
      class="spell-target-backdrop"
      :class="{
        'spell-target-backdrop--boot': bootMask,
        'spell-target-backdrop--closing': closing,
        'portal-overlay--shop-upgrade-suppressed': overlaySuppressed,
      }"
      :style="backdropStackStyle"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div
        ref="shellRef"
        class="spell-target-shell"
        :class="{ 'spell-target-shell--tile-animating': tileAnimActive }"
        @click.stop
      >
        <!-- 与 TreasureDetailLayer 预览区同款：标题组 + 图标 + 简介卡 -->
        <div class="spell-target-meta-stack">
          <div ref="titleGroupRef" class="treasure-detail-title-group spell-target-stagger-el">
            <p class="treasure-detail-kind-caption">法术卡</p>
            <h2 :id="titleId" class="treasure-detail-name">{{ session.spellName }}</h2>
          </div>

          <div ref="iconColumnRef" class="treasure-detail-icon-column spell-target-stagger-el spell-target-icon-column-boot-hide">
            <div class="shop-treasure-visual shop-treasure-visual--detail">
              <div
                class="shop-treasure-frame shop-treasure-frame--detail shop-treasure-frame--spell-offer spell-target-op-frame"
              >
                <i
                  class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon"
                  :class="session.spellIconClass || 'ri-magic-fill'"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          <div ref="descRef" class="treasure-detail-desc-card spell-target-stagger-el">
            <div class="treasure-detail-rarity-row">
              <span
                class="treasure-rarity-tag"
                :class="'treasure-rarity-tag--' + (session.spellRarity || 'rare')"
                >{{ rarityTagLabel }}</span
              >
            </div>
            <TreasureDescRichText
              v-if="hasSpellDesc"
              :description="session.spellDescription"
              :probability-display-doubled="probabilityDisplayDoubled"
            />
          </div>

          <div
            v-if="spellGainPanelContent"
            ref="spellGainPanelRef"
            class="treasure-detail-extra-regions spell-target-stagger-el"
          >
            <div class="treasure-detail-desc-card treasure-detail-accessory-card">
              <div class="treasure-detail-desc-panel-title-row">
                <span class="treasure-detail-desc-panel-title-text">{{ spellGainPanelContent.title }}</span>
              </div>
              <TreasureDescRichText
                class="treasure-detail-desc-panel-rich"
                :description="spellGainPanelContent.description"
                :panel-body="true"
                :probability-display-doubled="probabilityDisplayDoubled"
              />
            </div>
          </div>

          <div
            v-for="(panel, conceptIdx) in descriptionConceptPanels"
            :key="'spell-desc-concept-' + panel.title"
            :ref="(el) => setDescriptionConceptPanelRef(conceptIdx, el)"
            class="treasure-detail-desc-card spell-target-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span class="treasure-detail-desc-panel-title-text">{{ panel.title }}</span>
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="panel.effectDescription"
              :panel-body="true"
              :probability-display-doubled="probabilityDisplayDoubled"
            />
          </div>
        </div>

        <div ref="spellCardRef" class="spell-target-card spell-target-stagger-el">
          <p class="spell-target-hint">
            <template v-if="session.offerDeckSource === 'remainingDeck'">
              从剩余牌库中选取字母块（修改会立即同步至牌库）
            </template>
            <template v-else-if="session.pickMode === 'confirm_all'">
              将会在下列字母中进行随机
            </template>
            <template v-else-if="session.pickMode === 'preview_only'">
              {{
                session.skipDisabled
                  ? "点击确定继续施放此法术"
                  : "点击确定施放此法术，或选择跳过"
              }}
            </template>
            <template v-else>
              在下方候选块中依次点选 {{ session.pickCount }} 个字母块
              <span v-if="orderedSlotIndices.length">
                （已选 {{ orderedSlotIndices.length }} / {{ session.pickCount }}）
              </span>
            </template>
          </p>

          <div ref="offerGridWrapRef" class="spell-target-letter-grid-wrap">
            <div
              class="spell-target-offer-grid-inner"
              :class="{ 'spell-target-offer-grid-inner--confirm-all': hideOfferPickOrder }"
            >
              <div
                v-for="(slot, idx) in offerSlots"
                :key="slot.key"
                class="spell-target-offer-wrap"
                :class="{ 'spell-target-offer-wrap--picked': !tileAnimActive && pickOrderForSlot(idx) >= 0 }"
              >
                <button
                  type="button"
                  class="spell-target-offer-cell"
                  :ref="(el) => setOfferTileRef(idx, el)"
                  :class="{
                    'spell-target-offer-cell--empty': slot.empty || !displaySlotTile(slot, idx)?.letter,
                  }"
                  :disabled="tileAnimActive || slot.empty || !slot.tile"
                  @click="onTapSlot(idx)"
                >
                  <LetterTile
                    v-if="displaySlotTile(slot, idx)?.letter"
                    variant="grid"
                    :letter="displaySlotTile(slot, idx).letter"
                    :rarity="displaySlotTile(slot, idx).rarity"
                    :material-id="displaySlotTile(slot, idx).materialId ?? null"
                    :accessory-id="displaySlotTile(slot, idx).accessoryId ?? null"
                    :treasure-accessory-id="displaySlotTile(slot, idx).treasureAccessoryId ?? null"
                    :tile-score-bonus="Number(displaySlotTile(slot, idx).tileScoreBonus) || 0"
                    :tile-mult-bonus="Number(displaySlotTile(slot, idx).letterMultBonus) || 0"
                  />
                  <span v-else class="spell-target-empty-cell" aria-hidden="true" />
                </button>
                <div v-if="!hideOfferPickOrder" class="spell-target-slot-order" aria-hidden="true">
                  <span
                    v-if="!tileAnimActive && pickOrderForSlot(idx) >= 0"
                    class="spell-target-slot-order-chip"
                    >{{ pickOrderForSlot(idx) + 1 }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <div class="spell-target-actions">
            <button
              v-if="!session.skipDisabled"
              type="button"
              class="shop-btn shop-btn--reroll"
              :disabled="tileAnimActive"
              title="关闭弹窗，不施放本次法术"
              @click="onSkipDismiss"
            >
              跳过
            </button>
            <button
              type="button"
              class="shop-btn shop-btn--buy"
              :disabled="tileAnimActive || !canConfirmSpell"
              @click="onConfirm"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import gsap from "gsap";
import { portalScrimGsapVars } from "../game/portalScrimBleed.js";
import { computed, onBeforeUpdate, onMounted, onUnmounted, ref, shallowRef, useId, watch, nextTick } from "vue";
import { EASE_TRANSFORM } from "../constants.js";
import {
  runDetachedSpellTileAppearanceAnim,
  runDetachedDeleteBackConfirmAnim,
  cloneSpellTileSnapshot,
} from "../game/spellTileAppearanceAnim.js";
import {
  isSpellOfferRandomPickOneSpell,
  runSpellOfferRandomPickAnim,
} from "../game/spellOfferRandomPickAnim.js";
import { getSpellGainPanel } from "../spells/spellGainPanel.js";
import { collectExplicitDescriptionConceptPanels } from "../game/gameConceptCopy.js";
import LetterTile from "./LetterTile.vue";
import TreasureDescRichText from "./TreasureDescRichText.vue";
import { bumpOverlayZ } from "../game/overlayStack.js";
import { scheduleOverlayDismiss, scheduleOverlayPresent, triggerHaptic } from "../platform/haptics.js";
import {
  instantPortalLayerClose,
  instantPortalLayerEnter,
  shouldSkipDecorativeMotion,
} from "../settings/animationSpeed.js";

const props = defineProps({
  session: { type: Object, default: null },
  overlaySuppressed: { type: Boolean, default: false },
  /** 已拥有打字机（45）时：法术描述中的概率 chip 显示翻倍 */
  probabilityDisplayDoubled: { type: Boolean, default: false },
});

const emit = defineEmits(["confirm", "cancel"]);

const SPELL_TARGET_SCRIM_TRANSPARENT = "rgba(72, 90, 58, 0)";
const SPELL_TARGET_SCRIM_OPAQUE = "rgba(72, 90, 58, 0.78)";

const titleId = useId();
const backdropRef = ref(null);
const stackZ = ref(0);
const backdropStackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : undefined));
const shellRef = ref(null);
const titleGroupRef = ref(null);
const iconColumnRef = ref(null);
const descRef = ref(null);
const spellGainPanelRef = ref(null);
const spellCardRef = ref(null);
const offerGridWrapRef = ref(null);

/** @type {gsap.core.Timeline | null} */
let enterTl = null;
/** @type {gsap.core.Timeline | null} */
let closeTl = null;

const closing = ref(false);
/** 首帧 CSS 隐藏子块，待 GSAP 写入后再解除，避免与详情层同款闪一帧 */
const bootMask = ref(true);

watch(
  () => props.session,
  (s) => {
    if (s) {
      nextTick(() => {
        stackZ.value = bumpOverlayZ();
      });
    }
  },
  { immediate: true },
);

/** @type {import('vue').Ref<number[]>} */
const orderedSlotIndices = ref([]);

/** 确认后：隐藏选序/高亮，在候选格原地播 GSAP */
const tileAnimActive = ref(false);
/** @type {import('vue').ShallowRef<Record<number, unknown> | null>} */
const surfaceOverrides = shallowRef(null);
/**
 * 候选格 button DOM：仅给 GSAP 用，**不要**放进响应式 ref，否则 `:ref` 每帧回调会改 ref → 无限重渲染。
 * @type {(HTMLElement | undefined)[]}
 */
const offerTileElList = [];

function clearOfferTileElList() {
  offerTileElList.length = 0;
}

watch(
  () => props.session,
  () => {
    orderedSlotIndices.value = [];
    tileAnimActive.value = false;
    surfaceOverrides.value = null;
    clearOfferTileElList();
  },
);

const offerSlots = computed(() => {
  const list = props.session?.offerSlots;
  return Array.isArray(list) ? list : [];
});

const hasSpellDesc = computed(() => {
  const d = props.session?.spellDescription;
  if (d == null) return false;
  if (Array.isArray(d)) return d.length > 0;
  return String(d).trim().length > 0;
});

const spellGainPanelContent = computed(() => {
  const s = props.session;
  if (!s) return null;
  const p = String(s.purchasedSpellId ?? "").trim();
  const e = String(s.effectiveSpellId ?? "").trim();
  const id = p === "restart" && e ? e : p || e;
  if (!id) return null;
  const panel = getSpellGainPanel(id, {});
  return panel && String(panel.description ?? "").trim() ? panel : null;
});

/** 机制词补充分区 DOM：非响应式，避免 `:ref` 回调写入 ref 触发无限重渲染（扳手等含「配饰」描述的法术） */
/** @type {(HTMLElement | null)[]} */
const descriptionConceptPanelRefs = [];

/** @param {number} i @param {unknown} el */
function setDescriptionConceptPanelRef(i, el) {
  descriptionConceptPanelRefs[i] = el instanceof HTMLElement ? el : null;
}

onBeforeUpdate(() => {
  descriptionConceptPanelRefs.length = 0;
});

const descriptionConceptPanels = computed(() => {
  const s = props.session;
  if (!s) return [];
  const exclude = new Set();
  const t = spellGainPanelContent.value?.title;
  if (t) exclude.add(t);
  return collectExplicitDescriptionConceptPanels(s.spellDescription, exclude);
});

const rarityTagLabel = computed(() => {
  const r = String(props.session?.spellRarity ?? "rare");
  if (r === "common") return "普通";
  if (r === "rare") return "稀有";
  if (r === "epic") return "史诗";
  if (r === "legendary") return "传说";
  return "稀有";
});

const hideOfferPickOrder = computed(() => props.session?.pickMode === "confirm_all");

const canConfirmSpell = computed(() => {
  const s = props.session;
  if (!s) return false;
  if (s.confirmDisabled === true) return false;
  if (s.pickMode === "confirm_all" || s.pickMode === "preview_only") return true;
  return orderedSlotIndices.value.length === s.pickCount;
});

function staggerTargets() {
  return [
    titleGroupRef.value,
    iconColumnRef.value,
    descRef.value,
    spellGainPanelRef.value,
    ...descriptionConceptPanelRefs.filter((el) => el instanceof HTMLElement),
    spellCardRef.value,
  ].filter(Boolean);
}

function refToDom(el) {
  if (!el) return undefined;
  if (typeof el.getEl === "function") return el.getEl() ?? undefined;
  return el.$el != null ? el.$el : el;
}

function setOfferTileRef(idx, comp) {
  const node = comp instanceof HTMLElement ? comp : refToDom(comp);
  const el = node instanceof HTMLElement ? node : undefined;
  if (offerTileElList[idx] === el) return;
  while (offerTileElList.length <= idx) offerTileElList.push(undefined);
  offerTileElList[idx] = el;
}

/**
 * @param {{ tile?: unknown, empty?: boolean }} slot
 * @param {number} idx
 */
function displaySlotTile(slot, idx) {
  const o = surfaceOverrides.value;
  if (o != null && Object.prototype.hasOwnProperty.call(o, idx)) {
    const t = o[idx];
    return t != null && typeof t === "object" ? t : null;
  }
  const s = props.session;
  if (s && typeof s.getOfferTileSnapshot === "function" && slot?.deckCardUid != null) {
    const live = s.getOfferTileSnapshot(-1, -1, slot.deckCardUid);
    if (live != null && typeof live === "object") return live;
  }
  return slot?.tile && typeof slot.tile === "object" ? slot.tile : null;
}

function pickOrderForSlot(slotIndex) {
  return orderedSlotIndices.value.indexOf(slotIndex);
}

function onTapSlot(slotIndex) {
  const s = props.session;
  const slot = offerSlots.value[slotIndex];
  if (!s || s.pickMode === "confirm_all" || s.pickMode === "preview_only" || slot?.empty || !slot?.tile)
    return;

  const cur = orderedSlotIndices.value;
  const existing = cur.indexOf(slotIndex);
  if (existing >= 0) {
    orderedSlotIndices.value = cur.slice(0, existing);
    return;
  }
  if (cur.length >= s.pickCount) return;
  orderedSlotIndices.value = [...cur, slotIndex];
}

async function onConfirm() {
  const s = props.session;
  if (!s || !canConfirmSpell.value) return;
  const slots = offerSlots.value;
  const selectionSlotIndices =
    s.pickMode === "confirm_all"
      ? slots.map((sl, ix) => (sl && !sl.empty && sl.tile ? ix : -1)).filter((ix) => ix >= 0)
      : s.pickMode === "preview_only"
        ? []
        : [...orderedSlotIndices.value];
  const ordered = selectionSlotIndices.map((ix) => {
    const c = slots[ix];
    if (c?.deckCardUid != null) return { deckCardUid: c.deckCardUid };
    return { row: c.row, col: c.col };
  });
  tileAnimActive.value = true;
  orderedSlotIndices.value = [];
  triggerHaptic("confirm");
  await nextTick();
  emit("confirm", ordered, selectionSlotIndices);
}

function onSkipDismiss() {
  if (tileAnimActive.value) return;
  emit("cancel");
}

/**
 * 将动效目标格映射到候选按钮槽位：优先按玩家点选顺序绑定槽下标，避免多个候选格共用同一棋盘格时误用「第一个匹配」。
 * @param {{ row: number, col: number }[]} targets
 * @param {{ row: number, col: number }[]} ordered
 * @param {number[]} selectionSlotIndices 与 `ordered` 等长，依次为每次点选的候选槽下标
 * @param {unknown[]} slots
 * @returns {number[] | null}
 */
function resolveOfferSlotIndicesForAnim(targets, ordered, selectionSlotIndices, slots) {
  if (
    !Array.isArray(targets) ||
    !targets.length ||
    !Array.isArray(ordered) ||
    !Array.isArray(selectionSlotIndices) ||
    selectionSlotIndices.length !== ordered.length
  ) {
    return null;
  }
  const usedPick = new Set();
  /** @type {number[]} */
  const out = [];
  for (const t of targets) {
    let slotIx = -1;
    for (let i = 0; i < ordered.length; i++) {
      if (usedPick.has(i)) continue;
      const o = ordered[i];
      if (Number(o.row) === Number(t.row) && Number(o.col) === Number(t.col)) {
        slotIx = selectionSlotIndices[i];
        usedPick.add(i);
        break;
      }
    }
    if (typeof slotIx === "number" && slotIx >= 0) {
      out.push(slotIx);
      continue;
    }
    let fb = -1;
    for (let i = 0; i < slots.length; i++) {
      const sl = slots[i];
      if (!sl?.empty && Number(sl.row) === Number(t.row) && Number(sl.col) === Number(t.col)) {
        fb = i;
        break;
      }
    }
    if (fb < 0) return null;
    out.push(fb);
  }
  return out;
}

/**
 * 在候选格上播放确认动效：多数法术为缩小→换图→回弹；「删除」为先放大再缩没并撤去字母展示。
 * @returns {Promise<boolean>} 是否在弹层上完整播放（可回退到棋盘动效）
 */
async function playConfirmAppearanceAnim(payload) {
  const {
    spellId,
    targets,
    newSnaps,
    oldSnaps: oldSnapsPayload,
    ordered,
    selectionSlotIndices,
    offerSlotIndices,
  } = payload;

  const slots = offerSlots.value;

  if (
    Array.isArray(offerSlotIndices) &&
    offerSlotIndices.length > 0 &&
    Array.isArray(oldSnapsPayload) &&
    oldSnapsPayload.length === offerSlotIndices.length &&
    typeof payload.onMidApply === "function"
  ) {
    const slotIndices = offerSlotIndices.filter((ix) => typeof ix === "number" && ix >= 0);
    if (slotIndices.length !== offerSlotIndices.length || slotIndices.some((ix) => !slots[ix]?.tile)) {
      return false;
    }
    return playConfirmAppearanceOnOfferSlots(spellId, slotIndices, oldSnapsPayload, payload.onMidApply, {
      winnerOfferSlotIndex: payload.winnerOfferSlotIndex,
    });
  }

  if (
    !Array.isArray(targets) ||
    !targets.length ||
    !Array.isArray(oldSnapsPayload) ||
    oldSnapsPayload.length !== targets.length ||
    typeof payload.onMidApply !== "function"
  ) {
    return false;
  }

  let slotIndices =
    Array.isArray(ordered) &&
    Array.isArray(selectionSlotIndices) &&
    ordered.length > 0 &&
    ordered.length === targets.length &&
    selectionSlotIndices.length === targets.length &&
    targets.every(
      (t, i) =>
        Number(t.row) === Number(ordered[i]?.row) && Number(t.col) === Number(ordered[i]?.col),
    ) &&
    selectionSlotIndices.every((ix) => typeof ix === "number" && ix >= 0)
      ? selectionSlotIndices.slice()
      : null;
  if (!slotIndices) {
    slotIndices =
      Array.isArray(ordered) && Array.isArray(selectionSlotIndices)
        ? resolveOfferSlotIndicesForAnim(targets, ordered, selectionSlotIndices, slots)
        : null;
  }
  if (!slotIndices) {
    slotIndices = targets.map(({ row, col }) => {
      for (let i = 0; i < slots.length; i++) {
        const sl = slots[i];
        if (!sl?.empty && Number(sl.row) === Number(row) && Number(sl.col) === Number(col)) return i;
      }
      return -1;
    });
  }

  if (slotIndices.some((ix) => ix < 0)) return false;

  return playConfirmAppearanceOnOfferSlots(spellId, slotIndices, oldSnapsPayload, payload.onMidApply, {
    winnerOfferSlotIndex: payload.winnerOfferSlotIndex,
  });
}

/**
 * @param {string} spellId
 * @param {number[]} slotIndices
 * @param {unknown[]} oldSnaps
 * @param {() => unknown[] | Promise<unknown[]>} onMidApply 缩至谷底时执行（施法 + 返回新快照）
 * @param {{ winnerOfferSlotIndex?: number }} [animOpts]
 */
async function playConfirmAppearanceOnOfferSlots(spellId, slotIndices, oldSnaps, onMidApply, animOpts = {}) {
  const lockOld = {};
  for (let i = 0; i < slotIndices.length; i++) {
    lockOld[slotIndices[i]] = cloneSpellTileSnapshot(oldSnaps[i]);
  }
  surfaceOverrides.value = lockOld;
  await nextTick();

  const applyAllAtValley = async () => {
    const raw = await onMidApply();
    const newSnaps = Array.isArray(raw) ? raw : [];
    const o = {};
    for (let i = 0; i < slotIndices.length; i++) {
      o[slotIndices[i]] = cloneSpellTileSnapshot(newSnaps[i] ?? oldSnaps[i]);
    }
    surfaceOverrides.value = o;
  };

  const sid = String(spellId ?? "");
  try {
    if (isSpellOfferRandomPickOneSpell(sid) && slotIndices.length > 1) {
      const winnerSlotIndex =
        typeof animOpts.winnerOfferSlotIndex === "number"
          ? animOpts.winnerOfferSlotIndex
          : slotIndices[Math.floor(Math.random() * slotIndices.length)];
      await runSpellOfferRandomPickAnim({
        slotIndices,
        winnerSlotIndex,
        getOfferWrapEl: (ix) => offerTileElList[ix]?.closest?.(".spell-target-offer-wrap") ?? offerTileElList[ix],
        gridWrapEl: offerGridWrapRef.value,
      });
      await applyAllAtValley();
    } else if (sid === "delete_back") {
      await applyAllAtValley();
      await runDetachedDeleteBackConfirmAnim({
        targetCount: slotIndices.length,
        getTileEl: (i) => offerTileElList[slotIndices[i]],
        nextTick,
      });
    } else {
      await runDetachedSpellTileAppearanceAnim({
        spellId: sid,
        targetCount: slotIndices.length,
        getTileEl: (i) => offerTileElList[slotIndices[i]],
        onMidShrinkAll: applyAllAtValley,
        nextTick,
      });
    }
  } catch (e) {
    surfaceOverrides.value = null;
    throw e;
  }
  const finalO = { ...(surfaceOverrides.value ?? {}) };
  surfaceOverrides.value = finalO;
  return true;
}

/**
 * 与商店 `TreasureDetailLayer.playClose` 同款：淡出遮罩 + 子块逆序收起，再由父级卸载。
 * @returns {Promise<void>}
 */
function playClose() {
  if (closing.value) return Promise.resolve();
  scheduleOverlayDismiss(240);
  closing.value = true;

  const backdrop = backdropRef.value;
  const staggerEls = staggerTargets();

  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }
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
    return instantPortalLayerClose({
      backdrop,
      staggerEls,
      extraEls: [iconColumnRef.value].filter(Boolean),
    }).then(() => {
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
          ...portalScrimGsapVars(SPELL_TARGET_SCRIM_TRANSPARENT),
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

function getOfferTileEl(slotIndex) {
  return offerTileElList[slotIndex] ?? null;
}

function getSpellIconEl() {
  return iconColumnRef.value?.querySelector?.(".shop-treasure-frame") ?? iconColumnRef.value ?? null;
}

function getSpellVisualEl() {
  return iconColumnRef.value?.querySelector?.(".shop-treasure-visual") ?? iconColumnRef.value ?? null;
}

defineExpose({ playConfirmAppearanceAnim, playClose, getOfferTileEl, getSpellIconEl, getSpellVisualEl });

/** @param {HTMLElement} backdrop */
function setBackdropScrim(backdrop, rgba) {
  gsap.set(backdrop, portalScrimGsapVars(rgba));
}

/** @param {HTMLElement} backdrop @param {HTMLElement[]} staggerEls */
function applyEnterInitialHide(backdrop, staggerEls) {
  gsap.killTweensOf([backdrop, ...staggerEls, iconColumnRef.value].filter(Boolean));
  setBackdropScrim(backdrop, SPELL_TARGET_SCRIM_TRANSPARENT);
  applyStaggerEnterInitialHide(staggerEls);
}

/** @param {HTMLElement[]} staggerEls */
function applyStaggerEnterInitialHide(staggerEls) {
  gsap.killTweensOf([...staggerEls, iconColumnRef.value].filter(Boolean));
  gsap.set(staggerEls, { opacity: 0, y: 8 });
  /* 图标列在 boot 解除后易先亮一帧，与宝藏详情 targetVisual 同样先写 GSAP */
  if (iconColumnRef.value) {
    gsap.set(iconColumnRef.value, { opacity: 0, pointerEvents: "none" });
  }
}

function runEnterAnimation() {
  const backdrop = backdropRef.value;
  if (!backdrop || props.overlaySuppressed) return;

  if (shouldSkipDecorativeMotion()) {
    if (enterTl) {
      enterTl.kill();
      enterTl = null;
    }
    bootMask.value = false;
    const staggerEls = staggerTargets();
    instantPortalLayerEnter({
      backdrop,
      backdropFinal: portalScrimGsapVars(SPELL_TARGET_SCRIM_OPAQUE),
      staggerEls,
      extraEls: [iconColumnRef.value].filter(Boolean),
    });
    return;
  }

  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }

  bootMask.value = true;
  const staggerEls = staggerTargets();
  applyEnterInitialHide(backdrop, staggerEls);

  /* 遮罩立刻从透明匀缓加深，避免等 RAF 后再起 tween 像闪一下 */
  gsap.fromTo(
    backdrop,
    portalScrimGsapVars(SPELL_TARGET_SCRIM_TRANSPARENT),
    {
      ...portalScrimGsapVars(SPELL_TARGET_SCRIM_OPAQUE),
      duration: 0.42,
      ease: EASE_TRANSFORM,
    },
  );

  void nextTick()
    .then(() => (document.fonts?.ready != null ? document.fonts.ready : Promise.resolve()))
    .then(
      () =>
        new Promise((r) => {
          requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)));
        }),
    )
    .then(() => {
      const backdropLive = backdropRef.value;
      if (!backdropLive || props.overlaySuppressed) return;

      const staggerLive = staggerTargets();
      /* 仅重置子块入场态；勿再把蒙层设回透明，否则会抹掉上方 fromTo 且不再补播 */
      applyStaggerEnterInitialHide(staggerLive);
      setBackdropScrim(backdropLive, SPELL_TARGET_SCRIM_OPAQUE);

      bootMask.value = false;

      enterTl = gsap.timeline();
      enterTl.to(
        staggerLive,
        {
          opacity: 1,
          y: 0,
          duration: 0.2,
          stagger: 0.05,
          ease: EASE_TRANSFORM,
          clearProps: "opacity,transform,pointerEvents",
        },
        0.08,
      );
    });
}

onMounted(() => {
  scheduleOverlayPresent(280);
  void nextTick().then(() => {
    const backdrop = backdropRef.value;
    if (backdrop) {
      applyEnterInitialHide(backdrop, staggerTargets());
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => runEnterAnimation());
    });
  });
});

watch(
  () => props.overlaySuppressed,
  (suppressed, was) => {
    if (was && !suppressed) {
      bootMask.value = true;
      void nextTick(() => {
        requestAnimationFrame(() => runEnterAnimation());
      });
    }
  },
);

onUnmounted(() => {
  const backdrop = backdropRef.value;
  gsap.killTweensOf([backdrop, ...staggerTargets(), iconColumnRef.value].filter(Boolean));
  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }
  if (closeTl) {
    closeTl.kill();
    closeTl = null;
  }
});
</script>
