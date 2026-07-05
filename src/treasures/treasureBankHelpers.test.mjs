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

test("playTreasureHookBubbleFx 有 hook 槽位时只播该槽", async () => {
  /** @type {number[]} */
  const bubbleSlots = [];
  const { playTreasureHookBubbleFx } = await import("./treasureBankHelpers.js");
  await playTreasureHookBubbleFx(
    {
      ownedSlotTreasureIds: ["24", "24", null],
      hookSlotIndex: 1,
      hookSource: "self",
      playOwnedTreasureBubbleFxAtSlot: async (ix, text, kind) => {
        bubbleSlots.push(ix);
        assert.equal(text, "免费刷新");
        assert.equal(kind, "reroll");
      },
      playOwnedTreasureBubbleFx: async () => {
        throw new Error("should not bubble by id");
      },
    },
    "24",
    "免费刷新",
    "reroll",
  );
  assert.deepEqual(bubbleSlots, [1]);
});

test("bankMultAddGain 有 hook 槽位时只播该槽 FX", async () => {
  /** @type {number[]} */
  const multFxSlots = [];
  /** @type {string[]} */
  const multFxByIdCalls = [];
  const { bankMultAddGain } = await import("./treasureBankHelpers.js");
  await bankMultAddGain(
    {
      treasureRun: { banks: {} },
      ownedSlotTreasureIds: ["59", "59", null],
      hookSlotIndex: 1,
      hookSource: "self",
      playTreasureMultDeltaFxAtSlot: async (ix, delta) => {
        multFxSlots.push(ix);
        assert.equal(delta, 3);
      },
      playOwnedTreasureMultDeltaFx: async (id, delta) => {
        multFxByIdCalls.push(`${id}:${delta}`);
      },
    },
    "59",
    3,
  );
  assert.deepEqual(multFxSlots, [1]);
  assert.deepEqual(multFxByIdCalls, []);
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
