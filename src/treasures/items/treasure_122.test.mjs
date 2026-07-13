import test from "node:test";
import assert from "node:assert/strict";
import { treasureHooks } from "./treasure_122.js";
import { initTreasureBankOnAcquire } from "../treasureAcquireInit.js";
import { createTreasureRunState } from "../treasureRunState.js";

function makeLadderCtx(slotIndex, remaining) {
  const slot = { treasureId: "122", bank: { multAdd: 0, multMul: 1, scoreAdd: 0, posPackProgress: remaining } };
  const owned = [slot, null];
  return {
    treasureRun: createTreasureRunState(),
    ownedSlotTreasureIds: ["122", null],
    ownedTreasureInstances: owned,
    hookSlotIndex: slotIndex,
    hookSource: "self",
  };
}

test("购入梯子：posPackProgress 初始为 3", () => {
  const rs = createTreasureRunState();
  const slot = { treasureId: "122" };
  initTreasureBankOnAcquire("122", rs, slot);
  assert.equal(slot.bank?.posPackProgress, 3);
});

test("有剩余关卡时 +2 判定词长", () => {
  assert.equal(treasureHooks.getSubmitLengthBonus?.(makeLadderCtx(0, 3)), 2);
  assert.equal(treasureHooks.getSubmitLengthBonus?.(makeLadderCtx(0, 1)), 2);
});

test("剩余 0 时不再加长", () => {
  assert.equal(treasureHooks.getSubmitLengthBonus?.(makeLadderCtx(0, 0)), 0);
});

test("过关：只扣当前槽剩余关卡", () => {
  const ctx = makeLadderCtx(0, 2);
  treasureHooks.onLevelComplete?.(ctx);
  assert.equal(ctx.ownedTreasureInstances[0].bank?.posPackProgress, 1);
});
