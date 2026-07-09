import gsap from "gsap";
import { normalizeRunSavePhase } from "../save/runSaveSchema.js";
import { normalizeRunPresetId } from "../game/runPresetDefinitions.js";
import { getRunLevelAtIndex } from "../levelDefinitions.js";
import { normalizeRunDifficultyIndex } from "../game/runDifficultyDefinitions.js";
import { ensureBigramTargetPair } from "../game/treasureBigramRoll.js";
import { resolveSavedIsEndlessRun } from "../save/runSaveEndless.js";

/**
 * 读档 / 新局启动（从 GamePanel 迁出）。
 * @param {Record<string, unknown>} deps
 * @param {object} restored
 */
export async function startGamePanelFromRestoredSave(deps, restored) {
  deps.setSuppressShopEnterVisitInit(normalizeRunSavePhase(restored.phase) === "shop");
  await deps.hydrateFromPayload(restored);
  deps.syncOwnedTreasureSlots?.();
  deps.syncShopUpgradesFreeFromOwnedTreasures();
  deps.syncPlayerMarkBatchCounterFromGrid();
  ensureBigramTargetPair(deps.getTreasureRunState(), deps.rollRandomBigramForTreasure);
  deps.registerMaskBubbleDevConsoleHook();
  deps.setSlotRafLastTime(performance.now());
  deps.ensureSlotRafRunning();
  await deps.nextTick();
  deps.setGridIntroDone(true);
  deps.setGridRefillAnimating(false);
  for (let i = 0; i < deps.getGridCellCount(); i++) {
    const el = deps.getGridTileEl(i);
    if (el) gsap.set(el, { x: 0, y: 0, opacity: 1 });
  }
  deps.updateSlotPositions(true);
  if (deps.tryCeruleanBellFlyInAfterGridStable) {
    await deps.nextTick();
    await deps.tryCeruleanBellFlyInAfterGridStable();
    deps.updateSlotPositions(true);
  }
  if (deps.getShowShop() && deps.shopVisitStockMissingFromSave()) {
    deps.refreshShopVoucherShelfForCurrentVisit();
    deps.applyShopVisitStockRoll();
  }
  if (resolveSavedIsEndlessRun(restored)) {
    const levelId = getRunLevelAtIndex(
      Math.max(0, Math.floor(Number(restored.levelIndex) || 0)),
    ).id;
    deps.syncEndlessLeaderboardChapterBaseline?.(levelId);
  }
  deps.scheduleRunAutoSave();
  deps.flushAchievementUnlocks();
}

/** @param {Record<string, unknown>} deps */
export async function startGamePanelNewRun(deps) {
  ensureBigramTargetPair(deps.getTreasureRunState(), deps.rollRandomBigramForTreasure);
  deps.setRunPresetId(normalizeRunPresetId(deps.getRunPresetIdProp()));
  deps.setRunDifficultyIndex(
    normalizeRunDifficultyIndex(
      deps.getRunDifficultyIndexForNewRun?.() ?? deps.getRunDifficultyIndexProp(),
    ),
  );
  deps.applyRunPresetStartEffects();
  if (deps.isMaskBubbleDevScenarioActive()) {
    deps.applyMaskBubbleOwnedTreasures();
  }
  if (deps.isPagerDevScenarioActive()) {
    deps.applyPagerOwnedTreasure();
  }
  if (deps.isEctoplasmDevScenarioActive()) {
    deps.applyEctoplasmDevOwnedTreasures();
  }
  if (deps.isMouthQuProblemDevScenarioActive()) {
    deps.applyMouthQuProblemOwnedTreasures();
  }
  if (deps.isMouthTiaTeaDevScenarioActive()) {
    deps.applyMouthTiaTeaOwnedTreasures();
  }
  if (deps.isCeruleanBellDevScenarioActive()) {
    deps.applyCeruleanBellDevRunStart();
  }
  if (deps.isNoSellGoldBombCometDevScenarioActive()) {
    deps.applyNoSellGoldBombCometOwnedTreasures();
  }
  if (deps.isSettlementSkipStressDevScenarioActive()) {
    deps.applySettlementSkipStressOwnedTreasures();
    deps.applySettlementSkipStressRunState();
  }
  deps.registerMaskBubbleDevConsoleHook();
  deps.setSlotRafLastTime(performance.now());
  deps.ensureSlotRafRunning();
  if (!deps.getGamePanelAlive()) return;
  const levelDef = getRunLevelAtIndex(deps.getLevelIndex());
  await deps.resetLevelAfterTreasurePrep(levelDef);
  await deps.nextTick();
  await deps.runNewRunGridIntro();
  deps.scheduleRunAutoSave();
  deps.flushAchievementUnlocks();
}
