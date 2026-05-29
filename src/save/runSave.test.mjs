import test from "node:test";
import assert from "node:assert/strict";
import { createRunRng, mulberry32WithState } from "../game/runRng.js";
import { serializeTreasureRunState, deserializeTreasureRunState } from "./treasureRunStateCodec.js";
import { createTreasureRunState } from "../treasures/treasureRunState.js";
import {
  mergeRunMatchStatsIntoCareer,
  normalizeSlotCareerStats,
} from "./slotCareerStats.js";
import { createRunMatchStats } from "../game/runMatchStats.js";
import { canSaveNow } from "./runSaveGuards.js";
import { createRunAutoSave } from "./runAutoSave.js";
import { createEmptySaveEnvelope, SAVE_SLOT_COUNT } from "./runSaveSchema.js";

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
