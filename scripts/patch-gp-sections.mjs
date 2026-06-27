import fs from "fs";

const gpPath = "src/components/GamePanel.vue";
let gp = fs.readFileSync(gpPath, "utf8");
const newBlock = fs.readFileSync("scripts/_assembly-sections-block.txt", "utf8");

const start = gp.indexOf("const { ports: gamePanelPorts } = setupGamePanelAssembly({");
const end = gp.indexOf("const panelAssembly = useGamePanelSessionAssembly", start);
if (start < 0 || end < 0) {
  console.error("assembly block not found", start, end);
  process.exit(1);
}
gp = gp.slice(0, start) + newBlock.trimEnd() + "\n\n" + gp.slice(end);

if (!gp.includes("createGamePanelBootstrapSource")) {
  gp = gp.replace(
    'import { setupGamePanelAssembly } from "../runSession/setupGamePanelAssembly.js";',
    'import { setupGamePanelAssembly } from "../runSession/setupGamePanelAssembly.js";\nimport { createGamePanelBootstrapSource } from "../runSession/createGamePanelBootstrapSource.js";',
  );
}

const bootStart = gp.indexOf("function buildGamePanelBootstrapSource() {");
const bootEnd = gp.indexOf("const panelBootstrap = useRunPanelBootstrap", bootStart);
if (bootStart >= 0 && bootEnd > bootStart) {
  const bootReplace = `function buildGamePanelBootstrapSource() {
  return createGamePanelBootstrapSource({
    shopPhase,
    runSaveBridge,
    ownedSlotTreasureIdList,
    treasureRunState,
    syncShopUpgradesFreeFromOwnedTreasures,
    syncPlayerMarkBatchCounterFromGrid,
    rollRandomBigramForTreasure,
    registerMaskBubbleDevConsoleHook,
    setSlotRafLastTime: (t) => {
      slotRafLastTime = t;
    },
    ensureSlotRafRunning,
    nextTick,
    setGridIntroDone: (v) => {
      gridIntroDone.value = v;
    },
    setGridRefillAnimating: (v) => {
      gridRefillAnimating.value = v;
    },
    getGridCellCount: () => ROWS * COLS,
    getGridTileEl: (i) => gridTileRefs.value[i],
    updateSlotPositions,
    getShowShop: () => showShop.value,
    scheduleRunAutoSave,
    flushAchievementUnlocks,
    setRunPresetId: (v) => {
      runPresetId.value = v;
    },
    getRunPresetIdProp: () => props.runPresetId,
    setRunDifficultyIndex: (v) => {
      runDifficultyIndex.value = v;
    },
    getRunDifficultyIndexForNewRun: () => props.restoredSave?.runDifficultyIndex,
    getRunDifficultyIndexProp: () => props.runDifficultyIndex,
    applyRunPresetStartEffects,
    isMaskBubbleDevScenarioActive: () => maskBubbleDevScenarioActive.value,
    applyMaskBubbleOwnedTreasures: () => devCommandsRef.current?.applyMaskBubbleDevRunStart(),
    isPagerDevScenarioActive: () => pagerDevScenarioActive.value,
    applyPagerOwnedTreasure: () => devCommandsRef.current?.applyPagerDevRunStart(),
    isCeruleanBellDevScenarioActive: () => ceruleanBellDevScenarioActive.value,
    applyCeruleanBellDevRunStart: () => devCommandsRef.current?.applyCeruleanBellDevRunStart(),
    getGamePanelAlive,
    getLevelIndex: () => levelIndex.value,
    resetLevelAfterTreasurePrep,
    runNewRunGridIntro: runGridIntroAfterReset,
  });
}`;
  gp = gp.slice(0, bootStart) + bootReplace + gp.slice(bootEnd + 1);
}

fs.writeFileSync(gpPath, gp);
console.log("patched sections + bootstrap");
