import test from "node:test";
import assert from "node:assert/strict";
import {
  collectFountainWaterConversionCandidates,
  pickRandomFountainWaterTarget,
} from "./fountainWaterTargets.js";

test("喷泉候选：优先无材质，排除水波块与空格", () => {
  const grid = [
    [{ letter: "A" }, { letter: "B", materialId: "water" }, null],
    [{ letter: "C", materialId: "fire" }, { letter: "D" }],
  ];
  const { noMaterial, withMaterial } = collectFountainWaterConversionCandidates(grid);
  assert.deepEqual(noMaterial, [
    { row: 0, col: 0 },
    { row: 1, col: 1 },
  ]);
  assert.deepEqual(withMaterial, [{ row: 1, col: 0 }]);
});

test("pickRandomFountainWaterTarget：无候选时 null", () => {
  const grid = [[{ letter: "A", materialId: "water" }]];
  assert.equal(pickRandomFountainWaterTarget(grid, () => 0), null);
});

test("pickRandomFountainWaterTarget：有无材质时只从无材质池抽取", () => {
  const grid = [[{ letter: "A" }, { letter: "B", materialId: "fire" }]];
  assert.deepEqual(pickRandomFountainWaterTarget(grid, () => 0), { row: 0, col: 0 });
});
