import {
  evaluateBossSoftWordViolation,
  getEndingLetterRarityFromTiles,
} from "../game/bossWordViolation.js";

/**
 * @typedef {import('./gridWordFinder.js').WordPick} WordPick
 * @typedef {{ slug: string, usedLengthsThisBoss: Set<number>, mouthLockedLength: number | null, clubRequiredKey: string | null, getWordDefinition: (w: string) => { pos?: string } | null | undefined, getJudgedLength: (rawLen: number) => number }} BossPlayContext
 */

/**
 * @param {WordPick} pick
 * @param {BossPlayContext} boss
 * @param {(row: number, col: number) => { rarity?: string } | null | undefined} getTileAt
 */
export function isPickLegalForBoss(pick, boss, getTileAt) {
  const slug = String(boss?.slug ?? "");
  if (!slug || !pick?.word) return true;

  const tiles = pick.path.map(({ row, col }) => getTileAt(row, col) ?? { rarity: "common" });
  const judgedLen = boss.getJudgedLength(pick.word.length);
  const soft = evaluateBossSoftWordViolation({
    slug,
    wordLen: judgedLen,
    resolvedWord: pick.word,
    endingLetterRarity: getEndingLetterRarityFromTiles(tiles),
    getWordDefinition: boss.getWordDefinition,
    usedLengthsThisLevel: boss.usedLengthsThisBoss,
    mouthLockedLength: boss.mouthLockedLength,
    clubRequiredKey: boss.clubRequiredKey,
  });
  return !soft.violated;
}

/**
 * @param {WordPick} pick
 * @param {BossPlayContext} boss
 */
export function bossViolationReasonForPick(pick, boss, getTileAt) {
  const slug = String(boss?.slug ?? "");
  if (!slug || !pick?.word) return "";
  const tiles = pick.path.map(({ row, col }) => getTileAt(row, col) ?? { rarity: "common" });
  const judgedLen = boss.getJudgedLength(pick.word.length);
  const soft = evaluateBossSoftWordViolation({
    slug,
    wordLen: judgedLen,
    resolvedWord: pick.word,
    endingLetterRarity: getEndingLetterRarityFromTiles(tiles),
    getWordDefinition: boss.getWordDefinition,
    usedLengthsThisLevel: boss.usedLengthsThisBoss,
    mouthLockedLength: boss.mouthLockedLength,
    clubRequiredKey: boss.clubRequiredKey,
  });
  return soft.violated ? soft.reason : "";
}
