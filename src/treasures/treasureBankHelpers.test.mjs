import test from "node:test";
import assert from "node:assert/strict";
import {
  wobbleTreasureHookContributor,
  getMultMulBank,
  addMultMulBank,
  getScoreAddBank,
} from "./treasureBankHelpers.js";

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
      ownedTreasureInstances: [
        { treasureId: "59", bank: { multAdd: 0, multMul: 1, scoreAdd: 0 } },
        { treasureId: "59", bank: { multAdd: 0, multMul: 1, scoreAdd: 0 } },
        null,
      ],
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

test("同 id 多实例：海绵银行按槽位独立", () => {
  const runState = { banks: {} };
  /** @type {Record<string, unknown>[]} */
  const owned = [
    { treasureId: "88", bank: { multAdd: 0, multMul: 1.3, scoreAdd: 0 } },
    { treasureId: "88", bank: { multAdd: 0, multMul: 1, scoreAdd: 0 } },
    null,
  ];
  assert.equal(getMultMulBank(runState, "88", { slotIndex: 0, ownedTreasureInstances: owned }), 1.3);
  assert.equal(getMultMulBank(runState, "88", { slotIndex: 1, ownedTreasureInstances: owned }), 1);
  addMultMulBank(runState, "88", 0.1, {
    hookSlotIndex: 1,
    ownedSlotTreasureIds: ["88", "88", null],
    ownedTreasureInstances: owned,
  });
  assert.equal(getMultMulBank(runState, "88", { slotIndex: 0, ownedTreasureInstances: owned }), 1.3);
  assert.equal(getMultMulBank(runState, "88", { slotIndex: 1, ownedTreasureInstances: owned }), 1.1);
});

test("海浪 143 仍使用全局银行", () => {
  const runState = { banks: { 143: { multAdd: 0, multMul: 1, scoreAdd: 20 } } };
  assert.equal(getScoreAddBank(runState, "143"), 20);
});

test("getScoreAddBank 只读：不替换 slot.bank 引用", () => {
  const runState = { banks: {} };
  const bankRef = { multAdd: 0, multMul: 1, scoreAdd: 7 };
  const slot = { treasureId: "64", bank: bankRef };
  const owned = [slot];
  assert.equal(getScoreAddBank(runState, "64", { slotIndex: 0, ownedTreasureInstances: owned }), 7);
  assert.equal(slot.bank, bankRef);
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
