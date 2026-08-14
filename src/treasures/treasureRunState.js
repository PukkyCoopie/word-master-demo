/** 整局宝藏运行时状态（计分银行、关卡内计数、解锁标志） */

import { addScore, deserializeScore } from "../utils/scoreInteger.js";

/** @typedef {{ multAdd: number, multMul: number, scoreAdd: import('../utils/scoreInteger.js').ScoreValue, posPackProgress?: number }} TreasureIdBank */

/** 全局 run 银行（按 treasureId）；目前仅海浪（143）等作用于全局材质池的宝藏 */
export const GLOBAL_TREASURE_BANK_IDS = Object.freeze(new Set(["143"]));

/** @param {string | null | undefined} treasureId */
export function isGlobalTreasureBank(treasureId) {
  return GLOBAL_TREASURE_BANK_IDS.has(String(treasureId ?? "").trim());
}

/** @returns {TreasureIdBank} */
export function createDefaultTreasureBank() {
  return { multAdd: 0, multMul: 1, scoreAdd: 0 };
}

/** @param {unknown} raw @returns {TreasureIdBank} */
export function normalizeTreasureBank(raw) {
  const base = createDefaultTreasureBank();
  if (!raw || typeof raw !== "object") return base;
  const o = /** @type {Record<string, unknown>} */ (raw);
  base.multAdd = Number(o.multAdd) || 0;
  const m = Number(o.multMul);
  base.multMul = m > 0 ? m : 1;
  // 勿 Number(巨大分)：会变成 Infinity，提交计分 BigInt(Infinity) 会抛错
  base.scoreAdd = deserializeScore(
    /** @type {import('../utils/scoreInteger.js').ScoreValue | null | undefined} */ (o.scoreAdd),
  );
  if (o.posPackProgress != null) {
    base.posPackProgress = Math.max(0, Math.floor(Number(o.posPackProgress) || 0));
  }
  return base;
}

/** @typedef {Object} TreasureRunState
 * @property {Record<string, TreasureIdBank>} banks 全局银行（仅 {@link GLOBAL_TREASURE_BANK_IDS}）
 * @property {Set<number>} levelLengthsSpelled
 * @property {boolean} levelFirstWordSubmitted
 * @property {number | null} levelFirstWordLength
 * @property {boolean} treasure29SelfDestructed
 * @property {boolean} probabilityEffectTriggered
 * @property {boolean} volcano54Erupted 火山（54）本局是否已喷发（仅喷发一次）
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
 * @property {boolean} levelAllLegendaryDeckExhaustedUnlocked 曾在一个小关内用尽字母库中所有传说字母
 * @property {number} levelStartLegendaryInDeckCount 本小关开局字母库中传说字母块数量（追踪用尽解锁）
 * @property {boolean} runIceMaterialShattered 本局曾使碎冰块碎裂
 * @property {boolean} everTwoTreasuresWithAccessoryUnlocked 曾同时拥有 2 个装备了配饰的宝藏（卖出不影响）
 * @property {boolean} levelFirstFullWordDiscardDone 本小关是否已因首次弃完整词升级过长度
 * @property {boolean} levelFirstDiscardBatchDone 本小关是否已发生过第一次丢弃（手枪等仅首弃触发）
 * @property {boolean} everDiscardedFullWord 本局是否弃过完整单词
 * @property {boolean} everDiscardedWordLen7Plus 本局是否弃过 7 字母及以上完整单词
 * @property {boolean} soldBlueprintTreasure98 本局是否卖出过面具（98）
 * @property {number} runSpellsCastCount 本局已释放法术次数
 * @property {number} runUpgradesUsedCount 本局已使用升级次数
 * @property {Set<string>} runDeckAddedRarities 本局主动加入字母库的字母块已覆盖的稀有度（初始字母库不计）
 * @property {number} runLettersDiscardedTotal 本局累计弃掉字母块数
 * @property {boolean} shopUpgradesFree 商店升级/升级包免费（宝藏 110）
 * @property {string | null} lastSpellIdBeforeShopLeave 离店前最后一次释放的法术 id（宝藏 117）
 * @property {number} runLuckyTriggerCount 本局幸运块效果成功触发次数（宝藏 128）
 * @property {boolean} levelBossRestrictionSuppressed 本小关 Boss 限制已消除（宝藏 136 卖出）
 * @property {boolean} level137BonusApplied 本小关已消耗电池储存分（宝藏 137）
 * @property {Set<string>} level139FaxCopyContributions 传真机（139）本关已消耗的「首次拼写」hook 贡献键（实体/面具蓝图各计一次；无增强可复制时也记入）
 * @property {number} [ownedSlotBankRevision] 槽位 bank 就地变更计数（供宝藏栏充能/失效态 computed 追踪）
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
    volcano54Erupted: false,
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
    levelAllLegendaryDeckExhaustedUnlocked: false,
    levelStartLegendaryInDeckCount: 0,
    runIceMaterialShattered: false,
    everTwoTreasuresWithAccessoryUnlocked: false,
    levelFirstFullWordDiscardDone: false,
    levelFirstDiscardBatchDone: false,
    everDiscardedFullWord: false,
    everDiscardedWordLen7Plus: false,
    soldBlueprintTreasure98: false,
    runSpellsCastCount: 0,
    runUpgradesUsedCount: 0,
    runDeckAddedRarities: new Set(),
    runLettersDiscardedTotal: 0,
    shopUpgradesFree: false,
    lastSpellIdBeforeShopLeave: null,
    runLuckyTriggerCount: 0,
    levelBossRestrictionSuppressed: false,
    level137BonusApplied: false,
    level139FaxCopyContributions: new Set(),
    ownedSlotBankRevision: 0,
  };
}

/** @param {TreasureRunState | null | undefined} state */
export function bumpOwnedSlotBankRevision(state) {
  if (!state) return;
  state.ownedSlotBankRevision = Math.max(0, Math.floor(Number(state.ownedSlotBankRevision) || 0)) + 1;
}

