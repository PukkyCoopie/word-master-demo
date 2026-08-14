import test from "node:test";
import assert from "node:assert/strict";
import { repairSoftLockedPlayingSave } from "./repairSoftLockedPlayingSave.js";
import { serializeScore } from "../utils/scoreInteger.js";

function basePlayingPayload(overrides = {}) {
  return {
    phase: "playing",
    levelIndex: 1,
    isEndlessRun: false,
    showShop: false,
    showSettlement: false,
    showRunEnd: false,
    deckState: {
      currentScore: serializeScore(100),
      targetScore: serializeScore(300),
      remainingWords: 0,
      remainingRemovals: 2,
      grid: [],
      deck: [],
      selected: [],
    },
    ...overrides,
  };
}

test("soft-lock: restore submit chance when words=0 and score below target", () => {
  const raw = basePlayingPayload();
  const { kind, payload } = repairSoftLockedPlayingSave(raw);
  assert.equal(kind, "restore_submit_chance");
  assert.equal(payload.deckState.remainingWords, 1);
});

test("soft-lock: open settlement when words=0 and score meets target", () => {
  const raw = basePlayingPayload({
    deckState: {
      ...basePlayingPayload().deckState,
      currentScore: serializeScore(300),
      targetScore: serializeScore(300),
      remainingWords: 0,
    },
  });
  const { kind } = repairSoftLockedPlayingSave(raw);
  assert.equal(kind, "open_stage_settlement");
});

test("soft-lock: no repair when remainingWords > 0", () => {
  const raw = basePlayingPayload({
    deckState: {
      ...basePlayingPayload().deckState,
      remainingWords: 2,
    },
  });
  const { kind, payload } = repairSoftLockedPlayingSave(raw);
  assert.equal(kind, "none");
  assert.equal(payload.deckState.remainingWords, 2);
});

test("soft-lock: no repair when already in settlement", () => {
  const raw = basePlayingPayload({
    phase: "settlement",
    showSettlement: true,
  });
  const { kind } = repairSoftLockedPlayingSave(raw);
  assert.equal(kind, "none");
});

test("soft-lock: final standard level win opens run end", async () => {
  const { isStandardRunFinalLevelIndex } = await import("../levelDefinitions.js");
  let finalIndex = 0;
  for (let i = 0; i < 64; i++) {
    if (isStandardRunFinalLevelIndex(i)) {
      finalIndex = i;
      break;
    }
  }
  const raw = basePlayingPayload({
    levelIndex: finalIndex,
    deckState: {
      ...basePlayingPayload().deckState,
      currentScore: serializeScore(999),
      targetScore: serializeScore(300),
      remainingWords: 0,
    },
  });
  const { kind } = repairSoftLockedPlayingSave(raw);
  assert.equal(kind, "open_run_end_win");
});
