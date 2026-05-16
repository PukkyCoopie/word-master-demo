<template>
  <div class="game-container">
    <Teleport defer to="#game-view-portal">
      <div v-if="showShop" class="portal-overlay-fill shop-portal-root" :style="shopPortalStackStyle">
        <ShopPanel
          ref="shopPanelRef"
          :wallet-amount="walletHeaderShown"
          :shop-offers="shopOffers"
          :pack-offers="packOffers"
          :voucher-slot="shopVoucherShelfResolved"
          :owned-voucher-ids="ownedVoucherIds"
          :owned-treasures="ownedTreasures"
          :shop-reroll-cost="shopNextRerollCostDisplay"
          :can-shop-reroll="shopCanReroll"
          :interactions-disabled="shopUpgradeAnimating || packPickBusy || !!packPickSession"
          :treasure-charge-by-slot="treasureChargeVisualBySlot"
          :treasure-charge-progress-by-slot="treasureChargeProgressBySlot"
          @view-deck="showDeckLayer = true"
          @view-round-info="showInfoLayer = true"
          @next-level="onShopNextLevel"
          @shop-reroll="onShopReroll"
          @select-offer="onShopSelectOffer"
          @select-pack-offer="onShopSelectPackOffer"
          @select-voucher="onShopSelectPackOffer"
          @select-owned="onShopSelectOwned"
          @reorder-owned="onShopReorderOwned"
          @upgrade-interaction-unlock="shopUpgradeAnimating = false"
        />
      </div>
    </Teleport>

    <!-- 牌库浮层：Teleport 到 portal，z-index 由 overlayStack 按出现顺序递增 -->
    <Teleport defer to="#game-view-portal">
      <Transition name="deck-layer">
        <div
          v-show="showDeckLayer"
          class="deck-layer portal-overlay-fill"
          :style="deckPortalStackStyle"
          @click.self="onDeckLayerBackdropClick"
        >
        <div class="deck-layer-inner">
          <div class="deck-layer-title">牌库</div>
          <div class="deck-layer-grid-slot">
            <div class="deck-layer-stacks">
              <button
                v-for="stack in deckStacksView"
                :key="stack.raw"
                type="button"
                class="deck-stack"
                :class="{ 'deck-stack--ghost': stack.isGhost }"
                :disabled="stack.isGhost"
                :aria-label="stack.isGhost ? `${stack.displayLetter} 无牌` : `${stack.displayLetter}，共 ${stack.count} 张`"
                @click="openDeckStackDetail(stack, $event)"
              >
                <span class="deck-stack-count" aria-hidden="true">{{ stack.count }}</span>
                <div v-if="!stack.isGhost" class="deck-stack-pile" aria-hidden="true">
                  <div
                    v-for="(entry, idx) in stack.entries"
                    :key="deckEntryKey(entry, idx)"
                    class="deck-stack-pile-cell"
                    :style="deckStackPileCellStyle(stack, idx)"
                  >
                    <LetterTile
                      v-if="deckEntryTileProps(entry)"
                      variant="grid"
                      class="deck-stack-pile-tile"
                      v-bind="deckEntryTileProps(entry)"
                    />
                  </div>
                </div>
                <div v-else class="deck-stack-ghost-face" aria-hidden="true">
                  <span class="deck-stack-ghost-char">{{ stack.displayLetter }}</span>
                </div>
              </button>
            </div>
          </div>
          <Transition name="deck-stack-expand">
            <div
              v-if="deckStackExpandRaw != null && deckExpandedStack"
              class="deck-stack-expand-layer"
              :style="deckExpandPortalStackStyle"
              role="dialog"
              aria-modal="true"
              aria-labelledby="deck-stack-expand-heading"
              @click.self="closeDeckStackDetail"
            >
              <div class="deck-stack-expand-toolbar" @click.stop>
                <button type="button" class="shop-btn shop-btn--next deck-stack-expand-back" @click="closeDeckStackDetail">
                  返回
                </button>
                <span id="deck-stack-expand-heading" class="deck-stack-expand-sr-title">{{
                  `「${deckExpandedStack.displayLetter}」${deckExpandedStack.count} 张`
                }}</span>
              </div>
              <div ref="deckExpandScrollRef" class="deck-stack-expand-scroll" @click.stop>
                <template v-for="(entry, idx) in deckExpandedStack.entries" :key="deckEntryKey(entry, idx)">
                  <div
                    v-if="deckEntryTileProps(entry)"
                    class="deck-expand-tile-hit"
                    @click.stop="onDeckExpandedTileClick(entry, $event)"
                    @contextmenu.prevent.stop="onDeckExpandedTileContextMenu($event, entry)"
                    @pointerdown="onDeckExpandedTileDetailPointerDown($event, entry)"
                  >
                    <LetterTile variant="grid" class="deck-expand-face-tile" v-bind="deckEntryTileProps(entry)" />
                  </div>
                </template>
              </div>
            </div>
          </Transition>
          <button type="button" class="shop-btn shop-btn--buy deck-layer-confirm" @click="showDeckLayer = false">
            确定
          </button>
        </div>
      </div>
    </Transition>
    </Teleport>

    <TreasureDetailLayer
      v-if="treasureDetail"
      ref="treasureDetailLayerRef"
      :treasure="treasureDetail.treasure"
      :description-override="treasureDetailDescriptionOverride"
      :charge-visual-state="treasureDetailChargeVisualState"
      :charge-progress="treasureDetailChargeProgress"
      :mode="treasureDetailMode"
      :wallet-amount="walletHeaderShown"
      :sell-refund="treasureSellRefund"
      :can-buy-offer="treasureCanBuyOffer"
      :origin-rect="treasureDetail.originRect ?? null"
      :owned-voucher-ids="ownedVoucherIds"
      :spell-replay-target-spell-id="lastReplayableSpellId"
      @close="treasureDetail = null"
      @purchase="onTreasurePurchase"
      @sell="onTreasureSell"
    />
    <PackPickLayer
      v-if="packPickSession"
      ref="packPickLayerRef"
      :session="packPickSession"
      :wallet-amount="walletHeaderShown"
      :disabled="packPickBusy"
      @confirm="onPackPickConfirm"
      @cancel="onPackPickCancel"
    />
    <SpellTargetLayer
      v-if="spellTargetSession"
      ref="spellTargetLayerRef"
      :session="spellTargetSession"
      @confirm="onSpellTargetConfirm"
      @cancel="onSpellTargetCancel"
    />
    <TileDetailLayer
      v-if="tileDetailPayload"
      :payload="tileDetailPayload"
      :origin-rect="tileDetailOriginRect"
      :rarity-levels-by-rarity="rarityLevelsByRarity"
      @close="closeTileDetail"
    />
    <Teleport defer to="#game-view-portal">
      <div v-if="dictFatalError" class="dict-fatal-layer portal-overlay-fill" :style="dictFatalPortalStackStyle">
        <div class="dict-fatal-card">
          <div class="dict-fatal-title">词典加载失败</div>
          <div class="dict-fatal-message">{{ dictError || "无法加载词典，请检查资源后重试。" }}</div>
          <button type="button" class="dict-fatal-btn" @click="reloadPage">刷新重试</button>
        </div>
      </div>
    </Teleport>

    <template v-if="!showShop">
    <div class="top-area">
      <div class="header">
        <div ref="levelTitleBoxRef" class="header-box header-box-level-title">{{ levelTitleLabel }}</div>
        <div
          class="header-box header-box-split header-box-reward-dollars"
          :title="`本关通关基础奖励 ${stageRewardYuan} 元`"
        >
          <span class="header-split-label">奖励</span>
          <span class="header-reward-marks">{{ rewardDollarMarks }}</span>
        </div>
        <div class="header-box header-box-split header-box-wallet" title="当前钱包余额">
          <span class="header-split-label">钱包</span>
          <span ref="headerWalletMarksRef" class="header-wallet-marks">
            <span class="money-dollar-char">$</span
            ><span class="header-wallet-amount">{{ formatNum(walletHeaderShown) }}</span>
          </span>
        </div>
      </div>
      <div class="scores">
        <div class="score-card score-target">
          <div class="score-label">至少得分</div>
          <div class="score-value">{{ formatNum(targetScore) }}</div>
        </div>
        <div class="score-card score-round">
          <div class="score-label">回合分数</div>
          <div class="score-value">{{ formatNum(roundScoreOverride ?? currentScore) }}</div>
        </div>
      </div>
      <div
        v-if="bossStripDef"
        class="boss-tape"
        :class="{
          'boss-tape--soft-preview': bossTapeSoftPreview,
          'boss-tape--attention': bossTapeAttentionPulse,
          'boss-tape--wobble': bossTapeWobble,
        }"
      >
        <div class="boss-tape-title">{{ bossStripDef.nameZh }}</div>
        <div class="boss-tape-desc">{{ bossTapeSubLine }}</div>
      </div>
      <ResultArea
        ref="gameResultAreaRef"
        :show-total-bar="showResultTotalBar && !clearWinLengthUpgradeFxActive && !lastSubmitRarityFxActive"
        :total-text="resultTotalShown"
        :show-word-length="showResultWordLength"
        :word-length-text="resultWordLengthShown"
        :word-level="resultWordLengthLevel"
        :score-text="displayFormulaScore"
        :mult-text="displayFormulaMult"
      />
    </div>

    <div class="middle-area">
      <div class="middle-word-stack">
        <div ref="wordSlotsWrapRef" class="word-slots-wrap">
        <div ref="wordSlotsScaleRootRef" class="word-slots">
          <div
            v-for="(entry, i) in wordSlotTilePresentations"
            :key="`w-${entry.id}-${i}`"
            :ref="el => setWordSlotRef(i, el)"
            :class="[
              'word-slot-tile',
              entry.letter === 'Qu' ? 'letter-qu' : '',
              { 'word-slot-tile-out': isSlotOutOfFlow(i), 'word-slot-scoring-highlight': scoringLetterIndex === i },
            ]"
            @click="onSlotClick(i)"
            @contextmenu.prevent.stop="onWordSlotContextMenu($event, i)"
            @pointerdown="onWordSlotDetailPointerDown($event, i)"
          >
            <div class="word-slot-placeholder" aria-hidden="true"></div>
            <LetterTile
              variant="wordSlotContent"
              :letter="entry.letter"
              :rarity="entry.rarity"
              :material-id="entry.materialId ?? null"
              :accessory-id="entry.accessoryId ?? null"
              :tile-score-bonus="Number(entry.tileScoreBonus) || 0"
              :tile-mult-bonus="Number(entry.letterMultBonus) || 0"
              :content-hidden="isSlotContentHidden(i)"
              :cerulean-bell-locked="entry.ceruleanBellLocked === true"
            />
          </div>
        </div>
        </div>
        <div
          v-if="SHOW_SUBMIT_TRANSLATION"
          ref="wordTranslationWrapRef"
          class="word-translation-wrap"
        >
          <div
            v-if="submitTranslationLines.length"
            ref="wordTranslationInnerRef"
            class="word-translation-inner"
          >
            <div
              v-for="(line, idx) in submitTranslationLines"
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
      <div class="treasure-slots-ctn" aria-label="宝藏槽位">
        <TransitionGroup
          name="treasure-slot-reorder"
          tag="div"
          :class="['treasure-slots', { 'treasure-slots--dragging': gameOwnedDragActive }]"
        >
          <TreasureSlot
            v-for="(slot, i) in displayOwnedTreasures"
            :key="displayOwnedTreasureKeys[i]"
            :ref="(el) => setGameTreasureSlotRef(i, el)"
            :treasure="slot"
            :gem-class="treasureGemClass(slot?.rarity)"
            :charge-state="displayTreasureChargeVisualBySlot[i]"
            :charge-progress="displayTreasureChargeProgressBySlot[i] ?? 0"
            :amber-boss-mask="activeBossSlug === 'amber_acorn'"
            :crimson-hand-disabled="activeBossSlug === 'crimson_heart' && scoringAnimating && crimsonTreasureDisabledSlotIndex === i"
            :slot-class="{
              'treasure-slot--scoring-highlight': scoringTreasureBarIndex === i,
              'treasure-slot--dragging': gameOwnedDragActive && i === gameOwnedDragCurrentIndex,
            }"
            draggable="true"
            @dragstart="onGameOwnedDragStart(i, $event)"
            @dragover="onGameOwnedDragOver(i, $event)"
            @drop="onGameOwnedDrop(i, $event)"
            @dragend="onGameOwnedDragEnd"
            @click="onGameOwnedSlotClick(i, slot, $event)"
          />
        </TransitionGroup>
      </div>
      <div class="bottom-bar">
        <div class="side-buttons">
          <button
            type="button"
            class="icon-btn icon-btn-white"
            title="信息"
            aria-label="信息"
            :disabled="showSettlement"
            @click="!showSettlement && (showInfoLayer = true)"
          >
            <i class="ri-information-line"></i>
          </button>
          <button type="button" class="icon-btn icon-btn-yellow" title="设置" aria-label="设置">
            <i class="ri-settings-3-line"></i>
          </button>
        </div>
        <div class="letter-grid-area">
          <div class="letter-grid-wrap">
            <div ref="letterGridRef" class="letter-grid" :class="{ 'letter-grid--pre-intro': !gridIntroDone, 'letter-grid--manacle': isManacleBossGrid }">
            <template v-for="(tile, index) in flatGrid" :key="tile ? tile.id : `void-${index}`">
              <LetterTile
                v-if="tile"
                variant="grid"
                :letter="gridTileLetterForRender.get(tile.id) ?? tile.letter"
                :rarity="gridTileRarityForRender.get(tile.id) ?? tile.rarity"
                :material-id="tile.materialId ?? null"
                :accessory-id="tile.accessoryId ?? null"
                :tile-score-bonus="Number(tile.tileScoreBonus) || 0"
                :tile-mult-bonus="Number(tile.letterMultBonus) || 0"
                :boss-grid-blocked="tile.bossGridBlocked === true"
                :boss-tile-debuffed="tile.bossTileDebuffed === true"
                :cerulean-bell-locked="tile.ceruleanBellLocked === true"
                :ref="el => setGridTileRef(index, el)"
                :class="{ selected: tile.selected, 'tile-flying': isTileFlying(Math.floor(index / COLS), index % COLS) }"
                role="button"
                tabindex="0"
                @click="onTileClick(Math.floor(index / COLS), index % COLS, tile)"
                @contextmenu.prevent.stop="
                  onGridTileContextMenu($event, Math.floor(index / COLS), index % COLS, tile)
                "
                @pointerdown="onGridTileDetailPointerDown($event, Math.floor(index / COLS), index % COLS, tile)"
              />
              <div v-else class="letter-grid-cell--void" aria-hidden="true" />
            </template>
          </div>
        </div>
        <button
          type="button"
          class="deck-btn"
          title="牌库"
          aria-label="牌库"
          :disabled="showSettlement"
          @click="!showSettlement && (showDeckLayer = true)"
        >
            <i class="ri-stack-line deck-btn-icon"></i>
            <span class="deck-btn-count">{{ deckCount }}</span>
          </button>
        </div>
        <div class="action-buttons">
          <div class="action-bookmark">
            <button
              type="button"
              class="action-btn action-btn-green"
              :class="{ 'action-btn-disabled': !canSubmit || scoringAnimating || gridRefillAnimating }"
              title="提交"
              @click="canSubmit && !scoringAnimating && !gridRefillAnimating && flyingLetters.length === 0 && flyingBackBatches.length === 0 ? submitWord() : null"
            >
              <i class="ri-check-line action-icon"></i>
            </button>
            <div class="action-label-wrap">
              <span class="action-label action-label-green">{{ remainingWords }}</span>
              <span
                v-if="submitDeltaKey > 0"
                :key="submitDeltaKey"
                class="action-count-delta action-count-delta-green"
                aria-hidden="true"
              >-1</span>
            </div>
          </div>
          <div class="action-bookmark">
            <button
              type="button"
              class="action-btn action-btn-red"
              :class="{ 'action-btn-disabled': !canRemove }"
              title="移除选中的字母（先选字再点）"
              @click="canRemove ? onRemoveClick() : null"
            >
              <i class="ri-delete-bin-line action-icon"></i>
            </button>
            <div class="action-label-wrap">
              <span class="action-label action-label-red">{{ remainingRemovals }}</span>
              <span
                v-if="removalDeltaKey > 0"
                :key="removalDeltaKey"
                class="action-count-delta action-count-delta-red"
                aria-hidden="true"
              >-1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </template>

    <!-- 飞字挂到 body，避免受 .game-scaler 的 transform:scale 影响，getBoundingClientRect 与 position:fixed 坐标系一致 -->
    <Teleport to="body">
      <!-- v-memo：列表追加时不要用新 :style 对象去重绘已在飞的项，否则会写回 fromRect 顶掉 GSAP 的 left/top（快速连点闪烁） -->
      <LetterTile
        v-for="fly in flyingLetters"
        :key="fly.id"
        v-memo="[fly.id]"
        variant="fly"
        :letter="fly.letter"
        :rarity="fly.rarity"
        :material-id="fly.materialId ?? null"
        :accessory-id="fly.accessoryId ?? null"
        :ref="el => setFlyingInRef(fly, el)"
      />
    </Teleport>

    <Teleport defer to="#game-view-portal">
      <Transition name="settle-layer" :css="!disableSettlementLayerAnim">
        <div
          v-if="showSettlement"
          class="stage-settlement-layer portal-overlay-fill"
          :style="settlementPortalStackStyle"
          aria-modal="true"
          role="dialog"
          aria-labelledby="settlement-title"
        >
          <div ref="settlementCardRef" class="stage-settlement-card">
            <h2 id="settlement-title" class="stage-settlement-title">关卡完成</h2>
            <p class="stage-settlement-sub">得分已达标，获得以下金币</p>
            <div class="stage-settlement-rows">
              <div
                class="settle-row"
                :class="{ 'settle-row--empty': settlementRowEmpty.clear }"
                :ref="(el) => setSettlementRowRef(0, el)"
              >
                <span class="settle-label">关卡奖励</span>
                <span class="settle-value settle-dollars">{{ dollarMarks(animSettleClear) }}</span>
              </div>
              <div
                class="settle-row"
                :class="{ 'settle-row--empty': settlementRowEmpty.spare }"
                :ref="(el) => setSettlementRowRef(1, el)"
              >
                <span class="settle-label">剩余次数</span>
                <span class="settle-value settle-dollars">{{ dollarMarks(animSettleSpare) }}</span>
              </div>
              <div
                class="settle-row"
                :class="{ 'settle-row--empty': settlementRowEmpty.interest }"
                :ref="(el) => setSettlementRowRef(2, el)"
              >
                <span class="settle-label">利息</span>
                <span class="settle-value settle-dollars">{{ dollarMarks(animSettleInterest) }}</span>
              </div>
              <div
                class="settle-row settle-row-total"
                :class="{ 'settle-row--empty': settlementRowEmpty.total }"
                :ref="(el) => setSettlementRowRef(3, el)"
              >
                <span class="settle-label">本关共计</span>
                <span class="settle-value settle-dollars settle-total">{{ dollarMarks(animSettleTotal) }}</span>
              </div>
            </div>
            <button
              ref="settlementContinueBtnRef"
              type="button"
              class="stage-settlement-btn"
              :disabled="!settlementContinueEnabled"
              @click="onSettlementContinue"
            >
              继续
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <div v-if="toast" class="toast" :style="toastPortalStackStyle">{{ toast }}</div>
    </Teleport>

    <Teleport defer to="#game-view-portal">
      <InfoModal
        v-if="showInfoLayer"
        v-model="showInfoLayer"
        :spell-counts="spellCountsByLength"
        :length-levels="lengthLevelsByLength"
        :rarity-levels="rarityLevelsByRarity"
        :owned-voucher-ids="ownedVoucherIds"
      />
    </Teleport>
  </div>
</template>

<script setup>
/**
 * 动画约定：位移/尺寸/缩放/旋转统一 EASE_TRANSFORM（expo.out），见 src/constants.js 与 .cursor/rules/animation-easing.mdc
 */
import { computed, inject, ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import gsap from "gsap";
import {
  EASE_TRANSFORM,
  EASE_GRID_GRAVITY_Y,
  EASE_GRID_LINEAR,
  computeWalletInterest,
  computeShopRerollCost,
} from "../constants";
import {
  TREASURE_DEFINITIONS,
  getTreasureDef,
  TREASURE_HOOKS_BY_ID,
  notifyOwnedTreasuresSuccessfulWordSubmit,
  resolveTreasureChargeProgress,
  resolveTreasureChargeVisualState,
} from "../treasures/treasureRegistry.js";
import { IMPLEMENTED_TREASURE_ID_SET } from "../treasures/treasureCatalog.js";
import { computeOwnedTreasureSlotTargetLength } from "../game/treasureSlotCapacity.js";
import { computeWordScoreDetailedForSubmit } from "../treasures/treasureScoring.js";
import { normalizeTreasureDescription } from "../treasures/treasureDescription.js";
import { rollDistinctShopTreasures } from "../treasures/shopTreasureRoll.js";
import { getShopTreasureAccessoryPriceAdd, rollShopTreasureAccessoryId } from "../treasures/shopTreasureAccessoryRoll.js";
import { LEVELS, LEVEL_COUNT, resolveLevelTargetScore } from "../levelDefinitions";
import { pickBossSlugForLevel } from "../game/bossRoll.js";
import { getBossDef } from "../game/bossBlindDefinitions.js";
import {
  BOSS_CLUB_POS_OPTIONS,
  evaluateBossSoftWordViolation,
  nextMouthLockedLengthAfterSubmit,
} from "../game/bossWordViolation.js";
import { useGameState, MAX_LETTERS_PER_REMOVAL, deckCardRaw } from "../composables/useGameState";
import {
  applySpell,
  tileLetterToRaw,
  getSpellTileAppearanceTargets,
  buildSpellAnimPickTargetsFromOrdered,
} from "../spells/spellRuntime.js";
import {
  runSpellTileAppearanceAnim,
  cloneGridDeep,
  diffGridAppearanceTargets,
  restoreGridFromDeepClone,
} from "../game/spellTileAppearanceAnim.js";
import {
  SPELL_DEFINITIONS,
  SPELL_CANDIDATE_TILE_CAP,
  resolveSpellPickCount,
  getSpellDefinition,
} from "../spells/spellDefinitions.js";
import { rollPackOfferStock } from "../shop/rollPackStock.js";
import { rollShopRandomCardOffers } from "../shop/rollShopRandomCardStock.js";
import { formatVoucherDisplayName } from "../vouchers/voucherDisplay.js";
import { pairHasTier2Owned } from "../vouchers/voucherDefinitions.js";
import { rollShopVoucherOfferDef } from "../vouchers/voucherRegistry.js";
import {
  applyShopDiscountPrice,
  getBaseHandsPerLevel,
  getBaseRemovalsPerLevel,
  getSubmitHandsForNeedleBoss,
  getEconomyInterestCap,
  getEffectiveShopRerollCost,
  getGlyphPurchaseTargetLevelIndex,
  getJudgedLengthTableLenForOwnedVouchers,
  getObservatoryLengthMultFactor,
  getOwnedTreasureSlotBonusFromVouchers,
  getRemovalLetterCapBonus,
  getShopAccessoryChanceMultiplier,
  getWordLengthJudgmentBonus,
  parseMajorFromLevelId,
} from "../vouchers/voucherRuntime.js";
import { useDictionary } from "../composables/useDictionary";
import {
  getBaseScoreForRarity,
  getBaseScorePerLetterForWordLength,
  getLengthMultiplier,
  getRarityForLetter,
  isWildcardMaterialTile,
  LETTER_RARITY_ORDER,
  withWildcardsResolvedForScoring,
} from "../composables/useScoring";
import {
  TILE_ACCESSORY_COIN,
  TILE_ACCESSORY_LEVEL_UPGRADE,
  TILE_ACCESSORY_REWIND,
  TILE_ACCESSORY_VIP_DIAMOND,
} from "../game/tileAccessories";
import {
  buildGridPresencePostLetterSteps,
  gridTileEntranceDelayKey,
  gridSelectedPositionKeySet,
} from "../game/gridOnlyMaterialScoring.js";
import { runClearWinLengthUpgradeShopLikeFx } from "../utils/runClearWinLengthUpgradeShopLikeFx";
import { runInGameRarityUpgradeShopLikeFx } from "../utils/runInGameRarityUpgradeShopLikeFx";
import LetterTile from "./LetterTile.vue";
import InfoModal from "./InfoModal.vue";
import ShopPanel from "./ShopPanel.vue";
import PackPickLayer from "./PackPickLayer.vue";
import TreasureDetailLayer from "./TreasureDetailLayer.vue";
import SpellTargetLayer from "./SpellTargetLayer.vue";
import TileDetailLayer from "./TileDetailLayer.vue";
import TreasureSlot from "./TreasureSlot.vue";
import ResultArea from "./ResultArea.vue";
import { createFlyBackTileElement, disposeFlyBackTileElement } from "../utils/letterTileFlyBack.js";
import { bumpOverlayZ } from "../game/overlayStack.js";

/** 提交时是否展示词典释义；暂时关闭，后续可改回 true 恢复 */
const SHOW_SUBMIT_TRANSLATION = false;

const {
  getWordDefinition,
  loadDictionary,
  resolveWordPattern,
  dictionaryReady,
  error: dictError,
} =
  useDictionary();
const toast = ref("");
const dictFatalError = computed(() => !!dictError.value && !dictionaryReady.value);

/** @type {import('vue').Ref<string[]>} */
const ownedVoucherIds = ref([]);

const shopPortalZ = ref(0);
const deckPortalZ = ref(0);
const deckExpandPortalZ = ref(0);
const dictFatalPortalZ = ref(0);
const settlementPortalZ = ref(0);
const toastPortalZ = ref(0);

const shopPortalStackStyle = computed(() => (shopPortalZ.value > 0 ? { zIndex: shopPortalZ.value } : undefined));
const deckPortalStackStyle = computed(() => (deckPortalZ.value > 0 ? { zIndex: deckPortalZ.value } : undefined));
const deckExpandPortalStackStyle = computed(() =>
  deckExpandPortalZ.value > 0 ? { zIndex: deckExpandPortalZ.value } : undefined,
);
const dictFatalPortalStackStyle = computed(() =>
  dictFatalPortalZ.value > 0 ? { zIndex: dictFatalPortalZ.value } : undefined,
);
const settlementPortalStackStyle = computed(() =>
  settlementPortalZ.value > 0 ? { zIndex: settlementPortalZ.value } : undefined,
);
const toastPortalStackStyle = computed(() => (toastPortalZ.value > 0 ? { zIndex: toastPortalZ.value } : undefined));

watch(dictFatalError, (v) => {
  if (v) dictFatalPortalZ.value = bumpOverlayZ();
}, { immediate: true });

function reloadPage() {
  window.location.reload();
}

/** 次数 -1 动效：与下方 CSS `actionCountDeltaPop` 时长一致（约 0.92s） */
const ACTION_COUNT_DELTA_ANIM_MS = 920;
/** 动效在总时间轴上占一拍，之后再进入记分 / 棋盘下落 */
const ACTION_COUNT_DELTA_BEAT_MS = 400;

/** 记分步间等待、气泡延迟等统一再 ×0.7（比上一版缩短 30%） */
const SCORING_GAP_SCALE = 0.7;
/** 每个 letter / treasure 气泡与 wobble 后的间隔（原 270×1.2，再缩短 30%） */
const SCORING_STEP_BEAT_MS = Math.round(270 * 1.2 * SCORING_GAP_SCALE);
/** 同一槽位两步之间、切下一字母前短休（原 50×1.2，再缩短 30%） */
const SCORING_LETTER_GAP_MS = Math.round(50 * 1.2 * SCORING_GAP_SCALE);
/** 额外整轮记分前：宝藏 wobble 结束后再休一拍，与「字母 → 下一字母」间隔相同（避免比字母间空档长一截） */
const SCORING_EXTRA_LETTER_PASS_GAP_MS = SCORING_LETTER_GAP_MS;
/** 宝藏槽 ref 未就绪时的替代停顿（原 200×1.2，再缩短 30%） */
const SCORING_TREASURE_FALLBACK_MS = Math.round(200 * 1.2 * SCORING_GAP_SCALE);

/**
 * 提交记分动画节奏：
 * - 总拍数较多时，用次曲线提高「起步倍速」（上限 2×），避免全靠后期每拍累加才变快。
 * - 仍保留随 beatIndex 递增的倍速，但略弱于旧版，且总拍数越多每拍贡献越小（另有上限）。
 * - 最终倍速有全局上限（与旧版上限量级一致）。
 */
const SUBMIT_SCORING_LENGTH_BASE_MAX = 2;
/** 越大则总长基速越慢地贴近上限（次线性：1 - exp(-span/τ)） */
const SUBMIT_SCORING_LENGTH_TAU_BEATS = 18;
const SUBMIT_SCORING_RAMP_PER_BEAT = 0.062;
/** 总拍数阻尼：total/ref 越大，每拍递增量越小 */
const SUBMIT_SCORING_RAMP_DAMP_REF_BEATS = 12;
const SUBMIT_SCORING_RAMP_DAMP_EXP = 0.42;
/** 仅「递增段」的倍率上限（再与长度基速相乘） */
const SUBMIT_SCORING_RAMP_MULT_MAX = 1.82;
const SUBMIT_SCORING_SPEED_GLOBAL_MAX = 3;
/** 总拍数低于此不做加速，短词保持原节奏 */
const SUBMIT_SCORING_SPEEDUP_MIN_TOTAL_BEATS = 6;

/** 与 wobbleScoreSlot 内「缩小 + 放大」两段时长一致（秒） */
const WOBBLE_SCALE_COMPRESS_S = 0.11;
const WOBBLE_SCALE_EXPAND_S = 0.15;
/** 缩小目标 scale（越大 = 缩得越少） */
const WOBBLE_SCALE_COMPRESS_TO = 0.78;
/** ±分/倍率小气泡：缩小→放大进程到 80% 后再出现（间隔同比缩短 30%） */
const SCORING_BUBBLE_POP_DELAY_MS = Math.round(
  (WOBBLE_SCALE_COMPRESS_S + WOBBLE_SCALE_EXPAND_S) * 0.8 * 1000 * SCORING_GAP_SCALE,
);

/** 小 +n / +分 气泡：scale 50%→100% 入场；淡出前多停一会（不延长各步 await） */
const PLUS_BUBBLE_ENTER_DURATION_S = 0.14;
const PLUS_BUBBLE_OUTRO_DELAY_S = 0.48;
const PLUS_BUBBLE_OUTRO_DURATION_S = 0.42;
const PLUS_BUBBLE_OUTRO_SCALE = 0.5;

/** 记分区数字「先瞬间放大再缓落回 1」：峰值倍率 / 回落时长（秒） */
const VALUE_NUM_PULSE_PEAK_SCALE = 1.42;
const VALUE_NUM_PULSE_SHRINK_S = 0.5;

/** 剩余次数旁显示「-1」提示 */
const submitDeltaKey = ref(0);
const removalDeltaKey = ref(0);
let submitDeltaClearTimer = null;
let removalDeltaClearTimer = null;

function flashSubmitCountDelta() {
  submitDeltaKey.value += 1;
  const cur = submitDeltaKey.value;
  if (submitDeltaClearTimer) clearTimeout(submitDeltaClearTimer);
  submitDeltaClearTimer = setTimeout(() => {
    if (submitDeltaKey.value === cur) submitDeltaKey.value = 0;
    submitDeltaClearTimer = null;
  }, ACTION_COUNT_DELTA_ANIM_MS + 120);
}

function flashRemovalCountDelta() {
  removalDeltaKey.value += 1;
  const cur = removalDeltaKey.value;
  if (removalDeltaClearTimer) clearTimeout(removalDeltaClearTimer);
  removalDeltaClearTimer = setTimeout(() => {
    if (removalDeltaKey.value === cur) removalDeltaKey.value = 0;
    removalDeltaClearTimer = null;
  }, ACTION_COUNT_DELTA_ANIM_MS + 120);
}

function countActivePostLetterTreasureSteps(postSteps) {
  let c = 0;
  for (const step of postSteps ?? []) {
    const multAdd = Number(step.multAdd) || 0;
    const scoreAdd = Number(step.scoreAdd) || 0;
    const multMul = Number(step.multMul) || 0;
    const moneyAdd = Number(step.moneyAdd) || 0;
    if (multAdd <= 0 && scoreAdd <= 0 && multMul <= 1 && moneyAdd <= 0) continue;
    c += 1;
  }
  return c;
}

/** 用于渐进加速：逐字母步 + 额外轮前 cue + 字后宝藏步 */
function getSubmitScoringTotalBeats(detailed) {
  const n = detailed.letterParts?.length ?? 0;
  const letterPassCount = Math.max(1, Math.round(Number(detailed.letterScoringPassCount)) || 1);
  const post = countActivePostLetterTreasureSteps(detailed.postLetterTreasureSteps);
  const extraCues = Math.max(0, letterPassCount - 1);
  const replayExtra = (detailed.letterReplayExtraCounts ?? []).reduce(
    (s, v) => s + Math.max(0, Math.floor(Number(v) || 0)),
    0,
  );
  return letterPassCount * n + replayExtra + extraCues + post;
}

function getSubmitScoringLengthBaseSpeed(totalBeats) {
  if (totalBeats < SUBMIT_SCORING_SPEEDUP_MIN_TOTAL_BEATS) return 1;
  const span = totalBeats - SUBMIT_SCORING_SPEEDUP_MIN_TOTAL_BEATS;
  const t = 1 - Math.exp(-span / SUBMIT_SCORING_LENGTH_TAU_BEATS);
  return 1 + (SUBMIT_SCORING_LENGTH_BASE_MAX - 1) * t;
}

function getSubmitScoringRampFactor(beatIndex, totalBeats) {
  if (totalBeats < SUBMIT_SCORING_SPEEDUP_MIN_TOTAL_BEATS) return 1;
  const ref = SUBMIT_SCORING_RAMP_DAMP_REF_BEATS;
  const damp =
    1 /
    Math.pow(
      Math.max(SUBMIT_SCORING_SPEEDUP_MIN_TOTAL_BEATS, totalBeats) / ref,
      SUBMIT_SCORING_RAMP_DAMP_EXP,
    );
  const mult = 1 + SUBMIT_SCORING_RAMP_PER_BEAT * damp * Math.max(0, beatIndex);
  return Math.min(SUBMIT_SCORING_RAMP_MULT_MAX, mult);
}

function getSubmitScoringBeatSpeed(beatIndex, totalBeats) {
  const base = getSubmitScoringLengthBaseSpeed(totalBeats);
  const ramp = getSubmitScoringRampFactor(beatIndex, totalBeats);
  const s = base * ramp;
  return Math.min(SUBMIT_SCORING_SPEED_GLOBAL_MAX, Math.max(0.35, s));
}

async function scoringSleep(ms, speed) {
  const s = Math.max(0.01, Number(speed) || 1);
  return sleep(Math.max(1, Math.round(ms / s)));
}

const {
  grid,
  deck,
  deckCount,
  deckStacksView,
  remainingWords,
  remainingRemovals,
  currentScore,
  targetScore,
  activeBossSlug,
  selectedOrder,
  ceruleanBellSlotIndex,
  selectedTiles,
  selectTile,
  removeFromSlot,
  setLastWordFromSubmit,
  applySubmitRefill,
  applyCeruleanBellAfterGridStable,
  removeSelectedLetters,
  consumeIceTileOnGrid,
  snapshotGridCellsByTileId,
  resetLevel,
  resetDeckAfterStageEnd,
  touchGrid,
  removeDeckLetterInstancesByRaws,
  remapTileFromRawLetter,
  markTileAsWildcard,
  refreshGridTileBaseScoresFromLevels,
  appendShopDeckEntries,
  spellCountsByLength,
  recordSpellWordLength,
  lengthLevelsByLength,
  setWordLengthLevel,
  rarityLevelsByRarity,
  setRarityLevel,
  basketballWordsSubmitted,
  bumpBasketballWordSubmitted,
  ROWS,
  COLS,
} = useGameState({ ownedVoucherIdsRef: ownedVoucherIds });

/**
 * 供宝藏「结算后改棋盘」：随机非万能有字格变为万能块；
 * 动效与法术弹层确认后写回棋盘一致（`runSpellTileAppearanceAnim`，spellId 同「点亮」）。
 */
async function mutateRandomNonWildcardLetterTileToWildcard() {
  const g = grid.value;
  /** @type {{ row: number, col: number }[]} */
  const candidates = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = g[r]?.[c];
      if (!tile?.letter) continue;
      if (isWildcardMaterialTile(tile)) continue;
      candidates.push({ row: r, col: c });
    }
  }
  if (!candidates.length) return;
  const { row, col } = candidates[Math.floor(Math.random() * candidates.length)];
  const oldSnap = cloneGridTileSnapshot(g[row][col]);
  const draft = cloneGridTileSnapshot(g[row][col]);
  if (!oldSnap || !draft) return;
  markTileAsWildcard(draft);
  await queueOrRunSpellTileAppearanceAnim({
    spellId: "lightbulb",
    targets: [{ row, col }],
    oldSnaps: [oldSnap],
    newSnaps: [draft],
    grid,
    touchGrid,
    getTileEl: (r, c) => getGridTileElByIndex(r * COLS + c),
    nextTick,
  });
}

