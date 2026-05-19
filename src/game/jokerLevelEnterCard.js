import { RARITY_BY_LETTER } from "../composables/useScoring.js";
import { TILE_ACCESSORY_COIN, TILE_ACCESSORY_LEVEL_UPGRADE, TILE_ACCESSORY_REWIND } from "./tileAccessories.js";

const ENHANCEMENT_POOL = Object.freeze([
  { kind: "accessory", id: TILE_ACCESSORY_COIN },
  { kind: "accessory", id: TILE_ACCESSORY_LEVEL_UPGRADE },
  { kind: "accessory", id: TILE_ACCESSORY_REWIND },
  { kind: "score", value: 6 },
  { kind: "mult", value: 2 },
]);

/**
 * 为鬼牌宝藏生成带随机增强的牌张（调用方须用 `createDeckCard` 同构字段写入 multiset）。
 * @param {() => number} rng
 * @returns {{ raw: string, accessoryId?: string | null, tileScoreBonus?: number, letterMultBonus?: number }}
 */
export function rollJokerLevelEnterDeckCardSpec(rng = Math.random) {
  const rnd = typeof rng === "function" ? rng : Math.random;
  const pool = [...RARITY_BY_LETTER.common, ...RARITY_BY_LETTER.rare];
  const raw = pool[Math.floor(rnd() * pool.length)] ?? "e";
  const pick = ENHANCEMENT_POOL[Math.floor(rnd() * ENHANCEMENT_POOL.length)];
  if (pick.kind === "accessory") {
    return { raw, accessoryId: pick.id };
  }
  if (pick.kind === "score") {
    return { raw, tileScoreBonus: pick.value };
  }
  return { raw, letterMultBonus: pick.value };
}
