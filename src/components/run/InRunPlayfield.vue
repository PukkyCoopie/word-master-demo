<script setup>
import { computed, inject, provide, reactive, ref } from "vue";
import { RUN_SESSION_KEY } from "../../runSession/useRunSession.js";
import { sessionUnref as sv } from "../../runSession/sessionUnref.js";
import { PLAYFIELD_VIEW_KEY } from "./playfieldViewKey.js";
import RunHeaderBar from "./RunHeaderBar.vue";
import BossTapeStrip from "./BossTapeStrip.vue";
import ResultArea from "../ResultArea.vue";
import LetterTile from "../LetterTile.vue";
import WordDefinitionTrigger from "../WordDefinitionTrigger.vue";
import TreasureBarRow from "../TreasureBarRow.vue";
import WordDefinitionLayer from "../WordDefinitionLayer.vue";
import { isQuStyleTileLetter } from "../../settings/letterQ.js";
import { getHighRiskSpellConfirmEnabled } from "../../settings/gameSettings.js";
import { useHoldConfirmInteraction } from "../../composables/useHoldConfirmInteraction.js";

/** @type {import('../../runSession/runSessionTypes.js').RunSession} */
const session = inject(RUN_SESSION_KEY);
if (!session?.playfield?.buildViewContext) {
  throw new Error("InRunPlayfield: session.playfield.buildViewContext missing");
}
const wordDefinition = session?.ui?.wordDefinition;
if (!wordDefinition) {
  throw new Error("InRunPlayfield: session.ui.wordDefinition missing");
}
/** session.ui 为 plain object，嵌套 ref/computed 在 template 中须 reactive 解包 */
const wordDef = reactive(wordDefinition);
/** @type {import('./playfieldViewKey.js').PlayfieldViewContext} */
const pv = session.playfield.buildViewContext();
provide(PLAYFIELD_VIEW_KEY, pv);

const pfCanPause = computed(() => Boolean(sv(pv.canPause)));
const pfShowShop = computed(() => Boolean(sv(pv.showShop)));
const pfTutorialActive = computed(() => Boolean(sv(pv.firstWordTutorialActive)));
const pfGridIntroDone = computed(() => Boolean(sv(pv.gridIntroDone)));
const pfCanSubmit = computed(() => Boolean(sv(pv.canSubmit)));
const pfScoringAnimating = computed(() => Boolean(sv(pv.scoringAnimating)));
const pfGridRefillAnimating = computed(() => Boolean(sv(pv.gridRefillAnimating)));
const pfSubmitTutorialReady = computed(() => Boolean(sv(pv.firstWordTutorialSubmitHighlightReady)));
const pfFlyingLetters = computed(() => sv(pv.flyingLetters) ?? []);
const pfFlyingBackBatches = computed(() => sv(pv.flyingBackBatches) ?? []);
const pfBossSoftViolation = computed(() => Boolean(sv(pv.bossSubmitDangerPreview)));
const pfSubmitHoldMode = computed(
  () => pfBossSoftViolation.value && getHighRiskSpellConfirmEnabled() && pfCanSubmit.value,
);
const pfSubmitReady = computed(
  () =>
    pfCanSubmit.value &&
    !pfScoringAnimating.value &&
    !pfGridRefillAnimating.value &&
    pfFlyingLetters.value.length === 0 &&
    pfFlyingBackBatches.value.length === 0,
);

function trySubmitWord() {
  if (!pfSubmitReady.value) return;
  pv.submitWord?.();
}

const submitHold = useHoldConfirmInteraction({
  enabled: () => pfSubmitHoldMode.value && pfSubmitReady.value,
  onConfirm: trySubmitWord,
});

