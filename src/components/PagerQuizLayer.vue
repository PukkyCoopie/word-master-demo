<template>
  <Teleport defer to="#game-view-portal-frame">
    <div
      ref="backdropRef"
      class="pager-quiz-backdrop portal-overlay-fill treasure-detail-backdrop"
      :class="{
        'pager-quiz-backdrop--boot': enterBoot,
        'portal-overlay--shop-upgrade-suppressed': overlaySuppressed,
      }"
      :style="backdropStackStyle"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="treasure-detail-body pager-quiz-body">
        <div class="pager-quiz-panel pager-quiz-enter-stagger">
          <div class="treasure-detail-stack pager-quiz-stack">
            <div class="treasure-detail-title-group">
              <div
                class="pager-quiz-word-showcase"
                :style="wordShowcaseStyle"
                :aria-label="wordShowcaseLabel"
              >
                <LetterTile
                  v-for="(item, index) in wordTiles"
                  :key="`${item.letter}-${index}`"
                  variant="menu"
                  class="pager-quiz-word-tile"
                  :letter="item.letter"
                  :rarity="item.rarity"
                  :hide-rarity-gem="true"
                  :material-animate="false"
                />
              </div>
              <h2 :id="titleId" class="treasure-detail-name">选择正确的中文释义</h2>
            </div>

            <div class="pager-quiz-options" role="listbox" :aria-activedescendant="activeOptionId">
              <button
                v-for="(opt, index) in session.options"
                :key="opt.id"
                :id="`pager-quiz-opt-${index}`"
                type="button"
                class="pager-quiz-option"
                :class="optionClass(index, opt)"
                role="option"
                :aria-selected="selectedIndex === index"
                :disabled="locked && selectedIndex !== index"
                @click="onSelect(index)"
              >
                <span class="pager-quiz-option__label">{{ opt.label }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showContinue" ref="continueDockRef" class="pager-quiz-continue-dock">
        <button type="button" class="shop-btn shop-btn--next pager-quiz-continue-btn" @click="onContinue">
          继续
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, useId, watch } from "vue";
import gsap from "gsap";
import { portalScrimGsapVars } from "../game/portalScrimBleed.js";
import { EASE_TRANSFORM } from "../constants.js";
import { resolveLetterFromRaw } from "../settings/letterQ.js";
import { getRarityForLetter } from "../composables/useScoring.js";
import { animSleep } from "../settings/animationSpeed.js";
import {
  instantPortalLayerClose,
  instantPortalLayerEnter,
  shouldSkipDecorativeMotion,
} from "../settings/animationSpeed.js";
import LetterTile from "./LetterTile.vue";

const props = defineProps({
  /** @type {{ word?: string, options: { id: string, label: string, isCorrect: boolean }[], correctIndex: number }} */
  session: { type: Object, required: true },
  overlaySuppressed: { type: Boolean, default: false },
});

const emit = defineEmits(["resolved", "closed"]);

const titleId = useId();
const backdropRef = ref(null);
const continueDockRef = ref(null);
const stackZ = ref(0);
const enterBoot = ref(true);
const closing = ref(false);
const locked = ref(false);
const selectedIndex = ref(-1);
const revealResult = ref(false);
const showContinue = ref(false);

/** @type {gsap.core.Timeline | null} */
let closeTl = null;
/** @type {gsap.core.Timeline | null} */
let enterTl = null;

const backdropStackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : undefined));

const activeOptionId = computed(() => {
  const i = selectedIndex.value;
  return i >= 0 ? `pager-quiz-opt-${i}` : undefined;
});

const PAGER_SCRIM_FINAL = "rgba(42, 38, 48, 0.88)";
const PAGER_SCRIM_TRANSPARENT = "rgba(42, 38, 48, 0)";
const WORD_TILE_W = 88;
const WORD_TILE_GAP = 8;
const WORD_SHOWCASE_MAX_W = 560;

