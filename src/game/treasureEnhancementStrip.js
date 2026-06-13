/**
 * 剥离字母块「可擦除增强」：配饰与持久平面分/倍率（不含材质块类型、稀有度、万能）。
 * 玩家本关「标记」折角（`playerMarked`）不在此处理。
 */
import { entityHasAccessory } from "../accessories/accessoryState.js";
import { deckCardHasPersistedIntrinsicGain } from "./tileIntrinsicGains.js";

/** @param {object | null | undefined} tileOrCard */
export function stripEnhancementsFromTileOrDeckCard(tileOrCard) {
  const t = tileOrCard;
  if (!t || typeof t !== "object") return;
  t.accessoryId = null;
  t.treasureAccessoryId = null;
  if ("tileScoreBonus" in t) t.tileScoreBonus = 0;
  if ("letterMultBonus" in t) t.letterMultBonus = 0;
  if ("materialScoreBonus" in t) t.materialScoreBonus = 0;
  if ("materialMultBonus" in t) t.materialMultBonus = 0;
}

/** @param {object | null | undefined} tileOrCard */
export function tileHasScoringEnhancement(tileOrCard) {
  const t = tileOrCard;
  if (!t || typeof t !== "object") return false;
  if (entityHasAccessory(t)) return true;
  if (deckCardHasPersistedIntrinsicGain(t)) return true;
  if (Math.floor(Number(t.materialScoreBonus) || 0) !== 0) return true;
  if (Math.floor(Number(t.materialMultBonus) || 0) !== 0) return true;
  return false;
}

/** @param {readonly object[] | null | undefined} tiles */
export function countScoringEnhancementsInTiles(tiles) {
  if (!Array.isArray(tiles)) return 0;
  let n = 0;
  for (const t of tiles) {
    if (tileHasScoringEnhancement(t)) n += 1;
  }
  return n;
}

/**
 * 提交计分用 tile 可能是棋盘格的浅拷贝；解析真实格后再判可擦除增强（含计分板/回形针持久平面分/倍率）。
 * @param {object | null | undefined} scoringTile
 * @param {object | null | undefined} [realTile]
 */
export function submitScoringTileHasEnhancement(scoringTile, realTile = null) {
  const real = realTile && typeof realTile === "object" ? realTile : null;
  const scoring = scoringTile && typeof scoringTile === "object" ? scoringTile : null;
  if (real && tileHasScoringEnhancement(real)) return true;
  if (scoring && tileHasScoringEnhancement(scoring)) return true;
  const deckCard = real?._deckCard ?? scoring?._deckCard;
  if (deckCard && typeof deckCard === "object" && tileHasScoringEnhancement(deckCard)) return true;
  return false;
}
