import { LETTER_RARITY_ORDER } from "../composables/useScoring.js";
import { UPGRADE_LENGTH_GROUPS } from "../shop/shopOfferRowBuilders.js";
import {
  applyRandomUpgradePick,
  buildRandomUpgradeAnimPayload,
  ECLIPSE_UPGRADE_ANIM_SPEED_SCALE,
  getBeforeLevelForRandomUpgradePick,
  rollRandomUpgradePicks,
} from "../shop/randomUpgradeRoll.js";
import { isLengthObservatoryBoosted } from "../vouchers/voucherRuntime.js";
import { countLengthUpgradeRangeSteps } from "../treasures/treasureRunTracking.js";

const ECLIPSE_ALL_LENGTHS_GROUP = Object.freeze({ minLen: 3, maxLen: 16, label: "3-16字母" });

/**
 * @typedef {Object} ShopUpgradePlaybackDeps
 * @property {import('vue').Ref<boolean>} showShop
 * @property {import('vue').Ref<boolean>} shopUpgradeAnimating
 * @property {import('vue').Ref<boolean>} shopOverlayLayersSuppressed
 * @property {() => { playUpgradeResult?: (payload: object) => Promise<void> } | null | undefined} getShopPanel
 * @property {() => Promise<void>} waitNextTick
 * @property {() => number} runRandom
 * @property {{ rarityLevelsByRarity: import('vue').Ref<Record<string, number>>, lengthLevelsByLength: import('vue').Ref<Record<number, number>> }} levelRefs
 * @property {import('vue').Ref<string[]>} ownedVoucherIds
 * @property {import('vue').Ref<Record<number, number>>} spellCountsByLength
 * @property {() => object} getBuildSpellRuntimeContext
 * @property {(pick: object) => void} noteCollectionUpgradeFromRandomPick
 * @property {() => void} refreshGridTileBaseScoresFromLevels
 * @property {(runState: object, count: number) => void} noteTreasureRunUpgradeUsed
 * @property {import('vue').Ref<object>} treasureRunState
 * @property {() => void} noteCollectionAllLengthUpgrades
 * @property {() => void} noteCollectionAllRarityUpgrades
 * @property {(rk: string, level: number) => void} setRarityLevelWithTreasurePairs
 * @property {(len: number, options?: object) => void} bumpWordLengthLevel
 */

/**
 * 商店升级顶栏动效编排（箭头升级 / 日蚀 / 单格升级 apply+播放）。
 *
 * @param {ShopUpgradePlaybackDeps} deps
 */
