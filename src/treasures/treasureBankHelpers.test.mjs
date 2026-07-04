import test from "node:test";
import assert from "node:assert/strict";
import { wobbleTreasureHookContributor } from "./treasureBankHelpers.js";

test("wobbleTreasureHookContributor blueprint 镜像 wobble 面具槽", async () => {
  /** @type {number[]} */
  const wobbledSlots = [];
  await wobbleTreasureHookContributor(
    {
      ownedSlotTreasureIds: ["98", "144", null],
      hookSlotIndex: 0,
      hookSource: "blueprint",
      wobbleOwnedTreasureAtSlot: async (ix) => {
        wobbledSlots.push(ix);
      },
      wobbleOwnedTreasureById: async () => {
        throw new Error("should not wobble by id for blueprint");
      },
    },
    "144",
  );
  assert.deepEqual(wobbledSlots, [0]);
});

test("wobbleTreasureHookContributor 实体宝藏 wobble 真实槽", async () => {
  /** @type {number[]} */
  const wobbledSlots = [];
  await wobbleTreasureHookContributor(
    {
      ownedSlotTreasureIds: ["98", "144", null],
      hookSlotIndex: 1,
      hookSource: "self",
      wobbleOwnedTreasureAtSlot: async (ix) => {
        wobbledSlots.push(ix);
      },
    },
    "144",
  );
  assert.deepEqual(wobbledSlots, [1]);
});

test("wobbleTreasureHookContributor 绵羊 blueprint 镜像 wobble 绵羊槽", async () => {
  /** @type {number[]} */
  const wobbledSlots = [];
  await wobbleTreasureHookContributor(
    {
      ownedSlotTreasureIds: ["105", "106", null],
      hookSlotIndex: 0,
      hookSource: "blueprint",
      wobbleOwnedTreasureAtSlot: async (ix) => {
        wobbledSlots.push(ix);
      },
    },
    "106",
  );
  assert.deepEqual(wobbledSlots, [0]);
});