const showInfoLayer = ref(false);

/** 字母块详情（右键 / 长按） */
const tileDetailPayload = ref(null);
const tileDetailOriginRect = ref(/** @type {{ left: number, top: number, width: number, height: number } | null} */ (null));
const suppressTilePrimaryClick = ref(false);

const levelIndex = ref(0);

/** Boss 关：独口锁定长度、冷眼已用长度、棘梅词性、残柱牌张 uid、苍翠是否已卖藏 */
const usedWordLengthsThisBoss = ref(/** @type {Set<number>} */ (new Set()));
const mouthLockedLengthBoss = ref(/** @type {number | null} */ (null));
const clubRequiredKeyBoss = ref(/** @type {string | null} */ (null));
const pillarUsedDeckUids = ref(/** @type {Set<number>} */ (new Set()));
const verdantTreasureSold = ref(false);
const bossRunSeed = ref(90210);
const crimsonTreasureDisabledSlotIndex = ref(/** @type {number | null} */ (null));
const bossTapeAttentionPulse = ref(false);
const bossTapeWobble = ref(false);

const isManacleBossGrid = computed(() => activeBossSlug.value === "the_manacle");

const bossStripDef = computed(() => {
  const slug = activeBossSlug.value;
  return slug ? getBossDef(slug) : null;
});

const bossTapeSubLine = computed(() => {
  const d = bossStripDef.value;
  if (!d) return "";
  if (d.slug === "the_club" && clubRequiredKeyBoss.value) {
    const opt = BOSS_CLUB_POS_OPTIONS.find((o) => o.key === clubRequiredKeyBoss.value);
    return opt ? `本关要求：${opt.labelZh}` : d.uiDescription;
  }
  if (d.slug === "the_mouth" && mouthLockedLengthBoss.value != null) {
    return `固定长度：${mouthLockedLengthBoss.value}`;
  }
  return d.uiDescription;
});

function parseLevelSubFromId(levelId) {
  const p = String(levelId ?? "").split("-");
  return Math.max(1, Math.min(3, Math.floor(Number(p[1])) || 1));
}

function pickClubRequiredKey() {
  const opts = [...BOSS_CLUB_POS_OPTIONS];
  return opts[Math.floor(Math.random() * opts.length)]?.key ?? "n";
}

function gridTileRawLower(tile) {
  const L = String(tile?.letter ?? "").trim().toLowerCase();
  if (!L) return "";
  return L === "qu" ? "q" : L.charAt(0);
}

const BOSS_VOWELS = new Set(["a", "e", "i", "o", "u"]);

function buildLevelResetRunOpts(levelDef) {
  const id = levelDef?.id ?? "1-1";
  const slug = pickBossSlugForLevel(id, bossRunSeed.value);
  const ts = resolveLevelTargetScore(id, slug);
  let rem = getBaseRemovalsPerLevel(ownedVoucherIds.value);
  if (slug === "the_water") rem = 0;
  let hands = getBaseHandsPerLevel(ownedVoucherIds.value);
  if (slug === "the_needle") hands = getSubmitHandsForNeedleBoss(hands);
  if (parseLevelSubFromId(id) === 3) {
    usedWordLengthsThisBoss.value = new Set();
    mouthLockedLengthBoss.value = null;
    if (slug === "the_club") clubRequiredKeyBoss.value = pickClubRequiredKey();
    else clubRequiredKeyBoss.value = null;
    if (slug === "verdant_leaf") verdantTreasureSold.value = false;
  } else {
    clubRequiredKeyBoss.value = null;
  }
  return {
    remainingWords: hands,
    remainingRemovals: rem,
    targetScore: ts,
    bossSlug: slug,
    postGridBuild: (g) => applyBossPostGridBuild(g, slug),
  };
}

function applyBossPostGridBuild(g, slug) {
  if (!g || !slug) return;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = g[r][c];
      if (!t || t.bossGridBlocked) continue;
      if (slug === "the_plant" && String(t.rarity ?? "") === "rare") t.bossTileDebuffed = true;
      if (slug === "the_vowel") {
        const raw = gridTileRawLower(t);
        if (raw && BOSS_VOWELS.has(raw)) t.bossTileDebuffed = true;
      }
      if (slug === "the_consonant") {
        const raw = gridTileRawLower(t);
        if (raw && !BOSS_VOWELS.has(raw)) t.bossTileDebuffed = true;
      }
      if (slug === "the_pillar") {
        const uid = t._deckCard && typeof t._deckCard === "object" ? Number(t._deckCard._dcUid) : NaN;
        if (Number.isFinite(uid) && pillarUsedDeckUids.value.has(uid)) t.bossTileDebuffed = true;
      }
      if (slug === "verdant_leaf" && !verdantTreasureSold.value) t.bossTileDebuffed = true;
    }
  }
}

function clearVerdantDebuffsOnGrid() {
  const g = grid.value;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = g[r]?.[c];
      if (t && !t.bossGridBlocked) t.bossTileDebuffed = false;
    }
  }
  touchGrid();
}

function applyHookBossAfterSubmit() {
  if (activeBossSlug.value !== "the_hook") return;
  const g = grid.value;
  /** @type {{ r: number, c: number }[]} */
  const pool = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = g[r][c];
      if (!t?.letter || t.bossGridBlocked || t.bossTileDebuffed) continue;
      pool.push({ r, c });
    }
  }
  shuffleArrayInPlaceLocal(pool);
  const n = Math.min(4, pool.length);
  for (let i = 0; i < n; i++) {
    const { r, c } = pool[i];
    const t = g[r][c];
    if (t) t.bossTileDebuffed = true;
  }
  touchGrid();
}

function shuffleArrayInPlaceLocal(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
}

function pickCrimsonDisabledTreasureSlotIndex() {
  /** @type {number[]} */
  const idxs = [];
  const own = ownedTreasures.value;
  for (let i = 0; i < own.length; i++) {
    if (own[i]?.treasureId) idxs.push(i);
  }
  if (!idxs.length) return null;
  return idxs[Math.floor(Math.random() * idxs.length)];
}

function evaluateOxBossHit(judgedLen, counts) {
  let bestN = -1;
  let bestLen = /** @type {number | null} */ (null);
  for (let L = 3; L <= 16; L++) {
    const n = Math.max(0, Math.floor(Number(counts[L]) || 0));
    if (n <= 0) continue;
    if (n > bestN || (n === bestN && bestLen != null && L < bestLen)) {
      bestN = n;
      bestLen = L;
    }
  }
  if (bestLen == null) return false;
  return judgedLen === bestLen;
}
function dollarMarks(n) {
  const v = Math.max(0, Math.round(Number(n) || 0));
  return "$".repeat(v);
}
const currentLevel = computed(() => LEVELS[Math.min(levelIndex.value, LEVEL_COUNT - 1)] ?? LEVELS[0]);
/** 左上角关卡标题，如「关卡 1-1」 */
const levelTitleLabel = computed(() => {
  const id = currentLevel.value?.id ?? "1-1";
  return `关卡 ${id}`;
});
const stageRewardYuan = computed(() => currentLevel.value?.rewardYuan ?? 3);
const rewardDollarMarks = computed(() => dollarMarks(stageRewardYuan.value));

const money = ref(0);
/** 左上角关卡标题格，继续后播「进入下一关」动效 */
const levelTitleBoxRef = ref(null);
/** @type {gsap.core.Timeline | null} */
let levelAdvanceFxTl = null;

/** 顶栏钱包金额区域（$+数字），用于到账缩放动画 */
const headerWalletMarksRef = ref(null);
/** 非 null 时顶栏显示该整数（到账滚动）；null 时用 money */
const walletHeaderDisplayOverride = ref(/** @type {number | null} */ (null));
const walletHeaderShown = computed(() => {
  const o = walletHeaderDisplayOverride.value;
  if (o === null) return money.value;
  return Math.min(o, money.value);
});
/** @type {gsap.core.Timeline | null} */
let walletGainTl = null;

const showDeckLayer = ref(false);
/** 牌库内展开的字母 raw（与 `deckStacksView[].raw` 一致，含 `?` 通配符） */
const deckStackExpandRaw = ref(/** @type {string | null} */ (null));
const deckExpandScrollRef = ref(/** @type {HTMLElement | null} */ (null));
const deckExpandFlipSourceBtnRef = ref(/** @type {HTMLElement | null} */ (null));
/** @type {import("vue").Ref<Array<{ left: number; top: number; width: number; height: number }> | null>} */
const deckExpandFlipFromRects = ref(null);
/** @type {gsap.core.Timeline | null} */
let deckExpandFlipTl = null;

const deckExpandedStack = computed(() => {
  const r = deckStackExpandRaw.value;
  if (r == null) return null;
  return deckStacksView.value.find((s) => s.raw === r) ?? null;
});

watch(deckStackExpandRaw, async (raw) => {
  if (raw != null) deckExpandPortalZ.value = bumpOverlayZ();
  if (raw == null) {
    deckExpandFlipTl?.kill();
    deckExpandFlipTl = null;
    deckExpandFlipFromRects.value = null;
    deckExpandFlipSourceBtnRef.value = null;
    return;
  }
  await nextTick();
  requestAnimationFrame(() => {
    runDeckExpandEnterFlip();
  });
});

watch(showDeckLayer, (open) => {
  if (open) deckPortalZ.value = bumpOverlayZ();
  else {
    deckExpandFlipTl?.kill();
    deckExpandFlipTl = null;
    deckStackExpandRaw.value = null;
  }
});

function captureDeckStackPileRects(btnEl) {
  const cells = btnEl?.querySelectorAll?.(".deck-stack-pile-cell");
  if (!cells?.length) return /** @type {{ left: number; top: number; width: number; height: number }[]} */ ([]);
  return [...cells].map((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });
}

/** 牌库 stack：最上层（idx = n-1）为 0°，往下依次略偏；张数越多每层转角越小 */
function deckStackPileRotationDeg(count, idx) {
  const n = Math.max(1, Math.round(Number(count)) || 1);
  if (n <= 1) return 0;
  const layers = n - 1;
  const step = Math.min(10, 40 / layers);
  return (idx - (n - 1)) * step;
}

function deckStackPileCellStyle(stack, idx) {
  const n = Math.max(1, stack?.entries?.length ?? 1);
  const rotDeg = deckStackPileRotationDeg(n, idx);
  return {
    zIndex: String(idx),
    transform: `rotate(${rotDeg}deg)`,
    transformOrigin: "50% 50%",
  };
}

function runDeckExpandEnterFlip() {
  const scrollEl = deckExpandScrollRef.value;
  const from = deckExpandFlipFromRects.value;
  if (deckStackExpandRaw.value == null || !scrollEl || !from?.length) return;
  const hits = scrollEl.querySelectorAll(".deck-expand-tile-hit");
  if (hits.length !== from.length) {
    deckExpandFlipFromRects.value = null;
    return;
  }
  deckExpandFlipTl?.kill();
  const hitArr = [...hits];
  const tl = gsap.timeline({
    onComplete: () => {
      deckExpandFlipTl = null;
      for (const h of hitArr) gsap.set(h, { clearProps: "transform" });
    },
  });
  deckExpandFlipTl = tl;
  const nFlip = hitArr.length;
  hitArr.forEach((hit, i) => {
    const fr = from[i];
    const tr = hit.getBoundingClientRect();
    const dx = fr.left - tr.left + (fr.width - tr.width) / 2;
    const dy = fr.top - tr.top + (fr.height - tr.height) / 2;
    const sx = fr.width / Math.max(1e-6, tr.width);
    const sy = fr.height / Math.max(1e-6, tr.height);
    const s = Math.min(sx, sy);
    const fromRot = deckStackPileRotationDeg(nFlip, i);
    gsap.set(hit, { transformOrigin: "50% 50%" });
    tl.fromTo(
      hit,
      { x: dx, y: dy, scale: s, rotation: fromRot, opacity: 0.88 },
      { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.4, ease: "expo.out" },
      i * 0.006,
    );
  });
}

function runDeckExpandLeaveFlip(onDone) {
  const scrollEl = deckExpandScrollRef.value;
  const btn = deckExpandFlipSourceBtnRef.value;
  const fromSaved = deckExpandFlipFromRects.value;
  if (!scrollEl || !btn || !fromSaved?.length) {
    onDone();
    return;
  }
  const hits = scrollEl.querySelectorAll(".deck-expand-tile-hit");
  const cells = btn.querySelectorAll(".deck-stack-pile-cell");
  if (hits.length !== fromSaved.length || cells.length !== hits.length) {
    onDone();
    return;
  }
  const hitArr = [...hits];
  const toRects = [...cells].map((el) => el.getBoundingClientRect());
  deckExpandFlipTl?.kill();
  const tl = gsap.timeline({
    onComplete: () => {
      deckExpandFlipTl = null;
      for (const h of hitArr) gsap.killTweensOf(h);
      onDone();
    },
  });
  deckExpandFlipTl = tl;
  const nFlip = hitArr.length;
  hitArr.forEach((hit, i) => {
    const tr = hit.getBoundingClientRect();
    const fr = toRects[i];
    const dx = fr.left - tr.left + (fr.width - tr.width) / 2;
    const dy = fr.top - tr.top + (fr.height - tr.height) / 2;
    const sx = fr.width / Math.max(1e-6, tr.width);
    const sy = fr.height / Math.max(1e-6, tr.height);
    const s = Math.min(sx, sy);
    const toRot = deckStackPileRotationDeg(nFlip, i);
    gsap.set(hit, { transformOrigin: "50% 50%" });
    tl.to(
      hit,
      { x: dx, y: dy, scale: s, rotation: toRot, opacity: 0.22, duration: 0.34, ease: "expo.inOut" },
      i * 0.006,
    );
  });
}

/** 小关结算后继续：先进商店，再点「下一关」进下一小关 */
const showShop = ref(false);
const shopPanelRef = ref(null);
const transitionBusy = ref(false);

const nextOfferInstanceId = ref(1);
const nextShopEmptySlotId = ref(1);
const nextPackOfferInstanceId = ref(1);
const nextPackEmptySlotId = ref(1);
const nextVoucherOfferInstanceId = ref(1);
const nextVoucherEmptySlotId = ref(1);
/** 已刷新优惠券货架的大关号；与当前大关不同时重抽单槽 */
const shopVoucherShelfMajor = ref(-1);
/** 本局已成功提交中，用于天文台等的最大「表观词长」（含直尺券加成，与计分 clamp 一致） */
const maxSubmittedWordLengthSoFar = ref(0);
/** @type {import('vue').Ref<null | object>} */
const shopVoucherShelf = ref(null);

const shopVoucherShelfEmpty = Object.freeze({ kind: "empty", emptySlotId: 0 });
const shopVoucherShelfResolved = computed(() => shopVoucherShelf.value ?? shopVoucherShelfEmpty);

function makeEmptyVoucherSlot() {
  return { kind: "empty", emptySlotId: nextVoucherEmptySlotId.value++ };
}
/** @type {import('vue').Ref<Array<import('../treasures/treasureTypes.js').ShopOfferSlot>>} */
const shopOffers = ref([]);
const packOffers = ref([]);
/** 用于「重播」法术：上一张成功结算的非重播法术 id */
const lastReplayableSpellId = ref(/** @type {string | null} */ (null));
/** 非 null 时显示法术目标选择层 */
const spellTargetSession = ref(null);
/**
 * 法术格外观动效：棋盘在 `v-if="!showShop"` 内，商店开着时无 LetterTile DOM，GSAP 无法缩放；
 * 暂存 `runSpellTileAppearanceAnim` 的参数对象，关店后再播。
 * @type {import('vue').Ref<null>}
 */
const pendingSpellTileAppearanceAnim = ref(null);
/** 商店购买的「升级」道具，下一小关生效（预留） */
const ownedUpgrades = ref([]);
const shopUpgradeAnimating = ref(false);

const UPGRADE_ICON_CLASS = "ri-arrow-up-box-fill";
const UPGRADE_LENGTH_GROUPS = Object.freeze([
  Object.freeze({ key: "len3", minLen: 3, maxLen: 3, label: "3字母" }),
  Object.freeze({ key: "len4", minLen: 4, maxLen: 4, label: "4字母" }),
  Object.freeze({ key: "len5", minLen: 5, maxLen: 5, label: "5字母" }),
  Object.freeze({ key: "len6_7", minLen: 6, maxLen: 7, label: "6-7字母" }),
  Object.freeze({ key: "len8_10", minLen: 8, maxLen: 10, label: "8-10字母" }),
  Object.freeze({ key: "len11_plus", minLen: 11, maxLen: 16, label: "11+字母" }),
]);

const UPGRADE_RARITY_LETTER_LABEL = Object.freeze({
  common: "普通",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
});

/** 组合包多选层；链式法术确认完成后 resolve（见 `onSpellTargetConfirm`） */
let spellPackFulfillmentResolve = /** @type {null | (() => void)} */ (null);
/** @type {import('vue').Ref<null | object>} */
const packPickSession = ref(null);
const packPickBusy = ref(false);

function makeEmptyShopSlot() {
  return { kind: "empty", emptySlotId: nextShopEmptySlotId.value++ };
}

function makeEmptyPackSlot() {
  return { kind: "empty", emptySlotId: nextPackEmptySlotId.value++ };
}
/** 至多 5 格；null 为空 */
const ownedTreasures = ref([null, null, null, null, null]);

const ownedTreasureIdSet = computed(() => {
  const s = new Set();
  for (const t of ownedTreasures.value) {
    if (t?.treasureId) s.add(t.treasureId);
  }
  return s;
});

/** 商店可售：仅已接入逻辑的宝藏 */
const shopTreasurePool = TREASURE_DEFINITIONS.filter((t) =>
  IMPLEMENTED_TREASURE_ID_SET.has(t.treasureId),
);

const shopRerollsThisVisit = ref(0);
/** 对齐 Balatro：整局仅第一次进店时牌包区第一格必为法术小包 */
const balatroFirstShopPackConsumed = ref(false);

function shopPriceForOffer(basePrice) {
  return applyShopDiscountPrice(basePrice, ownedVoucherIds.value);
}

const shopNextRerollCostDisplay = computed(() =>
  shopPriceForOffer(getEffectiveShopRerollCost(ownedVoucherIds.value, computeShopRerollCost(shopRerollsThisVisit.value))),
);

const shopCanReroll = computed(() => {
  if (transitionBusy.value) return false;
  const w = money.value;
  const need = shopNextRerollCostDisplay.value;
  return Number.isFinite(w) && w >= need;
});

/** @param {import('../treasures/treasureTypes.js').TreasureDef[]} defs */
function toShopOfferRows(defs, rng = Math.random) {
  const hone = getShopAccessoryChanceMultiplier(ownedVoucherIds.value);
  return defs.map((def) => {
    const treasureAccessoryId = rollShopTreasureAccessoryId(rng, hone);
    const priceAdd = getShopTreasureAccessoryPriceAdd(treasureAccessoryId);
    return {
      kind: "offer",
      offerInstanceId: nextOfferInstanceId.value++,
      offerType: "treasure",
      treasureId: def.treasureId,
      price: def.price + priceAdd,
      rarity: def.rarity,
      name: def.name,
      emoji: def.emoji,
      description: def.description,
      treasureAccessoryId: treasureAccessoryId ?? null,
    };
  });
}

function getOwnedUpgradeLevelByGroup(groupKey) {
  const key = String(groupKey ?? "");
  const count = ownedUpgrades.value.reduce((acc, item) => {
    if (item?.upgradeKind === "rarity") return acc;
    return item?.lengthGroupKey === key ? acc + 1 : acc;
  }, 0);
  return Math.max(1, count + 1);
}

function getOwnedRarityUpgradeDisplayLevel(rarityKey) {
  const k = String(rarityKey ?? "");
  const count = ownedUpgrades.value.reduce(
    (acc, item) => (item?.upgradeKind === "rarity" && item?.rarityKey === k ? acc + 1 : acc),
    0,
  );
  return Math.max(1, count + 1);
}

/**
 * 牌包区库存：单张 + 组合包，权重与价格在 `src/shop/shopPackEconomy.js`。
 * @param {() => number} [rng=Math.random]
 */
function rollPackStock(rng = Math.random) {
  const guarantee = balatroFirstShopPackConsumed.value === false;
  const rows = rollPackOfferStock({
    rng,
    nextPackOfferInstanceId: () => nextPackOfferInstanceId.value++,
    nextPackEmptySlotId: () => nextPackEmptySlotId.value++,
    ownedTreasureIdSet: ownedTreasureIdSet.value,
    emptyTreasureSlots: ownedTreasures.value.filter((s) => s == null).length,
    lastReplayableSpellId: lastReplayableSpellId.value,
    shopTreasurePool,
    guaranteeBalatroFirstShopBuffoonSlot: guarantee,
    ownedVoucherIds: ownedVoucherIds.value,
    spellCountsByLength: spellCountsByLength.value,
    honeAccessoryMult: getShopAccessoryChanceMultiplier(ownedVoucherIds.value),
  });
  if (guarantee) balatroFirstShopPackConsumed.value = true;
  return rows;
}

/**
 * 对齐 Balatro「2 张随机卡」栏：仅刷新本栏，不随牌包区刷新。
 * @param {() => number} [rng=Math.random]
 */
function rollShopStock(rng = Math.random) {
  return rollShopRandomCardOffers({
    rng,
    nextOfferInstanceId: () => nextOfferInstanceId.value++,
    nextShopEmptySlotId: () => nextShopEmptySlotId.value++,
    ownedTreasureIdSet: ownedTreasureIdSet.value,
    lastReplayableSpellId: lastReplayableSpellId.value,
    shopTreasurePool,
    ownedVoucherIds: ownedVoucherIds.value,
    honeAccessoryMult: getShopAccessoryChanceMultiplier(ownedVoucherIds.value),
  });
}

/** @type {import('vue').Ref<null | { kind: 'offer', treasure: object, originRect?: object | null } | { kind: 'owned', slotIndex: number, treasure: object, originRect?: object | null }>} */
const treasureDetail = ref(null);
const treasureDetailLayerRef = ref(null);
const spellTargetLayerRef = ref(null);
const packPickLayerRef = ref(null);