const wordTiles = computed(() => {
  const raw = String(props.session.word ?? "").toLowerCase().trim();
  if (!raw) return [];
  /** @type {{ letter: string, rarity: string }[]} */
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "q" && raw[i + 1] === "u") {
      out.push({ letter: resolveLetterFromRaw("q"), rarity: getRarityForLetter("q") });
      i += 1;
      continue;
    }
    out.push({
      letter: ch.toUpperCase(),
      rarity: getRarityForLetter(ch),
    });
  }
  return out;
});

const wordShowcaseLabel = computed(() => props.session.word ?? "");

const wordShowcaseStyle = computed(() => {
  const n = wordTiles.value.length;
  if (n <= 0) return undefined;
  const total = n * WORD_TILE_W + (n - 1) * WORD_TILE_GAP;
  const scale = Math.min(1, WORD_SHOWCASE_MAX_W / total);
  if (scale >= 0.999) return undefined;
  return { transform: `scale(${scale})` };
});

function updateOptionMultilineClasses() {
  const root = backdropRef.value;
  if (!root) return;
  for (const btn of root.querySelectorAll(".pager-quiz-option")) {
    const label = btn.querySelector(".pager-quiz-option__label");
    if (!(label instanceof HTMLElement)) continue;
    const lineHeight = parseFloat(getComputedStyle(label).lineHeight);
    const multiline =
      Number.isFinite(lineHeight) && lineHeight > 0
        ? label.scrollHeight > lineHeight * 1.35
        : label.scrollHeight > label.clientHeight + 1;
    btn.classList.toggle("pager-quiz-option--multiline", multiline);
  }
}

function scheduleOptionMultilineSync() {
  void nextTick(() => {
    updateOptionMultilineClasses();
    requestAnimationFrame(updateOptionMultilineClasses);
  });
}

function collectStaggerEls() {
  const root = backdropRef.value;
  if (!root) return [];
  return Array.from(root.querySelectorAll(".pager-quiz-enter-stagger"));
}

function killEnterTweens() {
  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }
  const backdrop = backdropRef.value;
  const staggerEls = collectStaggerEls();
  if (backdrop || staggerEls.length) {
    gsap.killTweensOf([backdrop, ...staggerEls].filter(Boolean));
  }
}

function applyEnterInitialHide(backdrop, staggerEls) {
  if (backdrop) {
    gsap.set(backdrop, portalScrimGsapVars(PAGER_SCRIM_TRANSPARENT));
  }
  if (staggerEls.length) {
    gsap.set(staggerEls, { opacity: 0, y: 12, scale: 0.96 });
  }
}

function runEnterAnimation() {
  const backdrop = backdropRef.value;
  if (!backdrop) return;

  if (shouldSkipDecorativeMotion()) {
    killEnterTweens();
    enterBoot.value = false;
    instantPortalLayerEnter({
      backdrop,
      backdropFinal: portalScrimGsapVars(PAGER_SCRIM_FINAL),
      staggerEls: collectStaggerEls(),
    });
    return;
  }

  killEnterTweens();
  enterBoot.value = true;
  const staggerEls = collectStaggerEls();
  applyEnterInitialHide(backdrop, staggerEls);
  gsap.fromTo(
    backdrop,
    portalScrimGsapVars(PAGER_SCRIM_TRANSPARENT),
    {
      ...portalScrimGsapVars(PAGER_SCRIM_FINAL),
      duration: 0.42,
      ease: EASE_TRANSFORM,
    },
  );
  enterBoot.value = false;
  enterTl = gsap.timeline();
  enterTl.to(
    staggerEls,
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.22,
      stagger: 0.05,
      ease: EASE_TRANSFORM,
      clearProps: "opacity,transform",
    },
    0.06,
  );
}

/**
 * @param {number} index
 * @param {{ isCorrect: boolean }} opt
 */
function optionClass(index, opt) {
  if (!revealResult.value) {
    return {
      "pager-quiz-option--picked": locked.value && selectedIndex.value === index,
    };
  }
  if (opt.isCorrect) return { "pager-quiz-option--correct": true };
  if (selectedIndex.value === index && !opt.isCorrect) return { "pager-quiz-option--wrong": true };
  return { "pager-quiz-option--dimmed": true };
}

