import { createTreasureRunState } from "../treasures/treasureRunState.js";

/** @param {import('../treasures/treasureRunState.js').TreasureRunState} state */
export function serializeTreasureRunState(state) {
  if (!state || typeof state !== "object") return null;
  return {
    banks: JSON.parse(JSON.stringify(state.banks ?? {})),
    levelLengthsSpelled: [...(state.levelLengthsSpelled ?? [])],
    levelFirstWordSubmitted: !!state.levelFirstWordSubmitted,
    levelFirstWordLength: state.levelFirstWordLength ?? null,
    treasure29SelfDestructed: !!state.treasure29SelfDestructed,
    probabilityEffectTriggered: !!state.probabilityEffectTriggered,
    playedAllGoldWord: !!state.playedAllGoldWord,
    allCommonBossClearRecorded: !!state.allCommonBossClearRecorded,
    chapterAllDiscardsExhausted: !!state.chapterAllDiscardsExhausted,
    discardExhaustedSubsThisChapter: [...(state.discardExhaustedSubsThisChapter ?? [])],
    extraLetterScoreWordsRemaining: Math.max(0, Math.floor(Number(state.extraLetterScoreWordsRemaining) || 0)),
    discardLetterGroupIndex: Math.max(0, Math.floor(Number(state.discardLetterGroupIndex) || 0)),
    lastChapterNumber: Math.max(1, Math.floor(Number(state.lastChapterNumber) || 1)),
    levelPosTargetKey: state.levelPosTargetKey ?? null,
    rotatingRarityMultIndex: Math.max(0, Math.floor(Number(state.rotatingRarityMultIndex) || 0)),
    bigramTargetPair: state.bigramTargetPair ?? null,
    levelDiscardsUsed: !!state.levelDiscardsUsed,
    shopFreeRerollsRemaining: Math.max(0, Math.floor(Number(state.shopFreeRerollsRemaining) || 0)),
    jokerForcedDrawUid: state.jokerForcedDrawUid ?? null,
    chapterPosSpelledThisChapter: [...(state.chapterPosSpelledThisChapter ?? [])],
    chapterNoNounUnlocked: !!state.chapterNoNounUnlocked,
    chapterNoAdjUnlocked: !!state.chapterNoAdjUnlocked,
    chapterNoVerbUnlocked: !!state.chapterNoVerbUnlocked,
    levelVowelsUsedThisLevel: [...(state.levelVowelsUsedThisLevel ?? [])],
    levelAllFiveVowelsUnlocked: !!state.levelAllFiveVowelsUnlocked,
    levelFirstFullWordDiscardDone: !!state.levelFirstFullWordDiscardDone,
    everDiscardedFullWord: !!state.everDiscardedFullWord,
    everDiscardedWordLen7Plus: !!state.everDiscardedWordLen7Plus,
    soldBlueprintTreasure98: !!state.soldBlueprintTreasure98,
    runSpellsCastCount: Math.max(0, Math.floor(Number(state.runSpellsCastCount) || 0)),
    runUpgradesUsedCount: Math.max(0, Math.floor(Number(state.runUpgradesUsedCount) || 0)),
    runDeckAddedRarities: [...(state.runDeckAddedRarities ?? [])],
    runLettersDiscardedTotal: Math.max(0, Math.floor(Number(state.runLettersDiscardedTotal) || 0)),
    shopUpgradesFree: !!state.shopUpgradesFree,
    lastSpellIdBeforeShopLeave: state.lastSpellIdBeforeShopLeave ?? null,
  };
}