function treasureOriginRectFromEl(el) {
  if (!el || typeof el.getBoundingClientRect !== "function") return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function onShopSelectOffer(payload) {
  const root = payload.originEl;
  treasureDetail.value = {
    kind: "offer",
    treasure: payload.treasure,
    originRect: treasureOriginRectFromEl(root),
  };
}

function onShopSelectPackOffer(payload) {
  const root = payload.originEl;
  treasureDetail.value = {
    kind: "offer",
    treasure: payload.treasure,
    originRect: treasureOriginRectFromEl(root),
  };
}

function onShopSelectOwned(payload) {
  treasureDetail.value = {
    kind: "owned",
    slotIndex: payload.index,
    treasure: payload.treasure,
    originRect: treasureOriginRectFromEl(payload.originEl),
  };
}

function buildPackPickSessionFromBundle(bundle) {
  const opts = Array.isArray(bundle.bundleOptions) ? bundle.bundleOptions : [];
  const pickCount = Math.max(1, Math.floor(Number(bundle.pickCount) || 1));
  const withKeys = opts.map((o, i) => ({
    ...o,
    optionKey: o.optionKey ?? `opt-${o.offerInstanceId ?? i}-${i}`,
  }));
  const need = Math.min(pickCount, Math.max(1, withKeys.length));
  const discPrice = shopPriceForOffer(bundle.price);
  return {
    bundleRow: bundle,
    bundleKind: bundle.bundleKind,
    title: bundle.name,
    subtitle: `须选 ${need} 项（共 ${withKeys.length} 个候选）· 确认时支付 $${discPrice}`,
    price: bundle.price,
    pickCount,
    options: withKeys,
  };
}

function onPackPickCancel() {
  if (packPickBusy.value) return;
  packPickSession.value = null;
}

async function fulfillSpellAfterPackPayment(t) {
  const spellId = String(t.spellId ?? "");
  if (!spellId) return;
  if (spellId === "restart" && !lastReplayableSpellId.value) {
    showToast("尚无可重播的法术");
    return;
  }
  const effectiveSpellId =
    spellId === "restart" ? String(lastReplayableSpellId.value) : spellId;
  const pickCount = resolveSpellPickCount(spellId, lastReplayableSpellId.value);

  if (pickCount <= 0) {
    const ctx0 = buildSpellRuntimeContext();
    const beforeGrid = cloneGridDeep(grid.value, ROWS, COLS);
    applySpell(ctx0, spellId, effectiveSpellId, [], {});
    const afterGrid = cloneGridDeep(grid.value, ROWS, COLS);
    const animTargets = diffGridAppearanceTargets(beforeGrid, afterGrid, ROWS, COLS);
    if (animTargets.length > 0) {
      restoreGridFromDeepClone(grid, beforeGrid, ROWS, COLS);
      touchGrid();
      await nextTick();
      const oldSnaps0 = animTargets.map(({ row, col }) => beforeGrid[row][col]);
      const newSnaps0 = animTargets.map(({ row, col }) => afterGrid[row][col]);
      await queueOrRunSpellTileAppearanceAnim({
        spellId: effectiveSpellId,
        targets: animTargets,
        oldSnaps: oldSnaps0,
        newSnaps: newSnaps0,
        grid,
        touchGrid,
        getTileEl: (row, col) => getGridTileElByIndex(row * COLS + col),
        nextTick,
      });
    }
    return;
  }

  const def = getSpellDefinition(spellId);
  spellTargetSession.value = {
    spellName: def?.name ?? t.name ?? "法术",
    spellIconClass: def?.iconClass ?? t.iconClass ?? "ri-magic-fill",
    spellDescription: t.description ?? def?.description ?? "",
    spellRarity: t.rarity ?? "rare",
    pickCount,
    offerSlots: buildSpellOfferSlots(),
    purchasedSpellId: spellId,
    effectiveSpellId,
  };
  await new Promise((resolve) => {
    spellPackFulfillmentResolve = resolve;
  });
}

async function fulfillUpgradeAfterPackPayment(t) {
  if (shopUpgradeAnimating.value) return;
  shopUpgradeAnimating.value = true;
  try {
    const isRarity = t.upgradeKind === "rarity";
    const beforeLevel = isRarity
      ? getOwnedRarityUpgradeDisplayLevel(t.rarityKey)
      : getOwnedUpgradeLevelByGroup(t.lengthGroupKey);
    if (isRarity) {
      const rk = String(t.rarityKey ?? "");
      ownedUpgrades.value.push({
        upgradeId: t.treasureId,
        upgradeKind: "rarity",
        rarityKey: rk,
        price: 0,
      });
      const curLv = Math.max(1, Math.round(Number(rarityLevelsByRarity.value?.[rk])) || 1);
      setRarityLevel(rk, curLv + 1);
      refreshGridTileBaseScoresFromLevels();
    } else {
      ownedUpgrades.value.push({
        upgradeId: t.treasureId,
        upgradeKind: "length",
        lengthGroupKey: t.lengthGroupKey,
        lengthMin: t.lengthMin,
        lengthMax: t.lengthMax,
        lengthLabel: t.lengthLabel,
        lengthBadgeLabel: t.lengthBadgeLabel,
        price: 0,
      });
      for (let len = t.lengthMin; len <= t.lengthMax; len++) {
        const curLv = Math.max(1, Math.round(Number(lengthLevelsByLength.value?.[len])) || 1);
        setWordLengthLevel(len, curLv + 1);
      }
    }
    await shopPanelRef.value?.playUpgradeResult?.(
      isRarity
        ? {
            upgradeKind: "rarity",
            rarityKey: t.rarityKey,
            beforeLevel,
          }
        : {
            upgradeKind: "length",
            lengthLabel: t.lengthLabel,
            lengthMin: t.lengthMin,
            lengthMax: t.lengthMax,
            beforeLevel,
          },
    );
  } catch {
    shopUpgradeAnimating.value = false;
  }
  if (shopUpgradeAnimating.value) shopUpgradeAnimating.value = false;
}

async function fulfillTreasureAfterPackPayment(t, fromEl) {
  const ix = ownedTreasures.value.findIndex((s) => s == null);
  if (ix < 0) return;
  const shop = shopPanelRef.value;
  const frameEl =
    fromEl?.querySelector?.(".shop-treasure-frame") ??
    (fromEl?.classList?.contains?.("shop-treasure-frame") ? fromEl : null);
  const toTarget = shop?.getOwnedSlotEl?.(ix) ?? null;
  if (frameEl && toTarget) await animateTreasureFrameFly(frameEl, toTarget);
  ownedTreasures.value[ix] = {
    treasureId: t.treasureId,
    price: t.price,
    rarity: t.rarity,
    name: t.name,
    emoji: t.emoji,
    description: t.description,
    treasureAccessoryId: t.treasureAccessoryId ?? null,
  };
}

async function fulfillPackInnerPurchase(t, flyEl) {
  if (!t) return;
  if (t.offerType === "spell") {
    await fulfillSpellAfterPackPayment(t);
    return;
  }
  if (t.offerType === "upgrade") {
    await fulfillUpgradeAfterPackPayment(t);
    return;
  }
  if (t.offerType === "treasure") {
    await fulfillTreasureAfterPackPayment(t, flyEl ?? null);
    return;
  }
  if (t.offerType === "deckLetter") {
    const raw = String(t.deckLetterRaw ?? "e").toLowerCase();
    const deckBtn = shopPanelRef.value?.getDeckViewBtnEl?.() ?? null;
    const flyRoot = flyEl ?? null;
    if (flyRoot && deckBtn) await animatePackTileFlyToDeck(flyRoot, deckBtn);
    appendShopDeckEntries([{ raw, materialId: null }]);
    showToast(`已加入牌库：${t.name}`);
    return;
  }
  if (t.offerType === "deckTile") {
    const raw = String(t.deckLetterRaw ?? "e").toLowerCase();
    const mat = t.deckTileMaterialId != null ? String(t.deckTileMaterialId) : null;
    const acc = t.deckTileAccessoryId != null ? String(t.deckTileAccessoryId).trim() : "";
    const deckBtn = shopPanelRef.value?.getDeckViewBtnEl?.() ?? null;
    const flyRoot = flyEl ?? null;
    if (flyRoot && deckBtn) await animatePackTileFlyToDeck(flyRoot, deckBtn);
    appendShopDeckEntries([{ raw, materialId: mat, accessoryId: acc || undefined }]);
    showToast(`已加入牌库：${t.name}`);
  }
}

async function onPackPickConfirm(payload) {
  const sess = packPickSession.value;
  if (!sess?.bundleRow || packPickBusy.value) return;
  const bundle = sess.bundleRow;
  const price = shopPriceForOffer(Number(bundle.price) || 0);
  const selected = payload?.selected ?? [];
  const opts = sess.options ?? [];
  const requiredPicks = Math.min(
    Math.max(1, Math.floor(Number(sess.pickCount) || 1)),
    Math.max(1, opts.length),
  );
  if (selected.length !== requiredPicks) return;
  if (money.value < price) return;

  let needTreasure = 0;
  for (const s of selected) {
    if (s?.offerType === "treasure") needTreasure += 1;
  }
  if (needTreasure > 0) {
    const empty = ownedTreasures.value.filter((s) => s == null).length;
    if (empty < needTreasure) {
      showToast("宝藏槽位不足");
      return;
    }
  }

  packPickBusy.value = true;
  try {
    const picker = packPickLayerRef.value;
    const withFly = selected.map((item) => ({
      item,
      flyEl: picker?.getFlySourceEl?.(item) ?? null,
    }));
    money.value -= price;
    clearOfferSlotAfterPurchase(bundle);
    for (const { item, flyEl } of withFly) {
      await fulfillPackInnerPurchase(item, flyEl);
    }
    packPickSession.value = null;
  } finally {
    packPickBusy.value = false;
  }
}

const treasureDetailMode = computed(() => {
  const d = treasureDetail.value;
  if (!d) return "offer";
  if (d.kind === "offer") return "offer";
  return showShop.value ? "owned-shop" : "owned-game";
});

/** 已拥有详情：静态简介 + 各宝藏 `buildOwnedDetailDescriptionSegments`（仅材质/配饰类追加；货架报价仍用静态简介） */
const treasureDetailDescriptionOverride = computed(() => {
  const d = treasureDetail.value;
  if (!d?.treasure || d.kind === "offer") return null;
  const tid = d.treasure.treasureId;
  const extra = TREASURE_HOOKS_BY_ID.get(tid)?.buildOwnedDetailDescriptionSegments?.({
    chargeWordsSubmitted: basketballWordsSubmitted.value,
    ownedSlotTreasureIds: ownedTreasures.value.map((s) => s?.treasureId ?? null),
    remainingDeckCount: deckCount.value,
  });
  if (!extra?.length) return null;
  const base = normalizeTreasureDescription(d.treasure.description);
  return [...base, ...extra];
});

/** 当前详情中的充能可视状态：仅已拥有宝藏可有值（inactive/active） */
const treasureDetailChargeVisualState = computed(() => {
  const d = treasureDetail.value;
  if (!d || d.kind !== "owned") return null;
  const i = Number(d.slotIndex);
  if (!Number.isInteger(i) || i < 0) return null;
  return treasureChargeVisualBySlot.value[i] ?? null;
});

const treasureDetailChargeProgress = computed(() => {
  const d = treasureDetail.value;
  if (!d || d.kind !== "owned") return 0;
  const i = Number(d.slotIndex);
  if (!Number.isInteger(i) || i < 0) return 0;
  return treasureChargeProgressBySlot.value[i] ?? 0;
});

/** 已拥有槽：充能外观（篮球等）；商店货架商品不加 */
const treasureChargeVisualBySlot = computed(() =>
  ownedTreasures.value.map((s) =>
    s?.treasureId
      ? resolveTreasureChargeVisualState(s.treasureId, basketballWordsSubmitted.value)
      : null,
  ),
);

const treasureChargeProgressBySlot = computed(() =>
  ownedTreasures.value.map((s) =>
    s?.treasureId ? resolveTreasureChargeProgress(s.treasureId, basketballWordsSubmitted.value) : 0,
  ),
);

const gameOwnedDragPreview = ref(/** @type {(Array<object | null>) | null} */ (null));
const gameOwnedKeyOrder = ref(ownedTreasures.value.map((_, i) => `g-slot-${i}`));
const gameOwnedDragKeySnapshot = ref(/** @type {(string[]) | null} */ (null));

function syncOwnedTreasureSlots() {
  const arr = ownedTreasures.value;
  const target = computeOwnedTreasureSlotTargetLength(
    arr,
    getOwnedTreasureSlotBonusFromVouchers(ownedVoucherIds.value),
  );
  const next = [...arr];
  while (next.length < target) next.push(null);
  while (next.length > target && next[next.length - 1] == null) next.pop();
  let keys = [...gameOwnedKeyOrder.value];
  while (keys.length < next.length) keys.push(`g-slot-${keys.length}`);
  while (keys.length > next.length) keys.pop();
  const keysSame =
    keys.length === gameOwnedKeyOrder.value.length && keys.every((k, i) => k === gameOwnedKeyOrder.value[i]);
  const arrSame = next.length === arr.length && next.every((v, i) => v === arr[i]);
  if (!arrSame) ownedTreasures.value = next;
  if (!keysSame) gameOwnedKeyOrder.value = keys;
}

watch(
  ownedTreasures,
  () => {
    syncOwnedTreasureSlots();
  },
  { deep: true },
);

watch(
  ownedVoucherIds,
  () => {
    syncOwnedTreasureSlots();
  },
  { deep: true },
);
const gameOwnedDragActive = ref(false);
const gameOwnedDragCurrentIndex = ref(-1);
const gameOwnedDragMoved = ref(false);
const gameOwnedDragDroppedInside = ref(false);

const displayOwnedTreasures = computed(() => gameOwnedDragPreview.value ?? ownedTreasures.value);
const displayOwnedTreasureKeys = computed(() => {
  return gameOwnedKeyOrder.value;
});
const displayTreasureChargeVisualBySlot = computed(() =>
  displayOwnedTreasures.value.map((s) =>
    s?.treasureId
      ? resolveTreasureChargeVisualState(s.treasureId, basketballWordsSubmitted.value)
      : null,
  ),
);
const displayTreasureChargeProgressBySlot = computed(() =>
  displayOwnedTreasures.value.map((s) =>
    s?.treasureId ? resolveTreasureChargeProgress(s.treasureId, basketballWordsSubmitted.value) : 0,
  ),
);

const treasureSellRefund = computed(() => {
  const d = treasureDetail.value;
  if (!d || d.kind !== "owned") return 0;
  return Math.floor(Number(d.treasure.price) / 2);
});

const treasureCanBuyOffer = computed(() => {
  const d = treasureDetail.value;
  if (!d || d.kind !== "offer") return false;
  const w = money.value;
  const t = d.treasure;
  const p0 = Number(t.price);
  if (!Number.isFinite(w) || !Number.isFinite(p0)) return false;
  const p = shopPriceForOffer(p0);
  if (t.offerType === "voucher") {
    const vid = String(t.voucherId ?? "");
    const major = parseMajorFromLevelId(currentLevel.value?.id ?? "1-1");
    if (vid === "v_glyph_1" && major <= 1) return false;
    if (vid === "v_glyph_2" && major <= 2) return false;
    return w >= p;
  }
  if (t.offerType === "bundlePack") return w >= p;
  if (t.offerType === "spell") {
    const sid = String(t.spellId ?? "");
    if (sid === "restart" && !lastReplayableSpellId.value) return false;
    return w >= p;
  }
  if (t.offerType === "upgrade") return w >= p;
  if (t.offerType === "deckLetter" || t.offerType === "deckTile") return w >= p;
  const hasSlot = ownedTreasures.value.some((s) => s == null);
  return w >= p && hasSlot;
});

/** 与 App.vue 共用的 Iris 转场组件（注入由上层提供） */
const irisTransition = inject("irisTransition", null);

/** 小关结算层 */
const showSettlement = ref(false);
const disableSettlementLayerAnim = ref(false);
const settlementCardRef = ref(null);
/** 结算「继续」按钮：与 settle-row 同一套 GSAP 入场序列 */
const settlementContinueBtnRef = ref(/** @type {HTMLButtonElement | null} */ (null));
const settlementContinueEnabled = ref(false);
/** @type {import('vue').Ref<null | { clearReward: number, spareMoves: number, interest: number, total: number, moneyBefore: number }>} */
const settlementSnapshot = ref(null);
const animSettleClear = ref(0);
const animSettleSpare = ref(0);
const animSettleInterest = ref(0);
const animSettleTotal = ref(0);

/** 按结算快照判定各行是否为 0（用于半透明空行，与动画数字无关） */
const settlementRowEmpty = computed(() => {
  const s = settlementSnapshot.value;
  if (!s) {
    return { clear: false, spare: false, interest: false, total: false };
  }
  return {
    clear: s.clearReward === 0,
    spare: s.spareMoves === 0,
    interest: s.interest === 0,
    total: s.total === 0,
  };
});

let settlementTl = null;

/** 结算四行 DOM，用于入场与每枚 $ 时的震动 */
const settlementRowEls = ref(/** @type {(HTMLElement | null)[]} */ ([null, null, null, null]));
function setSettlementRowRef(index, el) {
  settlementRowEls.value[index] = /** @type {HTMLElement | null} */ (el);
}

/** 每出现一枚 $：先快速转到约 1°，再 expo.out 回正 */
function shakeSettlementRow(rowEl) {
  if (!rowEl) return;
  gsap.killTweensOf(rowEl, "rotation");
  gsap.set(rowEl, { rotation: 0, transformOrigin: "50% 50%" });
  gsap
    .timeline()
    .to(rowEl, {
      rotation: 1,
      duration: 0.09,
      ease: EASE_TRANSFORM,
    })
    .to(rowEl, {
      rotation: 0,
      duration: 0.52,
      ease: EASE_TRANSFORM,
    });
}

/**
 * 结算弹窗里四个栏目将要亮出的 $ 总枚数（与 UI 一致）
 * @param {{ clearReward: number, spareMoves: number, interest: number, total: number }} s
 */
function settlementTotalDollarCount(s) {
  return (
    Math.max(0, Math.round(Number(s.clearReward) || 0)) +
    Math.max(0, Math.round(Number(s.spareMoves) || 0)) +
    Math.max(0, Math.round(Number(s.interest) || 0)) +
    Math.max(0, Math.round(Number(s.total) || 0))
  );
}

/**
 * 各栏目内「相邻两枚 $」之间的间隔段数量之和
 * @param {readonly { count: number }[]} rowSpecs
 */
function settlementDollarGapCount(rowSpecs) {
  let g = 0;
  for (const spec of rowSpecs) {
    const n = Math.max(0, Math.round(Number(spec.count) || 0));
    g += Math.max(0, n - 1);
  }
  return g;
}

/**
 * 与总 $ 数 S 成一次函数：整段结算里「可拉伸的留白节拍」总秒数 P = clamp(k·S + b, Pmin, Pmax)
 * 再按间隔段数均分到每个 stepGap，少 $ 则整体更短，多 $ 则更长（不必与 S 严格成正比）
 */
const SETTLEMENT_PACE_K_S = 0.052;
const SETTLEMENT_PACE_B_S = 0.1;
const SETTLEMENT_PACE_MIN_S = 0.12;
const SETTLEMENT_PACE_MAX_S = 2.85;

function settlementPaceBudgetSeconds(S) {
  if (S <= 0) return 0;
  const p = SETTLEMENT_PACE_K_S * S + SETTLEMENT_PACE_B_S;
  return Math.min(SETTLEMENT_PACE_MAX_S, Math.max(SETTLEMENT_PACE_MIN_S, p));
}

/**
 * @param {number} S
 * @param {number} gapCount 同行相邻 $ 之间的段数
 * @param {number} SPositiveRows 至少有一枚 $ 的栏目数（用于 G=0 时摊薄留白）
 */
function settlementDollarStepGap(S, gapCount, SPositiveRows) {
  const P = settlementPaceBudgetSeconds(S);
  if (P <= 0) return 0.09;
  if (gapCount > 0) {
    const g = P / gapCount;
    return Math.min(0.22, Math.max(0.032, g));
  }
  /* 每行最多 1 枚 $：没有行内间隔，在栏目之间插入短留白，使 P 仍随 S 线性生效 */
  const slots = Math.max(1, SPositiveRows - 1);
  const g = P / slots;
  return Math.min(0.22, Math.max(0.032, g));
}

/** 行入场时长随 S 略变长：一次函数 + clamp */
function settlementRowIntroDuration(S) {
  const d = 0.32 + 0.014 * S;
  return Math.min(0.5, Math.max(0.28, d));
}

/**
 * 时间轴上逐个增加 $，每加一枚震行
 * @param {gsap.core.Timeline} tl
 * @param {import('vue').Ref<number>} animRef
 * @param {number} count
 * @param {HTMLElement | null} rowEl
 * @param {number} stepGap 行内相邻 $ 间隔
 * @param {number} [interRowPadS=0] 本行 dollar 结束后到下一行前的留白（G=0 时用）
 */
function appendSettlementDollarBuild(tl, animRef, count, rowEl, stepGap, interRowPadS = 0) {
  const n = Math.max(0, Math.round(Number(count) || 0));
  tl.call(() => {
    animRef.value = 0;
  });
  if (n <= 0) return;
  for (let k = 1; k <= n; k++) {
    tl.call(() => {
      animRef.value = k;
      shakeSettlementRow(rowEl);
    });
    if (k < n) tl.to({}, { duration: stepGap });
  }
  if (interRowPadS > 0) tl.to({}, { duration: interRowPadS });
}

watch(showSettlement, (open) => {
  if (open) {
    settlementPortalZ.value = bumpOverlayZ();
    showDeckLayer.value = false;
    closeTileDetail();
  }
});

watch(showShop, (open) => {
  if (!open) return;
  shopPortalZ.value = bumpOverlayZ();
  closeTileDetail();
  showInfoLayer.value = false;
  showDeckLayer.value = false;
  treasureDetail.value = null;
  packPickSession.value = null;
  shopRerollsThisVisit.value = 0;
  const major = parseMajorFromLevelId(currentLevel.value?.id ?? "1-1");
  if (shopVoucherShelfMajor.value !== major) {
    shopVoucherShelfMajor.value = major;
    const d = rollShopVoucherOfferDef(ownedVoucherIds.value, Math.random);
    shopVoucherShelf.value = d
      ? {
          kind: "offer",
          offerType: "voucher",
          offerInstanceId: nextVoucherOfferInstanceId.value++,
          voucherId: d.id,
          price: d.price,
          name: formatVoucherDisplayName(d, {
            pairHasTier2Owned: pairHasTier2Owned(d.pairId, ownedVoucherIds.value),
          }),
          description: d.description,
          emoji: d.emoji,
          rarity: "common",
          treasureId: `voucher_${d.id}`,
        }
      : makeEmptyVoucherSlot();
  }
  shopOffers.value = rollShopStock();
  packOffers.value = rollPackStock();
});

watch(showShop, async (open) => {
  if (open) return;
  const pending = pendingSpellTileAppearanceAnim.value;
  if (pending == null) return;
  pendingSpellTileAppearanceAnim.value = null;
  await nextTick();
  await runSpellTileAppearanceAnim(pending);
});

const scoringAnimating = ref(false);
/** 棋盘下落/补牌动画进行中，禁止点格与提交/移除 */
const gridRefillAnimating = ref(false);
/** 首次入场前隐藏棋盘，避免未动画的一帧闪现 */
const gridIntroDone = ref(false);
const scoringLetterIndex = ref(-1);
const animScoreSum = ref(0);
const animMultTotal = ref(0);
const animResultTotal = ref(0);
const roundScoreOverride = ref(null);
const gameResultAreaRef = ref(null);
const hideResultWordLengthBeforeTotal = ref(false);
const suppressResultWordLengthUntilScoringEnd = ref(false);
/** 通关时「升级配饰」驱动的顶栏词长/等级动效（与商店购买升级卡同款流程） */
const clearWinLengthUpgradeFxActive = ref(false);
const clearWinFxWordlenText = ref("");
const clearWinFxLevelShown = ref(1);
const clearWinFxScoreValue = ref(0);
const clearWinFxMultValue = ref(0);
const clearWinFxModel = {
  wordlenText: clearWinFxWordlenText,
  levelShown: clearWinFxLevelShown,
  scoreValue: clearWinFxScoreValue,
  multValue: clearWinFxMultValue,
};

/** 最后一手 + 首格宝石配饰：顶栏稀有度升级动效 */
const lastSubmitRarityFxActive = ref(false);
const lastSubmitRarityFxWordlenText = ref("");
const lastSubmitRarityFxLevelShown = ref(1);
const lastSubmitRarityFxScoreValue = ref(0);
const lastSubmitRarityFxMultValue = ref(0);
const lastSubmitRarityFxModel = {
  wordlenText: lastSubmitRarityFxWordlenText,
  levelShown: lastSubmitRarityFxLevelShown,
  scoreValue: lastSubmitRarityFxScoreValue,
  multValue: lastSubmitRarityFxMultValue,
};

function getResultTotalEl() {
  return gameResultAreaRef.value?.getTotalEl?.() ?? null;
}
function getResultFormulaEl() {
  return gameResultAreaRef.value?.getFormulaEl?.() ?? null;
}
function getResultScoreNumEl() {
  return gameResultAreaRef.value?.getScoreNumEl?.() ?? null;
}
function getResultMultNumEl() {
  return gameResultAreaRef.value?.getMultNumEl?.() ?? null;
}

/** UI 数字统一按整数显示（内部可保留小数，展示时四舍五入） */
function formatNum(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

const showResultTotalBar = computed(
  () => scoringAnimating.value && Math.round(animResultTotal.value) > 0
);
const resultTotalShown = computed(() =>
  showResultTotalBar.value ? formatNum(animResultTotal.value) : ""
);

watch(showResultTotalBar, (show) => {
  nextTick(() => {
    const el = getResultFormulaEl();
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.to(el, {
      scale: show ? 0.8 : 1,
      duration: 0.4,
      ease: EASE_TRANSFORM,
      transformOrigin: "50% 100%",
    });
  });
});

const showResultWordLength = computed(() => {
  if (clearWinLengthUpgradeFxActive.value) return true;
  if (lastSubmitRarityFxActive.value) return true;
  if (showResultTotalBar.value) return false;
  if (hideResultWordLengthBeforeTotal.value) return false;
  if (suppressResultWordLengthUntilScoringEnd.value) return false;
  return dictionaryReady.value && resolvedWordForSubmit.value != null;
});
const resultWordLengthShown = computed(() => {
  if (clearWinLengthUpgradeFxActive.value) return clearWinFxWordlenText.value;
  if (lastSubmitRarityFxActive.value) return lastSubmitRarityFxWordlenText.value;
  return `${effectiveWordForSubmit.value.length}字母`;
});
const resultWordLengthLevel = computed(() => {
  if (clearWinLengthUpgradeFxActive.value) return clearWinFxLevelShown.value;
  if (lastSubmitRarityFxActive.value) return lastSubmitRarityFxLevelShown.value;
  const len = effectiveWordForSubmit.value.length;
  if (len < 3 || len > 16) return 1;
  return Math.max(1, Math.round(Number(lengthLevelsByLength.value?.[len])) || 1);
});

/** 提交动画期间：释义按行展示（\n 拆行） */
const submitTranslationLines = ref([]);
const wordTranslationWrapRef = ref(null);
const wordTranslationInnerRef = ref(null);

const letterGridRef = ref(null);
const gridTileRefs = ref([]);
const wordSlotRefs = ref([]);
/** 记分动效：高亮底部宝藏栏中正在触发的槽位索引 */
const scoringTreasureBarIndex = ref(/** @type {number | null} */ (null));
/** 非响应式 DOM 引用容器：仅动画查询使用，避免 TransitionGroup + ref 回写触发递归更新 */
const gameTreasureSlotRefs = /** @type {(HTMLElement | undefined)[]} */ ([]);
function setGameTreasureSlotRef(index, el) {
  const node = refToDom(el);
  if (node) {
    gameTreasureSlotRefs[index] = node;
  } else {
    gameTreasureSlotRefs[index] = undefined;
  }
}
const wordSlotsWrapRef = ref(null);
/** 仅用于 imperative 写 --slot-scale，避免 RAF 每帧改 ref 触发整面板重渲染 */
const wordSlotsScaleRootRef = ref(null);
const flyLetterRef = ref(null);
/** 正在飞入的字母列表，支持多个同时飞；每项 { id, fromRect, toRect, letter, rarity, pendingRow, pendingCol } */
const flyingLetters = ref([]);
let flyingInIdCounter = 0;
/** fly.id -> 飞字 DOM，用于取消时 kill GSAP；不用下标，避免列表变长时 ref 与动画错位 */
const flyingInElById = new Map();
const flyingInAnimStarted = new Set();
/** 正在飞回网格的 batch 列表，支持多个同时飞回；每 batch { id, slotIndex, list } */
const flyingBackBatches = ref([]);
let flyingBackBatchIdCounter = 0;
/** batchId -> { slotIndex, total, completed, slotsToAnimateToZero }，用于 onComplete 统计 */
const flyingBackBatchMeta = {};

/** 组件 ref 取根 DOM（LetterTile 等），原生元素原样返回 */
function refToDom(el) {
  if (!el) return undefined;
  if (typeof el.getEl === "function") return el.getEl() ?? undefined;
  return el.$el != null ? el.$el : el;
}

function setGridTileRef(index, el) {
  const node = refToDom(el);
  if (node) gridTileRefs.value[index] = node;
  else gridTileRefs.value[index] = undefined;
}

function getGridTileElByIndex(index) {
  const byRef = gridTileRefs.value[index];
  if (byRef) return byRef;
  const host = letterGridRef.value;
  const child = host?.children?.[index];
  return child instanceof HTMLElement ? child : undefined;
}

function setWordSlotRef(index, el) {
  if (el) wordSlotRefs.value[index] = el;
}

function getSelectedGridTileElsInOrder() {
  const list = [];
  for (const pos of selectedOrder.value) {
    const el = getGridTileElByIndex(pos.row * COLS + pos.col);
    if (el) list.push(el);
  }
  return list;
}

function runSlotAndGridLeaveAnimation(slotEls, gridEls, options = {}) {
  const duration = Number.isFinite(options.duration) ? options.duration : 0.28;
  const stagger = Number.isFinite(options.stagger) ? options.stagger : 0.12;
  return new Promise((resolve) => {
    let done = 0;
    const need = (slotEls.length > 0 ? 1 : 0) + (gridEls.length > 0 ? 1 : 0);
    if (need === 0) {
      resolve();
      return;
    }
    const finish = () => {
      done += 1;
      if (done >= need) resolve();
    };
    if (slotEls.length > 0) {
      gsap.fromTo(
        slotEls,
        { opacity: 1, scale: 1, y: 0 },
        {
          opacity: 0,
          scale: 0.88,
          y: -10,
          duration,
          stagger,
          ease: EASE_TRANSFORM,
          onComplete: finish,
        }
      );
    }
    if (gridEls.length > 0) {
      gsap.set(gridEls, { transformOrigin: "50% 50%", y: 0 });
      gsap.to(gridEls, {
        opacity: 0,
        scale: 0.82,
        y: 0,
        duration,
        stagger,
        ease: EASE_TRANSFORM,
        onComplete: finish,
      });
    }
  });
}
/** 飞回列表扁平化，用于渲染；每项含 batchId、slotIndex */
const flyingBackList = computed(() =>
  flyingBackBatches.value.flatMap((b) =>
    b.list.map((item) => ({ ...item, batchId: b.id, slotIndex: b.slotIndex }))
  )
);

/** 槽内字母是否隐藏（飞回未结束时该索引及之后隐藏） */
function isSlotContentHidden(slotIndex) {
  return flyingBackBatches.value.some((b) => slotIndex >= b.slotIndex);
}

/** 飞回时该槽是否移出流（不占位、不显示空白块） */
function isSlotOutOfFlow(slotIndex) {
  return flyingBackBatches.value.some((b) => slotIndex >= b.slotIndex);
}

/** 该格子是否正在飞入（占位、不可点） */
function isTileFlying(row, col) {
  return flyingLetters.value.some((f) => f.pendingRow === row && f.pendingCol === col);
}

const flatGrid = computed(() => grid.value.flat());
const selectedLetters = computed(() => selectedTiles.value.map(({ tile }) => tile));

/** 与 css :root --letter-grid-cell-size 一致：(wrap−2×padding − 3×gap) / 4 */
const LETTER_GRID_WRAP_DESIGN = 466;
const LETTER_GRID_PADDING_DESIGN = 12;
const SLOT_GAP = 6;
const SLOT_TILE_W =
  (LETTER_GRID_WRAP_DESIGN - 2 * LETTER_GRID_PADDING_DESIGN - 3 * SLOT_GAP) / 4;
const MIDDLE_MAX_W = 722;
/** 目标槽数（移出时用 effectiveNumSlots，与 updateSlotPositions 一致） */
const slotScaleTarget = computed(() => {
  const N = selectedLetters.value.length;
  const batches = flyingBackBatches.value;
  const n =
    batches.length > 0 ? Math.min(...batches.map((b) => b.slotIndex)) : N + flyingLetters.value.length;
  if (n === 0) return 1;
  const total = n * SLOT_TILE_W + (n - 1) * SLOT_GAP;
  return Math.min(1, MIDDLE_MAX_W / total);
});
/** 当前槽缩放，由 RAF 向 slotScaleTarget 插值，实现与移入一致的动画 */
/** 与 .word-slots 上 --slot-scale 同步；仅用普通变量，由 slotRafLoop 与 DOM 同步更新 */
let slotScaleRuntime = 1;

/** 槽位当前插值位置（wrap 相对），由 RAF 更新并直接写 DOM */
const slotCurrentPositions = [];
/** expo.out 风格：1 - 2^(-10*t)，时间常数约 250ms，前快后慢 */
const SLOT_EXPO_TIME_MS = 250;
let slotRafId = 0;
let slotRafLastTime = 0;

/** 计算目标并写 DOM；deltaMs 为数字时用 expo.out 风格插值，为 true 时直接 snap（首帧防闪） */
function updateSlotPositions(deltaMs) {
  const wrapEl = wordSlotsWrapRef.value;
  if (!wrapEl) return;
  const wrapRect = wrapEl.getBoundingClientRect();
  const N = selectedLetters.value.length;
  const batches = flyingBackBatches.value;
  const effectiveNumSlots =
    batches.length > 0
      ? Math.min(...batches.map((b) => b.slotIndex))
      : N + flyingLetters.value.length;
  if (N === 0) {
    slotCurrentPositions.length = 0;
    return;
  }
  while (slotCurrentPositions.length < N) {
    const idx = slotCurrentPositions.length;
    const layoutSlots = batches.length > 0 ? effectiveNumSlots : N + flyingLetters.value.length;
    const slotIdx = batches.length > 0 && idx >= effectiveNumSlots ? effectiveNumSlots - 1 : idx;
    const r = getScaledSlotRect(wrapRect, layoutSlots, slotIdx);
    if (!r) break;
    slotCurrentPositions.push({
      x: r.left - wrapRect.left,
      y: r.top - wrapRect.top,
    });
  }
  while (slotCurrentPositions.length > N) slotCurrentPositions.pop();
  const targets = [];
  for (let i = 0; i < N; i++) {
    const outOfFlow = batches.some((b) => i >= b.slotIndex);
    if (outOfFlow) {
      targets.push({ x: 0, y: 0, w: 0, h: 0 });
      continue;
    }
    const r = getScaledSlotRect(wrapRect, effectiveNumSlots, i);
    if (!r) break;
    targets.push({
      x: r.left - wrapRect.left,
      y: r.top - wrapRect.top,
      w: r.width,
      h: r.height,
    });
  }
  const dt = deltaMs === true ? 1 : (deltaMs || 16) / SLOT_EXPO_TIME_MS;
  const factor = deltaMs === true ? 1 : 1 - Math.pow(2, -10 * Math.min(dt, 1));
  for (let i = 0; i < N; i++) {
    const outOfFlow = batches.some((b) => i >= b.slotIndex);
    const el = wordSlotRefs.value[i];
    if (outOfFlow) {
      /* 不把 out-of-flow 槽设为 0 尺寸，否则快速连续点击时后续 batch 的 getBoundingClientRect() 会拿到 0×0，飞字失去背景和高度 */
      continue;
    }
    const cur = slotCurrentPositions[i];
    const tgt = targets[i];
    if (!cur || !tgt) continue;
    cur.x += (tgt.x - cur.x) * factor;
    cur.y += (tgt.y - cur.y) * factor;
    if (el) {
      el.style.left = cur.x + "px";
      el.style.top = cur.y + "px";
      el.style.width = tgt.w + "px";
      el.style.height = tgt.h + "px";
    }
  }
}

function findFirstOwnedTreasureSlotIndex(treasureId) {
  const arr = ownedTreasures.value;
  for (let i = 0; i < arr.length; i += 1) {
    if (arr[i]?.treasureId === treasureId) return i;
  }
  return -1;
}

function slotRafLoop() {
  slotRafId = requestAnimationFrame(slotRafLoop);
  const now = performance.now();
  const delta = slotRafLastTime ? Math.min(now - slotRafLastTime, 50) : 0;
  slotRafLastTime = now;
  updateSlotPositions(delta);
  const dt = delta === 0 ? 1 : delta / SLOT_EXPO_TIME_MS;
  const factor = delta === 0 ? 1 : 1 - Math.pow(2, -10 * Math.min(dt, 1));
  slotScaleRuntime += (slotScaleTarget.value - slotScaleRuntime) * factor;
  const scaleRoot = wordSlotsScaleRootRef.value;
  if (scaleRoot) scaleRoot.style.setProperty("--slot-scale", String(slotScaleRuntime));
}

/** 计算「第 numSlots 个 slot」在 numSlots 缩放下的视口矩形（像素），用于飞字目标；slotIndex 为 0..numSlots-1 */
function getScaledSlotRect(wrapRect, numSlots, slotIndex) {
  if (numSlots <= 0) return null;
  const rpx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx").trim()) || 1;
  const totalDesign = numSlots * SLOT_TILE_W + (numSlots - 1) * SLOT_GAP;
  const scale = Math.min(1, MIDDLE_MAX_W / totalDesign);
  const slotVisualSizePx = SLOT_TILE_W * scale * rpx;
  const totalVisualWidthPx = totalDesign * scale * rpx;
  const left = wrapRect.left + (wrapRect.width - totalVisualWidthPx) / 2 + slotIndex * (SLOT_TILE_W + SLOT_GAP) * scale * rpx;
  const top = wrapRect.top + (wrapRect.height - slotVisualSizePx) / 2;
  return { left, top, width: slotVisualSizePx, height: slotVisualSizePx };
}

/** 用于提交按钮的「即将生效」单词：飞入中视为已加入，飞回中视为已移除，不等到动画结束 */
const effectiveWordForSubmit = computed(() => {
  let letters = selectedTiles.value.map(({ tile }) => tile.letter.toLowerCase());
  const batches = flyingBackBatches.value;
  if (batches.length > 0) {
    const minSlot = Math.min(...batches.map((b) => b.slotIndex));
    letters = letters.slice(0, minSlot);
  }
  flyingLetters.value.forEach((f) => {
    letters.push(f.letter.toLowerCase());
  });
  return letters.join("");
});

/** 若包含 `?`，返回首个可匹配的真实单词（小写）；无匹配则为 null。 */
const resolvedWordForSubmit = computed(() => resolveWordPattern(effectiveWordForSubmit.value, "?"));

/** 当前串若提交将触发 Boss 软违规时，Boss 条持续轻脉冲提示 */
const bossTapeSoftPreview = computed(() => {
  if (!dictionaryReady.value) return false;
  if (scoringAnimating.value) return false;
  const slug = activeBossSlug.value;
  if (!slug) return false;
  const res = resolvedWordForSubmit.value;
  if (res == null) return false;
  const eff = effectiveWordForSubmit.value;
  if (!eff || eff.length < 1) return false;
  const judgedLen = getJudgedLengthTableLenForOwnedVouchers(eff.length, ownedVoucherIds.value);
  const soft = evaluateBossSoftWordViolation({
    slug,
    wordLen: judgedLen,
    resolvedWord: res,
    getWordDefinition,
    usedLengthsThisLevel: usedWordLengthsThisBoss.value,
    mouthLockedLength: mouthLockedLengthBoss.value,
    clubRequiredKey: clubRequiredKeyBoss.value || "",
  });
  return soft.violated;
});

/**
 * 分数×倍率面板用：与 effectiveWordForSubmit 同步的 tile 序列（飞入即算入、飞回截断即算移除）
 */
const effectiveFormulaTiles = computed(() => {
  let tiles = selectedTiles.value.map(({ tile }) => tile);
  const batches = flyingBackBatches.value;
  if (batches.length > 0) {
    const minSlot = Math.min(...batches.map((b) => b.slotIndex));
    tiles = tiles.slice(0, minSlot);
  }
  for (const f of flyingLetters.value) {
    const t = grid.value[f.pendingRow]?.[f.pendingCol];
    if (t) tiles.push(t);
  }
  return tiles;
});

/**
 * result-formula 预览是否可用：合法词且词典就绪（与 canSubmit 的词典/合法性前提一致）。
 * 预览数字本身只用「词长 × 每字基础分」与「词长倍率」，不调用整词计分，避免混入单字母稀有度分/倍率或 tile.letterMultBonus。
 */
const resultFormulaBasePreviewActive = computed(() => {
  const tiles = effectiveFormulaTiles.value;
  if (tiles.length === 0) return false;
  return dictionaryReady.value && resolvedWordForSubmit.value != null;
});

/** 仅当当前是有效词时允许提交等 */
const effectiveWordValid = computed(() => {
  return resolvedWordForSubmit.value != null;
});

/**
 * 词槽与已选棋盘格展示：当前串在词典中有唯一解析时，把 `?` 万能格显示为解析字母，稀有度与同字母普通格一致。
 * 飞入中 pattern 与槽位不对齐，保持 `?`；飞回截断时用截断串的解析对齐前段槽位。
 */
const wordSlotTilePresentations = computed(() => {
  const orderTiles = selectedTiles.value.map(({ tile }) => tile);
  if (flyingLetters.value.length > 0) return orderTiles;
  const batches = flyingBackBatches.value;
  const minSlot = batches.length > 0 ? Math.min(...batches.map((b) => b.slotIndex)) : orderTiles.length;
  const res = resolvedWordForSubmit.value;
  const eff = effectiveWordForSubmit.value;
  if (!res || eff.length !== res.length) return orderTiles;
  let pos = 0;
  return orderTiles.map((tile, idx) => {
    if (idx >= minSlot) return tile;
    const frag = String(tile?.letter ?? "").toLowerCase();
    const start = pos;
    pos += frag.length;
    if (!isWildcardMaterialTile(tile) || frag !== "?") return tile;
    const ch = res[start];
    if (!ch || ch < "a" || ch > "z") return tile;
    const letter = ch === "q" ? "Qu" : ch.toUpperCase();
    const rarity = getRarityForLetter(ch);
    return {
      ...tile,
      letter,
      rarity,
      baseScore: getBaseScoreForRarity(rarity, rarityLevelsByRarity.value),
    };
  });
});

/** 已选格在棋盘上与词槽同步展示解析后的字母/稀有度 */
const gridTileLetterForRender = computed(() => {
  const m = new Map();
  selectedTiles.value.forEach(({ tile }, i) => {
    m.set(tile.id, wordSlotTilePresentations.value[i]?.letter ?? tile.letter);
  });
  return m;
});
const gridTileRarityForRender = computed(() => {
  const m = new Map();
  selectedTiles.value.forEach(({ tile }, i) => {
    m.set(tile.id, wordSlotTilePresentations.value[i]?.rarity ?? tile.rarity);
  });
  return m;
});

let tileLongPressTimer = null;
let tileLongPressCleanup = null;
const TILE_LONG_PRESS_MS = 480;
const TILE_LONG_PRESS_MOVE_PX = 14;

function clearTileLongPressArm() {
  if (tileLongPressTimer != null) {
    clearTimeout(tileLongPressTimer);
    tileLongPressTimer = null;
  }
  if (tileLongPressCleanup) {
    tileLongPressCleanup();
    tileLongPressCleanup = null;
  }
}

function canOpenTileDetail() {
  if (dictFatalError.value) return false;
  if (transitionBusy.value) return false;
  if (showSettlement.value) return false;
  if (scoringAnimating.value) return false;
  if (gridRefillAnimating.value) return false;
  return true;
}

/** @param {unknown} el */
function tileOriginRectFromElement(el) {
  const node = refToDom(el) ?? (el instanceof HTMLElement ? el : null);
  if (!node || typeof node.getBoundingClientRect !== "function") return null;
  const r = node.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function openTileDetail(payload, originRect = null) {
  if (!payload) return;
  tileDetailPayload.value = payload;
  const o = originRect;
  tileDetailOriginRect.value =
    o &&
    typeof o.left === "number" &&
    typeof o.top === "number" &&
    o.width > 2 &&
    o.height > 2
      ? { left: o.left, top: o.top, width: o.width, height: o.height }
      : null;
}

function closeTileDetail() {
  tileDetailPayload.value = null;
  tileDetailOriginRect.value = null;
  suppressTilePrimaryClick.value = false;
}

function buildTileDetailPayloadFromTile(tile) {
  if (!tile) return null;
  const id = tile.id;
  let letter = tile.letter;
  let rarity = tile.rarity;
  if (id != null) {
    if (gridTileLetterForRender.value.has(id)) letter = gridTileLetterForRender.value.get(id);
    if (gridTileRarityForRender.value.has(id)) rarity = gridTileRarityForRender.value.get(id);
  }
  return {
    letter: letter ?? tile.letter,
    rarity: rarity ?? tile.rarity,
    tileScoreBonus: Math.max(0, Math.floor(Number(tile.tileScoreBonus) || 0)),
    tileMultBonus: Math.max(0, Math.round(Number(tile.letterMultBonus) || 0)),
    materialId: tile.materialId ?? null,
    materialScoreBonus: Math.max(0, Math.floor(Number(tile.materialScoreBonus) || 0)),
    materialMultBonus: Number(tile.materialMultBonus) || 0,
    accessoryId: tile.accessoryId ?? null,
    foilOverlay: tile.foilOverlay === true,
  };
}

/** @param {Record<string, unknown>} card 牌库 multiset 牌张 */
function buildTileDetailPayloadFromDeckCard(card) {
  if (!card || typeof card !== "object") return null;
  const raw = deckCardRaw(card);
  const isWc = card.isWildcard === true;
  const letter = isWc ? "?" : raw === "q" ? "Qu" : String(raw || "e").toUpperCase();
  const rarity =
    card.rarity != null && String(card.rarity).trim() !== ""
      ? String(card.rarity)
      : getRarityForLetter(isWc ? "e" : raw || "a");
  return {
    letter,
    rarity: String(rarity || "common"),
    tileScoreBonus: Math.max(0, Math.floor(Number(card.tileScoreBonus) || 0)),
    tileMultBonus: Math.max(0, Math.round(Number(card.letterMultBonus) || 0)),
    materialId: isWc ? "wildcard" : card.materialId ?? null,
    materialScoreBonus: Math.max(0, Math.floor(Number(card.materialScoreBonus) || 0)),
    materialMultBonus: Number(card.materialMultBonus) || 0,
    accessoryId: card.accessoryId ?? null,
    foilOverlay: false,
  };
}

function buildWordSlotTileDetailPayload(slotIndex) {
  const order = selectedOrder.value;
  if (slotIndex < 0 || slotIndex >= order.length) return null;
  const { row, col } = order[slotIndex];
  const tile = grid.value[row]?.[col];
  const pres = wordSlotTilePresentations.value[slotIndex];
  if (!tile || !pres) return null;
  return buildTileDetailPayloadFromTile({ ...tile, ...pres });
}

function armTileLongPressFromPointer(e, openFn) {
  clearTileLongPressArm();
  const startX = e.clientX;
  const startY = e.clientY;
  const move = (ev) => {
    if (tileLongPressTimer == null) return;
    if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > TILE_LONG_PRESS_MOVE_PX) {
      clearTileLongPressArm();
    }
  };
  const up = () => {
    clearTileLongPressArm();
  };
  tileLongPressCleanup = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
  };
  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);

  tileLongPressTimer = window.setTimeout(() => {
    tileLongPressTimer = null;
    if (tileLongPressCleanup) {
      tileLongPressCleanup();
      tileLongPressCleanup = null;
    }
    openFn();
  }, TILE_LONG_PRESS_MS);
}

