import fs from "fs";

const src = fs.readFileSync("src/runSession/useGamePanelSessionAssembly.js", "utf8");
const fnStart = src.indexOf("export function useGamePanelSessionAssembly");
const fnBody = src.slice(fnStart);

const defined = new Set([
  "input", "ports", "openStageSettlement", "shop", "playfield", "treasures", "runPort", "core", "overlay", "scoring", "uiFx",
  "true", "false", "null", "undefined", "document", "Object", "Math", "Number", "String", "Array", "Promise",
]);

for (const m of fnBody.matchAll(/const\s*\{([^}]+)\}\s*=\s*(\w+)/g)) {
  for (const part of m[1].split(",")) {
    const n = part.trim().split(":")[0].trim();
    if (/^\w+$/.test(n)) defined.add(n);
  }
}
for (const m of fnBody.matchAll(/\b(?:const|let|function|async function)\s+(\w+)/g)) defined.add(m[1]);
for (const m of fnBody.matchAll(/\b(\w+)\s*:/g)) defined.add(m[1]); // object keys false positive ok

const builtins = new Set(["payload", "args", "opts", "tile", "i", "step", "detailed", "tiles", "resolvedWord", "judgedLen", "counts", "score", "word", "length", "rarity", "rarityFilter", "maxCount", "slotIndex", "slot", "ev", "el", "sp", "delta", "amount", "treasureId", "raws", "uid", "options", "outcome", "marked", "ctrl", "detailedRef", "snapshot", "args"]);

