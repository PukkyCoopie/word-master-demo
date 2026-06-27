import { runClearWinLengthUpgradeShopLikeFx } from "../utils/runClearWinLengthUpgradeShopLikeFx.js";
import { runInGameRarityUpgradeShopLikeFx } from "../utils/runInGameRarityUpgradeShopLikeFx.js";
import { resolveUpgradePlaybackSpeed } from "../shop/randomUpgradeRoll.js";

/**
 * 局内授予（宝藏钩子等）顶栏升级动效，与商店购买升级卡同款流程。
 * @param {{
 *   refs: {
 *     inRunGrantUpgradeFxActive: import('vue').Ref<boolean>,
 *     shopOverlayLayersSuppressed: import('vue').Ref<boolean>,
 *   },
 *   model: {
 *     wordlenText: import('vue').Ref<string>,
 *     levelShown: import('vue').Ref<number>,
 *     scoreValue: import('vue').Ref<number>,
 *     multValue: import('vue').Ref<number>,
 *   },
 *   gameResultAreaRef: import('vue').Ref<{ getTotalEl?: () => HTMLElement | null } | null>,
 *   waitNextTick: () => Promise<void>,
 *   sleep: (ms: number) => Promise<void>,
 *   getSubmitUpgradeFxRegistrar?: () => ((runner: () => Promise<void>) => void) | null,
 * }} deps
 */
export function createInRunUpgradePlayback(deps) {
  /**
   * @param {{ apply?: () => void, payload: object }[]} steps
   */
  async function runInRunUpgradePlaybackStepsImmediate(steps) {
    if (!steps.length) return;
    deps.refs.inRunGrantUpgradeFxActive.value = true;
    deps.refs.shopOverlayLayersSuppressed.value = true;
    await deps.waitNextTick();
    try {
      for (const step of steps) {
        step.apply?.();
        const p = step.payload;
        if (p?.upgradeKind === "rarity_sequence") {
          const rarities = Array.isArray(p.rarities) ? p.rarities : [];
          for (let i = 0; i < rarities.length; i += 1) {
            const row = rarities[i];
            const rarityKey = String(row?.rarityKey ?? "common");
            const beforeLevel = Math.max(1, Math.round(Number(row?.beforeLevel) || 1));
            const isFirst = i === 0;
            const isLast = i === rarities.length - 1;
            await runInGameRarityUpgradeShopLikeFx({
              areaRef: deps.gameResultAreaRef,
              model: deps.model,
              fxActive: deps.refs.inRunGrantUpgradeFxActive,
              waitNextTick: deps.waitNextTick,
              rarityKey,
              beforeLevel,
              speed: resolveUpgradePlaybackSpeed(i, p),
              isFirstRarity: isFirst,
              isLastRarity: isLast,
            });
            if (!isLast) await deps.sleep(Math.round(30 / resolveUpgradePlaybackSpeed(i, p)));
          }
          continue;
        }
        if (p?.upgradeKind === "rarity") {
          const rk = String(p.rarityKey ?? "common");
          const beforeLevel = Math.max(1, Math.round(Number(p.beforeLevel) || 1));
          await runInGameRarityUpgradeShopLikeFx({
            areaRef: deps.gameResultAreaRef,
            model: deps.model,
            fxActive: deps.refs.inRunGrantUpgradeFxActive,
            waitNextTick: deps.waitNextTick,
            rarityKey: rk,
            beforeLevel,
            speed: 1,
          });
          continue;
        }
        const lenMin = Math.max(3, Math.min(16, Math.round(Number(p?.lengthMin) || 3)));
        const lenMax = Math.max(lenMin, Math.min(16, Math.round(Number(p?.lengthMax) || lenMin)));
        const beforeLevel = Math.max(1, Math.round(Number(p?.beforeLevel) || 1));
        const beforeLevelsByLen = p?.beforeLevelsByLen;
        const obsFn =
          typeof p?.isLengthObservatoryBoosted === "function"
            ? p.isLengthObservatoryBoosted
            : () => false;
        for (let len = lenMin; len <= lenMax; len++) {
          const isFirst = len === lenMin;
          const isLast = len === lenMax;
          const speed = resolveUpgradePlaybackSpeed(len - lenMin, p);
          const lenBeforeLevel =
            beforeLevelsByLen != null && beforeLevelsByLen[len] != null
              ? Math.max(1, Math.round(Number(beforeLevelsByLen[len])) || 1)
              : beforeLevel;
          await runClearWinLengthUpgradeShopLikeFx({
            areaRef: deps.gameResultAreaRef,
            model: deps.model,
            fxActive: deps.refs.inRunGrantUpgradeFxActive,
            waitNextTick: deps.waitNextTick,
            len,
            beforeLevel: lenBeforeLevel,
            observatoryBoost: obsFn(len),
            speed,
            isFirstLength: isFirst,
            isLastLength: isLast,
          });
          if (!isLast) await deps.sleep(Math.round(30 / speed));
        }
      }
    } finally {
      deps.refs.inRunGrantUpgradeFxActive.value = false;
      deps.refs.shopOverlayLayersSuppressed.value = false;
    }
  }

  /**
   * @param {{ apply?: () => void, payload: object }[]} steps
   */
  async function runInRunUpgradePlaybackSteps(steps) {
    if (!steps.length) return;
    const registrar = deps.getSubmitUpgradeFxRegistrar?.();
    if (registrar) {
      registrar(() => runInRunUpgradePlaybackStepsImmediate(steps));
      return;
    }
    await runInRunUpgradePlaybackStepsImmediate(steps);
  }

  return {
    runInRunUpgradePlaybackSteps,
    runInRunUpgradePlaybackStepsImmediate,
  };
}