function onGridTileContextMenu(e, row, col, tile) {
  clearTileLongPressArm();
  if (!canOpenTileDetail()) return;
  if (!tile || tile.selected || isTileFlying(row, col)) return;
  const p = buildTileDetailPayloadFromTile(tile);
  const origin =
    tileOriginRectFromElement(e?.currentTarget) ?? tileOriginRectFromElement(getGridTileElByIndex(row * COLS + col));
  if (p) openTileDetail(p, origin);
}

function onGridTileDetailPointerDown(e, row, col, tile) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (!tile || dictFatalError.value) return;
  if (transitionBusy.value || showShop.value || showSettlement.value) return;
  if (scoringAnimating.value || gridRefillAnimating.value) return;
  if (tile.selected || isTileFlying(row, col)) return;
  armTileLongPressFromPointer(e, () => {
    if (!canOpenTileDetail()) return;
    const t = grid.value[row]?.[col];
    if (!t || t.selected || isTileFlying(row, col)) return;
    const p = buildTileDetailPayloadFromTile(t);
    if (p) {
      suppressTilePrimaryClick.value = true;
      const origin = tileOriginRectFromElement(getGridTileElByIndex(row * COLS + col));
      openTileDetail(p, origin);
    }
  });
}

function onWordSlotContextMenu(e, i) {
  clearTileLongPressArm();
  if (!canOpenTileDetail()) return;
  const p = buildWordSlotTileDetailPayload(i);
  const slotEl = wordSlotRefs.value[i];
  const inner = slotEl?.querySelector?.(".word-slot-content");
  const origin = tileOriginRectFromElement(inner ?? slotEl);
  if (p) openTileDetail(p, origin);
}

function onWordSlotDetailPointerDown(e, i) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (dictFatalError.value) return;
  if (transitionBusy.value || showShop.value || showSettlement.value) return;
  if (scoringAnimating.value) return;
  const order = selectedOrder.value;
  if (i < 0 || i >= order.length) return;
  armTileLongPressFromPointer(e, () => {
    if (!canOpenTileDetail()) return;
    const order2 = selectedOrder.value;
    if (i < 0 || i >= order2.length) return;
    const p = buildWordSlotTileDetailPayload(i);
    if (p) {
      suppressTilePrimaryClick.value = true;
      const slotEl = wordSlotRefs.value[i];
      const inner = slotEl?.querySelector?.(".word-slot-content");
      const origin = tileOriginRectFromElement(inner ?? slotEl);
      openTileDetail(p, origin);
    }
  });
}

function onDeckLayerBackdropClick() {
  if (deckStackExpandRaw.value != null) {
    closeDeckStackDetail();
    return;
  }
  showDeckLayer.value = false;
}

function openDeckStackDetail(stack, evt) {
  if (!stack || stack.isGhost) return;
  deckExpandFlipTl?.kill();
  deckExpandFlipTl = null;
  const btn = /** @type {HTMLElement | undefined} */ (evt?.currentTarget);
  deckExpandFlipSourceBtnRef.value = btn ?? null;
  deckExpandFlipFromRects.value = btn ? captureDeckStackPileRects(btn) : null;
  deckStackExpandRaw.value = stack.raw;
}

function closeDeckStackDetail() {
  if (deckStackExpandRaw.value == null) return;
  runDeckExpandLeaveFlip(() => {
    deckStackExpandRaw.value = null;
  });
}

function deckEntryKey(entry, idx) {
  if (entry.kind === "grid") return `g-${entry.row}-${entry.col}-${idx}`;
  return `d-${entry.raw}-${idx}`;
}

function deckEntryTileProps(entry) {
  if (entry.kind === "grid") {
    const t = grid.value[entry.row]?.[entry.col];
    if (!t?.letter) return null;
    const id = t.id;
    const letter =
      id != null && gridTileLetterForRender.value.has(id)
        ? gridTileLetterForRender.value.get(id)
        : t.letter;
    const rarity =
      id != null && gridTileRarityForRender.value.has(id)
        ? gridTileRarityForRender.value.get(id)
        : t.rarity;
    return {
      letter,
      rarity: String(rarity || "common"),
      materialId: t.materialId ?? null,
      accessoryId: t.accessoryId ?? null,
      tileScoreBonus: Math.max(0, Math.floor(Number(t.tileScoreBonus) || 0)),
      tileMultBonus: Math.max(0, Math.round(Number(t.letterMultBonus) || 0)),
    };
  }
  const card = entry.card;
  if (card && typeof card === "object") {
    const raw = deckCardRaw(card);
    const isWc = card.isWildcard === true;
    const letter = isWc ? "?" : raw === "q" ? "Qu" : String(raw || "e").toUpperCase();
    const rarity =
      card.rarity != null && String(card.rarity).trim() !== ""
        ? String(card.rarity)
        : getRarityForLetter(isWc ? "e" : raw || "a");
    return {
      letter,
      rarity: String(rarity || "common"),
      materialId: isWc ? "wildcard" : card.materialId ?? null,
      accessoryId: card.accessoryId ?? null,
      tileScoreBonus: Math.max(0, Math.floor(Number(card.tileScoreBonus) || 0)),
      tileMultBonus: Math.max(0, Math.round(Number(card.letterMultBonus) || 0)),
    };
  }
  const raw = entry.raw;
  const letter = raw === "q" ? "Qu" : raw === "?" ? "?" : String(raw).toUpperCase();
  return {
    letter,
    rarity: getRarityForLetter(raw),
    materialId: null,
    accessoryId: null,
    tileScoreBonus: 0,
    tileMultBonus: 0,
  };
}

function buildDeckMultisetTileDetailPayload(raw) {
  const r = String(raw ?? "").toLowerCase();
  const letter = r === "q" ? "Qu" : r === "?" ? "?" : r ? r.toUpperCase() : "?";
  return {
    letter,
    rarity: getRarityForLetter(r || "a"),
    tileScoreBonus: 0,
    tileMultBonus: 0,
    materialId: null,
    materialScoreBonus: 0,
    materialMultBonus: 0,
    accessoryId: null,
    foilOverlay: false,
  };
}

function resolveDeckStackEntryDetail(entry) {
  if (entry.kind === "grid") {
    const t = grid.value[entry.row]?.[entry.col];
    if (!t?.letter) return null;
    return buildTileDetailPayloadFromTile(t);
  }
  if (entry.kind === "deck" && entry.card && typeof entry.card === "object") {
    return buildTileDetailPayloadFromDeckCard(entry.card);
  }
  return buildDeckMultisetTileDetailPayload(entry.raw);
}

/** 本手词槽 `i` 对应的棋盘真实 tile（用于剪贴板等：与计分动画同步写回角标） */
function resolveRealSubmitTileForWordSlot(slotIndex, scoringTile = null) {
  const order = selectedOrder.value;
  if (Array.isArray(order) && slotIndex >= 0 && slotIndex < order.length) {
    const pos = order[slotIndex];
    if (pos && typeof pos.row === "number" && typeof pos.col === "number") {
      const t = grid.value[pos.row]?.[pos.col];
      if (t && typeof t === "object") return t;
    }
  }
  const id = scoringTile?.id;
  if (id == null) {
    // #region agent log
    fetch("http://127.0.0.1:7623/ingest/3382c565-2350-4795-bc82-3716661b9aea", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "487bb4" },
      body: JSON.stringify({
        sessionId: "487bb4",
        runId: "pre-fix",
        hypothesisId: "H5",
        location: "GamePanel.vue:resolveRealSubmitTileForWordSlot",
        message: "realTile null no id",
        data: { slotIndex, orderLen: order?.length ?? 0 },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return null;
  }
  const g = grid.value;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = g[r]?.[c];
      if (t && t.id === id) return t;
    }
  }
  // #region agent log
  fetch("http://127.0.0.1:7623/ingest/3382c565-2350-4795-bc82-3716661b9aea", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "487bb4" },
    body: JSON.stringify({
      sessionId: "487bb4",
      runId: "pre-fix",
      hypothesisId: "H5",
      location: "GamePanel.vue:resolveRealSubmitTileForWordSlot",
      message: "realTile null id not on grid",
      data: { slotIndex, scoringTileId: id },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return null;
}

function onDeckExpandedTileClick(entry, e) {
  if (suppressTilePrimaryClick.value) {
    suppressTilePrimaryClick.value = false;
    return;
  }
  if (!canOpenTileDetail()) return;
  const p = resolveDeckStackEntryDetail(entry);
  const hit = e?.currentTarget;
  const face = hit?.querySelector?.(".deck-expand-face-tile");
  const origin = tileOriginRectFromElement(face ?? hit);
  if (p) openTileDetail(p, origin);
}

function onDeckExpandedTileContextMenu(e, entry) {
  clearTileLongPressArm();
  if (!canOpenTileDetail()) return;
  const p = resolveDeckStackEntryDetail(entry);
  const hit = e?.currentTarget;
  const face = hit?.querySelector?.(".deck-expand-face-tile");
  const origin = tileOriginRectFromElement(face ?? hit);
  if (p) openTileDetail(p, origin);
}

function onDeckExpandedTileDetailPointerDown(e, entry) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (dictFatalError.value) return;
  if (!canOpenTileDetail()) return;
  armTileLongPressFromPointer(e, () => {
    if (!canOpenTileDetail()) return;
    const p = resolveDeckStackEntryDetail(entry);
    if (p) {
      suppressTilePrimaryClick.value = true;
      const hit = e?.currentTarget;
      const face = hit?.querySelector?.(".deck-expand-face-tile");
      const origin = tileOriginRectFromElement(face ?? hit);
      openTileDetail(p, origin);
    }
  });
}

function formatMultDisplay(m) {
  const n = Number(m);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  const s = n.toFixed(1);
  return s.endsWith(".0") ? String(Math.round(n)) : s;
}

const displayFormulaScore = computed(() => {
  if (clearWinLengthUpgradeFxActive.value) {
    return String(Math.max(0, Math.round(clearWinFxScoreValue.value)));
  }
  if (lastSubmitRarityFxActive.value) {
    return String(Math.max(0, Math.round(lastSubmitRarityFxScoreValue.value)));
  }
  if (scoringAnimating.value) return String(Math.max(0, Math.round(animScoreSum.value)));
  /** 预览：仅词长对应的每字基础分 × 字数（无单字母稀有度加分） */
  const tiles = effectiveFormulaTiles.value;
  if (tiles.length && resultFormulaBasePreviewActive.value) {
    const n = tiles.length;
    const Ltb = getJudgedLengthTableLenForOwnedVouchers(n, ownedVoucherIds.value);
    return String(n * getBaseScorePerLetterForWordLength(Ltb, lengthLevelsByLength.value));
  }
  return "0";
});

const displayFormulaMult = computed(() => {
  if (clearWinLengthUpgradeFxActive.value) {
    return formatMultDisplay(clearWinFxMultValue.value);
  }
  if (lastSubmitRarityFxActive.value) {
    return formatMultDisplay(lastSubmitRarityFxMultValue.value);
  }
  /** 记分/淡出等动画期间倍率面板只显示整数 */
  if (scoringAnimating.value) {
    const m = Number(animMultTotal.value);
    return String(Number.isFinite(m) ? Math.max(0, Math.round(m)) : 0);
  }
  /** 预览：仅词长倍率（无单字母倍率）；单字母倍率在计分动画中再累加显示 */
  const tiles = effectiveFormulaTiles.value;
  if (tiles.length && resultFormulaBasePreviewActive.value) {
    const n = tiles.length;
    const Ltb = getJudgedLengthTableLenForOwnedVouchers(n, ownedVoucherIds.value);
    const obs = getObservatoryLengthMultFactor(
      ownedVoucherIds.value,
      Ltb,
      maxSubmittedWordLengthSoFar.value,
    );
    return formatMultDisplay(getLengthMultiplier(Ltb, lengthLevelsByLength.value) * obs);
  }
  return "0";
});

const canSubmit = computed(() => {
  return (
    !showShop.value &&
    !showSettlement.value &&
    !transitionBusy.value &&
    dictionaryReady.value &&
    resolvedWordForSubmit.value != null &&
    remainingWords.value > 0 &&
    !scoringAnimating.value &&
    !gridRefillAnimating.value
  );
});

const canRemove = computed(() => {
  const nSelRaw = selectedOrder.value.length;
  const batches = flyingBackBatches.value;
  // 与提交按钮一致：飞回中的槽位视为“已移除”，即时参与可用态判断
  const nSelEffective =
    batches.length > 0 ? Math.min(...batches.map((b) => b.slotIndex)) : nSelRaw;
  const hasFlying = flyingLetters.value.length > 0;
  const cap = MAX_LETTERS_PER_REMOVAL + getRemovalLetterCapBonus(ownedVoucherIds.value);
  return (
    !showShop.value &&
    !showSettlement.value &&
    !transitionBusy.value &&
    remainingRemovals.value > 0 &&
    !scoringAnimating.value &&
    !gridRefillAnimating.value &&
    (nSelEffective > 0 || hasFlying) &&
    nSelEffective <= cap
  );
});

let toastClearTimer = null;
function showToast(msg, ms = 2000) {
  if (toastClearTimer) {
    clearTimeout(toastClearTimer);
    toastClearTimer = null;
  }
  toast.value = msg;
  toastPortalZ.value = bumpOverlayZ();
  toastClearTimer = setTimeout(() => {
    toast.value = "";
    toastClearTimer = null;
  }, ms);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function openStageSettlement() {
  disableSettlementLayerAnim.value = false;
  const moneyBefore = money.value;
  const clearReward = stageRewardYuan.value;
  const spareMoves = remainingWords.value;
  const cap = getEconomyInterestCap(ownedVoucherIds.value);
  const interest = computeWalletInterest(moneyBefore, cap);
  const total = clearReward + spareMoves + interest;
  settlementSnapshot.value = {
    moneyBefore,
    clearReward,
    spareMoves,
    interest,
    total,
  };
  animSettleClear.value = 0;
  animSettleSpare.value = 0;
  animSettleInterest.value = 0;
  animSettleTotal.value = 0;
  settlementContinueEnabled.value = false;
  showDeckLayer.value = false;
  showSettlement.value = true;
  await nextTick();
  await runSettlementIntro();
}

function runSettlementIntro() {
  return new Promise((resolve) => {
    if (settlementTl) {
      settlementTl.kill();
      settlementTl = null;
    }
    const card = settlementCardRef.value;
    const s = settlementSnapshot.value;
    if (!card || !s) {
      settlementContinueEnabled.value = true;
      resolve();
      return;
    }
    gsap.killTweensOf(card);
    const rows = settlementRowEls.value;
    for (const el of rows) {
      if (el) gsap.killTweensOf(el);
    }
    const continueBtn = settlementContinueBtnRef.value;
    if (continueBtn) gsap.killTweensOf(continueBtn);

    const rowSpecs = [
      {
        el: rows[0],
        anim: animSettleClear,
        count: s.clearReward,
        empty: s.clearReward === 0,
      },
      {
        el: rows[1],
        anim: animSettleSpare,
        count: s.spareMoves,
        empty: s.spareMoves === 0,
      },
      {
        el: rows[2],
        anim: animSettleInterest,
        count: s.interest,
        empty: s.interest === 0,
      },
      {
        el: rows[3],
        anim: animSettleTotal,
        count: s.total,
        empty: s.total === 0,
      },
    ];

    for (const { el } of rowSpecs) {
      if (el) gsap.set(el, { opacity: 0, y: 18 });
    }
    if (continueBtn) gsap.set(continueBtn, { opacity: 0, y: 18 });

    const tl = gsap.timeline({
      onComplete: () => {
        settlementTl = null;
        settlementContinueEnabled.value = true;
        resolve();
      },
    });
    settlementTl = tl;

    tl.fromTo(
      card,
      { opacity: 0, scale: 0.92, y: 24 },
      { opacity: 1, scale: 1, y: 0, duration: 0.42, ease: EASE_TRANSFORM },
    );

    const S = settlementTotalDollarCount(s);
    const G = settlementDollarGapCount(rowSpecs);
    const SPositiveRows = rowSpecs.filter((x) => Math.max(0, Math.round(Number(x.count) || 0)) > 0).length;
    let lastIdxWithDollars = -1;
    for (let ri = 0; ri < rowSpecs.length; ri++) {
      if (Math.max(0, Math.round(Number(rowSpecs[ri].count) || 0)) > 0) lastIdxWithDollars = ri;
    }
    const innerGap = G > 0 ? settlementDollarStepGap(S, G, SPositiveRows) : 0;
    const interPad = G === 0 && S > 0 ? settlementDollarStepGap(S, 0, SPositiveRows) : 0;
    const rowIntroDur = settlementRowIntroDuration(S);

    let firstRow = true;
    for (let i = 0; i < rowSpecs.length; i++) {
      const spec = rowSpecs[i];
      const { el, anim, count, empty } = spec;
      const n = Math.max(0, Math.round(Number(count) || 0));
      const targetOpacity = empty ? 0.42 : 1;
      const pos = firstRow ? ">-0.08" : ">";
      firstRow = false;
      if (el) {
        tl.fromTo(
          el,
          { opacity: 0, y: 18 },
          { opacity: targetOpacity, y: 0, duration: rowIntroDur, ease: EASE_TRANSFORM },
          pos,
        );
      }
      const padAfter =
        G === 0 &&
        S > 0 &&
        n > 0 &&
        (i < lastIdxWithDollars || (SPositiveRows === 1 && i === lastIdxWithDollars))
          ? interPad
          : 0;
      appendSettlementDollarBuild(tl, anim, count, el, innerGap, padAfter);
    }

    /* 最后一行 $ 播完后再入场，与 settle-row 同 easing / 时长节奏 */
    if (continueBtn) {
      tl.fromTo(
        continueBtn,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: rowIntroDur, ease: EASE_TRANSFORM },
        ">",
      );
    }
  });
}

async function runGridIntroAfterReset() {
  await nextTick();
  const stepY = measureGridTileStepY();
  for (let i = 0; i < ROWS * COLS; i++) {
    const el = gridTileRefs.value[i];
    if (!el) continue;
    const row = Math.floor(i / COLS);
    gsap.killTweensOf(el);
    gsap.set(el, { x: 0, y: -(row + 2.2) * stepY, opacity: 0.55 });
  }
  gridIntroDone.value = true;
  await new Promise((r) => requestAnimationFrame(r));
  gridRefillAnimating.value = true;
  await runGridDropAnimation(null, { initial: true });
  gridRefillAnimating.value = false;
  applyCeruleanBellAfterGridStable();
  nextTick(() => updateSlotPositions(true));
}

/**
 * 结算后继续：钱包数字从 start 滚到 end（仅展示）；入账在 end>start 时于动画开始前即写入 money
 * @param {number} start
 * @param {number} end
 */
function playWalletHeaderGainAnim(start, end, elOverride = null) {
  return new Promise((resolve) => {
    if (walletGainTl) {
      walletGainTl.kill();
      walletGainTl = null;
    }
    const el = elOverride ?? headerWalletMarksRef.value;
    if (end <= start) {
      money.value = end;
      walletHeaderDisplayOverride.value = null;
      if (el) gsap.set(el, { scale: 1 });
      resolve();
      return;
    }

    money.value = end;
    walletHeaderDisplayOverride.value = start;
    const o = { v: start };

    walletGainTl = gsap.timeline({
      onComplete: () => {
        walletGainTl = null;
        walletHeaderDisplayOverride.value = null;
        if (el) gsap.set(el, { scale: 1 });
        resolve();
      },
    });

    walletGainTl.to(
      o,
      {
        v: end,
        duration: 0.78,
        ease: EASE_TRANSFORM,
        onUpdate: () => {
          walletHeaderDisplayOverride.value = Math.round(o.v);
        },
      },
      0,
    );

    if (el) {
      gsap.killTweensOf(el, "scale");
      gsap.set(el, { transformOrigin: "50% 50%", scale: 1 });
      walletGainTl.fromTo(
        el,
        { scale: 1 },
        { scale: 1.18, duration: 0.22, ease: EASE_TRANSFORM },
        0,
      );
      walletGainTl.to(el, { scale: 1, duration: 0.6, ease: EASE_TRANSFORM }, 0.1);
    }
  });
}

/** 结算点「继续」后：左上角关卡格高亮 + 缩放/回弹，提示已进入下一关 */
function playLevelAdvanceHeaderFx() {
  return new Promise((resolve) => {
    const el = levelTitleBoxRef.value;
    if (!el) {
      resolve();
      return;
    }
    if (levelAdvanceFxTl) {
      levelAdvanceFxTl.kill();
      levelAdvanceFxTl = null;
    }
    gsap.killTweensOf(el, "scale,rotation,boxShadow,filter");
    const shadowDefault = "0 2px 8px rgba(0, 0, 0, 0.08)";
    const shadowGlow =
      "0 0 0 3px rgba(237, 194, 46, 0.55), 0 4px 18px rgba(237, 194, 46, 0.3)";
    gsap.set(el, {
      transformOrigin: "50% 50%",
      scale: 1,
      rotation: 0,
      boxShadow: shadowDefault,
      filter: "brightness(1)",
    });

    levelAdvanceFxTl = gsap.timeline({
      onComplete: () => {
        levelAdvanceFxTl = null;
        gsap.set(el, { clearProps: "boxShadow,filter" });
        gsap.set(el, { scale: 1, rotation: 0 });
        resolve();
      },
    });

    levelAdvanceFxTl.fromTo(
      el,
      { scale: 1, rotation: 0 },
      {
        scale: 1.14,
        rotation: -2.5,
        boxShadow: shadowGlow,
        filter: "brightness(1.09)",
        duration: 0.34,
        ease: EASE_TRANSFORM,
      },
      0,
    );
    levelAdvanceFxTl.to(
      el,
      {
        scale: 1,
        rotation: 0,
        boxShadow: shadowDefault,
        filter: "brightness(1)",
        duration: 0.58,
        ease: EASE_TRANSFORM,
      },
      0.2,
    );
  });
}

async function onSettlementContinue(event) {
  if (transitionBusy.value) return;
  if (!settlementContinueEnabled.value) return;
  const s = settlementSnapshot.value;
  if (!s) return;

  if (settlementTl) {
    settlementTl.kill();
    settlementTl = null;
  }

  // 商店切换要求在转场“覆盖满屏”时刻就完成切换，
  // 禁用结算层离场动画，避免 reveal 时仍残留结算层。
  disableSettlementLayerAnim.value = true;

  transitionBusy.value = true;
  const startMoney = money.value;
  const endMoney = startMoney + s.total;

  const playFx = irisTransition?.play;
  if (typeof playFx === "function") {
    await playFx(event, {
      onCovered: () => {
        showSettlement.value = false;
        settlementSnapshot.value = null;
        settlementContinueEnabled.value = false;
        resetDeckAfterStageEnd();
        showShop.value = true;
      },
    });
  } else {
    showSettlement.value = false;
    settlementSnapshot.value = null;
    settlementContinueEnabled.value = false;
    resetDeckAfterStageEnd();
    showShop.value = true;
  }

  await nextTick();
  transitionBusy.value = false;
  const shopWalletEl = shopPanelRef.value?.getWalletEl?.();
  await playWalletHeaderGainAnim(startMoney, endMoney, shopWalletEl);
}

function openGameTreasureDetail(ti, slot, ev) {
  if (!slot) return;
  const el = ev?.currentTarget ?? null;
  treasureDetail.value = {
    kind: "owned",
    slotIndex: ti,
    treasure: slot,
    originRect: treasureOriginRectFromEl(el),
  };
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

function onGameOwnedDragStart(slotIndex, e) {
  if (transitionBusy.value || showShop.value || showSettlement.value) {
    e.preventDefault();
    return;
  }
  const slot = ownedTreasures.value[slotIndex];
  if (!slot) {
    e.preventDefault();
    return;
  }
  gameOwnedDragActive.value = true;
  gameOwnedDragCurrentIndex.value = slotIndex;
  gameOwnedDragMoved.value = false;
  gameOwnedDragDroppedInside.value = false;
  gameOwnedDragPreview.value = [...ownedTreasures.value];
  gameOwnedDragKeySnapshot.value = [...gameOwnedKeyOrder.value];
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.dropEffect = "move";
    try {
      e.dataTransfer.setData("text/plain", String(slotIndex));
    } catch {
      // no-op
    }
  }
}

function onGameOwnedDragOver(index, e) {
  if (!gameOwnedDragActive.value || !gameOwnedDragPreview.value) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  const from = gameOwnedDragCurrentIndex.value;
  if (index === from) return;
  gameOwnedDragPreview.value = swapArrayItems(gameOwnedDragPreview.value, from, index);
  gameOwnedKeyOrder.value = swapArrayItems(gameOwnedKeyOrder.value, from, index);
  gameOwnedDragCurrentIndex.value = index;
  gameOwnedDragMoved.value = true;
}

function onGameOwnedDrop(index, e) {
  if (!gameOwnedDragActive.value || !gameOwnedDragPreview.value) return;
  e.preventDefault();
  const from = gameOwnedDragCurrentIndex.value;
  if (index !== from) {
    gameOwnedDragPreview.value = swapArrayItems(gameOwnedDragPreview.value, from, index);
    gameOwnedKeyOrder.value = swapArrayItems(gameOwnedKeyOrder.value, from, index);
    gameOwnedDragCurrentIndex.value = index;
    gameOwnedDragMoved.value = true;
  }
  ownedTreasures.value = [...gameOwnedDragPreview.value];
  gameOwnedDragDroppedInside.value = true;
}

function onGameOwnedDragEnd() {
  if (!gameOwnedDragActive.value) return;
  // 未在槽位落下时：回到原顺序（TransitionGroup move 动画回弹）
  if (!gameOwnedDragDroppedInside.value && gameOwnedDragKeySnapshot.value) {
    gameOwnedKeyOrder.value = [...gameOwnedDragKeySnapshot.value];
  }
  gameOwnedDragPreview.value = null;
  gameOwnedDragKeySnapshot.value = null;
  gameOwnedDragActive.value = false;
  gameOwnedDragCurrentIndex.value = -1;
  gameOwnedDragDroppedInside.value = false;
  setTimeout(() => {
    gameOwnedDragMoved.value = false;
  }, 0);
}

function onGameOwnedSlotClick(index, slot, ev) {
  if (gameOwnedDragMoved.value) return;
  openGameTreasureDetail(index, slot, ev);
}

/** 与 ShopPanel / 棋盘 letter-gem 的 gem-* 一致 */
function treasureGemClass(rarity) {
  if (rarity === "epic") return "gem-epic";
  if (rarity === "legendary") return "gem-legendary";
  if (rarity === "common") return "gem-common";
  return "gem-rare";
}

/** 货架 108 参考格：emoji 字号与格边长的比（与 css @container treasure-cell 中 42/108 一致） */
const TREASURE_FRAME_EMOJI_RATIO = 42 / 108;

/** 购买后：克隆详情中的框飞到宝藏槽；起点以详情内 `.shop-treasure-frame` 的视口矩形为准（不从货架取位） */
async function animateTreasureFrameFly(fromFrameEl, toTarget) {
  if (!fromFrameEl || !toTarget) return;
  const from = fromFrameEl.getBoundingClientRect();
  const to =
    typeof toTarget.getBoundingClientRect === "function"
      ? toTarget.getBoundingClientRect()
      : /** @type {DOMRect} */ (toTarget);
  const clone = fromFrameEl.cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  clone.classList.remove("shop-treasure-frame--detail");
  clone.classList.add("treasure-purchase-fly-clone");

  gsap.killTweensOf(clone);
  gsap.set(clone, { clearProps: "transform" });

  Object.assign(clone.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: "0",
    zIndex: "9999",
    pointerEvents: "none",
    boxSizing: "border-box",
    willChange: "left, top, width, height",
  });

  document.body.appendChild(clone);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const emojiEl = clone.querySelector(".shop-treasure-emoji");
  const fs0 = TREASURE_FRAME_EMOJI_RATIO * from.width;
  const fs1 = TREASURE_FRAME_EMOJI_RATIO * to.width;

  await new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        clone.remove();
        resolve(undefined);
      },
    });
    tl.to(
      clone,
      {
        left: to.left,
        top: to.top,
        width: to.width,
        height: to.height,
        duration: 0.55,
        ease: EASE_TRANSFORM,
      },
      0,
    );
    if (emojiEl && Number.isFinite(fs0) && Number.isFinite(fs1) && fs0 > 1 && fs1 > 1) {
      gsap.set(emojiEl, { fontSize: fs0 });
      tl.to(
        emojiEl,
        {
          fontSize: fs1,
          duration: 0.55,
          ease: EASE_TRANSFORM,
        },
        0,
      );
    }
  });
}

