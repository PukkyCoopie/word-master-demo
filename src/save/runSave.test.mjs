import test from "node:test";
import assert from "node:assert/strict";
import { createRunRng, mulberry32WithState } from "../game/runRng.js";
import { serializeTreasureRunState, deserializeTreasureRunState } from "./treasureRunStateCodec.js";
import { createTreasureRunState } from "../treasures/treasureRunState.js";
import {
  mergeRunMatchStatsIntoCareer,
  normalizeSlotCareerStats,
  recordCareerRunStarted,
} from "./slotCareerStats.js";
import {
  normalizeCollectionCareerFields,
  recordAccessoryDiscovered,
  recordMaterialDiscovered,
  recordSpellDiscovered,
  recordTreasureDiscovered,
  recordVoucherDiscovered,
  tryInsertLengthLeaderboard,
  tryInsertScoreLeaderboard,
} from "../collection/collectionCareer.js";
import { createRunMatchStats } from "../game/runMatchStats.js";
import { canSaveNow } from "./runSaveGuards.js";
import { createRunAutoSave } from "./runAutoSave.js";
import {
  createEmptySaveEnvelope,
  isContinuableRunPhase,
  SAVE_SLOT_COUNT,
} from "./runSaveSchema.js";
import {
  hasMeaningfulRunProgress,
  isAbandonedFreshRunPayload,
} from "./runSaveMeaningfulProgress.js";
import {
  serializeAchievementRunState,
  deserializeAchievementRunState,
  createAchievementRunState,
} from "../achievements/achievementRunState.js";
import { unlockAchievementId } from "../achievements/achievementUnlock.js";
import { getAchievementCollectionProgress } from "../achievements/achievementCollectionProgress.js";
import { ACHIEVEMENT_DEFINITIONS, getAchievementDef } from "../achievements/achievementDefinitions.js";
import {
  resolveTapTapIncrementCurrent,
  shouldReportTapTapIncrement,
} from "../achievements/achievementTapTapSync.js";
import { evaluateAndUnlockAchievements } from "../achievements/achievementEvaluate.js";
import { reconcileAchievementsFromPersistedCareer } from "../achievements/achievementCareerReconcile.js";
import { getLevelIndexForId } from "../achievements/achievementCareer.js";
import { applyFullCollectionUnlockToCareer } from "../dev/unlockFullCollection.js";
import {
  getCollectionTabProgress,
  getCollectionUnlockProgress,
} from "../collection/collectionProgress.js";

test("mulberry32 state roundtrip", () => {
  const core = mulberry32WithState(12345);
  core.next();
  core.next();
  const state = core.getState();
  const third = core.next();
  const core2 = mulberry32WithState(99999);
  core2.setState(state);
  assert.equal(core2.next(), third);
});

test("createRunRng restores consumption progress", () => {
  const r1 = createRunRng(99);
  r1.next();
  r1.next();
  const t = r1.getState();
  const r2 = createRunRng(99, t);
  const n = r1.next();
  assert.equal(r2.next(), n);
});

test("treasure run state codec roundtrip", () => {
  const state = createTreasureRunState();
  state.levelLengthsSpelled.add(3);
  state.chapterPosSpelledThisChapter.add("n");
  state.banks["1"] = { multAdd: 2, multMul: 1.5, scoreAdd: 10 };
  const raw = serializeTreasureRunState(state);
  const back = deserializeTreasureRunState(raw);
  assert.ok(back.levelLengthsSpelled.has(3));
  assert.ok(back.chapterPosSpelledThisChapter.has("n"));
  assert.equal(back.banks["1"].multAdd, 2);
});

test("recordCareerRunStarted increments runsStarted", () => {
  const career = normalizeSlotCareerStats({});
  recordCareerRunStarted(career);
  recordCareerRunStarted(career);
  assert.equal(career.runsStarted, 2);
});

test("career merge picks best word", () => {
  const career = normalizeSlotCareerStats({});
  const stats = createRunMatchStats();
  recordWord(stats);
  mergeRunMatchStatsIntoCareer(career, stats, "win");
  assert.equal(career.runsWon, 1);
  assert.equal(career.bestWord, "cat");
  assert.equal(career.bestWordScore, 120);
});

function recordWord(stats) {
  stats.bestWord = "cat";
  stats.bestWordScore = 120;
  stats.lettersUsed = 3;
  stats.shopPurchases = 1;
}

