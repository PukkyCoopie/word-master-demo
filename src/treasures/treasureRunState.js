/** 整局宝藏运行时状态（计分银行、关卡内计数、解锁标志） */

/** @typedef {{ multAdd: number, multMul: number, scoreAdd: number }} TreasureIdBank */

/** @typedef {Object} TreasureRunState
 * @property {Record<string, TreasureIdBank>} banks
 * @property {Set<number>} levelLengthsSpelled
 * @property {boolean} levelFirstWordSubmitted
 * @property {number | null} levelFirstWordLength
 * @property {boolean} treasure29SelfDestructed
 * @property {boolean} probabilityEffectTriggered
 * @property {boolean} playedAllGoldWord
 * @property {boolean} allCommonBossClearRecorded
 * @property {boolean} chapterAllDiscardsExhausted
 * @property {Set<number>} discardExhaustedSubsThisChapter 本大关内哪些小关曾用尽丢弃
 * @property {number} extraLetterScoreWordsRemaining
 * @property {number} discardLetterGroupIndex
 * @property {number} lastChapterNumber
 * @property {string | null} levelPosTargetKey 词性宝藏：本小关目标词性 `n` | `v` | `adj`
 * @property {number} lettersScoredCount 整局累计计分字母数（每词按格数累加）
 * @property {number} rotatingRarityMultIndex 轮换稀有度倍率档位 0..3
 * @property {string | null} bigramTargetPair 两字母 bigram，如 "na"
 * @property {boolean} levelDiscardsUsed 本小关是否使用过丢弃
 * @property {number} shopFreeRerollsRemaining 本段商店停留内剩余免费刷新次数（小票等）
 * @property {number | null} jokerForcedDrawUid 鬼牌：下一局 buildGrid 首抽强制牌张 _dcUid
 */

/** @type {readonly string[]} */
export const DISCARD_LETTER_GROUPS = Object.freeze([
  "abcde",
  "fghij",
  "klmno",
  "pqrst",
  "uvwxyz",
]);

/** @returns {TreasureRunState} */
export function createTreasureRunState() {
  return {
    banks: {},
    levelLengthsSpelled: new Set(),
    levelFirstWordSubmitted: false,
    levelFirstWordLength: null,
    treasure29SelfDestructed: false,
    probabilityEffectTriggered: false,
    playedAllGoldWord: false,
    allCommonBossClearRecorded: false,
    chapterAllDiscardsExhausted: false,
    discardExhaustedSubsThisChapter: new Set(),
    extraLetterScoreWordsRemaining: 0,
    discardLetterGroupIndex: Math.floor(Math.random() * DISCARD_LETTER_GROUPS.length),
    lastChapterNumber: 1,
    levelPosTargetKey: null,
    lettersScoredCount: 0,
    rotatingRarityMultIndex: 0,
    bigramTargetPair: null,
    levelDiscardsUsed: false,
    shopFreeRerollsRemaining: 0,
    jokerForcedDrawUid: null,
  };
}

/** @param {TreasureRunState} state @param {string} treasureId */
export function ensureTreasureBank(state, treasureId) {
  const id = String(treasureId);
  if (!state.banks[id]) {
    state.banks[id] = { multAdd: 0, multMul: 1, scoreAdd: 0 };
  }
  return state.banks[id];
}

/** @param {TreasureRunState} state */
export function resetTreasureLevelScopedState(state) {
  state.levelLengthsSpelled = new Set();
  state.levelFirstWordSubmitted = false;
  state.levelFirstWordLength = null;
  state.levelDiscardsUsed = false;
}

/** @param {TreasureRunState} state @param {() => number} [rng] */
export function rollDiscardLetterGroupIndex(state, rng = Math.random) {
  state.discardLetterGroupIndex = Math.floor(rng() * DISCARD_LETTER_GROUPS.length);
}

/** @param {TreasureRunState} state */
export function currentDiscardLetterGroup(state) {
  const i = Math.max(0, Math.min(DISCARD_LETTER_GROUPS.length - 1, state.discardLetterGroupIndex));
  return DISCARD_LETTER_GROUPS[i];
}

/** @param {string} letter @param {TreasureRunState} state */
export function letterInCurrentDiscardGroup(letter, state) {
  const ch = String(letter ?? "").toLowerCase();
  if (!ch) return false;
  const one = ch === "qu" || ch === "q" ? "q" : ch[0];
  return currentDiscardLetterGroup(state).includes(one);
}