/** 组合包：字母块从选项位飞入商店底部「查看牌库」按钮 */
async function animatePackTileFlyToDeck(fromEl, toTarget) {
  if (!fromEl || !toTarget) return;
  const from = fromEl.getBoundingClientRect();
  const to =
    typeof toTarget.getBoundingClientRect === "function"
      ? toTarget.getBoundingClientRect()
      : /** @type {DOMRect} */ (toTarget);
  const clone = fromEl.cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  clone.classList.add("pack-tile-purchase-fly-clone");
  clone.querySelectorAll("canvas").forEach((c) => c.remove());

  gsap.killTweensOf(clone);
  gsap.set(clone, { clearProps: "transform" });

  Object.assign(clone.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: "0",
    zIndex: "9999",
    pointerEvents: "none",
    boxSizing: "border-box",
    willChange: "left, top, width, height",
  });

  document.body.appendChild(clone);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const charEl = clone.querySelector(".letter-tile-char");
  const fs0 = from.width * 0.28;
  const fs1 = Math.max(10, to.width * 0.22);

  await new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        clone.remove();
        resolve(undefined);
      },
    });
    tl.to(
      clone,
      {
        left: to.left,
        top: to.top,
        width: to.width,
        height: to.height,
        duration: 0.55,
        ease: EASE_TRANSFORM,
      },
      0,
    );
    if (charEl && Number.isFinite(fs0) && Number.isFinite(fs1) && fs0 > 1 && fs1 > 1) {
      gsap.set(charEl, { fontSize: fs0 });
      tl.to(
        charEl,
        {
          fontSize: fs1,
          duration: 0.55,
          ease: EASE_TRANSFORM,
        },
        0,
      );
    }
  });
}

function grantRandomShopTreasure() {
  const ix = ownedTreasures.value.findIndex((s) => s == null);
  if (ix < 0) return false;
  const owned = ownedTreasureIdSet.value;
  const picks = rollDistinctShopTreasures(shopTreasurePool, owned, new Set(), 1, Math.random);
  if (!picks[0]) return false;
  const row = toShopOfferRows([picks[0]])[0];
  const slots = [...ownedTreasures.value];
  slots[ix] = {
    treasureId: row.treasureId,
    price: row.price,
    rarity: row.rarity,
    name: row.name,
    emoji: row.emoji,
    description: row.description,
    treasureAccessoryId: row.treasureAccessoryId ?? null,
  };
  ownedTreasures.value = slots;
  return true;
}

function buildSpellRuntimeContext() {
  return {
    grid,
    ROWS,
    COLS,
    rarityLevelsByRarity,
    lengthLevelsByLength,
    setRarityLevel,
    setWordLengthLevel,
    markTileAsWildcard,
    touchGrid,
    removeDeckLetterInstancesByRaws,
    remapTileFromRawLetter,
    money,
    ownedTreasures,
    upgradeLengthGroups: UPGRADE_LENGTH_GROUPS,
    grantRandomShopTreasure,
    showToast,
    setLastReplayableSpellId: (id) => {
      lastReplayableSpellId.value = id;
    },
  };
}

function cloneGridTileSnapshot(tile) {
  if (!tile || typeof tile !== "object" || !tile.letter) return null;
  try {
    return JSON.parse(JSON.stringify(tile));
  } catch {
    return null;
  }
}

/**
 * 法术候选格从抽牌堆抽样时，展示格可能落在「同字母的另一枚棋盘块」上；剪贴板/回形针等写在牌张上的**平面分/倍率角标**
 * 需从抽中的 `_deckCard` 盖到快照上。**不要**盖 `rarity` / `materialId` / 配饰等——否则会把牌堆里另一张同字母牌的外观套到当前格上（例如盘面 common i、候选却显示传说 i）。
 * @param {Record<string, unknown> | null} snap
 * @param {unknown} card
 */
function mergeDeckCardOntoSpellOfferTileSnapshot(snap, card) {
  if (!snap || !card || typeof card !== "object") return snap;
  const c = /** @type {Record<string, unknown>} */ (card);
  snap.tileScoreBonus = Math.max(0, Math.floor(Number(c.tileScoreBonus) || 0));
  snap.letterMultBonus = Math.max(0, Math.round(Number(c.letterMultBonus) || 0));
  if (c.isWildcard === true) {
    snap.isWildcard = true;
    snap.materialId = "wildcard";
    snap.letter = "?";
    snap.rarity = "common";
  }
  return snap;
}

/**
 * 10 格候选：从**当前抽牌堆** `deck`（玩家增强/调整后的 multiset）均匀随机（有放回）抽 10 枚牌张；
 * 每格落到棋盘上「字母 raw 与该牌张一致」的格子（随机其一，**优先尚未被其它候选格占用的棋盘格**，减少多格同坐标带来的歧义）。
 */
function buildSpellOfferSlots(rng = Math.random) {
  const g = grid.value;
  const CAP = SPELL_CANDIDATE_TILE_CAP;
  const d = Array.isArray(deck.value) ? deck.value : [];
  /** @type {{ row: number, col: number }[]} */
  const anyLetter = [];
  /** @type {Map<string, { row: number, col: number }[]>} */
  const byRaw = new Map();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = g[r][c];
      if (!t?.letter) continue;
      const pos = { row: r, col: c };
      anyLetter.push(pos);
      const raw = String(tileLetterToRaw(t) ?? "").toLowerCase();
      if (!raw) continue;
      if (!byRaw.has(raw)) byRaw.set(raw, []);
      byRaw.get(raw).push(pos);
    }
  }
  const usedCell = new Set();
  /**
   * @param {{ row: number, col: number }[]} candidates
   * @returns {{ row: number, col: number } | null}
   */
  const pickPosPreferUnused = (candidates) => {
    if (!Array.isArray(candidates) || !candidates.length) return null;
    const unused = candidates.filter((p) => p && !usedCell.has(`${p.row},${p.col}`));
    const pool = unused.length ? unused : candidates;
    const pick = pool[Math.floor(rng() * pool.length)];
    usedCell.add(`${pick.row},${pick.col}`);
    return pick;
  };

  /** @type {Array<{ key: string, row?: number, col?: number, tile?: unknown, empty?: boolean }>} */
  const slots = [];
  for (let i = 0; i < CAP; i++) {
    let row;
    let col;
    /** @type {unknown} */
    let deckCardForDisplay = null;
    if (d.length) {
      deckCardForDisplay = d[Math.floor(rng() * d.length)];
      const raw = String(deckCardRaw(deckCardForDisplay) ?? "").toLowerCase();
      const matches = raw && byRaw.has(raw) ? byRaw.get(raw) ?? [] : [];
      if (matches.length) {
        const pick = pickPosPreferUnused(matches);
        if (pick) {
          row = pick.row;
          col = pick.col;
        }
      }
      if (row == null && anyLetter.length) {
        const pick = pickPosPreferUnused(anyLetter);
        if (pick) {
          row = pick.row;
          col = pick.col;
        }
      }
      if (row == null) {
        slots.push({ key: `sp-${i}`, empty: true });
        continue;
      }
    } else if (anyLetter.length) {
      const pick = pickPosPreferUnused(anyLetter);
      if (!pick) {
        slots.push({ key: `sp-${i}`, empty: true });
        continue;
      }
      row = pick.row;
      col = pick.col;
    } else {
      slots.push({ key: `sp-${i}`, empty: true });
      continue;
    }
    const base = cloneGridTileSnapshot(g[row][col]);
    if (!base) {
      slots.push({ key: `sp-${i}`, empty: true });
      continue;
    }
    const tile =
      deckCardForDisplay && typeof deckCardForDisplay === "object"
        ? mergeDeckCardOntoSpellOfferTileSnapshot(base, deckCardForDisplay)
        : base;
    slots.push({
      key: `sp-${i}`,
      row,
      col,
      tile,
    });
  }
  return slots;
}

async function queueOrRunSpellTileAppearanceAnim(opts) {
  if (!showShop.value) {
    await runSpellTileAppearanceAnim(opts);
    return;
  }
  pendingSpellTileAppearanceAnim.value = opts;
}

/** 先播法术目标层关闭动画，再卸载（与商店 `TreasureDetailLayer.playClose` 一致） */
async function dismissSpellTargetLayer() {
  const layer = spellTargetLayerRef.value;
  if (layer && typeof layer.playClose === "function") {
    await layer.playClose();
  }
  spellTargetSession.value = null;
  const r = spellPackFulfillmentResolve;
  spellPackFulfillmentResolve = null;
  r?.();
}

async function onSpellTargetCancel() {
  await dismissSpellTargetLayer();
}

async function onSpellTargetConfirm(ordered, selectionSlotIndices) {
  const s = spellTargetSession.value;
  if (!s) return;
  const ctx = buildSpellRuntimeContext();
  const sid = String(s.effectiveSpellId ?? "");
  const g = grid.value;
  /** 与点选 1:1、允许重复坐标（`getSpellTileAppearanceTargets` 会去重，导致少格动效/少格快照） */
  const usePickSequenceAnim =
    sid === "cake" ||
    sid === "blaze" ||
    sid === "drinks" ||
    sid === "lightbulb" ||
    sid === "hammer" ||
    sid === "snowflake" ||
    sid === "flask" ||
    sid === "bard" ||
    sid === "mic" ||
    sid === "notification" ||
    sid === "phone" ||
    sid === "delete_back";
  const targets = usePickSequenceAnim
    ? buildSpellAnimPickTargetsFromOrdered(ordered, g)
    : getSpellTileAppearanceTargets(sid, ordered, g, ROWS, COLS);
  /** 与 `targets` 逐项对齐的候选槽下标（供弹层动效绑定），与 `ordered` 同步过滤 */
  const animSelectionSlotIndices =
    usePickSequenceAnim && Array.isArray(selectionSlotIndices) && selectionSlotIndices.length === ordered.length
      ? (() => {
          /** @type {number[]} */
          const ix = [];
          for (let i = 0; i < ordered.length; i++) {
            const p = ordered[i];
            const r = Number(p?.row);
            const c = Number(p?.col);
            if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
            const row = Math.trunc(r);
            const col = Math.trunc(c);
            if (!g[row]?.[col]?.letter) continue;
            const sli = selectionSlotIndices[i];
            if (typeof sli !== "number" || sli < 0) continue;
            ix.push(sli);
          }
          return ix;
        })()
      : selectionSlotIndices;
  const animOrderedForLayer = usePickSequenceAnim ? targets : ordered;

  if (!targets.length) {
    const beforeGrid = cloneGridDeep(g, ROWS, COLS);
    applySpell(ctx, s.purchasedSpellId, s.effectiveSpellId, ordered, {});
    const afterGrid = cloneGridDeep(grid.value, ROWS, COLS);
    const animTargets = diffGridAppearanceTargets(beforeGrid, afterGrid, ROWS, COLS);
    if (!animTargets.length) {
      await dismissSpellTargetLayer();
      return;
    }
    restoreGridFromDeepClone(grid, beforeGrid, ROWS, COLS);
    touchGrid();
    await nextTick();
    const oldSnaps0 = animTargets.map(({ row, col }) => cloneGridTileSnapshot(beforeGrid[row][col]));
    const newSnaps0 = animTargets.map(({ row, col }) => cloneGridTileSnapshot(afterGrid[row][col]));
    await queueOrRunSpellTileAppearanceAnim({
      spellId: sid,
      targets: animTargets,
      oldSnaps: oldSnaps0,
      newSnaps: newSnaps0,
      grid,
      touchGrid,
      getTileEl: (row, col) => getGridTileElByIndex(row * COLS + col),
      nextTick,
    });
    await sleep(500);
    await dismissSpellTargetLayer();
    return;
  }

  const oldSnaps = targets.map(({ row, col }) => cloneGridTileSnapshot(g[row][col]));
  applySpell(ctx, s.purchasedSpellId, s.effectiveSpellId, ordered, {});
  const newSnaps = targets.map(({ row, col }) => cloneGridTileSnapshot(g[row][col]));
  await nextTick();
  const playedOnOffer =
    (await spellTargetLayerRef.value?.playConfirmAppearanceAnim?.({
      spellId: sid,
      targets,
      oldSnaps,
      newSnaps,
      ordered: animOrderedForLayer,
      selectionSlotIndices: animSelectionSlotIndices,
    })) === true;
  if (!playedOnOffer) {
    await queueOrRunSpellTileAppearanceAnim({
      spellId: sid,
      targets,
      oldSnaps,
      newSnaps,
      grid,
      touchGrid,
      getTileEl: (row, col) => getGridTileElByIndex(row * COLS + col),
      nextTick,
    });
  }
  await sleep(500);
  await dismissSpellTargetLayer();
}

function clearOfferSlotAfterPurchase(t) {
  const pid = Number(t?.offerInstanceId);
  if (
    shopVoucherShelf.value &&
    shopVoucherShelf.value.kind === "offer" &&
    Number(shopVoucherShelf.value.offerInstanceId) === pid
  ) {
    shopVoucherShelf.value = makeEmptyVoucherSlot();
    return;
  }
  if (!Number.isFinite(pid)) return;
  const inPack = packOffers.value.some(
    (o) => o.kind === "offer" && o.offerInstanceId === pid,
  );
  if (inPack) {
    packOffers.value = packOffers.value.map((o) =>
      o.kind === "offer" && o.offerInstanceId === pid ? makeEmptyPackSlot() : o,
    );
  } else {
    shopOffers.value = shopOffers.value.map((o) =>
      o.kind === "offer" && o.offerInstanceId === pid ? makeEmptyShopSlot() : o,
    );
  }
}

async function onTreasurePurchase() {
  const d = treasureDetail.value;
  if (!d || d.kind !== "offer") return;
  const t = d.treasure;
  const pay = shopPriceForOffer(Number(t.price) || 0);

  if (t.offerType === "bundlePack") {
    if (money.value < pay) return;
    const layer = treasureDetailLayerRef.value;
    await layer?.playClose?.();
    treasureDetail.value = null;
    packPickSession.value = buildPackPickSessionFromBundle(t);
    return;
  }

  if (money.value < pay) return;

  if (t.offerType === "voucher") {
    const vid = String(t.voucherId ?? "");
    if (!vid) return;
    const layer = treasureDetailLayerRef.value;
    await layer?.playClose?.();
    money.value -= pay;
    clearOfferSlotAfterPurchase(t);
    ownedVoucherIds.value = [...ownedVoucherIds.value, vid];
    if (vid === "v_glyph_1" || vid === "v_glyph_2") {
      const tix = getGlyphPurchaseTargetLevelIndex(levelIndex.value, vid === "v_glyph_2");
      if (tix != null) {
        levelIndex.value = tix;
        const L = LEVELS[tix];
        if (L) {
          targetScore.value = resolveLevelTargetScore(L.id, "");
          activeBossSlug.value = "";
        }
        showToast(vid === "v_glyph_2" ? "已回到上两大关首小关" : "已回到上一大关首小关");
      }
    }
    treasureDetail.value = null;
    return;
  }

  if (t.offerType === "deckLetter" || t.offerType === "deckTile") {
    const layer = treasureDetailLayerRef.value;
    const fromEl = layer?.getFlyFrameEl?.();
    await layer?.playClose?.();
    money.value -= pay;
    clearOfferSlotAfterPurchase(t);
    treasureDetail.value = null;
    await fulfillPackInnerPurchase(t, fromEl ?? null);
    return;
  }

  if (t.offerType === "spell") {
    const spellId = String(t.spellId ?? "");
    if (!spellId) return;
    if (spellId === "restart" && !lastReplayableSpellId.value) {
      showToast("尚无可重播的法术");
      return;
    }
    const effectiveSpellId =
      spellId === "restart" ? String(lastReplayableSpellId.value) : spellId;
    const pickCount = resolveSpellPickCount(spellId, lastReplayableSpellId.value);

    if (pickCount <= 0) {
      const layer = treasureDetailLayerRef.value;
      await layer?.playClose?.();
      money.value -= pay;
      clearOfferSlotAfterPurchase(t);
      treasureDetail.value = null;
      const ctx0 = buildSpellRuntimeContext();
      const beforeGrid = cloneGridDeep(grid.value, ROWS, COLS);
      applySpell(ctx0, spellId, effectiveSpellId, [], {});
      const afterGrid = cloneGridDeep(grid.value, ROWS, COLS);
      const animTargets = diffGridAppearanceTargets(beforeGrid, afterGrid, ROWS, COLS);
      if (animTargets.length > 0) {
        restoreGridFromDeepClone(grid, beforeGrid, ROWS, COLS);
        touchGrid();
        await nextTick();
        const oldSnaps0 = animTargets.map(({ row, col }) => beforeGrid[row][col]);
        const newSnaps0 = animTargets.map(({ row, col }) => afterGrid[row][col]);
        await queueOrRunSpellTileAppearanceAnim({
          spellId: effectiveSpellId,
          targets: animTargets,
          oldSnaps: oldSnaps0,
          newSnaps: newSnaps0,
          grid,
          touchGrid,
          getTileEl: (row, col) => getGridTileElByIndex(row * COLS + col),
          nextTick,
        });
      }
      return;
    }

    const layer = treasureDetailLayerRef.value;
    await layer?.playClose?.();
    money.value -= pay;
    clearOfferSlotAfterPurchase(t);
    treasureDetail.value = null;

    const def = getSpellDefinition(spellId);
    spellTargetSession.value = {
      spellName: def?.name ?? t.name ?? "法术",
      spellIconClass: def?.iconClass ?? t.iconClass ?? "ri-magic-fill",
      spellDescription: t.description ?? def?.description ?? "",
      spellRarity: t.rarity ?? "rare",
      pickCount,
      offerSlots: buildSpellOfferSlots(),
      purchasedSpellId: spellId,
      effectiveSpellId,
    };
    return;
  }

  if (t.offerType === "upgrade") {
    if (shopUpgradeAnimating.value) return;
    shopUpgradeAnimating.value = true;
    const layer = treasureDetailLayerRef.value;
    try {
      await layer?.playClose?.();
      const isRarity = t.upgradeKind === "rarity";
      const beforeLevel = isRarity
        ? getOwnedRarityUpgradeDisplayLevel(t.rarityKey)
        : getOwnedUpgradeLevelByGroup(t.lengthGroupKey);
      money.value -= pay;
      if (isRarity) {
        const rk = String(t.rarityKey ?? "");
        ownedUpgrades.value.push({
          upgradeId: t.treasureId,
          upgradeKind: "rarity",
          rarityKey: rk,
          price: t.price,
        });
        const curLv = Math.max(1, Math.round(Number(rarityLevelsByRarity.value?.[rk])) || 1);
        setRarityLevel(rk, curLv + 1);
        refreshGridTileBaseScoresFromLevels();
      } else {
        ownedUpgrades.value.push({
          upgradeId: t.treasureId,
          upgradeKind: "length",
          lengthGroupKey: t.lengthGroupKey,
          lengthMin: t.lengthMin,
          lengthMax: t.lengthMax,
          lengthLabel: t.lengthLabel,
          lengthBadgeLabel: t.lengthBadgeLabel,
          price: t.price,
        });
        for (let len = t.lengthMin; len <= t.lengthMax; len++) {
          const curLv = Math.max(1, Math.round(Number(lengthLevelsByLength.value?.[len])) || 1);
          setWordLengthLevel(len, curLv + 1);
        }
      }
      clearOfferSlotAfterPurchase(t);
      treasureDetail.value = null;
      await shopPanelRef.value?.playUpgradeResult?.(
        isRarity
          ? {
              upgradeKind: "rarity",
              rarityKey: t.rarityKey,
              beforeLevel,
            }
          : {
              upgradeKind: "length",
              lengthLabel: t.lengthLabel,
              lengthMin: t.lengthMin,
              lengthMax: t.lengthMax,
              beforeLevel,
            },
      );
    } catch {
      shopUpgradeAnimating.value = false;
    }
    if (shopUpgradeAnimating.value) shopUpgradeAnimating.value = false;
    return;
  }

  const ix = ownedTreasures.value.findIndex((s) => s == null);
  if (ix < 0) return;

  const layer = treasureDetailLayerRef.value;
  const fromEl = layer?.getFlyFrameEl?.();
  await nextTick();
  const shop = shopPanelRef.value;
  let toTarget = showShop.value && shop ? (shop.getOwnedSlotEl?.(ix) ?? null) : null;

  /** 点击购买即开始关层动画，与飞入槽位并行，避免等飞完才消失 */
  const closePromise = layer?.playClose?.() ?? Promise.resolve();
  const flyPromise = fromEl && toTarget ? animateTreasureFrameFly(fromEl, toTarget) : Promise.resolve();

  await Promise.all([closePromise, flyPromise]);

  money.value -= pay;
  ownedTreasures.value[ix] = {
    treasureId: t.treasureId,
    price: pay,
    rarity: t.rarity,
    name: t.name,
    emoji: t.emoji,
    description: t.description,
    treasureAccessoryId: t.treasureAccessoryId ?? null,
  };
  clearOfferSlotAfterPurchase(t);
  treasureDetail.value = null;
}