/** @param {TreasureRunState} state */
export function bumpRunLuckyTriggerCount(state) {
  if (!state) return;
  state.runLuckyTriggerCount = Math.max(0, Math.floor(Number(state.runLuckyTriggerCount) || 0)) + 1;
}

/** @param {TreasureRunState} state @param {string} treasureId */
export function ensureGlobalTreasureBank(state, treasureId) {
  const id = String(treasureId);
  if (!isGlobalTreasureBank(id)) {
    throw new Error(`ensureGlobalTreasureBank: treasure ${id} is not global-bank`);
  }
  if (!state.banks[id]) {
    state.banks[id] = createDefaultTreasureBank();
  }
  return state.banks[id];
}

/** @param {Record<string, unknown> | null | undefined} slot */
export function ensureOwnedSlotBank(slot) {
  if (!slot || typeof slot !== "object") return createDefaultTreasureBank();
  if (!slot.bank || typeof slot.bank !== "object") {
    slot.bank = createDefaultTreasureBank();
    return /** @type {TreasureIdBank} */ (slot.bank);
  }
  const bank = /** @type {TreasureIdBank} */ (slot.bank);
  const normalized = normalizeTreasureBank(bank);
  bank.multAdd = normalized.multAdd;
  bank.multMul = normalized.multMul;
  bank.scoreAdd = normalized.scoreAdd;
  if (normalized.posPackProgress != null) {
    bank.posPackProgress = normalized.posPackProgress;
  }
  return bank;
}

/**
 * 旧存档：`banks[treasureId]` → 首个同 id 槽位的 `bank`；全局 id 保留在 runState.banks。
 * @param {TreasureRunState} state
 * @param {(Record<string, unknown> | null | undefined)[]} ownedSlots
 */
export function migrateLegacyTreasureBanks(state, ownedSlots) {
  if (!state?.banks || typeof state.banks !== "object") return;
  const slots = ownedSlots ?? [];
  /** @type {Record<string, TreasureIdBank>} */
  const nextGlobal = {};
  for (const [key, raw] of Object.entries(state.banks)) {
    if (isGlobalTreasureBank(key)) {
      nextGlobal[key] = normalizeTreasureBank(raw);
      continue;
    }
    if (!/^\d+$/.test(key)) continue;
    const bank = normalizeTreasureBank(raw);
    let assigned = false;
    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      if (!slot || String(slot.treasureId ?? "") !== key) continue;
      if (slot.bank && typeof slot.bank === "object") {
        assigned = true;
        break;
      }
      slot.bank = bank;
      assigned = true;
      break;
    }
    if (!assigned && isGlobalTreasureBank(key)) {
      nextGlobal[key] = bank;
    }
  }
  state.banks = nextGlobal;
  for (const slot of slots) {
    if (slot?.bank) slot.bank = normalizeTreasureBank(slot.bank);
  }
}

/**
 * 旧存档：`extraLetterScoreWordsRemaining` → 首个旋钮（64）槽位的 `bank.scoreAdd`。
 * @param {TreasureRunState} state
 * @param {(Record<string, unknown> | null | undefined)[]} ownedSlots
 */
export function migrateLegacyKnobWordsRemaining(state, ownedSlots) {
  const legacy = Math.max(0, Math.floor(Number(state.extraLetterScoreWordsRemaining) || 0));
  if (legacy <= 0) return;
  const slots = ownedSlots ?? [];
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    if (!slot || String(slot.treasureId ?? "") !== "64") continue;
    const bank = ensureOwnedSlotBank(slot);
    if (Math.max(0, Math.floor(Number(bank.scoreAdd) || 0)) > 0) return;
    bank.scoreAdd = legacy;
    state.extraLetterScoreWordsRemaining = 0;
    return;
  }
}

/**
 * 旧存档：`deckState.basketballWordsSubmitted` → 各篮球（20）槽 `bank.posPackProgress`（仅 progress 仍为 0 的槽）。
 * @param {(Record<string, unknown> | null | undefined)[]} ownedSlots
 * @param {number} legacyWordsSubmitted
 */
export function migrateLegacyBasketballWordsSubmitted(ownedSlots, legacyWordsSubmitted) {
  const legacy = Math.max(0, Math.floor(Number(legacyWordsSubmitted) || 0));
  if (legacy <= 0) return;
  const slots = ownedSlots ?? [];
  for (const slot of slots) {
    if (!slot || String(slot.treasureId ?? "") !== "20") continue;
    const bank = ensureOwnedSlotBank(slot);
    if (Math.max(0, Math.floor(Number(bank.posPackProgress) || 0)) > 0) continue;
    bank.posPackProgress = legacy;
  }
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
  state.levelFirstDiscardBatchDone = false;
  state.levelBossRestrictionSuppressed = false;
  state.level137BonusApplied = false;
  state.level139FaxCopyContributions = new Set();
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
