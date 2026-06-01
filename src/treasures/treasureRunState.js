/** 整局宝藏运行时状态（计分银行、关卡内计数、解锁标志） */

/** @typedef {{ multAdd: number, multMul: number, scoreAdd: number, posPackProgress?: number }} TreasureIdBank */

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
 * @property {number} rotatingRarityMultIndex 轮换稀有度倍率档位 0..3
 * @property {string | null} bigramTargetPair 两字母 bigram，如 "na"
 * @property {boolean} levelDiscardsUsed 本小关是否使用过丢弃
 * @property {Set<string>} levelCoin27PaidContributions 硬币（27）本关已结算的 hook 贡献键（防重复触发）
 * @property {number} shopFreeRerollsRemaining 本段商店停留内剩余免费刷新次数（小票等）
 * @property {number | null} jokerForcedDrawUid 鬼牌：下一局 buildGrid 首抽强制牌张 _dcUid
 * @property {Set<string>} chapterPosSpelledThisChapter 本大关内已拼写过的词性 n | adj | v
 * @property {boolean} chapterNoNounUnlocked 曾完成一整大关且未拼写过名词
 * @property {boolean} chapterNoAdjUnlocked 曾完成一整大关且未拼写过形容词
 * @property {boolean} chapterNoVerbUnlocked 曾完成一整大关且未拼写过动词
 * @property {Set<string>} levelVowelsUsedThisLevel 本小关内已出现的元音字母 a–u
 * @property {boolean} levelAllFiveVowelsUnlocked 本小关内曾用齐五种元音（解锁用，跨局保留）
 * @property {boolean} levelFirstFullWordDiscardDone 本小关是否已因首次弃完整词升级过长度
 * @property {boolean} everDiscardedFullWord 本局是否弃过完整单词
 * @property {boolean} everDiscardedWordLen7Plus 本局是否弃过 7 字母及以上完整单词
 * @property {boolean} soldBlueprintTreasure98 本局是否卖出过面具（98）
 * @property {number} runSpellsCastCount 本局已释放法术次数
 * @property {number} runUpgradesUsedCount 本局已使用升级次数
 * @property {number} runLettersDiscardedTotal 本局累计弃掉字母块数
 * @property {boolean} shopUpgradesFree 商店升级/升级包免费（宝藏 110）
 * @property {string | null} lastSpellIdBeforeShopLeave 离店前最后一次释放的法术 id（宝藏 117）
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
    rotatingRarityMultIndex: 0,
    bigramTargetPair: null,
    levelDiscardsUsed: false,
    shopFreeRerollsRemaining: 0,
    jokerForcedDrawUid: null,
    chapterPosSpelledThisChapter: new Set(),
    chapterNoNounUnlocked: false,
    chapterNoAdjUnlocked: false,
    chapterNoVerbUnlocked: false,
    levelVowelsUsedThisLevel: new Set(),
    levelAllFiveVowelsUnlocked: false,
    levelFirstFullWordDiscardDone: false,
    everDiscardedFullWord: false,
    everDiscardedWordLen7Plus: false,
    soldBlueprintTreasure98: false,
    runSpellsCastCount: 0,
    runUpgradesUsedCount: 0,
    runLettersDiscardedTotal: 0,
    shopUpgradesFree: false,
    lastSpellIdBeforeShopLeave: null,
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
  state.levelCoin27PaidContributions = new Set();
  state.levelVowelsUsedThisLevel = new Set();
  state.levelFirstFullWordDiscardDone = false;
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