test("canSaveNow blocks during animation", () => {
  assert.equal(canSaveNow({ idle: false, scoringAnimating: true }).ok, false);
  assert.equal(canSaveNow({ idle: false, submitWordBusy: true }).ok, false);
  assert.equal(canSaveNow({ idle: true }).ok, true);
});

test("run auto save flushes when idle", () => {
  let saved = 0;
  let idle = false;
  let lastImmediate = false;
  const autoSave = createRunAutoSave({
    canSave: () => ({ ok: idle }),
    save: (opts) => {
      saved += 1;
      lastImmediate = opts?.immediate === true;
    },
  });
  autoSave.scheduleAutoSave();
  assert.equal(saved, 0);
  idle = true;
  autoSave.tryFlush({ force: true });
  assert.equal(saved, 1);
  assert.equal(lastImmediate, true);
});

test("empty save envelope has three slots", () => {
  const env = createEmptySaveEnvelope();
  assert.equal(env.slots.length, SAVE_SLOT_COUNT);
  assert.equal(env.slots.every((s) => s == null), true);
});

test("isContinuableRunPhase excludes run end phases", () => {
  assert.equal(isContinuableRunPhase("playing"), true);
  assert.equal(isContinuableRunPhase("shop"), true);
  assert.equal(isContinuableRunPhase("settlement"), true);
  assert.equal(isContinuableRunPhase("run_end_win"), false);
  assert.equal(isContinuableRunPhase("run_end_fail"), false);
});

test("abandoned fresh run has no meaningful progress", () => {
  const payload = {
    phase: "playing",
    levelIndex: 0,
    runMatchStats: createRunMatchStats(),
    spellCastHistory: [],
    achievementRunState: { wordsPerLevelId: {}, interestEarnedTotal: 0, moneySpentTotal: 0, discardUsesCount: 0 },
  };
  assert.equal(hasMeaningfulRunProgress(payload), false);
  assert.equal(isAbandonedFreshRunPayload(payload), true);
});

test("word submit makes run progress meaningful", () => {
  const stats = createRunMatchStats();
  stats.wordsSubmitted = 1;
  const payload = {
    phase: "playing",
    levelIndex: 0,
    runMatchStats: stats,
    spellCastHistory: [],
    achievementRunState: { wordsPerLevelId: {}, interestEarnedTotal: 0, moneySpentTotal: 0, discardUsesCount: 0 },
  };
  assert.equal(hasMeaningfulRunProgress(payload), true);
  assert.equal(isAbandonedFreshRunPayload(payload), false);
});

test("collection career normalize defaults", () => {
  const career = normalizeSlotCareerStats({});
  assert.deepEqual(career.discoveredTreasureIds, []);
  assert.deepEqual(career.discoveredSpellIds, []);
  assert.deepEqual(career.discoveredVoucherTiers, {});
  assert.deepEqual(career.discoveredMaterialIds, []);
  assert.deepEqual(career.discoveredAccessoryIds, []);
  assert.deepEqual(career.scoreLeaderboard, []);
  assert.deepEqual(career.lengthLeaderboard, []);
});

test("collection treasure and spell discovery", () => {
  const career = normalizeSlotCareerStats({});
  assert.equal(recordTreasureDiscovered(career, "32"), true);
  assert.equal(recordTreasureDiscovered(career, "32"), false);
  assert.equal(recordSpellDiscovered(career, "cake"), true);
  assert.equal(recordSpellDiscovered(career, "restart"), true);
  assert.equal(recordSpellDiscovered(career, "restart"), false);
  assert.equal(recordSpellDiscovered(career, "dice"), true);
});

test("collection voucher tier only upgrades", () => {
  const career = normalizeSlotCareerStats({});
  assert.equal(recordVoucherDiscovered(career, "v_overstock_1"), true);
  assert.equal(career.discoveredVoucherTiers.overstock, 1);
  assert.equal(recordVoucherDiscovered(career, "v_overstock_1"), false);
  assert.equal(recordVoucherDiscovered(career, "v_overstock_2"), true);
  assert.equal(career.discoveredVoucherTiers.overstock, 2);
});

