import { LETTER_RARITY_ORDER } from "../composables/useScoring.js";
import { applyRarityLevelUpgrade } from "../game/treasureRarityTierMerge.js";

function shuffleInPlace(arr, rng = Math.random) {
  const rnd = typeof rng === "function" ? rng : Math.random;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/**
 * 与法术「向上」相同：从词长组 + 各稀有度中随机抽 `count` 项（不重复池内洗牌）。
 * @param {readonly { key: string, minLen: number, maxLen: number, label: string }[]} upgradeLengthGroups
 * @param {number} count
 * @param {() => number} [rng]
 */
export function rollRandomUpgradePicks(upgradeLengthGroups, count, rng = Math.random) {
  const lengthOpts = upgradeLengthGroups.map((g) => ({ kind: "length", g }));
  const rarityOpts = LETTER_RARITY_ORDER.map((rk) => ({ kind: "rarity", rk }));
  const pool = [...lengthOpts, ...rarityOpts];
  shuffleInPlace(pool, rng);
  return pool.slice(0, Math.max(0, Math.min(count, pool.length)));
}

/**
 * @param {{ kind: "rarity", rk: string } | { kind: "length", g: { minLen: number, maxLen: number, label: string } }} pick
 * @param {object} ctx spell runtime context（`buildSpellRuntimeContext`）
 */
export function applyRandomUpgradePick(pick, ctx) {
  if (pick.kind === "rarity") {
    const rk = String(pick.rk);
    const cur = Math.max(1, Math.round(Number(ctx.rarityLevelsByRarity.value?.[rk])) || 1);
    const owned = ctx.ownedSlotTreasureIds ?? null;
    if (owned && typeof ctx.setRarityLevel === "function") {
      applyRarityLevelUpgrade(rk, cur + 1, ctx.setRarityLevel, owned);
    } else {
      ctx.setRarityLevel(rk, cur + 1);
    }
    ctx.onUpgradeUsed?.();
    ctx.onUpgradeDiscovered?.(pick);
    return;
  }
  const { minLen, maxLen } = pick.g;
  for (let len = minLen; len <= maxLen; len++) {
    if (typeof ctx.bumpWordLengthLevel === "function") {
      ctx.bumpWordLengthLevel(len);
    } else {
      const cur = Math.max(1, Math.round(Number(ctx.lengthLevelsByLength.value?.[len])) || 1);
      ctx.setWordLengthLevel(len, cur + 1);
    }
  }
  ctx.onUpgradeUsed?.();
  ctx.onUpgradeDiscovered?.(pick);
}

/**
 * @param {{ kind: "rarity", rk: string } | { kind: "length", g: { minLen: number, maxLen: number, label: string } }} pick
 * @param {{ rarityLevelsByRarity: import("vue").Ref<Record<string, number>>, lengthLevelsByLength: import("vue").Ref<Record<string, number>> }} levels
 */
export function getBeforeLevelForRandomUpgradePick(pick, levels) {
  if (pick.kind === "rarity") {
    const rk = String(pick.rk);
    return Math.max(1, Math.round(Number(levels.rarityLevelsByRarity.value?.[rk])) || 1);
  }
  const len = pick.g.minLen;
  return Math.max(1, Math.round(Number(levels.lengthLevelsByLength.value?.[len])) || 1);
}

/**
 * @param {{ kind: "rarity", rk: string } | { kind: "length", g: { minLen: number, maxLen: number, label: string } }} pick
 * @param {number} beforeLevel
 * @param {(len: number) => boolean} [isLengthObservatoryBoosted]
 */
export function buildRandomUpgradeAnimPayload(pick, beforeLevel, isLengthObservatoryBoosted = () => false) {
  if (pick.kind === "rarity") {
    return {
      upgradeKind: "rarity",
      rarityKey: pick.rk,
      beforeLevel,
    };
  }
  const g = pick.g;
  return {
    upgradeKind: "length",
    lengthLabel: g.label,
    lengthMin: g.minLen,
    lengthMax: g.maxLen,
    beforeLevel,
    isLengthObservatoryBoosted,
  };
}

/** 阶梯/色盘等批量升级动效相对普通升级的倍速（仍叠加 1 + 0.3×步序 加速） */
export const ECLIPSE_UPGRADE_ANIM_SPEED_SCALE = 1.5;

/**
 * @param {number} stepIndex 序列内步序（首项为 0）
 * @param {{ animSpeedScale?: number } | null | undefined} payload
 */
export function resolveUpgradePlaybackSpeed(stepIndex, payload) {
  const scale = Math.max(0.01, Number(payload?.animSpeedScale) || 1);
  return scale * (1 + 0.3 * Math.max(0, Math.round(Number(stepIndex)) || 0));
}