async function onTreasureSell() {
  const d = treasureDetail.value;
  if (!d || d.kind !== "owned") return;
  const ix = d.slotIndex;
  const cur = ownedTreasures.value[ix];
  if (!cur) return;

  await treasureDetailLayerRef.value?.playClose?.();
  money.value += Math.floor(Number(cur.price) / 2);
  ownedTreasures.value[ix] = null;
  treasureDetail.value = null;
  if (activeBossSlug.value === "verdant_leaf") {
    verdantTreasureSold.value = true;
    clearVerdantDebuffsOnGrid();
  }
}

async function onShopReroll() {
  if (transitionBusy.value) return;
  if (!shopCanReroll.value) return;
  const cost = shopNextRerollCostDisplay.value;
  money.value -= cost;
  shopRerollsThisVisit.value += 1;
  shopOffers.value = rollShopStock();
  treasureDetail.value = null;
  packPickSession.value = null;
}

function onShopReorderOwned(nextSlots) {
  if (!Array.isArray(nextSlots)) return;
  if (nextSlots.length !== ownedTreasures.value.length) return;
  ownedTreasures.value = [...nextSlots];
}

async function onShopNextLevel(event) {
  if (transitionBusy.value) return;
  transitionBusy.value = true;

  const nextLevel = () => {
    // 只在“覆盖阶段”做 grid 清空/重置：让新关的 grid 先处在 pre-intro 隐藏态；
    // 入场动画本身要在转场结束后再启动，才能保证你能看见。
    gridIntroDone.value = false;
    if (levelIndex.value + 1 < LEVEL_COUNT) {
      levelIndex.value += 1;
      resetLevel(LEVELS[levelIndex.value], buildLevelResetRunOpts(LEVELS[levelIndex.value]));
    } else {
      showToast("已通过全部关卡！即将从第一关继续。");
      levelIndex.value = 0;
      resetLevel(LEVELS[0], buildLevelResetRunOpts(LEVELS[0]));
    }
    showShop.value = false;
  };

  const playFx = irisTransition?.play;
  if (typeof playFx === "function") {
    await playFx(event, { onCovered: nextLevel });
  } else {
    nextLevel();
  }

  await nextTick();
  await Promise.all([runGridIntroAfterReset(), playLevelAdvanceHeaderFx()]);
  transitionBusy.value = false;
}

/** 下落时长略长，便于看出加速过程 */
const GRID_DROP_DURATION = 0.52;
const GRID_FLIP_DURATION = 0.46;

/** 删除单词槽：依次消失，比提交略快 */
const REMOVE_SLOT_FADE_DURATION = 0.18;
const REMOVE_SLOT_STAGGER = 0.055;

/** 补牌前按 tile.id 记录视口矩形（须与 `snapshotGridCellsByTileId()` 同一时刻调用，保证 FLIP 一致） */
function captureGridRectsByTileId() {
  const map = new Map();
  const g = grid.value;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      const el = getGridTileElByIndex(idx);
      const tile = g[r][c];
      if (el && tile?.id != null && tile.id !== "") map.set(String(tile.id), el.getBoundingClientRect());
    }
  }
  return map;
}

function measureGridTileStepY() {
  const e0 = getGridTileElByIndex(0);
  const e4 = getGridTileElByIndex(COLS);
  if (e0 && e4) {
    const dy = e4.getBoundingClientRect().top - e0.getBoundingClientRect().top;
    return Math.max(48, dy);
  }
  return 72;
}

function measureGridTileStepX() {
  const e0 = getGridTileElByIndex(0);
  const e1 = getGridTileElByIndex(1);
  if (e0 && e1) {
    const dx = e1.getBoundingClientRect().left - e0.getBoundingClientRect().left;
    return Math.max(48, Math.abs(dx));
  }
  return measureGridTileStepY();
}

/** 最下一排 row=ROWS-1 最先入场，向上逐排延后；列仍微 stagger（与 `gridOnlyMaterialScoring` 排序一致） */
function gridTileEntranceDelay(row, col, colMul = 1) {
  return gridTileEntranceDelayKey(row, col, ROWS, COLS, colMul);
}

/**
 * 仅在下落/补牌动画结束后调用：清掉 GSAP 写在格子上的 opacity/transform。
 * 飞字过程中不要对格子 clearProps("opacity")，否则会抹掉 Vue 绑定的幽灵透明度导致闪烁。
 */
function clearGridTileGsapAfterDrop(el) {
  if (!el) return;
  gsap.killTweensOf(el);
  gsap.set(el, { clearProps: "opacity,transform" });
}

/**
 * initial：首次入场，最下一排 tile 先落，再往上逐排。
 * 补牌：新格同上；同 id FLIP 也按排从下到上依次动。
 * @param {{ rects: Map<string, DOMRect>, cells: Map<string, { row: number, col: number }> } | null} prevFlip 补牌前快照；initial 时为 null
 */
function runGridDropAnimation(prevFlip, options = {}) {
  const isInitial = options.initial === true;
  const prevRectMap = !isInitial && prevFlip?.rects ? prevFlip.rects : null;
  const prevCellMap = !isInitial && prevFlip?.cells ? prevFlip.cells : null;
  return new Promise((resolve) => {
    let settled = false;
    let watchdogTimer = null;
    const settleOnce = () => {
      if (settled) return;
      settled = true;
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
      for (let j = 0; j < ROWS * COLS; j++) {
        clearGridTileGsapAfterDrop(getGridTileElByIndex(j));
      }
      resolve();
    };
    const run = () => {
      const stepY = measureGridTileStepY();
      const stepX = measureGridTileStepX();
      let pending = 0;
      let completed = 0;
      let movedAnimatedCount = 0;
      let movedInstantCount = 0;
      let newDropCount = 0;
      let fallbackNodeCount = 0;
      const tick = () => {
        if (settled) return;
        if (++completed >= pending) settleOnce();
      };
      // 极低概率下某个 tween 的 onComplete 丢失会导致 Promise 永不 resolve，交互锁无法释放。
      // 看门狗时长覆盖「最长 stagger + 动画时长」并留缓冲，仅用于兜底，不影响正常路径。
      const maxDropDelay = gridTileEntranceDelay(0, COLS - 1);
      const maxFlipDelay = gridTileEntranceDelay(0, COLS - 1, 0.65);
      const watchdogMs = Math.ceil(Math.max(maxDropDelay + GRID_DROP_DURATION, maxFlipDelay + GRID_FLIP_DURATION) * 1000) + 800;
      watchdogTimer = setTimeout(() => {
        console.warn("[runGridDropAnimation] watchdog fired, force finishing drop animation");
        settleOnce();
      }, Math.max(1200, watchdogMs));
      for (let i = 0; i < ROWS * COLS; i++) {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const tile = grid.value[row][col];
        if (tile == null) continue;
        const el = getGridTileElByIndex(i);
        if (!el) continue;
        if (!gridTileRefs.value[i]) fallbackNodeCount += 1;
        pending++;
        const tid = tile?.id != null && tile.id !== "" ? String(tile.id) : "";
        const stagger = gridTileEntranceDelay(row, col);
        gsap.killTweensOf(el);
        const dDrop = GRID_DROP_DURATION;
        const dFlip = GRID_FLIP_DURATION;
        const flipDelay = gridTileEntranceDelay(row, col, 0.65);

        if (isInitial) {
          gsap
            .timeline({ delay: stagger, onComplete: tick })
            .to(el, { y: 0, duration: dDrop, ease: EASE_GRID_GRAVITY_Y }, 0);
        } else if (tid && prevCellMap?.has(tid)) {
          const pCell = prevCellMap.get(tid);
          const movedCell = pCell.row !== row || pCell.col !== col;
          let dx = 0;
          let dy = 0;
          /** 优先用真实 rect 做 FLIP；移除后若 ref/排版晚一帧，rect 比「纯格子步长」更可靠 */
          if (prevRectMap?.has(tid)) {
            const prev = prevRectMap.get(tid);
            const last = el.getBoundingClientRect();
            dx = prev.left - last.left;
            dy = prev.top - last.top;
          }
          const rectSignificant = Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5;
          if (!rectSignificant && movedCell) {
            dx = -(col - pCell.col) * stepX;
            dy = -(row - pCell.row) * stepY;
          }
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
            if (movedCell) {
              movedInstantCount += 1;
            }
            gsap.set(el, { x: 0, y: 0 });
            tick();
          } else {
            if (movedCell) movedAnimatedCount += 1;
            gsap.set(el, { x: dx, y: dy, force3D: true });
            const gravityDom = Math.abs(dy) >= Math.abs(dx) && Math.abs(dy) > 1.5;
            if (gravityDom) {
              gsap
                .timeline({ delay: flipDelay, onComplete: tick })
                .to(el, { x: 0, duration: dFlip, ease: EASE_GRID_LINEAR }, 0)
                .to(el, { y: 0, duration: dFlip, ease: EASE_GRID_GRAVITY_Y }, 0);
            } else {
              gsap.to(el, {
                x: 0,
                y: 0,
                duration: dFlip,
                delay: flipDelay,
                ease: EASE_TRANSFORM,
                onComplete: tick,
              });
            }
          }
        } else {
          newDropCount += 1;
          const y0 = -(row + 2) * stepY;
          gsap.set(el, { x: 0, y: y0 });
          gsap
            .timeline({ delay: stagger, onComplete: tick })
            .to(el, { y: 0, duration: dDrop, ease: EASE_GRID_GRAVITY_Y }, 0);
        }
      }
      if (pending === 0) {
        settleOnce();
      }
    };

    if (isInitial) {
      run();
    } else {
      run();
    }
  });
}

function pulseFill(el) {
  if (!el) return;
  gsap.killTweensOf(el);
  gsap.set(el, {
    scale: VALUE_NUM_PULSE_PEAK_SCALE,
    transformOrigin: "50% 50%",
  });
  gsap.to(el, {
    scale: 1,
    duration: VALUE_NUM_PULSE_SHRINK_S,
    ease: EASE_TRANSFORM,
  });
}

/** 公式区「分数 / 倍率」数字：瞬间放大到峰值，再缓落回 1（无放大段 tween） */
function pulseFormulaPanelNum(el) {
  if (!el) return;
  gsap.killTweensOf(el);
  gsap.set(el, {
    scale: VALUE_NUM_PULSE_PEAK_SCALE,
    transformOrigin: "50% 55%",
  });
  gsap.to(el, {
    scale: 1,
    duration: VALUE_NUM_PULSE_SHRINK_S,
    ease: EASE_TRANSFORM,
  });
}

/** 乘倍率（篮球 ×n）：倍率数字先瞬间拉大再弹性回落 */
function pulseFormulaMultMultiplyBurst(el) {
  if (!el) return;
  gsap.killTweensOf(el);
  gsap.set(el, { transformOrigin: "50% 55%", scale: 1 });
  gsap.set(el, { scale: 1.72 });
  gsap.to(el, {
    scale: 1,
    duration: 0.72,
    ease: "elastic.out(1, 0.3)",
  });
}

/** 倍率乘数气泡文案（整数不保留小数，否则保留一位） */
function formatMultMultiplyLabel(factor) {
  const x = Number(factor);
  if (!Number.isFinite(x) || x <= 0) return "0";
  const r = Math.round(x);
  if (Math.abs(x - r) < 1e-4) return String(r);
  const t = x.toFixed(1);
  return t.endsWith(".0") ? String(r) : t;
}

/** 宝藏槽上方 ×n 气泡：比 +倍率 更夸张的弹出与回弹 */
function showMultMultiplyBubble(slotEl, factor, speed = 1) {
  const s = Math.max(0.01, Number(speed) || 1);
  const rect = slotEl.getBoundingClientRect();
  const div = document.createElement("div");
  div.className = "mult-popup-bubble mult-popup-bubble--multiply-burst";
  div.textContent = `×${formatMultMultiplyLabel(factor)}`;
  document.body.appendChild(div);
  const rpx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx").trim()) || 1;
  const gapAboveSlotPx = 11 * rpx;
  gsap.set(div, {
    position: "fixed",
    left: rect.left + rect.width / 2,
    top: rect.top - gapAboveSlotPx,
    xPercent: -50,
    yPercent: -100,
    transformOrigin: "50% 100%",
    force3D: true,
    zIndex: 360,
  });
  gsap.fromTo(
    div,
    { opacity: 0, scale: 0.22, y: 36, rotation: -14 },
    {
      opacity: 1,
      scale: 1.28,
      y: 0,
      rotation: 0,
      duration: 0.32 / s,
      ease: "back.out(2.35)",
    },
  );
  gsap.to(div, {
    scale: 1.02,
    duration: 0.42 / s,
    ease: "elastic.out(1, 0.38)",
    delay: 0.1 / s,
  });
  return div;
}

/**
 * 记分气泡同时：缩放链 circ.out 压缩 → circ.inOut 放大 → circ.in 回到 1；
 * 旋转晃动用绝对时间叠在同一 timeline 上，与缩回 1 并行、互不等待。
 * （高光无 drop-shadow 见 game.css）
 * @param {{ scorePill?: boolean, multPill?: boolean } | null | undefined} pillAugment 词槽内平面分/倍率角标与槽体同节拍缩放（须已挂载对应 DOM）
 */
const TILE_AUGMENT_BADGE_BOUNCE_SCALE = 2;

function createWobbleScoreSlotTimeline(slotEl, pillAugment) {
  if (!slotEl) return null;
  gsap.killTweensOf(slotEl, "rotation,scale,x,y");
  const origin = "50% 55%";
  gsap.set(slotEl, { x: 0, y: 0, rotation: 0, scale: 1, transformOrigin: origin });

  const t0 = 0;
  const tCompress = WOBBLE_SCALE_COMPRESS_S;
  const tExpand = WOBBLE_SCALE_EXPAND_S;
  const peak = tCompress + tExpand;
  /** 放大末段与收回到 1 重叠，不必等晃完 */
  const scaleDownStart = peak - 0.05;
  const rotStart = tCompress + tExpand * 0.5;
  const rotD1 = 0.034;
  const rotD2 = 0.036;

  const scorePillEl =
    pillAugment?.scorePill === true ? slotEl.querySelector(".tile-bonus-pill--score") : null;
  const multPillEl =
    pillAugment?.multPill === true ? slotEl.querySelector(".tile-bonus-pill--mult") : null;
  /** @type {HTMLElement[]} */
  const pillEls = [];
  if (scorePillEl instanceof HTMLElement) pillEls.push(scorePillEl);
  if (multPillEl instanceof HTMLElement) pillEls.push(multPillEl);
  for (const pill of pillEls) {
    gsap.killTweensOf(pill, "scale");
    gsap.set(pill, { scale: 1, transformOrigin: "50% 50%" });
  }

  const tl = gsap.timeline();
  tl.to(slotEl, { scale: WOBBLE_SCALE_COMPRESS_TO, duration: tCompress, ease: "circ.out" }, t0);
  tl.to(slotEl, { scale: 1.18, duration: tExpand, ease: "circ.inOut" }, tCompress);
  tl.to(slotEl, { scale: 1, duration: 0.3, ease: "circ.in" }, scaleDownStart);
  tl.to(slotEl, { rotation: 2.6, duration: rotD1, ease: "power2.out" }, rotStart);
  tl.to(slotEl, { rotation: -1.9, duration: rotD2, ease: "power2.inOut" }, rotStart + rotD1);
  tl.to(slotEl, { rotation: 0, duration: 0.12, ease: "power2.out" }, rotStart + rotD1 + rotD2);

  if (pillEls.length) {
    tl.to(
      pillEls,
      { scale: TILE_AUGMENT_BADGE_BOUNCE_SCALE, duration: tCompress, ease: "circ.out" },
      t0,
    );
    tl.to(pillEls, { scale: 1, duration: tExpand + 0.12, ease: "circ.inOut" }, tCompress);
  }

  return tl;
}

function wobbleScoreSlot(slotEl, speed = 1, pillAugment) {
  const tl = createWobbleScoreSlotTimeline(slotEl, pillAugment);
  if (tl) {
    const s = Math.max(0.01, Number(speed) || 1);
    tl.timeScale(s);
    tl.play(0);
  }
}

const accessoryRippleTimers = new WeakMap();

function triggerAccessoryChipRipple(slotEl, speed = 1, strong = false) {
  if (!slotEl) return;
  const chip = slotEl.querySelector?.(".tile-accessory-chip");
  if (!(chip instanceof HTMLElement)) return;
  const s = Math.max(0.01, Number(speed) || 1);
  const oldTimer = accessoryRippleTimers.get(chip);
  if (oldTimer != null) {
    clearTimeout(oldTimer);
    accessoryRippleTimers.delete(chip);
  }
  chip.classList.remove("tile-accessory-chip--ripple-active");
  chip.classList.remove("tile-accessory-chip--ripple-strong");
  void chip.offsetWidth;
  const baseDuration = strong ? 0.62 : 0.46;
  chip.style.setProperty("--tile-accessory-ripple-duration", `${Math.max(0.26, baseDuration / s).toFixed(3)}s`);
  if (strong) chip.classList.add("tile-accessory-chip--ripple-strong");
  chip.classList.add("tile-accessory-chip--ripple-active");
  const timer = setTimeout(() => {
    chip.classList.remove("tile-accessory-chip--ripple-active");
    chip.classList.remove("tile-accessory-chip--ripple-strong");
    chip.style.removeProperty("--tile-accessory-ripple-duration");
    accessoryRippleTimers.delete(chip);
  }, Math.max(220, Math.round(((strong ? 700 : 520) / s))));
  accessoryRippleTimers.set(chip, timer);
}

function parseTranslationLines(translationZh) {
  if (translationZh == null || translationZh === "") return [];
  return String(translationZh)
    .replace(/\\n/g, "\n")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function expandSubmitTranslation() {
  if (!SHOW_SUBMIT_TRANSLATION) return;
  if (!submitTranslationLines.value.length) return;
  await nextTick();
  const wrap = wordTranslationWrapRef.value;
  const inner = wordTranslationInnerRef.value;
  if (!wrap || !inner) return;
  /* 同一帧内立刻收起，避免先画出整段译文再收高度（此前多了一帧 rAF 会闪全文） */
  wrap.style.overflow = "hidden";
  wrap.style.height = "0";
  wrap.style.opacity = "0";
  gsap.killTweensOf(wrap);
  await nextTick();
  const h = inner.scrollHeight;
  if (h <= 0) {
    wrap.style.height = "";
    wrap.style.overflow = "";
    wrap.style.opacity = "";
    return;
  }
  await new Promise((res) => {
    gsap.fromTo(
      wrap,
      { height: 0, opacity: 0 },
      {
        height: h,
        opacity: 1,
        duration: 0.42,
        ease: EASE_TRANSFORM,
        onComplete: () => {
          wrap.style.height = "auto";
          wrap.style.overflow = "";
          wrap.style.opacity = "";
          res();
        },
      }
    );
  });
}

function collapseSubmitTranslation() {
  if (!SHOW_SUBMIT_TRANSLATION) return Promise.resolve();
  if (!submitTranslationLines.value.length) return Promise.resolve();
  const wrap = wordTranslationWrapRef.value;
  if (!wrap) {
    submitTranslationLines.value = [];
    return Promise.resolve();
  }
  wrap.style.overflow = "hidden";
  const h = wrap.offsetHeight || innerScrollHeight(wrap);
  if (h <= 0) {
    submitTranslationLines.value = [];
    wrap.style.height = "";
    wrap.style.overflow = "";
    return Promise.resolve();
  }
  wrap.style.height = `${h}px`;
  return new Promise((res) => {
    nextTick().then(() => {
      gsap.to(wrap, {
        height: 0,
        duration: 0.38,
        ease: EASE_TRANSFORM,
        onComplete: () => {
          submitTranslationLines.value = [];
          wrap.style.height = "";
          wrap.style.overflow = "";
          res();
        },
      });
    });
  });
}

function innerScrollHeight(wrap) {
  const inner = wrap.querySelector(".word-translation-inner");
  return inner ? inner.scrollHeight : 0;
}

function showScoreBubble(slotEl, text, kind, speed = 1) {
  const s = Math.max(0.01, Number(speed) || 1);
  const rect = slotEl.getBoundingClientRect();
  const div = document.createElement("div");
  div.className =
    kind === "mult"
      ? "mult-popup-bubble"
      : kind === "replay"
        ? "score-popup-bubble score-popup-bubble--replay-again"
        : kind === "money"
          ? "score-popup-bubble score-popup-bubble--money"
          : kind === "skip"
            ? "score-popup-bubble score-popup-bubble--skip"
            : "score-popup-bubble";
  div.textContent = text;
  document.body.appendChild(div);
  const rpx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx").trim()) || 1;
  /** 气泡底边与字母块顶边的间距，整块在槽位上方、槽外 */
  const gapAboveSlotPx = 12 * rpx;
  gsap.set(div, {
    position: "fixed",
    left: rect.left + rect.width / 2,
    top: rect.top - gapAboveSlotPx,
    xPercent: -50,
    yPercent: -100,
    transformOrigin: "50% 100%",
    force3D: true,
  });
  gsap.fromTo(
    div,
    { opacity: 0, y: 18, scale: 0.5 },
    { opacity: 1, y: 0, scale: 1, duration: PLUS_BUBBLE_ENTER_DURATION_S / s, ease: EASE_TRANSFORM },
  );
  return div;
}

/** 小气泡淡出：在格子上多停一阵再离场，与记分步 sleep 解耦（可与其他气泡重叠） */
function scheduleSmallPlusBubbleOutro(el, speed = 1) {
  if (!el) return;
  const s = Math.max(0.01, Number(speed) || 1);
  gsap.to(el, {
    opacity: 0,
    y: -14,
    scale: PLUS_BUBBLE_OUTRO_SCALE,
    duration: PLUS_BUBBLE_OUTRO_DURATION_S / s,
    delay: PLUS_BUBBLE_OUTRO_DELAY_S / s,
    ease: EASE_TRANSFORM,
    onComplete: () => el.remove(),
  });
}

/**
 * 按字母稀有度的宝藏倍率（铅笔 / 钢笔）：宝藏槽与词槽同时 wobble，无宝藏侧 +x 气泡，仅在字母上出倍率气泡。
 * @param {object} part letterParts[i]
 * @param {HTMLElement | null | undefined} slotEl
 * @param {{ treasureId: string, multDelta: number, bubbleLabel: string, rarity: string, active: boolean }} cfg
 */
async function runLetterRarityTreasureMultStep(part, slotEl, cfg, speed = 1) {
  if (!cfg.active || part.rarity !== cfg.rarity || !slotEl) return false;
  const sp = Math.max(0.01, Number(speed) || 1);
  const ti =
    typeof cfg.slotIndex === "number" && cfg.slotIndex >= 0
      ? cfg.slotIndex
      : findFirstOwnedTreasureSlotIndex(cfg.treasureId);
  const tel = ti >= 0 ? gameTreasureSlotRefs[ti] : null;
  if (tel) {
    scoringTreasureBarIndex.value = ti;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    wobbleScoreSlot(tel, sp);
  }
  wobbleScoreSlot(slotEl, sp);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  animMultTotal.value += cfg.multDelta;
  await nextTick();
  const bubbleEl = showScoreBubble(slotEl, cfg.bubbleLabel, "mult", sp);
  pulseFormulaPanelNum(getResultMultNumEl());
  scheduleSmallPlusBubbleOutro(bubbleEl, sp);
  await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  scoringTreasureBarIndex.value = null;
  return true;
}

/** 宝藏提供的加分：紧跟该字母「稀有度基础分」动画之后，与词槽同节拍 */
async function runLetterTreasureScoreBurst(
  slotEl,
  treasureSlotIndex,
  amount,
  bubbleText,
  speed = 1,
  persistCtx = null,
) {
  if (!slotEl || amount <= 0) return false;
  const sp = Math.max(0.01, Number(speed) || 1);
  const tel = treasureSlotIndex >= 0 ? gameTreasureSlotRefs[treasureSlotIndex] : null;
  const tid = treasureSlotIndex >= 0 ? ownedTreasures.value[treasureSlotIndex]?.treasureId : null;

  let slotPillAug = undefined;
  if (tid && persistCtx?.realTile) {
    const did = TREASURE_HOOKS_BY_ID.get(tid)?.persistTileAfterPerLetterTreasureCue?.({
      realTile: persistCtx.realTile,
      band: "score",
      delta: amount,
    });
    if (did) {
      touchGrid();
      await nextTick();
      slotPillAug = { scorePill: true };
    }
  }

  if (treasureSlotIndex >= 0) {
    scoringTreasureBarIndex.value = treasureSlotIndex;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
  }
  if (tel) wobbleScoreSlot(tel, sp);
  const slotTl = createWobbleScoreSlotTimeline(slotEl, slotPillAug);
  if (slotTl) {
    slotTl.timeScale(sp);
    slotTl.play(0);
  }
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  animScoreSum.value += amount;
  await nextTick();
  const bubbleS = showScoreBubble(slotEl, bubbleText, "score", sp);
  pulseFormulaPanelNum(getResultScoreNumEl());
  scheduleSmallPlusBubbleOutro(bubbleS, sp);
  await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  scoringTreasureBarIndex.value = null;
  return true;
}

/** 宝藏提供的倍率加法：紧跟该字母「字母块自带倍率」动画之后，再接铅笔～王冠 */
async function runLetterTreasureMultBurst(
  slotEl,
  treasureSlotIndex,
  amount,
  bubbleText,
  speed = 1,
  persistCtx = null,
) {
  if (!slotEl || amount <= 0) return false;
  const sp = Math.max(0.01, Number(speed) || 1);
  const tel = treasureSlotIndex >= 0 ? gameTreasureSlotRefs[treasureSlotIndex] : null;
  const tid = treasureSlotIndex >= 0 ? ownedTreasures.value[treasureSlotIndex]?.treasureId : null;

  let slotPillAug = undefined;
  if (tid && persistCtx?.realTile) {
    const did = TREASURE_HOOKS_BY_ID.get(tid)?.persistTileAfterPerLetterTreasureCue?.({
      realTile: persistCtx.realTile,
      band: "mult",
      delta: amount,
    });
    if (did) {
      touchGrid();
      await nextTick();
      slotPillAug = { multPill: true };
    }
  }

  if (treasureSlotIndex >= 0) {
    scoringTreasureBarIndex.value = treasureSlotIndex;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
  }
  if (tel) wobbleScoreSlot(tel, sp);
  const slotTl = createWobbleScoreSlotTimeline(slotEl, slotPillAug);
  if (slotTl) {
    slotTl.timeScale(sp);
    slotTl.play(0);
  }
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  animMultTotal.value += amount;
  await nextTick();
  const bubbleM = showScoreBubble(slotEl, bubbleText, "mult", sp);
  pulseFormulaPanelNum(getResultMultNumEl());
  scheduleSmallPlusBubbleOutro(bubbleM, sp);
  await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  scoringTreasureBarIndex.value = null;
  return true;
}

async function runSlotPerLetterTreasureScoreStep(
  treasureSlotIndex,
  part,
  letterIndex,
  slotEl,
  speed = 1,
  realTile = null,
) {
  const tid = ownedTreasures.value[treasureSlotIndex]?.treasureId;
  if (!tid || !slotEl) return false;
  const ctx = { ownedSlotTreasureIds: ownedTreasures.value.map((s) => s?.treasureId ?? null) };
  const cue = TREASURE_HOOKS_BY_ID.get(tid)?.getPerLetterScoreCue?.(ctx, part, letterIndex);
  if (!cue?.delta) return false;
  return runLetterTreasureScoreBurst(
    slotEl,
    treasureSlotIndex,
    cue.delta,
    cue.label ?? `+${cue.delta}`,
    speed,
    realTile ? { realTile } : null,
  );
}

async function runSlotPerLetterTreasureMultStep(
  treasureSlotIndex,
  part,
  letterIndex,
  slotEl,
  speed = 1,
  realTile = null,
) {
  const tid = ownedTreasures.value[treasureSlotIndex]?.treasureId;
  if (!tid || !slotEl) return false;
  const ctx = { ownedSlotTreasureIds: ownedTreasures.value.map((s) => s?.treasureId ?? null) };
  const cue = TREASURE_HOOKS_BY_ID.get(tid)?.getPerLetterMultCue?.(ctx, part, letterIndex);
  if (!cue?.delta) return false;
  return runLetterTreasureMultBurst(
    slotEl,
    treasureSlotIndex,
    cue.delta,
    cue.label ?? `+${cue.delta}`,
    speed,
    realTile ? { realTile } : null,
  );
}

/** 字母块配饰「钱币」：该字母轮到计分时，wobble 并弹出 +$ 气泡。 */
async function runLetterAccessoryCoinMoneyBurst(tile, slotEl, speed = 1) {
  if (!slotEl || tile?.accessoryId !== TILE_ACCESSORY_COIN) return;
  const sp = Math.max(0.01, Number(speed) || 1);
  wobbleScoreSlot(slotEl, sp);
  triggerAccessoryChipRipple(slotEl, sp);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  const bubble = showScoreBubble(slotEl, `+$${COIN_ACCESSORY_SCORE_BONUS_DOLLARS}`, "money", sp);
  scheduleSmallPlusBubbleOutro(bubble, sp);
  money.value += COIN_ACCESSORY_SCORE_BONUS_DOLLARS;
  await scoringSleep(SCORING_STEP_BEAT_MS, sp);
}

/**
 * 单字母一轮：与 **tile 本体**同拍的只有——稀有度基础分 + tile/材质平面分 + tile 角标分；以及声明了
 * `mergeLetter*IntoIntrinsic*` 的宝藏（当前：备忘录平面分、回形针倍率加法）。元音倍率、某字母加分等仍走单独步。
 * 顺序：上述「本体同一拍」→ 其余逐字加分宝藏 → 钱币配饰 →「本体倍率同一拍」→ 其余逐字倍率宝藏 → 铅笔～王冠
 */
async function runSingleLetterScoringStep(tile, i, detailed, speed = 1, luckyVisitIndex = 0) {
  const sp = Math.max(0.01, Number(speed) || 1);
  const part = detailed.letterParts[i];
  const luckyRoll = detailed.luckyMaterialRollsByLetter?.[i]?.[luckyVisitIndex] ?? null;
  /** 本字母本轮是否已播过词槽「逐字」缩放 wobble（用于幸运金币：尽量与已有分/倍率步同拍，避免单独再晃一格） */
  let wordSlotIntrinsicWobblePlayed = false;
  scoringLetterIndex.value = i;
  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));
  const slotEl = wordSlotRefs.value[i];
  if (!slotEl) return;

  if (activeBossSlug.value === "the_tooth" && detailed.bossSoftViolation !== true && luckyVisitIndex === 0) {
    wobbleScoreSlot(slotEl, sp);
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    money.value = Math.max(0, money.value - 1);
    const bubbleTooth = showScoreBubble(slotEl, "-$1", "money", sp);
    scheduleSmallPlusBubbleOutro(bubbleTooth, sp);
    await scoringSleep(SCORING_STEP_BEAT_MS * 0.55, sp);
  }

  const realTile = resolveRealSubmitTileForWordSlot(i, tile);

  const nOwn = ownedTreasures.value.length;
  const ctxScoreMerge = { ownedSlotTreasureIds: ownedTreasures.value.map((s) => s?.treasureId ?? null) };
  /** @type {{ si: number, delta: number, label?: string }[]} */
  const mergedIntrinsicScoreSlots = [];
  for (let si = 0; si < nOwn; si++) {
    const tid = ownedTreasures.value[si]?.treasureId;
    const hooks = tid ? TREASURE_HOOKS_BY_ID.get(tid) : null;
    if (!hooks?.mergeLetterScoreCueIntoIntrinsicLetterScoreStep) continue;
    const cue = hooks.getPerLetterScoreCue?.(ctxScoreMerge, part, i);
    const d = Math.max(0, Math.floor(Number(cue?.delta) || 0));
    if (d <= 0) continue;
    mergedIntrinsicScoreSlots.push({ si, delta: d, label: cue?.label });
  }
  const mergedIntrinsicScoreAdd = mergedIntrinsicScoreSlots.reduce((s, x) => s + x.delta, 0);
  const baseLetterScore =
    (part.rarityBonus ?? 0) + (part.tileScoreBonus ?? 0) + (part.materialScoreBonus ?? 0);
  const totalIntrinsicScoreStep = baseLetterScore + mergedIntrinsicScoreAdd;

  if (totalIntrinsicScoreStep > 0) {
    wordSlotIntrinsicWobblePlayed = true;
    if (realTile && mergedIntrinsicScoreSlots.length) {
      for (const row of mergedIntrinsicScoreSlots) {
        const tidS = ownedTreasures.value[row.si]?.treasureId;
        TREASURE_HOOKS_BY_ID.get(tidS)?.persistTileAfterPerLetterTreasureCue?.({
          realTile,
          band: "score",
          delta: row.delta,
        });
      }
      touchGrid();
    }
    await nextTick();

    const firstMergedScoreSi = mergedIntrinsicScoreSlots.length ? mergedIntrinsicScoreSlots[0].si : -1;
    if (firstMergedScoreSi >= 0) {
      scoringTreasureBarIndex.value = firstMergedScoreSi;
      await nextTick();
      await new Promise((r) => requestAnimationFrame(r));
      const telS = gameTreasureSlotRefs[firstMergedScoreSi];
      if (telS) wobbleScoreSlot(telS, sp);
    }

    const slotTl = createWobbleScoreSlotTimeline(slotEl, {
      scorePill:
        (part.tileScoreBonus ?? 0) > 0 ||
        (part.materialScoreBonus ?? 0) > 0 ||
        mergedIntrinsicScoreAdd > 0,
      multPill: false,
    });
    if (slotTl) {
      slotTl.timeScale(sp);
      slotTl.play(0);
    }
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    animScoreSum.value += totalIntrinsicScoreStep;
    await nextTick();
    const bubbleS = showScoreBubble(slotEl, `+${Math.round(totalIntrinsicScoreStep)}`, "score", sp);
    pulseFormulaPanelNum(getResultScoreNumEl());
    scheduleSmallPlusBubbleOutro(bubbleS, sp);
    await scoringSleep(SCORING_STEP_BEAT_MS, sp);
    scoringTreasureBarIndex.value = null;
  }

  const mergedScoreSiSkip = new Set(mergedIntrinsicScoreSlots.map((x) => x.si));
  for (let si = 0; si < nOwn; si++) {
    if (mergedScoreSiSkip.has(si)) continue;
    const didTreasureScore = await runSlotPerLetterTreasureScoreStep(si, part, i, slotEl, sp, realTile);
    if (didTreasureScore) wordSlotIntrinsicWobblePlayed = true;
  }
  await runLetterAccessoryCoinMoneyBurst(tile, slotEl, sp);
  if (tile?.accessoryId === TILE_ACCESSORY_COIN) wordSlotIntrinsicWobblePlayed = true;

  const ctxMultMerge = { ownedSlotTreasureIds: ownedTreasures.value.map((s) => s?.treasureId ?? null) };
  /** @type {{ si: number, delta: number, label?: string }[]} */
  const mergedIntrinsicMultSlots = [];
  for (let si = 0; si < nOwn; si++) {
    const tid = ownedTreasures.value[si]?.treasureId;
    const hooks = tid ? TREASURE_HOOKS_BY_ID.get(tid) : null;
    if (!hooks?.mergeLetterMultCueIntoIntrinsicLetterMultStep) continue;
    const cue = hooks.getPerLetterMultCue?.(ctxMultMerge, part, i);
    const d = Math.max(0, Math.round(Number(cue?.delta) || 0));
    if (d <= 0) continue;
    mergedIntrinsicMultSlots.push({ si, delta: d, label: cue?.label });
  }
  const mergedIntrinsicMultAdd = mergedIntrinsicMultSlots.reduce((s, x) => s + x.delta, 0);
  const intrinsicLetterMult = part.letterMultBonus ?? 0;
  const luckyFoldMult =
    detailed.hasPostLetterMultMul !== true && luckyRoll && luckyRoll.multAdd > 0 ? luckyRoll.multAdd : 0;
  const totalIntrinsicMultStep = intrinsicLetterMult + mergedIntrinsicMultAdd + luckyFoldMult;

  if (totalIntrinsicMultStep > 0) {
    wordSlotIntrinsicWobblePlayed = true;
    if (realTile && mergedIntrinsicMultSlots.length) {
      for (const row of mergedIntrinsicMultSlots) {
        const tidM = ownedTreasures.value[row.si]?.treasureId;
        TREASURE_HOOKS_BY_ID.get(tidM)?.persistTileAfterPerLetterTreasureCue?.({
          realTile,
          band: "mult",
          delta: row.delta,
        });
      }
      touchGrid();
    }
    await nextTick();

    const firstMergedSi = mergedIntrinsicMultSlots.length ? mergedIntrinsicMultSlots[0].si : -1;
    if (firstMergedSi >= 0) {
      scoringTreasureBarIndex.value = firstMergedSi;
      await nextTick();
      await new Promise((r) => requestAnimationFrame(r));
      const telM = gameTreasureSlotRefs[firstMergedSi];
      if (telM) wobbleScoreSlot(telM, sp);
    }

    const mb = `+${Math.round(totalIntrinsicMultStep)}`;
    const slotTlM = createWobbleScoreSlotTimeline(slotEl, {
      scorePill: false,
      multPill:
        (part.tileLetterMultBonus ?? 0) > 0 ||
        (Number(part.materialMultBonus) || 0) !== 0 ||
        mergedIntrinsicMultAdd > 0 ||
        luckyFoldMult > 0,
    });
    if (slotTlM) {
      slotTlM.timeScale(sp);
      slotTlM.play(0);
    }
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    animMultTotal.value += totalIntrinsicMultStep;
    await nextTick();
    const bubbleM = showScoreBubble(slotEl, mb, "mult", sp);
    pulseFormulaPanelNum(getResultMultNumEl());
    scheduleSmallPlusBubbleOutro(bubbleM, sp);
    await scoringSleep(SCORING_STEP_BEAT_MS, sp);
    scoringTreasureBarIndex.value = null;
  }

  const mergedMultSiSkip = new Set(mergedIntrinsicMultSlots.map((x) => x.si));
  for (let si = 0; si < nOwn; si++) {
    if (mergedMultSiSkip.has(si)) continue;
    const didTreasureMult = await runSlotPerLetterTreasureMultStep(si, part, i, slotEl, sp, realTile);
    if (didTreasureMult) wordSlotIntrinsicWobblePlayed = true;
  }

  for (let si = 0; si < nOwn; si++) {
    const tid = ownedTreasures.value[si]?.treasureId;
    if (!tid) continue;
    const animCfg = TREASURE_HOOKS_BY_ID.get(tid)?.getLetterRarityMultAnimConfig?.();
    if (!animCfg) continue;
    const didRarity = await runLetterRarityTreasureMultStep(part, slotEl, {
      treasureId: tid,
      slotIndex: si,
      multDelta: animCfg.multDelta,
      bubbleLabel: animCfg.bubbleLabel,
      rarity: animCfg.targetRarity,
      active: true,
    }, sp);
    if (didRarity) wordSlotIntrinsicWobblePlayed = true;
  }

  if (luckyRoll?.moneyAdd > 0) {
    if (!wordSlotIntrinsicWobblePlayed) {
      wobbleScoreSlot(slotEl, sp);
      await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
      wordSlotIntrinsicWobblePlayed = true;
    }
    const bubbleLuckyMoney = showScoreBubble(slotEl, `+$${luckyRoll.moneyAdd}`, "money", sp);
    scheduleSmallPlusBubbleOutro(bubbleLuckyMoney, sp);
    money.value += luckyRoll.moneyAdd;
    await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  }

  scoringLetterIndex.value = -1;
  await scoringSleep(SCORING_LETTER_GAP_MS, sp);
}

