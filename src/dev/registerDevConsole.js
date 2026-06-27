import { clampSaveSlotIndex } from "../save/runSaveSchema.js";
import { normalizeScreenshotPresetId } from "./screenshotPresetScenario.js";
import {
  applyFullCollectionUnlockToCareer,
  applyFullCollectionUnlockAndMarkAllNew,
} from "./unlockFullCollection.js";

/**
 * 开发环境控制台桥接（`globalThis.__WM_DEV__`）。
 * @param {object} deps
 * @param {() => number} deps.getActiveSlotIndex
 * @param {(slotIndex: number, mutator: (career: import('../save/runSaveSchema.js').SlotCareerStats) => void) => void} deps.mutateCareer
 * @param {() => void} [deps.refreshUi]
 * @param {() => void} [deps.openMaterialBench]
 * @param {() => void} [deps.enableDeveloperMode]
 * @param {() => void} [deps.openTapTapEngagementPrompt]
 * @param {() => void | Promise<void>} [deps.openCollection]
 * @param {(mode?: 'view' | 'consent') => void} [deps.openPrivacyPolicy]
 * @param {() => void} [deps.clearPrivacyConsent]
 */
export function registerDevConsole(deps) {
  if (!import.meta.env.DEV) return () => {};

  const {
    getActiveSlotIndex,
    mutateCareer,
    refreshUi,
    openMaterialBench,
    enableDeveloperMode,
    openTapTapEngagementPrompt,
    openCollection,
    openPrivacyPolicy,
    clearPrivacyConsent,
  } = deps;

  /**
   * @param {number | undefined} slotIndex
   */
  function unlockFullCollection(slotIndex) {
    const ix = clampSaveSlotIndex(slotIndex ?? getActiveSlotIndex());
    /** @type {ReturnType<typeof applyFullCollectionUnlockToCareer> | null} */
    let summary = null;
    mutateCareer(ix, (career) => {
      summary = applyFullCollectionUnlockToCareer(career);
    });
    refreshUi?.();
    const { progress, achievements } = summary ?? {
      progress: { unlocked: 0, total: 0, percent: 0 },
      achievements: 0,
    };
    const result = {
      slotIndex: ix,
      progress,
      newlyUnlockedAchievements: achievements,
    };
    console.log(
      `[DEV] 槽位 ${ix + 1} 全收藏已解锁：${progress.percent}% (${progress.unlocked}/${progress.total})`,
      result,
    );
    return result;
  }

  /**
   * 宣传图截图预设（1=局内8-3棋盘，2=收藏全解锁标新，3=超级字母包）。
   * @param {unknown} preset
   */
  async function setupScreenshotPreset(preset) {
    const id = normalizeScreenshotPresetId(preset);
    if (!id) {
      console.warn("[DEV] setupScreenshotPreset: 无效参数，可用 1/gameplay、2/collection、3/superPack");
      help();
      return null;
    }
    if (id === 2) {
      const ix = clampSaveSlotIndex(getActiveSlotIndex());
      /** @type {ReturnType<typeof applyFullCollectionUnlockAndMarkAllNew> | null} */
      let summary = null;
      mutateCareer(ix, (career) => {
        summary = applyFullCollectionUnlockAndMarkAllNew(career);
      });
      refreshUi?.();
      await openCollection?.();
      const result = {
        preset: 2,
        slotIndex: ix,
        ...(summary ?? {
          progress: { unlocked: 0, total: 0, percent: 0 },
          achievements: 0,
          newMarkCount: 0,
        }),
      };
      console.log(
        `[DEV] 宣传预设 2 — 槽位 ${ix + 1} 全收藏已解锁并标新（${result.newMarkCount} 条）`,
        result,
      );
      return result;
    }
    console.warn(
      `[DEV] 宣传预设 ${id} 需先进入局内（GamePanel 已挂载）后再调用 setupScreenshotPreset(${id})。`,
    );
    return null;
  }

  function help() {
    console.log(
      [
        "[DEV] Word Master 控制台",
        "  __WM_DEV__.unlockFullCollection()       — 当前槽位全收藏解锁",
        "  __WM_DEV__.unlockFullCollection(0)      — 指定槽位（0/1/2）",
        "  __WM_DEV__.openMaterialBench()        — 材质性能实验（10 格）",
        "  __WM_DEV__.enableDeveloperMode()      — 开启开发者模式（收藏成就连点作弊）",
        "  __WM_DEV__.openTapTapEngagementPrompt() — 打开评价和反馈弹窗（含引导问句）",
        "  __WM_DEV__.openPrivacyPolicy()          — 预览隐私政策（只读，确定关闭）",
        "  __WM_DEV__.openPrivacyPolicy('consent') — 预览首次同意弹窗（同意/不同意）",
        "  __WM_DEV__.clearPrivacyConsent()        — 清除本地隐私同意记录",
        "  __WM_DEV__.startFirstWordTutorial() — 局内：从头启动首词 PLAY 新手引导",
        "  __WM_DEV__.startMaskBubbleBlueprintTest() — 进关后：[面具][泡泡] + 棋盘 2 个 B（计分动画测试）",
        "  或 URL ?dev=maskBubble 新开一局自动启用",
        "  __WM_DEV__.startAllIceDevTest() — 进关后：棋盘与牌库全部为碎冰块",
        "  或 URL ?dev=allIce 新开一局自动启用",
        "  __WM_DEV__.jumpToLevel('3-2') — 局内跳转关卡（亦可用 levelIndex 数字）",
        "  __WM_DEV__.jumpToLevel('8-3', { bossSlug: 'cerulean_bell' }) — 可选 Boss",
        "  __WM_DEV__.jumpToLevel('5-1', { skipIntro: true }) — 跳过棋盘入场动画",
        "  __WM_DEV__.jumpToBossShop('cerulean_bell', '1') — 跳转 Boss 前商店（Boss slug, 章号）",
        "  __WM_DEV__.startCeruleanBellDevTest() — 跳至 1-3，Boss 固定青铃",
        "  或 URL ?dev=ceruleanBell 新开一局自动启用",
        "  __WM_DEV__.startPagerDevTest() — 进关后：槽位 1 为寻呼机",
        "  或 URL ?dev=pager 新开一局自动启用",
        "  __WM_DEV__.startVolcanoKiteDevTest() — 进关后：[风筝×2][火山][风筝×2]",
        "  或 URL ?dev=volcanoKite 新开一局自动启用",
        "  __WM_DEV__.randomizeGridTileMaterials() — 局内：为棋盘无材质格各随机加一种材质",
        "  __WM_DEV__.grantRandomOwnedTreasures(10) — 局内授予 N 个不重复随机宝藏（槽位满时自动加裁剪配饰扩栏）",
        "  __WM_DEV__.debugSetScoreCardValues(123, 456) — 顶栏两分数框测试展示（至少得分, 关卡得分）",
        "  __WM_DEV__.debugClearScoreCardValues() — 清除分数框测试，恢复真实分数",
        "  __WM_DEV__.setWalletBalance(100) — 局内设置钱包余额（受信用卡等下限约束）",
        "  __WM_DEV__.setupScreenshotPreset(1) — 宣传图：8-3 棋盘 + 宝藏/材质/加成（需局内）",
        "  __WM_DEV__.setupScreenshotPreset(2) — 宣传图：收藏全解锁并标新 + 跳转收藏页",
        "  __WM_DEV__.setupScreenshotPreset(3) — 宣传图：打开定制超级字母包（需局内）",
        "  别名：1/gameplay、2/collection、3/superPack",
        "  __WM_DEV__.help()                       — 显示本帮助",
      ].join("\n"),
    );
  }

  const api = {
    version: 1,
    unlockFullCollection,
    openMaterialBench: () => {
      openMaterialBench?.();
      console.log("[DEV] 已打开材质性能实验页");
    },
    enableDeveloperMode: () => {
      enableDeveloperMode?.();
      console.log("[DEV] 已开启开发者模式");
    },
    openTapTapEngagementPrompt: () => {
      openTapTapEngagementPrompt?.();
      console.log("[DEV] 已打开评价和反馈弹窗");
    },
    openPrivacyPolicy: (mode = "view") => {
      const resolvedMode = mode === "consent" ? "consent" : "view";
      openPrivacyPolicy?.(resolvedMode);
      console.log(
        `[DEV] 已打开隐私政策（${resolvedMode === "consent" ? "同意弹窗" : "只读预览"}）`,
      );
    },
    clearPrivacyConsent: () => {
      clearPrivacyConsent?.();
      console.log("[DEV] 已清除本地隐私同意记录");
    },
    startFirstWordTutorial: () => {
      console.warn(
        "[DEV] 请先进入局内（GamePanel 已挂载）后再调用 startFirstWordTutorial()。",
      );
    },
    startMaskBubbleBlueprintTest: () => {
      console.warn(
        "[DEV] 请先进入局内（GamePanel 已挂载）后再调用 startMaskBubbleBlueprintTest()。",
      );
    },
    startAllIceDevTest: () => {
      console.warn("[DEV] 请先进入局内（GamePanel 已挂载）后再调用 startAllIceDevTest()。");
    },
    startCeruleanBellDevTest: () => {
      console.warn("[DEV] 请先进入局内（GamePanel 已挂载）后再调用 startCeruleanBellDevTest()。");
    },
    startPagerDevTest: () => {
      console.warn("[DEV] 请先进入局内（GamePanel 已挂载）后再调用 startPagerDevTest()。");
    },
    startVolcanoKiteDevTest: () => {
      console.warn(
        "[DEV] 请先进入局内（GamePanel 已挂载）后再调用 startVolcanoKiteDevTest()。",
      );
    },
    jumpToLevel: (levelIdOrIndex, opts) => {
      console.warn(
        `[DEV] 请先进入局内（GamePanel 已挂载）后再调用 jumpToLevel(${JSON.stringify(levelIdOrIndex)})。`,
      );
      return null;
    },
    jumpToBossShop: (bossSlug, chapterOrLevelId) => {
      console.warn(
        `[DEV] 请先进入局内（GamePanel 已挂载）后再调用 jumpToBossShop(${JSON.stringify(bossSlug)}, ${JSON.stringify(chapterOrLevelId)})。`,
      );
      return null;
    },
    setupScreenshotPreset,
    help,
  };

  globalThis.__WM_DEV__ = api;
  console.log("[DEV] 控制台已就绪：输入 __WM_DEV__.help() 查看命令");

  return () => {
    if (globalThis.__WM_DEV__ === api) delete globalThis.__WM_DEV__;
  };
}