/**
 * @param {number} index
 */
async function onSelect(index) {
  if (locked.value) return;
  locked.value = true;
  selectedIndex.value = index;
  await animSleep(200);
  revealResult.value = true;
  const correct = props.session.options[index]?.isCorrect === true;
  if (correct) {
    await animSleep(500);
    await playClose(correct);
  } else {
    showContinue.value = true;
    await playContinueEnter();
  }
}

async function playContinueEnter() {
  await nextTick();
  const el = continueDockRef.value;
  if (!el) return;
  gsap.killTweensOf(el);
  if (shouldSkipDecorativeMotion()) {
    gsap.set(el, { opacity: 1, y: 0, pointerEvents: "auto" });
    return;
  }
  gsap.fromTo(
    el,
    { opacity: 0, y: 14 },
    {
      opacity: 1,
      y: 0,
      duration: 0.22,
      ease: EASE_TRANSFORM,
      clearProps: "transform",
      onComplete: () => {
        gsap.set(el, { pointerEvents: "auto" });
      },
    },
  );
}

async function onContinue() {
  if (!showContinue.value) return;
  const correct = false;
  await playClose(correct);
}

/**
 * @param {boolean} correct
 * @returns {Promise<void>}
 */
function playClose(correct) {
  if (closing.value) return Promise.resolve();
  closing.value = true;

  const backdrop = backdropRef.value;
  const staggerEls = collectStaggerEls();
  const continueEl = continueDockRef.value;

  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }
  if (closeTl) {
    closeTl.kill();
    closeTl = null;
  }
  gsap.killTweensOf([backdrop, continueEl, ...staggerEls].filter(Boolean));

  if (!backdrop && !staggerEls.length) {
    closing.value = false;
    emit("resolved", { correct, atHalfClose: true });
    emit("closed");
    return Promise.resolve();
  }

  if (shouldSkipDecorativeMotion()) {
    return instantPortalLayerClose({ backdrop, staggerEls }).then(() => {
      closing.value = false;
      emit("resolved", { correct, atHalfClose: true });
      emit("closed");
    });
  }

  const closeDuration = 0.28;
  let halfwayFired = false;

  return new Promise((resolve) => {
    closeTl = gsap.timeline({
      onUpdate() {
        if (halfwayFired) return;
        const p = closeTl?.progress() ?? 0;
        if (p >= 0.5) {
          halfwayFired = true;
          emit("resolved", { correct, atHalfClose: true });
        }
      },
      onComplete: () => {
        closeTl = null;
        closing.value = false;
        if (!halfwayFired) {
          emit("resolved", { correct, atHalfClose: true });
        }
        emit("closed");
        resolve(undefined);
      },
    });

    if (backdrop) {
      closeTl.to(
        backdrop,
        {
          ...portalScrimGsapVars(PAGER_SCRIM_TRANSPARENT),
          duration: closeDuration,
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
          y: 8,
          scale: 0.96,
          duration: 0.16,
          stagger: 0.035,
          ease: EASE_TRANSFORM,
        },
        0,
      );
    }

    if (continueEl) {
      closeTl.to(
        continueEl,
        {
          opacity: 0,
          y: 8,
          duration: 0.14,
          ease: EASE_TRANSFORM,
        },
        0,
      );
    }
  });
}

defineExpose({ playClose });

onMounted(async () => {
  stackZ.value = bumpOverlayZ();
  await nextTick();
  runEnterAnimation();
  scheduleOptionMultilineSync();
});

watch(
  () => props.session.options,
  () => scheduleOptionMultilineSync(),
  { deep: true },
);

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

<style scoped>
.pager-quiz-word-showcase {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  gap: calc(8 * var(--rpx));
  max-width: 100%;
  transform-origin: center center;
}

.pager-quiz-word-tile.menu-logo-tile {
  animation: none;
  will-change: auto;
}
</style>