/** @param {PointerEvent} e */
function onSubmitPointerDown(e) {
  submitHold.btnRef.value =
    submitBtnRef.value instanceof HTMLElement ? submitBtnRef.value : null;
  submitHold.onPointerDown(e);
}
const pfBlockingInput = computed(() =>
  typeof pv.isFirstWordTutorialBlockingInput === "function"
    ? pv.isFirstWordTutorialBlockingInput()
    : false,
);
const pfRunFlowOverlayOpen = computed(() =>
  typeof pv.isRunFlowOverlayOpen === "function" ? pv.isRunFlowOverlayOpen() : false,
);

function onInfoBtnClick() {
  if (pfRunFlowOverlayOpen.value || pfTutorialActive.value) return;
  pv.openInfoModalLevel?.();
}

function onPauseBtnClick() {
  if (pfShowShop.value || !pfCanPause.value) return;
  pv.openPauseOptions?.();
}

function onDeckBtnClick() {
  if (pfRunFlowOverlayOpen.value || pfBlockingInput.value) return;
  pv.openDeckLayer?.();
}

const runHeaderBarRef = ref(null);
const bossTapeStripRef = ref(null);
const gameResultAreaRef = ref(null);
const wordSlotsWrapRef = ref(null);
const wordSlotsScaleRootRef = ref(null);
const wordTranslationWrapRef = ref(null);
const wordTranslationInnerRef = ref(null);
const gameTreasureBarRowRef = ref(null);
const letterGridWrapRef = ref(null);
const letterGridRef = ref(null);
const deckBtnRef = ref(null);
const submitBookmarkRef = ref(null);
const submitBtnRef = ref(null);

defineExpose({
  runHeaderBarRef,
  bossTapeStripRef,
  gameResultAreaRef,
  wordSlotsWrapRef,
  wordSlotsScaleRootRef,
  wordTranslationWrapRef,
  wordTranslationInnerRef,
  gameTreasureBarRowRef,
  letterGridWrapRef,
  letterGridRef,
  deckBtnRef,
  submitBookmarkRef,
  submitBtnRef,
});
</script>