/**
 * 额外逐字母记分轮开始前：对触发该轮的宝藏槽做一次与公式区相同的 wobble，再留一拍间隔。
 * @param {{ extraLetterPassCueSteps?: { slotIndex: number, treasureId: string }[] }} detailed
 * @param {number} cueIndex 第几轮「额外」轮（0 = 第一轮额外，即整词第 2 遍开始前）
 */
async function runExtraLetterScoringPassCue(detailed, cueIndex, speed = 1) {
  const sp = Math.max(0.01, Number(speed) || 1);
  const steps = detailed.extraLetterPassCueSteps ?? [];
  const cue = steps[cueIndex];
  if (cue && cue.slotIndex >= 0) {
    scoringTreasureBarIndex.value = cue.slotIndex;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    const tel = gameTreasureSlotRefs[cue.slotIndex];
    if (tel) {
      const tl = createWobbleScoreSlotTimeline(tel);
      if (tl) {
        tl.timeScale(sp);
        tl.play(0);
        await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
        const bubbleReplay = showScoreBubble(tel, "再来一次！", "replay", sp);
        scheduleSmallPlusBubbleOutro(bubbleReplay, sp);
        await new Promise((resolve) => {
          tl.eventCallback("onComplete", resolve);
        });
      } else {
        await scoringSleep(SCORING_TREASURE_FALLBACK_MS, sp);
      }
    } else {
      await scoringSleep(SCORING_TREASURE_FALLBACK_MS, sp);
    }
    scoringTreasureBarIndex.value = null;
  }
  await scoringSleep(SCORING_EXTRA_LETTER_PASS_GAP_MS, sp);
}

/** 关卡通关时：棋盘上每个黄金材质字母块 wobble + 金币色 $ 气泡，金额直接进钱包（计入结算前利息基数，不在通关弹层单列） */
const GOLD_MATERIAL_CLEAR_BONUS_DOLLARS = 3;
/** 字母块钱币配饰：在该字母轮到计分时触发 +$3 */
const COIN_ACCESSORY_SCORE_BONUS_DOLLARS = 3;
const ICE_MATERIAL_SELF_DESTRUCT_CHANCE = 0.25;

/**
 * Grid 触发型效果（如通关前的黄金结算、提交后的钢材质倍率）在单次触发时的触发次数。
 * 规则：同格佩戴重播配饰时，该格 Grid 效果额外触发 1 次。
 * @param {{ accessoryId?: string | null } | null | undefined} tile
 */
function getGridEffectTriggerCount(tile) {
  return tile?.accessoryId === TILE_ACCESSORY_REWIND ? 2 : 1;
}

/** 同格多效果时：与入场 delay 一致则黄金先于配饰，便于稳定排序 */
const CLEAR_WIN_TILE_EFFECT_KIND_ORDER = Object.freeze({ gold: 0, length_upgrade: 1 });

/**
 * 通关当手、补牌前：按格子入场顺序（gridTileEntranceDelay）交错触发黄金与「升级配饰」；
 * 同 delay 时黄金优先。
 * @param {number} lastWordLen 本手最后提交单词的字母块数（Qu 算 1 格）
 */
function buildClearWinTileEffectQueue() {
  const g = grid.value;
  /** @type {{ kind: "gold" | "length_upgrade", r: number, c: number, delay: number, accessoryTriggered?: boolean }[]} */
  const items = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = g[r][c];
      if (!t?.letter || t.selected) continue;
      const delay = gridTileEntranceDelay(r, c);
      if (t.materialId === "gold") {
        const triggerCount = getGridEffectTriggerCount(t);
        for (let k = 0; k < triggerCount; k++) {
          items.push({ kind: "gold", r, c, delay, accessoryTriggered: k > 0 });
        }
      }
      if (t.accessoryId === TILE_ACCESSORY_LEVEL_UPGRADE) {
        items.push({ kind: "length_upgrade", r, c, delay });
      }
    }
  }
  items.sort((a, b) => {
    if (a.delay !== b.delay) return a.delay - b.delay;
    return CLEAR_WIN_TILE_EFFECT_KIND_ORDER[a.kind] - CLEAR_WIN_TILE_EFFECT_KIND_ORDER[b.kind];
  });
  return items;
}

async function runClearWinBoardEffectsBeforeRefill(lastWordLen) {
  const queue = buildClearWinTileEffectQueue();
  if (queue.length === 0) return;
  const sp = 1;
  const len = Math.max(3, Math.min(16, Math.round(Number(lastWordLen)) || 0));
  for (const item of queue) {
    const idx = item.r * COLS + item.c;
    const el = getGridTileElByIndex(idx);
    if (!el) continue;
    if (item.kind === "gold") {
      const wobbleTl = createWobbleScoreSlotTimeline(el);
      if (wobbleTl) {
        wobbleTl.timeScale(sp);
        wobbleTl.play(0);
      }
      if (item.accessoryTriggered) triggerAccessoryChipRipple(el, sp, true);
      await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
      const bubble = showScoreBubble(el, `+$${GOLD_MATERIAL_CLEAR_BONUS_DOLLARS}`, "money", sp);
      scheduleSmallPlusBubbleOutro(bubble, sp);
      await scoringSleep(SCORING_STEP_BEAT_MS, sp);
      money.value += GOLD_MATERIAL_CLEAR_BONUS_DOLLARS;
      /** 须等 wobble 播完再进入补牌下落：否则 scale/rotation 与 FLIP 的 y 冲突 */
      if (wobbleTl) await wobbleTl.then();
    } else {
      if (len < 3) continue;
      const wobbleTl = createWobbleScoreSlotTimeline(el);
      if (wobbleTl) {
        wobbleTl.timeScale(sp);
        wobbleTl.play(0);
      }
      triggerAccessoryChipRipple(el, sp);
      await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
      const beforeLevel = Math.max(1, Math.round(Number(lengthLevelsByLength.value?.[len])) || 1);
      setWordLengthLevel(len, beforeLevel + 1);
      await runClearWinLengthUpgradeShopLikeFx({
        areaRef: gameResultAreaRef,
        model: clearWinFxModel,
        fxActive: clearWinLengthUpgradeFxActive,
        waitNextTick: () => nextTick(),
        len,
        beforeLevel,
        speed: sp,
      });
      if (wobbleTl) await wobbleTl.then();
    }
  }
}

async function runSubmitScoringSequence(tiles, detailed, resolvedWord = null) {
  scoringTreasureBarIndex.value = null;
  try {
  hideResultWordLengthBeforeTotal.value = false;
  suppressResultWordLengthUntilScoringEnd.value = false;
  const n = detailed.letterParts.length;
  const lenTb =
    detailed.lengthTableLen != null && Number.isFinite(Number(detailed.lengthTableLen))
      ? Math.max(1, Math.round(Number(detailed.lengthTableLen)))
      : n;
  const skipLetters = detailed.bossSoftViolation === true;
  /** 分数列从「字数×词长基础分」开始，逐字只加稀有度加成（气泡也只显示加成） */
  animScoreSum.value = skipLetters
    ? 0
    : n * getBaseScorePerLetterForWordLength(lenTb, lengthLevelsByLength.value);
  animMultTotal.value = detailed.lengthMultiplier;
  animResultTotal.value = 0;

  const wordStr =
    String(resolvedWord ?? "")
      .toLowerCase()
      .trim() || tiles.map((c) => c.letter.toLowerCase()).join("");
  const def = getWordDefinition(wordStr);
  if (SHOW_SUBMIT_TRANSLATION) {
    submitTranslationLines.value = parseTranslationLines(def?.translation_zh);
    await expandSubmitTranslation();
  } else {
    submitTranslationLines.value = [];
  }

  const letterPassCount = Math.max(1, Math.round(Number(detailed.letterScoringPassCount)) || 1);
  const letterReplayExtraCounts = detailed.letterReplayExtraCounts ?? [];
  /** 与 `luckyMaterialRollsByLetter[i]` 对齐：该字母第几次逐字结算（首遍 + replay + 整词额外轮） */
  const luckyVisitByLetter = detailed.letterParts.map(() => 0);
  const totalScoringBeats = getSubmitScoringTotalBeats(detailed);
  let scoringBeat = 0;
  if (skipLetters) {
    const spSkip = 1.05;
    for (let i = 0; i < n; i++) {
      const slotEl = wordSlotRefs.value[i];
      if (!slotEl) continue;
      wobbleScoreSlot(slotEl, spSkip);
      await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, spSkip);
      const b = showScoreBubble(slotEl, "跳过", "skip", spSkip);
      scheduleSmallPlusBubbleOutro(b, spSkip);
      await scoringSleep(SCORING_STEP_BEAT_MS * 0.42, spSkip);
    }
  } else {
    for (let pass = 0; pass < letterPassCount; pass++) {
      if (pass > 0) {
        const spCue = getSubmitScoringBeatSpeed(scoringBeat, totalScoringBeats);
        await runExtraLetterScoringPassCue(detailed, pass - 1, spCue);
        scoringBeat += 1;
      }
      for (let i = 0; i < n; i++) {
        const spLetter = getSubmitScoringBeatSpeed(scoringBeat, totalScoringBeats);
        await runSingleLetterScoringStep(tiles[i], i, detailed, spLetter, luckyVisitByLetter[i]++);
        scoringBeat += 1;
        if (pass === 0) {
          const replayExtra = Math.max(0, Math.floor(Number(letterReplayExtraCounts[i]) || 0));
          for (let r = 0; r < replayExtra; r++) {
            if (tiles[i]?.accessoryId === TILE_ACCESSORY_REWIND) {
              triggerAccessoryChipRipple(wordSlotRefs.value?.[i], spLetter, true);
            }
            const spReplay = getSubmitScoringBeatSpeed(scoringBeat, totalScoringBeats);
            await runSingleLetterScoringStep(tiles[i], i, detailed, spReplay, luckyVisitByLetter[i]++);
            scoringBeat += 1;
          }
        }
      }
    }

    const postSteps = detailed.postLetterTreasureSteps ?? [];
    for (const step of postSteps) {
    const multAdd = Number(step.multAdd) || 0;
    const scoreAdd = Number(step.scoreAdd) || 0;
    const multMul = Number(step.multMul) || 0;
    const moneyAdd = Number(step.moneyAdd) || 0;
    if (multAdd <= 0 && scoreAdd <= 0 && multMul <= 1 && moneyAdd <= 0) continue;
    const spPost = getSubmitScoringBeatSpeed(scoringBeat, totalScoringBeats);
    scoringBeat += 1;
    const ti =
      typeof step.slotIndex === "number" && step.slotIndex >= 0
        ? step.slotIndex
        : findFirstOwnedTreasureSlotIndex(step.treasureId);
    scoringTreasureBarIndex.value = ti >= 0 ? ti : null;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    const tel = ti >= 0 ? gameTreasureSlotRefs[ti] : null;
    const gridFxEl =
      typeof step.scoreFxGridTileIndex === "number" && step.scoreFxGridTileIndex >= 0
        ? getGridTileElByIndex(step.scoreFxGridTileIndex)
        : null;
    const wordSlotFxEl =
      typeof step.scoreFxWordSlotIndex === "number" && step.scoreFxWordSlotIndex >= 0
        ? wordSlotRefs.value?.[step.scoreFxWordSlotIndex]
        : null;
    const fxTargetEl = gridFxEl || wordSlotFxEl || tel;
    if (multMul > 1) {
      if (fxTargetEl) {
        wobbleScoreSlot(fxTargetEl, spPost);
        if (step.accessoryTriggered) triggerAccessoryChipRipple(fxTargetEl, spPost, true);
        await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, spPost);
        animMultTotal.value = Math.round(animMultTotal.value * multMul);
        await nextTick();
        const bubbleX = showMultMultiplyBubble(fxTargetEl, multMul, spPost);
        pulseFormulaMultMultiplyBurst(getResultMultNumEl());
        gsap.to(bubbleX, {
          opacity: 0,
          y: -22,
          scale: 0.85,
          duration: 0.22 / spPost,
          delay: 0.38 / spPost,
          ease: EASE_TRANSFORM,
          onComplete: () => bubbleX.remove(),
        });
        await scoringSleep(SCORING_STEP_BEAT_MS + 120, spPost);
      } else {
        await scoringSleep(SCORING_TREASURE_FALLBACK_MS, spPost);
        animMultTotal.value = Math.round(animMultTotal.value * multMul);
        await nextTick();
        pulseFormulaMultMultiplyBurst(getResultMultNumEl());
      }
    } else if (multAdd > 0) {
      if (fxTargetEl) {
        wobbleScoreSlot(fxTargetEl, spPost);
        await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, spPost);
        animMultTotal.value += multAdd;
        await nextTick();
        const bubbleM = showScoreBubble(fxTargetEl, `+${Math.round(multAdd)}`, "mult", spPost);
        pulseFormulaPanelNum(getResultMultNumEl());
        scheduleSmallPlusBubbleOutro(bubbleM, spPost);
        await scoringSleep(SCORING_STEP_BEAT_MS, spPost);
      } else {
        await scoringSleep(SCORING_TREASURE_FALLBACK_MS, spPost);
        animMultTotal.value += multAdd;
        await nextTick();
        pulseFormulaPanelNum(getResultMultNumEl());
      }
    } else if (scoreAdd > 0) {
      if (fxTargetEl) {
        wobbleScoreSlot(fxTargetEl, spPost);
        await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, spPost);
        animScoreSum.value += scoreAdd;
        await nextTick();
        const bubbleS = showScoreBubble(fxTargetEl, `+${Math.round(scoreAdd)}`, "score", spPost);
        pulseFormulaPanelNum(getResultScoreNumEl());
        scheduleSmallPlusBubbleOutro(bubbleS, spPost);
        await scoringSleep(SCORING_STEP_BEAT_MS, spPost);
      } else {
        await scoringSleep(SCORING_TREASURE_FALLBACK_MS, spPost);
        animScoreSum.value += scoreAdd;
        await nextTick();
        pulseFormulaPanelNum(getResultScoreNumEl());
      }
    } else if (moneyAdd > 0) {
      if (fxTargetEl) {
        wobbleScoreSlot(fxTargetEl, spPost);
        await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, spPost);
        const bubbleMoney = showScoreBubble(fxTargetEl, `+$${Math.round(moneyAdd)}`, "money", spPost);
        scheduleSmallPlusBubbleOutro(bubbleMoney, spPost);
        money.value += Math.round(moneyAdd);
        await scoringSleep(SCORING_STEP_BEAT_MS, spPost);
      } else {
        await scoringSleep(SCORING_TREASURE_FALLBACK_MS, spPost);
        money.value += Math.round(moneyAdd);
      }
    }
    scoringTreasureBarIndex.value = null;
    }
  }

  hideResultWordLengthBeforeTotal.value = true;
  suppressResultWordLengthUntilScoringEnd.value = true;
  await sleep(200);
  animResultTotal.value = detailed.finalScore;
  hideResultWordLengthBeforeTotal.value = false;
  await nextTick();
  pulseFill(getResultTotalEl());
  await sleep(220);

  await new Promise((resolve) => {
    const o = { s: animScoreSum.value, m: animMultTotal.value };
    gsap.to(o, {
      s: 0,
      m: 0,
      duration: 0.5,
      ease: EASE_TRANSFORM,
      onUpdate: () => {
        animScoreSum.value = Math.round(o.s);
        animMultTotal.value = Math.round(o.m);
      },
      onComplete: resolve,
    });
  });

  await sleep(220);

  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));

  const startRound = currentScore.value;
  const endRound = startRound + detailed.finalScore;
  /** 整格依次消失（占位+字母一起），按槽位索引 0..n-1 */
  const slotTileEls = [];
  for (let i = 0; i < n; i++) {
    const el = wordSlotRefs.value[i];
    if (el) slotTileEls.push(el);
  }
  gsap.killTweensOf(slotTileEls);
  gsap.set(slotTileEls, {
    opacity: 1,
    scale: 1,
    y: 0,
    transformOrigin: "50% 50%",
  });
  for (const slotEl of slotTileEls) {
    const ph = slotEl.querySelector(".word-slot-placeholder");
    if (ph) ph.classList.add("word-slot-placeholder--shell");
  }
  const submitGridLeaveEls = getSelectedGridTileElsInOrder();
  gsap.killTweensOf(submitGridLeaveEls);
  gsap.set(submitGridLeaveEls, {
    opacity: 0.1,
    scale: 1,
    y: 0,
    transformOrigin: "50% 50%",
  });

  const collapseTrans = collapseSubmitTranslation();

  /** 快照与补牌同一瞬：rect 与 cells 对齐，避免间隔内布局漂移导致 FLIP 误判 */
  const prevFlip = {
    rects: captureGridRectsByTileId(),
    cells: snapshotGridCellsByTileId(),
  };
  const leavePromise = runSlotAndGridLeaveAnimation(slotTileEls, submitGridLeaveEls, {
    duration: 0.28,
    stagger: 0.12,
  });

  const scorePromise = new Promise((resolve) => {
    const p = { t: 0 };
    roundScoreOverride.value = startRound;
    gsap.to(p, {
      t: 1,
      duration: 0.52,
      ease: EASE_TRANSFORM,
      onUpdate: () => {
        animResultTotal.value = Math.round(detailed.finalScore * (1 - p.t));
        roundScoreOverride.value = Math.round(startRound + (endRound - startRound) * p.t);
      },
      onComplete: () => {
        currentScore.value = endRound;
        roundScoreOverride.value = null;
        animResultTotal.value = 0;
        setLastWordFromSubmit(getWordDefinition, tiles, detailed, { resolvedWord: wordStr });
        resolve();
      },
    });
  });

  await leavePromise;

  const willWinThisSubmit = endRound >= targetScore.value;
  const noSubmitsLeft = remainingWords.value <= 0;
  const skipNewFromDeck = willWinThisSubmit || noSubmitsLeft;

  if (willWinThisSubmit) {
    await runClearWinBoardEffectsBeforeRefill(n);
  }

  applySubmitRefill({ skipNewFromDeck });
  applyHookBossAfterSubmit();
  gridRefillAnimating.value = true;
  const dropPromise = (async () => {
    await nextTick();
    try {
      /* 关内已结束：不补新块（顶部为 void），仅让已有字母 FLIP 落位 */
      await runGridDropAnimation(prevFlip);
    } finally {
      gridRefillAnimating.value = false;
      applyCeruleanBellAfterGridStable();
    }
  })();

  await Promise.all([dropPromise, scorePromise]);

  await collapseTrans;

  scoringAnimating.value = false;
  suppressResultWordLengthUntilScoringEnd.value = false;
  await nextTick();
  updateSlotPositions(true);
  } finally {
    scoringTreasureBarIndex.value = null;
    crimsonTreasureDisabledSlotIndex.value = null;
    hideResultWordLengthBeforeTotal.value = false;
    suppressResultWordLengthUntilScoringEnd.value = false;
  }
}

function setFlyingInRef(fly, el) {
  const node = refToDom(el);
  if (!node) {
    const prev = flyingInElById.get(fly.id);
    if (prev) gsap.killTweensOf(prev);
    flyingInElById.delete(fly.id);
    flyingInAnimStarted.delete(fly.id);
    return;
  }
  flyingInElById.set(fly.id, node);
  const item = fly;
  if (flyingInAnimStarted.has(item.id)) return;
  flyingInAnimStarted.add(item.id);
  const r = item.fromRect;
  const t = item.toRect;
  const tw = Math.max(t.width, 1e-6);
  const th = Math.max(t.height, 1e-6);
  gsap.killTweensOf(node);
  /* 初始位只由 GSAP 写一次，避免模板 :style 在父级重渲染时覆盖正在飞的 left/top */
  /* 目标尺寸固定为词槽最终宽高，用 transform 缩放衔接棋盘格尺寸，飞行途中尺度与位移同步 */
  gsap.set(node, {
    zIndex: bumpOverlayZ(),
    left: r.left,
    top: r.top,
    width: t.width,
    height: t.height,
    scaleX: r.width / tw,
    scaleY: r.height / th,
    transformOrigin: "left top",
    force3D: true,
    "--slot-scale": 1,
  });
  gsap.to(node, {
    left: t.left,
    top: t.top,
    scaleX: 1,
    scaleY: 1,
    "--slot-scale": item.targetSlotScale,
    duration: FLY_DURATION,
    ease: EASE_TRANSFORM,
    onComplete: () => {
      const flyCanvas = node?.querySelector?.("canvas");
            flyingInAnimStarted.delete(item.id);
      flyingInElById.delete(item.id);
      selectTile(item.pendingRow, item.pendingCol);
      queueMicrotask(() => {
        const slotIndex = Math.max(0, selectedOrder.value.length - 1);
        const slotEl = refToDom(wordSlotRefs.value?.[slotIndex]);
        const tileEl = slotEl?.querySelector?.(".word-slot-content");
        const canvas = tileEl?.querySelector?.("canvas");
              });
      requestAnimationFrame(() => {
        const slotIndex = Math.max(0, selectedOrder.value.length - 1);
        const slotEl = refToDom(wordSlotRefs.value?.[slotIndex]);
        const tileEl = slotEl?.querySelector?.(".word-slot-content");
        const canvas = tileEl?.querySelector?.("canvas");
              });
      flyingLetters.value = flyingLetters.value.filter((f) => f.id !== item.id);
    },
  });
}

const FLY_DURATION = 0.25;

function onTileClick(row, col, tile) {
    if (!tile) return;
  if (suppressTilePrimaryClick.value) {
    suppressTilePrimaryClick.value = false;
    return;
  }
  if (dictFatalError.value) return;
  if (transitionBusy.value || showShop.value || showSettlement.value) return;
  if (scoringAnimating.value || gridRefillAnimating.value) return;
  if (tile.selected) return;
  if (isTileFlying(row, col)) return;
  startOneMoveIn(row, col, tile);
}

function cancelAllFlyingIn() {
  const list = [...flyingLetters.value];
  for (const item of list) {
    flyingInAnimStarted.delete(item.id);
  }
  flyingInElById.forEach((node) => {
    if (node) gsap.killTweensOf(node);
  });
  flyingInElById.clear();
  flyingLetters.value = [];
  nextTick(() => updateSlotPositions(true));
}

