import { dictionaryPosMatchesTreasureLevelKey } from "../game/wordPosMatch.js";
import { isVowelLetterWithMask } from "./treasureLetterClassify.js";
import { normalizeLetterChar } from "./treasureLifecycleShared.js";

const VOWEL_KEYS = Object.freeze(["a", "e", "i", "o", "u"]);

/** @param {import('./treasureRunState.js').TreasureRunState} rs */
function ensureChapterPosSet(rs) {
  if (!(rs.chapterPosSpelledThisChapter instanceof Set)) {
    rs.chapterPosSpelledThisChapter = new Set();
  }
  return rs.chapterPosSpelledThisChapter;
}

/** @param {import('./treasureRunState.js').TreasureRunState} rs */
function ensureLevelVowelSet(rs) {
  if (!(rs.levelVowelsUsedThisLevel instanceof Set)) {
    rs.levelVowelsUsedThisLevel = new Set();
  }
  return rs.levelVowelsUsedThisLevel;
}

/**
 * 大关切换时结算上一章词性解锁并清空本章计数。
 * @param {import('./treasureRunState.js').TreasureRunState} rs
 * @param {number} newChapter
 */
export function onTreasureRunChapterEnter(rs, newChapter) {
  if (!rs) return;
  const prev = rs.lastChapterNumber;
  if (prev !== newChapter) {
    const spelled = rs.chapterPosSpelledThisChapter;
    if (spelled instanceof Set) {
      if (!spelled.has("n")) rs.chapterNoNounUnlocked = true;
      if (!spelled.has("adj")) rs.chapterNoAdjUnlocked = true;
      if (!spelled.has("v")) rs.chapterNoVerbUnlocked = true;
    }
    rs.chapterPosSpelledThisChapter = new Set();
  }
}

/** @param {import('./treasureRunState.js').TreasureRunState} rs */
export function resetTreasureLevelTracking(rs) {
  if (!rs) return;
  rs.levelVowelsUsedThisLevel = new Set();
  rs.levelFirstFullWordDiscardDone = false;
  rs.levelStartLegendaryInDeckCount = 0;
}

/** @param {unknown[]} deck */
function countLegendaryInDeck(deck) {
  let n = 0;
  for (const c of deck ?? []) {
    if (c && typeof c === "object" && /** @type {{ rarity?: string }} */ (c).rarity === "legendary") {
      n += 1;
    }
  }
  return n;
}

/**
 * 小关开局：记录牌库中传说字母块数量，供「用尽传说字母」解锁判定。
 * @param {import('./treasureRunState.js').TreasureRunState} rs
 * @param {unknown[]} deck
 */
export function beginLevelLegendaryDeckTracking(rs, deck) {
  if (!rs) return;
  rs.levelStartLegendaryInDeckCount = countLegendaryInDeck(deck);
}

/**
 * 小关结束或牌库变化后：若开局有传说字母且当前牌库已无传说，则解锁银行宝藏前置。
 * @param {import('./treasureRunState.js').TreasureRunState} rs
 * @param {unknown[]} deck
 */
export function checkLevelLegendaryDeckExhaustedUnlock(rs, deck) {
  if (!rs || rs.levelAllLegendaryDeckExhaustedUnlocked) return;
  const start = Math.max(0, Math.floor(Number(rs.levelStartLegendaryInDeckCount) || 0));
  if (start <= 0) return;
  if (countLegendaryInDeck(deck) <= 0) rs.levelAllLegendaryDeckExhaustedUnlocked = true;
}

/**
 * @param {readonly (null | { treasureAccessoryId?: string | null, treasureAccessoryIds?: unknown })[]} ownedSlots
 */
export function countOwnedTreasuresWithAccessory(ownedSlots) {
  let n = 0;
  for (const s of ownedSlots ?? []) {
    if (!s) continue;
    const ids = Array.isArray(s.treasureAccessoryIds)
      ? s.treasureAccessoryIds.map((x) => String(x ?? "").trim()).filter(Boolean)
      : s.treasureAccessoryId != null && String(s.treasureAccessoryId).trim()
        ? [String(s.treasureAccessoryId).trim()]
        : [];
    if (ids.length > 0) n += 1;
  }
  return n;
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState} rs
 * @param {readonly (null | { treasureAccessoryId?: string | null, treasureAccessoryIds?: unknown })[]} ownedSlots
 */
