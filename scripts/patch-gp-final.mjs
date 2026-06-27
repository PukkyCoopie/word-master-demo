import fs from "fs";

const gpPath = "src/components/GamePanel.vue";
let gp = fs.readFileSync(gpPath, "utf8");

const keys = [...fs
  .readFileSync("src/runSession/buildGamePanelAssemblySectionsInput.js", "utf8")
  .matchAll(/d\.(\w+)/g)].map((m) => m[1]);
const uniq = [...new Set(keys)];

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

const compactLines = chunk(uniq, 12).map((line) => "  " + line.join(", ") + ",").join("\n");
const compactBlock = `const gamePanelAssemblyDeps = {\n${compactLines}\n};\n\nconst { ports: gamePanelPorts } = setupGamePanelAssembly(\n  buildGamePanelAssemblySectionsInput(gamePanelAssemblyDeps),\n);`;

const asmStart = gp.indexOf("const { ports: gamePanelPorts } = setupGamePanelAssembly({");
const asmEnd = gp.indexOf("const panelAssembly = useGamePanelSessionAssembly", asmStart);
if (asmStart < 0 || asmEnd < 0) {
  console.error("assembly block not found");
  process.exit(1);
}
gp = gp.slice(0, asmStart) + compactBlock + "\n\n" + gp.slice(asmEnd);

// Replace wireAllGamePanelFx block
const fxStart = gp.indexOf("wireAllGamePanelFx({");
const fxEnd = gp.indexOf("/** @type {() => Promise<void>} settlement flow", fxStart);
if (fxStart >= 0 && fxEnd > fxStart) {
  gp =
    gp.slice(0, fxStart) +
    "wireGamePanelFxFromDeps({\n  ownedBarFxRef, nextTick, findOwnedTreasureSlotIndex, findAllOwnedTreasureSlotIndices,\n  treasureInventoryCtrl, shopOverlayLayersSuppressed, scoringTreasureBarIndex, money,\n  wobbleGameTreasureSlot, wobbleScoreSlot, showScoreBubble, scheduleSmallPlusBubbleOutro,\n  formatMoneyBubbleLabel, bumpOverlayZ, scoringLetterGapMs: SCORING_LETTER_GAP_MS,\n  treasureDestroyFxRef, ownedTreasureHasNoSellAccessory, treasureBypassesNoSellForSelfDestruct,\n  isTreasureBarSlotVisible, ownedTreasures, removeAndCompactOwnedTreasureAtIndex, scheduleRunAutoSave,\n  createWobbleScoreSlotTimeline, awaitWobbleScoreSlotTimeline, playOwnedTreasureWobbleOnlyFx,\n  hourglassStageFxRef, inRunUpgradePlaybackRef, runResultPresentationCtrl, sleep,\n  submitTileLeaveFxRef, treasureRunState, getSelectedGridTileElsInOrder, wordSlotRefs, runRandom,\n  isBossTileDebuffed, removeDeckCardByUidAndNotify, ownedSlotTreasureIdList, ownedTreasureHookFxBridge,\n  playTreasureSlotBubbleBurstAtPeak, playOwnedTreasureMoneyFx, triggerHaptic, touchGrid,\n  awaitTreasureSlotWobbleElForSubmit, runDetachedTileShrinkReplacePop,\n});\n\n" +
    gp.slice(fxEnd);
}

