import { clampSaveSlotIndex } from "../save/runSaveSchema.js";
import { applyFullCollectionUnlockToCareer } from "./unlockFullCollection.js";

/**
 * 开发环境控制台桥接（`globalThis.__WM_DEV__`）。
 * @param {object} deps
 * @param {() => number} deps.getActiveSlotIndex
 * @param {(slotIndex: number, mutator: (career: import('../save/runSaveSchema.js').SlotCareerStats) => void) => void} deps.mutateCareer
 * @param {() => void} [deps.refreshUi]
 * @param {() => void} [deps.openMaterialBench]
 */
export function registerDevConsole(deps) {
  if (!import.meta.env.DEV) return () => {};

  const { getActiveSlotIndex, mutateCareer, refreshUi, openMaterialBench } = deps;

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

  function help() {
    console.log(
      [
        "[DEV] Word Master 控制台",
        "  __WM_DEV__.unlockFullCollection()       — 当前槽位全收藏解锁",
        "  __WM_DEV__.unlockFullCollection(0)      — 指定槽位（0/1/2）",
        "  __WM_DEV__.openMaterialBench()        — 材质性能实验（10 格）",
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
    help,
  };

  globalThis.__WM_DEV__ = api;
  console.log("[DEV] 控制台已就绪：输入 __WM_DEV__.help() 查看命令");

  return () => {
    if (globalThis.__WM_DEV__ === api) delete globalThis.__WM_DEV__;
  };
}
