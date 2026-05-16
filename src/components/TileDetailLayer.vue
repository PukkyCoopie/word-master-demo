<template>
  <Teleport defer to="#game-view-portal">
    <div
      v-if="payload"
      ref="backdropRef"
      class="treasure-detail-backdrop tile-detail-layer"
      :class="{
        'tile-detail-backdrop--boot': bootMask,
        'portal-overlay--shop-upgrade-suppressed': overlaySuppressed,
      }"
      :style="backdropStackStyle"
      role="dialog"
      aria-modal="true"
      :aria-label="tileDetailLayerCopy.ariaLabelDialog"
      @click.self="requestClose"
    >
      <div class="treasure-detail-header-panel" @click.self="requestClose">
        <div class="treasure-detail-header-logo-sizer" aria-hidden="true"></div>
      </div>

      <div class="treasure-detail-body" @click.self="requestClose">
        <div class="treasure-detail-stack tile-detail-stack">
          <div class="tile-detail-visual-stage tile-detail-visual-stage--target">
            <div ref="targetFlyMeasureRef" class="tile-detail-visual-scale">
              <div ref="targetVisualRef" class="tile-detail-target-fade">
                <LetterTile
                  variant="grid"
                  class="tile-detail-preview-tile"
                  :letter="payload.letter"
                  :rarity="payload.rarity"
                  :material-id="payload.materialId"
                  :accessory-id="payload.accessoryId"
                  :treasure-accessory-id="payload.treasureAccessoryId"
                  :tile-score-bonus="Number(payload.tileScoreBonus) || 0"
                  :tile-mult-bonus="Number(payload.tileMultBonus) || 0"
                />
              </div>
            </div>
          </div>

          <div ref="regionsRef" class="tile-detail-regions">
            <div class="treasure-detail-desc-card tile-detail-entry tile-detail-stagger-el">
              <div class="treasure-detail-rarity-row">
                <span
                  class="treasure-rarity-tag"
                  :class="'treasure-rarity-tag--' + rarityKey"
                  >{{ rarityTagLabel }}</span
                >
              </div>
              <div class="tile-detail-rarity-score-mult">
                <div class="tile-detail-score-mult-frame">
                  <div class="info-score-mult" role="group" :aria-label="scoreMultSummaryAria">
                    <span class="tile-detail-score-mult-side-label">{{ tileDetailLayerCopy.rarity.scoreLabel }}</span>
                    <span class="info-mini-box info-mini-box--score">{{ totalPerLetterScoreDisplay }}</span>
                    <span class="info-mini-times" aria-hidden="true">×</span>
                    <span class="info-mini-box info-mini-box--mult">{{ totalPerLetterMultDisplay }}</span>
                    <span class="tile-detail-score-mult-side-label">{{ tileDetailLayerCopy.rarity.multLabel }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="showMaterialRegion" class="treasure-detail-desc-card tile-detail-entry tile-detail-stagger-el">
              <div class="treasure-detail-desc-panel-title-row">
                <span class="treasure-detail-desc-panel-title-text">{{ materialTitle }}</span>
              </div>
              <TreasureDescRichText
                class="treasure-detail-desc-panel-rich"
                :description="materialEffectText"
                :panel-body="true"
              />
            </div>

            <div
              v-if="showTreasureAccessoryRegion"
              class="treasure-detail-desc-card tile-detail-entry tile-detail-stagger-el"
            >
              <div class="treasure-detail-desc-panel-title-row">
                <span
                  v-if="treasureAccessoryChipVisual"
                  class="treasure-accessory-chip detail-panel-accessory-chip-inline"
                  :class="treasureAccessoryChipVisual.chipClass"
                  aria-hidden="true"
                >
                  <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
                  <i
                    class="treasure-accessory-chip-icon"
                    :class="treasureAccessoryChipVisual.iconClass"
                    aria-hidden="true"
                  />
                </span>
                <span class="treasure-detail-desc-panel-title-text">{{ treasureAccessoryTitle }}</span>
              </div>
              <TreasureDescRichText
                class="treasure-detail-desc-panel-rich"
                :description="treasureAccessoryDesc"
                :panel-body="true"
              />
            </div>

            <div v-if="showAccessoryRegion" class="treasure-detail-desc-card tile-detail-entry tile-detail-stagger-el">
              <div class="treasure-detail-desc-panel-title-row">
                <span
                  v-if="tileAccessoryChipVisual"
                  class="tile-accessory-chip detail-panel-accessory-chip-inline"
                  :class="tileAccessoryChipVisual.chipClass"
                  aria-hidden="true"
                >
                  <span class="tile-accessory-chip-ripple" aria-hidden="true" />
                  <i class="tile-accessory-chip-icon" :class="tileAccessoryChipVisual.iconClass" aria-hidden="true" />
                </span>
                <span class="treasure-detail-desc-panel-title-text">{{ accessoryTitle }}</span>
              </div>
              <TreasureDescRichText
                class="treasure-detail-desc-panel-rich"
                :description="accessoryDesc"
                :panel-body="true"
              />
            </div>
          </div>

          <div ref="actionsRef" class="treasure-detail-actions tile-detail-stagger-el">
            <button type="button" class="shop-btn shop-btn--next" @click="requestClose">{{
              tileDetailLayerCopy.closeButton
            }}</button>
          </div>
        </div>
      </div>

      <div
        v-if="originRect && flyCloneActive"
        ref="flyCloneRef"
        class="tile-detail-fly-clone-root"
        :style="flyCloneBoxStyle"
        aria-hidden="true"
      >
        <div
          class="tile-detail-fly-clone-content"
          :class="{ 'tile-detail-fly-clone-content--from-preview': flyCloneAnchorRect }"
        >
          <div class="tile-detail-fly-clone-logical-cell">
            <div class="tile-detail-fly-clone-inner">
              <LetterTile
                variant="grid"
                class="tile-detail-preview-tile"
                :letter="payload.letter"
                :rarity="payload.rarity"
                :material-id="payload.materialId"
                :accessory-id="payload.accessoryId"
                :treasure-accessory-id="payload.treasureAccessoryId"
                :tile-score-bonus="Number(payload.tileScoreBonus) || 0"
                :tile-mult-bonus="Number(payload.tileMultBonus) || 0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import gsap from "gsap";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import LetterTile from "./LetterTile.vue";
import { getBaseScoreForRarity, getRarityMultBonusForRarity } from "../composables/useScoring";
import { getTileMaterialEffectDescription, getTileAccessoryEffectDescription } from "../game/tileDetailDescriptions";
import TreasureDescRichText from "./TreasureDescRichText.vue";
import { getTileAccessoryChipVisual } from "../game/tileAccessories";
import {
  getTreasureAccessoryChipVisual,
  getTreasureAccessoryPanelDescription,
  getTreasureAccessoryPanelTitle,
} from "../game/treasureAccessories";
import {
  tileDetailLayerCopy,
  getTileDetailRarityTierLabel,
  getTileDetailMaterialTitle,
  getTileDetailAccessoryTitle,
} from "../game/tileDetailLayerCopy.js";
import { EASE_TRANSFORM } from "../constants.js";
import { bumpOverlayZ } from "../game/overlayStack.js";

const props = defineProps({
  /** @type {{ letter: string, rarity: string, tileScoreBonus?: number, tileMultBonus?: number, materialId?: string | null, materialScoreBonus?: number, materialMultBonus?: number, accessoryId?: string | null, foilOverlay?: boolean } | null} */
  payload: { type: Object, default: null },
  /** @type {{ left: number, top: number, width: number, height: number } | null} */
  originRect: { type: Object, default: null },
  /** 各稀有度等级（与局内 `rarityLevelsByRarity` 一致） */
  rarityLevelsByRarity: { type: Object, default: null },
  overlaySuppressed: { type: Boolean, default: false },
});

const emit = defineEmits(["close"]);

const backdropRef = ref(null);
const stackZ = ref(0);
const backdropStackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : undefined));
const targetFlyMeasureRef = ref(null);
const targetVisualRef = ref(null);
const regionsRef = ref(null);
const actionsRef = ref(null);
const flyCloneRef = ref(null);

