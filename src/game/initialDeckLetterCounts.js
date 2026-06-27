/**
 * 初始牌库各字母张数（与 `useGameState` 的 `buildInitialDeckCards` 一致）。
 */
import { RARITY_BY_LETTER } from "../composables/useScoring.js";

const VOWEL_LETTERS = new Set(["a", "e", "i", "o", "u"]);

/** 元音张数按英文频率大致分层：E 最高，U 最低（较基础版略多，便于组词） */
export const VOWEL_DECK_COUNT = Object.freeze({
  e: 9,
  a: 7,
  o: 7,
  i: 7,
  u: 6,
});

/** 非元音 common / rare / epic / legendary 的默认张数 */
const RARITY_DECK_COUNT = Object.freeze({
  common: 3,
  rare: 2,
  epic: 1,
  legendary: 1,
});

/**
 * @param {string} raw 小写；`q` 表示 Qu
 * @returns {number}
 */
export function getInitialDeckLetterCount(raw) {
  let r = String(raw ?? "").toLowerCase();
  if (r === "qu") r = "q";
  if (VOWEL_LETTERS.has(r) && VOWEL_DECK_COUNT[r] != null) {
    return VOWEL_DECK_COUNT[r];
  }
  for (const [rarity, letters] of Object.entries(RARITY_BY_LETTER)) {
    if (letters.includes(r)) {
      return RARITY_DECK_COUNT[rarity] ?? 1;
    }
  }
  return 1;
}

/** @returns {string[]} */
export function allLetterRaws() {
  /** @type {string[]} */
  const out = [];
  for (const letters of Object.values(RARITY_BY_LETTER)) {
    for (const x of letters) out.push(x);
  }
  return out;
}

/** @returns {string[]} */
export function allVowelRaws() {
  return Object.keys(VOWEL_DECK_COUNT);
}

/** @returns {string[]} */
export function allConsonantRaws() {
  return allLetterRaws().filter((raw) => !VOWEL_LETTERS.has(raw));
}
