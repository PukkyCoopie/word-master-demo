import test from "node:test";
import assert from "node:assert/strict";
import { computeOwnedTreasureSlotTargetLength } from "../accessories/accessorySlotCapacity.js";
import { getPresetTreasureSlotDelta } from "./runPresetRuntime.js";

test("三角尺 preset_10 将默认 5 栏压至 4", () => {
  const delta = getPresetTreasureSlotDelta("preset_10");
  assert.equal(delta, -1);
  assert.equal(
    computeOwnedTreasureSlotTargetLength([null, null, null, null, null], delta),
    4,
  );
});

test("挂钩 preset_04 将默认 5 栏扩至 6", () => {
  const delta = getPresetTreasureSlotDelta("preset_04");
  assert.equal(delta, 1);
  assert.equal(
    computeOwnedTreasureSlotTargetLength([null, null, null, null, null], delta),
    6,
  );
});