const closing = ref(false);
const bootMask = ref(true);
const flyCloneActive = ref(validOrigin(props.originRect));

/**
 * 关闭飞回时：克隆锚在详情区测量矩形；为 null 时进层用 props.originRect。
 * 避免 `position:fixed` 未设坐标时用「静态位置」落在 flex 主内容区（看起来像预览位闪一下）。
 * @type {import('vue').Ref<{ left: number, top: number, width: number, height: number } | null>}
 */
const flyCloneAnchorRect = ref(null);

/** 首帧即钉住起点/终点盒，GSAP 只改 transform（x/y/scale），不与 Vue 抢 left/top */
const flyCloneBoxStyle = computed(() => {
  if (!flyCloneActive.value) return {};
  const r = flyCloneAnchorRect.value ?? props.originRect;
  if (!validOrigin(r)) {
    return {
      position: "fixed",
      left: "-9999px",
      top: "0",
      width: "1px",
      height: "1px",
      zIndex: 10,
      boxSizing: "border-box",
      margin: "0",
      pointerEvents: "none",
    };
  }
  const cx = r.left + r.width * 0.5;
  const cy = r.top + r.height * 0.5;
  return {
    position: "fixed",
    zIndex: 10,
    boxSizing: "border-box",
    margin: "0",
    pointerEvents: "none",
    left: `${cx}px`,
    top: `${cy}px`,
    marginLeft: `${-r.width / 2}px`,
    marginTop: `${-r.height / 2}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  };
});

/** @type {gsap.core.Timeline | null} */
let enterTl = null;

function validOrigin(r) {
  return (
    r &&
    typeof r.left === "number" &&
    typeof r.top === "number" &&
    r.width > 2 &&
    r.height > 2
  );
}

function staggerTargets() {
  const regionCards = regionsRef.value?.querySelectorAll?.(".tile-detail-stagger-el") ?? [];
  return [...regionCards, actionsRef.value].filter(Boolean);
}

/** @param {{ left: number, top: number, width: number, height: number }} r */
function rectCenter(r) {
  return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
}

const FLY_DURATION = 0.44;
const FLY_DURATION_CLOSE = 0.38;

function runEnterAnimation() {
  const backdrop = backdropRef.value;
  const measureEl = targetFlyMeasureRef.value;
  const targetFade = targetVisualRef.value;
  const clone = flyCloneRef.value;
  if (!backdrop || !measureEl || !targetFade) return;

  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }

  const staggerEls = staggerTargets();

  gsap.killTweensOf([backdrop, targetFade, clone, ...staggerEls].filter(Boolean));

  gsap.set(backdrop, { backgroundColor: "rgba(14, 12, 10, 0)" });
  gsap.set(staggerEls, { opacity: 0, y: 7 });

  gsap.fromTo(
    backdrop,
    { backgroundColor: "rgba(14, 12, 10, 0)" },
    {
      backgroundColor: "rgba(14, 12, 10, 0.78)",
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
      const cloneLive = flyCloneRef.value;
      const measureLive = targetFlyMeasureRef.value;
      const fadeEl = targetVisualRef.value;
      if (!measureLive || !fadeEl) return;

      flyCloneAnchorRect.value = null;

      const originOk = validOrigin(props.originRect);
      const hasFly = Boolean(originOk && cloneLive);

      if (hasFly) {
        gsap.set(fadeEl, { opacity: 0, pointerEvents: "none", y: 0, clearProps: "transform" });
      } else {
        flyCloneActive.value = false;
        gsap.set(fadeEl, { opacity: 0, pointerEvents: "none", y: 8 });
      }

      bootMask.value = false;

      const tl = gsap.timeline({
        defaults: { ease: EASE_TRANSFORM, overwrite: "auto" },
      });

      if (hasFly && cloneLive) {
        void backdrop.offsetHeight;
        const flyTo = measureLive.getBoundingClientRect();
        const flyFrom = props.originRect;
        const fc = rectCenter(flyFrom);
        const tc = rectCenter(flyTo);
        const w0 = Math.max(2, flyFrom.width);
        const w1 = Math.max(2, flyTo.width);
        const scaleEnd = Math.min(32, Math.max(0.06, w1 / w0));

        gsap.killTweensOf(cloneLive);
        gsap.set(cloneLive, {
          visibility: "visible",
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          transformOrigin: "50% 50%",
          force3D: true,
          immediateRender: true,
        });

        tl.to(
          cloneLive,
          {
            x: tc.x - fc.x,
            y: tc.y - fc.y,
            scale: scaleEnd,
            duration: FLY_DURATION,
          },
          0,
        );

        tl.add(() => {
          gsap.set(fadeEl, { opacity: 1, pointerEvents: "auto", clearProps: "transform" });
          const node = flyCloneRef.value;
          if (node) gsap.set(node, { opacity: 0, visibility: "hidden" });
          requestAnimationFrame(() => {
            flyCloneActive.value = false;
            flyCloneAnchorRect.value = null;
            if (node?.isConnected) gsap.set(node, { clearProps: "transform" });
          });
        });
      } else {
        flyCloneActive.value = false;
        tl.to(
          fadeEl,
          {
            opacity: 1,
            y: 0,
            pointerEvents: "auto",
            duration: 0.24,
            ease: EASE_TRANSFORM,
            clearProps: "transform",
          },
          0.06,
        );
      }

      tl.to(
        staggerEls,
        {
          opacity: 1,
          y: 0,
          duration: 0.18,
          stagger: 0.038,
          ease: EASE_TRANSFORM,
          clearProps: "opacity,transform",
        },
        hasFly ? 0.14 : 0.05,
      );

      enterTl = tl;
    });
}

function runCloseAnimation() {
  if (closing.value) {
    return Promise.resolve();
  }
  closing.value = true;
  const backdrop = backdropRef.value;
  const measureEl = targetFlyMeasureRef.value;
  const targetFade = targetVisualRef.value;
  const clone = flyCloneRef.value;
  const staggerEls = staggerTargets();

  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }

  gsap.killTweensOf([backdrop, targetFade, clone, ...staggerEls].filter(Boolean));

  const origin = props.originRect;
  const hasReturnFly = validOrigin(origin) && measureEl && targetFade;

  return new Promise((resolve) => {
    if (hasReturnFly) {
      const fromR = measureEl.getBoundingClientRect();
      const fc = rectCenter(fromR);
      const oc = rectCenter(origin);
      const scaleEnd = Math.max(0.06, Math.min(32, origin.width / Math.max(2, fromR.width)));

      flyCloneAnchorRect.value = {
        left: fromR.left,
        top: fromR.top,
        width: fromR.width,
        height: fromR.height,
      };
      flyCloneActive.value = true;
      void nextTick()
        .then(
          () =>
            new Promise((r) => {
              requestAnimationFrame(() => requestAnimationFrame(r));
            }),
        )
        .then(() => {
          const c = flyCloneRef.value;
          if (!c || !backdrop || !targetFade) {
            closing.value = false;
            emit("close");
            resolve(undefined);
            return;
          }

          gsap.set(targetFade, { opacity: 0, pointerEvents: "none" });
          gsap.set(c, {
            visibility: "visible",
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            transformOrigin: "50% 50%",
            force3D: true,
            immediateRender: true,
          });

          const tl = gsap.timeline({
            defaults: { ease: EASE_TRANSFORM, overwrite: "auto" },
            onComplete: () => {
              flyCloneActive.value = false;
              flyCloneAnchorRect.value = null;
              closing.value = false;
              gsap.set(c, { clearProps: "transform" });
              emit("close");
              resolve(undefined);
            },
          });

          if (backdrop) {
            tl.to(
              backdrop,
              {
                backgroundColor: "rgba(14, 12, 10, 0)",
                duration: 0.22,
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

          tl.to(
            c,
            {
              x: oc.x - fc.x,
              y: oc.y - fc.y,
              scale: scaleEnd,
              duration: FLY_DURATION_CLOSE,
            },
            0.02,
          );
        });
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        closing.value = false;
        emit("close");
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

    if (targetFade) {
      tl.to(
        targetFade,
        {
          opacity: 0,
          y: 5,
          duration: 0.16,
          ease: EASE_TRANSFORM,
        },
        0.02,
      );
    }
  });
}

function requestClose() {
  if (closing.value) return;
  void runCloseAnimation();
}

function onDocumentKeydown(e) {
  if (e.key === "Escape") requestClose();
}

watch(
  () => props.payload,
  (p) => {
    if (p) {
      nextTick(() => {
        stackZ.value = bumpOverlayZ();
      });
      document.addEventListener("keydown", onDocumentKeydown);
    } else document.removeEventListener("keydown", onDocumentKeydown);
  },
  { immediate: true },
);

onMounted(() => {
  void nextTick().then(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => runEnterAnimation());
    });
  });
});

onUnmounted(() => {
  document.removeEventListener("keydown", onDocumentKeydown);
  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }
});

const rarityKey = computed(() => {
  const r = String(props.payload?.rarity ?? "common");
  if (r === "rare" || r === "epic" || r === "legendary") return r;
  return "common";
});

const rarityScore = computed(() => {
  const r = String(props.payload?.rarity ?? "common");
  return getBaseScoreForRarity(r, props.rarityLevelsByRarity);
});

const rarityMult = computed(() => {
  const r = String(props.payload?.rarity ?? "common");
  return getRarityMultBonusForRarity(r, props.rarityLevelsByRarity);
});

const rarityTagLabel = computed(() => getTileDetailRarityTierLabel(props.payload?.rarity));

function formatMultDisplay(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  if (Math.abs(x - Math.round(x)) < 1e-6) return String(Math.round(x));
  const s = x.toFixed(1);
  return s.endsWith(".0") ? String(Math.round(x)) : s;
}

const tileScoreExtra = computed(() =>
  Math.max(0, Math.floor(Number(props.payload?.tileScoreBonus) || 0)),
);

const tileMultExtra = computed(() =>
  Math.max(0, Math.round(Number(props.payload?.tileMultBonus) || 0)),
);

/** 稀有度基础分（取整）+ 棋盘格额分，与原先分解式求和一致 */
const totalPerLetterScoreDisplay = computed(() => {
  const base = Math.max(0, Math.round(Number(rarityScore.value) || 0));
  return String(Math.max(0, base + tileScoreExtra.value));
});

const totalPerLetterMultDisplay = computed(() => {
  const rm = Number(rarityMult.value);
  const m = Number.isFinite(rm) ? rm : 0;
  return formatMultDisplay(m + tileMultExtra.value);
});

const scoreMultSummaryAria = computed(() =>
  tileDetailLayerCopy.rarity.formatTotalPerLetterAria(
    totalPerLetterScoreDisplay.value,
    totalPerLetterMultDisplay.value,
  ),
);

const materialScoreInt = computed(() =>
  Math.max(0, Math.floor(Number(props.payload?.materialScoreBonus) || 0)),
);
const materialMultNum = computed(() => Number(props.payload?.materialMultBonus) || 0);
const materialMultSigned = computed(() => {
  const n = materialMultNum.value;
  if (!Number.isFinite(n) || n === 0) return "";
  return n > 0 ? `+${n}` : String(n);
});
const showMaterialNumeric = computed(
  () => materialScoreInt.value > 0 || (Number.isFinite(materialMultNum.value) && materialMultNum.value !== 0),
);

const materialDesc = computed(() => getTileMaterialEffectDescription(props.payload?.materialId));
const accessoryDesc = computed(() => getTileAccessoryEffectDescription(props.payload?.accessoryId));

const materialIdNorm = computed(() => String(props.payload?.materialId ?? "").trim());

const materialTitle = computed(() => getTileDetailMaterialTitle(props.payload?.materialId));

const materialEffectText = computed(() => {
  if (materialDesc.value) return materialDesc.value;
  const m = tileDetailLayerCopy.material;
  const numParts = [];
  if (materialScoreInt.value > 0) numParts.push(m.formatNumericScore(materialScoreInt.value));
  if (materialMultNum.value !== 0 && Number.isFinite(materialMultNum.value)) {
    numParts.push(m.formatNumericMult(materialMultSigned.value));
  }
  return numParts.join(m.numericSep);
});

const showMaterialRegion = computed(() => {
  if (!materialIdNorm.value) return false;
  return Boolean(materialDesc.value || showMaterialNumeric.value);
});

const accessoryIdNorm = computed(() => String(props.payload?.accessoryId ?? "").trim());

const accessoryTitle = computed(() => getTileDetailAccessoryTitle(props.payload?.accessoryId));

const tileAccessoryChipVisual = computed(() => getTileAccessoryChipVisual(props.payload?.accessoryId));

const showAccessoryRegion = computed(() => Boolean(accessoryIdNorm.value && accessoryDesc.value));

const treasureAccessoryIdNorm = computed(() => String(props.payload?.treasureAccessoryId ?? "").trim());

const treasureAccessoryTitle = computed(() =>
  getTreasureAccessoryPanelTitle(props.payload?.treasureAccessoryId),
);

const treasureAccessoryDesc = computed(() =>
  getTreasureAccessoryPanelDescription(props.payload?.treasureAccessoryId),
);

const treasureAccessoryChipVisual = computed(() =>
  getTreasureAccessoryChipVisual(props.payload?.treasureAccessoryId),
);

const showTreasureAccessoryRegion = computed(
  () => Boolean(treasureAccessoryIdNorm.value && treasureAccessoryDesc.value),
);
</script>

<style scoped>
.tile-detail-stack {
  gap: calc(21 * var(--rpx));
}

.tile-detail-visual-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: calc(12 * var(--rpx)) 0 calc(8 * var(--rpx));
  box-sizing: border-box;
  /* 与棋盘 `.letter-grid` 单格一致；内部 `.grid-tile` 用固定 rpx，外框须同格宽才与局内比例一致 */
  min-height: calc(var(--letter-grid-cell-size) * 1.5 + 20 * var(--rpx));
}

.tile-detail-visual-scale {
  width: var(--letter-grid-cell-size);
  height: var(--letter-grid-cell-size);
  flex-shrink: 0;
  transform: scale(1.5);
  transform-origin: center center;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}

.tile-detail-target-fade {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  /* 脚本跑起来前绝不透出真 LetterTile，避免与飞入克隆同一视觉区「先亮一下」 */
  opacity: 0;
}

.tile-detail-preview-tile {
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
}

.tile-detail-fly-clone-root {
  box-sizing: border-box;
  visibility: hidden;
  backface-visibility: hidden;
  transform-style: preserve-3d;
  will-change: transform;
  overflow: visible;
}

/* 飞入/飞出根盒尺寸由 flyCloneBoxStyle 钉死；内部与预览区一致时再套一层逻辑格 + scale，避免把 LetterTile 硬拉进「已乘 1.5 的屏上盒」导致字按 rpx 不变形再被 GSAP 缩小 */
.tile-detail-fly-clone-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile-detail-fly-clone-content--from-preview .tile-detail-fly-clone-logical-cell {
  width: var(--letter-grid-cell-size);
  height: var(--letter-grid-cell-size);
  flex: 0 0 auto;
  transform: scale(1.5);
  transform-origin: center center;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}

.tile-detail-fly-clone-content:not(.tile-detail-fly-clone-content--from-preview) .tile-detail-fly-clone-logical-cell {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}

.tile-detail-fly-clone-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}

.tile-detail-regions {
  width: 100%;
  max-width: min(calc(520 * var(--rpx)), 100%);
  display: flex;
  flex-direction: column;
  gap: calc(15 * var(--rpx));
}

.tile-detail-entry {
  text-align: center;
}

/* 标题/正文排版见 game.css：与宝藏简介 .treasure-detail-desc-body-text 对齐 */
</style>
