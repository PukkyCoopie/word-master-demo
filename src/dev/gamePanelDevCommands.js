import gsap from "gsap";
import { applyRandomMaterialsToGridTilesWithoutMaterial } from "./randomizeGridTileMaterials.js";
import {
  applyMaskBubbleOwnedTreasures,
} from "./maskBubbleBlueprintScenario.js";
import {
  CERULEAN_BELL_BOSS_SLUG,
  CHAPTER_1_BOSS_LEVEL_INDEX,
} from "./ceruleanBellDevScenario.js";
import { applyPagerOwnedTreasure } from "./pagerDevScenario.js";
import {
  applyMouthQuProblemOwnedTreasures,
  applyProblemQuRowToGrid,
} from "./mouthQuProblemDevScenario.js";
import { applyEctoplasmDevOwnedTreasures } from "./ectoplasmDevScenario.js";
import {
  applyPromoGameplayOwnedTreasures,
  buildPromoSuperPackPickSession,
  logLongestValidWordsOnGrid,
  normalizeScreenshotPresetId,
} from "./screenshotPresetScenario.js";
import { STANDARD_RUN_FINAL_LEVEL_INDEX } from "../levelDefinitions.js";
import {
  isValidDevBossJumpSlug,
  resolveDevBossShopJumpTarget,
} from "./devBossShopJump.js";

/**
 * GamePanel 开发命令（控制台 / 预设场景）。
 * @param {{
 *   refs: {
 *     maskBubbleDevScenarioActive: import('vue').Ref<boolean>,
 *     allIceDevScenarioActive: import('vue').Ref<boolean>,
 *     ceruleanBellDevScenarioActive: import('vue').Ref<boolean>,
 *     pagerDevScenarioActive: import('vue').Ref<boolean>,
 *     promoScreenshotDevPresetActive: import('vue').Ref<number>,
 *     ownedTreasures: import('vue').Ref<(object | null)[]>,
 *     transitionBusy: import('vue').Ref<boolean>,
 *     showShop: import('vue').Ref<boolean>,
 *     showSettlement: import('vue').Ref<boolean>,
 *     showRunEnd: import('vue').Ref<boolean>,
 *     showPauseOptions: import('vue').Ref<boolean>,
 *     showDeveloperOptions: import('vue').Ref<boolean>,
 *     levelIndex: import('vue').Ref<number>,
 *     pendingBossSlugOverride: import('vue').Ref<string>,
 *     gridIntroDone: import('vue').Ref<boolean>,
 *     gridRefillAnimating: import('vue').Ref<boolean>,
 *     gridTileRefs: import('vue').Ref<(HTMLElement | null | undefined)[]>,
 *     glyphShopSkipLevelAdvance: import('vue').Ref<boolean>,
 *     runDifficultyIndex: import('vue').Ref<number>,
 *     money: import('vue').Ref<number>,
 *     shopOverlayLayersSuppressed: import('vue').Ref<boolean>,
 *     packPickOverlaySuppressed: import('vue').Ref<boolean>,
 *     packPickSession: import('vue').Ref<object | null>,
 *     debugScoreCardTargetOverride: import('vue').Ref<number | null>,
 *     debugScoreCardRoundOverride: import('vue').Ref<number | null>,
 *     dictionaryReady: import('vue').Ref<boolean>,
 *   },
 *   ROWS: number,
 *   COLS: number,
 *   buildOwnedTreasureSlot: (...args: unknown[]) => object,
 *   getCurrentLevel: () => object | null | undefined,
 *   getRunLevelAtIndex: (index: number) => object,
 *   getRunLevelIndexForId: (id: string) => number | null | undefined,
 *   resetLevelAfterTreasurePrep: (levelDef: object, opts?: object) => Promise<void>,
 *   resetDeckAfterStageEnd?: () => void,
 *   runPendingAfterGridTilesSettled: () => Promise<void>,
 *   runGridIntroAfterReset: () => Promise<unknown>,
 *   playLevelAdvanceHeaderFx: () => Promise<unknown>,
 *   touchGrid: () => void,
 *   updateSlotPositions: (force?: boolean) => void,
 *   scheduleRunAutoSave: () => void,
 *   nextTick: typeof import('vue').nextTick,
 *   runRandom: () => number,
 *   shopTreasurePool: import('vue').Ref<unknown[]>,
 *   loadDictionary: (opts?: object) => Promise<void>,
 *   getGamePanelAlive: () => boolean,
 *   isWildcardMaterialTile: (tile: object) => boolean,
 *   getCandidateWordsByLength: (...args: unknown[]) => unknown,
 *   resolveWordPattern: (...args: unknown[]) => unknown,
 *   rarityLevelsByRarity: import('vue').Ref<Record<string, number>>,
 *   buildBossWildcardResolveContext: () => object | null,
 *   nextOfferInstanceId: import('vue').Ref<number>,
 *   grantRandomOwnedTreasuresInRunWithPopAnim: (count?: number, opts?: object) => Promise<number>,
 *   tryCeruleanBellMarkAfterGridStable: () => Promise<void>,
 * }} deps
 */