test("collection voucher global progress counts tiers; tab display counts pairs", () => {
  const career = normalizeSlotCareerStats({});
  const emptyGlobal = getCollectionUnlockProgress(career);
  const emptyTab = getCollectionTabProgress(career, "vouchers");
  assert.equal(emptyTab.unlocked, 0);

  recordVoucherDiscovered(career, "v_overstock_1");
  const afterT1Global = getCollectionUnlockProgress(career);
  const afterT1Tab = getCollectionTabProgress(career, "vouchers");
  assert.equal(afterT1Global.unlocked, emptyGlobal.unlocked + 1);
  assert.equal(afterT1Global.total, emptyGlobal.total);
  assert.equal(afterT1Tab.unlocked, 1);
  assert.equal(afterT1Tab.total, emptyTab.total);

  recordVoucherDiscovered(career, "v_overstock_2");
  const afterT2Global = getCollectionUnlockProgress(career);
  const afterT2Tab = getCollectionTabProgress(career, "vouchers");
  assert.equal(afterT2Global.unlocked, afterT1Global.unlocked + 1);
  assert.equal(afterT2Tab.unlocked, 1);
});

test("collection material and accessory discovery", () => {
  const career = normalizeSlotCareerStats({});
  assert.equal(recordMaterialDiscovered(career, "water"), true);
  assert.equal(recordMaterialDiscovered(career, "water"), false);
  assert.equal(recordMaterialDiscovered(career, "not_a_material"), false);
  assert.equal(recordAccessoryDiscovered(career, "coin"), true);
  assert.equal(recordAccessoryDiscovered(career, "coin"), false);
  assert.equal(recordAccessoryDiscovered(career, "missing"), false);
});

test("collection leaderboard keeps top ten by score", () => {
  const career = normalizeSlotCareerStats({});
  for (let i = 1; i <= 11; i++) {
    tryInsertScoreLeaderboard(career, {
      word: `w${i}`,
      score: i * 10,
      length: 3,
      recordedAt: i,
      tiles: [],
      ownedTreasures: [],
    });
  }
  assert.equal(career.scoreLeaderboard.length, 10);
  assert.equal(career.scoreLeaderboard[0].score, 110);
  assert.equal(career.scoreLeaderboard[9].score, 20);
  assert.ok(!career.scoreLeaderboard.some((r) => r.score === 10));
});

test("achievement career normalize defaults", () => {
  const career = normalizeSlotCareerStats({});
  assert.deepEqual(career.unlockedAchievementIds, []);
  assert.equal(career.totalWordsSubmitted, 0);
  assert.equal(career.peakWalletAmount, 0);
  assert.equal(career.maxLevelIndexReached, -1);
});

test("achievement unlock writes career ids once", () => {
  const career = normalizeSlotCareerStats({});
  assert.equal(unlockAchievementId(career, "win_run"), true);
  assert.equal(unlockAchievementId(career, "win_run"), false);
  assert.deepEqual(career.unlockedAchievementIds, ["win_run"]);
});

test("TapTap increment policy: career counters yes, all_* unlock only", () => {
  assert.equal(shouldReportTapTapIncrement(getAchievementDef("words_50")), true);
  assert.equal(shouldReportTapTapIncrement(getAchievementDef("discard_800")), true);
  assert.equal(shouldReportTapTapIncrement(getAchievementDef("all_treasures")), false);
  assert.equal(shouldReportTapTapIncrement(getAchievementDef("all_spells")), false);
  assert.equal(shouldReportTapTapIncrement(getAchievementDef("wallet_400")), false);

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (!String(def.id).startsWith("all_")) continue;
    assert.equal(shouldReportTapTapIncrement(def), false, def.id);
  }

  const career = normalizeSlotCareerStats({ totalWordsSubmitted: 12 });
  assert.equal(resolveTapTapIncrementCurrent(career, getAchievementDef("words_50")), 12);
});

test("wallet, interest and spend achievements hide collection progress until unlocked", () => {
  const career = normalizeSlotCareerStats({
    peakWalletAmount: 350,
    totalLettersUsed: 0,
  });
  for (const id of ["wallet_400", "interest_200", "spend_500"]) {
    const def = getAchievementDef(id);
    assert.ok(def);
    assert.equal(getAchievementCollectionProgress(career, def), null);
  }

  const interestUnlock = evaluateAndUnlockAchievements(career, {
    achievementRun: { interestEarnedTotal: 200, moneySpentTotal: 0, wordsPerLevelId: {}, discardUsesCount: 0 },
  });
  assert.deepEqual(
    interestUnlock.map((d) => d.id),
    ["interest_200"],
  );

  const career2 = normalizeSlotCareerStats({});
  const spendUnlock = evaluateAndUnlockAchievements(career2, {
    achievementRun: { interestEarnedTotal: 0, moneySpentTotal: 500, wordsPerLevelId: {}, discardUsesCount: 0 },
  });
  assert.deepEqual(
    spendUnlock.map((d) => d.id),
    ["spend_500"],
  );

  const career3 = normalizeSlotCareerStats({});
  const walletUnlock = evaluateAndUnlockAchievements(career3, { wallet: 400 });
  assert.deepEqual(
    walletUnlock.map((d) => d.id),
    ["wallet_400"],
  );
});

