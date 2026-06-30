import test from "node:test";
import assert from "node:assert/strict";
import { computeOwnedTreasureSlotTargetLength } from "../accessories/accessorySlotCapacity.js";
import { getPresetTreasureSlotDelta } from "./runPresetRuntime.js";

const emptySix = [null, null, null, null, null, null];

test("三角尺 preset_10 将默认 6 栏压至 5", () => {
  const delta = getPresetTreasureSlotDelta("preset_10");
  assert.equal(delta, -1);
  assert.equal(computeOwnedTreasureSlotTargetLength(emptySix, delta), 5);
});

test("挂钩 preset_04 将默认 6 栏扩至 8", () => {
  const delta = getPresetTreasureSlotDelta("preset_04");
  assert.equal(delta, 2);
  assert.equal(computeOwnedTreasureSlotTargetLength(emptySix, delta), 8);
});
