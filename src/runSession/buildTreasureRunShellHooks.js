import { handleRunEndDiscoverySelect as handleRunEndDiscoverySelectPreview } from "../game/runEndDiscoveryPreview.js";
import { runGridTileIgniteAtCell, resolveWordSlotShrinkPopEl } from "../game/gridTileIgniteFx.js";
import { findWordSlotIndexForGridCell } from "../game/fireworkIgniteTargets.js";
import { runWordSlotCopyFxAtIndex } from "../game/wordSlotCopyFx.js";
import { clampRemainingWordsForBossMechanics, isLengthObservatoryBoosted } from "../vouchers/voucherRuntime.js";
import { noteTreasureRunUpgradeUsed } from "../treasures/treasureRunTracking.js";
import { ownedTreasureHasNoSellAccessory } from "../game/runDifficultyRuntime.js";

/**
 * `useTreasureRunController` 壳层 hooks（GamePanel 专有编排）。
 * @param {Record<string, unknown>} d
 */
export function buildTreasureRunShellHooks(d) {
  return {
    getCandidateWordsByLength: d.getCandidateWordsByLength,
    ownedTreasureHookFxBridge: d.ownedTreasureHookFxBridge,
    scheduleAfterGridTilesSettled: d.scheduleAfterGridTilesSettled,
    buildLevelResetRunOpts: d.buildLevelResetRunOpts,
    resetLevel: d.resetLevel,
    syncPlayerMarkBatchCounterFromGrid: d.syncPlayerMarkBatchCounterFromGrid,
    resolveBossSlugForMechanics: d.resolveBossSlugForMechanics,
    bossMechanicsSuppressed: d.bossMechanicsSuppressed,
    isBossLevelEnterRestrictionSlug: d.isBossLevelEnterRestrictionSlug,
    getBossSlugForMechanics: d.getBossSlugForMechanics,
    notifyBossRestrictionTreasures: d.notifyBossRestrictionTreasures,
    addRemainingRemovalsClamped: d.addRemainingRemovalsClamped,
    clearPendingAfterGridTilesSettled: d.clearPendingAfterGridTilesSettled,
    triggerTreasureBarCompactAnim: d.triggerTreasureBarCompactAnim,
    openRunEndDiscoveryTreasurePreview(item, originRect, nav) {
      handleRunEndDiscoverySelectPreview({
        runDiscoveryLog: d.getRunDiscoveryLog(),
        payload: { item, originRect },
        presentTreasureDetail: (args) => {
          d.clearTileDetailLayer();
          d.presentTreasureDetail({ ...args, previewNav: nav });
        },
        openTileDetail: d.openTileDetail,
      });
    },
    buildTreasureLevelEnterEffectContextExtras(levelId) {
      void levelId;
      return {
        destroyTreasureSlotById: d.destroyOwnedTreasureWithFx,
        destroyOtherTreasureFromSource: d.destroyOtherOwnedTreasureFromSourceFx,
        clearTreasureSlotById: d.clearOwnedTreasureSlotById,
        grantRandomOwnedTreasure: d.grantRandomOwnedTreasuresInRun,
        grantRandomOwnedTreasureWithPopAnim: d.grantRandomOwnedTreasuresInRunWithPopAnim,
        requestInRunSpellGrant: async (opts = {}) => {
          const spellId = opts.spellId ?? d.pickRandomInRunSpellIdForRun();
          if (!spellId) return;
          let slotIx = opts.treasureSlotIndex;
          if (slotIx == null && opts.treasureId) slotIx = d.findOwnedTreasureSlotIndex(opts.treasureId);
          await d.runInRunSpellGrant(spellId, { treasureSlotIndex: slotIx });
        },
        addRemainingWords: (n) => {
          const next = d.getRemainingWords() + Math.floor(Number(n) || 0);
          d.setRemainingWords(
            clampRemainingWordsForBossMechanics(next, d.getBossSlugForMechanics()),
          );
        },
        isOwnedTreasureSlotNoSell: (slotIndex) =>
          ownedTreasureHasNoSellAccessory(d.getOwnedTreasureSlot(slotIndex)),
        addRemainingRemovals: d.addRemainingRemovalsClamped,
      };
    },
    buildTreasureLevelCompleteContextExtras() {
      return {
        destroyTreasureSlotById: d.destroyOwnedTreasureWithFx,
        destroyBombBlastAtSlot: d.destroyBombBlastAtSlot,
        playVolcanoEruptionAtSlot: d.playVolcanoEruptionAtSlot,
        playOwnedTreasureMoneyFx: (treasureId, amount, fxOpts = {}) =>
          d.playOwnedTreasureMoneyFx(treasureId, amount, {
            awaitOutro: true,
            ...fxOpts,
          }),
        remainingRemovals: d.getRemainingRemovals(),
        currentScore: d.getCurrentScore(),
        targetScore: d.getTargetScore(),
        fullDeck: d.getInitialDeckSnapshot(),
        ownedTreasureInstances: d.getOwnedTreasures(),
        addMoney: (n) => {
          d.addMoney(Math.max(0, Math.floor(Number(n) || 0)));
        },
        bumpOwnedTreasureSellRefundBonusById: (treasureId, amount) => {
          const tid = String(treasureId ?? "");
          const add = Math.floor(Number(amount) || 0);
          if (!tid || add <= 0) return;
          const ix = d.findOwnedTreasureSlotIndex(tid);
          if (ix < 0) return;
          const cur = d.getOwnedTreasureSlot(ix);
          if (!cur) return;
          d.setOwnedTreasureSlot(ix, {
            ...cur,
            sellPriceBonus: Math.max(0, Math.floor(Number(cur.sellPriceBonus) || 0) + add),
          });
        },
      };
    },
    buildTreasureSubmitSuccessContextExtras(tiles, resolvedWord, judgedLenTable, scoreBeforeHand) {
      return {
        pickRandomInRunSpellId: () => d.pickRandomInRunSpellIdForRun(),
        requestInRunSpellGrant: async ({ spellId, treasureSlotIndex, treasureId } = {}) => {
          const sid =
            spellId != null && String(spellId).trim()
              ? String(spellId)
              : d.pickRandomInRunSpellIdForRun();
          if (!sid) return;
          let slotIx = treasureSlotIndex;
          if (slotIx == null && treasureId) slotIx = d.findOwnedTreasureSlotIndex(treasureId);
          await d.runInRunSpellGrant(sid, { treasureSlotIndex: slotIx });
        },
        requestInRunPackOpen: async ({ bundle, treasureSlotIndex, treasureId } = {}) => {
          let slotIx = treasureSlotIndex;
          if (slotIx == null && treasureId) slotIx = d.findOwnedTreasureSlotIndex(treasureId);
          await d.runInRunPackPickFlow(bundle ?? null, { treasureSlotIndex: slotIx });
        },
        requestInRunPackOpenOfKind: async ({ kind, treasureSlotIndex, treasureId } = {}) => {
          let slotIx = treasureSlotIndex;
          if (slotIx == null && treasureId) slotIx = d.findOwnedTreasureSlotIndex(treasureId);
          const bundle = d.rollInRunBundlePackOfKind(kind, d.buildRollInRunBundlePackCtx());
          if (!bundle) return;
          await d.runInRunPackPickFlow(bundle, { treasureSlotIndex: slotIx });
        },
        getWordDefinition: d.getWordDefinition,
        requestInRunUpgrade: async ({ offer, treasureSlotIndex, treasureId } = {}) => {
          const row = offer;
          if (!row || row.offerType !== "upgrade") return;
          let slotIx = treasureSlotIndex;
          if (slotIx == null && treasureId) slotIx = d.findOwnedTreasureSlotIndex(treasureId);
          if (typeof slotIx === "number" && slotIx >= 0) {
            d.setShopOverlayLayersSuppressed(true);
            await d.nextTick();
            await d.wobbleGameTreasureSlot(slotIx);
            d.setShopOverlayLayersSuppressed(false);
          }
          const payload = d.buildUpgradeAnimPayloadFromOffer(row);
          await d.runInRunUpgradePlaybackSteps([
            {
              payload,
              apply: () => d.applyUpgradeFromOffer(row, { price: 0 }),
            },
          ]);
        },
        resolveSubmitTileAtIndex: (index, scoringTile) =>
          d.resolveRealSubmitTileForWordSlot(index, scoringTile),
        touchGrid: d.touchGrid,
        mutateRandomNonWildcardLetterTileToWildcard: d.mutateRandomNonWildcardLetterTileToWildcard,
        rollRandomBigram: d.rollRandomBigramForTreasure,
        targetScore: d.getTargetScore(),
        currentScore: scoreBeforeHand,
        remainingWordsAfterSubmit: d.getRemainingWords(),
        submittedLetters: tiles.map((t) => ({
          letter: t?.letter ?? "",
          rarity: t?.rarity ?? "common",
          materialId: t?.materialId ?? null,
        })),
        addRemainingWords: (n) => {
          const next = d.getRemainingWords() + Math.max(0, Math.floor(Number(n) || 0));
          d.setRemainingWords(
            clampRemainingWordsForBossMechanics(next, d.getBossSlugForMechanics()),
          );
        },
        addMoney: (n) => {
          d.addMoney(Math.max(0, Math.floor(Number(n) || 0)));
        },
        playOwnedTreasureMoneyFx: d.playOwnedTreasureMoneyFx,
        playOwnedTreasureWobbleOnlyFx: d.playOwnedTreasureWobbleOnlyFx,
        destroyTreasureSlotById: d.destroyOwnedTreasureWithFx,
        playSubmitWordLetterRemoveAndRewardLeave: d.playSubmitWordLetterRemoveAndRewardLeave,
        playSubmitTileEnhancementStripLeave: d.playSubmitTileEnhancementStripLeave,
        removeDeckCardsForSubmittedWord: (word) =>
          d.removeDeckCardsForSubmittedWordAndNotify(tiles, word),
        runSingleInRunLengthUpgradeFx: async (len) => {
          const step = d.buildInRunLengthUpgradeStep(len);
          await d.runInRunUpgradePlaybackSteps([step]);
        },
        bumpWordLengthLevel: (len) => {
          noteTreasureRunUpgradeUsed(d.getTreasureRunState());
          d.noteCollectionUpgradeForWordLen(len);
          d.bumpWordLengthLevel(len, {
            observatoryBoost: isLengthObservatoryBoosted(
              d.getOwnedVoucherIds(),
              len,
              d.getSpellCountsByLength(),
            ),
          });
        },
        resolvedWord,
        judgedWordLength: judgedLenTable,
        getGrid: () => d.getGrid(),
        getSelectedOrder: () => d.getSelectedOrder(),
        appendDeckCardSpecToRunDeck: (spec) => d.appendDeckCardSpecToRunDeck(spec),
        playGridTileIgniteFxAtCell: async (row, col, onMidApply) => {
          await runGridTileIgniteAtCell(
            {
              getGridTileEl: (r, c) => d.getGridTileElAtRowCol?.(r, c),
              getWordSlotShrinkPopElForGridCell: (r, c) => {
                const ix = findWordSlotIndexForGridCell(d.getSelectedOrder?.() ?? [], r, c);
                if (ix < 0) return null;
                return resolveWordSlotShrinkPopEl(d.getWordSlotElAtIndex?.(ix) ?? null);
              },
              touchGrid: d.touchGrid,
              showScoreBubble: d.showScoreBubble,
              scheduleSmallPlusBubbleOutro: d.scheduleSmallPlusBubbleOutro,
            },
            row,
            col,
            onMidApply,
          );
        },
        playWordSlotCopyFxAtIndex: async (slotIndex) => {
          await runWordSlotCopyFxAtIndex(
            {
              getWordSlotEl: (i) => d.getWordSlotElAtIndex?.(i) ?? null,
              awaitTreasureSlotWobbleEl: (el, sp) => d.awaitTreasureSlotWobbleElForSubmit?.(el, sp),
              showScoreBubble: d.showScoreBubble,
              scheduleSmallPlusBubbleOutro: d.scheduleSmallPlusBubbleOutro,
            },
            slotIndex,
          );
        },
      };
    },
    playOwnedTreasureMoneyFx: d.playOwnedTreasureMoneyFx,
  };
}
