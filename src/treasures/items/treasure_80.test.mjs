import test from "node:test";
import assert from "node:assert/strict";
import { createTreasureRunState } from "../treasureRunState.js";
import { addScoreAddBank } from "../treasureBankHelpers.js";
import { treasureHooks } from "./treasure_80.js";

test("泡泡 buildPostLetterStep：双路径（面具+本体）字后 +16，单路径 +8", () => {
  const rs = createTreasureRunState();
  const letterParts = [{ letter: "b" }];
  const ctxBase = { treasureRun: rs, letterParts, letterReplayCounts: [0] };

  const solo = treasureHooks.buildPostLetterStep?.({
    ...ctxBase,
    ownedSlotTreasureIds: ["80", null],
  });
  assert.deepEqual(solo, { scoreAdd: 8 });

  const masked = treasureHooks.buildPostLetterStep?.({
    ...ctxBase,
    ownedSlotTreasureIds: ["98", "80"],
  });
  assert.deepEqual(masked, { scoreAdd: 16 });

  addScoreAddBank(rs, "80", 8);
  const withBank = treasureHooks.buildPostLetterStep?.({
    ...ctxBase,
    ownedSlotTreasureIds: ["98", "80"],
  });
  assert.deepEqual(withBank, { scoreAdd: 24 });
});
