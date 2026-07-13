/**
 * 剥离字母块「可擦除增强」：材质块、配饰、持久平面分/倍率（不含稀有度、玩家本关标记折角）。
 */
import { writeEntityAccessory } from "../accessories/accessoryState.js";
import { isUndeformedWildcardLetter, isWildcardMaterialTile } from "../composables/useScoring.js";
import { deckCardHasEnhancement } from "../treasures/treasureDeckEnhancement.js";

/**
 * 万能块擦除前：把本词计分快照里已解析的字母写回 live 格（避免仍为 `?` 时 sync 落回变形前 raw）。
 * @param {object | null | undefined} liveTile
 * @param {object | null | undefined} scoringSnapshot
 */
export function commitWildcardMorphBeforeEnhancementStrip(liveTile, scoringSnapshot) {
  if (!liveTile || typeof liveTile !== "object") return;
  const snap =
    scoringSnapshot && typeof scoringSnapshot === "object" ? scoringSnapshot : liveTile;
  if (!isWildcardMaterialTile(liveTile) && !isWildcardMaterialTile(snap)) return;
  const letter = String(snap.letter ?? "").trim();
  if (isUndeformedWildcardLetter(letter)) return;
  liveTile.letter = letter;
  if (snap.rarity != null) liveTile.rarity = snap.rarity;
  if (snap.baseScore != null) liveTile.baseScore = snap.baseScore;
}

/** @param {object | null | undefined} tileOrCard */
export function stripEnhancementsFromTileOrDeckCard(tileOrCard) {
  const t = tileOrCard;
  if (!t || typeof t !== "object") return;
  writeEntityAccessory(t, null);
  t.materialId = null;
  t.isWildcard = false;
  if ("tileScoreBonus" in t) t.tileScoreBonus = 0;
  if ("letterMultBonus" in t) t.letterMultBonus = 0;
  if ("materialScoreBonus" in t) t.materialScoreBonus = 0;
  if ("materialMultBonus" in t) t.materialMultBonus = 0;
}

/** @param {object | null | undefined} tileOrCard */
export function tileHasScoringEnhancement(tileOrCard) {
  if (deckCardHasEnhancement(tileOrCard)) return true;
  const t = tileOrCard;
  if (!t || typeof t !== "object") return false;
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

/**
 * 本词提交字母是否「带有增益」（海绵擦除、传真机复制等共用）。
 * 须在逐字母计分写回角标/配饰后再调用；按 tile / 真实格 / `_deckCard` 当前状态判定，不按宝藏栏 id 硬编码。
 * @param {{ resolveSubmitTileAtIndex?: (index: number, scoringTile?: object | null) => object | null }} [ctx]
 * @param {number} index 词槽索引
 * @param {object | null | undefined} scoringTile
 */
export function submitWordTileHasEnhancement(ctx, index, scoringTile) {
  if (scoringTile?.bossTileDebuffed === true) return false;
  const real = ctx?.resolveSubmitTileAtIndex?.(index, scoringTile) ?? null;
  return submitScoringTileHasEnhancement(scoringTile, real);
}