export function noteEverTwoTreasuresWithAccessoryUnlocked(rs, ownedSlots) {
  if (!rs || rs.everTwoTreasuresWithAccessoryUnlocked) return;
  if (countOwnedTreasuresWithAccessory(ownedSlots) >= 2) {
    rs.everTwoTreasuresWithAccessoryUnlocked = true;
  }
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState} rs
 * @param {string} word
 * @param {(w: string) => { pos?: string } | null | undefined} getWordDefinition
 */
export function recordTreasureChapterWordPos(rs, word, getWordDefinition) {
  if (!rs) return;
  const w = String(word ?? "").toLowerCase().trim();
  if (!w) return;
  const def = getWordDefinition?.(w);
  const pos = def?.pos;
  const translationZh = def?.translation_zh;
  const set = ensureChapterPosSet(rs);
  if (dictionaryPosMatchesTreasureLevelKey(pos, "n", translationZh)) set.add("n");
  if (dictionaryPosMatchesTreasureLevelKey(pos, "adj", translationZh)) set.add("adj");
  if (dictionaryPosMatchesTreasureLevelKey(pos, "v", translationZh)) set.add("v");
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState} rs
 * @param {{ letter?: string }[]} letters
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 */
export function recordTreasureLevelVowelLetters(rs, letters, ownedSlotTreasureIds) {
  if (!rs) return;
  const set = ensureLevelVowelSet(rs);
  for (const p of letters ?? []) {
    const ch = normalizeLetterChar(p?.letter);
    if (ch && isVowelLetterWithMask(ch, ownedSlotTreasureIds) && VOWEL_KEYS.includes(ch)) {
      set.add(ch);
    }
  }
  if (set.size >= 5) rs.levelAllFiveVowelsUnlocked = true;
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState} rs
 * @param {{ letter?: string }[]} lettersInOrder
 * @param {(w: string) => object | null | undefined} resolveWord
 */
export function recordTreasureDiscardWord(rs, lettersInOrder, resolveWord) {
  if (!rs) return;
  const chars = (lettersInOrder ?? [])
    .map((p) => String(p?.letter ?? "").toLowerCase())
    .join("");
  if (!chars) return;
  const def = resolveWord(chars);
  if (!def) return;
  rs.everDiscardedFullWord = true;
  if (chars.length >= 7) rs.everDiscardedWordLen7Plus = true;
}

/** @param {import('./treasureRunState.js').TreasureRunState} rs @param {number} n */
export function addTreasureRunLettersDiscarded(rs, n) {
  if (!rs) return;
  rs.runLettersDiscardedTotal += Math.max(0, Math.floor(Number(n) || 0));
}

/** @param {import('./treasureRunState.js').TreasureRunState} rs */
export function noteTreasureRunSpellCast(rs) {
  if (!rs) return;
  rs.runSpellsCastCount += 1;
}

/**
 * @param {number} minLen
 * @param {number} maxLen
 * @returns {number}
 */
export function countLengthUpgradeRangeSteps(minLen, maxLen) {
  const min = Math.floor(Number(minLen) || 0);
  const max = Math.floor(Number(maxLen) || 0);
  return Math.max(0, max - min + 1);
}

/** @param {import('./treasureRunState.js').TreasureRunState} rs @param {number} [count=1] */
export function noteTreasureRunUpgradeUsed(rs, count = 1) {
  if (!rs) return;
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n <= 0) return;
  rs.runUpgradesUsedCount += n;
}

/**
 * 记录本局主动加入牌库的字母块稀有度（商店购入、法术、宝藏追加等；初始牌库不计）。
 * @param {import('./treasureRunState.js').TreasureRunState} rs
 * @param {readonly unknown[]} cards
 */
export function recordTreasureRunDeckCardsAdded(rs, cards) {
  if (!rs) return;
  if (!(rs.runDeckAddedRarities instanceof Set)) {
    rs.runDeckAddedRarities = new Set();
  }
  for (const card of cards ?? []) {
    if (!card || typeof card !== "object") continue;
    const rarity = String(/** @type {{ rarity?: string }} */ (card).rarity ?? "").trim();
    if (rarity) rs.runDeckAddedRarities.add(rarity);
  }
}

/**
 * @param {readonly (null | { treasureAccessoryId?: string | null })[]} ownedSlots
 */
export function checkAllOwnedTreasuresHaveAccessory(ownedSlots) {
  const filled = (ownedSlots ?? []).filter(Boolean);
  if (!filled.length) return false;
  return filled.every((s) => String(s?.treasureAccessoryId ?? "").trim() !== "");
}