// Replace post-assembly through dev commands
const postStart = gp.indexOf("const {\n  firstWordTutorialCtrl,");
const postEnd = gp.indexOf("function maybeReportTapTapBestSingleWordScore", postStart);
if (postStart >= 0 && postEnd > postStart) {
  const postBlock = `const postAssemblySlots = {
  packPickController, packPickSession, packPickBusy, packPickSkipBusy, packPickOverlaySuppressed,
  packPickOptionKeyOf, packPickRequiredPicks, runInRunPackPickFlow, onPackPickSkip, onPackInnerClaim,
  fulfillPackInnerPurchase, ensurePackPickOverlayVisible, shouldRestorePackPickOverlayAfterSpellConfirm,
  openShopPackSession, runEndCtrlSlot, spellGrantDetailCloseHandler, queueOrRunSpellTileAppearanceAnim,
  runSpellPreviewChain, runSpellPreviewChainAfterDetailClose, runInRunSpellGrant, onSpellTargetConfirm,
  onSpellTargetCancel,
};

wireGamePanelPostAssembly({
  panelAssembly,
  firstWordTutorialCtrlSlot,
  firstWordTutorialActive,
  shopSpellRuntimeBridge,
  shopTransactionCtrl,
  playfieldActionsRef,
  devCommandsRef,
  slots: postAssemblySlots,
  devCommandsOptions: buildGamePanelDevCommandsOptions({
    maskBubbleDevScenarioActive, allIceDevScenarioActive, ceruleanBellDevScenarioActive,
    pagerDevScenarioActive, promoScreenshotDevPresetActive, ownedTreasures, transitionBusy,
    showShop, showSettlement, showRunEnd, showPauseOptions, showDeveloperOptions, levelIndex,
    pendingBossSlugOverride, gridIntroDone, gridRefillAnimating, gridTileRefs, glyphShopSkipLevelAdvance,
    runDifficultyIndex, money, shopOverlayLayersSuppressed, packPickOverlaySuppressed, packPickSession,
    debugScoreCardTargetOverride, debugScoreCardRoundOverride, dictionaryReady, ROWS, COLS,
    buildOwnedTreasureSlot, currentLevel, getRunLevelAtIndex, getRunLevelIndexForId,
    resetLevelAfterTreasurePrep, runPendingAfterGridTilesSettled, runGridIntroAfterReset,
    playLevelAdvanceHeaderFx, touchGrid, updateSlotPositions, scheduleRunAutoSave, nextTick, runRandom,
    shopPhase, loadDictionary, getGamePanelAlive: () => gamePanelAlive, isWildcardMaterialTile,
    getCandidateWordsByLength, resolveWordPattern, rarityLevelsByRarity, buildBossWildcardResolveContext,
    grantRandomOwnedTreasuresInRunWithPopAnim, tryCeruleanBellMarkAfterGridStable, grid,
  }),
});

({
  packPickController, packPickSession, packPickBusy, packPickSkipBusy, packPickOverlaySuppressed,
  packPickOptionKeyOf, packPickRequiredPicks, runInRunPackPickFlow, onPackPickSkip, onPackInnerClaim,
  fulfillPackInnerPurchase, ensurePackPickOverlayVisible, shouldRestorePackPickOverlayAfterSpellConfirm,
  openShopPackSession, runEndCtrlSlot, spellGrantDetailCloseHandler, queueOrRunSpellTileAppearanceAnim,
  runSpellPreviewChain, runSpellPreviewChainAfterDetailClose, runInRunSpellGrant, onSpellTargetConfirm,
  onSpellTargetCancel,
} = postAssemblySlots);

const {
  firstWordTutorialCtrl,
  firstWordTutorialPhase,
  firstWordTutorialBlocking,
  maybeEndShopTutorialOnTreasurePurchase,
  onShopOpenedAfterEnter,
  startFirstWordTutorialDevTest,
  disposeFirstWordTutorial,
  playfieldController,
  discardController,
  spellCastController,
  runSaveBridge,
  runEndCtrl,
} = panelAssembly;

`;
  gp = gp.slice(0, postStart) + postBlock + gp.slice(postEnd);
}

// Replace settlement block
const setStart = gp.indexOf("const runAutoSave = {");
const setEnd = gp.indexOf("function buildDevGrantTreasureDeps", setStart);
if (setStart >= 0 && setEnd > setStart) {
  const setBlock = `let runAutoSave;
let scheduleRunAutoSave;
const {
  stageSettlementFlow,
  openStageSettlement,
  onSettlementContinue,
  enterEndlessModeAfterWin: enterStageSettlementEndlessFlow,
} = wireGamePanelSettlement({
  runSaveBridge,
  money,
  stageRewardYuan,
  remainingWords,
  remainingRemovals,
  ownedTreasures,
  runPresetId,
  ownedVoucherIds,
  showSettlement,
  disableSettlementLayerAnim,
  settlementSnapshot,
  settlementPortalZ,
  bumpOverlayZ,
  scheduleOverlayPresent,
  scheduleOverlayDismiss,
  showDeckLayer,
  showPauseOptions,
  tileDetailCtrl,
  transitionBusy,
  showShop,
  resetDeckAfterStageEnd,
  playWalletHeaderGainAnim,
  shopPanelRef,
  flushAchievementUnlocks,
  recordAchievementRunInterest,
  achievementRunState,
  irisTransition,
  runHourglassStageEndFx,
  runTreasureLevelCompleteHooks,
  recordPointerClientFromEvent,
  triggerHaptic,
  nextTick,
  settlementLayerRef,
  mountGamePanelSessionNamespaces,
  pauseOverlaySession,
  session,
});
runAutoSave = wireGamePanelSettlement.runAutoSave;
`;
  // Fix - wireGamePanelSettlement returns object, need assignment pattern
}

fs.writeFileSync(gpPath, gp);
console.log("partial patch - manual settlement/platform needed");
