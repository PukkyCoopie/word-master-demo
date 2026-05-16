import { LETTER_RARITY_ORDER } from "../composables/useScoring.js";

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
    ctx.setRarityLevel(rk, cur + 1);
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