<template>
    <div class="top-area">
      <RunHeaderBar
        ref="runHeaderBarRef"
        :level-title-label="pv.levelTitleLabel"
        :run-difficulty-index="pv.runDifficultyIndex"
        :stage-reward-yuan="pv.stageRewardYuan"
        :reward-dollar-marks="pv.rewardDollarMarks"
        :wallet-header-shown="pv.walletHeaderShown"
        :wallet-amount-text="pv.formatNum(pv.walletHeaderShown)"
        :target-score-value="pv.headerTargetScoreValue"
        :round-score-value="pv.headerRoundScoreValue"
        :first-word-tutorial-active="pv.firstWordTutorialActive"
        @open-stage-info="pv.openInfoModalStage"
      />
      <BossTapeStrip
        ref="bossTapeStripRef"
        :active-boss-slug="pv.activeBossSlug"
        :club-required-key="pv.clubRequiredKeyBoss"
        :mouth-locked-length="pv.mouthLockedLengthBoss"
        :spell-counts-by-length="pv.spellCountsByLength"
        :soft-preview="pv.bossTapeSoftPreview"
        :mechanics-suppressed="pv.bossMechanicsSuppressed"
      />
      <ResultArea
        ref="gameResultAreaRef"
        :show-total-bar="
          pv.showResultTotalBar &&
          !pv.clearWinLengthUpgradeFxActive &&
          !pv.lastSubmitRarityFxActive &&
          !pv.inRunGrantUpgradeFxActive &&
          !pv.armBossLengthDowngradeFxActive
        "
        :total-text="pv.resultTotalShown"
        :show-word-length="pv.showResultWordLength"
        :word-length-text="pv.resultWordLengthShown"
        :word-level="pv.resultWordLengthLevel"
        :score-text="pv.displayFormulaScore"
        :mult-text="pv.displayFormulaMult"
      />
    </div>

    <div class="middle-area">
      <div
        class="middle-word-stack"
        :class="{ 'middle-word-stack--definition-zone': pv.wordDefinitionZoneVisible }"
      >
        <div ref="wordSlotsWrapRef" class="word-slots-wrap">
        <div
          ref="wordSlotsScaleRootRef"
          class="word-slots"
          :class="{ 'word-slots--dragging': pv.tileDragActive }"
        >
          <div
            v-for="(entry, i) in pv.displayWordSlotPresentations"
            :key="entry ? `w-${entry.id}` : pv.wordSlotPlaceholderKey(i)"
            :ref="el => pv.setWordSlotRef(i, el)"
            :class="[
              'word-slot-tile',
              (isQuStyleTileLetter(entry?.letter) || (!entry && isQuStyleTileLetter(pv.tileDragGhostPresentation?.letter)))
                ? 'letter-qu'
                : '',
              {
                'word-slot-tile-out': pv.isSlotOutOfFlow(i),
                'word-slot-tile--drag-preview-empty': !entry,
                'word-slot-scoring-highlight': entry && pv.scoringLetterIndex === i,
                'word-slot-tile--boss-debuff': !!entry?.bossTileDebuffed
                  || (!!pv.tileDragGhostPresentation?.bossTileDebuffed && !entry),
              },
            ]"
            @click="entry && pv.onSlotClick(i)"
            @contextmenu.prevent.stop="entry && pv.onWordSlotContextMenu($event, i)"
            @pointerdown="entry && pv.onWordSlotCombinedPointerDown($event, i)"
            @pointerup="pv.onWordSlotPointerUp($event, i)"
            @pointercancel="pv.onTilePointerCancel($event)"
          >
            <div class="word-slot-placeholder" aria-hidden="true"></div>
            <LetterTile
              v-if="!entry && pv.tileDragActive && pv.tileDragGhostPresentation"
              variant="wordSlotContent"
              class="word-slot-drag-placeholder"
              :class="{ 'player-marked': pv.tileDragGhostPresentation.playerMarked === true }"
              :letter="pv.tileDragGhostPresentation.letter"
              :rarity="pv.tileDragGhostPresentation.rarity"
              :material-id="pv.tileDragGhostPresentation.materialId ?? null"
              :accessory-id="pv.tileDragGhostPresentation.accessoryId ?? null"
              :treasure-accessory-id="pv.tileDragGhostPresentation.treasureAccessoryId ?? null"
              :tile-score-bonus="Number(pv.tileDragGhostPresentation.tileScoreBonus) || 0"
              :tile-mult-bonus="Number(pv.tileDragGhostPresentation.letterMultBonus) || 0"
              :material-animate="false"
              :boss-tile-debuffed="!!pv.tileDragGhostPresentation.bossTileDebuffed"
              :cerulean-bell-locked="pv.tileDragGhostPresentation.ceruleanBellLocked === true"
              :vowel-ghost-prev="pv.tileDragGhostPresentation.vowelGhostPrev ?? null"
              :vowel-ghost-next="pv.tileDragGhostPresentation.vowelGhostNext ?? null"
            />
            <LetterTile
              v-else-if="entry"
              variant="wordSlotContent"
              :class="{ 'player-marked': entry.playerMarked === true }"
              :letter="entry.letter"
              :rarity="entry.rarity"
              :material-id="entry.materialId ?? null"
              :accessory-id="entry.accessoryId ?? null"
              :treasure-accessory-id="entry.treasureAccessoryId ?? null"
              :tile-score-bonus="Number(entry.tileScoreBonus) || 0"
              :tile-mult-bonus="Number(entry.letterMultBonus) || 0"
              :material-animate="!pv.isSlotContentHidden(i)"
              :content-hidden="pv.isSlotContentHidden(i)"
              :boss-tile-debuffed="!!entry.bossTileDebuffed"
              :cerulean-bell-locked="entry.ceruleanBellLocked === true"
              :vowel-ghost-prev="entry.vowelGhostPrev ?? null"
              :vowel-ghost-next="entry.vowelGhostNext ?? null"
            />
          </div>
        </div>
        </div>
        <div class="word-definition-trigger-wrap">
          <WordDefinitionTrigger
            :visible="pv.showWordDefinitionTrigger"
            :mode="pv.wordDefinitionTriggerMode"
            :word="pv.wordDefinitionPreviewWord"
            :preview-line="pv.wordDefinitionPreviewLine"
            :extra-count="pv.wordDefinitionExtraCount"
            @open="pv.openWordDefinitionLayer"
          />
        </div>
        <div
          v-if="pv.SHOW_SUBMIT_TRANSLATION"
          ref="wordTranslationWrapRef"
          class="word-translation-wrap"
        >
          <div
            v-if="pv.submitTranslationLines.length"
            ref="wordTranslationInnerRef"
            class="word-translation-inner"
          >
            <div
              v-for="(line, idx) in pv.submitTranslationLines"
              :key="idx"
              class="word-translation-line"
            >
              {{ line }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-area">
      <TreasureBarRow
        ref="gameTreasureBarRowRef"
        :display-slots="pv.displayOwnedTreasures"
        :display-keys="pv.displayOwnedTreasureKeys"
        :layout-class="pv.treasureSlotsLayoutClass"
        :stack-mode="pv.treasureBarStackMode"
        :filled-count="pv.ownedTreasureFilledCount"
        :compact-animating="pv.treasureBarCompactAnimating"
        :drag-active="pv.gameOwnedDragActive"
        :drag-ghost-visible="pv.gameOwnedDragGhostVisible"
        :drag-placeholder-visible="pv.gameOwnedDragPlaceholderVisible"
        :drag-treasure="pv.gameOwnedDragTreasure"
        :drag-ghost-style="pv.gameOwnedDragGhostStyle"
        :drag-placeholder-style="pv.gameOwnedDragPlaceholderStyle"
        :drag-gem-class="pv.treasureGemClass(pv.gameOwnedDragTreasure?.rarity)"
        :drag-charge-state="pv.gameOwnedDragChargeState"
        :drag-charge-progress="pv.gameOwnedDragChargeProgress"
        :drag-effect-depleted="pv.gameOwnedDragEffectDepleted"
        :drag-crimson-hand-disabled="pv.isCrimsonBossMechanicsActive && pv.scoringAnimating && pv.crimsonTreasureDisabledSlotIndex === pv.gameOwnedDragSourceIndex"
        :amber-boss-mask="pv.isAmberBossMaskActive"
        :gem-class-resolver="pv.gameTreasureGemClassResolver"
        :charge-states="pv.displayTreasureChargeVisualBySlot"
        :charge-progresses="pv.displayTreasureChargeProgressBySlot"
        :effect-depleted-states="pv.displayTreasureEffectDepletedBySlot"
        :slot-class-resolver="pv.gameTreasureSlotClassResolver"
        :crimson-hand-disabled-resolver="pv.gameTreasureCrimsonDisabledResolver"
        :register-slot-ref="pv.setGameTreasureSlotRef"
        :hidden-treasure-count="pv.hiddenTreasureBarCount"
        :expand-btn-highlight="pv.treasureBarExpandBtnHighlight"
        @slot-pointerdown="pv.onGameOwnedSlotPointerDown"
        @slot-click="pv.onGameOwnedSlotClick"
        @empty-slot-click="pv.onGameEmptyTreasureSlotClick"
        @expand-click="pv.openTreasureCollectionLayer"
      />
      <div class="bottom-bar">
        <div class="side-buttons">
          <button
            type="button"
            class="icon-btn icon-btn-white"
            title="信息"
            aria-label="信息"
            :disabled="pfRunFlowOverlayOpen || pfTutorialActive"
            @click="onInfoBtnClick"
          >
            <i class="ri-information-line"></i>
          </button>
          <button
            type="button"
            class="icon-btn icon-btn-yellow"
            title="选项"
            aria-label="选项"
            :disabled="!pfCanPause || pfShowShop"
            @click="onPauseBtnClick"
          >
            <i class="ri-settings-3-line"></i>
          </button>
        </div>
        <div class="letter-grid-area">
          <div ref="letterGridWrapRef" class="letter-grid-wrap" :class="{ 'letter-grid-wrap--tutorial-glow': pv.firstWordTutorialGridGlow }">
            <div
              ref="letterGridRef"
              class="letter-grid"
              :class="{
                'letter-grid--pre-intro': !pfGridIntroDone,
                'letter-grid--manacle': pv.isManacleBossGrid,
                'letter-grid--dragging': pv.tileDragActive,
              }"
            >
            <template v-for="(tile, index) in pv.flatGrid" :key="tile ? tile.id : `void-${index}`">
              <div
                v-if="tile"
                class="letter-grid-cell"
                :class="{
                  'letter-grid-cell--placeholder': pv.isGridTilePlaceholder(
                    Math.floor(index / pv.COLS),
                    index % pv.COLS,
                    tile,
                  ),
                }"
              >
                <LetterTile
                  v-memo="pv.gridTileRenderMemoDeps(tile, index)"
                  variant="grid"
                  :letter="pv.gridTileRenderLetter(tile, index)"
                  :rarity="pv.gridTileRenderRarity(tile, index)"
                  :material-id="
                    pv.gridPlaceholderFrozenPresentation(tile)?.materialId ?? tile.materialId ?? null
                  "
                  :accessory-id="
                    pv.gridPlaceholderFrozenPresentation(tile)?.accessoryId ?? tile.accessoryId ?? null
                  "
                  :treasure-accessory-id="
                    pv.gridPlaceholderFrozenPresentation(tile)?.treasureAccessoryId
                      ?? tile.treasureAccessoryId
                      ?? null
                  "
                  :tile-score-bonus="
                    pv.gridPlaceholderFrozenPresentation(tile)?.tileScoreBonus
                      ?? (Number(tile.tileScoreBonus) || 0)
                  "
                  :tile-mult-bonus="
                    pv.gridPlaceholderFrozenPresentation(tile)?.tileMultBonus
                      ?? (Number(tile.letterMultBonus) || 0)
                  "
                  :material-animate="
                    !pv.isGridTilePlaceholder(Math.floor(index / pv.COLS), index % pv.COLS, tile)
                  "
                  :boss-grid-blocked="
                    pv.gridPlaceholderFrozenPresentation(tile)?.bossGridBlocked
                      ?? tile.bossGridBlocked === true
                  "
                  :boss-tile-debuffed="
                    pv.gridPlaceholderFrozenPresentation(tile)?.bossTileDebuffed
                      ?? tile.bossTileDebuffed === true
                  "
                  :cerulean-bell-locked="
                    pv.gridPlaceholderFrozenPresentation(tile)?.ceruleanBellLocked
                      ?? tile.ceruleanBellLocked === true
                  "
                  :vowel-ghost-prev="pv.gridTileRenderVowelGhostPrev(tile)"
                  :vowel-ghost-next="pv.gridTileRenderVowelGhostNext(tile)"
                  :ref="el => pv.setGridTileRef(index, el)"
                  :class="{
                    selected: tile.selected,
                    'tile-flying': pv.isTileFlying(Math.floor(index / pv.COLS), index % pv.COLS),
                    'player-marked':
                      !pv.isGridTilePlaceholder(Math.floor(index / pv.COLS), index % pv.COLS, tile)
                      && (pv.gridPlaceholderFrozenPresentation(tile)?.playerMarked ?? tile.playerMarked)
                      === true,
                  }"
                  role="button"
                  tabindex="0"
                  @click="pv.onTileClick(Math.floor(index / pv.COLS), index % pv.COLS, tile)"
                  @contextmenu.prevent.stop="
                    pv.onGridTileContextMenu($event, Math.floor(index / pv.COLS), index % pv.COLS, tile)
                  "
                  @pointerdown="pv.onGridTileCombinedPointerDown($event, Math.floor(index / pv.COLS), index % pv.COLS, tile)"
                  @pointerup="pv.onGridTilePointerUp($event, Math.floor(index / pv.COLS), index % pv.COLS, tile)"
                  @pointercancel="pv.onTilePointerCancel($event)"
                />
              </div>
              <div v-else class="letter-grid-cell--void" aria-hidden="true" />
            </template>
          </div>
          <div
            v-if="pv.tileDragGridPlaceholderVisible"
            class="tile-drag-grid-placeholder"
            :style="pv.tileDragGridPlaceholderStyle"
          >
            <LetterTile
              v-if="pv.tileDragGhostPresentation"
              variant="grid"
              :letter="pv.tileDragGhostPresentation.letter"
              :rarity="pv.tileDragGhostPresentation.rarity"
              :material-id="pv.tileDragGhostPresentation.materialId ?? null"
              :accessory-id="pv.tileDragGhostPresentation.accessoryId ?? null"
              :treasure-accessory-id="pv.tileDragGhostPresentation.treasureAccessoryId ?? null"
              :tile-score-bonus="Number(pv.tileDragGhostPresentation.tileScoreBonus) || 0"
              :tile-mult-bonus="Number(pv.tileDragGhostPresentation.letterMultBonus) || 0"
              :material-animate="false"
              :boss-tile-debuffed="!!pv.tileDragGhostPresentation.bossTileDebuffed"
              :cerulean-bell-locked="pv.tileDragGhostPresentation.ceruleanBellLocked === true"
              :vowel-ghost-prev="pv.tileDragGhostPresentation.vowelGhostPrev ?? null"
              :vowel-ghost-next="pv.tileDragGhostPresentation.vowelGhostNext ?? null"
            />
          </div>
        </div>
        <div class="grid-deck-aux-row">
          <button
            ref="deckBtnRef"
            type="button"
            class="deck-btn deck-btn--grid-row"
            title="牌库"
            aria-label="牌库"
            :disabled="pfRunFlowOverlayOpen || pfBlockingInput"
            @click="onDeckBtnClick"
          >
            <i class="ri-stack-line deck-btn-icon" aria-hidden="true"></i>
            <span class="deck-btn-label">牌库</span>
            <span class="deck-btn-count">{{ pv.deckCount }}</span>
          </button>
          <div
            v-if="pv.showMarkButtonInRun || pv.showSwapWordButtonInRun"
            class="action-aux-toolbar"
            role="group"
            aria-label="拼词辅助"
          >
            <button
              v-if="pv.showMarkButtonInRun"
              type="button"
              class="action-aux-btn action-aux-btn--blue"
              :class="{ 'action-aux-btn--disabled': !pv.canUseMarkButton }"
              :title="pv.markButtonTitle"
              :aria-label="pv.markButtonTitle"
              @click="pv.onMarkButtonClick"
            >
              <span class="action-aux-btn__icon-stack">
                <i class="ri-bookmark-line action-aux-btn__main-icon" aria-hidden="true"></i>
                <i
                  v-if="pv.showMarkSendArrow"
                  class="ri-arrow-up-s-line action-aux-btn__sub-icon"
                  aria-hidden="true"
                ></i>
              </span>
            </button>
            <button
              v-if="pv.showSwapWordButtonInRun"
              type="button"
              class="action-aux-btn action-aux-btn--purple"
              :class="{ 'action-aux-btn--disabled': !pv.canSwapWordSelection }"
              :title="pv.swapWordButtonTitle"
              :aria-label="pv.swapWordButtonTitle"
              data-haptic-skip-ui-tap
              @click="pv.onSwapWordSelectionClick"
            >
              <i class="ri-arrow-up-down-line" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        </div>
        <div class="action-buttons">
          <div ref="submitBookmarkRef" class="action-bookmark" :class="{ 'action-bookmark--tutorial-ready': pfSubmitTutorialReady }">
            <button
              ref="submitBtnRef"
              type="button"
              class="action-btn"
              :class="{
                'action-btn-green': !pfBossSoftViolation,
                'action-btn--boss-violation-preview': pfBossSoftViolation,
                'action-btn-disabled': !pfCanSubmit || pfScoringAnimating || pfGridRefillAnimating,
                'action-btn--tutorial-ready': pfSubmitTutorialReady,
                'hold-action-btn--holding': submitHold.holding.value,
              }"
              :title="pfSubmitHoldMode ? '按住以提交' : '提交'"
              data-haptic-skip-ui-tap
              @click="submitHold.onClick"
              @pointerdown="onSubmitPointerDown"
              @pointerup="submitHold.onPointerUp"
              @pointercancel="submitHold.onPointerCancel"
              @pointerleave="submitHold.onPointerLeave"
              @lostpointercapture="submitHold.onLostPointerCapture"
            >
              <i class="ri-check-line action-icon"></i>
              <span
                v-if="pfSubmitHoldMode"
                class="hold-action-btn-fill"
                :style="{ transform: `scaleY(${submitHold.fillRatio.value})` }"
                aria-hidden="true"
              />
            </button>
            <div class="action-label-wrap">
              <span class="action-label action-label-green">{{ pv.remainingWords }}</span>
              <span
                v-if="pv.submitDeltaKey > 0"
                :key="pv.submitDeltaKey"
                class="action-count-delta action-count-delta-green"
                aria-hidden="true"
              >-1</span>
            </div>
          </div>
          <div class="action-bookmark">
            <button
              type="button"
              class="action-btn action-btn-red"
              :class="{
                'action-btn-disabled': !pv.canRemove,
                'action-btn-disabled--interactive': pv.discardBtnOverLimit,
              }"
              title="丢弃选中的字母（先选字再点）"
              data-haptic-skip-ui-tap
              @click="pv.onDiscardBtnClick"
            >
              <i class="ri-delete-bin-line action-icon"></i>
            </button>
            <div class="action-label-wrap">
              <span class="action-label action-label-red">{{ pv.remainingRemovals }}</span>
              <span
                v-if="pv.removalDeltaKey > 0"
                :key="pv.removalDeltaKey"
                class="action-count-delta action-count-delta-red"
                aria-hidden="true"
              >-1</span>
            </div>
          </div>
        </div>
      </div>
    </div>

  <!-- 飞字挂到 body，避免受 .game-scaler 的 transform:scale 影响 -->
  <Teleport to="body">
    <div
      v-if="pv.tileDragGhostVisible && pv.tileDragGhostPresentation"
      class="tile-drag-ghost"
      :style="pv.tileDragGhostStyle"
    >
      <LetterTile
        variant="fly"
        :class="{ 'player-marked': pv.tileDragGhostPresentation.playerMarked === true }"
        :letter="pv.tileDragGhostPresentation.letter"
        :rarity="pv.tileDragGhostPresentation.rarity"
        :material-id="pv.tileDragGhostPresentation.materialId ?? null"
        :accessory-id="pv.tileDragGhostPresentation.accessoryId ?? null"
        :treasure-accessory-id="pv.tileDragGhostPresentation.treasureAccessoryId ?? null"
        :tile-score-bonus="Number(pv.tileDragGhostPresentation.tileScoreBonus) || 0"
        :tile-mult-bonus="Number(pv.tileDragGhostPresentation.letterMultBonus) || 0"
        :boss-tile-debuffed="!!pv.tileDragGhostPresentation.bossTileDebuffed"
        :cerulean-bell-locked="pv.tileDragGhostPresentation.ceruleanBellLocked === true"
        :vowel-ghost-prev="pv.tileDragGhostPresentation.vowelGhostPrev ?? null"
        :vowel-ghost-next="pv.tileDragGhostPresentation.vowelGhostNext ?? null"
      />
    </div>
    <LetterTile
      v-for="fly in pv.flyingLettersForRender"
      :key="fly.id"
      v-memo="[fly.id, fly.letter, fly.rarity, fly.bossTileDebuffed, fly.materialId, fly.vowelGhostPrev, fly.vowelGhostNext, fly.playerMarked, fly.tileScoreBonus, fly.tileMultBonus]"
      variant="fly"
      :class="{ 'player-marked': fly.playerMarked === true }"
      :letter="fly.letter"
      :rarity="fly.rarity"
      :tile-score-bonus="Number(fly.tileScoreBonus) || 0"
      :tile-mult-bonus="Number(fly.tileMultBonus) || 0"
      :material-id="fly.materialId ?? null"
      :accessory-id="fly.accessoryId ?? null"
      :treasure-accessory-id="fly.treasureAccessoryId ?? null"
      :boss-tile-debuffed="fly.bossTileDebuffed === true"
      :cerulean-bell-locked="fly.ceruleanBell === true"
      :vowel-ghost-prev="fly.vowelGhostPrev ?? null"
      :vowel-ghost-next="fly.vowelGhostNext ?? null"
      :ref="el => pv.setFlyingInRef(fly, el)"
    />
  </Teleport>

  <WordDefinitionLayer
    :open="wordDef.layerOpenForPlayfield"
    :word="wordDef.wordDefinitionPreviewWord"
    :lines="wordDef.wordDefinitionPreviewLines"
    @close="wordDef.closeWordDefinitionLayer()"
  />