/** @param {unknown} raw */
export function deserializeTreasureRunState(raw) {
  const base = createTreasureRunState();
  if (!raw || typeof raw !== "object") return base;
  const o = /** @type {Record<string, unknown>} */ (raw);
  base.banks = o.banks && typeof o.banks === "object" ? /** @type {typeof base.banks} */ (JSON.parse(JSON.stringify(o.banks))) : {};
  base.levelLengthsSpelled = new Set(
    Array.isArray(o.levelLengthsSpelled) ? o.levelLengthsSpelled.map((n) => Math.floor(Number(n) || 0)) : [],
  );
  base.levelFirstWordSubmitted = !!o.levelFirstWordSubmitted;
  base.levelFirstWordLength = o.levelFirstWordLength != null ? Math.floor(Number(o.levelFirstWordLength)) : null;
  base.treasure29SelfDestructed = !!o.treasure29SelfDestructed;
  base.probabilityEffectTriggered = !!o.probabilityEffectTriggered;
  base.playedAllGoldWord = !!o.playedAllGoldWord;
  base.allCommonBossClearRecorded = !!o.allCommonBossClearRecorded;
  base.chapterAllDiscardsExhausted = !!o.chapterAllDiscardsExhausted;
  base.discardExhaustedSubsThisChapter = new Set(
    Array.isArray(o.discardExhaustedSubsThisChapter)
      ? o.discardExhaustedSubsThisChapter.map((n) => Math.floor(Number(n) || 0))
      : [],
  );
  base.extraLetterScoreWordsRemaining = Math.max(0, Math.floor(Number(o.extraLetterScoreWordsRemaining) || 0));
  base.discardLetterGroupIndex = Math.max(0, Math.floor(Number(o.discardLetterGroupIndex) || 0));
  base.lastChapterNumber = Math.max(1, Math.floor(Number(o.lastChapterNumber) || 1));
  base.levelPosTargetKey = o.levelPosTargetKey != null ? String(o.levelPosTargetKey) : null;
  base.rotatingRarityMultIndex = Math.max(0, Math.floor(Number(o.rotatingRarityMultIndex) || 0));
  base.bigramTargetPair = o.bigramTargetPair != null ? String(o.bigramTargetPair) : null;
  base.levelDiscardsUsed = !!o.levelDiscardsUsed;
  base.shopFreeRerollsRemaining = Math.max(0, Math.floor(Number(o.shopFreeRerollsRemaining) || 0));
  base.jokerForcedDrawUid = o.jokerForcedDrawUid != null ? Math.floor(Number(o.jokerForcedDrawUid)) : null;
  base.chapterPosSpelledThisChapter = new Set(
    Array.isArray(o.chapterPosSpelledThisChapter) ? o.chapterPosSpelledThisChapter.map(String) : [],
  );
  base.chapterNoNounUnlocked = !!o.chapterNoNounUnlocked;
  base.chapterNoAdjUnlocked = !!o.chapterNoAdjUnlocked;
  base.chapterNoVerbUnlocked = !!o.chapterNoVerbUnlocked;
  base.levelVowelsUsedThisLevel = new Set(
    Array.isArray(o.levelVowelsUsedThisLevel) ? o.levelVowelsUsedThisLevel.map(String) : [],
  );
  base.levelAllFiveVowelsUnlocked = !!o.levelAllFiveVowelsUnlocked;
  base.levelFirstFullWordDiscardDone = !!o.levelFirstFullWordDiscardDone;
  base.everDiscardedFullWord = !!o.everDiscardedFullWord;
  base.everDiscardedWordLen7Plus = !!o.everDiscardedWordLen7Plus;
  base.soldBlueprintTreasure98 = !!o.soldBlueprintTreasure98;
  base.runSpellsCastCount = Math.max(0, Math.floor(Number(o.runSpellsCastCount) || 0));
  base.runUpgradesUsedCount = Math.max(0, Math.floor(Number(o.runUpgradesUsedCount) || 0));
  base.runDeckAddedRarities = new Set(
    Array.isArray(o.runDeckAddedRarities) ? o.runDeckAddedRarities.map(String) : [],
  );
  base.runLettersDiscardedTotal = Math.max(0, Math.floor(Number(o.runLettersDiscardedTotal) || 0));
  base.shopUpgradesFree = !!o.shopUpgradesFree;
  base.lastSpellIdBeforeShopLeave = o.lastSpellIdBeforeShopLeave != null ? String(o.lastSpellIdBeforeShopLeave) : null;
  return base;
}
