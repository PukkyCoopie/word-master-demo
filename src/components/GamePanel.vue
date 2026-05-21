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
          :interactions-disabled="shopUpgradeAnimating || packPickBusy || !!packPickSession || !!bossRerollSession"
          :treasure-charge-by-slot="treasureChargeVisualBySlot"
          :treasure-charge-progress-by-slot="treasureChargeProgressBySlot"
          @view-deck="showDeckLayer = true"
          @view-round-info="openInfoModal('level')"
          @next-level="onShopNextLevel"
          @shop-reroll="onShopReroll"
          @select-offer="onShopSelectOffer"
          @select-pack-offer="onShopSelectPackOffer"
          @select-voucher="onShopSelectPackOffer"
          @select-owned="onShopSelectOwned"
          @reorder-owned="onShopReorderOwned"
          @upgrade-interaction-unlock="onShopUpgradeInteractionUnlock"
        />
      </div>
    </Teleport>

    <!-- 牌库浮层：Teleport 到 portal，z-index 由 overlayStack 按出现顺序递增 -->
    <Teleport defer to="#game-view-portal">
      <Transition name="deck-layer">
        <div
          v-show="showDeckLayer"
          class="deck-layer portal-overlay-fill"
          :class="{ 'portal-overlay--shop-upgrade-suppressed': shopOverlayLayersSuppressed }"
          :style="deckPortalStackStyle"
          @click.self="onDeckLayerBackdropClick"
        >
        <div
          ref="deckLayerInnerRef"
          class="deck-layer-inner"
          :class="{ 'deck-layer-inner--enter-boot': deckLayerEnterBoot }"
        >
          <div class="deck-layer-title deck-layer-enter-stagger">牌库</div>
          <div class="deck-layer-grid-slot">
            <div class="deck-layer-stacks">
              <button
                v-for="stack in deckStacksView"
                :key="stack.raw"
                type="button"
                class="deck-stack deck-layer-enter-stagger"
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
                    :class="{ 'deck-stack-pile-cell--dimmed': entry.dimmed }"
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
                    :class="{ 'deck-expand-tile-hit--dimmed': entry.dimmed }"
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
          <button
            type="button"
            class="shop-btn shop-btn--buy deck-layer-confirm deck-layer-enter-stagger"
            @click="showDeckLayer = false"
          >
            确定
          </button>
        </div>
      </div>
    </Transition>
    </Teleport>

    <TreasureDetailLayer
      v-if="treasureDetail"
      ref="treasureDetailLayerRef"
      :overlay-suppressed="shopOverlayLayersSuppressed"
      :treasure="treasureDetail.treasure"
      :description-override="treasureDetailDescriptionOverride"
      :charge-visual-state="treasureDetailChargeVisualState"
      :charge-progress="treasureDetailChargeProgress"
      :mode="treasureDetailMode"
      :wallet-amount="walletHeaderShown"
      :sell-refund="treasureSellRefund"
      :can-buy-offer="treasureCanBuyOffer"
      :pack-inner-already-claimed="treasurePackInnerAlreadyClaimed"
      :origin-rect="treasureDetail.originRect ?? null"
      :owned-voucher-ids="ownedVoucherIds"
      :spell-replay-target-spell-id="lastReplayableSpellId"
      :rarity-levels-by-rarity="rarityLevelsByRarity"
      :probability-display-doubled="treasureProbabilityDisplayDoubled"
      @close="treasureDetail = null"
      @purchase="onTreasurePurchase"
      @sell="onTreasureSell"
    />
    <PackPickLayer
      v-if="packPickSession"
      ref="packPickLayerRef"
      :overlay-suppressed="shopOverlayLayersSuppressed || packPickOverlaySuppressed"
      :session="packPickSession"
      :wallet-amount="walletHeaderShown"
      :owned-voucher-ids="ownedVoucherIds"
      :disabled="packPickBusy"
      @open-item="onPackPickOpenItem"
      @skip="onPackPickSkip"
    />
    <SpellTargetLayer
      v-if="spellTargetSession"
      ref="spellTargetLayerRef"
      :overlay-suppressed="shopOverlayLayersSuppressed"
      :session="spellTargetSession"
      @confirm="onSpellTargetConfirm"
      @cancel="onSpellTargetCancel"
    />
    <BossBlindRerollLayer
      v-if="bossRerollSession"
      :overlay-suppressed="shopOverlayLayersSuppressed"
      :session="bossRerollSession"
      :wallet-amount="walletHeaderShown"
      :owned-voucher-ids="ownedVoucherIds"
      @reroll="onBossBlindRerollPaid"
      @continue="onBossBlindRerollContinue"
    />
    <TileDetailLayer
      v-if="tileDetailPayload"
      :overlay-suppressed="shopOverlayLayersSuppressed"
      :payload="tileDetailPayload"
      :origin-rect="tileDetailOriginRect"
      :rarity-levels-by-rarity="rarityLevelsByRarity"
      @close="closeTileDetail"
    />
    <Teleport defer to="#game-view-portal">
      <div v-if="dictFatalError" class="dict-fatal-layer portal-overlay-fill" :style="dictFatalPortalStackStyle">
        <div class="dict-fatal-card">
          <div class="dict-fatal-title">词典加载失败</div>
          <div class="dict-fatal-message">{{ dictError || "无法加载词典，请检查资源后重试" }}</div>
          <button type="button" class="dict-fatal-btn" @click="reloadPage">刷新重试</button>
        </div>
      </div>
    </Teleport>

    <template v-if="!showShop">
    <div class="top-area">
      <div class="header">
        <div ref="levelTitleBoxRef" class="header-box header-box-level-title header-box-level-title--clickable"
          role="button"
          tabindex="0"
          title="查看关卡进度"
          :aria-label="`${levelTitleLabel}，点击查看关卡进度`"
          @click="openInfoModal('stage')"
          @keydown.enter.prevent="openInfoModal('stage')"
          @keydown.space.prevent="openInfoModal('stage')"
        >
          {{ levelTitleLabel }}</div>
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
        class="boss-tape-wrap"
        :class="{ 'boss-tape-wrap--violate': bossTapeSoftPreview }"
      >
        <div v-if="bossTapeSoftPreview" class="boss-tape-ripples" aria-hidden="true">
          <span class="boss-tape-ripple" />
          <span class="boss-tape-ripple" />
          <span class="boss-tape-ripple" />
        </div>
        <div
          class="boss-tape"
          :class="{
            'boss-tape--attention': bossTapeAttentionPulse,
            'boss-tape--wobble': bossTapeWobble,
          }"
        >
          <div class="boss-tape-title">{{ bossStripDef.nameZh }}</div>
          <div class="boss-tape-desc">{{ bossTapeSubLine }}</div>
        </div>
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
              {
                'word-slot-tile-out': isSlotOutOfFlow(i),
                'word-slot-scoring-highlight': scoringLetterIndex === i,
                'word-slot-tile--boss-debuff': !!entry.bossTileDebuffed,
              },
            ]"
            @click="onSlotClick(i)"
            @contextmenu.prevent.stop="onWordSlotContextMenu($event, i)"
            @pointerdown="onWordSlotDetailPointerDown($event, i)"
          >
            <div class="word-slot-placeholder" aria-hidden="true"></div>
            <LetterTile
              variant="wordSlotContent"
              :class="{ 'player-marked': entry.playerMarked === true }"
              :letter="entry.letter"
              :rarity="entry.rarity"
              :material-id="entry.materialId ?? null"
              :accessory-id="entry.accessoryId ?? null"
              :treasure-accessory-id="entry.treasureAccessoryId ?? null"
              :tile-score-bonus="Number(entry.tileScoreBonus) || 0"
              :tile-mult-bonus="Number(entry.letterMultBonus) || 0"
              :content-hidden="isSlotContentHidden(i)"
              :boss-tile-debuffed="!!entry.bossTileDebuffed"
              :cerulean-bell-locked="entry.ceruleanBellLocked === true"
              :vowel-ghost-prev="vowelGhostForTile(entry)?.prev ?? null"
              :vowel-ghost-next="vowelGhostForTile(entry)?.next ?? null"
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
            :amber-boss-mask="isAmberBossMaskActive"
            :crimson-hand-disabled="isCrimsonBossMechanicsActive && scoringAnimating && crimsonTreasureDisabledSlotIndex === i"
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
            :disabled="isRunFlowOverlayOpen()"
            @click="!isRunFlowOverlayOpen() && openInfoModal('level')"
          >
            <i class="ri-information-line"></i>
          </button>
          <button
            type="button"
            class="icon-btn icon-btn-yellow"
            title="选项"
            aria-label="选项"
            :disabled="transitionBusy || showShop || isBlockingPauseOpen()"
            @click="openPauseOptions"
          >
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
                :treasure-accessory-id="tile.treasureAccessoryId ?? null"
                :tile-score-bonus="Number(tile.tileScoreBonus) || 0"
                :tile-mult-bonus="Number(tile.letterMultBonus) || 0"
                :boss-grid-blocked="tile.bossGridBlocked === true"
                :boss-tile-debuffed="tile.bossTileDebuffed === true"
                :cerulean-bell-locked="tile.ceruleanBellLocked === true"
                :vowel-ghost-prev="vowelGhostForTile(tile)?.prev ?? null"
                :vowel-ghost-next="vowelGhostForTile(tile)?.next ?? null"
                :ref="el => setGridTileRef(index, el)"
                :class="{
                  selected: tile.selected,
                  'tile-flying': isTileFlying(Math.floor(index / COLS), index % COLS),
                  'player-marked': tile.playerMarked === true,
                }"
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
        <div class="grid-deck-aux-row">
          <button
            ref="deckBtnRef"
            type="button"
            class="deck-btn deck-btn--grid-row"
            title="牌库"
            aria-label="牌库"
            :disabled="isRunFlowOverlayOpen()"
            @click="!isRunFlowOverlayOpen() && (showDeckLayer = true)"
          >
            <i class="ri-stack-line deck-btn-icon" aria-hidden="true"></i>
            <span class="deck-btn-label">牌库</span>
            <span class="deck-btn-count">{{ deckCount }}</span>
          </button>
          <div
            class="action-aux-toolbar"
            role="group"
            aria-label="拼词辅助"
          >
            <button
              type="button"
              class="action-aux-btn action-aux-btn--blue"
              :class="{ 'action-aux-btn--disabled': !canUseWordAuxTools }"
              title="标记当前拼词中的字母（仅本关提示，不进牌库）"
              aria-label="标记当前拼词中的字母"
              @click="onMarkSelectedTilesClick"
            >
              <i class="ri-bookmark-line" aria-hidden="true"></i>
            </button>
            <button
              v-if="showSwapWordButton"
              type="button"
              class="action-aux-btn action-aux-btn--purple"
              :class="{ 'action-aux-btn--disabled': !canSwapWordSelection }"
              :title="swapWordButtonTitle"
              :aria-label="swapWordButtonTitle"
              @click="onSwapWordSelectionClick"
            >
              <i class="ri-arrow-up-down-line" aria-hidden="true"></i>
            </button>
          </div>
        </div>
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
              :class="{
                'action-btn-disabled': !canRemove,
                'action-btn-disabled--interactive': discardBtnOverLimit,
              }"
              title="丢弃选中的字母（先选字再点）"
              @click="onDiscardBtnClick"
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
        v-memo="[fly.id, fly.bossTileDebuffed, fly.materialId, fly.vowelGhostPrev, fly.vowelGhostNext, fly.playerMarked]"
        variant="fly"
        :class="{ 'player-marked': fly.playerMarked === true }"
        :letter="fly.letter"
        :rarity="fly.rarity"
        :material-id="fly.materialId ?? null"
        :accessory-id="fly.accessoryId ?? null"
        :treasure-accessory-id="fly.treasureAccessoryId ?? null"
        :boss-tile-debuffed="fly.bossTileDebuffed === true"
        :cerulean-bell-locked="fly.ceruleanBell === true"
        :vowel-ghost-prev="fly.vowelGhostPrev ?? null"
        :vowel-ghost-next="fly.vowelGhostNext ?? null"
        :ref="el => setFlyingInRef(fly, el)"
      />
    </Teleport>

    <Teleport defer to="#game-view-portal">
      <RunEndLayer
        :open="showRunEnd"
        :outcome="runEndOutcome"
        :stats-rows="runEndStatsRows"
        :portal-stack-style="runEndPortalStackStyle"
        @retry="onRunEndRetry"
        @main-menu="onRunEndMainMenu"
        @endless="onRunEndEndless"
      />
    </Teleport>

    <Teleport defer to="#game-view-portal">
      <PauseOptionsLayer
        :open="showPauseOptions"
        :portal-stack-style="pauseOptionsPortalStackStyle"
        @continue="onPauseContinue"
        @new-run="onPauseNewRun"
        @settings="onPauseSettings"
        @main-menu="onPauseMainMenu"
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
          @pointerdown="onSettlementOverlayPointerDown"
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
              @pointerdown.stop
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
      <Transition name="info-layer" :css="true">
      <InfoModal
        v-if="showInfoLayer"
        :overlay-suppressed="shopOverlayLayersSuppressed"
        v-model="showInfoLayer"
        :initial-tab="infoModalInitialTab"
        :spell-counts="spellCountsByLength"
        :length-levels="lengthLevelsByLength"
        :length-upgrade-observatory-extra="lengthUpgradeObservatoryExtra"
        :rarity-levels="rarityLevelsByRarity"
        :owned-voucher-ids="ownedVoucherIds"
        :run-seed-display="props.runSeedDisplay"
        :current-level-id="currentLevel?.id ?? ''"
        :in-shop="showShop"
        :next-level-id="infoModalNextLevelId"
        :run-seed-numeric="getRunSeedNumeric()"
        :active-boss-slug="activeBossSlug"
        @select-owned-voucher="onInfoSelectOwnedVoucher"
      />
      </Transition>
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
  notifyOwnedTreasuresOnDiscardBatch,
  notifyOwnedTreasuresOnChapterEnter,
  notifyOwnedTreasuresOnIceBreak,
  notifyOwnedTreasuresOnLevelComplete,
  notifyOwnedTreasuresPrepareLevelEnter,
  notifyOwnedTreasuresOnLevelEnter,
  notifyOwnedTreasuresOnPackSkipped,
  notifyOwnedTreasuresOnShopEnter,
  notifyOwnedTreasuresOnShopReroll,
  notifyOwnedTreasuresOnTreasureSold,
  notifyOwnedTreasuresOnShopLeave,
  notifyOwnedTreasuresOnBossRestrictionTriggered,
  notifyOwnedTreasuresOnDeckCardsAdded,
  notifyOwnedTreasuresOnDeckCardsRemoved,
  sumTreasureSubmitLengthBonus,
  sumTreasureLengthJudgmentPenalty,
  resolveTreasureDescriptionPatches,
  treasureDescriptionPatchReplacesBase,
  resolveTreasureChargeProgress,
  resolveTreasureChargeVisualState,
} from "../treasures/treasureRegistry.js";
import { hasProbabilityDoubler } from "../treasures/treasureProbability.js";
import {
  isRandomDeckRemoveSpell,
  isSpellOfferRandomPickOneSpell,
} from "../game/spellOfferRandomPickAnim.js";
import { mountLetterTileClone } from "../game/mountLetterTileClone.js";
import { initTreasureBankOnAcquire } from "../treasures/treasureAcquireInit.js";
import { collectGridLetterTiles } from "../treasures/treasureLogicShared.js";
import { applyRarityLevelUpgrade } from "../game/treasureRarityTierMerge.js";
import {
  hasVowelNeighborSubstitute,
  isSubstitutableVowel,
  resolveWordPatternWithVowelSubstitutions,
  vowelDisplayLetter,
  vowelDisplayShiftForResolved,
  vowelGhostSlotsForDisplay,
} from "../game/vowelNeighborSubstitute.js";
import { filterTreasureDefsForPool } from "../treasures/treasureAvailability.js";
import {
  addTreasureRunLettersDiscarded,
  onTreasureRunChapterEnter,
  recordTreasureChapterWordPos,
  recordTreasureDiscardWord,
  recordTreasureLevelVowelLetters,
  noteTreasureRunSpellCast,
  noteTreasureRunUpgradeUsed,
} from "../treasures/treasureRunTracking.js";
import { isVowelLetterWithMask } from "../treasures/treasureLetterClassify.js";
import {
  isBossEffectsSuppressedByTreasures,
  resolveBossSlugForMechanics,
} from "../game/treasureBossSuppress.js";
import {
  createTreasureRunState,
  currentDiscardLetterGroup,
  letterInCurrentDiscardGroup,
  resetTreasureLevelScopedState,
} from "../treasures/treasureRunState.js";
import { addScoreAddBank } from "../treasures/treasureBankHelpers.js";
import { parseChapterFromLevelId } from "../treasures/treasureLifecycleShared.js";
import { bundlePackKindCaptionZh } from "../game/bundlePackCopy.js";
import { ensureBigramTargetPair, rollRandomBigramFromDictionary } from "../game/treasureBigramRoll.js";
import { iterTreasureHookContributions } from "../game/treasureBlueprintMirror.js";
import { IMPLEMENTED_TREASURE_ID_SET } from "../treasures/treasureCatalog.js";
import {
  canAcquireTreasureOffer,
  compactOwnedSlotsAfterCropSell,
  computeOwnedTreasureSlotTargetLength,
  willCropAccessoryExpandSlots,
} from "../game/treasureSlotCapacity.js";
import {
  computeWordScoreDetailedForSubmit,
  isBossDebuffedSubmitTile,
} from "../treasures/treasureScoring.js";
import { normalizeTreasureDescription } from "../treasures/treasureDescription.js";
import {
  addShopShelfTreasureIdsToExclude,
  rollDistinctShopTreasures,
} from "../treasures/shopTreasureRoll.js";
import { getShopTreasureAccessoryPriceAdd, rollShopTreasureAccessoryId } from "../treasures/shopTreasureAccessoryRoll.js";
import {
  LEVELS,
  LEVEL_COUNT,
  RUN_START_LEVEL_INDEX,
  resolveLevelTargetScore,
  getRunLevelAtIndex,
  isStandardRunFinalLevelIndex,
} from "../levelDefinitions";
import RunEndLayer from "./RunEndLayer.vue";
import PauseOptionsLayer from "./PauseOptionsLayer.vue";
import { pickBossSlugForLevel } from "../game/bossRoll.js";
import { applyBossTileDebuffState, applyBossTileDebuffToGrid } from "../game/bossTileDebuff.js";
import { coerceRunSeedNumeric, createRunRng } from "../game/runRng.js";
import {
  createRunMatchStats,
  getRunMatchStatsRows,
  recordLettersDiscarded,
  recordReroll,
  recordShopPurchase,
  recordWordSubmit,
} from "../game/runMatchStats.js";
import BossBlindRerollLayer from "./BossBlindRerollLayer.vue";
import { getBossDef } from "../game/bossBlindDefinitions.js";
import {
  BOSS_CLUB_POS_OPTIONS,
  bossHasWholeWordSoftRule,
  evaluateBossSoftWordViolation,
  getEndingLetterRarityFromTiles,
  nextMouthLockedLengthAfterSubmit,
} from "../game/bossWordViolation.js";
import {
  useGameState,
  MAX_LETTERS_PER_REMOVAL,
  deckCardRaw,
  syncTileStateToDeckCard,
} from "../composables/useGameState";
import {
  snapshotMaxIntrinsicGainsFromTile,
  applyIntrinsicGainsToTileAndLinkedCard,
} from "../game/tileIntrinsicGains.js";
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
  resolveSpellPickMode,
  shouldOpenSpellTargetLayer,
  shouldOpenInRunSpellPreview,
  getSpellDefinition,
} from "../spells/spellDefinitions.js";
import { buildSpellOfferSlotsFromPool } from "../spells/spellOfferSlots.js";
import { pickDiceChainSpellIds, pickRandomInRunSpellId } from "../spells/spellInRunPool.js";
import {
  resolveRestartEffectiveSpellId,
  resolveSpellFlowEffectiveId,
} from "../game/inRunGrantFlow.js";
import { rollPackOfferStock } from "../shop/rollPackStock.js";
import {
  rollInRunBundlePackOfKind,
  rollOneRandomBundlePackOffer,
} from "../shop/rollInRunBundlePack.js";
import {
  getShopRandomCardSlotCount,
  rollExtraShopRandomCardOffers,
  rollShopRandomCardOffers,
} from "../shop/rollShopRandomCardStock.js";
import {
  applyRandomUpgradePick,
  buildRandomUpgradeAnimPayload,
  getBeforeLevelForRandomUpgradePick,
  rollRandomUpgradePicks,
} from "../shop/randomUpgradeRoll.js";
import { formatVoucherDisplayName } from "../vouchers/voucherDisplay.js";
import { pairHasTier2Owned } from "../vouchers/voucherDefinitions.js";
import {
  buildOwnedVoucherDetailTreasure,
  buildOwnedVoucherPairGroups,
} from "../vouchers/voucherOwnedDisplay.js";
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
  getJudgedLengthTableLenWithPenalty,
  isLengthObservatoryBoosted,
  getOwnedTreasureSlotBonusFromVouchers,
  getShopAccessoryChanceMultiplier,
  getShopRandomCardSlotBonus,
  getWordLengthJudgmentBonus,
  hasBossBlindRerollVoucher,
  BOSS_BLIND_REROLL_COST_DOLLARS,
  canPayBossBlindReroll,
  getVoucherShelfGeneration,
  parseMajorFromLevelId,
  parseLevelSubFromId,
} from "../vouchers/voucherRuntime.js";
import { useDictionary } from "../composables/useDictionary";
import { gameSettings, getMarkOnSwap, getSwapButtonMode } from "../settings/gameSettings.js";
import {
  getBaseScoreForRarity,
  getWordLengthScoreForTableLen,
  getLengthMultiplier,
  scaleLengthContributionForBoss,
  getRarityForLetter,
  getWordLetterCount,
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
import {
  killDeckLayerEnter,
  playDeckLayerEnter,
  prepareDeckLayerEnter,
} from "../game/deckLayerEnterAnim.js";
import { isE2eMode } from "../e2e/isE2eMode.js";
import { registerGameTestHarness } from "../e2e/registerGameTestHarness.js";
import { computeWordScore } from "../composables/useScoring.js";

/** 提交时是否展示词典释义；暂时关闭，后续可改回 true 恢复 */
const SHOW_SUBMIT_TRANSLATION = false;

const {
  getWordDefinition,
  loadDictionary,
  resolveWordPattern,
  getCandidateWordsByLength,
  dictionaryReady,
  error: dictError,
} =
  useDictionary();
const toast = ref("");
const dictFatalError = computed(() => !!dictError.value && !dictionaryReady.value);

/** @type {import('vue').Ref<string[]>} */
const props = defineProps({
  runSeed: { type: Number, default: 0 },
  runSeedDisplay: { type: String, default: "" },
});

const emit = defineEmits(["request-restart", "exit-to-menu"]);

const ownedVoucherIds = ref([]);

const runRng = createRunRng(coerceRunSeedNumeric(props.runSeed));
function runRandom() {
  return runRng.next();
}

const shopPortalZ = ref(0);
const deckPortalZ = ref(0);
const deckExpandPortalZ = ref(0);
const dictFatalPortalZ = ref(0);
const settlementPortalZ = ref(0);
const runEndPortalZ = ref(0);
const pauseOptionsPortalZ = ref(0);
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
const runEndPortalStackStyle = computed(() =>
  runEndPortalZ.value > 0 ? { zIndex: runEndPortalZ.value } : undefined,
);
const pauseOptionsPortalStackStyle = computed(() =>
  pauseOptionsPortalZ.value > 0 ? { zIndex: pauseOptionsPortalZ.value } : undefined,
);
const toastPortalStackStyle = computed(() => (toastPortalZ.value > 0 ? { zIndex: toastPortalZ.value } : undefined));

/** 小关结算 / 整局结束 / 暂停选项 */
function isRunFlowOverlayOpen() {
  return showSettlement.value || showRunEnd.value || showPauseOptions.value;
}

/** 与暂停选项互斥的局内流程层（不含选项层本身） */
function isBlockingPauseOpen() {
  return showSettlement.value || showRunEnd.value;
}

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
/** 「跳过」气泡：yPercent 30→-5（circ.out）→0（circ.in），与开始弹窗一致 */
const SKIP_BUBBLE_RISE_S = 0.2;
const SKIP_BUBBLE_SETTLE_S = 0.22;
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
  const perLetterTreasureReplayCues = (detailed.perLetterTreasureReplayCueSteps ?? []).reduce(
    (s, steps) => s + (steps?.length ?? 0),
    0,
  );
  return letterPassCount * n + replayExtra + perLetterTreasureReplayCues + extraCues + post;
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

/** Boss 关：残柱牌张 uid、苍翠是否已卖藏（须在 `useGameState` 之前，供补牌削弱判定） */
const pillarUsedDeckUids = ref(/** @type {Set<number>} */ (new Set()));
const verdantTreasureSold = ref(false);

/** 至多 5 格；null 为空（须在 `useGameState` 前，供盾牌 Boss 屏蔽与宝藏逻辑） */
const ownedTreasures = ref([null, null, null, null, null]);

function ownedSlotTreasureIdListEarly() {
  return ownedTreasures.value.map((s) => s?.treasureId ?? null);
}

const bossMechanicsSuppressed = computed(() =>
  isBossEffectsSuppressedByTreasures(ownedSlotTreasureIdListEarly()),
);

function bossSlugForMechanics() {
  return resolveBossSlugForMechanics(activeBossSlug.value, ownedSlotTreasureIdListEarly());
}

const {
  grid,
  deck,
  initialDeckSnapshot,
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
  clearCurrentWord,
  setLastWordFromSubmit,
  applySubmitRefill,
  prepareCeruleanBellPickAfterGridStable,
  finalizeCeruleanBellSlotIndex,
  removeSelectedLetters,
  consumeIceTileOnGrid,
  snapshotGridCellsByTileId,
  resetLevel,
  resetDeckAfterStageEnd,
  touchGrid,
  removeDeckLetterInstancesByRaws,
  removeDeckCardsForSubmittedWord,
  removeDeckCardByUid,
  remapTileFromRawLetter,
  markTileAsWildcard,
  refreshGridTileBaseScoresFromLevels,
  appendShopDeckEntries,
  appendDeckCardSpecToInitialSnapshot,
  spellCountsByLength,
  recordSpellWordLength,
  lengthLevelsByLength,
  lengthUpgradeObservatoryExtra,
  setWordLengthLevel,
  bumpWordLengthLevel,
  rarityLevelsByRarity,
  setRarityLevel,
  basketballWordsSubmitted,
  bumpBasketballWordSubmitted,
  runWordLengthJudgmentPenalty,
  setRunWordLengthJudgmentPenalty,
  ROWS,
  COLS,
} = useGameState({
  ownedVoucherIdsRef: ownedVoucherIds,
  getRng: runRandom,
  runSeedNumeric: coerceRunSeedNumeric(props.runSeed),
  pillarUsedDeckUidsRef: pillarUsedDeckUids,
  verdantTreasureSoldRef: verdantTreasureSold,
  bossMechanicsSuppressedRef: bossMechanicsSuppressed,
});

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
  const { row, col } = candidates[Math.floor(runRandom() * candidates.length)];
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
const infoModalInitialTab = ref("level");

/** @param {'level' | 'rarity' | 'stage' | 'coupon'} [tab='level'] */
function openInfoModal(tab = "level") {
  if (isRunFlowOverlayOpen()) return;
  infoModalInitialTab.value = tab;
  showInfoLayer.value = true;
}

/** 字母块详情（右键 / 长按） */
const tileDetailPayload = ref(null);
const tileDetailOriginRect = ref(/** @type {{ left: number, top: number, width: number, height: number } | null} */ (null));
const suppressTilePrimaryClick = ref(false);

const levelIndex = ref(RUN_START_LEVEL_INDEX);
/** 通关 8-3 后进入 Ante 9+ 无尽流程 */
const isEndlessRun = ref(false);
/** 卷轴券购买后已写入「下一关」下标；离店时不再 +1 */
const glyphShopSkipLevelAdvance = ref(false);

/** Boss 关：独口锁定长度、冷眼已用长度、棘梅词性、残柱牌张 uid、苍翠是否已卖藏 */
const usedWordLengthsThisBoss = ref(/** @type {Set<number>} */ (new Set()));
const mouthLockedLengthBoss = ref(/** @type {number | null} */ (null));
const clubRequiredKeyBoss = ref(/** @type {string | null} */ (null));
function getRunSeedNumeric() {
  return coerceRunSeedNumeric(props.runSeed);
}
/** 离开商店进 Boss 关前的重掷预览会话 */
const bossRerollSession = ref(/** @type {{ levelId: string, slug: string, rerollsUsed: number, rerollNonce: number } | null} */ (null));
/** 场记板券确认后写入的 Boss slug，供 `buildLevelResetRunOpts` 使用 */
const pendingBossSlugOverride = ref("");
const crimsonTreasureDisabledSlotIndex = ref(/** @type {number | null} */ (null));
const bossTapeAttentionPulse = ref(false);
const bossTapeWobble = ref(false);

const isManacleBossGrid = computed(() => bossSlugForMechanics() === "the_manacle");
const isAmberBossMaskActive = computed(() => bossSlugForMechanics() === "amber_acorn");
const isCrimsonBossMechanicsActive = computed(() => bossSlugForMechanics() === "crimson_heart");

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

function pickClubRequiredKey() {
  const opts = [...BOSS_CLUB_POS_OPTIONS];
  return opts[Math.floor(runRandom() * opts.length)]?.key ?? "n";
}

function getBossTileDebuffContext() {
  return {
    pillarUsedDeckUids: pillarUsedDeckUids.value,
    verdantTreasureSold: verdantTreasureSold.value,
    ownedSlotTreasureIds: ownedSlotTreasureIdList(),
  };
}

function refreshBossTileDebuffOnTile(tile) {
  applyBossTileDebuffState(tile, bossSlugForMechanics(), getBossTileDebuffContext());
}

function getNextLevelDefAfterShop() {
  if (glyphShopSkipLevelAdvance.value) {
    return getRunLevelAtIndex(levelIndex.value);
  }
  return getRunLevelAtIndex(levelIndex.value + 1);
}

function shouldOfferBossBlindRerollBeforeShopLeave() {
  const next = getNextLevelDefAfterShop();
  if (parseLevelSubFromId(next?.id) !== 3) return false;
  return hasBossBlindRerollVoucher(ownedVoucherIds.value);
}

function openBossBlindRerollSession() {
  const next = getNextLevelDefAfterShop();
  const levelId = next?.id ?? "1-3";
  bossRerollSession.value = {
    levelId,
    slug: pickBossSlugForLevel(levelId, getRunSeedNumeric(), 0),
    rerollsUsed: 0,
    rerollNonce: 0,
  };
}

function buildLevelResetRunOpts(levelDef) {
  const id = levelDef?.id ?? "1-1";
  const override = String(pendingBossSlugOverride.value ?? "").trim();
  const slug =
    override && parseLevelSubFromId(id) === 3 ? override : pickBossSlugForLevel(id, getRunSeedNumeric());
  const mechSlug = resolveBossSlugForMechanics(slug, ownedSlotTreasureIdListEarly());
  const ts = resolveLevelTargetScore(id, mechSlug);
  let rem = getBaseRemovalsPerLevel(ownedVoucherIds.value);
  if (mechSlug === "the_water") rem = 0;
  let hands = getBaseHandsPerLevel(ownedVoucherIds.value);
  if (mechSlug === "the_needle") hands = getSubmitHandsForNeedleBoss(hands);
  if (parseLevelSubFromId(id) === 3) {
    usedWordLengthsThisBoss.value = new Set();
    mouthLockedLengthBoss.value = null;
    if (mechSlug === "the_club") clubRequiredKeyBoss.value = pickClubRequiredKey();
    else clubRequiredKeyBoss.value = null;
    if (mechSlug === "verdant_leaf") verdantTreasureSold.value = false;
  } else {
    clubRequiredKeyBoss.value = null;
  }
  return {
    remainingWords: hands,
    remainingRemovals: rem,
    targetScore: ts,
    bossSlug: slug,
    postGridBuild: (g) => applyBossPostGridBuild(g, mechSlug),
  };
}

function applyBossPostGridBuild(g, slug) {
  applyBossTileDebuffToGrid(g, slug, getBossTileDebuffContext(), ROWS, COLS);
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
  if (bossSlugForMechanics() !== "the_hook") return;
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
    const j = Math.floor(runRandom() * (i + 1));
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
  return idxs[Math.floor(runRandom() * idxs.length)];
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
const currentLevel = computed(() => getRunLevelAtIndex(levelIndex.value));
/** 左上角关卡标题，如「关卡 1-1」 */
const infoModalNextLevelId = computed(() => {
  if (!showShop.value) return "";
  return getNextLevelDefAfterShop()?.id ?? "";
});

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
const deckLayerInnerRef = ref(/** @type {HTMLElement | null} */ (null));
const deckLayerEnterBoot = ref(false);
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

watch(showDeckLayer, async (open) => {
  if (open) {
    deckPortalZ.value = bumpOverlayZ();
    deckLayerEnterBoot.value = true;
    await nextTick();
    const inner = deckLayerInnerRef.value;
    if (inner) prepareDeckLayerEnter(inner);
    deckLayerEnterBoot.value = false;
    requestAnimationFrame(() => {
      if (deckLayerInnerRef.value) playDeckLayerEnter(deckLayerInnerRef.value);
    });
  } else {
    killDeckLayerEnter(deckLayerInnerRef.value);
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

/** 展开列表中单块：已上场过的牌张 resting 透明度（与 `.deck-expand-tile-hit--dimmed` 一致） */
function deckExpandHitRestingOpacity(hitEl) {
  return hitEl?.classList?.contains("deck-expand-tile-hit--dimmed") ? 0.42 : 1;
}

function applyDeckExpandHitRestingOpacity(hitEl) {
  if (!(hitEl instanceof HTMLElement)) return;
  gsap.set(hitEl, { opacity: deckExpandHitRestingOpacity(hitEl) });
}

function runDeckExpandEnterFlip() {
  const scrollEl = deckExpandScrollRef.value;
  const from = deckExpandFlipFromRects.value;
  if (deckStackExpandRaw.value == null || !scrollEl || !from?.length) return;
  const hits = scrollEl.querySelectorAll(".deck-expand-tile-hit");
  if (hits.length !== from.length) {
    deckExpandFlipFromRects.value = null;
    for (const h of hits) applyDeckExpandHitRestingOpacity(h);
    return;
  }
  deckExpandFlipTl?.kill();
  const hitArr = [...hits];
  const tl = gsap.timeline({
    onComplete: () => {
      deckExpandFlipTl = null;
      for (const h of hitArr) {
        gsap.set(h, { clearProps: "transform" });
        applyDeckExpandHitRestingOpacity(h);
      }
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
    const restingOp = deckExpandHitRestingOpacity(hit);
    gsap.set(hit, { transformOrigin: "50% 50%" });
    tl.fromTo(
      hit,
      { x: dx, y: dy, scale: s, rotation: fromRot, opacity: restingOp * 0.88 },
      { x: 0, y: 0, scale: 1, rotation: 0, opacity: restingOp, duration: 0.4, ease: "expo.out" },
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

/** 单卡区与牌包区共用，避免两区 offerInstanceId 重复导致购后清错格 */
const nextOfferInstanceId = ref(1);
const nextShopEmptySlotId = ref(1);
const nextPackEmptySlotId = ref(1);
const nextVoucherOfferInstanceId = ref(1);
const nextVoucherEmptySlotId = ref(1);
/** 已刷新优惠券货架的代数（见 `getVoucherShelfGeneration`）；与当前进店代数不同时重抽单槽 */
const shopVoucherShelfGeneration = ref(-1);
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
/** 本局已成功预览确认的法术 id 序列（用于 restart 向前追溯） */
const spellCastHistory = ref(/** @type {string[]} */ ([]));
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
/** 商店升级顶栏动效播放时暂隐其它 portal 浮层（包内多选未完成时动效后再显示） */
const shopOverlayLayersSuppressed = ref(false);
/** 仅暂隐开包层（法术选格时仍显示 SpellTargetLayer） */
const packPickOverlaySuppressed = ref(false);

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

/** 法术预览层关闭时 resolve（`runSpellPreviewChain`） */
let spellPreviewFlowResolve =
  /** @type {null | ((r: import("../game/inRunGrantFlow.js").SpellPreviewFlowResult) => void)} */ (null);
/** 对局内/包内多选层关闭时 resolve（`runInRunPackPickFlow`） */
let packPickFlowResolve = /** @type {null | (() => void)} */ (null);
/** 对局内升级动效（顶栏计分板，与商店同款） */
const inRunGrantUpgradeFxActive = ref(false);
const inRunGrantUpgradeFxWordlenText = ref("");
const inRunGrantUpgradeFxLevelShown = ref(1);
const inRunGrantUpgradeFxScoreValue = ref(0);
const inRunGrantUpgradeFxMultValue = ref(0);
const inRunGrantUpgradeFxModel = {
  wordlenText: inRunGrantUpgradeFxWordlenText,
  levelShown: inRunGrantUpgradeFxLevelShown,
  scoreValue: inRunGrantUpgradeFxScoreValue,
  multValue: inRunGrantUpgradeFxMultValue,
};
/** @type {import('vue').Ref<null | object>} */
const packPickSession = ref(null);
const packPickBusy = ref(false);

function makeEmptyShopSlot() {
  return { kind: "empty", emptySlotId: nextShopEmptySlotId.value++ };
}

function makeEmptyPackSlot() {
  return { kind: "empty", emptySlotId: nextPackEmptySlotId.value++ };
}
const ownedTreasureIdSet = computed(() => {
  const s = new Set();
  for (const t of ownedTreasures.value) {
    if (t?.treasureId) s.add(t.treasureId);
  }
  return s;
});

/** 商店可售：已接入且满足解锁/池条件的宝藏 */
const shopTreasurePool = computed(() =>
  filterTreasureDefsForPool(
    TREASURE_DEFINITIONS.filter(
      (t) => IMPLEMENTED_TREASURE_ID_SET.has(t.treasureId) && t.shopEligible !== false,
    ),
    buildTreasurePoolSnapshot(),
  ),
);

const shopRerollsThisVisit = ref(0);
/** 对齐 Balatro：整局仅第一次进店时牌包区第一格必为法术小包 */
const balatroFirstShopPackConsumed = ref(false);

function shopPriceForOffer(basePrice) {
  return applyShopDiscountPrice(basePrice, ownedVoucherIds.value);
}

/** @param {{ offerType?: string, bundleKind?: string }} t @param {number} basePay */
function effectiveShopOfferPay(t, basePay) {
  if (!treasureRunState.value.shopUpgradesFree) return basePay;
  if (t.offerType === "upgrade") return 0;
  if (t.offerType === "bundlePack" && t.bundleKind === "upgrade") return 0;
  return basePay;
}

const shopNextRerollCostDisplay = computed(() => {
  if ((treasureRunState.value.shopFreeRerollsRemaining ?? 0) > 0) return 0;
  return getEffectiveShopRerollCost(
    ownedVoucherIds.value,
    computeShopRerollCost(shopRerollsThisVisit.value),
  );
});

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

function buildUpgradeAnimPayloadFromOffer(t) {
  const isRarity = t.upgradeKind === "rarity";
  const beforeLevel = isRarity
    ? getOwnedRarityUpgradeDisplayLevel(t.rarityKey)
    : getOwnedUpgradeLevelByGroup(t.lengthGroupKey);
  if (isRarity) {
    return {
      upgradeKind: "rarity",
      rarityKey: t.rarityKey,
      beforeLevel,
    };
  }
  return {
    upgradeKind: "length",
    lengthLabel: t.lengthLabel,
    lengthMin: t.lengthMin,
    lengthMax: t.lengthMax,
    beforeLevel,
    isLengthObservatoryBoosted: (len) =>
      isLengthObservatoryBoosted(ownedVoucherIds.value, len, spellCountsByLength.value),
  };
}

function applyUpgradeFromOffer(t, { price = 0 } = {}) {
  noteTreasureRunUpgradeUsed(treasureRunState.value);
  const isRarity = t.upgradeKind === "rarity";
  if (isRarity) {
    const rk = String(t.rarityKey ?? "");
    ownedUpgrades.value.push({
      upgradeId: t.treasureId,
      upgradeKind: "rarity",
      rarityKey: rk,
      price,
    });
    const curLv = Math.max(1, Math.round(Number(rarityLevelsByRarity.value?.[rk])) || 1);
    setRarityLevelWithTreasurePairs(rk, curLv + 1);
    refreshGridTileBaseScoresFromLevels();
    return;
  }
  ownedUpgrades.value.push({
    upgradeId: t.treasureId,
    upgradeKind: "length",
    lengthGroupKey: t.lengthGroupKey,
    lengthMin: t.lengthMin,
    lengthMax: t.lengthMax,
    lengthLabel: t.lengthLabel,
    lengthBadgeLabel: t.lengthBadgeLabel,
    price,
  });
  for (let len = t.lengthMin; len <= t.lengthMax; len++) {
    bumpWordLengthLevel(len, {
      observatoryBoost: isLengthObservatoryBoosted(
        ownedVoucherIds.value,
        len,
        spellCountsByLength.value,
      ),
    });
  }
}

/**
 * @param {{ apply?: () => void, payload: object }[]} steps
 * @param {{ restoreLayersAfter?: boolean }} [opts] 包内尚须再选时为 true（动效结束后恢复 portal 浮层）；仅作调用方语义标记
 */
async function runShopUpgradePlaybackSteps(steps, { restoreLayersAfter: _restoreLayersAfter = false } = {}) {
  if (!showShop.value || shopUpgradeAnimating.value) return;
  shopUpgradeAnimating.value = true;
  shopOverlayLayersSuppressed.value = true;
  await nextTick();
  try {
    for (const step of steps) {
      step.apply?.();
      await shopPanelRef.value?.playUpgradeResult?.(step.payload);
    }
  } catch (e) {
    shopUpgradeAnimating.value = false;
    shopOverlayLayersSuppressed.value = false;
    throw e;
  }
  shopUpgradeAnimating.value = false;
  shopOverlayLayersSuppressed.value = false;
}

function onShopUpgradeInteractionUnlock() {
  if (shopOverlayLayersSuppressed.value) return;
  shopUpgradeAnimating.value = false;
}

async function playArrowUpShopUpgradeSequence({ restoreLayersAfter = false } = {}) {
  const picks = rollRandomUpgradePicks(UPGRADE_LENGTH_GROUPS, 2, runRandom);
  const levelRefs = { rarityLevelsByRarity, lengthLevelsByLength };
  const obsFn = (len) => isLengthObservatoryBoosted(ownedVoucherIds.value, len, spellCountsByLength.value);
  const steps = picks.map((pick) => ({
    payload: buildRandomUpgradeAnimPayload(
      pick,
      getBeforeLevelForRandomUpgradePick(pick, levelRefs),
      obsFn,
    ),
    apply: () => {
      applyRandomUpgradePick(pick, buildSpellRuntimeContext());
      if (pick.kind === "rarity") refreshGridTileBaseScoresFromLevels();
    },
  }));
  await runShopUpgradePlaybackSteps(steps, { restoreLayersAfter });
}

/**
 * 牌包区库存：各类组合包；进店时生成，不随「刷新」重掷。
 * 权重与价格在 `src/shop/shopPackEconomy.js`。
 * @param {() => number} [rng=Math.random]
 */
function rollPackStock(rng = Math.random, sessionExcludeTreasureIds = null) {
  const guarantee = balatroFirstShopPackConsumed.value === false;
  const rows = rollPackOfferStock({
    rng,
    nextPackOfferInstanceId: () => nextOfferInstanceId.value++,
    nextPackEmptySlotId: () => nextPackEmptySlotId.value++,
    ownedTreasureIdSet: ownedTreasureIdSet.value,
    sessionExcludeTreasureIds: sessionExcludeTreasureIds ?? undefined,
    emptyTreasureSlots: ownedTreasures.value.filter((s) => s == null).length,
    lastReplayableSpellId: lastReplayableSpellId.value,
    shopTreasurePool: shopTreasurePool.value,
    guaranteeBalatroFirstShopBuffoonSlot: guarantee,
    ownedVoucherIds: ownedVoucherIds.value,
    spellCountsByLength: spellCountsByLength.value,
    honeAccessoryMult: getShopAccessoryChanceMultiplier(ownedVoucherIds.value),
  });
  if (guarantee) balatroFirstShopPackConsumed.value = true;
  return rows;
}

/**
 * 单卡区库存（宝藏/法术/升级/字母块）；进店与商店「刷新」时生成（见 `onShopReroll`）。
 * @param {() => number} [rng=Math.random]
 * @param {Set<string>} [sessionExcludeTreasureIds]
 */
function buildShopRandomCardRollCtx(sessionExcludeTreasureIds = null) {
  return {
    rng: runRandom,
    nextOfferInstanceId: () => nextOfferInstanceId.value++,
    nextShopEmptySlotId: () => nextShopEmptySlotId.value++,
    ownedTreasureIdSet: ownedTreasureIdSet.value,
    sessionExcludeTreasureIds: sessionExcludeTreasureIds ?? undefined,
    lastReplayableSpellId: lastReplayableSpellId.value,
    shopTreasurePool: shopTreasurePool.value,
    ownedVoucherIds: ownedVoucherIds.value,
    honeAccessoryMult: getShopAccessoryChanceMultiplier(ownedVoucherIds.value),
  };
}

function rollShopStock(rng = Math.random, sessionExcludeTreasureIds = null) {
  return rollShopRandomCardOffers({
    ...buildShopRandomCardRollCtx(sessionExcludeTreasureIds),
    rng,
  });
}

/** 购买纸箱券等同次进店加栏：单卡区末尾追加新格并掷货（与进店互斥集一致） */
function appendShopRandomCardSlotsAfterPurchase(extraCount) {
  const n = Math.max(0, Math.floor(Number(extraCount) || 0));
  if (n <= 0 || !showShop.value) return;
  const sessionExclude = new Set();
  addShopShelfTreasureIdsToExclude(sessionExclude, shopOffers.value);
  addShopShelfTreasureIdsToExclude(sessionExclude, packOffers.value);
  const extra = rollExtraShopRandomCardOffers(n, buildShopRandomCardRollCtx(sessionExclude));
  if (extra.length) shopOffers.value = [...shopOffers.value, ...extra];
}

/** 进店生成单卡区 + 牌包区，同次 visit 内宝藏 id 互不重复 */
function rollShopVisitStock(rng = Math.random) {
  const sessionExcludeTreasureIds = new Set();
  const shop = rollShopStock(rng, sessionExcludeTreasureIds);
  const pack = rollPackStock(rng, sessionExcludeTreasureIds);
  return { shop, pack };
}

/** @type {import('vue').Ref<null | { kind: 'offer', treasure: object, originRect?: object | null } | { kind: 'owned', slotIndex: number, treasure: object, originRect?: object | null }>} */
const treasureDetail = ref(null);
const treasureDetailLayerRef = ref(null);
const spellTargetLayerRef = ref(null);
const deckBtnRef = ref(null);
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

/** @param {{ pairId: string, originEl?: HTMLElement | null }} payload */
function onInfoSelectOwnedVoucher(payload) {
  const pairId = String(payload?.pairId ?? "").trim();
  if (!pairId) return;
  const group = buildOwnedVoucherPairGroups(ownedVoucherIds.value).find((g) => g.pairId === pairId);
  if (!group) return;
  const treasure = buildOwnedVoucherDetailTreasure(group);
  if (!treasure) return;
  treasureDetail.value = {
    kind: "voucher-owned",
    treasure,
    originRect: treasureOriginRectFromEl(payload.originEl),
  };
}

function buildPackPickSessionFromBundle(bundle, grantContext = "shop") {
  const opts = Array.isArray(bundle.bundleOptions) ? bundle.bundleOptions : [];
  const pickCount = Math.max(1, Math.floor(Number(bundle.pickCount) || 1));
  const withKeys = opts.map((o, i) => ({
    ...o,
    optionKey: o.optionKey ?? `opt-${o.offerInstanceId ?? i}-${i}`,
  }));
  return {
    bundleRow: bundle,
    bundleKind: bundle.bundleKind,
    title: bundle.name,
    pickCount,
    options: withKeys,
    claimedKeys: /** @type {string[]} */ ([]),
    grantContext,
  };
}

function resolvePackPickFlow() {
  const r = packPickFlowResolve;
  packPickFlowResolve = null;
  r?.();
}

function buildRollInRunBundlePackCtx() {
  return {
    rng: runRandom,
    nextPackOfferInstanceId: () => nextOfferInstanceId.value++,
    nextPackEmptySlotId: () => nextPackEmptySlotId.value++,
    ownedTreasureIdSet: ownedTreasureIdSet.value,
    emptyTreasureSlots: ownedTreasures.value.filter((s) => s == null).length,
    lastReplayableSpellId: lastReplayableSpellId.value,
    shopTreasurePool: shopTreasurePool.value,
    guaranteeBalatroFirstShopBuffoonSlot: false,
    ownedVoucherIds: ownedVoucherIds.value,
    spellCountsByLength: spellCountsByLength.value,
    honeAccessoryMult: getShopAccessoryChanceMultiplier(ownedVoucherIds.value),
  };
}

function rollOneInRunBundlePack() {
  return rollOneRandomBundlePackOffer(buildRollInRunBundlePackCtx());
}

/**
 * @param {object | null | undefined} bundleRow
 * @param {{ treasureSlotIndex?: number }} [opts]
 */
/**
 * 宝藏触发开包前：槽位 wobble + 头上组合包图标气泡（节奏对齐记分气泡）。
 * @param {number} slotIndex
 * @param {string} [bundleKind]
 */
async function runTreasurePackOpenPrecursor(slotIndex, bundleKind = "") {
  if (typeof slotIndex !== "number" || slotIndex < 0) return;
  const el = gameTreasureSlotRefs[slotIndex];
  if (!el) return;
  const sp = 1;
  shopOverlayLayersSuppressed.value = true;
  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));
  const wobbleTl = createWobbleScoreSlotTimeline(el);
  if (wobbleTl) {
    wobbleTl.timeScale(sp);
    wobbleTl.play(0);
  }
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  const bubble = showBundlePackBubble(el, bundleKind, sp);
  scheduleSmallPlusBubbleOutro(bubble, sp);
  if (wobbleTl) {
    await new Promise((resolve) => {
      wobbleTl.eventCallback("onComplete", () => resolve());
    });
  } else {
    await scoringSleep(SCORING_TREASURE_FALLBACK_MS, sp);
  }
  await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  shopOverlayLayersSuppressed.value = false;
}

async function runInRunPackPickFlow(bundleRow, { treasureSlotIndex } = {}) {
  let bundle = bundleRow;
  if (!bundle || bundle.offerType !== "bundlePack") {
    bundle = rollOneInRunBundlePack();
    if (!bundle) return;
  }
  const bundleKind = String(bundle.bundleKind ?? "");
  if (typeof treasureSlotIndex === "number" && treasureSlotIndex >= 0) {
    await runTreasurePackOpenPrecursor(treasureSlotIndex, bundleKind);
  }
  return new Promise((resolve) => {
    packPickFlowResolve = resolve;
    packPickOverlaySuppressed.value = false;
    packPickSession.value = buildPackPickSessionFromBundle(bundle, "inRun");
  });
}

/**
 * @param {{ apply?: () => void, payload: object }[]} steps
 */
async function runInRunUpgradePlaybackSteps(steps) {
  if (!steps.length) return;
  inRunGrantUpgradeFxActive.value = true;
  shopOverlayLayersSuppressed.value = true;
  await nextTick();
  try {
    for (const step of steps) {
      step.apply?.();
      const p = step.payload;
      if (p?.upgradeKind === "rarity") {
        const rk = String(p.rarityKey ?? "common");
        const beforeLevel = Math.max(1, Math.round(Number(p.beforeLevel) || 1));
        await runInGameRarityUpgradeShopLikeFx({
          areaRef: gameResultAreaRef,
          model: inRunGrantUpgradeFxModel,
          fxActive: inRunGrantUpgradeFxActive,
          waitNextTick: () => nextTick(),
          rarityKey: rk,
          beforeLevel,
          speed: 1,
        });
        continue;
      }
      const lenMin = Math.max(3, Math.min(16, Math.round(Number(p?.lengthMin) || 3)));
      const lenMax = Math.max(lenMin, Math.min(16, Math.round(Number(p?.lengthMax) || lenMin)));
      const beforeLevel = Math.max(1, Math.round(Number(p?.beforeLevel) || 1));
      const obsFn =
        typeof p?.isLengthObservatoryBoosted === "function"
          ? p.isLengthObservatoryBoosted
          : () => false;
      for (let len = lenMin; len <= lenMax; len++) {
        await runClearWinLengthUpgradeShopLikeFx({
          areaRef: gameResultAreaRef,
          model: inRunGrantUpgradeFxModel,
          fxActive: inRunGrantUpgradeFxActive,
          waitNextTick: () => nextTick(),
          len,
          beforeLevel,
          observatoryBoost: obsFn(len),
          speed: 1 + 0.3 * (len - lenMin),
        });
        if (len < lenMax) await sleep(30);
      }
    }
  } finally {
    inRunGrantUpgradeFxActive.value = false;
    shopOverlayLayersSuppressed.value = false;
  }
}

function getPackPickGrantContext() {
  const ctx = packPickSession.value?.grantContext;
  return ctx === "inRun" ? "inRun" : "shop";
}

function getInRunDeckFlyTargetEl() {
  return deckBtnRef.value ?? null;
}

/**
 * @param {Record<string, unknown>[][]} tiles
 * @param {string} resolvedWord
 * @param {number} judgedLenTable
 * @param {number} scoreBeforeHand
 */
/**
 * @param {Record<string, unknown>[][]} tiles
 * @param {string} resolvedWord
 * @param {number} judgedLenTable
 * @param {number} scoreBeforeHand
 * @returns {Promise<import('../treasures/treasureTypes.js').SubmitWordLeaveFxRunner[]>}
 */
async function runPendingInRunGrantsAfterSubmit(tiles, resolvedWord, judgedLenTable, scoreBeforeHand) {
  /** @type {import('../treasures/treasureTypes.js').SubmitWordLeaveFxRunner[]} */
  const submitWordLeaveFx = [];
  await notifyOwnedTreasuresSuccessfulWordSubmit(ownedSlotTreasureIdList(), {
    ...buildTreasureSubmitSuccessContext(tiles, resolvedWord, judgedLenTable, scoreBeforeHand),
    registerSubmitWordLeaveFx: (runner) => {
      if (typeof runner === "function") submitWordLeaveFx.push(runner);
    },
  });
  return submitWordLeaveFx;
}

function packPickOptionKeyOf(opt) {
  return String(opt?.optionKey ?? opt?.offerInstanceId ?? "");
}

function packPickRequiredPicks(sess) {
  const pc = Math.max(1, Math.floor(Number(sess?.pickCount) || 1));
  const n = Array.isArray(sess?.options) ? sess.options.length : 0;
  return Math.min(pc, Math.max(1, n));
}

function onPackPickOpenItem(payload) {
  if (packPickBusy.value) return;
  const item = payload?.item;
  if (!item) return;
  const root = payload?.originEl;
  treasureDetail.value = {
    kind: "pack-inner",
    treasure: item,
    packOptionKey: String(payload?.optionKey ?? packPickOptionKeyOf(item)),
    originRect: treasureOriginRectFromEl(root),
  };
}

async function onPackPickSkip() {
  if (packPickBusy.value) return;
  await notifyOwnedTreasuresOnPackSkipped(ownedSlotTreasureIdList(), {
    treasureRun: treasureRunState.value,
    playOwnedTreasureMultDeltaFx,
  });
  packPickSession.value = null;
  packPickOverlaySuppressed.value = false;
  treasureDetail.value = null;
  resolvePackPickFlow();
}

/** 领取数已达包内上限（含法术选格结束后）时关闭开包层 */
function maybeAutoClosePackPickSession() {
  const sess = packPickSession.value;
  if (!sess) return;
  const claimed = sess.claimedKeys ?? [];
  if (claimed.length >= packPickRequiredPicks(sess)) {
    packPickSession.value = null;
    packPickOverlaySuppressed.value = false;
    resolvePackPickFlow();
  }
}

/** 包内多选未完成时：恢复开包层（升级动效与法术选格结束后） */
function ensurePackPickOverlayVisible() {
  packPickOverlaySuppressed.value = false;
  if (packPickSession.value) {
    shopOverlayLayersSuppressed.value = false;
  }
}

async function fulfillSpellAfterPackPayment(t, { restoreLayersAfter = false } = {}) {
  const spellId = String(t.spellId ?? "");
  if (!spellId) return;
  const grantCtx = getPackPickGrantContext();
  const offerDeck = grantCtx === "inRun" ? "remainingDeck" : "fullDeck";
  if (restoreLayersAfter) {
    packPickOverlaySuppressed.value = true;
    await nextTick();
  }
  await runSpellPreviewChain(spellId, grantCtx, offerDeck, {
    spellDescription: t.description,
    spellName: t.name,
    spellIconClass: t.iconClass,
    spellRarity: t.rarity,
  });
  ensurePackPickOverlayVisible();
}

async function fulfillUpgradeAfterPackPayment(t, { restoreLayersAfter = false } = {}) {
  const payload = buildUpgradeAnimPayloadFromOffer(t);
  const step = {
    payload,
    apply: () => applyUpgradeFromOffer(t, { price: 0 }),
  };
  if (getPackPickGrantContext() === "inRun") {
    if (restoreLayersAfter) {
      packPickOverlaySuppressed.value = true;
      await nextTick();
    }
    await runInRunUpgradePlaybackSteps([step]);
    ensurePackPickOverlayVisible();
    return;
  }
  await runShopUpgradePlaybackSteps([step], { restoreLayersAfter });
}

async function fulfillTreasureAfterPackPayment(t, fromEl) {
  const ix = findTreasurePlacementIndex(t);
  if (ix < 0) return;
  const frameEl =
    fromEl?.querySelector?.(".shop-treasure-frame") ??
    (fromEl?.classList?.contains?.("shop-treasure-frame") ? fromEl : null);
  let toTarget = null;
  if (getPackPickGrantContext() === "inRun") {
    toTarget = gameTreasureSlotRefs[ix] ?? null;
  } else {
    const shop = shopPanelRef.value;
    toTarget = shop?.getOwnedSlotEl?.(ix) ?? null;
  }
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
  initTreasureBankOnAcquire(t.treasureId, treasureRunState.value);
  applyTreasureAcquireSideEffects(t.treasureId);
}

async function fulfillPackInnerPurchase(t, flyEl, { restoreLayersAfter = false } = {}) {
  if (!t) return;
  if (t.offerType === "spell") {
    await fulfillSpellAfterPackPayment(t, { restoreLayersAfter });
    return;
  }
  if (t.offerType === "upgrade") {
    await fulfillUpgradeAfterPackPayment(t, { restoreLayersAfter });
    return;
  }
  if (t.offerType === "treasure") {
    await fulfillTreasureAfterPackPayment(t, flyEl ?? null);
    return;
  }
  if (t.offerType === "deckLetter") {
    const raw = String(t.deckLetterRaw ?? "e").toLowerCase();
    const deckBtn =
      getPackPickGrantContext() === "inRun"
        ? getInRunDeckFlyTargetEl()
        : shopPanelRef.value?.getDeckViewBtnEl?.() ?? null;
    const flyRoot = flyEl ?? null;
    if (flyRoot && deckBtn) await animatePackTileFlyToDeck(flyRoot, deckBtn);
    appendShopDeckEntriesAndNotify([{ raw, materialId: null }]);
    showToast(`已加入牌库：${t.name}`);
    return;
  }
  if (t.offerType === "deckTile") {
    const raw = String(t.deckLetterRaw ?? "e").toLowerCase();
    const mat = t.deckTileMaterialId != null ? String(t.deckTileMaterialId) : null;
    const acc = t.deckTileAccessoryId != null ? String(t.deckTileAccessoryId).trim() : "";
    const tAcc =
      t.deckTileTreasureAccessoryId != null ? String(t.deckTileTreasureAccessoryId).trim() : "";
    const deckBtn =
      getPackPickGrantContext() === "inRun"
        ? getInRunDeckFlyTargetEl()
        : shopPanelRef.value?.getDeckViewBtnEl?.() ?? null;
    const flyRoot = flyEl ?? null;
    if (flyRoot && deckBtn) await animatePackTileFlyToDeck(flyRoot, deckBtn);
    appendShopDeckEntriesAndNotify([
      {
        raw,
        materialId: mat,
        accessoryId: acc || undefined,
        treasureAccessoryId: tAcc || undefined,
      },
    ]);
    showToast(`已加入牌库：${t.name}`);
  }
}

async function onPackInnerClaim() {
  const d = treasureDetail.value;
  const sess = packPickSession.value;
  if (!d || d.kind !== "pack-inner" || !sess || packPickBusy.value) return;
  const t = d.treasure;
  const key = String(d.packOptionKey ?? packPickOptionKeyOf(t));
  const claimed = sess.claimedKeys ?? [];
  if (claimed.includes(key)) return;

  const requiredPicks = packPickRequiredPicks(sess);
  if (claimed.length >= requiredPicks) {
    showToast("已达可选上限");
    return;
  }

  if (t.offerType === "treasure" && !canPlaceTreasureOffer(t)) {
    showToast("宝藏槽位不足");
    return;
  }

  const willNeedMorePicks = claimed.length + 1 < requiredPicks;
  packPickBusy.value = true;
  try {
    const layer = treasureDetailLayerRef.value;
    await layer?.playClose?.();
    treasureDetail.value = null;
    const flyEl = packPickLayerRef.value?.getFlySourceEl?.(t) ?? null;
    await fulfillPackInnerPurchase(t, flyEl, { restoreLayersAfter: willNeedMorePicks });
    sess.claimedKeys = [...claimed, key];
    maybeAutoClosePackPickSession();
    ensurePackPickOverlayVisible();
  } finally {
    packPickBusy.value = false;
  }
}

const treasureDetailMode = computed(() => {
  const d = treasureDetail.value;
  if (!d) return "offer";
  if (d.kind === "pack-inner") return "pack-inner";
  if (d.kind === "voucher-owned") return "voucher-owned";
  if (d.kind === "offer") return "offer";
  return showShop.value ? "owned-shop" : "owned-game";
});

function buildTreasurePatchDescriptionContext() {
  ensureBigramTargetPair(treasureRunState.value, rollRandomBigramForTreasure);
  return {
    treasureRun: treasureRunState.value,
    extraLetterScoreWordsRemaining: treasureRunState.value.extraLetterScoreWordsRemaining,
    discardLetterGroup: currentDiscardLetterGroup(treasureRunState.value),
    levelPosTargetKey: treasureRunState.value.levelPosTargetKey,
    rollRandomBigram: rollRandomBigramForTreasure,
    rng: runRandom,
    money: money.value,
  };
}

/** 宝藏详情简介：静态 + 动态 patch（含商店未购货架） */
const treasureDetailDescriptionOverride = computed(() => {
  const d = treasureDetail.value;
  if (!d?.treasure) return null;
  const tid = d.treasure.treasureId;
  const base = normalizeTreasureDescription(d.treasure.description);
  const patch = resolveTreasureDescriptionPatches(tid, buildTreasurePatchDescriptionContext());
  const replacesBase = treasureDescriptionPatchReplacesBase(tid);
  if (d.kind === "offer") {
    return replacesBase && patch?.length ? patch : null;
  }
  const extra = TREASURE_HOOKS_BY_ID.get(tid)?.buildOwnedDetailDescriptionSegments?.({
    chargeWordsSubmitted: basketballWordsSubmitted.value,
    ownedSlotTreasureIds: ownedTreasures.value.map((s) => s?.treasureId ?? null),
    remainingDeckCount: deckCount.value,
  });
  const parts =
    replacesBase && patch?.length ? [...patch] : [...base, ...(patch?.length ? patch : [])];
  if (extra?.length) parts.push(...extra);
  if (replacesBase && patch?.length) return parts;
  return parts.length > base.length ? parts : null;
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

const treasureProbabilityDisplayDoubled = computed(() =>
  hasProbabilityDoubler(ownedSlotTreasureIdList()),
);

const treasurePackInnerAlreadyClaimed = computed(() => {
  const d = treasureDetail.value;
  if (d?.kind !== "pack-inner") return false;
  const sess = packPickSession.value;
  if (!sess) return false;
  const key = String(d.packOptionKey ?? packPickOptionKeyOf(d.treasure));
  return (sess.claimedKeys ?? []).includes(key);
});

const treasureCanBuyOffer = computed(() => {
  const d = treasureDetail.value;
  if (!d) return false;
  const t = d.treasure;
  if (!t) return false;

  if (d.kind === "pack-inner") {
    const sess = packPickSession.value;
    if (!sess) return false;
    const key = String(d.packOptionKey ?? packPickOptionKeyOf(t));
    const claimed = sess.claimedKeys ?? [];
    if (claimed.includes(key)) return false;
    if (claimed.length >= packPickRequiredPicks(sess)) return false;
    if (t.offerType === "treasure") {
      return canPlaceTreasureOffer(t);
    }
    return true;
  }

  if (d.kind !== "offer") return false;
  const w = money.value;
  const p0 = Number(t.price);
  if (!Number.isFinite(w) || !Number.isFinite(p0)) return false;
  const p = shopPriceForOffer(p0);
  if (t.offerType === "voucher") {
    const vid = String(t.voucherId ?? "");
    if (vid === "v_glyph_1" || vid === "v_glyph_2") {
      if (getGlyphPurchaseTargetLevelIndex(levelIndex.value, vid === "v_glyph_2") == null) return false;
    }
    return w >= p;
  }
  if (t.offerType === "bundlePack") return w >= p;
  if (t.offerType === "spell") {
    const sid = String(t.spellId ?? "");
    return w >= p;
  }
  if (t.offerType === "upgrade") return w >= p;
  if (t.offerType === "deckLetter" || t.offerType === "deckTile") return w >= p;
  if (t.offerType === "treasure") return w >= p && canPlaceTreasureOffer(t);
  return w >= p;
});

/** 与 App.vue 共用的 Iris 转场组件（注入由上层提供） */
const irisTransition = inject("irisTransition", null);
/** 开局弹层（菜单 / 暂停「开始新的一局」） */
const requestNewRun = inject("requestNewRun", null);
const openSettings = inject("openSettings", null);

/** 暂停选项层 */
const showPauseOptions = ref(false);

/** 整局结束层（失败 / 通关 8-3） */
const showRunEnd = ref(false);
/** @type {import('vue').Ref<'fail' | 'win'>} */
const runEndOutcome = ref("fail");
const runMatchStats = ref(createRunMatchStats());
const runEndStatsRows = computed(() => getRunMatchStatsRows(runMatchStats.value));
const treasureRunState = ref(createTreasureRunState());

function buildTreasurePoolSnapshot() {
  return {
    deck: deck.value,
    isEndlessRun: isEndlessRun.value,
    runState: treasureRunState.value,
    ownedTreasureSlots: ownedTreasures.value,
  };
}

function ownedSlotTreasureIdList() {
  return ownedSlotTreasureIdListEarly();
}

/** 镜子(104) 卖出：复制一个已拥有宝藏的原始版（无商店配饰） */
function grantCopyOfRandomOwnedTreasure(excludeTreasureId = "104") {
  const filled = ownedTreasures.value.filter(
    (s) => s?.treasureId && String(s.treasureId) !== String(excludeTreasureId),
  );
  if (!filled.length) return false;
  const pick = filled[Math.floor(runRandom() * filled.length)];
  const def = getTreasureDef(String(pick.treasureId));
  if (!def) return false;
  const ix = findTreasurePlacementIndex(null);
  if (ix < 0) return false;
  const slots = [...ownedTreasures.value];
  slots[ix] = {
    treasureId: def.treasureId,
    price: def.price,
    rarity: def.rarity,
    name: def.name,
    emoji: def.emoji,
    description: def.description,
    treasureAccessoryId: null,
  };
  ownedTreasures.value = slots;
  initTreasureBankOnAcquire(def.treasureId, treasureRunState.value);
  applyTreasureAcquireSideEffects(def.treasureId);
  return true;
}

function treasureVoucherExtraSlots() {
  return getOwnedTreasureSlotBonusFromVouchers(ownedVoucherIds.value);
}

/** @param {{ treasureAccessoryId?: string | null } | null | undefined} offer */
function canPlaceTreasureOffer(offer) {
  return canAcquireTreasureOffer(
    ownedTreasures.value,
    treasureVoucherExtraSlots(),
    offer?.treasureAccessoryId ?? null,
  );
}

/** @param {{ treasureAccessoryId?: string | null } | null | undefined} offer */
function findTreasurePlacementIndex(offer) {
  const slots = ownedTreasures.value;
  const ix = slots.findIndex((s) => s == null);
  if (ix >= 0) return ix;
  if (willCropAccessoryExpandSlots(slots, treasureVoucherExtraSlots(), offer?.treasureAccessoryId ?? null)) {
    const next = [...slots, null];
    ownedTreasures.value = next;
    const keys = [...gameOwnedKeyOrder.value];
    while (keys.length < next.length) keys.push(`g-slot-${keys.length}`);
    gameOwnedKeyOrder.value = keys;
    return next.length - 1;
  }
  return -1;
}

function rollRandomBigramForTreasure() {
  return rollRandomBigramFromDictionary(getCandidateWordsByLength, runRandom);
}

function applyTreasureAcquireSideEffects(treasureId) {
  const id = String(treasureId);
  if (id === "42") remainingRemovals.value += 3;
  if (id === "110") treasureRunState.value.shopUpgradesFree = true;
}

async function notifyTreasureDeckCardsRemovedByRaws(raws) {
  const slots = ownedSlotTreasureIdList();
  let vowelsRemoved = 0;
  for (const raw0 of raws ?? []) {
    let raw = String(raw0 ?? "").toLowerCase();
    if (raw === "qu") raw = "q";
    if (isVowelLetterWithMask(raw, slots)) vowelsRemoved += 1;
  }
  if (vowelsRemoved <= 0) return;
  await notifyOwnedTreasuresOnDeckCardsRemoved(slots, {
    ownedSlotTreasureIds: slots,
    treasureRun: treasureRunState.value,
    vowelsRemoved,
    wobbleOwnedTreasureById,
    playOwnedTreasureBubbleFx,
  });
}

function removeDeckLettersByRawsWithTreasureNotify(raws) {
  removeDeckLetterInstancesByRaws(raws);
  notifyTreasureDeckCardsRemovedByRaws(raws);
}

/**
 * @param {{ raw: string, materialId?: string | null, accessoryId?: string | null, treasureAccessoryId?: string | null }[]} entries
 */
function appendShopDeckEntriesAndNotify(entries) {
  const n = Array.isArray(entries) ? entries.length : 0;
  if (!n) return;
  appendShopDeckEntries(entries);
  void notifyOwnedTreasuresOnDeckCardsAdded(ownedSlotTreasureIdList(), {
    ownedSlotTreasureIds: ownedSlotTreasureIdList(),
    treasureRun: treasureRunState.value,
    count: n,
    wobbleOwnedTreasureById,
    playOwnedTreasureBubbleFx,
  });
}

/** @param {number} [maxCount] */
function grantRandomOwnedTreasuresInRun(maxCount = 1) {
  const cap = Math.max(0, Math.floor(Number(maxCount) || 0));
  let granted = 0;
  for (let i = 0; i < cap; i += 1) {
    if (grantRandomShopTreasure()) granted += 1;
  }
  return granted;
}

function noteDiscardExhaustedForChapterUnlock() {
  if (remainingRemovals.value > 0) return;
  const sub = parseLevelSubFromId(currentLevel.value?.id ?? "1-1");
  const rs = treasureRunState.value;
  if (!(rs.discardExhaustedSubsThisChapter instanceof Set)) {
    rs.discardExhaustedSubsThisChapter = new Set();
  }
  rs.discardExhaustedSubsThisChapter.add(sub);
  if (rs.discardExhaustedSubsThisChapter.has(1) && rs.discardExhaustedSubsThisChapter.has(2) && rs.discardExhaustedSubsThisChapter.has(3)) {
    rs.chapterAllDiscardsExhausted = true;
  }
}

function clearOwnedTreasureSlotById(treasureId) {
  const tid = String(treasureId ?? "");
  ownedTreasures.value = ownedTreasures.value.map((s) => (s?.treasureId === tid ? null : s));
}

/** 自毁宝藏：wobble → 红色「摧毁！」→ 缩至 0 后清空槽位 */
async function destroyOwnedTreasureWithFx(treasureId) {
  const ix = findOwnedTreasureSlotIndex(treasureId);
  if (ix < 0) return;
  const el = gameTreasureSlotRefs[ix];
  if (!el) {
    clearOwnedTreasureSlotById(treasureId);
    return;
  }
  const sp = 1;
  const wobbleTl = createWobbleScoreSlotTimeline(el);
  if (wobbleTl) {
    wobbleTl.timeScale(sp);
    wobbleTl.play(0);
    await new Promise((resolve) => {
      wobbleTl.eventCallback("onComplete", () => resolve());
    });
  } else {
    await scoringSleep(SCORING_TREASURE_FALLBACK_MS, sp);
  }
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  const bubble = showScoreBubble(el, "摧毁！", "destroy", sp);
  gsap.killTweensOf(el);
  await new Promise((resolve) => {
    gsap.to(el, {
      scale: 0,
      opacity: 0,
      duration: 0.35,
      ease: EASE_TRANSFORM,
      transformOrigin: "50% 50%",
      onComplete: resolve,
    });
  });
  scheduleSmallPlusBubbleOutro(bubble, sp);
  gsap.set(el, { clearProps: "scale,opacity,transform" });
  clearOwnedTreasureSlotById(treasureId);
}

async function resetLevelAfterTreasurePrep(levelDef) {
  await notifyOwnedTreasuresPrepareLevelEnter(ownedSlotTreasureIdList(), {
    ownedSlotTreasureIds: ownedSlotTreasureIdList(),
    treasureRun: treasureRunState.value,
    rng: runRandom,
    appendDeckCardSpecToInitialSnapshot,
  });
  const opts = buildLevelResetRunOpts(levelDef);
  const forced = treasureRunState.value.jokerForcedDrawUid;
  if (forced != null) opts.forcedJokerDrawUid = forced;
  treasureRunState.value.jokerForcedDrawUid = null;
  resetLevel(levelDef, opts);
  await runTreasureLevelEnterHooks(levelDef?.id ?? "1-1");
}

async function runTreasureLevelEnterHooks(levelId) {
  resetTreasureLevelScopedState(treasureRunState.value);
  const ch = parseChapterFromLevelId(levelId);
  const prev = treasureRunState.value.lastChapterNumber;
  if (ch !== prev) {
    onTreasureRunChapterEnter(treasureRunState.value, ch);
    notifyOwnedTreasuresOnChapterEnter(ownedSlotTreasureIdList(), {
      treasureRun: treasureRunState.value,
    });
    treasureRunState.value.lastChapterNumber = ch;
    treasureRunState.value.discardExhaustedSubsThisChapter = new Set();
  }
  await notifyOwnedTreasuresOnLevelEnter(ownedSlotTreasureIdList(), {
    ownedSlotTreasureIds: ownedSlotTreasureIdList(),
    treasureRun: treasureRunState.value,
    rng: runRandom,
    levelId,
    findOwnedTreasureSlotIndex,
    wobbleOwnedTreasureById,
    destroyTreasureSlotById: destroyOwnedTreasureWithFx,
    playOwnedTreasureBubbleFx,
    clearTreasureSlotById: clearOwnedTreasureSlotById,
    grantRandomOwnedTreasure: grantRandomOwnedTreasuresInRun,
    requestInRunSpellGrant: async (opts = {}) => {
      const spellId = opts.spellId ?? pickRandomInRunSpellId(runRandom);
      if (!spellId) return;
      await runSpellPreviewChain(spellId, "inRun", "remainingDeck");
    },
    addRemainingWords: (n) => {
      remainingWords.value = Math.max(0, remainingWords.value + Math.floor(Number(n) || 0));
    },
    addRemainingRemovals: (n) => {
      remainingRemovals.value = Math.max(0, remainingRemovals.value + Math.floor(Number(n) || 0));
    },
  });
}

async function wobbleOwnedTreasureById(treasureId) {
  const ix = findOwnedTreasureSlotIndex(treasureId);
  if (ix < 0) return;
  shopOverlayLayersSuppressed.value = true;
  await nextTick();
  await wobbleGameTreasureSlot(ix);
  shopOverlayLayersSuppressed.value = false;
}

async function runTreasureLevelCompleteHooks() {
  await notifyOwnedTreasuresOnLevelComplete(ownedSlotTreasureIdList(), {
    ownedSlotTreasureIds: ownedSlotTreasureIdList(),
    treasureRun: treasureRunState.value,
    rng: runRandom,
    clearTreasureSlotById: clearOwnedTreasureSlotById,
    destroyTreasureSlotById: destroyOwnedTreasureWithFx,
    findOwnedTreasureSlotIndex,
    wobbleOwnedTreasureById,
    playOwnedTreasureMoneyFx,
    playOwnedTreasureBubbleFx,
    remainingRemovals: remainingRemovals.value,
    addMoney: (n) => {
      money.value += Math.max(0, Math.floor(Number(n) || 0));
    },
    bumpOwnedTreasurePriceById: (treasureId, amount) => {
      const tid = String(treasureId ?? "");
      const add = Math.floor(Number(amount) || 0);
      if (!tid || add <= 0) return;
      const ix = findOwnedTreasureSlotIndex(tid);
      if (ix < 0) return;
      const cur = ownedTreasures.value[ix];
      if (!cur) return;
      ownedTreasures.value[ix] = {
        ...cur,
        price: Math.max(0, Math.floor(Number(cur.price) || 0) + add),
      };
    },
  });
}

function findOwnedTreasureSlotIndex(treasureId) {
  const tid = String(treasureId ?? "");
  if (!tid) return -1;
  return ownedTreasures.value.findIndex((s) => s?.treasureId === tid);
}

function setRarityLevelWithTreasurePairs(rarity, level) {
  applyRarityLevelUpgrade(rarity, level, setRarityLevel, ownedSlotTreasureIdList());
}

function buildTreasureSubmitSuccessContext(tiles, resolvedWord, judgedLenTable, scoreBeforeHand) {
  const owned = ownedTreasures.value.filter(Boolean);
  return {
    ownedSlotTreasureIds: ownedSlotTreasureIdList(),
    findOwnedTreasureSlotIndex,
    pickRandomInRunSpellId: () => pickRandomInRunSpellId(runRandom),
    requestInRunSpellGrant: async ({ spellId, treasureSlotIndex, treasureId } = {}) => {
      const sid =
        spellId != null && String(spellId).trim()
          ? String(spellId)
          : pickRandomInRunSpellId(runRandom);
      if (!sid) return;
      let slotIx = treasureSlotIndex;
      if (slotIx == null && treasureId) slotIx = findOwnedTreasureSlotIndex(treasureId);
      await runInRunSpellGrant(sid, { treasureSlotIndex: slotIx });
    },
    requestInRunPackOpen: async ({ bundle, treasureSlotIndex, treasureId } = {}) => {
      let slotIx = treasureSlotIndex;
      if (slotIx == null && treasureId) slotIx = findOwnedTreasureSlotIndex(treasureId);
      await runInRunPackPickFlow(bundle ?? null, { treasureSlotIndex: slotIx });
    },
    requestInRunPackOpenOfKind: async ({ kind, treasureSlotIndex, treasureId } = {}) => {
      let slotIx = treasureSlotIndex;
      if (slotIx == null && treasureId) slotIx = findOwnedTreasureSlotIndex(treasureId);
      const bundle = rollInRunBundlePackOfKind(kind, buildRollInRunBundlePackCtx());
      if (!bundle) return;
      await runInRunPackPickFlow(bundle, { treasureSlotIndex: slotIx });
    },
    getWordDefinition,
    requestInRunUpgrade: async ({ offer, treasureSlotIndex, treasureId } = {}) => {
      const row = offer;
      if (!row || row.offerType !== "upgrade") return;
      let slotIx = treasureSlotIndex;
      if (slotIx == null && treasureId) slotIx = findOwnedTreasureSlotIndex(treasureId);
      if (typeof slotIx === "number" && slotIx >= 0) {
        shopOverlayLayersSuppressed.value = true;
        await nextTick();
        await wobbleGameTreasureSlot(slotIx);
        shopOverlayLayersSuppressed.value = false;
      }
      const payload = buildUpgradeAnimPayloadFromOffer(row);
      await runInRunUpgradePlaybackSteps([
        {
          payload,
          apply: () => applyUpgradeFromOffer(row, { price: 0 }),
        },
      ]);
    },
    incrementChargeWordSubmissionCount: bumpBasketballWordSubmitted,
    submittedScoringTiles: tiles.map((t) => ({
      materialId: t?.materialId ?? null,
      letter: t?.letter ?? "",
      rarity: t?.rarity ?? "common",
    })),
    mutateRandomNonWildcardLetterTileToWildcard,
    getWordDefinition,
    rollRandomBigram: rollRandomBigramForTreasure,
    treasureRun: treasureRunState.value,
    resolvedWord,
    judgedWordLength: judgedLenTable,
    targetScore: targetScore.value,
    currentScore: scoreBeforeHand,
    remainingWordsAfterSubmit: remainingWords.value,
    submittedLetters: tiles.map((t) => ({
      letter: t?.letter ?? "",
      rarity: t?.rarity ?? "common",
      materialId: t?.materialId ?? null,
    })),
    addRemainingWords: (n) => {
      remainingWords.value += Math.max(0, Math.floor(Number(n) || 0));
    },
    addMoney: (n) => {
      money.value += Math.max(0, Math.floor(Number(n) || 0));
    },
    playOwnedTreasureMoneyFx,
    playOwnedTreasureMultDeltaFx,
    playOwnedTreasureScoreDeltaFx,
    playOwnedTreasureBubbleFx,
    wobbleOwnedTreasureById,
    destroyTreasureSlotById: destroyOwnedTreasureWithFx,
    playSubmitWordLetterRemoveAndRewardLeave,
    removeDeckLettersByRaws: (raws) => removeDeckLettersByRawsWithTreasureNotify(raws),
    removeDeckCardsForSubmittedWord: (word) => removeDeckCardsForSubmittedWord(tiles, word),
    destroySelf: () => {
      void destroyOwnedTreasureWithFx("67");
    },
    ownedTreasureInstances: owned,
    rng: runRandom,
    moneyAfterSubmit: money.value,
    bumpWordLengthLevel: (len) => {
      noteTreasureRunUpgradeUsed(treasureRunState.value);
      bumpWordLengthLevel(len, {
        observatoryBoost: isLengthObservatoryBoosted(
          ownedVoucherIds.value,
          len,
          spellCountsByLength.value,
        ),
      });
    },
  };
}

function noteRunShopPurchase() {
  recordShopPurchase(runMatchStats.value);
}

function noteRunReroll() {
  recordReroll(runMatchStats.value);
}

/** 小关结算层 */
const showSettlement = ref(false);
const disableSettlementLayerAnim = ref(false);
const settlementCardRef = ref(null);
/** 结算「继续」按钮：与 settle-row 同一套 GSAP 入场序列 */
const settlementContinueBtnRef = ref(/** @type {HTMLButtonElement | null} */ (null));
/** @type {(() => void) | null} */
let settlementIntroResolve = null;
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
/** 相对原版 pace 略快约 4%（原版 k=0.052 b=0.1） */
const SETTLEMENT_PACE_K_S = 0.05;
const SETTLEMENT_PACE_B_S = 0.096;
const SETTLEMENT_PACE_MIN_S = 0.115;
const SETTLEMENT_PACE_MAX_S = 2.74;

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
    return Math.min(0.21, Math.max(0.031, g));
  }
  /* 每行最多 1 枚 $：没有行内间隔，在栏目之间插入短留白，使 P 仍随 S 线性生效 */
  const slots = Math.max(1, SPositiveRows - 1);
  const g = P / slots;
  return Math.min(0.21, Math.max(0.031, g));
}

/** 行入场时长随 S 略变长：一次函数 + clamp */
function settlementRowIntroDuration(S) {
  const d = 0.31 + 0.0135 * S;
  return Math.min(0.48, Math.max(0.27, d));
}

/**
 * 单行 $ 递增子时间轴（可叠到父轴任意起点，避免与下一行入场互相排队）
 * @param {import('vue').Ref<number>} animRef
 * @param {number} count
 * @param {HTMLElement | null} rowEl
 * @param {number} stepGap
 * @param {number} [interRowPadS=0]
 */
function buildSettlementDollarSubTimeline(animRef, count, rowEl, stepGap, interRowPadS = 0) {
  const st = gsap.timeline();
  const n = Math.max(0, Math.round(Number(count) || 0));
  st.call(() => {
    animRef.value = 0;
  });
  if (n <= 0) {
    if (interRowPadS > 0) st.to({}, { duration: interRowPadS });
    return st;
  }
  for (let k = 1; k <= n; k++) {
    st.call(() => {
      animRef.value = k;
      shakeSettlementRow(rowEl);
    });
    if (k < n) st.to({}, { duration: stepGap });
  }
  if (interRowPadS > 0) st.to({}, { duration: interRowPadS });
  return st;
}

/** 立即落到结算入场动画结束态（可重复调用） */
function finishSettlementIntroInstant() {
  const s = settlementSnapshot.value;
  if (!s || !showSettlement.value) return false;

  if (settlementTl) {
    settlementTl.kill();
    settlementTl = null;
  }

  const card = settlementCardRef.value;
  const rows = settlementRowEls.value;
  const continueBtn = settlementContinueBtnRef.value;
  if (card) {
    gsap.killTweensOf(card);
    gsap.set(card, { opacity: 1, scale: 1, y: 0 });
  }
  const counts = [s.clearReward, s.spareMoves, s.interest, s.total];
  animSettleClear.value = counts[0];
  animSettleSpare.value = counts[1];
  animSettleInterest.value = counts[2];
  animSettleTotal.value = counts[3];
  for (let i = 0; i < rows.length; i++) {
    const el = rows[i];
    if (!el) continue;
    gsap.killTweensOf(el);
    gsap.set(el, {
      opacity: counts[i] === 0 ? 0.42 : 1,
      y: 0,
      rotation: 0,
      transformOrigin: "50% 50%",
    });
  }
  if (continueBtn) {
    gsap.killTweensOf(continueBtn);
    gsap.set(continueBtn, { opacity: 1, y: 0 });
  }

  if (settlementIntroResolve) {
    const done = settlementIntroResolve;
    settlementIntroResolve = null;
    done();
  }
  return true;
}

function onSettlementOverlayPointerDown(ev) {
  if (!showSettlement.value) return;
  const btn = settlementContinueBtnRef.value;
  if (btn && (btn === ev.target || btn.contains(/** @type {Node} */ (ev.target)))) return;
  finishSettlementIntroInstant();
}

watch(showSettlement, (open) => {
  if (open) {
    settlementPortalZ.value = bumpOverlayZ();
    showDeckLayer.value = false;
    closeTileDetail();
  }
});

watch(showRunEnd, (open) => {
  if (open) {
    runEndPortalZ.value = bumpOverlayZ();
    showDeckLayer.value = false;
    closeTileDetail();
    showShop.value = false;
  }
});

watch(showShop, async (open) => {
  if (!open) {
    shopOverlayLayersSuppressed.value = false;
    packPickOverlaySuppressed.value = false;
    return;
  }
  shopPortalZ.value = bumpOverlayZ();
  closeTileDetail();
  showInfoLayer.value = false;
  showDeckLayer.value = false;
  treasureDetail.value = null;
  packPickSession.value = null;
  shopRerollsThisVisit.value = 0;
  await notifyOwnedTreasuresOnShopEnter(ownedSlotTreasureIdList(), {
    treasureRun: treasureRunState.value,
    ownedSlotTreasureIds: ownedSlotTreasureIdList(),
    wobbleOwnedTreasureById,
    playOwnedTreasureBubbleFx,
  });
  const levelId = currentLevel.value?.id ?? "1-1";
  const shelfGen = getVoucherShelfGeneration(levelId);
  if (shopVoucherShelfGeneration.value !== shelfGen) {
    shopVoucherShelfGeneration.value = shelfGen;
    const d = rollShopVoucherOfferDef(ownedVoucherIds.value, runRandom);
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
  const visitStock = rollShopVisitStock(runRandom);
  shopOffers.value = visitStock.shop;
  packOffers.value = visitStock.pack;
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
/** 结果区词长/公式预览：单词实际字母数 + 画笔等判定加成后的查表词长 */
const resultAreaJudgedWordLength = computed(() => {
  const n = getWordLetterCount(
    effectiveFormulaTiles.value,
    resolvedWordForSubmit.value,
  );
  if (n < 1) return 0;
  return getJudgedLengthTableLenWithPenalty(n, ownedVoucherIds.value, runWordLengthJudgmentPenalty.value);
});

const resultWordLengthShown = computed(() => {
  if (clearWinLengthUpgradeFxActive.value) return clearWinFxWordlenText.value;
  if (lastSubmitRarityFxActive.value) return lastSubmitRarityFxWordlenText.value;
  const L = resultAreaJudgedWordLength.value;
  return L > 0 ? `${L}字母` : `${effectiveWordForSubmit.value.length}字母`;
});
const resultWordLengthLevel = computed(() => {
  if (clearWinLengthUpgradeFxActive.value) return clearWinFxLevelShown.value;
  if (lastSubmitRarityFxActive.value) return lastSubmitRarityFxLevelShown.value;
  const len = resultAreaJudgedWordLength.value;
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
/** 飞入落地顺序缓冲：按 targetSlotIndex 依次 selectTile，避免快连点时乱序入槽 */
const flyInPendingComplete = [];
/** 互换拼词/棋盘选中进行中 */
const wordSelectionSwapBusy = ref(false);
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

/** 提交后词槽/棋盘格依次消失：单格 duration 不变，仅缩短 stagger；词越长间隔越小 */
function submitWordLeaveStagger(letterCount) {
  const n = Math.max(1, Math.min(24, Math.round(Number(letterCount) || 1)));
  const extra = Math.max(0, n - 3);
  const base = 0.082;
  const taper = 0.0042;
  return Math.max(0.03, base - extra * taper);
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

const POTTERY_JAR_TREASURE_ID = "65";
const DISCARD_POTTERY_EXTRA_GAP_MS = Math.round(90 * SCORING_GAP_SCALE);

/**
 * @param {HTMLElement | null | undefined} slotEl
 * @param {HTMLElement | null | undefined} gridEl
 * @param {number} duration
 */
function animateOneDiscardTileLeave(slotEl, gridEl, duration) {
  return new Promise((resolve) => {
    let done = 0;
    const need = (slotEl ? 1 : 0) + (gridEl ? 1 : 0);
    if (need === 0) {
      resolve();
      return;
    }
    const finish = () => {
      done += 1;
      if (done >= need) resolve();
    };
    if (slotEl) {
      gsap.killTweensOf(slotEl);
      gsap.fromTo(
        slotEl,
        { opacity: 1, scale: 1, y: 0 },
        {
          opacity: 0,
          scale: 0.88,
          y: -10,
          duration,
          ease: EASE_TRANSFORM,
          onComplete: finish,
        },
      );
    }
    if (gridEl) {
      gsap.killTweensOf(gridEl);
      gsap.set(gridEl, { transformOrigin: "50% 50%", y: 0 });
      gsap.to(gridEl, {
        opacity: 0,
        scale: 0.82,
        y: 0,
        duration,
        ease: EASE_TRANSFORM,
        onComplete: finish,
      });
    }
  });
}

/**
 * 弃牌消失：无陶罐结算时批量播；有陶罐则逐字与 tile 同步 wobble+气泡，并略推迟下一字。
 * @param {HTMLElement[]} slotEls
 * @param {HTMLElement[]} gridEls
 * @param {{ letter?: string }[]} discardedLetters
 * @param {{ duration?: number, stagger?: number }} [options]
 * @returns {Promise<boolean>} 是否已在动画中处理陶罐（调用方勿在 onDiscardBatch 重复入银行）
 */
async function runDiscardLeaveAnimation(slotEls, gridEls, discardedLetters, options = {}) {
  const duration = Number.isFinite(options.duration) ? options.duration : REMOVE_SLOT_FADE_DURATION;
  const stagger = Number.isFinite(options.stagger) ? options.stagger : REMOVE_SLOT_STAGGER;
  const rs = treasureRunState.value;
  const potterySlotIx = findOwnedTreasureSlotIndex(POTTERY_JAR_TREASURE_ID);
  /** @type {number[]} */
  const potteryIndices = [];
  if (potterySlotIx >= 0) {
    for (let i = 0; i < discardedLetters.length; i++) {
      if (letterInCurrentDiscardGroup(discardedLetters[i]?.letter, rs)) potteryIndices.push(i);
    }
  }
  if (!potteryIndices.length) {
    await runSlotAndGridLeaveAnimation(slotEls, gridEls, { duration, stagger });
    return false;
  }

  const scorePerLetter = 3;
  for (let i = 0; i < slotEls.length; i++) {
    const slotEl = slotEls[i];
    const gridEl = gridEls[i];
    const triggersPottery = potteryIndices.includes(i);
    const leaveP = animateOneDiscardTileLeave(slotEl, gridEl, duration);
    if (triggersPottery) {
      addScoreAddBank(rs, POTTERY_JAR_TREASURE_ID, scorePerLetter);
      await Promise.all([leaveP, playTreasureSlotScoreBurstAtPeak(potterySlotIx, scorePerLetter)]);
      if (i < slotEls.length - 1) await sleep(DISCARD_POTTERY_EXTRA_GAP_MS);
    } else {
      await leaveP;
      if (i < slotEls.length - 1) await sleep(Math.round(stagger * 1000));
    }
  }
  return true;
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

/** 按最终词长同步所有在途飞入目标槽位，并刷新已在飞的 GSAP 终点 */
function syncFlyingInTargets() {
  const wrapEl = wordSlotsWrapRef.value;
  if (!wrapEl) return;
  const wrapRect = wrapEl.getBoundingClientRect();
  if (wrapRect.width <= 0 || wrapRect.height <= 0) return;
  const base = selectedOrder.value.length;
  const list = flyingLetters.value;
  const total = base + list.length;
  if (total <= 0) return;
  const totalDesign = total * SLOT_TILE_W + (total - 1) * SLOT_GAP;
  const targetSlotScale = Math.min(1, MIDDLE_MAX_W / totalDesign);
  list.forEach((fly, i) => {
    const slotIndex = base + i;
    const toRect = getScaledSlotRect(wrapRect, total, slotIndex);
    if (!toRect) return;
    fly.targetSlotIndex = slotIndex;
    fly.layoutNumSlots = total;
    fly.targetSlotScale = targetSlotScale;
    fly.toRect = toRect;
    const node = flyingInElById.get(fly.id);
    if (!node || !flyingInAnimStarted.has(fly.id)) return;
    gsap.to(node, {
      left: toRect.left,
      top: toRect.top,
      scaleX: 1,
      scaleY: 1,
      "--slot-scale": targetSlotScale,
      duration: 0.16,
      ease: EASE_TRANSFORM,
      overwrite: "auto",
    });
  });
}

function flushFlyInSelections() {
  flyInPendingComplete.sort((a, b) => a.targetSlotIndex - b.targetSlotIndex);
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (let i = flyInPendingComplete.length - 1; i >= 0; i -= 1) {
      const item = flyInPendingComplete[i];
      if (item.targetSlotIndex !== selectedOrder.value.length) continue;
      selectTile(item.pendingRow, item.pendingCol);
      if (item.ceruleanBell) finalizeCeruleanBellSlotIndex();
      flyInPendingComplete.splice(i, 1);
      progressed = true;
    }
  }
  syncFlyingInTargets();
}

function waitForFlyingBackIdle() {
  return new Promise((resolve) => {
    const tick = () => {
      if (flyingBackBatches.value.length === 0) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function waitForFlyingInIdle() {
  return new Promise((resolve) => {
    const tick = () => {
      if (flyingLetters.value.length === 0 && flyInPendingComplete.length === 0) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function collectWordAuxTargetTiles() {
  /** @type {import('../composables/useGameState.js').GridTile[]} */
  const tiles = [];
  const seen = new Set();
  const add = (row, col) => {
    const key = `${row},${col}`;
    if (seen.has(key)) return;
    const tile = grid.value[row]?.[col];
    if (!tile) return;
    seen.add(key);
    tiles.push(tile);
  };
  for (const { row, col } of selectedOrder.value) add(row, col);
  for (const fly of flyingLetters.value) add(fly.pendingRow, fly.pendingCol);
  return tiles;
}

/** 当前拼词槽（含飞入中）占用的棋盘格坐标，用于互换时取补集 */
function buildWordSelectionPositionKeys() {
  const keys = new Set();
  for (const { row, col } of selectedOrder.value) {
    keys.add(`${row},${col}`);
  }
  for (const fly of flyingLetters.value) {
    keys.add(`${fly.pendingRow},${fly.pendingCol}`);
  }
  return keys;
}

/**
 * @param {Set<string> | null} excludePositionKeys 互换前已在拼词中的格（`row,col`）；传 null 时仅排除 `tile.selected`
 */
function collectSwappableGridPositions(excludePositionKeys = null) {
  /** @type {{ row: number, col: number, tile: object }[]} */
  const list = [];
  const g = grid.value;
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const tile = g[r]?.[c];
      if (!tile?.letter) continue;
      const key = `${r},${c}`;
      if (excludePositionKeys?.has(key)) continue;
      if (tile.selected) continue;
      if (tile.bossGridBlocked) continue;
      if (isTileFlying(r, c)) continue;
      list.push({ row: r, col: c, tile });
    }
  }
  return list;
}

/** @returns {Set<string>} */
function buildRandomEightPositionKeys() {
  const keys = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      keys.push(`${r},${c}`);
    }
  }
  for (let i = keys.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = keys[i];
    keys[i] = keys[j];
    keys[j] = t;
  }
  return new Set(keys.slice(0, 8));
}

/**
 * 按设置的对调范围筛选棋盘格；`pickCount` 有值时仅取前 N 个（非「对调全部」模式）。
 * @param {Set<string> | null} excludePositionKeys
 * @param {number | null} pickCount
 */
function resolveSwapGridTargets(excludePositionKeys, pickCount = null) {
  const mode = getSwapButtonMode();
  const all = collectSwappableGridPositions(excludePositionKeys);
  if (mode === "all") return all;

  const randomRegionKeys = mode === "random8" ? buildRandomEightPositionKeys() : null;
  const filtered = all.filter(({ row, col }) => {
    if (mode === "bottom8") return row >= ROWS / 2;
    if (mode === "top8") return row < ROWS / 2;
    if (mode === "random8") return randomRegionKeys?.has(`${row},${col}`) === true;
    return true;
  });

  if (pickCount == null || pickCount <= 0) return filtered;
  return filtered.slice(0, pickCount);
}

/** 用于提交按钮的「即将生效」单词：飞入中视为已加入，飞回中视为已移除，不等到动画结束 */
const effectiveWordForSubmit = computed(() => buildEffectiveWordPartsForSubmit().word);

/** @returns {{ word: string, vowelAltMask: boolean[] }} */
function buildEffectiveWordPartsForSubmit(opts = {}) {
  /** @type {string[]} */
  const chars = [];
  /** @type {boolean[]} */
  const vowelAltMask = [];
  const vowelTreasure = hasVowelNeighborSubstitute(ownedSlotTreasureIdList());
  const appendTile = opts.appendTile ?? null;

  const pushFromTile = (tile) => {
    if (!tile?.letter) return;
    const card = tile._deckCard;
    const natural = card && typeof card === "object" ? deckCardRaw(card) : String(tile.letter).toLowerCase();
    const frag = String(tile.letter ?? "").toLowerCase();
    for (const ch of frag) {
      if (!ch) continue;
      chars.push(ch);
      vowelAltMask.push(vowelTreasure && isSubstitutableVowel(natural));
    }
  };

  let slots = selectedTiles.value;
  const batches = flyingBackBatches.value;
  if (batches.length > 0) {
    const minSlot = Math.min(...batches.map((b) => b.slotIndex));
    slots = slots.slice(0, minSlot);
  }
  for (const { tile } of slots) pushFromTile(tile);
  for (const f of flyingLetters.value) {
    const t = grid.value[f.pendingRow]?.[f.pendingCol];
    if (t) pushFromTile(t);
    else {
      const frag = String(f.letter ?? "").toLowerCase();
      for (const ch of frag) {
        chars.push(ch);
        vowelAltMask.push(false);
      }
    }
  }
  if (appendTile) pushFromTile(appendTile);
  return { word: chars.join(""), vowelAltMask };
}

/** @param {{ word: string, vowelAltMask: boolean[] }} parts */
function resolveWordFromEffectiveParts(parts) {
  const { word, vowelAltMask } = parts;
  if (hasVowelNeighborSubstitute(ownedSlotTreasureIdList()) && vowelAltMask.some(Boolean)) {
    return resolveWordPatternWithVowelSubstitutions(word, vowelAltMask, (p) => resolveWordPattern(p, "?"));
  }
  return resolveWordPattern(word, "?");
}

/** @param {object | null | undefined} extraTile 飞入启程时预追加的格 */
function listEffectiveTilesForSubmit(extraTile = null) {
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
  if (extraTile) tiles.push(extraTile);
  return tiles;
}

/**
 * 给定整词解析，计算单格在词槽/飞字上应展示的字母、稀有度与元音 ghost
 * @param {object} tile
 * @param {string | null} res
 * @param {string} effWord
 * @param {object | null | undefined} [extraTile]
 */
function tilePresentationInResolvedWord(tile, res, effWord, extraTile = null) {
  const upGhost = (ch) => (ch ? (ch === "q" ? "Qu" : ch.toUpperCase()) : null);
  if (!res || !effWord || effWord.length !== res.length) {
    const g = vowelGhostForTile(tile);
    return {
      letter: tile.letter,
      rarity: tile.rarity,
      vowelGhostPrev: g?.prev ?? null,
      vowelGhostNext: g?.next ?? null,
    };
  }
  const vowelTreasure = hasVowelNeighborSubstitute(ownedSlotTreasureIdList());
  let pos = 0;
  for (const t of listEffectiveTilesForSubmit(extraTile)) {
    const frag = String(t?.letter ?? "").toLowerCase();
    const start = pos;
    pos += frag.length;
    if (t !== tile && t?.id !== tile?.id) continue;

    let letter = tile.letter;
    let rarity = tile.rarity;
    let vowelGhostPrev = null;
    let vowelGhostNext = null;

    if (vowelTreasure) {
      const card = tile._deckCard;
      const natural =
        card && typeof card === "object"
          ? deckCardRaw(card)
          : frag.replace(/^qu/, "q").charAt(0);
      const naturalCh = natural.charAt(0) === "q" ? "q" : natural.charAt(0);
      if (isSubstitutableVowel(naturalCh)) {
        const resolvedCh = res[start];
        if (resolvedCh >= "a" && resolvedCh <= "z") {
          const shift = vowelDisplayShiftForResolved(naturalCh, resolvedCh);
          const ghosts = vowelGhostSlotsForDisplay(naturalCh, shift);
          vowelGhostPrev = upGhost(ghosts?.prev ?? null);
          vowelGhostNext = upGhost(ghosts?.next ?? null);
          if (resolvedCh !== naturalCh) {
            letter = resolvedCh === "q" ? "Qu" : resolvedCh.toUpperCase();
            rarity = getRarityForLetter(resolvedCh);
          }
        }
      }
    }

    if (isWildcardMaterialTile(tile) && frag === "?") {
      const ch = res[start];
      if (ch >= "a" && ch <= "z") {
        letter = ch === "q" ? "Qu" : ch.toUpperCase();
        rarity = getRarityForLetter(ch);
      }
    }

    return { letter, rarity, vowelGhostPrev, vowelGhostNext };
  }
  const g = vowelGhostForTile(tile);
  return {
    letter: tile.letter,
    rarity: tile.rarity,
    vowelGhostPrev: g?.prev ?? null,
    vowelGhostNext: g?.next ?? null,
  };
}

/** 飞入启程：按「该格已加入词串」预解析展示（字母与 ghost 同步变化） */
function computeFlyInTilePresentation(tile) {
  const parts = buildEffectiveWordPartsForSubmit({ appendTile: tile });
  const res = resolveWordFromEffectiveParts(parts);
  return tilePresentationInResolvedWord(tile, res, parts.word, tile);
}

/** 飞回棋盘：牌张自然展示（deck + vowelDisplayShift），不用词槽解析态 */
function computeFlyBackTilePresentation(tile) {
  const upGhost = (ch) => (ch ? (ch === "q" ? "Qu" : ch.toUpperCase()) : null);
  if (!tile?.letter) {
    return { letter: "", rarity: "common", vowelGhostPrev: null, vowelGhostNext: null };
  }
  if (isWildcardMaterialTile(tile)) {
    return {
      letter: tile.letter,
      rarity: tile.rarity ?? "common",
      vowelGhostPrev: null,
      vowelGhostNext: null,
    };
  }
  const card = tile._deckCard;
  let rawLower = null;
  if (card && typeof card === "object") {
    const natural = deckCardRaw(card);
    rawLower = natural.charAt(0) === "q" ? "q" : natural.charAt(0);
  } else {
    rawLower = String(tile.letter).toLowerCase().replace(/^qu/, "q").charAt(0);
  }

  let letter = tile.letter;
  let rarity = tile.rarity ?? "common";
  let vowelGhostPrev = null;
  let vowelGhostNext = null;

  if (hasVowelNeighborSubstitute(ownedSlotTreasureIdList()) && isSubstitutableVowel(rawLower)) {
    const shift = card && typeof card === "object" ? Math.sign(Number(card.vowelDisplayShift) || 0) : 0;
    const displayed = vowelDisplayLetter(rawLower, shift);
    letter = displayed === "q" ? "Qu" : displayed.toUpperCase();
    rarity =
      card?.rarity != null && String(card.rarity).trim() !== "" && shift === 0
        ? String(card.rarity)
        : getRarityForLetter(displayed);
    const ghosts = vowelGhostSlotsForDisplay(rawLower, shift);
    vowelGhostPrev = upGhost(ghosts?.prev ?? null);
    vowelGhostNext = upGhost(ghosts?.next ?? null);
  } else if (card && typeof card === "object") {
    const displayed = rawLower === "q" ? "q" : rawLower;
    letter = displayed === "q" ? "Qu" : displayed.toUpperCase();
    rarity =
      card.rarity != null && String(card.rarity).trim() !== ""
        ? String(card.rarity)
        : getRarityForLetter(displayed);
  }

  return { letter, rarity, vowelGhostPrev, vowelGhostNext };
}

/** 若包含 `?`，返回首个可匹配的真实单词（小写）；无匹配则为 null。 */
const resolvedWordForSubmit = computed(() => resolveWordFromEffectiveParts(buildEffectiveWordPartsForSubmit()));

/** @param {object | null | undefined} tile */
function selectedSlotIndexForTile(tile) {
  if (!tile) return -1;
  return selectedTiles.value.findIndex(
    ({ tile: t }) => t === tile || (tile.id != null && t?.id === tile.id),
  );
}

/** 该格是否正在从词槽飞回棋盘（含同批后续槽位） */
function isTileInFlyingBackFromWord(tile) {
  const idx = selectedSlotIndexForTile(tile);
  if (idx < 0) return false;
  return flyingBackBatches.value.some((b) => idx >= b.slotIndex);
}

/** 拼词中：按当前词典解析结果推算该格的元音展示偏移；无解析则 null */
function resolveVowelDisplayShiftForTile(tile) {
  const res = resolvedWordForSubmit.value;
  const eff = effectiveWordForSubmit.value;
  if (!res || !eff || eff.length !== res.length) return null;
  if (!hasVowelNeighborSubstitute(ownedSlotTreasureIdList())) return null;
  let pos = 0;
  for (const t of effectiveFormulaTiles.value) {
    const frag = String(t?.letter ?? "").toLowerCase();
    if (t === tile || (tile?.id != null && t?.id === tile.id)) {
      const card = tile._deckCard;
      const natural =
        card && typeof card === "object"
          ? deckCardRaw(card)
          : frag.replace(/^qu/, "q").charAt(0);
      const naturalCh = natural.charAt(0) === "q" ? "q" : natural.charAt(0);
      if (!isSubstitutableVowel(naturalCh)) return null;
      const resolvedCh = res[pos];
      if (!resolvedCh) return null;
      return vowelDisplayShiftForResolved(naturalCh, resolvedCh);
    }
    pos += frag.length;
  }
  return null;
}

/** @param {object | null | undefined} tile */
function vowelGhostForTile(tile) {
  if (!hasVowelNeighborSubstitute(ownedSlotTreasureIdList()) || !tile?.letter) return null;
  if (isTileInFlyingBackFromWord(tile)) {
    const back = computeFlyBackTilePresentation(tile);
    return { prev: back.vowelGhostPrev, next: back.vowelGhostNext };
  }
  const card = tile._deckCard;
  let raw;
  if (card && typeof card === "object") {
    const natural = deckCardRaw(card);
    raw = natural.charAt(0) === "q" ? "q" : natural.charAt(0);
  } else {
    raw = String(tile.letter).toLowerCase().replace(/^qu/, "q").charAt(0);
  }
  if (!isSubstitutableVowel(raw)) return null;
  const liveShift = resolveVowelDisplayShiftForTile(tile);
  const shift =
    liveShift != null
      ? liveShift
      : card && typeof card === "object"
        ? Math.sign(Number(card.vowelDisplayShift) || 0)
        : 0;
  const ghosts = vowelGhostSlotsForDisplay(raw, shift);
  if (!ghosts) return null;
  const up = (ch) => (ch ? (ch === "q" ? "Qu" : ch.toUpperCase()) : null);
  return { prev: up(ghosts.prev), next: up(ghosts.next) };
}

/** 整词软规则：当前串若提交将违规时，Boss 条红色波纹持续提示（格级削弱仍走 tile） */
const bossTapeSoftPreview = computed(() => {
  if (!dictionaryReady.value) return false;
  if (scoringAnimating.value) return false;
  const slug = bossSlugForMechanics();
  if (!bossHasWholeWordSoftRule(slug)) return false;
  const res = resolvedWordForSubmit.value;
  if (res == null) return false;
  const eff = effectiveWordForSubmit.value;
  if (!eff || eff.length < 1) return false;
  const judgedLen = getJudgedLengthTableLenWithPenalty(
    getWordLetterCount(effectiveFormulaTiles.value, res),
    ownedVoucherIds.value,
    runWordLengthJudgmentPenalty.value,
  );
  const soft = evaluateBossSoftWordViolation({
    slug,
    wordLen: judgedLen,
    resolvedWord: res,
    endingLetterRarity: getEndingLetterRarityFromTiles(effectiveFormulaTiles.value),
    getWordDefinition,
    usedLengthsThisLevel: usedWordLengthsThisBoss.value,
    mouthLockedLength: mouthLockedLengthBoss.value,
    clubRequiredKey: clubRequiredKeyBoss.value || "",
    ownedSlotTreasureIds: ownedSlotTreasureIdList(),
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
 * 预览数字本身只用「判定词长 × 每字基础分」与「词长倍率」，不调用整词计分，避免混入单字母稀有度分/倍率或 tile.letterMultBonus。
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
 * 词槽与已选棋盘格展示：与 effectiveWordForSubmit 同步（含飞入在途格），解析出万能/元音替换字母。
 * 飞回截断时仅对齐 minSlot 之前槽位。
 */
const wordSlotTilePresentations = computed(() => {
  const orderTiles = selectedTiles.value.map(({ tile }) => tile);
  const batches = flyingBackBatches.value;
  const minSlot = batches.length > 0 ? Math.min(...batches.map((b) => b.slotIndex)) : orderTiles.length;
  const res = resolvedWordForSubmit.value;
  const eff = effectiveWordForSubmit.value;
  if (!res || eff.length !== res.length) {
    return orderTiles.map(normalizeWordSlotPresentationTile);
  }
  return orderTiles.map((tile, idx) => {
    if (idx >= minSlot) {
      const back = computeFlyBackTilePresentation(tile);
      return normalizeWordSlotPresentationTile({
        ...tile,
        letter: back.letter,
        rarity: back.rarity,
        baseScore: getBaseScoreForRarity(back.rarity, rarityLevelsByRarity.value),
      });
    }
    const pres = tilePresentationInResolvedWord(tile, res, eff);
    return normalizeWordSlotPresentationTile({
      ...tile,
      letter: pres.letter,
      rarity: pres.rarity,
      baseScore: getBaseScoreForRarity(pres.rarity, rarityLevelsByRarity.value),
    });
  });
});

/** 词槽展示用：保留棋盘格上的 boss 削弱标记，供整块槽位压暗 */
function normalizeWordSlotPresentationTile(tile) {
  if (!tile || typeof tile !== "object") return tile;
  const next = tile.bossTileDebuffed ? { ...tile, bossTileDebuffed: true } : { ...tile };
  if (tile.playerMarked === true) next.playerMarked = true;
  return next;
}

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
  if (isRunFlowOverlayOpen()) return false;
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
    treasureAccessoryId: tile.treasureAccessoryId ?? null,
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
    treasureAccessoryId: card.treasureAccessoryId ?? null,
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
  if (transitionBusy.value || showShop.value || isRunFlowOverlayOpen()) return;
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
  if (transitionBusy.value || showShop.value || isRunFlowOverlayOpen()) return;
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
  const uid = entry.card?._dcUid;
  if (entry.kind === "spent") return `s-${uid ?? entry.raw}-${idx}`;
  return `d-${uid ?? entry.raw}-${idx}`;
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
      treasureAccessoryId: t.treasureAccessoryId ?? null,
      tileScoreBonus: Math.max(0, Math.floor(Number(t.tileScoreBonus) || 0)),
      tileMultBonus: Math.max(0, Math.round(Number(t.letterMultBonus) || 0)),
    };
  }
  if ((entry.kind === "deck" || entry.kind === "spent") && entry.card && typeof entry.card === "object") {
    const card = entry.card;
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
      treasureAccessoryId: card.treasureAccessoryId ?? null,
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
  if (
    (entry.kind === "deck" || entry.kind === "spent") &&
    entry.card &&
    typeof entry.card === "object"
  ) {
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
    return null;
  }
  const g = grid.value;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = g[r]?.[c];
      if (t && t.id === id) return t;
    }
  }
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

const isFlintBossActive = computed(() => bossSlugForMechanics() === "the_flint");

const displayFormulaScore = computed(() => {
  if (clearWinLengthUpgradeFxActive.value) {
    return String(Math.max(0, Math.round(clearWinFxScoreValue.value)));
  }
  if (lastSubmitRarityFxActive.value) {
    return String(Math.max(0, Math.round(lastSubmitRarityFxScoreValue.value)));
  }
  if (scoringAnimating.value) return String(Math.max(0, Math.round(animScoreSum.value)));
  /** 预览：判定词长 × 该档每字基础分（无稀有度/材质等；画笔时乘数用判定词长非棋盘格数） */
  const tiles = effectiveFormulaTiles.value;
  if (tiles.length && resultFormulaBasePreviewActive.value) {
    const Ltb = resultAreaJudgedWordLength.value;
    return String(
      Math.round(
        scaleLengthContributionForBoss(
          getWordLengthScoreForTableLen(
            Ltb,
            lengthLevelsByLength.value,
            lengthUpgradeObservatoryExtra.value,
          ),
          isFlintBossActive.value,
        ),
      ),
    );
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
    const Ltb = resultAreaJudgedWordLength.value;
    return formatMultDisplay(
      scaleLengthContributionForBoss(
        getLengthMultiplier(Ltb, lengthLevelsByLength.value, lengthUpgradeObservatoryExtra.value),
        isFlintBossActive.value,
      ),
    );
  }
  return "0";
});

const canSubmit = computed(() => {
  return (
    !showShop.value &&
    !isRunFlowOverlayOpen() &&
    !transitionBusy.value &&
    dictionaryReady.value &&
    resolvedWordForSubmit.value != null &&
    remainingWords.value > 0 &&
    !scoringAnimating.value &&
    !gridRefillAnimating.value
  );
});

/** 与提交按钮一致：飞回中的槽位视为已离开拼词槽，即时参与可用态判断 */
const effectiveSelectedCount = computed(() => {
  const nSelRaw = selectedOrder.value.length;
  const batches = flyingBackBatches.value;
  return batches.length > 0 ? Math.min(...batches.map((b) => b.slotIndex)) : nSelRaw;
});

const discardBtnOverLimit = computed(
  () => effectiveSelectedCount.value > MAX_LETTERS_PER_REMOVAL,
);

const canRemove = computed(() => {
  const nSelEffective = effectiveSelectedCount.value;
  const hasFlying = flyingLetters.value.length > 0;
  const cap = MAX_LETTERS_PER_REMOVAL;
  return (
    !showShop.value &&
    !isRunFlowOverlayOpen() &&
    !transitionBusy.value &&
    remainingRemovals.value > 0 &&
    !scoringAnimating.value &&
    !gridRefillAnimating.value &&
    (nSelEffective > 0 || hasFlying) &&
    nSelEffective <= cap
  );
});

function onDiscardBtnClick() {
  if (dictFatalError.value) return;
  if (transitionBusy.value || showShop.value || isRunFlowOverlayOpen()) return;
  if (scoringAnimating.value || gridRefillAnimating.value) return;
  if (discardBtnOverLimit.value) {
    showToast(`一次至多丢弃 ${MAX_LETTERS_PER_REMOVAL} 个字母`);
    return;
  }
  void onRemoveClick();
}

const canUseWordAuxTools = computed(() => {
  if (
    dictFatalError.value ||
    transitionBusy.value ||
    showShop.value ||
    isRunFlowOverlayOpen() ||
    scoringAnimating.value ||
    gridRefillAnimating.value ||
    wordSelectionSwapBusy.value
  ) {
    return false;
  }
  return collectWordAuxTargetTiles().length > 0;
});

const showSwapWordButton = computed(() => gameSettings.swapButtonMode !== "hidden");

const swapWordButtonTitle = computed(() => {
  const mode = getSwapButtonMode();
  if (mode === "bottom8") return "将拼词中的字母送回棋盘，并从最下面 8 格选入新字母";
  if (mode === "top8") return "将拼词中的字母送回棋盘，并从最上面 8 格选入新字母";
  if (mode === "random8") return "将拼词中的字母送回棋盘，并从随机 8 格选入新字母";
  return "将拼词中的字母送回棋盘，并选中原先未选的字母";
});

const canSwapWordSelection = computed(() => {
  if (!showSwapWordButton.value) return false;
  if (!canUseWordAuxTools.value) return false;
  if (ceruleanBellSlotIndex.value != null) return false;
  if (flyingBackBatches.value.length > 0) return false;
  const hasInWord = effectiveSelectedCount.value > 0 || flyingLetters.value.length > 0;
  const inWordCount = selectedOrder.value.length + flyingLetters.value.length;
  const pickCount = getSwapButtonMode() === "all" ? null : inWordCount;
  const hasOnGrid =
    resolveSwapGridTargets(buildWordSelectionPositionKeys(), pickCount).length > 0;
  return hasInWord && hasOnGrid;
});

function onMarkSelectedTilesClick() {
  if (!canUseWordAuxTools.value) return;
  const tiles = collectWordAuxTargetTiles();
  if (tiles.length === 0) return;
  const shouldMark = tiles.some((t) => t.playerMarked !== true);
  for (const tile of tiles) {
    tile.playerMarked = shouldMark;
  }
  touchGrid();
}

async function onSwapWordSelectionClick() {
  if (!canSwapWordSelection.value || wordSelectionSwapBusy.value) return;
  wordSelectionSwapBusy.value = true;
  /** 飞回会清空 `tile.selected`，须在清槽前记下「原先在拼词中」的格，再选补集 */
  const previouslyInWord = buildWordSelectionPositionKeys();
  const inWordCountBefore =
    selectedOrder.value.length +
    flyingLetters.value.filter((f) => f.pendingRow != null).length;
  const swapMode = getSwapButtonMode();
  const pickCount = swapMode === "all" ? null : inWordCountBefore;
  try {
    if (getMarkOnSwap()) {
      const tiles = collectWordAuxTargetTiles();
      for (const tile of tiles) {
        tile.playerMarked = true;
      }
      touchGrid();
    }

    if (flyingLetters.value.length > 0) cancelAllFlyingIn();
    if (flyingBackBatches.value.length > 0) await waitForFlyingBackIdle();

    const inWordCount = selectedOrder.value.length;
    if (inWordCount > 0) {
      if (ceruleanBellSlotIndex.value != null) {
        showToast("青铃锁生效时无法互换选中");
        return;
      }
      startOneMoveOut(0);
      await waitForFlyingBackIdle();
    }

    const toSelect = resolveSwapGridTargets(previouslyInWord, pickCount);
    if (toSelect.length === 0) return;
    for (const { row, col, tile } of toSelect) {
      startOneMoveIn(row, col, tile);
    }
    await waitForFlyingInIdle();
    nextTick(() => updateSlotPositions(true));
  } finally {
    wordSelectionSwapBusy.value = false;
  }
}

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

function buildSettlementSnapshot() {
  const moneyBefore = money.value;
  const clearReward = stageRewardYuan.value;
  const spareMoves = remainingWords.value;
  const cap = getEconomyInterestCap(ownedVoucherIds.value);
  const interest = computeWalletInterest(moneyBefore, cap);
  const total = clearReward + spareMoves + interest;
  return {
    moneyBefore,
    clearReward,
    spareMoves,
    interest,
    total,
  };
}

function resetSettlementAnimValues() {
  animSettleClear.value = 0;
  animSettleSpare.value = 0;
  animSettleInterest.value = 0;
  animSettleTotal.value = 0;
  settlementIntroResolve = null;
}

async function openStageSettlement() {
  await runTreasureLevelCompleteHooks();
  disableSettlementLayerAnim.value = false;
  settlementSnapshot.value = buildSettlementSnapshot();
  resetSettlementAnimValues();
  showDeckLayer.value = false;
  showPauseOptions.value = false;
  showSettlement.value = true;
  await nextTick();
  await runSettlementIntro();
}

/**
 * @param {'fail' | 'win'} outcome
 * @param {{ preserveSettlement?: boolean }} [opts] 标准通关最后一关：保留结算快照供「无尽模式」接续
 */
async function openRunEnd(outcome, opts = {}) {
  runEndOutcome.value = outcome === "win" ? "win" : "fail";
  showDeckLayer.value = false;
  showInfoLayer.value = false;
  treasureDetail.value = null;
  tileDetailPayload.value = null;
  showShop.value = false;
  showPauseOptions.value = false;
  showSettlement.value = false;
  if (!opts.preserveSettlement) settlementSnapshot.value = null;
  runEndPortalZ.value = bumpOverlayZ();
  showRunEnd.value = true;
  await nextTick();
}

function onRunEndRetry() {
  emit("request-restart", { prefillSeed: runEndOutcome.value === "fail" });
}

function onRunEndMainMenu() {
  emit("exit-to-menu");
}

function openPauseOptions() {
  if (transitionBusy.value || showShop.value || isBlockingPauseOpen()) return;
  showDeckLayer.value = false;
  showInfoLayer.value = false;
  treasureDetail.value = null;
  tileDetailPayload.value = null;
  pauseOptionsPortalZ.value = bumpOverlayZ();
  showPauseOptions.value = true;
}

function closePauseOptions() {
  showPauseOptions.value = false;
}

function onPauseContinue() {
  closePauseOptions();
}

function onPauseNewRun() {
  closePauseOptions();
  requestNewRun?.();
}

function onPauseSettings() {
  openSettings?.();
}

function onPauseMainMenu() {
  closePauseOptions();
  emit("exit-to-menu");
}

async function onRunEndEndless() {
  if (transitionBusy.value) return;
  showRunEnd.value = false;
  isEndlessRun.value = true;
  if (!settlementSnapshot.value) {
    settlementSnapshot.value = buildSettlementSnapshot();
  }
  disableSettlementLayerAnim.value = false;
  resetSettlementAnimValues();
  showDeckLayer.value = false;
  showPauseOptions.value = false;
  showSettlement.value = true;
  await nextTick();
  await runSettlementIntro();
}

function runSettlementIntro() {
  return new Promise((resolve) => {
    settlementIntroResolve = resolve;
    if (settlementTl) {
      settlementTl.kill();
      settlementTl = null;
    }
    const card = settlementCardRef.value;
    const s = settlementSnapshot.value;
    if (!card || !s) {
      settlementIntroResolve = null;
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
        settlementIntroResolve = null;
        resolve();
      },
    });
    settlementTl = tl;

    tl.fromTo(
      card,
      { opacity: 0, scale: 0.92, y: 24 },
      { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: EASE_TRANSFORM },
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
      const introPos = firstRow ? ">-0.07" : ">";
      firstRow = false;
      if (el) {
        tl.fromTo(
          el,
          { opacity: 0, y: 18 },
          { opacity: targetOpacity, y: 0, duration: rowIntroDur, ease: EASE_TRANSFORM },
          introPos,
        );
      }
      const padAfter =
        G === 0 &&
        S > 0 &&
        n > 0 &&
        (i < lastIdxWithDollars || (SPositiveRows === 1 && i === lastIdxWithDollars))
          ? interPad
          : 0;
      const dollarSub = buildSettlementDollarSubTimeline(anim, count, el, innerGap, padAfter);
      tl.add(dollarSub, ">");
    }

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
  tryCeruleanBellFlyInAfterGridStable();
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
  event?.stopPropagation?.();
  if (transitionBusy.value) return;
  const s = settlementSnapshot.value;
  if (!s) return;

  finishSettlementIntroInstant();

  // 商店切换要求在转场“覆盖满屏”时刻就完成切换，
  // 禁用结算层离场动画，避免 reveal 时仍残留结算层。
  disableSettlementLayerAnim.value = true;

  transitionBusy.value = true;
  const startMoney = money.value;
  const endMoney = startMoney + s.total;

  const playFx = irisTransition?.play;
  if (typeof playFx === "function") {
    await playFx({
      onCovered: () => {
        showSettlement.value = false;
        settlementSnapshot.value = null;
        settlementIntroResolve = null;
        resetDeckAfterStageEnd();
        showShop.value = true;
      },
    });
  } else {
    showSettlement.value = false;
    settlementSnapshot.value = null;
    settlementIntroResolve = null;
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
  if (transitionBusy.value || showShop.value || isRunFlowOverlayOpen()) {
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

/**
 * 字母块飞入牌库：仅位移 + 缩放（先略放大，终点缩至 0），不压扁贴合按钮。
 * @param {unknown} fromEl
 * @param {unknown} toTarget
 * @param {{ flyLiveElement?: boolean }} [options] 为 true 时直接飞挂载了 Regl 的源节点（不 clone，保留材质）
 */
async function animatePackTileFlyToDeck(fromEl, toTarget, options = {}) {
  const fromNode = refToDom(fromEl) ?? (fromEl instanceof HTMLElement ? fromEl : null);
  const toNode = refToDom(toTarget) ?? (toTarget instanceof HTMLElement ? toTarget : null);
  if (!fromNode || typeof fromNode.getBoundingClientRect !== "function") return;
  const from = fromNode.getBoundingClientRect();
  const to =
    toNode && typeof toNode.getBoundingClientRect === "function"
      ? toNode.getBoundingClientRect()
      : typeof toTarget?.getBoundingClientRect === "function"
        ? toTarget.getBoundingClientRect()
        : /** @type {DOMRect} */ (toTarget);
  if (!to || !Number.isFinite(to.width)) return;

  const flyLive = options.flyLiveElement === true;
  const flyEl = flyLive ? fromNode : /** @type {HTMLElement} */ (fromNode.cloneNode(true));
  if (!flyLive) {
    flyEl.setAttribute("aria-hidden", "true");
    flyEl.classList.add("pack-tile-purchase-fly-clone");
    flyEl.querySelectorAll("canvas").forEach((c) => c.remove());
  } else {
    flyEl.setAttribute("aria-hidden", "true");
    flyEl.classList.add("pack-tile-purchase-fly-clone");
  }

  gsap.killTweensOf(flyEl);

  const cx0 = from.left + from.width / 2;
  const cy0 = from.top + from.height / 2;
  const cx1 = to.left + to.width / 2;
  const cy1 = to.top + to.height / 2;

  Object.assign(flyEl.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: "0",
    zIndex: "9999",
    pointerEvents: "none",
    boxSizing: "border-box",
    transformOrigin: "50% 50%",
    willChange: "transform, opacity",
  });

  if (!flyLive) document.body.appendChild(flyEl);
  else if (flyEl.parentElement !== document.body) document.body.appendChild(flyEl);

  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const dx = cx1 - cx0;
  const dy = cy1 - cy0;

  await new Promise((resolve) => {
    gsap.fromTo(
      flyEl,
      { x: 0, y: 0, scale: 1, opacity: 1 },
      {
        x: dx,
        y: dy,
        scale: 1.18,
        duration: 0.22,
        ease: EASE_TRANSFORM,
      },
    );
    gsap.to(flyEl, {
      scale: 0,
      opacity: 0.35,
      duration: 0.38,
      delay: 0.18,
      ease: EASE_TRANSFORM,
      onComplete: () => {
        flyEl.remove();
        resolve(undefined);
      },
    });
  });
}

/**
 * 幽魂：从法术图标飞出增强 E（完整 LetterTile）并入牌库。
 * @param {Record<string, unknown>[]} deckCards
 */
async function animateGrimDeckAddsFromSpellIcon(deckCards) {
  const cards = Array.isArray(deckCards) ? deckCards.filter(Boolean) : [];
  if (!cards.length) return;
  const deckBtn = deckBtnRef.value;
  if (!deckBtn) return;
  const layer = spellTargetLayerRef.value;
  const iconEl = layer?.getSpellIconEl?.() ?? null;
  const origin =
    iconEl && typeof iconEl.getBoundingClientRect === "function"
      ? iconEl.getBoundingClientRect()
      : null;
  if (!origin) {
    await animateSpellDeckAddsFromOfferSlots([], cards.length);
    return;
  }
  const gridSample = getGridTileElByIndex(0);
  const gridRect =
    gridSample && typeof gridSample.getBoundingClientRect === "function"
      ? gridSample.getBoundingClientRect()
      : null;
  const size =
    gridRect && gridRect.width > 1
      ? gridRect.width
      : Math.max(48, origin.width * 0.85);

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const snap = buildSpellOfferSnapshotFromDeckCard(card);
    if (!snap) continue;
    const host = document.createElement("div");
    host.className = "pack-tile-purchase-fly-clone grim-spell-tile-spawn";
    host.setAttribute("aria-hidden", "true");
    Object.assign(host.style, {
      position: "fixed",
      left: `${origin.left + origin.width / 2 - size / 2}px`,
      top: `${origin.top + origin.height / 2 - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      zIndex: "9999",
      pointerEvents: "none",
      transform: "scale(0)",
      transformOrigin: "50% 50%",
    });
    document.body.appendChild(host);
    const disposeTile = mountLetterTileClone(host, snap, "grid");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((resolve) => {
      gsap.to(host, {
        scale: 1,
        duration: 0.2,
        ease: EASE_TRANSFORM,
        onComplete: resolve,
      });
    });
    await animatePackTileFlyToDeck(host, deckBtn, { flyLiveElement: true });
    disposeTile();
    if (i < cards.length - 1) await sleep(120);
  }
}

function grantRandomShopTreasure() {
  const r = grantRandomShopTreasureByRarity(null);
  return r.ok;
}

/**
 * @param {string | null} rarityFilter `epic` / `legendary`；null 为任意稀有度加权
 * @returns {{ ok: boolean, slotIndex: number }}
 */
function grantRandomShopTreasureByRarity(rarityFilter) {
  const ix = findTreasurePlacementIndex(null);
  if (ix < 0) return { ok: false, slotIndex: -1 };
  const owned = ownedTreasureIdSet.value;
  const pool = shopTreasurePool.value.filter(
    (t) => !owned.has(t.treasureId) && (!rarityFilter || t.rarity === rarityFilter),
  );
  if (!pool.length) return { ok: false, slotIndex: -1 };
  const picks = rollDistinctShopTreasures(pool, owned, new Set(), 1, runRandom);
  if (!picks[0]) return { ok: false, slotIndex: -1 };
  const row = toShopOfferRows([picks[0]], runRandom)[0];
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
  initTreasureBankOnAcquire(row.treasureId, treasureRunState.value);
  applyTreasureAcquireSideEffects(row.treasureId);
  return { ok: true, slotIndex: ix };
}

/** @param {number} slotIndex */
async function wobbleGameTreasureSlot(slotIndex) {
  const el = gameTreasureSlotRefs[slotIndex];
  if (!el) return;
  const sp = 1;
  const tl = createWobbleScoreSlotTimeline(el);
  if (!tl) {
    await scoringSleep(SCORING_TREASURE_FALLBACK_MS, sp);
    return;
  }
  tl.timeScale(sp);
  tl.play(0);
  await new Promise((resolve) => {
    tl.eventCallback("onComplete", () => resolve());
  });
}

/** @param {number} slotIndex @param {number} amount */
async function playTreasureSlotMoneyBurstAtPeak(slotIndex, amount) {
  const el = gameTreasureSlotRefs[slotIndex];
  if (!el || slotIndex < 0) return;
  const sp = 1;
  const amt = Math.max(0, Math.floor(Number(amount) || 0));
  if (amt <= 0) return;
  wobbleScoreSlot(el, sp);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  const bubble = showScoreBubble(el, `+$${amt}`, "money", sp);
  scheduleSmallPlusBubbleOutro(bubble, sp);
  money.value += amt;
}

/** @param {string} treasureId @param {number} amount */
async function playOwnedTreasureMoneyFx(treasureId, amount) {
  const ix = findOwnedTreasureSlotIndex(treasureId);
  if (ix < 0) return;
  await playTreasureSlotMoneyBurstAtPeak(ix, amount);
}

/** @param {number} slotIndex @param {string} text @param {string} [kind] */
async function playTreasureSlotBubbleBurstAtPeak(slotIndex, text, kind = "score") {
  const el = gameTreasureSlotRefs[slotIndex];
  if (!el || slotIndex < 0) return;
  const label = String(text ?? "").trim();
  if (!label) return;
  const sp = 1;
  scoringTreasureBarIndex.value = slotIndex;
  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));
  wobbleScoreSlot(el, sp);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  const bubble = showScoreBubble(el, label, kind, sp);
  scheduleSmallPlusBubbleOutro(bubble, sp);
  await scoringSleep(SCORING_LETTER_GAP_MS, sp);
  scoringTreasureBarIndex.value = null;
}

/** @param {string} treasureId @param {string} text @param {string} [kind] */
async function playOwnedTreasureBubbleFx(treasureId, text, kind = "score") {
  const ix = findOwnedTreasureSlotIndex(treasureId);
  if (ix < 0) return;
  await playTreasureSlotBubbleBurstAtPeak(ix, text, kind);
}

/** @param {number} slotIndex @param {number} delta */
async function playTreasureSlotMultDeltaBurstAtPeak(slotIndex, delta) {
  const el = gameTreasureSlotRefs[slotIndex];
  if (!el || slotIndex < 0) return;
  const d = Math.round(Number(delta) || 0);
  if (d === 0) return;
  const sp = 1;
  scoringTreasureBarIndex.value = slotIndex;
  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));
  wobbleScoreSlot(el, sp);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  const bubble = showScoreBubble(el, d > 0 ? `+${d}` : String(d), "mult", sp);
  scheduleSmallPlusBubbleOutro(bubble, sp);
  await scoringSleep(SCORING_LETTER_GAP_MS, sp);
  scoringTreasureBarIndex.value = null;
}

/** @param {string} treasureId @param {number} delta */
async function playOwnedTreasureMultDeltaFx(treasureId, delta) {
  const ix = findOwnedTreasureSlotIndex(treasureId);
  if (ix < 0) return;
  await playTreasureSlotMultDeltaBurstAtPeak(ix, delta);
}

/** @param {string} treasureId @param {number} delta */
async function playOwnedTreasureScoreDeltaFx(treasureId, delta) {
  const ix = findOwnedTreasureSlotIndex(treasureId);
  if (ix < 0) return;
  await playTreasureSlotScoreBurstAtPeak(ix, delta);
}

/** 工具箱移除：气泡展示后停顿再缩至 0；字间间隔与气泡淡出略短于通用记分 */
const TOOLBOX_REMOVE_BUBBLE_HOLD_MS = 200;
const TOOLBOX_REMOVE_SHRINK_S = 0.14;
const TOOLBOX_REMOVE_LETTER_GAP_MS = 48;
const TOOLBOX_REMOVE_BEFORE_MONEY_MS = 0;
const TOOLBOX_REMOVE_BUBBLE_OUTRO_DELAY_S = 0.2;
const TOOLBOX_REMOVE_BUBBLE_OUTRO_DURATION_S = 0.24;

/** @param {HTMLElement | null | undefined} el @param {number} [speed] */
function scheduleToolboxRemoveBubbleOutro(el, speed = 1) {
  if (!el) return;
  const s = Math.max(0.01, Number(speed) || 1);
  gsap.to(el, {
    opacity: 0,
    y: -10,
    scale: PLUS_BUBBLE_OUTRO_SCALE,
    duration: TOOLBOX_REMOVE_BUBBLE_OUTRO_DURATION_S / s,
    delay: TOOLBOX_REMOVE_BUBBLE_OUTRO_DELAY_S / s,
    ease: EASE_TRANSFORM,
    onComplete: () => el.remove(),
  });
}

/**
 * @param {HTMLElement | null | undefined} slotEl
 * @param {HTMLElement | null | undefined} gridEl
 * @param {number} duration
 */
function animateToolboxTileShrinkToZero(slotEl, gridEl, duration) {
  return new Promise((resolve) => {
    let done = 0;
    const need = (slotEl ? 1 : 0) + (gridEl ? 1 : 0);
    if (need === 0) {
      resolve();
      return;
    }
    const finish = () => {
      done += 1;
      if (done >= need) resolve();
    };
    if (slotEl) {
      gsap.killTweensOf(slotEl);
      gsap.set(slotEl, { transformOrigin: "50% 55%" });
      gsap.to(slotEl, {
        opacity: 0,
        scale: 0,
        duration,
        ease: EASE_TRANSFORM,
        onComplete: finish,
      });
    }
    if (gridEl) {
      gsap.killTweensOf(gridEl);
      gsap.set(gridEl, { transformOrigin: "50% 50%" });
      gsap.to(gridEl, {
        opacity: 0,
        scale: 0,
        duration,
        ease: EASE_TRANSFORM,
        onComplete: finish,
      });
    }
  });
}

/**
 * @param {HTMLElement | null | undefined} slotEl
 * @param {number} [speed]
 */
async function playToolboxRemoveWobbleAndBubble(slotEl, speed = 1) {
  if (!slotEl) return;
  const sp = Math.max(0.01, Number(speed) || 1);
  const tl = createWobbleScoreSlotTimeline(slotEl);
  if (tl) {
    tl.timeScale(sp);
    tl.play(0);
  }
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  const bubble = showScoreBubble(slotEl, "移除", "destroy", sp);
  scheduleToolboxRemoveBubbleOutro(bubble, sp);
}

/**
 * 提交后：词槽依次 wobble → 红色「移除」→ 停顿 → 缩至 0；首字触发宝藏 wobble（不阻塞下一字）；全字消失后再宝藏 +$。
 * @param {import('../treasures/treasureTypes.js').SubmitWordLetterRemoveLeaveOpts} opts
 */
async function playSubmitWordLetterRemoveAndRewardLeave(opts) {
  const treasureId = String(opts?.treasureId ?? "");
  const slotEls = Array.isArray(opts?.slotEls) ? opts.slotEls : [];
  const gridEls = Array.isArray(opts?.gridEls) ? opts.gridEls : [];
  const n = Math.min(slotEls.length, gridEls.length);
  if (n <= 0) return;
  const treasureSlotIx = findOwnedTreasureSlotIndex(treasureId);
  const sp = 1;

  for (let i = 0; i < n; i++) {
    const slotEl = slotEls[i];
    const gridEl = gridEls[i];
    if (i === 0 && treasureSlotIx >= 0) {
      void wobbleGameTreasureSlot(treasureSlotIx);
    }
    await playToolboxRemoveWobbleAndBubble(slotEl, sp);
    await sleep(TOOLBOX_REMOVE_BUBBLE_HOLD_MS);
    await animateToolboxTileShrinkToZero(slotEl, gridEl, TOOLBOX_REMOVE_SHRINK_S);
    if (i < n - 1) await sleep(TOOLBOX_REMOVE_LETTER_GAP_MS);
  }

  opts.onRemoveDeck?.();
  if (TOOLBOX_REMOVE_BEFORE_MONEY_MS > 0) await sleep(TOOLBOX_REMOVE_BEFORE_MONEY_MS);
  const amt = Math.max(0, Math.floor(Number(opts?.moneyAmount) || 0));
  if (amt > 0) {
    if (treasureSlotIx >= 0) await playTreasureSlotMoneyBurstAtPeak(treasureSlotIx, amt);
    else await playOwnedTreasureMoneyFx(treasureId, amt);
  }
}

/** 宝藏槽 wobble 峰值弹出 +分气泡（与记分逐字宝藏同节拍，不等待 wobble 收束） */
async function playTreasureSlotScoreBurstAtPeak(slotIndex, amount) {
  const el = gameTreasureSlotRefs[slotIndex];
  if (!el || slotIndex < 0) return;
  const sp = 1;
  const amt = Math.max(0, Math.round(Number(amount) || 0));
  if (amt <= 0) return;
  scoringTreasureBarIndex.value = slotIndex;
  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));
  wobbleScoreSlot(el, sp);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  const bubble = showScoreBubble(el, `+${amt}`, "score", sp);
  scheduleSmallPlusBubbleOutro(bubble, sp);
  await scoringSleep(SCORING_LETTER_GAP_MS, sp);
  scoringTreasureBarIndex.value = null;
}

/**
 * 宝藏槽上方：组合包礼物图标气泡（锚点/进入动效与 showScoreBubble 一致）。
 * @param {HTMLElement | null | undefined} slotEl
 * @param {string} [bundleKind]
 * @param {number} [speed]
 */
function showBundlePackBubble(slotEl, bundleKind, speed = 1) {
  const s = Math.max(0.01, Number(speed) || 1);
  const rect = scoreBubbleAnchorRect(slotEl);
  if (!rect) return null;
  const div = document.createElement("div");
  div.className = "score-popup-bubble score-popup-bubble--bundle-pack";
  const icon = document.createElement("i");
  icon.className = "score-popup-bubble__pack-icon ri-gift-2-line";
  icon.setAttribute("aria-hidden", "true");
  div.appendChild(icon);
  const caption = bundlePackKindCaptionZh(bundleKind);
  if (caption) {
    const cap = document.createElement("span");
    cap.className = "score-popup-bubble__pack-caption";
    cap.textContent = caption;
    div.appendChild(cap);
  }
  document.body.appendChild(div);
  const rpx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx").trim()) || 1;
  const gapAboveSlotPx = 12 * rpx;
  gsap.set(div, {
    position: "fixed",
    left: rect.left + rect.width / 2,
    top: rect.top - gapAboveSlotPx,
    xPercent: -50,
    yPercent: -100,
    transformOrigin: "50% 100%",
    zIndex: 350,
    pointerEvents: "none",
    force3D: true,
  });
  gsap.fromTo(
    div,
    { opacity: 0, y: 18, scale: 0.5 },
    { opacity: 1, y: 0, scale: 1, duration: PLUS_BUBBLE_ENTER_DURATION_S / s, ease: EASE_TRANSFORM },
  );
  return div;
}

/** @param {number[]} slotIndices */
async function wobbleGameTreasureSlots(slotIndices) {
  shopOverlayLayersSuppressed.value = true;
  await nextTick();
  for (const ix of slotIndices) {
    if (typeof ix === "number" && ix >= 0) await wobbleGameTreasureSlot(ix);
    await sleep(SPELL_TREASURE_WOBBLE_GAP_MS);
  }
  shopOverlayLayersSuppressed.value = false;
}

const SPELL_TREASURE_WOBBLE_GAP_MS = 189;

/**
 * @param {number[]} slotIndices
 * @param {number} flyCount
 */
async function animateSpellDeckAddsFromOfferSlots(slotIndices, flyCount) {
  const deckBtn = deckBtnRef.value;
  if (!deckBtn || !slotIndices.length || flyCount <= 0) return;
  const layer = spellTargetLayerRef.value;
  const n = Math.min(flyCount, slotIndices.length);
  for (let i = 0; i < n; i++) {
    const el = layer?.getOfferTileEl?.(slotIndices[i]) ?? null;
    if (el) await animatePackTileFlyToDeck(el, deckBtn);
  }
}

function buildEclipseLengthUpgradeSteps() {
  const levelRefs = { rarityLevelsByRarity, lengthLevelsByLength };
  const obsFn = (len) => isLengthObservatoryBoosted(ownedVoucherIds.value, len, spellCountsByLength.value);
  return UPGRADE_LENGTH_GROUPS.map((g) => ({
    payload: buildRandomUpgradeAnimPayload(
      { kind: "length", g },
      getBeforeLevelForRandomUpgradePick({ kind: "length", g }, levelRefs),
      obsFn,
    ),
    apply: () => {
      noteTreasureRunUpgradeUsed(treasureRunState.value);
      for (let len = g.minLen; len <= g.maxLen; len++) {
        bumpWordLengthLevel(len, { observatoryBoost: obsFn(len) });
      }
    },
  }));
}

function buildEclipseRarityUpgradeSteps() {
  const levelRefs = { rarityLevelsByRarity, lengthLevelsByLength };
  return LETTER_RARITY_ORDER.map((rk) => ({
    payload: buildRandomUpgradeAnimPayload(
      { kind: "rarity", rk },
      getBeforeLevelForRandomUpgradePick({ kind: "rarity", rk }, levelRefs),
      () => false,
    ),
    apply: () => {
      noteTreasureRunUpgradeUsed(treasureRunState.value);
      const cur = Math.max(1, Math.round(Number(rarityLevelsByRarity.value?.[rk])) || 1);
      setRarityLevelWithTreasurePairs(rk, cur + 1);
    },
  }));
}

async function playEclipseLengthUpgradeSequence() {
  await runShopUpgradePlaybackSteps(buildEclipseLengthUpgradeSteps());
  refreshGridTileBaseScoresFromLevels();
}

async function playEclipseRarityUpgradeSequence() {
  await runShopUpgradePlaybackSteps(buildEclipseRarityUpgradeSteps());
  refreshGridTileBaseScoresFromLevels();
}

/** 对局内无选格法术：在顶栏计分板播升级动效（与商店同款流程） */
async function playInstantSpellInRunFx(effectiveSpellId) {
  const sid = String(effectiveSpellId ?? "");
  if (sid === "arrow_up") {
    const levelRefs = { rarityLevelsByRarity, lengthLevelsByLength };
    const obsFn = (len) => isLengthObservatoryBoosted(ownedVoucherIds.value, len, spellCountsByLength.value);
    const picks = rollRandomUpgradePicks(UPGRADE_LENGTH_GROUPS, 2, runRandom);
    const steps = picks.map((pick) => ({
      payload: buildRandomUpgradeAnimPayload(
        pick,
        getBeforeLevelForRandomUpgradePick(pick, levelRefs),
        obsFn,
      ),
      apply: () => {
        applyRandomUpgradePick(pick, buildSpellRuntimeContext());
        if (pick.kind === "rarity") refreshGridTileBaseScoresFromLevels();
      },
    }));
    await runInRunUpgradePlaybackSteps(steps);
    refreshGridTileBaseScoresFromLevels();
    return;
  }
  if (sid === "eclipse_length") {
    await runInRunUpgradePlaybackSteps(buildEclipseLengthUpgradeSteps());
    refreshGridTileBaseScoresFromLevels();
    return;
  }
  if (sid === "eclipse_rarity") {
    await runInRunUpgradePlaybackSteps(buildEclipseRarityUpgradeSteps());
    refreshGridTileBaseScoresFromLevels();
  }
}

/**
 * 无选格层的幻灵/升级类法术：在商店内播升级或宝藏动效。
 * @param {string} effectiveSpellId
 */
async function playInstantSpellShopFx(effectiveSpellId) {
  const sid = String(effectiveSpellId ?? "");
  if (sid === "arrow_up") {
    await playArrowUpShopUpgradeSequence({ restoreLayersAfter: false });
    return;
  }
  if (sid === "eclipse_length") {
    await playEclipseLengthUpgradeSequence();
    return;
  }
  if (sid === "eclipse_rarity") {
    await playEclipseRarityUpgradeSequence();
    return;
  }
}

/**
 * @param {Record<string, unknown> | null} spellFx
 * @param {string} effectiveSpellId
 */
async function playSpectralSpellResultFx(spellFx, effectiveSpellId) {
  const sid = String(effectiveSpellId ?? "");
  const fx = spellFx && typeof spellFx === "object" ? spellFx : null;
  if (fx?.kind === "treasure_grant" && typeof fx.slotIndex === "number") {
    await wobbleGameTreasureSlots([fx.slotIndex]);
    return;
  }
  if (fx?.kind === "treasure_accessory" && typeof fx.slotIndex === "number") {
    await wobbleGameTreasureSlots([fx.slotIndex]);
    return;
  }
  if (fx?.kind === "ankh") {
    const ixs = [fx.keptSlotIndex, fx.copySlotIndex].filter((i) => typeof i === "number" && i >= 0);
    await wobbleGameTreasureSlots(ixs);
    return;
  }
  if (fx?.kind === "deck_add" && typeof fx.count === "number") {
    if (fx.source === "spell_icon" && Array.isArray(fx.addedDeckCards) && fx.addedDeckCards.length) {
      await animateGrimDeckAddsFromSpellIcon(fx.addedDeckCards);
      return;
    }
    const layer = spellTargetLayerRef.value;
    const slots = spellTargetSession.value?.offerSlots ?? [];
    const slotIxs = slots.map((sl, ix) => (sl && !sl.empty && sl.tile ? ix : -1)).filter((ix) => ix >= 0);
    const flyFrom =
      typeof fx.removedDeckCardUid === "number"
        ? slotIxs.slice(0, 1)
        : slotIxs.slice(0, Math.min(slotIxs.length, fx.count));
    await animateSpellDeckAddsFromOfferSlots(flyFrom, fx.count);
    return;
  }
  if (sid === "immolate" || fx?.kind === "immolate") {
    showToast("已获得 $20");
  }
}

function buildSpellRuntimeContext() {
  return {
    grid,
    deck,
    initialDeckSnapshot,
    ROWS,
    COLS,
    rarityLevelsByRarity,
    lengthLevelsByLength,
    setRarityLevel: (rk, lv) => setRarityLevelWithTreasurePairs(rk, lv),
    ownedSlotTreasureIds: ownedSlotTreasureIdList(),
    setWordLengthLevel,
    bumpWordLengthLevel: (len) =>
      bumpWordLengthLevel(len, {
        observatoryBoost: isLengthObservatoryBoosted(
          ownedVoucherIds.value,
          len,
          spellCountsByLength.value,
        ),
      }),
    markTileAsWildcard,
    touchGrid,
    removeDeckLetterInstancesByRaws: removeDeckLettersByRawsWithTreasureNotify,
    removeDeckCardsForSubmittedWord,
    removeDeckCardByUid,
    appendShopDeckEntries,
    remapTileFromRawLetter,
    money,
    ownedTreasures,
    upgradeLengthGroups: UPGRADE_LENGTH_GROUPS,
    grantRandomShopTreasure,
    grantRandomShopTreasureByRarity,
    setRunWordLengthJudgmentPenalty,
    refreshGridTileBaseScoresFromLevels,
    showToast,
    setLastReplayableSpellId: (id) => {
      lastReplayableSpellId.value = id;
    },
    refreshBossTileDebuffOnTile: refreshBossTileDebuffOnTile,
    onUpgradeUsed: () => noteTreasureRunUpgradeUsed(treasureRunState.value),
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
 * 法术候选展示：角标以该 `(row,col)` 棋盘格及其 `_deckCard` 为准（与施法目标一致），不读随机抽中的牌张。
 * @param {Record<string, unknown> | null} snap
 * @param {unknown} liveTile
 */
function syncSpellOfferIntrinsicGainsOntoSnapshot(snap, liveTile) {
  if (!snap || !liveTile || typeof liveTile !== "object") return snap;
  const { sb, mb } = snapshotMaxIntrinsicGainsFromTile(liveTile);
  snap.tileScoreBonus = sb;
  snap.letterMultBonus = mb;
  return snap;
}

/** @param {number} row @param {number} col */
function buildSpellOfferSnapshotForGridCell(row, col) {
  const live = grid.value[row]?.[col];
  if (!live?.letter) return null;
  const snap = cloneGridTileSnapshot(live);
  if (!snap) return null;
  return syncSpellOfferIntrinsicGainsOntoSnapshot(snap, live);
}

/** @param {Record<string, unknown>} card */
function buildSpellOfferSnapshotFromDeckCard(card) {
  const p = buildTileDetailPayloadFromDeckCard(card);
  if (!p) return null;
  return {
    letter: p.letter,
    rarity: p.rarity,
    materialId: p.materialId ?? null,
    accessoryId: p.accessoryId ?? null,
    tileScoreBonus: p.tileScoreBonus,
    letterMultBonus: p.tileMultBonus,
    materialScoreBonus: p.materialScoreBonus,
    materialMultBonus: p.materialMultBonus,
    isWildcard: card.isWildcard === true,
  };
}

/** 开法术目标层前：场上格状态写回绑定的牌张（含剪贴板/回形针等平面角标） */
function syncGridTilesToLinkedDeckCards() {
  const g = grid.value;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = g[r]?.[c];
      if (t?.letter) syncTileStateToDeckCard(t);
    }
  }
}

function prepareSpellOfferSlots(rng = Math.random) {
  syncGridTilesToLinkedDeckCards();
  return buildSpellOfferSlots(rng);
}

function prepareSpellOfferSlotsFromRemainingDeck(rng = Math.random) {
  syncGridTilesToLinkedDeckCards();
  const pool = Array.isArray(deck.value) ? deck.value.filter((c) => c && typeof c === "object") : [];
  return buildSpellOfferSlotsFromPool(pool, buildSpellOfferSnapshotFromDeckCard, rng);
}

/**
 * 法术候选 / 施法目标：优先绑定到 `deckCardUid` 所在棋盘格，避免同字母多格误伤。
 * @param {Record<string, unknown>[][]} g
 * @param {{ row?: number, col?: number, deckCardUid?: number | null }} slot
 */
function resolveSpellOfferTargetOnGrid(g, slot) {
  const uid = slot?.deckCardUid;
  if (uid != null) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = g[r]?.[c];
        if (t?._deckCard?._dcUid === uid) return { row: r, col: c };
      }
    }
  }
  const row = Number(slot?.row);
  const col = Number(slot?.col);
  if (Number.isFinite(row) && Number.isFinite(col) && g[Math.trunc(row)]?.[Math.trunc(col)]?.letter) {
    return { row: Math.trunc(row), col: Math.trunc(col) };
  }
  return null;
}

/**
 * @param {number | null | undefined} deckCardUid
 * @param {{ preferRemainingDeck?: boolean }} [opts]
 */
function findDeckCardByUid(deckCardUid, opts = {}) {
  if (deckCardUid == null) return null;
  const preferRemaining = opts.preferRemainingDeck === true;
  const lookupDeck = () => {
    const d = Array.isArray(deck.value) ? deck.value : [];
    return d.find(
      (c) => c && typeof c === "object" && /** @type {{ _dcUid?: number }} */ (c)._dcUid === deckCardUid,
    );
  };
  const lookupSnapshot = () => {
    const multiset = Array.isArray(initialDeckSnapshot.value) ? initialDeckSnapshot.value : [];
    return multiset.find(
      (c) => c && typeof c === "object" && /** @type {{ _dcUid?: number }} */ (c)._dcUid === deckCardUid,
    );
  };
  const lookupGrid = () => {
    const g = grid.value;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = g[r]?.[c];
        if (t?._deckCard?._dcUid === deckCardUid) {
          return /** @type {Record<string, unknown>} */ (t._deckCard);
        }
      }
    }
    return null;
  };

  if (preferRemaining) {
    let card = lookupDeck();
    if (card) return /** @type {Record<string, unknown>} */ (card);
    card = lookupGrid();
    if (card) return card;
    return null;
  }

  let card = lookupSnapshot();
  if (card) return /** @type {Record<string, unknown>} */ (card);
  card = lookupDeck();
  if (card) return /** @type {Record<string, unknown>} */ (card);
  return lookupGrid();
}

/** @param {number} _row @param {number} _col @param {number | null | undefined} [deckCardUid] */
function getSpellOfferTileSnapshotForCell(_row, _col, deckCardUid) {
  const card = findDeckCardByUid(deckCardUid);
  return card ? buildSpellOfferSnapshotFromDeckCard(card) : null;
}

/** @param {number} _row @param {number} _col @param {number | null | undefined} [deckCardUid] */
function getSpellOfferTileSnapshotForRemainingDeck(_row, _col, deckCardUid) {
  const card = findDeckCardByUid(deckCardUid, { preferRemainingDeck: true });
  return card ? buildSpellOfferSnapshotFromDeckCard(card) : null;
}

/** @param {{ deckCardUid?: number | null, tile?: unknown } | null | undefined} slot */
function buildSpellOfferSnapFromSlot(slot) {
  if (!slot) return null;
  const uid = slot.deckCardUid;
  if (uid != null) {
    const card = findDeckCardByUid(uid);
    if (card) return buildSpellOfferSnapshotFromDeckCard(card);
  }
  return cloneGridTileSnapshot(
    slot.tile && typeof slot.tile === "object" ? /** @type {Record<string, unknown>} */ (slot.tile) : null,
  );
}

/**
 * 候选层确认动效：缩至谷底时再施法并换图（用于目标不在棋盘、无棋盘 DOM 时）。
 * @param {string} sid
 * @param {number[]} slotIndices
 * @param {unknown[]} oldSnaps
 * @param {() => void} applySpellFn
 * @param {() => unknown[]} buildNewSnapsAfterApply
 */
async function playSpellConfirmAnimOnOfferSlots(
  sid,
  slotIndices,
  oldSnaps,
  applySpellFn,
  buildNewSnapsAfterApply,
  animOpts = {},
) {
  if (!slotIndices.length || oldSnaps.length !== slotIndices.length) return false;
  return (
    (await spellTargetLayerRef.value?.playConfirmAppearanceAnim?.({
      spellId: sid,
      offerSlotIndices: slotIndices,
      oldSnaps,
      winnerOfferSlotIndex: animOpts.winnerOfferSlotIndex,
      onMidApply: () => {
        applySpellFn();
        return buildNewSnapsAfterApply();
      },
    })) === true
  );
}

/** @param {string} sid @param {number[]} slotIxs */
function pickSpellOfferWinnerSlotIndex(sid, slotIxs) {
  if (!isSpellOfferRandomPickOneSpell(sid) || slotIxs.length <= 1) return -1;
  return slotIxs[Math.floor(runRandom() * slotIxs.length)];
}

/**
 * @param {string} sid
 * @param {unknown[]} resolvedOrdered
 * @param {unknown[]} offerSlotsList
 * @param {number} winnerOfferSlotIndex
 */
function narrowResolvedOrderedToSpellWinner(sid, resolvedOrdered, offerSlotsList, winnerOfferSlotIndex) {
  if (
    winnerOfferSlotIndex < 0 ||
    !isSpellOfferRandomPickOneSpell(sid) ||
    isRandomDeckRemoveSpell(sid)
  ) {
    return resolvedOrdered;
  }
  const sl = offerSlotsList[winnerOfferSlotIndex];
  if (!sl) return resolvedOrdered;
  const uid = sl.deckCardUid;
  const one = resolvedOrdered.find(
    (p) =>
      (uid != null && p?.deckCardUid === uid) ||
      (Number(p?.row) === Number(sl.row) && Number(p?.col) === Number(sl.col)),
  );
  return one ? [one] : resolvedOrdered;
}

/** @param {Record<string, unknown>} ctx @param {string} sid @param {unknown[]} offerSlotsList @param {number} winnerOfferSlotIndex */
function applySpellOfferWinnerToContext(ctx, sid, offerSlotsList, winnerOfferSlotIndex) {
  if (winnerOfferSlotIndex < 0 || !isRandomDeckRemoveSpell(sid)) return;
  ctx.forcedRemoveDeckCardUid = offerSlotsList[winnerOfferSlotIndex]?.deckCardUid ?? null;
}

/** 10 格候选：从本局完整牌库 multiset 均匀随机抽牌张 */
function buildSpellOfferSlots(rng = Math.random) {
  const pool = Array.isArray(initialDeckSnapshot.value)
    ? initialDeckSnapshot.value.filter((c) => c && typeof c === "object")
    : [];
  return buildSpellOfferSlotsFromPool(pool, buildSpellOfferSnapshotFromDeckCard, rng);
}

function noteSpellCastForReplay(purchasedSpellId) {
  const sid = String(purchasedSpellId ?? "");
  if (!sid || sid === "restart" || sid === "dice") return;
  spellCastHistory.value = [...spellCastHistory.value, sid];
  noteTreasureRunSpellCast(treasureRunState.value);
  treasureRunState.value.lastSpellIdBeforeShopLeave = sid;
}

/**
 * @param {string} purchasedSpellId
 * @param {string} effectiveSpellId
 * @param {'shop' | 'inRun'} context
 * @param {'fullDeck' | 'remainingDeck'} offerDeckSource
 * @param {{
 *   confirmDisabled?: boolean,
 *   spellDescription?: import('../treasures/treasureDescription.js').TreasureDescSegment[] | string,
 *   spellName?: string,
 *   spellIconClass?: string,
 *   spellRarity?: string,
 * }} [overrides]
 */
function buildSpellTargetSessionFields(
  purchasedSpellId,
  effectiveSpellId,
  context,
  offerDeckSource,
  overrides = {},
) {
  const pid = String(purchasedSpellId ?? "");
  const replayTarget = resolveRestartEffectiveSpellId(spellCastHistory.value, lastReplayableSpellId.value);
  const eff =
    pid === "restart"
      ? replayTarget ?? String(effectiveSpellId ?? pid)
      : resolveSpellFlowEffectiveId(pid, lastReplayableSpellId.value, spellCastHistory.value);
  const def = getSpellDefinition(pid);
  const pickSourceId = pid === "restart" && replayTarget ? replayTarget : pid;
  let pickMode = resolveSpellPickMode(pickSourceId);
  let pickCount = resolveSpellPickCount(pid, lastReplayableSpellId.value);
  if (context === "inRun" && pickMode === "none") {
    pickMode = "preview_only";
    pickCount = 0;
  }
  const preferRemaining = offerDeckSource === "remainingDeck";
  const offerSlots = preferRemaining
    ? prepareSpellOfferSlotsFromRemainingDeck(runRandom)
    : prepareSpellOfferSlots(runRandom);
  return {
    spellName: overrides.spellName ?? def?.name ?? "法术",
    spellIconClass: overrides.spellIconClass ?? def?.iconClass ?? "ri-magic-fill",
    spellDescription: overrides.spellDescription ?? def?.description ?? "",
    spellRarity: overrides.spellRarity ?? "rare",
    pickCount,
    pickMode,
    offerSlots,
    offerDeckSource,
    context,
    confirmDisabled: overrides.confirmDisabled === true,
    purchasedSpellId: pid,
    effectiveSpellId: eff,
    getOfferTileSnapshot: preferRemaining
      ? getSpellOfferTileSnapshotForRemainingDeck
      : getSpellOfferTileSnapshotForCell,
  };
}

/**
 * @param {import('../game/inRunGrantFlow.js').SpellPreviewFlowResult} [previewResult]
 */
function resolveSpellPreviewFlow(previewResult) {
  const r = spellPreviewFlowResolve;
  spellPreviewFlowResolve = null;
  r?.(previewResult ?? { confirmed: false, skipped: true });
}

/**
 * @param {string} purchasedSpellId
 * @param {'shop' | 'inRun'} context
 * @param {'fullDeck' | 'remainingDeck'} offerDeckSource
 * @param {Parameters<typeof buildSpellTargetSessionFields>[4]} [overrides]
 */
function openSingleSpellPreviewSession(purchasedSpellId, context, offerDeckSource, overrides = {}) {
  return new Promise((resolve) => {
    spellPreviewFlowResolve = resolve;
    spellTargetSession.value = buildSpellTargetSessionFields(
      purchasedSpellId,
      purchasedSpellId,
      context,
      offerDeckSource,
      overrides,
    );
  });
}

/**
 * @param {string} purchasedSpellId
 * @param {'shop' | 'inRun'} context
 * @param {'fullDeck' | 'remainingDeck'} offerDeckSource
 */
async function applyInstantSpellWithoutPreview(purchasedSpellId, context, offerDeckSource) {
  const pid = String(purchasedSpellId ?? "");
  const effectiveSpellId = resolveSpellFlowEffectiveId(
    pid,
    lastReplayableSpellId.value,
    spellCastHistory.value,
  );
  if (
    effectiveSpellId === "arrow_up" ||
    effectiveSpellId === "eclipse_length" ||
    effectiveSpellId === "eclipse_rarity"
  ) {
    if (context === "inRun") await playInstantSpellInRunFx(effectiveSpellId);
    else if (showShop.value) await playInstantSpellShopFx(effectiveSpellId);
    noteSpellCastForReplay(pid);
    return;
  }
  const ctx0 = buildSpellRuntimeContext();
  const beforeGrid = cloneGridDeep(grid.value, ROWS, COLS);
  const applyOpts =
    pid === "dice" ? { rng: runRandom, skipDiceInline: true } : { rng: runRandom };
  const spellResult = applySpell(ctx0, pid, effectiveSpellId, [], applyOpts);
  if (showShop.value && context === "shop") {
    await playInstantSpellShopFx(effectiveSpellId);
  }
  await playSpectralSpellResultFx(spellResult?.spellFx ?? null, effectiveSpellId);
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
  syncGridTilesToLinkedDeckCards();
  noteSpellCastForReplay(pid);
  void offerDeckSource;
}

/**
 * @param {string} purchasedSpellId
 * @param {'shop' | 'inRun'} context
 * @param {'fullDeck' | 'remainingDeck'} offerDeckSource
 * @param {Parameters<typeof buildSpellTargetSessionFields>[4]} [overrides]
 * @returns {Promise<import('../game/inRunGrantFlow.js').SpellPreviewFlowResult>}
 */
async function runSpellPreviewChain(purchasedSpellId, context, offerDeckSource, overrides = {}) {
  const pid = String(purchasedSpellId ?? "");
  if (!pid) return { confirmed: false, skipped: true };

  if (pid === "restart") {
    const replayTarget = resolveRestartEffectiveSpellId(
      spellCastHistory.value,
      lastReplayableSpellId.value,
    );
    const result = await openSingleSpellPreviewSession(pid, context, offerDeckSource, {
      ...overrides,
      confirmDisabled: !replayTarget,
    });
    if (!result.confirmed) return result;
    if (!replayTarget) return result;
    return runSpellPreviewChain(replayTarget, context, offerDeckSource, overrides);
  }

  if (pid === "dice") {
    const result = await openSingleSpellPreviewSession(pid, context, offerDeckSource, overrides);
    if (!result.confirmed) return result;
    for (const subId of pickDiceChainSpellIds(runRandom)) {
      await runSpellPreviewChain(subId, context, offerDeckSource, overrides);
    }
    return { confirmed: true, skipped: false };
  }

  const replayTarget = resolveRestartEffectiveSpellId(spellCastHistory.value, lastReplayableSpellId.value);
  const openPreview =
    context === "inRun"
      ? shouldOpenInRunSpellPreview(pid)
      : shouldOpenSpellTargetLayer(pid, replayTarget);

  if (!openPreview) {
    await applyInstantSpellWithoutPreview(pid, context, offerDeckSource);
    return { confirmed: true, skipped: false };
  }

  return openSingleSpellPreviewSession(pid, context, offerDeckSource, overrides);
}

/** @param {string} spellId @param {{ treasureSlotIndex?: number }} [opts] */
async function runInRunSpellGrant(spellId, { treasureSlotIndex } = {}) {
  if (typeof treasureSlotIndex === "number" && treasureSlotIndex >= 0) {
    shopOverlayLayersSuppressed.value = true;
    await nextTick();
    await wobbleGameTreasureSlot(treasureSlotIndex);
    shopOverlayLayersSuppressed.value = false;
  }
  return runSpellPreviewChain(spellId, "inRun", "remainingDeck");
}

async function queueOrRunSpellTileAppearanceAnim(opts) {
  if (!showShop.value) {
    await runSpellTileAppearanceAnim(opts);
    return;
  }
  pendingSpellTileAppearanceAnim.value = opts;
}

/** 先播法术目标层关闭动画，再卸载（与商店 `TreasureDetailLayer.playClose` 一致） */
async function dismissSpellTargetLayer(previewResult) {
  const layer = spellTargetLayerRef.value;
  if (layer && typeof layer.playClose === "function") {
    await layer.playClose();
  }
  spellTargetSession.value = null;
  resolveSpellPreviewFlow(previewResult);
  ensurePackPickOverlayVisible();
}

async function onSpellTargetCancel() {
  await dismissSpellTargetLayer({ confirmed: false, skipped: true });
}

async function onSpellTargetConfirm(ordered, selectionSlotIndices) {
  const s = spellTargetSession.value;
  if (!s) return;

  const purchasedId = String(s.purchasedSpellId ?? "");
  if (purchasedId === "restart") {
    await dismissSpellTargetLayer({ confirmed: true, skipped: false });
    const replayTarget = resolveRestartEffectiveSpellId(
      spellCastHistory.value,
      lastReplayableSpellId.value,
    );
    if (!replayTarget) return;
    await runSpellPreviewChain(replayTarget, s.context ?? "shop", s.offerDeckSource ?? "fullDeck");
    return;
  }
  if (purchasedId === "dice") {
    await dismissSpellTargetLayer({ confirmed: true, skipped: false });
    const deckSrc = s.offerDeckSource ?? "fullDeck";
    const ctx = s.context ?? "shop";
    for (const subId of pickDiceChainSpellIds(runRandom)) {
      await runSpellPreviewChain(subId, ctx, deckSrc);
    }
    return;
  }
  const offerSlotsList = Array.isArray(s.offerSlots) ? s.offerSlots : [];
  let resolvedOrdered = Array.isArray(selectionSlotIndices)
    ? selectionSlotIndices.map((ix) => {
        const sl = offerSlotsList[ix];
        if (!sl || sl.empty) return null;
        const pos = resolveSpellOfferTargetOnGrid(grid.value, sl);
        if (pos) return { ...pos, deckCardUid: sl.deckCardUid ?? undefined };
        if (sl.deckOnly && sl.deckCardUid != null) return { deckCardUid: sl.deckCardUid };
        return { row: sl.row, col: sl.col, deckCardUid: sl.deckCardUid ?? undefined };
      }).filter(Boolean)
    : ordered;
  const ctx = buildSpellRuntimeContext();
  const sid = String(s.effectiveSpellId ?? "");
  const confirmAllSlotIxs = Array.isArray(selectionSlotIndices)
    ? selectionSlotIndices.filter((ix) => {
        const sl = offerSlotsList[ix];
        return typeof ix === "number" && ix >= 0 && sl && !sl.empty && sl.tile;
      })
    : [];
  const winnerOfferSlotIndex = pickSpellOfferWinnerSlotIndex(sid, confirmAllSlotIxs);
  applySpellOfferWinnerToContext(ctx, sid, offerSlotsList, winnerOfferSlotIndex);
  resolvedOrdered = narrowResolvedOrderedToSpellWinner(
    sid,
    resolvedOrdered,
    offerSlotsList,
    winnerOfferSlotIndex,
  );
  const deferInRunUpgradeFxApply =
    s.context === "inRun" &&
    s.pickMode === "preview_only" &&
    (sid === "arrow_up" || sid === "eclipse_length" || sid === "eclipse_rarity");
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
    ? buildSpellAnimPickTargetsFromOrdered(resolvedOrdered, g)
    : getSpellTileAppearanceTargets(sid, resolvedOrdered, g, ROWS, COLS);
  /** 与 `targets` 逐项对齐的候选槽下标（供弹层动效绑定），与 `resolvedOrdered` 同步过滤 */
  const animSelectionSlotIndices =
    usePickSequenceAnim &&
    Array.isArray(selectionSlotIndices) &&
    selectionSlotIndices.length === resolvedOrdered.length
      ? (() => {
          /** @type {number[]} */
          const ix = [];
          for (let i = 0; i < resolvedOrdered.length; i++) {
            const p = resolvedOrdered[i];
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
  const animOrderedForLayer = usePickSequenceAnim ? targets : resolvedOrdered;

  if (!targets.length) {
    const slotIxs = Array.isArray(selectionSlotIndices)
      ? selectionSlotIndices.filter((ix) => {
          const sl = offerSlotsList[ix];
          return typeof ix === "number" && ix >= 0 && sl && !sl.empty && sl.tile;
        })
      : [];
    const oldOfferSnaps =
      slotIxs.length > 0 ? slotIxs.map((ix) => buildSpellOfferSnapFromSlot(offerSlotsList[ix])) : [];
    const beforeGrid = cloneGridDeep(g, ROWS, COLS);
    /** @type {Record<string, unknown> | null} */
    let lastSpellFx = null;
    const applySpellNow = () => {
      if (deferInRunUpgradeFxApply) return;
      const r = applySpell(ctx, s.purchasedSpellId, s.effectiveSpellId, resolvedOrdered, { rng: runRandom });
      lastSpellFx = r?.spellFx ?? null;
    };
    let playedOnOffer = false;
    if (slotIxs.length > 0 && oldOfferSnaps.every(Boolean)) {
      playedOnOffer = await playSpellConfirmAnimOnOfferSlots(
        sid,
        slotIxs,
        oldOfferSnaps,
        applySpellNow,
        () => slotIxs.map((ix) => buildSpellOfferSnapFromSlot(offerSlotsList[ix])).filter(Boolean),
        { winnerOfferSlotIndex },
      );
    }
    if (!playedOnOffer) {
      const animTargets = buildSpellAnimPickTargetsFromOrdered(resolvedOrdered, g);
      if (animTargets.length) {
        const oldSnaps0 = animTargets.map(({ row, col }) => cloneGridTileSnapshot(g[row][col]));
        await queueOrRunSpellTileAppearanceAnim({
          spellId: sid,
          targets: animTargets,
          oldSnaps: oldSnaps0,
          grid,
          touchGrid,
          getTileEl: (row, col) => getGridTileElByIndex(row * COLS + col),
          nextTick,
          getNewSnapsAtMid: () => {
            applySpellNow();
            touchGrid();
            return animTargets.map(({ row, col }) => cloneGridTileSnapshot(grid.value[row][col]));
          },
        });
      } else {
        applySpellNow();
      }
    }
    await sleep(playedOnOffer ? 1000 : 0);
    await playSpectralSpellResultFx(lastSpellFx, sid);
    if (deferInRunUpgradeFxApply) await playInstantSpellInRunFx(sid);
    syncGridTilesToLinkedDeckCards();
    noteSpellCastForReplay(s.purchasedSpellId);
    await dismissSpellTargetLayer({ confirmed: true, skipped: false });
    return;
  }

  const oldSnaps = targets.map(({ row, col }) => cloneGridTileSnapshot(g[row][col]));
  /** @type {Record<string, unknown> | null} */
  let lastSpellFx = null;
  const applySpellNow = () => {
    if (deferInRunUpgradeFxApply) return;
    const r = applySpell(ctx, s.purchasedSpellId, s.effectiveSpellId, resolvedOrdered, { rng: runRandom });
    lastSpellFx = r?.spellFx ?? null;
  };
  await nextTick();
  const playedOnOffer =
    (await spellTargetLayerRef.value?.playConfirmAppearanceAnim?.({
      spellId: sid,
      targets,
      oldSnaps,
      ordered: animOrderedForLayer,
      selectionSlotIndices: animSelectionSlotIndices,
      winnerOfferSlotIndex,
      onMidApply: () => {
        applySpellNow();
        touchGrid();
        return targets.map(({ row, col }) => cloneGridTileSnapshot(grid.value[row][col]));
      },
    })) === true;
  if (!playedOnOffer) {
    await queueOrRunSpellTileAppearanceAnim({
      spellId: sid,
      targets,
      oldSnaps,
      grid,
      touchGrid,
      getTileEl: (row, col) => getGridTileElByIndex(row * COLS + col),
      nextTick,
      getNewSnapsAtMid: () => {
        applySpellNow();
        touchGrid();
        return targets.map(({ row, col }) => cloneGridTileSnapshot(grid.value[row][col]));
      },
    });
  }
  await sleep(playedOnOffer ? 1000 : 500);
  await playSpectralSpellResultFx(lastSpellFx, sid);
  if (deferInRunUpgradeFxApply) await playInstantSpellInRunFx(sid);
  syncGridTilesToLinkedDeckCards();
  noteSpellCastForReplay(s.purchasedSpellId);
  await dismissSpellTargetLayer({ confirmed: true, skipped: false });
}

function clearOfferSlotAfterPurchase(t) {
  const pid = Number(t?.offerInstanceId);
  if (!Number.isFinite(pid)) return;
  const isOfferPid = (o) => o.kind === "offer" && Number(o.offerInstanceId) === pid;
  if (t?.offerType === "voucher") {
    if (shopVoucherShelf.value?.kind === "offer" && isOfferPid(shopVoucherShelf.value)) {
      shopVoucherShelf.value = makeEmptyVoucherSlot();
    }
    return;
  }
  if (t?.offerType === "bundlePack") {
    packOffers.value = packOffers.value.map((o) => (isOfferPid(o) ? makeEmptyPackSlot() : o));
    return;
  }
  if (shopOffers.value.some(isOfferPid)) {
    shopOffers.value = shopOffers.value.map((o) => (isOfferPid(o) ? makeEmptyShopSlot() : o));
    return;
  }
  if (packOffers.value.some(isOfferPid)) {
    packOffers.value = packOffers.value.map((o) => (isOfferPid(o) ? makeEmptyPackSlot() : o));
  }
}

async function onTreasurePurchase() {
  const d = treasureDetail.value;
  if (!d) return;
  if (d.kind === "pack-inner") {
    await onPackInnerClaim();
    return;
  }
  if (d.kind !== "offer") return;
  const t = d.treasure;
  const pay = effectiveShopOfferPay(t, shopPriceForOffer(Number(t.price) || 0));

  if (t.offerType === "bundlePack") {
    if (money.value < pay) return;
    const layer = treasureDetailLayerRef.value;
    await layer?.playClose?.();
    money.value -= pay;
    noteRunShopPurchase();
    clearOfferSlotAfterPurchase(t);
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
    noteRunShopPurchase();
    clearOfferSlotAfterPurchase(t);
    const slotCountBefore = getShopRandomCardSlotCount(
      getShopRandomCardSlotBonus(ownedVoucherIds.value),
    );
    ownedVoucherIds.value = [...ownedVoucherIds.value, vid];
    const slotsToAdd =
      getShopRandomCardSlotCount(getShopRandomCardSlotBonus(ownedVoucherIds.value)) - slotCountBefore;
    appendShopRandomCardSlotsAfterPurchase(slotsToAdd);
    if (vid === "v_glyph_1" || vid === "v_glyph_2") {
      const tix = getGlyphPurchaseTargetLevelIndex(levelIndex.value, vid === "v_glyph_2");
      if (tix != null) {
        levelIndex.value = tix;
        glyphShopSkipLevelAdvance.value = true;
        const L = LEVELS[tix];
        if (L) {
          targetScore.value = resolveLevelTargetScore(L.id, "");
          activeBossSlug.value = "";
        }
        showToast(
          vid === "v_glyph_2"
            ? `已后退两大关，下一关为 ${L.id}`
            : `已后退一大关，下一关为 ${L.id}`,
        );
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
    noteRunShopPurchase();
    clearOfferSlotAfterPurchase(t);
    treasureDetail.value = null;
    await fulfillPackInnerPurchase(t, fromEl ?? null);
    return;
  }

  if (t.offerType === "spell") {
    const spellId = String(t.spellId ?? "");
    if (!spellId) return;
    const layer = treasureDetailLayerRef.value;
    await layer?.playClose?.();
    money.value -= pay;
    noteRunShopPurchase();
    clearOfferSlotAfterPurchase(t);
    treasureDetail.value = null;
    await runSpellPreviewChain(spellId, "shop", "fullDeck", {
      spellDescription: t.description,
      spellName: t.name,
      spellIconClass: t.iconClass,
      spellRarity: t.rarity,
    });
    return;
  }

  if (t.offerType === "upgrade") {
    const layer = treasureDetailLayerRef.value;
    await layer?.playClose?.();
    money.value -= pay;
    noteRunShopPurchase();
    clearOfferSlotAfterPurchase(t);
    treasureDetail.value = null;
    const payload = buildUpgradeAnimPayloadFromOffer(t);
    await runShopUpgradePlaybackSteps(
      [
        {
          payload,
          apply: () => applyUpgradeFromOffer(t, { price: pay }),
        },
      ],
      { restoreLayersAfter: false },
    );
    return;
  }

  const ix = findTreasurePlacementIndex(t);
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
  noteRunShopPurchase();
  ownedTreasures.value[ix] = {
    treasureId: t.treasureId,
    price: pay,
    rarity: t.rarity,
    name: t.name,
    emoji: t.emoji,
    description: t.description,
    treasureAccessoryId: t.treasureAccessoryId ?? null,
  };
  initTreasureBankOnAcquire(t.treasureId, treasureRunState.value);
  applyTreasureAcquireSideEffects(t.treasureId);
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
  const soldId = String(cur.treasureId ?? "");
  if (soldId === "98") treasureRunState.value.soldBlueprintTreasure98 = true;
  await notifyOwnedTreasuresOnTreasureSold(ownedSlotTreasureIdList(), {
    treasureRun: treasureRunState.value,
    soldTreasureId: soldId,
    soldSlotIndex: ix,
    grantRandomTreasureCopy: () => grantCopyOfRandomOwnedTreasure("104"),
    wobbleOwnedTreasureById,
    playOwnedTreasureBubbleFx,
  });
  const slots = [...ownedTreasures.value];
  const compacted = compactOwnedSlotsAfterCropSell(slots, ix, cur);
  if (!compacted) slots[ix] = null;
  ownedTreasures.value = slots;
  if (compacted) {
    const keys = [...gameOwnedKeyOrder.value];
    if (ix >= 0 && ix < keys.length) keys.splice(ix, 1);
    gameOwnedKeyOrder.value = keys;
  }
  if (!ownedSlotTreasureIdList().includes("110")) {
    treasureRunState.value.shopUpgradesFree = false;
  }
  treasureDetail.value = null;
  if (bossSlugForMechanics() === "verdant_leaf") {
    verdantTreasureSold.value = true;
    clearVerdantDebuffsOnGrid();
  }
}

async function onShopReroll() {
  if (transitionBusy.value) return;
  if (!shopCanReroll.value) return;
  const cost = shopNextRerollCostDisplay.value;
  const rs = treasureRunState.value;
  if (cost > 0) {
    money.value -= cost;
  } else if ((rs.shopFreeRerollsRemaining ?? 0) > 0) {
    rs.shopFreeRerollsRemaining -= 1;
  }
  noteRunReroll();
  await notifyOwnedTreasuresOnShopReroll(ownedSlotTreasureIdList(), {
    treasureRun: treasureRunState.value,
    playOwnedTreasureMultDeltaFx,
  });
  shopRerollsThisVisit.value += 1;
  const sessionExclude = new Set();
  addShopShelfTreasureIdsToExclude(sessionExclude, shopOffers.value);
  shopOffers.value = rollShopStock(runRandom, sessionExclude);
  packOffers.value = rollPackStock(runRandom, sessionExclude);
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
  if (shouldOfferBossBlindRerollBeforeShopLeave() && !bossRerollSession.value) {
    openBossBlindRerollSession();
    return;
  }
  await executeShopLeaveToNextLevel(event);
}

function onBossBlindRerollPaid() {
  const s = bossRerollSession.value;
  if (!s) return;
  if (!canPayBossBlindReroll(ownedVoucherIds.value, s.rerollsUsed, money.value)) return;
  money.value -= BOSS_BLIND_REROLL_COST_DOLLARS;
  noteRunReroll();
  const rerollNonce = s.rerollNonce + 1;
  const rerollsUsed = s.rerollsUsed + 1;
  const slug = pickBossSlugForLevel(s.levelId, getRunSeedNumeric(), rerollNonce);
  bossRerollSession.value = { ...s, slug, rerollNonce, rerollsUsed };
}

async function onBossBlindRerollContinue(event) {
  const s = bossRerollSession.value;
  if (!s) return;
  pendingBossSlugOverride.value = s.slug;
  bossRerollSession.value = null;
  await executeShopLeaveToNextLevel(event);
}

async function executeShopLeaveToNextLevel(event) {
  if (transitionBusy.value) return;
  transitionBusy.value = true;

  await notifyOwnedTreasuresOnShopLeave(ownedSlotTreasureIdList(), {
    treasureRun: treasureRunState.value,
    ownedSlotTreasureIds: ownedSlotTreasureIdList(),
    replayLastSpellInRun: async (spellId) => {
      await runSpellPreviewChain(spellId, "inRun", "remainingDeck");
    },
  });

  const nextLevel = async () => {
    // 只在“覆盖阶段”做 grid 清空/重置：让新关的 grid 先处在 pre-intro 隐藏态；
    // 入场动画本身要在转场结束后再启动，才能保证你能看见。
    gridIntroDone.value = false;
    if (glyphShopSkipLevelAdvance.value) {
      glyphShopSkipLevelAdvance.value = false;
      const cur = getRunLevelAtIndex(levelIndex.value);
      await resetLevelAfterTreasurePrep(cur);
    } else {
      levelIndex.value += 1;
      const next = getRunLevelAtIndex(levelIndex.value);
      await resetLevelAfterTreasurePrep(next);
    }
    pendingBossSlugOverride.value = "";
    showShop.value = false;
  };

  const playFx = irisTransition?.play;
  if (typeof playFx === "function") {
    await playFx({ onCovered: nextLevel });
  } else {
    nextLevel();
  }

  await nextTick();
  if (!showRunEnd.value) {
    await Promise.all([runGridIntroAfterReset(), playLevelAdvanceHeaderFx()]);
  }
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
  const s = Math.max(0.01, Number(speed) || 1);
  /** @param {HTMLElement} chip */
  function rippleOne(chip, isTreasure) {
    const oldTimer = accessoryRippleTimers.get(chip);
    if (oldTimer != null) {
      clearTimeout(oldTimer);
      accessoryRippleTimers.delete(chip);
    }
    chip.classList.remove(
      isTreasure ? "treasure-accessory-chip--ripple-active" : "tile-accessory-chip--ripple-active",
    );
    chip.classList.remove(
      isTreasure ? "" : "tile-accessory-chip--ripple-strong",
    );
    void chip.offsetWidth;
    const baseDuration = strong ? 0.62 : 0.46;
    const dur = `${Math.max(0.26, baseDuration / s).toFixed(3)}s`;
    if (isTreasure) {
      chip.style.setProperty("--treasure-acc-ripple-duration", dur);
      chip.classList.add("treasure-accessory-chip--ripple-active");
    } else {
      chip.style.setProperty("--tile-accessory-ripple-duration", dur);
      if (strong) chip.classList.add("tile-accessory-chip--ripple-strong");
      chip.classList.add("tile-accessory-chip--ripple-active");
    }
    const timer = setTimeout(() => {
      chip.classList.remove(
        isTreasure ? "treasure-accessory-chip--ripple-active" : "tile-accessory-chip--ripple-active",
      );
      chip.classList.remove("tile-accessory-chip--ripple-strong");
      chip.style.removeProperty(isTreasure ? "--treasure-acc-ripple-duration" : "--tile-accessory-ripple-duration");
      accessoryRippleTimers.delete(chip);
    }, Math.max(220, Math.round(((strong ? 700 : 520) / s))));
    accessoryRippleTimers.set(chip, timer);
  }
  const tileChip = slotEl.querySelector?.(".tile-accessory-chip");
  if (tileChip instanceof HTMLElement) rippleOne(tileChip, false);
  const treChip = slotEl.querySelector?.(".tile-treasure-accessory-chip");
  if (treChip instanceof HTMLElement) rippleOne(treChip, true);
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

/** 记分气泡锚点：用词槽外框（含 debuff 滤镜 / wobble 缩放），与棋盘格视觉一致 */
function scoreBubbleAnchorRect(slotEl) {
  const node = refToDom(slotEl) ?? (slotEl instanceof HTMLElement ? slotEl : null);
  if (!node || typeof node.getBoundingClientRect !== "function") return null;
  const r = node.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return null;
  return r;
}

function showScoreBubble(slotEl, text, kind, speed = 1) {
  const s = Math.max(0.01, Number(speed) || 1);
  const rect = scoreBubbleAnchorRect(slotEl);
  if (!rect) return null;
  const div = document.createElement("div");
  div.className =
    kind === "mult"
      ? "mult-popup-bubble"
      : kind === "replay"
        ? "score-popup-bubble score-popup-bubble--replay-again"
        : kind === "money"
          ? "score-popup-bubble score-popup-bubble--money"
          : kind === "destroy"
            ? "score-popup-bubble score-popup-bubble--destroy"
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
    zIndex: 350,
    pointerEvents: "none",
    force3D: true,
  });
  if (kind === "skip") {
    const risePx = Math.max(10 * rpx, rect.height * 0.2);
    gsap.fromTo(
      div,
      { opacity: 1, scale: 1, y: risePx },
      {
        y: 0,
        duration: (SKIP_BUBBLE_RISE_S + SKIP_BUBBLE_SETTLE_S) / s,
        ease: EASE_TRANSFORM,
      },
    );
    return div;
  }
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

/** Boss debuff / 软违规：弹出「跳过」后与单步 +分 气泡相同的步间、切下一字母间隔 */
async function runLetterScoringSkipStep(slotEl, speed = 1, slotIndex = -1) {
  if (!slotEl) return;
  const sp = Math.max(0.01, Number(speed) || 1);
  if (slotIndex >= 0) {
    scoringLetterIndex.value = slotIndex;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
  }
  wobbleScoreSlot(slotEl, sp);
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  const bubble = showScoreBubble(slotEl, "跳过", "skip", sp);
  scheduleSmallPlusBubbleOutro(bubble, sp);
  await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  if (slotIndex >= 0) scoringLetterIndex.value = -1;
  await scoringSleep(SCORING_LETTER_GAP_MS, sp);
}

/**
 * 按字母稀有度的宝藏倍率（铅笔/钢笔 +n；棱光等 ×n）：宝藏槽与词槽同时 wobble，字母上出倍率气泡。
 * @param {object} part letterParts[i]
 * @param {HTMLElement | null | undefined} slotEl
 * @param {{ treasureId: string, multDelta?: number, multMul?: number, bubbleLabel: string, rarity: string, active: boolean, slotIndex?: number }} cfg
 */
async function runLetterRarityTreasureMultStep(part, slotEl, cfg, speed = 1) {
  if (!cfg.active || part.rarity !== cfg.rarity || !slotEl) return false;
  const multMul = Number(cfg.multMul) || 0;
  const multDelta = Number(cfg.multDelta) || 0;
  if (multMul <= 1 && multDelta <= 0) return false;
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
  if (multMul > 1) {
    animMultTotal.value = Math.round(animMultTotal.value * multMul);
    await nextTick();
    const bubbleEl = showMultMultiplyBubble(slotEl, multMul, sp);
    pulseFormulaMultMultiplyBurst(getResultMultNumEl());
    gsap.to(bubbleEl, {
      opacity: 0,
      y: -22,
      scale: 0.85,
      duration: 0.22 / sp,
      delay: 0.38 / sp,
      ease: EASE_TRANSFORM,
      onComplete: () => bubbleEl.remove(),
    });
    await scoringSleep(SCORING_STEP_BEAT_MS + 120, sp);
  } else {
    animMultTotal.value += multDelta;
    await nextTick();
    const bubbleEl = showScoreBubble(slotEl, cfg.bubbleLabel, "mult", sp);
    pulseFormulaPanelNum(getResultMultNumEl());
    scheduleSmallPlusBubbleOutro(bubbleEl, sp);
    await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  }
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
  effectiveTreasureId,
  part,
  letterIndex,
  slotEl,
  speed = 1,
  realTile = null,
) {
  const tid = String(effectiveTreasureId ?? "");
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
  effectiveTreasureId,
  part,
  letterIndex,
  slotEl,
  speed = 1,
  realTile = null,
) {
  const tid = String(effectiveTreasureId ?? "");
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
  const slotEl = wordSlotRefs.value[i];
  if (!slotEl) return;
  if (isBossDebuffedSubmitTile(tile)) {
    await runLetterScoringSkipStep(slotEl, sp, i);
    return;
  }
  const part = detailed.letterParts[i];
  const luckyRoll = detailed.luckyMaterialRollsByLetter?.[i]?.[luckyVisitIndex] ?? null;
  /** 本字母本轮是否已播过词槽「逐字」缩放 wobble（用于幸运金币：尽量与已有分/倍率步同拍，避免单独再晃一格） */
  let wordSlotIntrinsicWobblePlayed = false;
  scoringLetterIndex.value = i;
  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));

  if (bossSlugForMechanics() === "the_tooth" && detailed.bossSoftViolation !== true && luckyVisitIndex === 0) {
    wobbleScoreSlot(slotEl, sp);
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    money.value = Math.max(0, money.value - 1);
    const bubbleTooth = showScoreBubble(slotEl, "-$1", "money", sp);
    scheduleSmallPlusBubbleOutro(bubbleTooth, sp);
    await scoringSleep(SCORING_STEP_BEAT_MS * 0.55, sp);
  }

  const realTile = resolveRealSubmitTileForWordSlot(i, tile);

  const ownedSlotIds = ownedTreasures.value.map((s) => s?.treasureId ?? null);
  const ctxScoreMerge = { ownedSlotTreasureIds: ownedSlotIds };
  /** @type {{ si: number, delta: number, label?: string, treasureId: string }[]} */
  const mergedIntrinsicScoreSlots = [];
  for (const { slotIndex: si, treasureId: tid } of iterTreasureHookContributions(ownedSlotIds)) {
    const hooks = TREASURE_HOOKS_BY_ID.get(tid);
    if (!hooks?.mergeLetterScoreCueIntoIntrinsicLetterScoreStep) continue;
    const cue = hooks.getPerLetterScoreCue?.(ctxScoreMerge, part, i);
    const d = Math.max(0, Math.floor(Number(cue?.delta) || 0));
    if (d <= 0) continue;
    mergedIntrinsicScoreSlots.push({ si, delta: d, label: cue?.label, treasureId: tid });
  }
  const mergedIntrinsicScoreAdd = mergedIntrinsicScoreSlots.reduce((s, x) => s + x.delta, 0);
  const baseLetterScore =
    (part.rarityBonus ?? 0) + (part.tileScoreBonus ?? 0) + (part.materialScoreBonus ?? 0);
  const totalIntrinsicScoreStep = baseLetterScore + mergedIntrinsicScoreAdd;

  if (totalIntrinsicScoreStep > 0) {
    wordSlotIntrinsicWobblePlayed = true;
    if (realTile && mergedIntrinsicScoreSlots.length) {
      for (const row of mergedIntrinsicScoreSlots) {
        TREASURE_HOOKS_BY_ID.get(row.treasureId)?.persistTileAfterPerLetterTreasureCue?.({
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
  for (const { slotIndex: si, treasureId: tid } of iterTreasureHookContributions(ownedSlotIds)) {
    if (mergedScoreSiSkip.has(si)) continue;
    const didTreasureScore = await runSlotPerLetterTreasureScoreStep(
      si,
      tid,
      part,
      i,
      slotEl,
      sp,
      realTile,
    );
    if (didTreasureScore) wordSlotIntrinsicWobblePlayed = true;
  }
  await runLetterAccessoryCoinMoneyBurst(tile, slotEl, sp);
  if (tile?.accessoryId === TILE_ACCESSORY_COIN) wordSlotIntrinsicWobblePlayed = true;

  const ctxMultMerge = { ownedSlotTreasureIds: ownedSlotIds };
  /** @type {{ si: number, delta: number, label?: string, treasureId: string }[]} */
  const mergedIntrinsicMultSlots = [];
  for (const { slotIndex: si, treasureId: tid } of iterTreasureHookContributions(ownedSlotIds)) {
    const hooks = TREASURE_HOOKS_BY_ID.get(tid);
    if (!hooks?.mergeLetterMultCueIntoIntrinsicLetterMultStep) continue;
    const cue = hooks.getPerLetterMultCue?.(ctxMultMerge, part, i);
    const d = Math.max(0, Math.round(Number(cue?.delta) || 0));
    if (d <= 0) continue;
    mergedIntrinsicMultSlots.push({ si, delta: d, label: cue?.label, treasureId: tid });
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
        TREASURE_HOOKS_BY_ID.get(row.treasureId)?.persistTileAfterPerLetterTreasureCue?.({
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
  for (const { slotIndex: si, treasureId: tid } of iterTreasureHookContributions(ownedSlotIds)) {
    if (mergedMultSiSkip.has(si)) continue;
    const didTreasureMult = await runSlotPerLetterTreasureMultStep(
      si,
      tid,
      part,
      i,
      slotEl,
      sp,
      realTile,
    );
    if (didTreasureMult) wordSlotIntrinsicWobblePlayed = true;
  }

  const ctxLetterRarityMult = {
    ownedSlotTreasureIds: ownedSlotIds,
    treasureRun: treasureRunState.value,
  };
  for (const { slotIndex: si, treasureId: tid } of iterTreasureHookContributions(ownedSlotIds)) {
    const animCfg = TREASURE_HOOKS_BY_ID.get(tid)?.getLetterRarityMultAnimConfig?.(ctxLetterRarityMult);
    if (!animCfg) continue;
    const didRarity = await runLetterRarityTreasureMultStep(part, slotEl, {
      treasureId: tid,
      slotIndex: si,
      multDelta: animCfg.multDelta,
      multMul: animCfg.multMul,
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

/**
 * 单字母由宝藏 `getLetterReplayCountForLetter` 触发的重播前：对应宝藏槽 wobble（无气泡，字母步紧随其后）。
 * @param {{ slotIndex: number, treasureId: string }} cue
 */
async function runPerLetterTreasureReplayCue(cue, speed = 1) {
  const sp = Math.max(0.01, Number(speed) || 1);
  const ti = cue?.slotIndex;
  if (typeof ti !== "number" || ti < 0) return;
  scoringTreasureBarIndex.value = ti;
  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));
  const tel = gameTreasureSlotRefs[ti];
  if (tel) {
    const tl = createWobbleScoreSlotTimeline(tel);
    if (tl) {
      tl.timeScale(sp);
      tl.play(0);
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
 * @param {number} lastWordLen 本手最后提交单词的判定词长（实际字母数 + 画笔等）
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
      const observatoryBoost = isLengthObservatoryBoosted(
        ownedVoucherIds.value,
        len,
        spellCountsByLength.value,
      );
      noteTreasureRunUpgradeUsed(treasureRunState.value);
      bumpWordLengthLevel(len, { observatoryBoost });
      await runClearWinLengthUpgradeShopLikeFx({
        areaRef: gameResultAreaRef,
        model: clearWinFxModel,
        fxActive: clearWinLengthUpgradeFxActive,
        waitNextTick: () => nextTick(),
        len,
        beforeLevel,
        observatoryBoost,
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
  /** 分数列从「判定词长×词长每字基础分」开始，逐字只加稀有度加成（气泡也只显示加成） */
  animScoreSum.value = skipLetters
    ? 0
    : Math.round(
        detailed.wordLengthScoreEffective ??
          scaleLengthContributionForBoss(
            getWordLengthScoreForTableLen(
              lenTb,
              lengthLevelsByLength.value,
              lengthUpgradeObservatoryExtra.value,
            ),
            isFlintBossActive.value,
          ),
      );
  animMultTotal.value =
    detailed.lengthMultiplierEffective ??
    scaleLengthContributionForBoss(detailed.lengthMultiplier, isFlintBossActive.value);
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
  const perLetterTreasureReplayCueSteps = detailed.perLetterTreasureReplayCueSteps ?? [];
  const perLetterTreasureReplayCueCursor = perLetterTreasureReplayCueSteps.map(() => 0);
  /** 与 `luckyMaterialRollsByLetter[i]` 对齐：该字母第几次逐字结算（首遍 + replay + 整词额外轮） */
  const luckyVisitByLetter = detailed.letterParts.map(() => 0);
  const totalScoringBeats = getSubmitScoringTotalBeats(detailed);
  let scoringBeat = 0;
  if (skipLetters) {
    const spSkip = 1.05;
    for (let i = 0; i < n; i++) {
      await runLetterScoringSkipStep(wordSlotRefs.value[i], spSkip, i);
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
        if (isBossDebuffedSubmitTile(tiles[i])) {
          await runLetterScoringSkipStep(wordSlotRefs.value[i], spLetter, i);
          scoringBeat += 1;
          continue;
        }
        await runSingleLetterScoringStep(tiles[i], i, detailed, spLetter, luckyVisitByLetter[i]++);
        scoringBeat += 1;
        if (pass === 0) {
          const replayExtra = Math.max(0, Math.floor(Number(letterReplayExtraCounts[i]) || 0));
          const letterTreasureReplayCues = perLetterTreasureReplayCueSteps[i] ?? [];
          for (let r = 0; r < replayExtra; r++) {
            const cueIdx = perLetterTreasureReplayCueCursor[i] ?? 0;
            if (cueIdx < letterTreasureReplayCues.length) {
              perLetterTreasureReplayCueCursor[i] = cueIdx + 1;
              const spTreasureCue = getSubmitScoringBeatSpeed(scoringBeat, totalScoringBeats);
              await runPerLetterTreasureReplayCue(letterTreasureReplayCues[cueIdx], spTreasureCue);
              scoringBeat += 1;
            } else if (tiles[i]?.accessoryId === TILE_ACCESSORY_REWIND) {
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

  /** @type {import('../treasures/treasureTypes.js').SubmitWordLeaveFxRunner[]} */
  let submitWordLeaveFx = [];
  if (detailed.bossSoftViolation !== true) {
    submitWordLeaveFx = await runPendingInRunGrantsAfterSubmit(
      tiles,
      String(resolvedWord ?? "")
        .toLowerCase()
        .trim() || tiles.map((c) => c.letter.toLowerCase()).join(""),
      lenTb,
      currentScore.value,
    );
  }

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
  const leaveDuration = 0.28;
  const leaveStagger = submitWordLeaveStagger(n);
  const leavePromise = (async () => {
    if (submitWordLeaveFx.length > 0) {
      for (const fx of submitWordLeaveFx) {
        await fx({
          slotEls: slotTileEls,
          gridEls: submitGridLeaveEls,
          duration: leaveDuration,
          stagger: leaveStagger,
        });
      }
      return;
    }
    await runSlotAndGridLeaveAnimation(slotTileEls, submitGridLeaveEls, {
      duration: leaveDuration,
      stagger: leaveStagger,
    });
  })();

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
      tryCeruleanBellFlyInAfterGridStable();
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
  if (!t) return;
  const tw = Math.max(t.width, 1e-6);
  const th = Math.max(t.height, 1e-6);
  const targetScale = item.targetSlotScale ?? 1;
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
    "--slot-scale": targetScale,
    duration: FLY_DURATION,
    ease: EASE_TRANSFORM,
    onComplete: () => {
      flyingInAnimStarted.delete(item.id);
      flyingInElById.delete(item.id);
      flyInPendingComplete.push(item);
      flyingLetters.value = flyingLetters.value.filter((f) => f.id !== item.id);
      flushFlyInSelections();
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
  if (transitionBusy.value || showShop.value || isRunFlowOverlayOpen()) return;
  if (scoringAnimating.value || gridRefillAnimating.value) return;
  if (wordSelectionSwapBusy.value) return;
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
  flyInPendingComplete.length = 0;
  nextTick(() => updateSlotPositions(true));
}

async function onRemoveClick() {
  if (dictFatalError.value) return;
  if (transitionBusy.value || showShop.value || isRunFlowOverlayOpen()) return;
  if (!canRemove.value) return;
  if (flyingLetters.value.length > 0) {
    cancelAllFlyingIn();
  }
  const nSel = selectedOrder.value.length;
  if (nSel === 0) return;

  const discardedLettersForHooks = selectedTiles.value.map(({ tile }) => ({
    letter: tile?.letter ?? "",
  }));

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

  const discardPotteryFxHandled = await runDiscardLeaveAnimation(
    slotTileEls,
    removeGridLeaveEls,
    discardedLettersForHooks,
    {
      duration: REMOVE_SLOT_FADE_DURATION,
      stagger: REMOVE_SLOT_STAGGER,
    },
  );
  const result = removeSelectedLetters({
    prevCells: prevFlip.cells,
    maxRemovalLetters: MAX_LETTERS_PER_REMOVAL,
  });
  if (!result.success) {
    for (const el of removeGridLeaveEls) clearGridTileGsapAfterDrop(el);
    for (const slotEl of slotTileEls) {
      const ph = slotEl.querySelector(".word-slot-placeholder");
      if (ph) ph.classList.remove("word-slot-placeholder--shell");
    }
    gsap.set(slotTileEls, { opacity: 1, scale: 1, y: 0 });
    gridRefillAnimating.value = false;
    showToast(result.error ?? "无法丢弃");
    return;
  }

  recordLettersDiscarded(runMatchStats.value, nSel);

  treasureRunState.value.levelDiscardsUsed = true;
  addTreasureRunLettersDiscarded(treasureRunState.value, nSel);
  recordTreasureLevelVowelLetters(
    treasureRunState.value,
    discardedLettersForHooks,
    ownedSlotTreasureIdList(),
  );
  recordTreasureDiscardWord(treasureRunState.value, discardedLettersForHooks, (w) =>
    getWordDefinition(w),
  );
  await notifyOwnedTreasuresOnDiscardBatch(ownedSlotTreasureIdList(), {
    ownedSlotTreasureIds: ownedSlotTreasureIdList(),
    discardedLetters: discardedLettersForHooks,
    letterCount: nSel,
    treasureRun: treasureRunState.value,
    rng: runRandom,
    discardPotteryFxHandled,
    resolveDiscardedWord: (w) => getWordDefinition(w),
    bumpWordLengthLevel: (len) => {
      noteTreasureRunUpgradeUsed(treasureRunState.value);
      bumpWordLengthLevel(len, {
        observatoryBoost: isLengthObservatoryBoosted(
          ownedVoucherIds.value,
          len,
          spellCountsByLength.value,
        ),
      });
    },
    addMoney: (amount) => {
      money.value += Math.max(0, Math.floor(Number(amount) || 0));
    },
    playOwnedTreasureMoneyFx,
    playOwnedTreasureMultDeltaFx,
    playOwnedTreasureScoreDeltaFx,
    playOwnedTreasureBubbleFx,
    wobbleOwnedTreasureById,
    findOwnedTreasureSlotIndex,
  });
  noteDiscardExhaustedForChapterUnlock();

  await nextTick();
  await runGridDropAnimation(prevFlip);
  tryCeruleanBellFlyInAfterGridStable();
  gridRefillAnimating.value = false;
  nextTick(() => updateSlotPositions(true));
}

/** 青铃锁：棋盘稳定后从格内飞入词槽（与玩家点选同一套飞字） */
function tryCeruleanBellFlyInAfterGridStable() {
  const pick = prepareCeruleanBellPickAfterGridStable();
  if (!pick) return;
  const tile = grid.value[pick.row]?.[pick.col];
  if (!tile?.letter) return;
  startOneMoveIn(pick.row, pick.col, tile, { ceruleanBell: true });
}

function startOneMoveIn(row, col, tile, options = {}) {
  if (transitionBusy.value || showShop.value || isRunFlowOverlayOpen()) return;
  if (gridRefillAnimating.value && !options.ceruleanBell) return;
  const index = row * COLS + col;
  const fromEl = gridTileRefs.value[index] ?? getGridTileElByIndex(index);
  if (!fromEl) return;
  const fromRect = fromEl.getBoundingClientRect();
  const wrapEl = wordSlotsWrapRef.value;
  if (!wrapEl) return;
  const wrapRect = wrapEl.getBoundingClientRect();
  if (wrapRect.width <= 0 || wrapRect.height <= 0) return;
  const flyPres = computeFlyInTilePresentation(tile);
  const targetSlotIndex = selectedOrder.value.length + flyingLetters.value.length;
  flyingLetters.value = [
    ...flyingLetters.value,
    {
      id: `fly-in-${++flyingInIdCounter}-${Date.now()}`,
      fromRect,
      toRect: null,
      targetSlotIndex,
      layoutNumSlots: 0,
      targetSlotScale: 1,
      letter: flyPres.letter,
      rarity: flyPres.rarity,
      materialId: tile.materialId ?? null,
      accessoryId: tile.accessoryId ?? null,
      treasureAccessoryId: tile.treasureAccessoryId ?? null,
      bossTileDebuffed: tile.bossTileDebuffed === true,
      ceruleanBell: options.ceruleanBell === true,
      vowelGhostPrev: flyPres.vowelGhostPrev,
      vowelGhostNext: flyPres.vowelGhostNext,
      playerMarked: tile.playerMarked === true,
      pendingRow: row,
      pendingCol: col,
    },
  ];
  syncFlyingInTargets();
}

function onSlotClick(i) {
  if (suppressTilePrimaryClick.value) {
    suppressTilePrimaryClick.value = false;
    return;
  }
  if (dictFatalError.value) return;
  if (transitionBusy.value || showShop.value || isRunFlowOverlayOpen()) return;
  if (scoringAnimating.value) return;
  if (wordSelectionSwapBusy.value) return;
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
  const list = [];
  for (let j = slotIndex; j < order.length; j++) {
    if (batches.some((b) => b.slotIndex <= j)) continue;
    const fromEl = fromRefs[j];
    const { row, col } = order[j];
    const toEl = gridTileRefs.value[row * COLS + col];
    const tile = grid.value[row][col];
    if (!fromEl || !toEl) continue;
    const backPres = computeFlyBackTilePresentation(tile);
    list.push({
      fromRect: fromEl.getBoundingClientRect(),
      toRect: toEl.getBoundingClientRect(),
      letter: backPres.letter,
      rarity: backPres.rarity,
      materialId: tile.materialId ?? null,
      accessoryId: tile.accessoryId ?? null,
      bossTileDebuffed: tile.bossTileDebuffed === true,
      vowelGhostPrev: backPres.vowelGhostPrev,
      vowelGhostNext: backPres.vowelGhostNext,
      playerMarked: tile.playerMarked === true,
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
  setRarityLevelWithTreasurePairs(rk, beforeLevel + 1);
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
  if (transitionBusy.value || showShop.value || isRunFlowOverlayOpen()) return;
  if (scoringAnimating.value) return;
  if (!dictionaryReady.value) return;
  const parts = buildEffectiveWordPartsForSubmit();
  const wordPattern0 = parts.word;
  if (!wordPattern0) return;
  const resolvedWord = resolveWordFromEffectiveParts(parts);
  if (!resolvedWord) {
    showToast("不是有效单词");
    return;
  }
  const ownedSlotTreasureIds = ownedTreasures.value.map((s) => s?.treasureId ?? null);
  const tiles = withWildcardsResolvedForScoring(
    listEffectiveTilesForSubmit().map((tile) => {
      const pres = tilePresentationInResolvedWord(tile, resolvedWord, wordPattern0);
      return {
        ...tile,
        letter: pres.letter,
        rarity: pres.rarity,
        baseScore: getBaseScoreForRarity(pres.rarity, rarityLevelsByRarity.value),
      };
    }),
    resolvedWord,
    rarityLevelsByRarity.value,
  );
  const debuffCtx = getBossTileDebuffContext();
  const bossSlugSubmit = bossSlugForMechanics();
  for (const t of tiles) {
    if (t?.letter) applyBossTileDebuffState(t, bossSlugSubmit, debuffCtx);
  }
  const submittedIceTileIds = tiles
    .filter((t) => t?.materialId === "ice")
    .map((t) => String(t?.id ?? ""))
    .filter(Boolean);
  const ownedSlotTreasureAccessoryIds = ownedTreasures.value.map((s) => s?.treasureAccessoryId ?? null);
  /** 与号角等一致：仅当本手消耗关内最后一次出牌机会（提交前剩余 1 次） */
  const isLastSubmitChance = remainingWords.value === 1;
  const gSubmit = grid.value;
  const submitExcludedGridKeys = gridSelectedPositionKeySet(selectedTiles.value);
  const gridTilesForTreasures = collectGridLetterTiles(gSubmit, ROWS, COLS);
  const remainingGridTilesForTreasures = collectGridLetterTiles(
    gSubmit,
    ROWS,
    COLS,
    submitExcludedGridKeys,
  );
  const gridPresencePostLetterSteps = buildGridPresencePostLetterSteps(
    gSubmit,
    ROWS,
    COLS,
    submitExcludedGridKeys,
    getGridEffectTriggerCount,
  );
  const ownedTids = ownedSlotTreasureIdList();
  const lengthJb =
    getWordLengthJudgmentBonus(ownedVoucherIds.value) -
    runWordLengthJudgmentPenalty.value -
    sumTreasureLengthJudgmentPenalty(ownedTids) +
    sumTreasureSubmitLengthBonus(ownedTids);
  const judgedLenTable = getJudgedLengthTableLenWithPenalty(
    resolvedWord.length,
    ownedVoucherIds.value,
    runWordLengthJudgmentPenalty.value +
      sumTreasureLengthJudgmentPenalty(ownedTids) -
      sumTreasureSubmitLengthBonus(ownedTids),
  );
  const soft = evaluateBossSoftWordViolation({
    slug: bossSlugForMechanics(),
    wordLen: judgedLenTable,
    resolvedWord,
    endingLetterRarity: getEndingLetterRarityFromTiles(tiles),
    getWordDefinition,
    usedLengthsThisLevel: usedWordLengthsThisBoss.value,
    mouthLockedLength: mouthLockedLengthBoss.value,
    clubRequiredKey: clubRequiredKeyBoss.value || "",
    ownedSlotTreasureIds: ownedTids,
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
  if (bossSlugForMechanics() === "crimson_heart") {
    const ix = pickCrimsonDisabledTreasureSlotIndex();
    if (ix != null) {
      crimsonSet = new Set([ix]);
      crimsonTreasureDisabledSlotIndex.value = ix;
    }
  }
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
    1,
    lengthJb,
    {
      disabledTreasureSlotIndices: crimsonSet,
      bossFlintQuarter: isFlintBossActive.value,
      lengthUpgradeObservatoryExtra: lengthUpgradeObservatoryExtra.value,
      rng: runRandom,
      resolvedWord,
      treasureRun: treasureRunState.value,
      money: money.value,
      ownedTreasureInstances: ownedTreasures.value.filter(Boolean),
      getWordDefinition,
      gridTiles: gridTilesForTreasures,
      remainingGridTiles: remainingGridTilesForTreasures,
      fullDeck: initialDeckSnapshot.value,
    },
  );
  if (submitViolated) {
    if (bossSlugForMechanics()) {
      await notifyOwnedTreasuresOnBossRestrictionTriggered(ownedSlotTreasureIdList(), {
        ownedSlotTreasureIds: ownedSlotTreasureIdList(),
        treasureRun: treasureRunState.value,
        bossSlug: bossSlugForMechanics(),
        addMoney: (n) => {
          money.value += Math.max(0, Math.floor(Number(n) || 0));
        },
        playOwnedTreasureMoneyFx,
      });
    }
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
  const scoreBeforeHand = currentScore.value;
  recordWordSubmit(runMatchStats.value, {
    word: resolvedWord,
    score: detailed.finalScore,
    length: judgedLenTable,
  });
  recordTreasureChapterWordPos(treasureRunState.value, resolvedWord, getWordDefinition);
  recordTreasureLevelVowelLetters(
    treasureRunState.value,
    tiles.map((t) => ({ letter: t?.letter ?? "" })),
    ownedTids,
  );
  flashSubmitCountDelta();
  remainingWords.value = Math.max(0, remainingWords.value - 1);
  await nextTick();
  await sleep(ACTION_COUNT_DELTA_BEAT_MS);
  scoringAnimating.value = true;
  scoringLetterIndex.value = -1;
  try {
    await runSubmitScoringSequence(tiles, detailed, resolvedWord);
    for (const iceTileId of submittedIceTileIds) {
      if (runRandom() < ICE_MATERIAL_SELF_DESTRUCT_CHANCE) {
        consumeIceTileOnGrid(iceTileId);
        await notifyOwnedTreasuresOnIceBreak(ownedSlotTreasureIdList(), {
          treasureRun: treasureRunState.value,
          wobbleOwnedTreasureById,
          playOwnedTreasureBubbleFx,
        });
      }
    }
    await runLastSubmitVipDiamondRarityFxIfApplicable(tiles, isLastSubmitChance);
    if (!submitViolated) {
      if (
        parseLevelSubFromId(currentLevel.value?.id ?? "1-1") === 3 &&
        tiles.length > 0 &&
        tiles.every((t) => String(t?.rarity ?? "common") === "common")
      ) {
        treasureRunState.value.allCommonBossClearRecorded = true;
      }
      const allGold =
        !submitViolated &&
        tiles.length > 0 &&
        tiles.every((t) => t?.materialId === "gold");
      if (allGold) treasureRunState.value.playedAllGoldWord = true;
      recordSpellWordLength(judgedLenTable);
      const sub = parseLevelSubFromId(currentLevel.value?.id ?? "1-1");
      if (sub <= 2) {
        for (const t of tiles) {
          const c = t?._deckCard;
          const uid = c && typeof c === "object" ? Number(/** @type {{ _dcUid?: number }} */ (c)._dcUid) : NaN;
          if (Number.isFinite(uid)) pillarUsedDeckUids.value.add(uid);
        }
      }
      if (bossSlugForMechanics() === "the_eye") usedWordLengthsThisBoss.value.add(judgedLenTable);
      mouthLockedLengthBoss.value = nextMouthLockedLengthAfterSubmit(
        mouthLockedLengthBoss.value,
        judgedLenTable,
        false,
      );
      if (bossSlugForMechanics() === "the_arm") {
        const curLv = Math.max(1, Math.round(Number(lengthLevelsByLength.value[judgedLenTable])) || 1);
        setWordLengthLevel(judgedLenTable, Math.max(1, curLv - 1));
      }
      const oxHit =
        bossSlugForMechanics() === "the_ox" && evaluateOxBossHit(judgedLenTable, spellCountsByLength.value);
      recordSpellWordLength(judgedLenTable);
      if (oxHit) money.value = 0;
    } else {
      mouthLockedLengthBoss.value = nextMouthLockedLengthAfterSubmit(
        mouthLockedLengthBoss.value,
        judgedLenTable,
        true,
      );
    }
    // 用尽次数但本手已达标 → 过关（含「最后一手刚好达标」）
    if (currentScore.value >= targetScore.value) {
      const isFinalStandardWin =
        !isEndlessRun.value && isStandardRunFinalLevelIndex(levelIndex.value);
      if (isFinalStandardWin) {
        settlementSnapshot.value = buildSettlementSnapshot();
        await openRunEnd("win", { preserveSettlement: true });
      } else {
        await openStageSettlement();
      }
    } else if (remainingWords.value <= 0 && currentScore.value < targetScore.value) {
      await openRunEnd("fail");
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
/** @type {(() => void) | null} */
let disposeE2eHarness = null;

/** @param {object} t 商店货架 offer 槽 */
function e2eCanBuyShopOffer(t) {
  if (!t || t.kind !== "offer") return false;
  const w = money.value;
  const p0 = Number(t.price);
  if (!Number.isFinite(w) || !Number.isFinite(p0)) return false;
  const p = shopPriceForOffer(p0);
  if (t.offerType === "voucher") {
    const vid = String(t.voucherId ?? "");
    if (vid === "v_glyph_1" || vid === "v_glyph_2") {
      if (getGlyphPurchaseTargetLevelIndex(levelIndex.value, vid === "v_glyph_2") == null) return false;
    }
    return w >= p;
  }
  if (t.offerType === "bundlePack") return w >= p;
  if (t.offerType === "spell") {
    const sid = String(t.spellId ?? "");
    return w >= p;
  }
  if (t.offerType === "upgrade") return w >= p;
  if (t.offerType === "deckLetter" || t.offerType === "deckTile") return w >= p;
  if (t.offerType === "treasure") {
    return w >= p && canPlaceTreasureOffer(t);
  }
  return w >= p;
}

/** @param {number} offerInstanceId */
function findShopOfferById(offerInstanceId) {
  const pid = Number(offerInstanceId);
  if (!Number.isFinite(pid)) return null;
  const sources = [
    ...shopOffers.value,
    ...packOffers.value,
    shopVoucherShelf.value,
  ];
  for (const s of sources) {
    if (s?.kind === "offer" && Number(s.offerInstanceId) === pid) return s;
  }
  return null;
}

function getE2eShopSnapshot() {
  /** @param {object | null | undefined} slot @param {string} source */
  const view = (slot, source) => {
    if (!slot || slot.kind !== "offer") return null;
    return {
      offerInstanceId: slot.offerInstanceId,
      offerType: slot.offerType,
      price: shopPriceForOffer(Number(slot.price) || 0),
      name: slot.name ?? slot.emoji ?? slot.offerType,
      treasureId: slot.treasureId ?? null,
      spellId: slot.spellId ?? null,
      voucherId: slot.voucherId ?? null,
      upgradeKind: slot.upgradeKind ?? null,
      source,
      canBuy: e2eCanBuyShopOffer(slot),
    };
  };
  /** @type {object[]} */
  const offers = [];
  for (const s of shopOffers.value) {
    const v = view(s, "shelf");
    if (v) offers.push(v);
  }
  for (const s of packOffers.value) {
    const v = view(s, "pack");
    if (v) offers.push(v);
  }
  const v = view(shopVoucherShelf.value, "voucher");
  if (v) offers.push(v);
  return {
    money: money.value,
    offers,
    hasTreasureSlot: ownedTreasures.value.some((s) => s == null) || willCropAccessoryExpandSlots(
      ownedTreasures.value,
      treasureVoucherExtraSlots(),
      "treasure_acc_crop",
    ),
    canReroll: shopCanReroll.value,
  };
}

/** @param {number} offerInstanceId */
async function e2eBuyShopOfferById(offerInstanceId) {
  if (transitionBusy.value || shopUpgradeAnimating.value || packPickBusy.value) {
    return { ok: false, reason: "busy" };
  }
  const t = findShopOfferById(offerInstanceId);
  if (!t) return { ok: false, reason: "not_found" };
  treasureDetail.value = { kind: "offer", treasure: t, originRect: null };
  await nextTick();
  if (!treasureCanBuyOffer.value) {
    treasureDetail.value = null;
    return { ok: false, reason: "cannot_buy" };
  }
  try {
    await onTreasurePurchase();
    return { ok: true };
  } catch (e) {
    console.error("[E2E] 购买失败", e);
    return { ok: false, reason: "error" };
  }
}

async function e2eAutoSpellTarget() {
  const s = spellTargetSession.value;
  if (!s) return { ok: false, reason: "no_session" };
  const n = Math.max(0, Math.floor(Number(s.pickCount)) || 0);
  /** @type {{ row: number, col: number }[]} */
  const ordered = [];
  const g = grid.value;
  for (let r = 0; r < ROWS && ordered.length < n; r++) {
    for (let c = 0; c < COLS && ordered.length < n; c++) {
      const t = g[r]?.[c];
      if (t?.letter && !t.bossGridBlocked) ordered.push({ row: r, col: c });
    }
  }
  if (ordered.length < n && n > 0) {
    return { ok: false, reason: "not_enough_tiles" };
  }
  const indices = ordered.map((_, i) => i);
  await onSpellTargetConfirm(ordered, indices);
  return { ok: true, picked: ordered.length };
}

async function e2eAutoPackPickOnce() {
  const sess = packPickSession.value;
  if (!sess || packPickBusy.value) return { ok: false, reason: "no_session" };
  const claimed = sess.claimedKeys ?? [];
  if (claimed.length >= packPickRequiredPicks(sess)) return { ok: false, reason: "done" };
  const opt = (sess.options ?? []).find((o) => {
    const key = packPickOptionKeyOf(o);
    if (claimed.includes(key)) return false;
    if (o.offerType === "treasure" && !canPlaceTreasureOffer(o)) return false;
    if (o.offerType === "spell") {
      const sid = String(o.spellId ?? "");
    }
    return true;
  });
  if (!opt) return { ok: false, reason: "no_option" };
  treasureDetail.value = {
    kind: "pack-inner",
    treasure: opt,
    packOptionKey: packPickOptionKeyOf(opt),
    originRect: null,
  };
  await nextTick();
  if (!treasureCanBuyOffer.value) {
    treasureDetail.value = null;
    return { ok: false, reason: "cannot_claim" };
  }
  await onPackInnerClaim();
  return { ok: true, name: opt.name ?? opt.offerType };
}

function getBossPlayContextForE2e() {
  return {
    slug: activeBossSlug.value || "",
    usedLengthsThisBoss: usedWordLengthsThisBoss.value,
    mouthLockedLength: mouthLockedLengthBoss.value,
    clubRequiredKey: clubRequiredKeyBoss.value || null,
    getWordDefinition,
    getJudgedLength: (rawLen) =>
      getJudgedLengthTableLenWithPenalty(rawLen, ownedVoucherIds.value, runWordLengthJudgmentPenalty.value),
  };
}

function mountE2eHarnessIfNeeded() {
  if (!isE2eMode() || disposeE2eHarness) return;
  disposeE2eHarness = registerGameTestHarness({
      getGridSnapshot() {
        const g = grid.value;
        /** @type {import('../e2e/gridWordFinder.js').GridCell[]} */
        const cells = [];
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const t = g[r]?.[c];
            if (!t?.letter) continue;
            cells.push({
              row: r,
              col: c,
              letter: t.letter,
              rarity: String(t.rarity ?? "common"),
              isWildcard: isWildcardMaterialTile(t),
              blocked: !!t.bossGridBlocked,
              bossDebuffed: !!t.bossTileDebuffed,
            });
          }
        }
        return cells;
      },
      selectTile,
      clearCurrentWord,
      submitWord,
      resolveWordPattern,
      getDictCandidatesByLength: getCandidateWordsByLength,
      getTileAt(row, col) {
        const t = grid.value[row]?.[col];
        if (!t?.letter) return null;
        return { rarity: String(t.rarity ?? "common"), letter: t.letter };
      },
      getBossPlayContext: getBossPlayContextForE2e,
      getShopSnapshot: getE2eShopSnapshot,
      buyOffer: e2eBuyShopOfferById,
      autoPackPick: e2eAutoPackPickOnce,
      autoSpellTarget: e2eAutoSpellTarget,
      shopReroll: onShopReroll,
      canShopReroll: () => shopCanReroll.value,
      getRng: runRandom,
      getPreviewScoreForPick(path) {
        const tiles = path.map(({ row, col }) => grid.value[row][col]);
        const pattern = tiles.map((t) => String(t?.letter ?? "").toLowerCase()).join("");
        const resolved = resolveWordPattern(pattern, "?");
        const lengthJb =
          getWordLengthJudgmentBonus(ownedVoucherIds.value ?? []) -
          runWordLengthJudgmentPenalty.value;
        const flintOpts =
          isFlintBossActive.value ? { bossFlintQuarter: true } : {};
        flintOpts.lengthUpgradeObservatoryExtra = lengthUpgradeObservatoryExtra.value;
        if (resolved) flintOpts.resolvedWord = resolved;
        return computeWordScore(
          tiles,
          1,
          lengthLevelsByLength.value,
          rarityLevelsByRarity.value,
          lengthJb,
          flintOpts,
        );
      },
      getStateSnapshot() {
        return {
          idle:
            !transitionBusy.value &&
            !scoringAnimating.value &&
            !gridRefillAnimating.value &&
            flyingLetters.value.length === 0,
          levelId: currentLevel.value?.id ?? "1-1",
          levelIndex: levelIndex.value,
          currentScore: currentScore.value,
          targetScore: targetScore.value,
          remainingWords: remainingWords.value,
          remainingRemovals: remainingRemovals.value,
          money: money.value,
          canSubmit: canSubmit.value,
          showShop: showShop.value,
          showSettlement: showSettlement.value,
          showRunEnd: showRunEnd.value,
          runEndOutcome: runEndOutcome.value,
          isEndlessRun: isEndlessRun.value,
          bossBlindOpen: !!bossRerollSession.value,
          packPickOpen: !!packPickSession.value,
          treasureDetailOpen: !!treasureDetail.value,
          spellTargetOpen: !!spellTargetSession.value,
          activeBoss: activeBossSlug.value || "",
          ownedTreasureIds: ownedTreasures.value.map((s) => s?.treasureId ?? null),
        };
      },
      dismissOverlays() {
        treasureDetail.value = null;
        if (spellTargetSession.value) spellTargetSession.value = null;
      },
      shopNextLevel: onShopNextLevel,
      settlementContinue: onSettlementContinue,
      bossBlindContinue: onBossBlindRerollContinue,
    });
}

onMounted(async () => {
  await loadDictionary({ shouldAbort: () => !gamePanelAlive });
  if (!gamePanelAlive) return;
  ensureBigramTargetPair(treasureRunState.value, rollRandomBigramForTreasure);
  mountE2eHarnessIfNeeded();
  slotRafLastTime = performance.now();
  slotRafId = requestAnimationFrame(slotRafLoop);
  if (!gamePanelAlive) return;
  const levelDef = currentLevel.value ?? getRunLevelAtIndex(levelIndex.value);
  await resetLevelAfterTreasurePrep(levelDef);
  await nextTick();
  if (isE2eMode()) {
    gridIntroDone.value = true;
    gridRefillAnimating.value = false;
    for (let i = 0; i < ROWS * COLS; i++) {
      const el = gridTileRefs.value[i];
      if (el) gsap.set(el, { x: 0, y: 0, opacity: 1 });
    }
    tryCeruleanBellFlyInAfterGridStable();
    updateSlotPositions(true);
  } else {
    await runGridIntroAfterReset();
  }
});
onUnmounted(() => {
  disposeE2eHarness?.();
  disposeE2eHarness = null;
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

.header-box-level-title--clickable {
  cursor: pointer;
  transition: filter 0.1s ease;
}

.header-box-level-title--clickable:hover {
  filter: brightness(1.04);
}

.header-box-level-title--clickable:active {
  filter: brightness(0.96);
}

.header-box-level-title--clickable:focus-visible {
  outline: calc(2 * var(--rpx)) solid #edc22e;
  outline-offset: calc(2 * var(--rpx));
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
.deck-layer-inner--enter-boot :deep(.deck-layer-enter-stagger) {
  opacity: 0;
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
.deck-stack-pile-cell--dimmed {
  opacity: 0.42;
}
.deck-expand-tile-hit--dimmed {
  opacity: 0.42;
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
