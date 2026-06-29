import test from "node:test";
import assert from "node:assert/strict";
import { buildGridPresencePostLetterSteps, gridSelectedPositionKeySet } from "../game/gridOnlyMaterialScoring.js";
import { countSteelGridPresenceEnhancements } from "./achievementSubmitMetrics.js";

test("countSteelGridPresenceEnhancements：棋盘 index 0 的钢铁块也计入", () => {
  const ROWS = 4;
  const COLS = 5;
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let i = 0; i < 4; i++) {
    grid[0][i] = { letter: "ABCD"[i], materialId: "steel" };
  }
  grid[1][0] = { letter: "E" };
  const excluded = gridSelectedPositionKeySet([{ row: 1, col: 0 }]);
  const steps = buildGridPresencePostLetterSteps(grid, ROWS, COLS, excluded);
  assert.equal(steps.length, 4);
  assert.equal(
    countSteelGridPresenceEnhancements({ postLetterTreasureSteps: steps }),
    4,
  );
});

test("countSteelGridPresenceEnhancements：非钢铁棋盘字后步不计入", () => {
  const detailed = {
    postLetterTreasureSteps: [
      { treasureId: "107", slotIndex: 0, multMul: 2, scoreFxGridTileIndex: 3 },
      { treasureId: null, slotIndex: -1, multMul: 2.5, scoreFxWordSlotIndex: 0 },
    ],
  };
  assert.equal(countSteelGridPresenceEnhancements(detailed), 0);
});
