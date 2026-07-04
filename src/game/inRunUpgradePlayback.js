import { runClearWinLengthUpgradeShopLikeFx } from "../utils/runClearWinLengthUpgradeShopLikeFx.js";
import { runInGameRarityUpgradeShopLikeFx } from "../utils/runInGameRarityUpgradeShopLikeFx.js";
import {
  ECLIPSE_UPGRADE_ANIM_SPEED_SCALE,
  resolveUpgradePlaybackSpeed,
} from "../shop/randomUpgradeRoll.js";
import {
  UPGRADE_SEQUENCE_GAP_MS,
  getSubmitScoringTriggeredUpgradeLocalSpeed,
  upgradeAnimSleep,
} from "./upgradePlaybackTiming.js";

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
 *   getSubmitAccessoryUpgradeBatch?: () => { registerStep: (step: object) => void } | null,
 * }} deps
 */
function flattenUpgradeStepsForStaircase(steps) {
  /** @type {{ kind: 'length' | 'rarity', len?: number, rarityKey?: string, beforeLevel: number, observatoryBoost?: boolean }[]} */
  const flat = [];
  for (const step of steps) {
    const p = step?.payload;
    if (!p || typeof p !== "object") continue;
    if (p.upgradeKind === "rarity_sequence") {
      const rarities = Array.isArray(p.rarities) ? p.rarities : [];
      for (const row of rarities) {
        flat.push({
          kind: "rarity",
          rarityKey: String(row?.rarityKey ?? "common"),
          beforeLevel: Math.max(1, Math.round(Number(row?.beforeLevel) || 1)),
        });
      }
      continue;
    }
    if (p.upgradeKind === "rarity") {
      flat.push({
        kind: "rarity",
        rarityKey: String(p.rarityKey ?? "common"),
        beforeLevel: Math.max(1, Math.round(Number(p.beforeLevel) || 1)),
      });
      continue;
    }
    const lenMin = Math.max(3, Math.min(16, Math.round(Number(p.lengthMin) || 3)));
    const lenMax = Math.max(lenMin, Math.min(16, Math.round(Number(p.lengthMax) || lenMin)));
    const beforeLevelsByLen = p.beforeLevelsByLen;
    const beforeLevel = Math.max(1, Math.round(Number(p.beforeLevel) || 1));
    const obsFn =
      typeof p.isLengthObservatoryBoosted === "function" ? p.isLengthObservatoryBoosted : () => false;
    for (let len = lenMin; len <= lenMax; len += 1) {
      const lenBeforeLevel =
        beforeLevelsByLen != null && beforeLevelsByLen[len] != null
          ? Math.max(1, Math.round(Number(beforeLevelsByLen[len])) || 1)
          : beforeLevel;
      flat.push({
        kind: "length",
        len,
        beforeLevel: lenBeforeLevel,
        observatoryBoost: obsFn(len),
      });
    }
  }
  return flat;
}

export function createInRunUpgradePlayback(deps) {
  function resolveStepPlaybackSpeed(stepIndex, payload) {
    return resolveUpgradePlaybackSpeed(stepIndex, payload) * getSubmitScoringTriggeredUpgradeLocalSpeed();
  }

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
              speed: resolveStepPlaybackSpeed(i, p),
              isFirstRarity: isFirst,
              isLastRarity: isLast,
            });
            if (!isLast) await upgradeAnimSleep(UPGRADE_SEQUENCE_GAP_MS, resolveStepPlaybackSpeed(i, p));
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
            speed: getSubmitScoringTriggeredUpgradeLocalSpeed(),
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
          const speed = resolveStepPlaybackSpeed(len - lenMin, p);
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
          if (!isLast) await upgradeAnimSleep(UPGRADE_SEQUENCE_GAP_MS, speed);
        }
      }
    } finally {
      deps.refs.inRunGrantUpgradeFxActive.value = false;
      deps.refs.shopOverlayLayersSuppressed.value = false;
    }
  }

  /**
   * 提交后升级配饰：多段 +1 合并为阶梯序列（越来越快、段间无前后摇）。
   * @param {{ apply?: () => void, payload: object }[]} steps
   */
  async function runInRunUpgradeStaircasePlayback(steps) {
    const flat = flattenUpgradeStepsForStaircase(steps);
    if (!flat.length) return;
    deps.refs.inRunGrantUpgradeFxActive.value = true;
    deps.refs.shopOverlayLayersSuppressed.value = true;
    await deps.waitNextTick();
    const animPayload = { animSpeedScale: ECLIPSE_UPGRADE_ANIM_SPEED_SCALE };
    try {
      for (const step of steps) step.apply?.();
      for (let i = 0; i < flat.length; i += 1) {
        const row = flat[i];
        const isFirst = i === 0;
        const isLast = i === flat.length - 1;
        const speed = resolveStepPlaybackSpeed(i, animPayload);
        if (row.kind === "rarity") {
          await runInGameRarityUpgradeShopLikeFx({
            areaRef: deps.gameResultAreaRef,
            model: deps.model,
            fxActive: deps.refs.inRunGrantUpgradeFxActive,
            waitNextTick: deps.waitNextTick,
            rarityKey: String(row.rarityKey ?? "common"),
            beforeLevel: row.beforeLevel,
            speed,
            isFirstRarity: isFirst,
            isLastRarity: isLast,
            compactSequence: true,
          });
        } else {
          await runClearWinLengthUpgradeShopLikeFx({
            areaRef: deps.gameResultAreaRef,
            model: deps.model,
            fxActive: deps.refs.inRunGrantUpgradeFxActive,
            waitNextTick: deps.waitNextTick,
            len: Math.max(3, Math.min(16, Math.round(Number(row.len) || 3))),
            beforeLevel: row.beforeLevel,
            observatoryBoost: row.observatoryBoost === true,
            speed,
            isFirstLength: isFirst,
            isLastLength: isLast,
            compactSequence: true,
          });
        }
        if (!isLast) await upgradeAnimSleep(UPGRADE_SEQUENCE_GAP_MS, speed);
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
    const batch = deps.getSubmitAccessoryUpgradeBatch?.();
    if (batch) {
      for (const step of steps) batch.registerStep(step);
      return;
    }
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
    runInRunUpgradeStaircasePlayback,
  };
}
