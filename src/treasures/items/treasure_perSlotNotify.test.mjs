import test from "node:test";
import assert from "node:assert/strict";
import { treasureHooks as bicycleHooks } from "./treasure_53.js";
import { treasureHooks as ferrisHooks } from "./treasure_59.js";
import { treasureHooks as wreathHooks } from "./treasure_113.js";
import { initTreasureBankOnAcquire } from "../treasureAcquireInit.js";
import { createTreasureRunState } from "../treasureRunState.js";
import { getMultAddBank, getMultMulBank } from "../treasureBankHelpers.js";

/** @param {string} id @param {number} slotIndex @param {(object | null)[]} owned */
function slotCtx(id, slotIndex, owned) {
  const rs = createTreasureRunState();
  const slot = owned[slotIndex];
  return { rs, ctx: {
    treasureRun: rs,
    hookSlotIndex: slotIndex,
    hookSource: "self",
    ownedSlotTreasureIds: owned.map((s) => (s ? String(s.treasureId) : null)),
    ownedTreasureInstances: owned,
  } };
}

test("自行车 53：跳过包时按槽位写入 multAdd bank", async () => {
  const slot = { treasureId: "53" };
  const owned = [slot, null];
  const { rs, ctx } = slotCtx("53", 0, owned);
  initTreasureBankOnAcquire("53", rs, slot);
  await bicycleHooks.onPackSkipped?.(ctx);
  assert.equal(getMultAddBank(rs, "53", ctx), 8);
});

test("摩天轮 59：商店刷新时按槽位写入 multAdd bank（含前置空槽）", async () => {
  const slot = { treasureId: "59" };
  const owned = [null, slot];
  const { rs, ctx } = slotCtx("59", 1, owned);
  initTreasureBankOnAcquire("59", rs, slot);
  await ferrisHooks.onShopReroll?.(ctx);
  assert.equal(getMultAddBank(rs, "59", ctx), 3);
});

test("花环 113：移除元音时按槽位写入 multMul bank", async () => {
  const slot = { treasureId: "113" };
  const owned = [slot];
  const { rs, ctx } = slotCtx("113", 0, owned);
  initTreasureBankOnAcquire("113", rs, slot);
  await wreathHooks.onDeckCardsRemoved?.({ ...ctx, vowelsRemoved: 2 });
  assert.equal(getMultMulBank(rs, "113", ctx), 2);
});

test("花环 113：同 id 双持时各槽独立 +0.5/元音（菜刀整词移除 notify 路径）", async () => {
  const slot0 = { treasureId: "113" };
  const slot1 = { treasureId: "113" };
  const owned = [slot0, null, slot1];
  const rs = createTreasureRunState();
  initTreasureBankOnAcquire("113", rs, slot0);
  initTreasureBankOnAcquire("113", rs, slot1);
  /** @param {number} slotIndex */
  function wreathCtx(slotIndex) {
    return {
      treasureRun: rs,
      hookSlotIndex: slotIndex,
      hookSource: "self",
      ownedSlotTreasureIds: owned.map((s) => (s ? String(s.treasureId) : null)),
      ownedTreasureInstances: owned,
      vowelsRemoved: 2,
    };
  }
  await wreathHooks.onDeckCardsRemoved?.(wreathCtx(0));
  await wreathHooks.onDeckCardsRemoved?.(wreathCtx(2));
  assert.equal(getMultMulBank(rs, "113", wreathCtx(0)), 2);
  assert.equal(getMultMulBank(rs, "113", wreathCtx(2)), 2);
});
