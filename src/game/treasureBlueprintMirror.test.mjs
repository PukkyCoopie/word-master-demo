import test from "node:test";
import assert from "node:assert/strict";
import {
  countTreasureHookContributionPaths,
  getBlueprintMirroredTreasureId,
  isPhysicalTreasureHookContribution,
  isTreasureHookContributionActive,
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

test("iterTreasureHookContributions [绵羊][工具] 镜像栏最左工具", () => {
  const slots = ["105", "106", null];
  assert.equal(getBlueprintMirroredTreasureId(slots, 0), "106");
  assert.deepEqual(
    iterTreasureHookContributions(slots)
      .filter((e) => e.treasureId === "106")
      .map((e) => [e.slotIndex, e.source]),
    [
      [0, "blueprint"],
      [1, "self"],
    ],
  );
});

test("iterTreasureHookContributions [工具][绵羊] 仍镜像栏最左工具", () => {
  const slots = ["106", "105", null];
  assert.equal(getBlueprintMirroredTreasureId(slots, 1), "106");
  assert.equal(countTreasureHookContributionPaths(slots, "106"), 2);
});

test("iterTreasureHookContributions [小号][工具][绵羊] 镜像栏最小小号", () => {
  const slots = ["93", "106", "105"];
  assert.equal(getBlueprintMirroredTreasureId(slots, 2), "93");
  assert.equal(countTreasureHookContributionPaths(slots, "93"), 2);
  assert.equal(countTreasureHookContributionPaths(slots, "106"), 1);
});

test("iterTreasureHookContributions [面具][工具][绵羊] 跳过面具镜像工具", () => {
  const slots = ["98", "106", "105"];
  assert.equal(getBlueprintMirroredTreasureId(slots, 2), "106");
  assert.equal(countTreasureHookContributionPaths(slots, "106"), 3);
});

test("isTreasureHookContributionActive 槽位清空后 self / blueprint 均无效", () => {
  const before = ["29", "54", null];
  assert.equal(
    isTreasureHookContributionActive(before, { slotIndex: 1, treasureId: "54", source: "self" }),
    true,
  );

  const afterBomb = ["29", null, null];
  assert.equal(
    isTreasureHookContributionActive(afterBomb, { slotIndex: 1, treasureId: "54", source: "self" }),
    false,
  );

  const maskBefore = ["98", "54", null];
  assert.equal(
    isTreasureHookContributionActive(maskBefore, { slotIndex: 0, treasureId: "54", source: "blueprint" }),
    true,
  );

  const maskAfter = ["98", null, null];
  assert.equal(
    isTreasureHookContributionActive(maskAfter, { slotIndex: 0, treasureId: "54", source: "blueprint" }),
    false,
  );
});
