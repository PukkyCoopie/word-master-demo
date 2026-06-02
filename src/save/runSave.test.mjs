import test from "node:test";
import assert from "node:assert/strict";
import { createRunRng, mulberry32WithState } from "../game/runRng.js";
import { serializeTreasureRunState, deserializeTreasureRunState } from "./treasureRunStateCodec.js";
import { createTreasureRunState } from "../treasures/treasureRunState.js";
import {
  mergeRunMatchStatsIntoCareer,
  normalizeSlotCareerStats,
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
import { createEmptySaveEnvelope, SAVE_SLOT_COUNT } from "./runSaveSchema.js";
import {
  serializeAchievementRunState,
  deserializeAchievementRunState,
  createAchievementRunState,
} from "../achievements/achievementRunState.js";
import { unlockAchievementId } from "../achievements/achievementUnlock.js";
import { evaluateAndUnlockAchievements } from "../achievements/achievementEvaluate.js";
import { getCollectionUnlockProgress } from "../collection/collectionProgress.js";

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
  const autoSave = createRunAutoSave({
    canSave: () => ({ ok: idle }),
    save: () => {
      saved += 1;
    },
  });
  autoSave.scheduleAutoSave();
  assert.equal(saved, 0);
  idle = true;
  autoSave.tryFlush();
  assert.equal(saved, 1);
});

test("empty save envelope has three slots", () => {
  const env = createEmptySaveEnvelope();
  assert.equal(env.slots.length, SAVE_SLOT_COUNT);
  assert.equal(env.slots.every((s) => s == null), true);
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
  assert.equal(recordSpellDiscovered(career, "restart"), false);
});

test("collection voucher tier only upgrades", () => {
  const career = normalizeSlotCareerStats({});
  assert.equal(recordVoucherDiscovered(career, "v_overstock_1"), true);
  assert.equal(career.discoveredVoucherTiers.overstock, 1);
  assert.equal(recordVoucherDiscovered(career, "v_overstock_1"), false);
  assert.equal(recordVoucherDiscovered(career, "v_overstock_2"), true);
  assert.equal(career.discoveredVoucherTiers.overstock, 2);
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