export function createShopUpgradePlayback(deps) {
  let shopUpgradePlaybackStepIndex = -1;
  let shopUpgradePlaybackStepCount = 0;

  function buildEclipseLengthUpgradeSteps() {
    const levelRefs = deps.levelRefs;
    const obsFn = (len) =>
      isLengthObservatoryBoosted(deps.ownedVoucherIds.value, len, deps.spellCountsByLength.value);
    const pick = { kind: "length", g: ECLIPSE_ALL_LENGTHS_GROUP };
    return [
      {
        payload: {
          ...buildRandomUpgradeAnimPayload(
            pick,
            getBeforeLevelForRandomUpgradePick(pick, levelRefs),
            obsFn,
          ),
          animSpeedScale: ECLIPSE_UPGRADE_ANIM_SPEED_SCALE,
        },
        apply: () => {
          deps.noteTreasureRunUpgradeUsed(
            deps.treasureRunState.value,
            countLengthUpgradeRangeSteps(
              ECLIPSE_ALL_LENGTHS_GROUP.minLen,
              ECLIPSE_ALL_LENGTHS_GROUP.maxLen,
            ),
          );
          deps.noteCollectionAllLengthUpgrades();
          for (let len = 3; len <= 16; len += 1) {
            deps.bumpWordLengthLevel(len, { observatoryBoost: obsFn(len) });
          }
        },
      },
    ];
  }

  function buildEclipseRarityUpgradeSteps() {
    const levelRefs = deps.levelRefs;
    const rarities = LETTER_RARITY_ORDER.map((rk) => ({
      rarityKey: rk,
      beforeLevel: getBeforeLevelForRandomUpgradePick({ kind: "rarity", rk }, levelRefs),
    }));
    return [
      {
        payload: {
          upgradeKind: "rarity_sequence",
          rarities,
          animSpeedScale: ECLIPSE_UPGRADE_ANIM_SPEED_SCALE,
        },
        apply: () => {
          deps.noteTreasureRunUpgradeUsed(deps.treasureRunState.value, LETTER_RARITY_ORDER.length);
          deps.noteCollectionAllRarityUpgrades();
          for (const { rarityKey: rk } of rarities) {
            const cur = Math.max(1, Math.round(Number(levelRefs.rarityLevelsByRarity.value?.[rk])) || 1);
            deps.setRarityLevelWithTreasurePairs(rk, cur + 1);
          }
        },
      },
    ];
  }

  /**
   * @param {{ apply?: () => void, payload: object }[]} steps
   * @param {{ restoreLayersAfter?: boolean }} [opts]
   */
  async function runShopUpgradePlaybackSteps(steps, { restoreLayersAfter: _restoreLayersAfter = false } = {}) {
    if (!deps.showShop.value || deps.shopUpgradeAnimating.value) return;
    deps.shopUpgradeAnimating.value = true;
    deps.shopOverlayLayersSuppressed.value = true;
    shopUpgradePlaybackStepCount = Array.isArray(steps) ? steps.length : 0;
    shopUpgradePlaybackStepIndex = -1;
    await deps.waitNextTick();
    try {
      for (let i = 0; i < steps.length; i += 1) {
        shopUpgradePlaybackStepIndex = i;
        const step = steps[i];
        step.apply?.();
        await deps.getShopPanel()?.playUpgradeResult?.(step.payload);
      }
    } finally {
      deps.shopUpgradeAnimating.value = false;
      deps.shopOverlayLayersSuppressed.value = false;
      shopUpgradePlaybackStepIndex = -1;
      shopUpgradePlaybackStepCount = 0;
    }
  }

  function onShopUpgradeInteractionUnlock() {
    if (!deps.shopUpgradeAnimating.value) return;
    if (shopUpgradePlaybackStepIndex < 0 || shopUpgradePlaybackStepCount <= 0) return;
    const isLastStep = shopUpgradePlaybackStepIndex >= shopUpgradePlaybackStepCount - 1;
    if (!isLastStep) return;
    deps.shopUpgradeAnimating.value = false;
  }

  async function playArrowUpShopUpgradeSequence({ restoreLayersAfter = false } = {}) {
    const levelRefs = deps.levelRefs;
    const obsFn = (len) =>
      isLengthObservatoryBoosted(deps.ownedVoucherIds.value, len, deps.spellCountsByLength.value);
    const picks = rollRandomUpgradePicks(UPGRADE_LENGTH_GROUPS, 2, deps.runRandom);
    const steps = picks.map((pick) => ({
      payload: buildRandomUpgradeAnimPayload(
        pick,
        getBeforeLevelForRandomUpgradePick(pick, levelRefs),
        obsFn,
      ),
      apply: () => {
        applyRandomUpgradePick(pick, deps.getBuildSpellRuntimeContext());
        deps.noteCollectionUpgradeFromRandomPick(pick);
        if (pick.kind === "rarity") deps.refreshGridTileBaseScoresFromLevels();
      },
    }));
    await runShopUpgradePlaybackSteps(steps, { restoreLayersAfter });
  }

  async function playEclipseLengthUpgradeSequence() {
    await runShopUpgradePlaybackSteps(buildEclipseLengthUpgradeSteps());
    deps.refreshGridTileBaseScoresFromLevels();
  }

  async function playEclipseRarityUpgradeSequence() {
    await runShopUpgradePlaybackSteps(buildEclipseRarityUpgradeSteps());
    deps.refreshGridTileBaseScoresFromLevels();
  }

  return {
    runShopUpgradePlaybackSteps,
    onShopUpgradeInteractionUnlock,
    playArrowUpShopUpgradeSequence,
    playEclipseLengthUpgradeSequence,
    playEclipseRarityUpgradeSequence,
    buildEclipseLengthUpgradeSteps,
    buildEclipseRarityUpgradeSteps,
  };
}