</template>

<style scoped>
.action-label-wrap {
  position: relative;
  width: 100%;
}
.action-count-delta {
  position: absolute;
  right: calc(6 * var(--rpx));
  top: 50%;
  margin-top: calc(-18 * var(--rpx));
  font-size: calc(34 * var(--rpx));
  font-weight: 900;
  line-height: 1;
  letter-spacing: calc(-0.02 * 1em);
  pointer-events: none;
  text-shadow:
    0 calc(2 * var(--rpx)) calc(2 * var(--rpx)) rgba(255, 255, 255, 0.45),
    0 calc(4 * var(--rpx)) calc(10 * var(--rpx)) rgba(0, 0, 0, 0.4);
  animation: actionCountDeltaPop 0.92s var(--ease-expo-out) forwards;
}
.action-count-delta-green {
  color: #ffeb3b;
  text-shadow:
    0 calc(2 * var(--rpx)) calc(2 * var(--rpx)) rgba(255, 255, 255, 0.45),
    0 calc(4 * var(--rpx)) calc(10 * var(--rpx)) rgba(0, 0, 0, 0.4),
    0 0 calc(6 * var(--rpx)) rgba(255, 235, 59, 0.55);
}
.action-count-delta-red {
  color: #ff8a80;
  text-shadow:
    0 calc(2 * var(--rpx)) calc(2 * var(--rpx)) rgba(255, 255, 255, 0.45),
    0 calc(4 * var(--rpx)) calc(10 * var(--rpx)) rgba(0, 0, 0, 0.4),
    0 0 calc(6 * var(--rpx)) rgba(255, 82, 82, 0.45);
}
@keyframes actionCountDeltaPop {
  0% {
    opacity: 0;
    transform: translateY(calc(10 * var(--rpx))) scale(0.45);
  }
  14% {
    opacity: 1;
    transform: translateY(0) scale(1.28);
  }
  32% {
    opacity: 1;
    transform: translateY(calc(-6 * var(--rpx))) scale(1.12);
  }
  100% {
    opacity: 0;
    transform: translateY(calc(-40 * var(--rpx))) scale(0.82);
  }
}

.word-slots-wrap {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: var(--letter-grid-cell-size);
  overflow: visible;
}
.word-slots {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  overflow: visible;
  display: block;
}
.word-slots .word-slot-tile {
  position: absolute;
  /* left/top/width/height 由 RAF 循环写入 */
}
.word-slot-hover-ph-exit {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.word-slot-hover-ph-exit .word-slot-drag-placeholder {
  width: 100%;
  height: 100%;
}
.word-slot-tile-out {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  visibility: hidden;
  pointer-events: none;
}
.letter-grid--pre-intro {
  opacity: 0;
  pointer-events: none;
}
</style>
