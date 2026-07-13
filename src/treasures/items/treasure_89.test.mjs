import test from "node:test";
import assert from "node:assert/strict";
import { treasureHooks } from "./treasure_89.js";
import { initTreasureBankOnAcquire } from "../treasureAcquireInit.js";
import { createTreasureRunState } from "../treasureRunState.js";
import { getMultMulBank } from "../treasureBankHelpers.js";

test("邮筒 onDeckCardsAdded：有槽位上下文时写入该实例 bank", async () => {
  const rs = createTreasureRunState();
  const slot = { treasureId: "89" };
  initTreasureBankOnAcquire("89", rs, slot);
  const ctx = {
    treasureRun: rs,
    count: 2,
    ownedSlotTreasureIds: ["89", null],
    ownedTreasureInstances: [slot, null],
    hookSlotIndex: 0,
    hookSource: "self",
  };
  await treasureHooks.onDeckCardsAdded?.(ctx);
  assert.equal(getMultMulBank(rs, "89", ctx), 1.5);
});

test("邮筒 onDeckCardsAdded：无 ownedTreasureInstances 时不写 bank", async () => {
  const rs = createTreasureRunState();
  const slot = { treasureId: "89" };
  initTreasureBankOnAcquire("89", rs, slot);
  const ctx = {
    treasureRun: rs,
    count: 1,
    ownedSlotTreasureIds: ["89", null],
    hookSlotIndex: 0,
    hookSource: "self",
  };
  await treasureHooks.onDeckCardsAdded?.(ctx);
  assert.equal(getMultMulBank(rs, "89", { ...ctx, ownedTreasureInstances: [slot, null] }), 1);
});