const suspects = new Set();
for (const m of fnBody.matchAll(/\b([A-Za-z_][\w]*)\b/g)) {
  const id = m[1];
  if (defined.has(id) || builtins.has(id)) continue;
  if (id.endsWith("Fn") || id.endsWith("Ref") || id.endsWith("Impl")) continue;
  if (/^get[A-Z]|^set[A-Z]|^on[A-Z]|^is[A-Z]|^build[A-Z]|^apply[A-Z]|^run[A-Z]|^play[A-Z]|^open[A-Z]|^clear[A-Z]|^ensure[A-Z]|^schedule[A-Z]|^notify[A-Z]|^flush[A-Z]|^remove[A-Z]|^find[A-Z]|^grant[A-Z]|^handle[A-Z]|^maybe[A-Z]|^note[A-Z]|^record[A-Z]|^update[A-Z]|^init[A-Z]|^dispose[A-Z]|^create[A-Z]|^await[A-Z]|^parse[A-Z]|^evaluate[A-Z]|^pick[A-Z]|^sync[A-Z]|^dismiss[A-Z]|^present[A-Z]|^animate[A-Z]|^fulfill[A-Z]|^should[A-Z]|^can[A-Z]|^list[A-Z]|^resolve[A-Z]|^arm[A-Z]|^bump[A-Z]|^settlement[A-Z]|^tile[A-Z]|^word[A-Z]|^game[A-Z]|^display[A-Z]|^hidden[A-Z]|^owned[A-Z]|^shop[A-Z]|^pack[A-Z]|^spell[A-Z]|^firstWord[A-Z]|^session[A-Z]|^submit[A-Z]|^scoring[A-Z]|^result[A-Z]|^header[A-Z]|^round[A-Z]|^anim[A-Z]|^effective[A-Z]|^resolved[A-Z]|^remaining[A-Z]|^current[A-Z]|^target[A-Z]|^level[A-Z]|^money[A-Z]|^grid[A-Z]|^deck[A-Z]|^boss[A-Z]|^pager[A-Z]|^transition[A-Z]|^dictionary[A-Z]|^dict[A-Z]|^length[A-Z]|^rarity[A-Z]|^wallet[A-Z]|^infoModal[A-Z]|^glyphShop[A-Z]|^pending[A-Z]|^usedWord[A-Z]|^mouthLocked[A-Z]|^clubRequired[A-Z]|^crimson[A-Z]|^verdant[A-Z]|^pillar[A-Z]|^achievement[A-Z]|^runMatch[A-Z]|^runDiscovery[A-Z]|^runEnd[A-Z]|^runPreset[A-Z]|^runDifficulty[A-Z]|^runRandom[A-Z]|^runRng[A-Z]|^runWallet[A-Z]|^runWord[A-Z]|^runPending[A-Z]|^runHourglass[A-Z]|^runTreasure[A-Z]|^runDetached[A-Z]|^runInRun[A-Z]|^runLength[A-Z]|^runClear[A-Z]|^runSubmitted[A-Z]|^runSave[A-Z]|^runGrid[A-Z]|^runLifecycle|^runAutoSave|^runEndCtrl|^runSpell|^runPager|^runSlot|^runHeader|^runResult|^runOverlay|^runEndFlow|^runEndEnter|^runEndOutcome|^runEndPortal|^runSaveBridge|^playfieldBridge|^playfieldController|^playfieldSubmit|^wordSlotPresentation|^firstWordTutorial|^packPickController|^packPickSession|^spellCastController|^submitController|^discardController|^gridDropAnim|^sessionRunState|^submitUpgradeFxRegistrarState|^submitWord|^treasureSession|^shopPhase|^shopSpellRuntimeBridge|^overlayStackController|^phaseStore|^props|^emit|^session|^COLS|^ROWS|^SHOW_SUBMIT_TRANSLATION|^treasureDetail|^spellReferencePreview|^spellTargetSession|^pendingSpellTileAppearanceAnim|^treasureInventoryCtrl|^tileDetailCtrl|^wordDefinitionCtrl|^runResultPresentationCtrl|^bossMechanicsCtrl|^shopTransactionCtrl|^deckPreview|^treasureRunState|^ownedTreasures|^selectedOrder|^selectedTiles|^gridTileRefs|^letterGridRef|^letterGridWrapRef|^wordSlotRefs|^wordSlotsWrapRef|^wordSlotsScaleRootRef|^submitBtnRef|^submitBookmarkRef|^deckBtnRef|^shopPanelRef|^runOverlayHostRef|^gamePanelPlayfieldRef|^firstWordTutorialLayerRef|^runEndFlowHostRef|^shopOffers|^packOffers|^shopVoucherShelf|^shopVoucherBonusShelf|^shopRerollsThisVisit|^shopVoucherShelfGeneration|^injectedWordSlotPresentation|^getPlayfieldFlySnapshotFromBridge|^updateSlotPositionsViaBridge|^onPlayfieldCeruleanBellNewGridLock|^scheduleRunAutoSave|^scheduleTutorialSpotlightUpdate|^maybeEndShopTutorialOnOfferOpen|^maybeEndShopTutorialOnTreasurePurchase|^onShopOpenedAfterEnter|^startFirstWordTutorialDevTest|^disposeFirstWordTutorial|^isShopTutorialBlockedShopInteraction|^ensurePackPickOverlayVisibleFn|^shouldRestorePackPickOverlayAfterSpellConfirmFn|^openShopPackSessionFn|^onPackPickSkipFn|^onPackInnerClaimFn|^fulfillPackInnerPurchaseFn|^packPickOptionKeyOfFn|^packPickRequiredPicksFn|^runInRunPackPickFlowFn|^mountGamePanelSessionNamespaces|^openStageSettlement|^setSettlementSnapshot|^setDeferredWordSubmitPayload|^clearDeferredWordSubmitPayload|^clearPagerQuizPendingResolve|^clearRunEndOverlays|^openTreasureCollectionLayer|^openInfoModalLevel|^openInfoModalStage|^openDeckLayer|^dismissTreasureDetailOnBack|^ownedSlotTreasureIdList|^presentTreasureDetail|^openTileDetail|^tileDetailPayload|^tileDetailPreviewNav|^getGamePanelAlive|^getBossTileDebuffContext|^bossSlugForMechanics|^getWordDefinition|^buildSubmitAfterLettersContext|^flushDeferredWordSubmitRecord|^flushSubmitAchievements|^flushAchievementUnlocks|^buildEffectiveWordPartsForSubmit|^resolveWordFromEffectiveParts|^listEffectiveTilesForSubmit|^applySubmitRefill|^applyHookBossAfterSubmit|^playBossTapeTriggerCue|^notifyBossRestrictionTreasures|^touchGrid|^removeFromSlot|^selectTile|^exportDeckState|^hydrateDeckState|^mergeCareerOnRunEnd|^triggerHaptic|^showToast|^bumpOverlayZ|^formatNum|^coerceRunSeedNumeric|^handleRunEndDiscoverySelectPreview|^requestCloudSync|^clearSlotRunProgress|^nextTick|^computed|^provide|^gsap|^gsapLib|^sleep|^pagerQuizPendingResolve|^deferredWordSubmitPayloadBox|^value/.test(id)) continue;
  suspects.add(id);
}

console.log([...suspects].sort().join("\n"));
