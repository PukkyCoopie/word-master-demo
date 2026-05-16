<template>
  <Teleport defer to="#game-view-portal">
    <div
      v-if="session"
      ref="backdropRef"
      class="spell-target-backdrop spell-target-backdrop--boot"
      :class="{
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

          <div ref="iconColumnRef" class="treasure-detail-icon-column spell-target-stagger-el">
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
            <TreasureDescRichText v-if="hasSpellDesc" :description="session.spellDescription" />
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
              />
            </div>
          </div>
        </div>

        <div ref="spellCardRef" class="spell-target-card spell-target-stagger-el">
          <p class="spell-target-hint">
            在下方候选块中依次点选 {{ session.pickCount }} 个字母块
            <span v-if="orderedSlotIndices.length">
              （已选 {{ orderedSlotIndices.length }} / {{ session.pickCount }}）
            </span>
          </p>

          <div class="spell-target-letter-grid-wrap">
            <div class="spell-target-offer-grid-inner">
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
                    :tile-score-bonus="Number(displaySlotTile(slot, idx).tileScoreBonus) || 0"
                    :tile-mult-bonus="Number(displaySlotTile(slot, idx).letterMultBonus) || 0"
                  />
                  <span v-else class="spell-target-empty-cell" aria-hidden="true" />
                </button>
                <div class="spell-target-slot-order" aria-hidden="true">
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
              :disabled="tileAnimActive || orderedSlotIndices.length !== session.pickCount"
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
import { computed, onMounted, onUnmounted, ref, shallowRef, useId, watch, nextTick } from "vue";
import { EASE_TRANSFORM } from "../constants.js";
import {
  runDetachedSpellTileAppearanceAnim,
  runDetachedDeleteBackConfirmAnim,
  cloneSpellTileSnapshot,
} from "../game/spellTileAppearanceAnim.js";
import { getSpellGainPanel } from "../spells/spellGainPanel.js";
import LetterTile from "./LetterTile.vue";
import TreasureDescRichText from "./TreasureDescRichText.vue";
import { bumpOverlayZ } from "../game/overlayStack.js";

const props = defineProps({
  session: { type: Object, default: null },
  overlaySuppressed: { type: Boolean, default: false },
});

const emit = defineEmits(["confirm", "cancel"]);

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

/** @type {gsap.core.Timeline | null} */
let enterTl = null;
/** @type {gsap.core.Timeline | null} */
let closeTl = null;

const closing = ref(false);

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

const rarityTagLabel = computed(() => {
  const r = String(props.session?.spellRarity ?? "rare");
  if (r === "common") return "普通";
  if (r === "rare") return "稀有";
  if (r === "epic") return "史诗";
  if (r === "legendary") return "传说";
  return "稀有";
});

function staggerTargets() {
  return [titleGroupRef.value, iconColumnRef.value, descRef.value, spellGainPanelRef.value, spellCardRef.value].filter(
    Boolean,
  );
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
  return slot.tile ?? null;
}

function pickOrderForSlot(slotIndex) {
  return orderedSlotIndices.value.indexOf(slotIndex);
}

function onTapSlot(slotIndex) {
  const s = props.session;
  const slot = offerSlots.value[slotIndex];
  if (!s || slot?.empty || !slot?.tile) return;

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
  if (!s || orderedSlotIndices.value.length !== s.pickCount) return;
  const slots = offerSlots.value;
  const selectionSlotIndices = [...orderedSlotIndices.value];
  const ordered = selectionSlotIndices.map((ix) => {
    const c = slots[ix];
    return { row: c.row, col: c.col };
  });
  tileAnimActive.value = true;
  orderedSlotIndices.value = [];
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
  const { spellId, targets, newSnaps, ordered, selectionSlotIndices } = payload;
  if (!Array.isArray(targets) || !targets.length || !Array.isArray(newSnaps) || newSnaps.length !== targets.length) {
    return false;
  }

  const slots = offerSlots.value;
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

  surfaceOverrides.value = null;
  await nextTick();

  const applySurface = (i) => {
    const ix = slotIndices[i];
    const snap = cloneSpellTileSnapshot(newSnaps[i]);
    surfaceOverrides.value = { ...(surfaceOverrides.value ?? {}), [ix]: snap };
  };

  const applyAll = () => {
    const o = { ...(surfaceOverrides.value ?? {}) };
    for (let i = 0; i < slotIndices.length; i++) {
      o[slotIndices[i]] = cloneSpellTileSnapshot(newSnaps[i]);
    }
    surfaceOverrides.value = o;
  };

  const sid = String(spellId ?? "");
  try {
    if (sid === "delete_back") {
      await runDetachedDeleteBackConfirmAnim({
        targetCount: targets.length,
        getTileEl: (i) => offerTileElList[slotIndices[i]],
        nextTick,
      });
    } else {
      await runDetachedSpellTileAppearanceAnim({
        spellId: sid,
        targetCount: targets.length,
        getTileEl: (i) => offerTileElList[slotIndices[i]],
        onMidAtIndex: applySurface,
        onMidShrinkAll: applyAll,
        nextTick,
      });
    }
  } catch (e) {
    surfaceOverrides.value = null;
    throw e;
  }
  /* 保持施法后外观直到父级关层；勿在 finally 清空，否则关层前会闪回 session 里的旧快照 */
  const finalO = {};
  if (sid === "delete_back") {
    for (let i = 0; i < slotIndices.length; i++) {
      finalO[slotIndices[i]] = null;
    }
  } else {
    for (let i = 0; i < slotIndices.length; i++) {
      finalO[slotIndices[i]] = cloneSpellTileSnapshot(newSnaps[i]);
    }
  }
  surfaceOverrides.value = finalO;
  return true;
}

/**
 * 与商店 `TreasureDetailLayer.playClose` 同款：淡出遮罩 + 子块逆序收起，再由父级卸载。
 * @returns {Promise<void>}
 */
function playClose() {
  if (closing.value) return Promise.resolve();
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
          backgroundColor: "rgba(72, 90, 58, 0)",
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

defineExpose({ playConfirmAppearanceAnim, playClose });

function runEnterAnimation() {
  const backdrop = backdropRef.value;
  const staggerEls = staggerTargets();
  if (!backdrop) return;

  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }

  gsap.killTweensOf([backdrop, ...staggerEls].filter(Boolean));
  gsap.set(backdrop, { backgroundColor: "rgba(72, 90, 58, 0)" });
  gsap.set(staggerEls, { opacity: 0, y: 8 });
  backdrop.classList.remove("spell-target-backdrop--boot");

  gsap.fromTo(
    backdrop,
    { backgroundColor: "rgba(72, 90, 58, 0)" },
    {
      backgroundColor: "rgba(72, 90, 58, 0.78)",
      duration: 0.42,
      ease: EASE_TRANSFORM,
    },
  );

  enterTl = gsap.timeline();
  enterTl.to(
    staggerEls,
    {
      opacity: 1,
      y: 0,
      duration: 0.2,
      stagger: 0.05,
      ease: EASE_TRANSFORM,
      clearProps: "opacity,transform",
    },
    0.08,
  );
}

onMounted(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => runEnterAnimation());
  });
});

onUnmounted(() => {
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
