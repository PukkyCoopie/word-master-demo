import test from "node:test";
import assert from "node:assert/strict";
import { createTreasureRunState } from "../treasureRunState.js";
import { addScoreAddBank, getScoreAddBank } from "../treasureBankHelpers.js";
import {
  computeWaterWaveScoreForSubmit,
  treasureHooks,
} from "./treasure_143.js";

test("海浪 getPerLetterScoreCue：两块海浪入账 +20", () => {
  const rs = createTreasureRunState();
  treasureHooks.getPerLetterScoreCue?.(
    { treasureRun: rs, ownedSlotTreasureIds: ["143", "143"] },
    { materialId: "water" },
  );
  assert.equal(getScoreAddBank(rs, "143"), 20);
});

test("海浪 getPerLetterScoreCue：非水波块不触发", () => {
  assert.equal(treasureHooks.getPerLetterScoreCue?.({}, { materialId: "fire" }), null);
});

test("海浪 getPerLetterScoreCue：银行为 0 时仅入账 +10", () => {
  const rs = createTreasureRunState();
  const cue = treasureHooks.getPerLetterScoreCue?.(
    { treasureRun: rs, ownedSlotTreasureIds: ["143", null] },
    { materialId: "water" },
  );
  assert.equal(cue, null);
  assert.equal(getScoreAddBank(rs, "143"), 10);
});

test("海浪 getPerLetterScoreCue：银行加成并入词槽平面分", () => {
  const rs = createTreasureRunState();
  addScoreAddBank(rs, "143", 5);
  assert.deepEqual(
    treasureHooks.getPerLetterScoreCue?.(
      { treasureRun: rs, ownedSlotTreasureIds: ["143", null] },
      { materialId: "water" },
    ),
    { delta: 5, label: "+5" },
  );
  assert.equal(getScoreAddBank(rs, "143"), 15);
});

test("海浪 accumulateReplaySubmitAdjustments：按字母顺序叠银行", () => {
  const rs = createTreasureRunState();
  addScoreAddBank(rs, "143", 5);
  const ctx = {
    treasureRun: rs,
    ownedSlotTreasureIds: ["143", null],
    letterParts: [
      { materialId: "water" },
      { materialId: "water" },
      { materialId: "fire" },
    ],
    replayCounts: [0, 0, 0],
  };
  const adj = treasureHooks.accumulateReplaySubmitAdjustments?.(ctx);
  assert.deepEqual(adj, { scoreAdd: 20 });
});

test("海浪 accumulateReplaySubmitAdjustments：首词仅触发入账、无加成", () => {
  const rs = createTreasureRunState();
  const ctx = {
    treasureRun: rs,
    ownedSlotTreasureIds: ["143", null],
    letterParts: [{ materialId: "water" }],
    replayCounts: [0],
  };
  const adj = treasureHooks.accumulateReplaySubmitAdjustments?.(ctx);
  assert.equal(adj, null);
  assert.equal(computeWaterWaveScoreForSubmit(ctx), 0);
});

test("海浪 accumulateReplaySubmitAdjustments：面具镜像双路径按 2×+10 叠银行", () => {
  const rs = createTreasureRunState();
  addScoreAddBank(rs, "143", 5);
  const ctx = {
    treasureRun: rs,
    ownedSlotTreasureIds: ["98", "143"],
    letterParts: [{ materialId: "water" }, { materialId: "water" }],
    replayCounts: [0, 0],
  };
  const adj = treasureHooks.accumulateReplaySubmitAdjustments?.(ctx);
  assert.deepEqual(adj, { scoreAdd: 30 });
});

test("海浪不再通过 buildPostLetterStep 直接加分", () => {
  assert.equal(treasureHooks.buildPostLetterStep, undefined);
});
