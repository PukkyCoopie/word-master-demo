import test from "node:test";
import assert from "node:assert/strict";
import {
  countTreasureHookContributionPaths,
  getBlueprintMirroredTreasureId,
  isPhysicalTreasureHookContribution,
  iterTreasureHookContributions,
  resolvePhysicalTreasureSlotIndex,
  resolvePostLetterAnimSlotIndex,
  shouldTreasureRunAccumulationMutate,
} from "./treasureBlueprintMirror.js";

test("resolvePhysicalTreasureSlotIndex 同 id 多槽用 hook 槽位", () => {
  const slots = ["98", "66", "66"];
  assert.equal(resolvePhysicalTreasureSlotIndex(slots, "66", 1), 1);
  assert.equal(resolvePhysicalTreasureSlotIndex(slots, "66", 2), 2);
  assert.equal(resolvePostLetterAnimSlotIndex(slots, "66", 0, "blueprint"), 0);
});

test("resolvePhysicalTreasureSlotIndex 蓝图贡献用实体宝藏槽", () => {
  const slots = ["98", "80", null];
  assert.equal(resolvePhysicalTreasureSlotIndex(slots, "80", 0), 1);
  assert.equal(resolvePhysicalTreasureSlotIndex(slots, "98", 0), 0);
});

test("resolvePostLetterAnimSlotIndex 蓝图用面具槽、实体用真实槽", () => {
  const slots = ["98", "80", null];
  assert.equal(resolvePostLetterAnimSlotIndex(slots, "80", 0, "blueprint"), 0);
  assert.equal(resolvePostLetterAnimSlotIndex(slots, "80", 1, "self"), 1);
});

test("shouldTreasureRunAccumulationMutate 仅实体槽 self", () => {
  const slots = ["98", "80", null];
  assert.equal(shouldTreasureRunAccumulationMutate(slots, 0, "80", "blueprint"), false);
  assert.equal(shouldTreasureRunAccumulationMutate(slots, 1, "80", "self"), true);
  assert.equal(isPhysicalTreasureHookContribution(slots, 1, "80", "self"), true);
});

test("iterTreasureHookContributions [面具][泡泡] 产出 blueprint + self", () => {
  const slots = ["98", "80", null];
  const entries = iterTreasureHookContributions(slots);
  assert.deepEqual(
    entries.map((e) => [e.slotIndex, e.treasureId, e.source]),
    [
      [0, "98", "self"],
      [0, "80", "blueprint"],
      [1, "80", "self"],
    ],
  );
  assert.equal(getBlueprintMirroredTreasureId(slots, 0), "80");
  assert.equal(countTreasureHookContributionPaths(slots, "80"), 2);
});