test("achievement run state codec roundtrip", () => {
  const state = createAchievementRunState();
  state.wordsPerLevelId["1-1"] = 2;
  state.interestEarnedTotal = 50;
  state.moneySpentTotal = 120;
  state.discardUsesCount = 3;
  const back = deserializeAchievementRunState(serializeAchievementRunState(state));
  assert.equal(back.wordsPerLevelId["1-1"], 2);
  assert.equal(back.interestEarnedTotal, 50);
  assert.equal(back.moneySpentTotal, 120);
  assert.equal(back.discardUsesCount, 3);
});

test("deck size achievements use full multiset only when deckSize is provided", () => {
  const career = normalizeSlotCareerStats({});

  assert.deepEqual(evaluateAndUnlockAchievements(career, {}), []);
  assert.deepEqual(evaluateAndUnlockAchievements(career, { submit: {} }), []);
  assert.ok(!career.unlockedAchievementIds.includes("deck_40"));
  assert.ok(!career.unlockedAchievementIds.includes("deck_100"));

  const deck40 = evaluateAndUnlockAchievements(career, { deckSize: 40 });
  assert.deepEqual(
    deck40.map((d) => d.id),
    ["deck_40"],
  );

  const career2 = normalizeSlotCareerStats({});
  const deck100 = evaluateAndUnlockAchievements(career2, { deckSize: 100 });
  assert.deepEqual(
    deck100.map((d) => d.id),
    ["deck_100"],
  );

  const career3 = normalizeSlotCareerStats({});
  assert.deepEqual(evaluateAndUnlockAchievements(career3, { deckSize: 52 }), []);
});

test("collection unlock progress includes achievements tab", () => {
  const career = normalizeSlotCareerStats({});
  const before = getCollectionUnlockProgress(career);
  unlockAchievementId(career, "win_run");
  const after = getCollectionUnlockProgress(career);
  assert.equal(after.unlocked, before.unlocked + 1);
  assert.equal(after.total, before.total);
  assert.ok(after.total > before.unlocked);
});

test("dev unlockFullCollection fills career to 100%", () => {
  const career = normalizeSlotCareerStats({});
  const { progress } = applyFullCollectionUnlockToCareer(career);
  assert.equal(progress.percent, 100);
  assert.equal(progress.unlocked, progress.total);
  assert.ok(progress.total > 0);
});

test("career reconcile unlocks counter achievements without run context", () => {
  const career = normalizeSlotCareerStats({
    totalWordsSubmitted: 50,
    maxLevelIndexReached: getLevelIndexForId("4-1"),
    peakWalletAmount: 400,
  });
  const unlocked = reconcileAchievementsFromPersistedCareer(career);
  const ids = unlocked.map((d) => d.id);
  assert.ok(ids.includes("words_50"));
  assert.ok(ids.includes("reach_4_1"));
  assert.ok(ids.includes("wallet_400"));
});

test("career reconcile restores win and difficulty wins from runsWon / highestDifficultyBeaten", () => {
  const career = normalizeSlotCareerStats({
    runsWon: 2,
    highestDifficultyBeaten: 8,
    bestWordScore: 1500000,
    lengthLeaderboard: [{ word: "abcdefghijk", score: 1, length: 11, recordedAt: 1, tiles: [], ownedTreasures: [] }],
  });
  const ids = reconcileAchievementsFromPersistedCareer(career).map((d) => d.id);
  assert.ok(ids.includes("win_run"));
  assert.ok(ids.includes("diff_3_win"));
  assert.ok(ids.includes("diff_6_win"));
  assert.ok(ids.includes("diff_8_win"));
  assert.ok(ids.includes("score_10k"));
  assert.ok(ids.includes("score_1m"));
  assert.ok(ids.includes("word_len_11"));
});