async function onRemoveClick() {
  if (dictFatalError.value) return;
  if (transitionBusy.value || showShop.value || showSettlement.value) return;
  if (!canRemove.value) return;
  if (flyingLetters.value.length > 0) {
    cancelAllFlyingIn();
  }
  const nSel = selectedOrder.value.length;
  if (nSel === 0) return;

  /** 与提交一致：先收集槽位 DOM，再播依次消失（此时 selectedOrder 仍在，槽位未卸载） */
  const slotTileEls = [];
  for (let i = 0; i < nSel; i++) {
    const el = wordSlotRefs.value[i];
    if (el) slotTileEls.push(el);
  }
  gsap.killTweensOf(slotTileEls);
  gsap.set(slotTileEls, {
    opacity: 1,
    scale: 1,
    y: 0,
    transformOrigin: "50% 50%",
  });
  for (const slotEl of slotTileEls) {
    const ph = slotEl.querySelector(".word-slot-placeholder");
    if (ph) ph.classList.add("word-slot-placeholder--shell");
  }
  const removeGridLeaveEls = getSelectedGridTileElsInOrder();
  gsap.killTweensOf(removeGridLeaveEls);
  gsap.set(removeGridLeaveEls, {
    opacity: 0.1,
    scale: 1,
    y: 0,
    transformOrigin: "50% 50%",
  });

  flashRemovalCountDelta();
  await nextTick();
  await sleep(ACTION_COUNT_DELTA_BEAT_MS);

  gridRefillAnimating.value = true;
  const prevFlip = {
    rects: captureGridRectsByTileId(),
    cells: snapshotGridCellsByTileId(),
  };

  await runSlotAndGridLeaveAnimation(slotTileEls, removeGridLeaveEls, {
    duration: REMOVE_SLOT_FADE_DURATION,
    stagger: REMOVE_SLOT_STAGGER,
  });
  const result = removeSelectedLetters({
    prevCells: prevFlip.cells,
    maxRemovalLetters: MAX_LETTERS_PER_REMOVAL + getRemovalLetterCapBonus(ownedVoucherIds.value),
  });
  if (!result.success) {
    for (const el of removeGridLeaveEls) clearGridTileGsapAfterDrop(el);
    for (const slotEl of slotTileEls) {
      const ph = slotEl.querySelector(".word-slot-placeholder");
      if (ph) ph.classList.remove("word-slot-placeholder--shell");
    }
    gsap.set(slotTileEls, { opacity: 1, scale: 1, y: 0 });
    gridRefillAnimating.value = false;
    showToast(result.error ?? "无法移除");
    return;
  }

  await nextTick();
  await runGridDropAnimation(prevFlip);
  applyCeruleanBellAfterGridStable();
  gridRefillAnimating.value = false;
  nextTick(() => updateSlotPositions(true));
}

function startOneMoveIn(row, col, tile) {
  if (transitionBusy.value || showShop.value || showSettlement.value) return;
  if (gridRefillAnimating.value) return;
  const index = row * COLS + col;
  const fromEl = gridTileRefs.value[index] ?? getGridTileElByIndex(index);
  if (!fromEl) return;
  const fromRect = fromEl.getBoundingClientRect();
  const n = selectedOrder.value.length + flyingLetters.value.length;
  const wrapEl = wordSlotsWrapRef.value;
  if (!wrapEl) return;
  const wrapRect = wrapEl.getBoundingClientRect();
  if (wrapRect.width <= 0 || wrapRect.height <= 0) return;
  const toRect = getScaledSlotRect(wrapRect, n + 1, n);
  if (!toRect) return;
  const numSlots = n + 1;
  const totalDesign = numSlots * SLOT_TILE_W + (numSlots - 1) * SLOT_GAP;
  const targetSlotScale = numSlots === 0 ? 1 : Math.min(1, MIDDLE_MAX_W / totalDesign);
  flyingLetters.value = [
    ...flyingLetters.value,
    {
      id: `fly-in-${++flyingInIdCounter}-${Date.now()}`,
      fromRect,
      toRect,
      targetSlotScale,
      letter: tile.letter,
      rarity: tile.rarity,
      materialId: tile.materialId ?? null,
      accessoryId: tile.accessoryId ?? null,
      pendingRow: row,
      pendingCol: col,
    },
  ];
}

function onSlotClick(i) {
  if (suppressTilePrimaryClick.value) {
    suppressTilePrimaryClick.value = false;
    return;
  }
  if (dictFatalError.value) return;
  if (transitionBusy.value || showShop.value || showSettlement.value) return;
  if (scoringAnimating.value) return;
  const order = selectedOrder.value;
  if (i < 0 || i >= order.length) return;
  startOneMoveOut(i);
}

function startOneMoveOut(slotIndex) {
  const order = selectedOrder.value;
  if (slotIndex < 0 || slotIndex >= order.length) return;
  if (ceruleanBellSlotIndex.value != null && slotIndex <= ceruleanBellSlotIndex.value) return;
  const batches = flyingBackBatches.value;
  const fromRefs = wordSlotRefs.value;
  const pres = wordSlotTilePresentations.value;
  const list = [];
  for (let j = slotIndex; j < order.length; j++) {
    if (batches.some((b) => b.slotIndex <= j)) continue;
    const fromEl = fromRefs[j];
    const { row, col } = order[j];
    const toEl = gridTileRefs.value[row * COLS + col];
    const tile = grid.value[row][col];
    if (!fromEl || !toEl) continue;
    const pv = pres[j];
    list.push({
      fromRect: fromEl.getBoundingClientRect(),
      toRect: toEl.getBoundingClientRect(),
      letter: pv?.letter ?? tile.letter,
      rarity: pv?.rarity ?? tile.rarity,
      materialId: tile.materialId ?? null,
      accessoryId: tile.accessoryId ?? null,
    });
  }
  if (list.length === 0) return;
  const startScale = slotScaleRuntime;
  const listWithScale = list.map((item) => ({ ...item, startSlotScale: startScale }));
  const batchId = `fly-back-${++flyingBackBatchIdCounter}-${Date.now()}`;
  const meta = { slotIndex, total: list.length, completed: 0 };
  flyingBackBatchMeta[batchId] = meta;
  flyingBackBatches.value = [
    ...flyingBackBatches.value,
    { id: batchId, slotIndex, list: listWithScale },
  ];
  for (const item of listWithScale) {
    const el = createFlyBackElement(item);
    document.body.appendChild(el);
    const tw = Math.max(item.toRect.width, 1e-6);
    const th = Math.max(item.toRect.height, 1e-6);
    gsap.killTweensOf(el);
    gsap.set(el, {
      zIndex: bumpOverlayZ(),
      left: item.fromRect.left,
      top: item.fromRect.top,
      width: item.toRect.width,
      height: item.toRect.height,
      scaleX: item.fromRect.width / tw,
      scaleY: item.fromRect.height / th,
      transformOrigin: "left top",
      force3D: true,
      "--slot-scale": String(item.startSlotScale ?? 1),
    });
    gsap.to(el, {
      left: item.toRect.left,
      top: item.toRect.top,
      scaleX: 1,
      scaleY: 1,
      "--slot-scale": 1,
      duration: FLY_DURATION,
      ease: EASE_TRANSFORM,
      onComplete: () => {
        disposeFlyBackTileElement(el);
        el.remove();
        meta.completed += 1;
        if (meta.completed >= meta.total) {
          removeFromSlot(meta.slotIndex);
          flyingBackBatches.value = flyingBackBatches.value.filter((b) => b.id !== batchId);
          delete flyingBackBatchMeta[batchId];
        }
      },
    });
  }
}

/** 创建飞回用 DOM 元素（点击时立即创建并启动动画，不依赖 nextTick/ref） */
function createFlyBackElement(item) {
  return createFlyBackTileElement(item);
}

/**
 * 关内最后一次出牌机会：若本词首格佩戴 `vip_diamond`，则该格稀有度对应的全局稀有度等级 +1，
 * 并播与商店稀有度升级一致的顶栏动效（在整段记分与补牌完成之后执行）。
 */
async function runLastSubmitVipDiamondRarityFxIfApplicable(tiles, isLastSubmitChance) {
  if (!isLastSubmitChance || !Array.isArray(tiles) || tiles.length === 0) return;
  const first = tiles[0];
  if (!first || first.accessoryId !== TILE_ACCESSORY_VIP_DIAMOND) return;
  const rk = String(first.rarity ?? "common");
  if (!LETTER_RARITY_ORDER.includes(rk)) return;
  const beforeLevel = Math.max(1, Math.round(Number(rarityLevelsByRarity.value?.[rk])) || 1);
  setRarityLevel(rk, beforeLevel + 1);
  refreshGridTileBaseScoresFromLevels();
  await runInGameRarityUpgradeShopLikeFx({
    areaRef: gameResultAreaRef,
    model: lastSubmitRarityFxModel,
    fxActive: lastSubmitRarityFxActive,
    waitNextTick: () => nextTick(),
    rarityKey: rk,
    beforeLevel,
    speed: 1,         
  });
}
    
async function submitWord() {
  if (dictFatalError.value) return;
  if (transitionBusy.value || showShop.value || showSettlement.value) return;
  if (scoringAnimating.value) return;
  if (!dictionaryReady.value) return;
  let selectedEntries = selectedTiles.value;
  const wordPattern0 = selectedEntries.map(({ tile }) => tile.letter.toLowerCase()).join("");
  if (!wordPattern0) return;
  let resolvedWord = resolveWordPattern(wordPattern0, "?");
  if (!resolvedWord) {
    showToast("不是有效单词");
    return;
  }
  if (selectedEntries.some(({ tile }) => tile?.bossTileDebuffed)) {
    selectedEntries = selectedEntries.filter(({ tile }) => !tile?.bossTileDebuffed);
    const pat2 = selectedEntries.map(({ tile }) => tile.letter.toLowerCase()).join("");
    resolvedWord = resolveWordPattern(pat2, "?");
    if (!resolvedWord) {
      showToast("被削弱的字母无法组成有效单词");
      return;
    }
  }
  const ownedSlotTreasureIds = ownedTreasures.value.map((s) => s?.treasureId ?? null);
  const tiles = withWildcardsResolvedForScoring(
    selectedEntries.map(({ tile }) => ({ ...tile })),
    resolvedWord,
    rarityLevelsByRarity.value,
  );
  const submittedIceTileIds = tiles
    .filter((t) => t?.materialId === "ice")
    .map((t) => String(t?.id ?? ""))
    .filter(Boolean);
  const ownedSlotTreasureAccessoryIds = ownedTreasures.value.map((s) => s?.treasureAccessoryId ?? null);
  /** 与号角等一致：仅当本手消耗关内最后一次出牌机会（提交前剩余 1 次） */
  const isLastSubmitChance = remainingWords.value === 1;
  const gSubmit = grid.value;
  const submitExcludedGridKeys = gridSelectedPositionKeySet(selectedTiles.value);
  const gridPresencePostLetterSteps = buildGridPresencePostLetterSteps(
    gSubmit,
    ROWS,
    COLS,
    submitExcludedGridKeys,
    getGridEffectTriggerCount,
  );
  const lengthJb = getWordLengthJudgmentBonus(ownedVoucherIds.value);
  const judgedLenTable = getJudgedLengthTableLenForOwnedVouchers(tiles.length, ownedVoucherIds.value);
  const soft = evaluateBossSoftWordViolation({
    slug: activeBossSlug.value,
    wordLen: judgedLenTable,
    resolvedWord,
    getWordDefinition,
    usedLengthsThisLevel: usedWordLengthsThisBoss.value,
    mouthLockedLength: mouthLockedLengthBoss.value,
    clubRequiredKey: clubRequiredKeyBoss.value || "",
  });
  const submitViolated = soft.violated;
  if (submitViolated) {
    bossTapeAttentionPulse.value = true;
    nextTick(() => {
      bossTapeAttentionPulse.value = false;
    });
  }
  crimsonTreasureDisabledSlotIndex.value = null;
  let crimsonSet = /** @type {Set<number> | null} */ (null);
  if (activeBossSlug.value === "crimson_heart") {
    const ix = pickCrimsonDisabledTreasureSlotIndex();
    if (ix != null) {
      crimsonSet = new Set([ix]);
      crimsonTreasureDisabledSlotIndex.value = ix;
    }
  }
  const observatoryMult = getObservatoryLengthMultFactor(
    ownedVoucherIds.value,
    judgedLenTable,
    maxSubmittedWordLengthSoFar.value,
  );
  let detailed = computeWordScoreDetailedForSubmit(
    tiles,
    ownedSlotTreasureIds,
    basketballWordsSubmitted.value,
    remainingRemovals.value,
    spellCountsByLength.value,
    deckCount.value,
    isLastSubmitChance,
    lengthLevelsByLength.value,
    rarityLevelsByRarity.value,
    gridPresencePostLetterSteps,
    ownedSlotTreasureAccessoryIds,
    observatoryMult,
    lengthJb,
    {
      disabledTreasureSlotIndices: crimsonSet,
      bossFlintQuarter: activeBossSlug.value === "the_flint",
    },
  );
  if (submitViolated) {
    bossTapeWobble.value = true;
    setTimeout(() => {
      bossTapeWobble.value = false;
    }, 520);
    const lp = (detailed.letterParts || []).map((p) => ({
      ...p,
      baseScore: 0,
      rarityBonus: 0,
      tileScoreBonus: 0,
      materialScoreBonus: 0,
      letterMultBonus: 0,
    }));
    detailed = {
      ...detailed,
      letterParts: lp,
      scoreSum: 0,
      finalScore: 0,
      postLetterTreasureSteps: [],
      bossSoftViolation: true,
    };
  }
  flashSubmitCountDelta();
  remainingWords.value = Math.max(0, remainingWords.value - 1);
  await nextTick();
  await sleep(ACTION_COUNT_DELTA_BEAT_MS);
  scoringAnimating.value = true;
  scoringLetterIndex.value = -1;
  try {
    await runSubmitScoringSequence(tiles, detailed, resolvedWord);
    for (const iceTileId of submittedIceTileIds) {
      if (Math.random() < ICE_MATERIAL_SELF_DESTRUCT_CHANCE) {
        consumeIceTileOnGrid(iceTileId);
      }
    }
    await runLastSubmitVipDiamondRarityFxIfApplicable(tiles, isLastSubmitChance);
    if (!submitViolated) {
      await notifyOwnedTreasuresSuccessfulWordSubmit(ownedSlotTreasureIds, {
        ownedSlotTreasureIds,
        incrementChargeWordSubmissionCount: bumpBasketballWordSubmitted,
        submittedScoringTiles: tiles.map((t) => ({ materialId: t?.materialId ?? null })),
        mutateRandomNonWildcardLetterTileToWildcard,
      });
      recordSpellWordLength(judgedLenTable);
      maxSubmittedWordLengthSoFar.value = Math.max(maxSubmittedWordLengthSoFar.value, judgedLenTable);
      const sub = parseLevelSubFromId(currentLevel.value?.id ?? "1-1");
      if (sub <= 2) {
        for (const t of tiles) {
          const c = t?._deckCard;
          const uid = c && typeof c === "object" ? Number(/** @type {{ _dcUid?: number }} */ (c)._dcUid) : NaN;
          if (Number.isFinite(uid)) pillarUsedDeckUids.value.add(uid);
        }
      }
      if (activeBossSlug.value === "the_eye") usedWordLengthsThisBoss.value.add(judgedLenTable);
      mouthLockedLengthBoss.value = nextMouthLockedLengthAfterSubmit(
        mouthLockedLengthBoss.value,
        judgedLenTable,
        false,
      );
      if (activeBossSlug.value === "the_arm") {
        const curLv = Math.max(1, Math.round(Number(lengthLevelsByLength.value[judgedLenTable])) || 1);
        setWordLengthLevel(judgedLenTable, Math.max(1, curLv - 1));
      }
      const oxHit =
        activeBossSlug.value === "the_ox" && evaluateOxBossHit(judgedLenTable, spellCountsByLength.value);
      recordSpellWordLength(judgedLenTable);
      if (oxHit) money.value = 0;
    } else {
      mouthLockedLengthBoss.value = nextMouthLockedLengthAfterSubmit(
        mouthLockedLengthBoss.value,
        judgedLenTable,
        true,
      );
    }
    if (currentScore.value >= targetScore.value) {
      await openStageSettlement();
    }
  } catch (e) {
    console.error(e);
    remainingWords.value += 1;
    scoringAnimating.value = false;
    scoringLetterIndex.value = -1;
    roundScoreOverride.value = null;
    submitTranslationLines.value = [];
    const tw = wordTranslationWrapRef.value;
    if (tw) {
      gsap.killTweensOf(tw);
      tw.style.height = "";
      tw.style.overflow = "";
    }
    showToast("提交出错");
  }
}

watch(
  () => selectedLetters.value.length,
  () => {
    nextTick(() => updateSlotPositions(true));
  }
);

let gamePanelAlive = true;

onMounted(async () => {
  await loadDictionary({ shouldAbort: () => !gamePanelAlive });
  if (!gamePanelAlive) return;
  slotRafLastTime = performance.now();
  slotRafId = requestAnimationFrame(slotRafLoop);
  if (!gamePanelAlive) return;
  await runGridIntroAfterReset();
});
onUnmounted(() => {
  gamePanelAlive = false;
  if (settlementTl) {
    settlementTl.kill();
    settlementTl = null;
  }
  if (walletGainTl) {
    walletGainTl.kill();
    walletGainTl = null;
  }
  if (levelAdvanceFxTl) {
    levelAdvanceFxTl.kill();
    levelAdvanceFxTl = null;
  }
  const levelEl = levelTitleBoxRef.value;
  if (levelEl) {
    gsap.killTweensOf(levelEl);
    gsap.set(levelEl, { clearProps: "boxShadow,filter,scale,rotation" });
  }
  const wEl = headerWalletMarksRef.value;
  if (wEl) gsap.killTweensOf(wEl);
  const card = settlementCardRef.value;
  if (card) gsap.killTweensOf(card);
  for (const el of settlementRowEls.value) {
    if (el) gsap.killTweensOf(el);
  }
  const settleBtn = settlementContinueBtnRef.value;
  if (settleBtn) gsap.killTweensOf(settleBtn);
  if (deckExpandFlipTl) {
    deckExpandFlipTl.kill();
    deckExpandFlipTl = null;
  }
  if (slotRafId) cancelAnimationFrame(slotRafId);
  if (submitDeltaClearTimer) clearTimeout(submitDeltaClearTimer);
  if (removalDeltaClearTimer) clearTimeout(removalDeltaClearTimer);
  clearTileLongPressArm();
});
</script>

<style scoped>
/* 关卡标题：进关动效用 GSAP 写 scale/阴影，此处保证变换原点 */
.header-box-level-title {
  transform-origin: 50% 50%;
}

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
  filter: drop-shadow(0 0 calc(6 * var(--rpx)) rgba(255, 235, 59, 0.55));
}
.action-count-delta-red {
  color: #ff8a80;
  filter: drop-shadow(0 0 calc(6 * var(--rpx)) rgba(255, 82, 82, 0.45));
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
.toast {
  position: fixed;
  left: 50%;
  bottom: calc(120 * var(--rpx));
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: calc(12 * var(--rpx)) calc(24 * var(--rpx));
  border-radius: var(--radius);
  font-size: calc(22 * var(--rpx));
  opacity: 1;
  animation: toastIn 0.32s var(--ease-expo-out) both;
}
@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(calc(8 * var(--rpx)));
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* 飞字样式见全局 css/game.css（.fly-letter / .fly-letter-back） */

/* 牌库堆叠格：展开列表中单块包一层以接右键/长按 */
.deck-expand-tile-hit {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ----- 牌库浮层 ----- */
.deck-layer {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(12 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
}
.deck-layer-inner {
  --deck-layer-tile-size: calc(72 * var(--rpx));
  position: relative;
  overflow: visible;
  background: #7a6f65;
  border-radius: calc(14 * var(--rpx));
  box-shadow: 0 calc(12 * var(--rpx)) calc(40 * var(--rpx)) rgba(0, 0, 0, 0.35);
  padding: calc(18 * var(--rpx)) calc(20 * var(--rpx)) calc(16 * var(--rpx));
  box-sizing: border-box;
  width: min(calc(100% - 32 * var(--rpx)), min(96vw, calc(920 * var(--rpx))));
  max-width: min(96vw, calc(920 * var(--rpx)));
  max-height: min(92vh, calc(960 * var(--rpx)));
  height: auto;
  min-height: min(52vh, calc(440 * var(--rpx)));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(14 * var(--rpx));
  border: calc(2 * var(--rpx)) solid rgba(255, 255, 255, 0.12);
}
.deck-layer-title {
  position: relative;
  z-index: 3;
  font-size: calc(30 * var(--rpx));
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 0.04em;
  text-shadow: 0 calc(1 * var(--rpx)) calc(2 * var(--rpx)) rgba(0, 0, 0, 0.2);
}
.dict-fatal-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24 * var(--rpx));
  background: rgba(0, 0, 0, 0.5);
  border-radius: calc(12 * var(--rpx));
}
.dict-fatal-card {
  width: min(calc(560 * var(--rpx)), 100%);
  background: #7a6f65;
  border-radius: calc(14 * var(--rpx));
  padding: calc(28 * var(--rpx));
  box-shadow: 0 calc(12 * var(--rpx)) calc(40 * var(--rpx)) rgba(0, 0, 0, 0.35);
  border: calc(2 * var(--rpx)) solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  gap: calc(16 * var(--rpx));
  align-items: center;
  text-align: center;
  color: #fff;
}
.dict-fatal-title {
  font-size: calc(34 * var(--rpx));
  font-weight: 800;
  letter-spacing: 0.02em;
}
.dict-fatal-message {
  font-size: calc(24 * var(--rpx));
  line-height: 1.55;
  opacity: 0.95;
}
.dict-fatal-btn {
  border: none;
  border-radius: var(--radius);
  padding: calc(14 * var(--rpx)) calc(22 * var(--rpx));
  background: var(--btn-yellow);
  color: #776e65;
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow);
}
.dict-fatal-btn:hover {
  filter: brightness(1.08);
}
.dict-fatal-btn:active {
  filter: brightness(0.92);
}
.deck-layer-grid-slot {
  flex: 0 1 auto;
  width: 100%;
  min-width: 0;
  overflow: visible;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0;
}
/* 牌库：按字母分堆；同中心旋转叠放；与展开区共用 --deck-layer-tile-size */
.deck-layer-stacks {
  --deck-stack-size: var(--deck-layer-tile-size);
  --deck-tile-size: var(--deck-layer-tile-size);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;
  align-items: flex-start;
  gap: calc(22 * var(--rpx)) calc(26 * var(--rpx));
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: visible;
  padding: calc(8 * var(--rpx)) calc(12 * var(--rpx)) calc(14 * var(--rpx)) calc(8 * var(--rpx));
}
.deck-stack {
  position: relative;
  flex: 0 0 auto;
  width: var(--deck-stack-size);
  height: var(--deck-stack-size);
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: calc(var(--deck-stack-size) * 0.08);
  box-sizing: border-box;
  overflow: visible;
}
.deck-stack:disabled,
.deck-stack--ghost {
  cursor: default;
  pointer-events: none;
}
.deck-stack:not(:disabled):hover .deck-stack-pile {
  filter: brightness(1.06);
}
.deck-stack:not(:disabled):active .deck-stack-pile {
  transform: scale(0.97);
}
.deck-stack-count {
  position: absolute;
  /* 约 1/3～1/2 角标向右下伸出 stack 外框 */
  right: calc(-8 * var(--rpx));
  bottom: calc(-8 * var(--rpx));
  z-index: 12;
  min-width: calc(22 * var(--rpx));
  height: calc(22 * var(--rpx));
  padding: 0 calc(6 * var(--rpx));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: calc(13 * var(--rpx));
  font-weight: 800;
  color: #fff;
  background: rgba(40, 36, 32, 0.88);
  border-radius: calc(10 * var(--rpx));
  box-shadow: 0 calc(1 * var(--rpx)) calc(3 * var(--rpx)) rgba(0, 0, 0, 0.35);
  pointer-events: none;
}
.deck-stack--ghost .deck-stack-count {
  background: rgba(40, 36, 32, 0.45);
  color: rgba(255, 255, 255, 0.75);
}
.deck-stack-pile {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  transition: transform 0.12s var(--ease-expo-out), filter 0.15s;
  transform-origin: 50% 50%;
}
.deck-stack-pile-cell {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  transform-origin: 50% 50%;
}
.deck-layer-stacks :deep(.deck-stack-pile-tile.grid-tile) {
  position: relative;
  width: var(--deck-layer-tile-size);
  height: var(--deck-layer-tile-size);
  border-radius: calc(var(--deck-layer-tile-size) * 0.06);
  font-size: calc(var(--deck-layer-tile-size) * 0.42);
  cursor: inherit;
  pointer-events: none;
  box-sizing: border-box;
  overflow: hidden;
}
.deck-layer-stacks :deep(.deck-stack-pile-tile .letter-gem) {
  display: none;
}
.deck-stack-ghost-face {
  width: var(--deck-stack-size);
  height: var(--deck-stack-size);
  border-radius: calc(var(--deck-stack-size) * 0.06);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.12);
  border: calc(2 * var(--rpx)) dashed rgba(255, 255, 255, 0.28);
  box-shadow: inset 0 0 0 calc(1 * var(--rpx)) rgba(0, 0, 0, 0.06);
  opacity: 0.42;
}
.deck-stack-ghost-char {
  font-size: calc(var(--deck-stack-size) * 0.36);
  font-weight: 800;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.02em;
}

.deck-stack-expand-enter-active,
.deck-stack-expand-leave-active {
  transition: opacity 0.18s var(--ease-expo-out);
}
.deck-stack-expand-enter-from,
.deck-stack-expand-leave-to {
  opacity: 0;
}
.deck-stack-expand-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: calc(14 * var(--rpx));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: calc(12 * var(--rpx));
  padding: calc(12 * var(--rpx)) calc(16 * var(--rpx)) calc(16 * var(--rpx));
  overflow: visible;
  background: rgba(58, 52, 46, 0.4);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.deck-stack-expand-toolbar {
  flex: 0 0 auto;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: calc(10 * var(--rpx));
}
.deck-stack-expand-sr-title {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.deck-stack-expand-toolbar .shop-btn.deck-stack-expand-back {
  flex: 0 0 auto;
  width: auto;
  min-width: calc(160 * var(--rpx));
  max-width: calc(280 * var(--rpx));
  padding: calc(16 * var(--rpx)) calc(20 * var(--rpx));
  font-size: calc(24 * var(--rpx));
}
.deck-stack-expand-scroll {
  --deck-expand-tile-size: var(--deck-layer-tile-size);
  --deck-tile-size: var(--deck-expand-tile-size);
  flex: 0 1 auto;
  width: 100%;
  min-width: 0;
  overflow: visible;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;
  gap: calc(18 * var(--rpx)) calc(20 * var(--rpx));
  padding: calc(8 * var(--rpx)) calc(4 * var(--rpx)) calc(6 * var(--rpx));
  box-sizing: border-box;
}
.deck-stack-expand-scroll :deep(.deck-expand-face-tile.grid-tile) {
  position: relative;
  width: var(--deck-expand-tile-size);
  height: var(--deck-expand-tile-size);
  border-radius: calc(var(--deck-expand-tile-size) * 0.06);
  font-size: calc(var(--deck-expand-tile-size) * 0.42);
  cursor: pointer;
  box-sizing: border-box;
  overflow: hidden;
}
.deck-stack-expand-scroll :deep(.deck-expand-face-tile .letter-gem) {
  left: calc(var(--deck-expand-tile-size) * 0.045);
  bottom: calc(var(--deck-expand-tile-size) * 0.045);
  width: calc(var(--deck-expand-tile-size) * 0.106);
  height: calc(var(--deck-expand-tile-size) * 0.106);
}
.deck-stack-expand-scroll :deep(.deck-expand-face-tile .letter-gem.gem-common) {
  background: #e8e4dc;
  border: 1px solid #9c8b7a;
}
.deck-stack-expand-scroll :deep(.deck-expand-face-tile .letter-gem.gem-rare) {
  background: #5b9bd5;
}
.deck-stack-expand-scroll :deep(.deck-expand-face-tile .letter-gem.gem-epic) {
  background: #9b59b6;
}
.deck-stack-expand-scroll :deep(.deck-expand-face-tile .letter-gem.gem-legendary) {
  background: #e67e22;
}
.deck-layer-inner > .shop-btn.deck-layer-confirm {
  position: relative;
  z-index: 5;
  width: 100%;
  max-width: calc(280 * var(--rpx));
  padding: calc(16 * var(--rpx)) calc(20 * var(--rpx));
  font-size: calc(24 * var(--rpx));
}
.deck-layer-enter-active,
.deck-layer-leave-active {
  transition: opacity 0.22s var(--ease-expo-out);
}
.deck-layer-enter-from,
.deck-layer-leave-to {
  opacity: 0;
}

/* ----- 小关结算层 ----- */
/* 与分数面板「分数」格同色 #6ec4f0，整层约 0.8 透明度 */
.stage-settlement-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(32 * var(--rpx)) calc(24 * var(--rpx));
  background: rgba(110, 196, 240, 0.8);
  border-radius: calc(12 * var(--rpx));
  box-sizing: border-box;
}

/* 内层：与主界面一致的扁平 2048 风（card-bright + 轻阴影） */
.stage-settlement-card {
  width: 100%;
  max-width: calc(680 * var(--rpx));
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(32 * var(--rpx)) calc(26 * var(--rpx));
  box-shadow: var(--shadow);
  border: none;
}

.stage-settlement-title {
  margin: 0 0 calc(8 * var(--rpx));
  font-size: calc(40 * var(--rpx));
  font-weight: 700;
  color: var(--text);
  text-align: center;
  letter-spacing: 0.02em;
}

.stage-settlement-sub {
  margin: 0 0 calc(24 * var(--rpx));
  font-size: calc(26 * var(--rpx));
  color: var(--text-soft);
  text-align: center;
  line-height: 1.45;
}

.stage-settlement-rows {
  display: flex;
  flex-direction: column;
  gap: calc(12 * var(--rpx));
  margin-bottom: calc(26 * var(--rpx));
}

.settle-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: calc(14 * var(--rpx));
  padding: calc(16 * var(--rpx)) calc(20 * var(--rpx));
  /* 动画从空串到有 $ 时占位高度不变（与最大字号行一致） */
  min-height: calc(76 * var(--rpx));
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.55);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  transition: opacity 0.25s var(--ease-expo-out);
  transform-origin: 50% 50%;
}

.settle-row--empty {
  opacity: 0.42;
}

.settle-row-total {
  background: rgba(255, 255, 255, 0.72);
}

.settle-row-total.settle-row--empty {
  opacity: 0.42;
}

.settle-label {
  font-size: calc(26 * var(--rpx));
  font-weight: 600;
  color: var(--text-soft);
  flex-shrink: 0;
}

.settle-value.settle-dollars {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  min-width: 0;
  min-height: calc(38 * var(--rpx));
  font-size: calc(31 * var(--rpx));
  font-weight: 800;
  line-height: 1;
  color: var(--money-gold);
  letter-spacing: 0.06em;
  text-align: right;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 calc(1 * var(--rpx)) 0 rgba(255, 255, 255, 0.35);
}

.settle-total {
  font-size: calc(36 * var(--rpx)) !important;
  font-weight: 800 !important;
  min-height: calc(43 * var(--rpx)) !important;
  color: var(--money-gold) !important;
}

.stage-settlement-btn {
  width: 100%;
  border: none;
  border-radius: var(--radius);
  padding: calc(19 * var(--rpx)) calc(28 * var(--rpx));
  font-family: inherit;
  font-size: calc(33 * var(--rpx));
  font-weight: 700;
  color: #f9f6f2;
  background: #5a8fb8;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: filter 0.12s ease, transform 0.1s var(--ease-expo-out);
}

.stage-settlement-btn:hover:not(:disabled) {
  filter: brightness(1.05);
}

.stage-settlement-btn:active:not(:disabled) {
  transform: scale(0.99);
  filter: brightness(0.96);
}

.stage-settlement-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.deck-btn:disabled {
  opacity: 0.4;
  pointer-events: none;
}

.settle-layer-enter-active,
.settle-layer-leave-active {
  transition: opacity 0.28s var(--ease-expo-out);
}

.settle-layer-enter-active .stage-settlement-card,
.settle-layer-leave-active .stage-settlement-card {
  transition:
    opacity 0.32s var(--ease-expo-out),
    transform 0.32s var(--ease-expo-out);
}

.settle-layer-enter-from,
.settle-layer-leave-to {
  opacity: 0;
}

.settle-layer-enter-from .stage-settlement-card,
.settle-layer-leave-to .stage-settlement-card {
  opacity: 0;
  transform: scale(0.94) translateY(12px);
}
</style>
