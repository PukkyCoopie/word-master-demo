/** @typedef {{ targetRarity: string, multMul: number, labelZh: string }} RotatingRarityMultStep */

/** @type {readonly RotatingRarityMultStep[]} */
export const ROTATING_RARITY_MULT_STEPS = Object.freeze([
  { targetRarity: "common", multMul: 1.25, labelZh: "普通" },
  { targetRarity: "rare", multMul: 1.5, labelZh: "稀有" },
  { targetRarity: "epic", multMul: 2, labelZh: "史诗" },
  { targetRarity: "legendary", multMul: 3, labelZh: "传说" },
]);

/** @param {import('../treasures/treasureRunState.js').TreasureRunState} rs @param {() => number} [rng] */
export function rollNextRotatingRarityMultIndex(rs, rng = Math.random) {
  if (!rs) return 0;
  const n = ROTATING_RARITY_MULT_STEPS.length;
  if (n <= 1) {
    rs.rotatingRarityMultIndex = 0;
    return 0;
  }
  let next = Math.floor(rng() * n);
  if (rs.rotatingRarityMultIndex != null && next === rs.rotatingRarityMultIndex) {
    next = (next + 1) % n;
  }
  rs.rotatingRarityMultIndex = next;
  return next;
}

/** @param {import('../treasures/treasureRunState.js').TreasureRunState | null | undefined} rs */
export function getActiveRotatingRarityMultStep(rs) {
  const i = Math.max(
    0,
    Math.min(ROTATING_RARITY_MULT_STEPS.length - 1, Math.floor(Number(rs?.rotatingRarityMultIndex) || 0)),
  );
  return ROTATING_RARITY_MULT_STEPS[i];
}