export function createGamePanelDevCommands(deps) {
  let screenshotPresetDevBusy = false;

  async function finishScreenshotDevGridVisual() {
    await deps.nextTick();
    deps.refs.gridIntroDone.value = true;
    deps.refs.gridRefillAnimating.value = false;
    for (let i = 0; i < deps.ROWS * deps.COLS; i += 1) {
      const el = deps.refs.gridTileRefs.value[i];
      if (el) gsap.set(el, { x: 0, y: 0, opacity: 1 });
    }
    deps.touchGrid();
    deps.updateSlotPositions(true);
    deps.scheduleRunAutoSave();
  }

  async function startMaskBubbleBlueprintDevTest() {
    deps.refs.maskBubbleDevScenarioActive.value = true;
    applyMaskBubbleOwnedTreasures(deps.refs.ownedTreasures, deps.buildOwnedTreasureSlot);
    const levelDef = deps.getCurrentLevel() ?? deps.getRunLevelAtIndex(deps.refs.levelIndex.value);
    await deps.resetLevelAfterTreasurePrep(levelDef);
    await deps.nextTick();
    await finishScreenshotDevGridVisual();
    console.log(
      "[DEV] 面具+泡泡测试局：槽位 [面具][泡泡]，棋盘已随机 2 个 B。拼含 B 的单词观察计分动画。",
    );
  }

  function randomizeGridTileMaterialsDev(grid, runRandom) {
    const result = applyRandomMaterialsToGridTilesWithoutMaterial(
      grid,
      deps.ROWS,
      deps.COLS,
      undefined,
      runRandom,
    );
    deps.touchGrid();
    deps.scheduleRunAutoSave();
    console.log(`[DEV] 已为 ${result.updated} 格无材质 tile 随机添加材质`, result);
    return result;
  }

  async function startAllIceDevTest() {
    deps.refs.allIceDevScenarioActive.value = true;
    const levelDef = deps.getCurrentLevel() ?? deps.getRunLevelAtIndex(deps.refs.levelIndex.value);
    await deps.resetLevelAfterTreasurePrep(levelDef);
    await deps.nextTick();
    await finishScreenshotDevGridVisual();
    console.log("[DEV] 全碎冰测试局：棋盘与字母库牌张均已设为碎冰块。");
  }

  function applyCeruleanBellDevRunStart() {
    deps.refs.levelIndex.value = CHAPTER_1_BOSS_LEVEL_INDEX;
    deps.refs.pendingBossSlugOverride.value = CERULEAN_BELL_BOSS_SLUG;
  }

  async function startPagerDevTest() {
    deps.refs.pagerDevScenarioActive.value = true;
    applyPagerOwnedTreasure(deps.refs.ownedTreasures, deps.buildOwnedTreasureSlot);
    const levelDef = deps.getCurrentLevel() ?? deps.getRunLevelAtIndex(deps.refs.levelIndex.value);
    await deps.resetLevelAfterTreasurePrep(levelDef);
    await deps.nextTick();
    await finishScreenshotDevGridVisual();
    console.log("[DEV] 寻呼机测试局：槽位 1 已装备寻呼机。提交单词触发翻译测验。");
  }

  async function startMouthQuProblemDevTest() {
    deps.refs.mouthQuProblemDevScenarioActive.value = true;
    applyMouthQuProblemOwnedTreasures(deps.refs.ownedTreasures, deps.buildOwnedTreasureSlot);
    const levelDef = deps.getCurrentLevel() ?? deps.getRunLevelAtIndex(deps.refs.levelIndex.value);
    await deps.resetLevelAfterTreasurePrep(levelDef);
    await deps.nextTick();
    if (typeof deps.getGrid === "function") {
      applyProblemQuRowToGrid(deps.getGrid(), deps.ROWS, deps.COLS);
      deps.touchGrid?.();
    }
    await finishScreenshotDevGridVisual();
    console.log(
      "[DEV] Qu+嘴+试管测试：设置 Qu 模式，槽位 [嘴][试管]，首行 problem（Qu→p）。按顺序选格拼词后应解析为 problem。",
    );
  }

  async function startEctoplasmDevTest() {
    deps.refs.ectoplasmDevScenarioActive.value = true;
    const summary = applyEctoplasmDevOwnedTreasures(
      deps.refs.ownedTreasures,
      deps.buildOwnedTreasureSlot,
      deps.runRandom,
    );
    const levelDef = deps.getCurrentLevel() ?? deps.getRunLevelAtIndex(deps.refs.levelIndex.value);
    await deps.resetLevelAfterTreasurePrep(levelDef);
    await deps.nextTick();
    await finishScreenshotDevGridVisual();
    console.log(
      "[DEV] 烛台测试局：已装备 5 个带随机非裁剪配饰的宝藏。",
      summary.treasureIds,
      summary.accessoryIds,
    );
  }

  /**
   * @param {string} bossSlug
   * @param {string} [levelInputRaw]
   * @returns {Promise<{ ok: boolean, message: string, preLevelId?: string, bossLevelId?: string } | null>}
   */
  async function jumpToBossShopDev(bossSlug, levelInputRaw = "") {
    if (deps.refs.transitionBusy.value) {
      return { ok: false, message: "转场进行中，请稍后再试" };
    }
    const slug = String(bossSlug ?? "").trim();
    if (!isValidDevBossJumpSlug(slug)) {
      return { ok: false, message: "无效的 Boss" };
    }
    const target = resolveDevBossShopJumpTarget(levelInputRaw);
    if (!target) {
      return {
        ok: false,
        message: "无效关卡：请填章号（如 2）或关卡 id（如 3-2），留空为第 1 章",
      };
    }

    deps.refs.transitionBusy.value = true;
    try {
      deps.refs.showShop.value = false;
      deps.refs.showSettlement.value = false;
      deps.refs.showRunEnd.value = false;
      deps.refs.showPauseOptions.value = false;
      deps.refs.showDeveloperOptions.value = false;
      await deps.nextTick();

      deps.refs.glyphShopSkipLevelAdvance.value = false;
      deps.refs.levelIndex.value = target.preLevelIndex;
      deps.refs.pendingBossSlugOverride.value = slug;
      deps.resetDeckAfterStageEnd?.();

      await deps.nextTick();
      deps.refs.showShop.value = true;
      await deps.nextTick();

      deps.scheduleRunAutoSave();
      const result = {
        ok: true,
        message: `已进入 ${target.preLevelId} 后商店，离店将进入 ${target.bossLevelId}`,
        preLevelId: target.preLevelId,
        bossLevelId: target.bossLevelId,
        bossSlug: slug,
      };
      console.log(`[DEV] Boss 前商店：${target.preLevelId} → ${target.bossLevelId}（${slug}）`, result);
      return result;
    } finally {
      deps.refs.transitionBusy.value = false;
    }
  }

  async function jumpToLevelDev(levelIdOrIndex, opts = {}) {
    if (deps.refs.transitionBusy.value) {
      console.warn("[DEV] jumpToLevel：转场进行中，请稍后再试");
      return null;
    }
    let idx;
    const raw = levelIdOrIndex;
    if (
      typeof raw === "number" ||
      (typeof raw === "string" && /^\d+$/.test(String(raw).trim()))
    ) {
      idx = Math.max(0, Math.floor(Number(raw)));
    } else {
      const resolved = deps.getRunLevelIndexForId(String(raw));
      if (resolved == null) {
        console.warn(
          `[DEV] jumpToLevel：无效关卡 "${raw}"，请用如 "3-2" 或 levelIndex 数字`,
        );
        return null;
      }
      idx = resolved;
    }

    deps.refs.transitionBusy.value = true;
    try {
      deps.refs.showShop.value = false;
      deps.refs.showSettlement.value = false;
      deps.refs.showRunEnd.value = false;
      deps.refs.showPauseOptions.value = false;
      deps.refs.showDeveloperOptions.value = false;
      await deps.nextTick();
      deps.refs.glyphShopSkipLevelAdvance.value = false;
      deps.refs.levelIndex.value = idx;
      deps.refs.pendingBossSlugOverride.value = opts.bossSlug ? String(opts.bossSlug) : "";
      const levelDef = deps.getRunLevelAtIndex(deps.refs.levelIndex.value);
      deps.refs.gridIntroDone.value = false;
      await deps.resetLevelAfterTreasurePrep(levelDef);
      await deps.nextTick();
      if (opts.skipIntro) {
        deps.refs.gridIntroDone.value = true;
        deps.refs.gridRefillAnimating.value = false;
        for (let i = 0; i < deps.ROWS * deps.COLS; i += 1) {
          const el = deps.refs.gridTileRefs.value[i];
          if (el) gsap.set(el, { x: 0, y: 0, opacity: 1 });
        }
        deps.touchGrid();
        deps.updateSlotPositions(true);
        await deps.runPendingAfterGridTilesSettled();
      } else {
        await Promise.all([deps.runGridIntroAfterReset(), deps.playLevelAdvanceHeaderFx()]);
      }
      deps.scheduleRunAutoSave();
      const result = { levelId: levelDef.id, levelIndex: idx };
      console.log(`[DEV] 已跳转至关卡 ${levelDef.id}（levelIndex=${idx}）`, result);
      return result;
    } finally {
      deps.refs.transitionBusy.value = false;
    }
  }

  async function startCeruleanBellDevTest() {
    deps.refs.ceruleanBellDevScenarioActive.value = true;
    applyCeruleanBellDevRunStart();
    const levelDef = deps.getRunLevelAtIndex(deps.refs.levelIndex.value);
    await deps.resetLevelAfterTreasurePrep(levelDef);
    await deps.nextTick();
    await deps.runGridIntroAfterReset()
    deps.scheduleRunAutoSave();
    console.log("[DEV] 青铃测试局：已跳至 1-3，Boss 固定为青铃。");
  }

  /** @param {1 | 3} presetId */
  async function startScreenshotPresetDevTest(presetId) {
    if (presetId === 3) {
      deps.refs.shopOverlayLayersSuppressed.value = false;
      deps.refs.packPickOverlaySuppressed.value = false;
      deps.refs.packPickSession.value = buildPromoSuperPackPickSession(
        () => deps.nextOfferInstanceId.value++,
        deps.runRandom,
      );
      await deps.nextTick();
      await deps.nextTick();
      console.log("[DEV] 宣传预设 3 — 已打开定制超级字母包（4 选项）。");
      return { preset: 3, optionCount: deps.refs.packPickSession.value?.options?.length ?? 0 };
    }

    if (screenshotPresetDevBusy) {
      console.warn("[DEV] 宣传预设 1 正在执行，请等待完成后再调用");
      return null;
    }
    screenshotPresetDevBusy = true;
    deps.refs.shopOverlayLayersSuppressed.value = true;
    const prevBossOverride = deps.refs.pendingBossSlugOverride.value;
    try {
      deps.refs.promoScreenshotDevPresetActive.value = 1;
      deps.refs.runDifficultyIndex.value = 7;
      deps.refs.levelIndex.value = STANDARD_RUN_FINAL_LEVEL_INDEX;
      deps.refs.money.value = 32;
      deps.refs.pendingBossSlugOverride.value = CERULEAN_BELL_BOSS_SLUG;
      const treasureSummary = applyPromoGameplayOwnedTreasures(
        deps.refs.ownedTreasures,
        deps.buildOwnedTreasureSlot,
        deps.shopTreasurePool.value,
        deps.runRandom,
      );
      const levelDef = deps.getRunLevelAtIndex(deps.refs.levelIndex.value);
      await deps.resetLevelAfterTreasurePrep(levelDef, {
        skipBossRestrictionNotify: true,
        discardPendingAfterGridSettled: true,
      });
      await finishScreenshotDevGridVisual();
      if (!deps.refs.dictionaryReady.value) {
        await deps.loadDictionary({ shouldAbort: () => !deps.getGamePanelAlive() });
      }
      const wordSummary = await logLongestValidWordsOnGrid(
        deps.getGrid?.() ?? [],
        deps.ROWS,
        deps.COLS,
        deps.isWildcardMaterialTile,
        deps.getCandidateWordsByLength,
        (pattern, wc = "?") =>
          deps.resolveWordPattern(
            pattern,
            wc,
            deps.rarityLevelsByRarity.value,
            deps.buildBossWildcardResolveContext(),
          ),
      );
      console.log(
        `[DEV] 宣传预设 1 — 8-3 / 难度 7 / $32 / 宝藏 ${treasureSummary.slotCount} 个。`,
        { treasures: treasureSummary, ...wordSummary },
      );
      return { preset: 1, treasures: treasureSummary, words: wordSummary };
    } finally {
      deps.refs.promoScreenshotDevPresetActive.value = 0;
      deps.refs.pendingBossSlugOverride.value = prevBossOverride;
      deps.refs.shopOverlayLayersSuppressed.value = false;
      screenshotPresetDevBusy = false;
    }
  }

  function debugSetScoreCardValues(targetScore, roundScore) {
    const target = Math.round(Number(targetScore) || 0);
    const round = Math.round(Number(roundScore) || 0);
    deps.refs.debugScoreCardTargetOverride.value = target;
    deps.refs.debugScoreCardRoundOverride.value = round;
    const result = { target, round };
    console.log(
      `[DEV] 分数框测试：至少得分=${target.toLocaleString()}，关卡得分=${round.toLocaleString()}`,
      result,
    );
    return result;
  }

  function debugClearScoreCardValues() {
    deps.refs.debugScoreCardTargetOverride.value = null;
    deps.refs.debugScoreCardRoundOverride.value = null;
    console.log("[DEV] 分数框测试已清除，恢复真实分数");
  }

  /**
   * @param {{ startFirstWordTutorialDevTest?: () => void, setupScreenshotPreset?: (preset: unknown) => Promise<unknown> }} [extra]
   */
  function registerConsoleHooks(extra = {}) {
    if (!import.meta.env.DEV) return;
    const dev = globalThis.__WM_DEV__;
    if (!dev || typeof dev !== "object") return;
    dev.startMaskBubbleBlueprintTest = () => startMaskBubbleBlueprintDevTest();
    dev.startFirstWordTutorial = () => extra.startFirstWordTutorialDevTest?.();
    dev.startAllIceDevTest = () => startAllIceDevTest();
    dev.startCeruleanBellDevTest = () => startCeruleanBellDevTest();
    dev.startPagerDevTest = () => startPagerDevTest();
    dev.startMouthQuProblemDevTest = () => startMouthQuProblemDevTest();
    dev.startEctoplasmDevTest = () => startEctoplasmDevTest();
    dev.jumpToLevel = (levelIdOrIndex, opts) => jumpToLevelDev(levelIdOrIndex, opts);
    dev.jumpToBossShop = (bossSlug, chapterOrLevelId) =>
      jumpToBossShopDev(bossSlug, chapterOrLevelId);
    dev.randomizeGridTileMaterials = () => randomizeGridTileMaterialsDev(deps.getGrid?.(), deps.runRandom);
    dev.debugSetScoreCardValues = (target, round) => debugSetScoreCardValues(target, round);
    dev.debugClearScoreCardValues = () => debugClearScoreCardValues();
    dev.grantRandomOwnedTreasures = async (count = 1) => {
      const requested = Math.max(0, Math.floor(Number(count) || 0));
      const granted = await deps.grantRandomOwnedTreasuresInRunWithPopAnim(requested, {
        expandWithCropWhenFull: true,
      });
      if (granted < requested) {
        console.log(
          `[DEV] 已授予 ${granted}/${requested} 个不重复随机宝藏（槽位已满且宝藏池无更多可抽）`,
        );
      } else {
        console.log(`[DEV] 已授予 ${granted} 个不重复随机宝藏`);
      }
      return granted;
    };
    const baseSetupScreenshotPreset = extra.setupScreenshotPreset ?? dev.setupScreenshotPreset?.bind(dev);
    dev.setupScreenshotPreset = async (preset) => {
      const id = normalizeScreenshotPresetId(preset);
      if (id === 1 || id === 3) return startScreenshotPresetDevTest(id);
      return baseSetupScreenshotPreset?.(preset);
    };
  }

  return {
    startMaskBubbleBlueprintDevTest,
    startAllIceDevTest,
    startPagerDevTest,
    startMouthQuProblemDevTest,
    startEctoplasmDevTest,
    startCeruleanBellDevTest,
    jumpToLevelDev,
    jumpToBossShopDev,
    startScreenshotPresetDevTest,
    randomizeGridTileMaterialsDev,
    applyCeruleanBellDevRunStart,
    applyMaskBubbleDevRunStart() {
      applyMaskBubbleOwnedTreasures(deps.refs.ownedTreasures, deps.buildOwnedTreasureSlot);
    },
    applyPagerDevRunStart() {
      applyPagerOwnedTreasure(deps.refs.ownedTreasures, deps.buildOwnedTreasureSlot);
    },
    applyMouthQuProblemDevRunStart() {
      applyMouthQuProblemOwnedTreasures(deps.refs.ownedTreasures, deps.buildOwnedTreasureSlot);
    },
    applyEctoplasmDevRunStart() {
      return applyEctoplasmDevOwnedTreasures(
        deps.refs.ownedTreasures,
        deps.buildOwnedTreasureSlot,
        deps.runRandom,
      );
    },
    debugSetScoreCardValues,
    debugClearScoreCardValues,
    registerConsoleHooks,
  };
}
