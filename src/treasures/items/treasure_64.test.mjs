import test from "node:test";
import assert from "node:assert/strict";
import { treasureHooks } from "./treasure_64.js";
import { initTreasureBankOnAcquire } from "../treasureAcquireInit.js";
import { createTreasureRunState, migrateLegacyKnobWordsRemaining } from "../treasureRunState.js";
import { getScoreAddBank } from "../treasureBankHelpers.js";

/** @param {number} [remaining] @param {number} [slotIndex] */
function makeKnobCtx(remaining = 10, slotIndex = 0) {
  const slot = { treasureId: "64", bank: { multAdd: 0, multMul: 1, scoreAdd: remaining } };
  const owned = [slot, { treasureId: "64", bank: { multAdd: 0, multMul: 1, scoreAdd: 10 } }, null];
  return {
    treasureRun: createTreasureRunState(),
    ownedTreasureInstances: owned,
    ownedSlotTreasureIds: ["64", "64", null],
    hookSlotIndex: slotIndex,
    hookSource: "self",
    slotIndex,
  };
}

test("购入旋钮：每实例 bank.scoreAdd 初始为 10", () => {
  const rs = createTreasureRunState();
  const slot = { treasureId: "64" };
  initTreasureBankOnAcquire("64", rs, slot);
  assert.equal(slot.bank?.scoreAdd, 10);
  assert.equal(rs.extraLetterScoreWordsRemaining, 0);
});

test("同 id 多实例：剩余次数按槽位独立", () => {
  const ctx0 = makeKnobCtx(3, 0);
  const ctx1 = makeKnobCtx(10, 1);
  ctx1.ownedTreasureInstances = ctx0.ownedTreasureInstances;
  ctx1.ownedSlotTreasureIds = ctx0.ownedSlotTreasureIds;
  assert.equal(getScoreAddBank(ctx0.treasureRun, "64", ctx0), 3);
  assert.equal(getScoreAddBank(ctx1.treasureRun, "64", ctx1), 10);
  assert.equal(treasureHooks.getExtraLetterScoringPasses?.(ctx0), 1);
  assert.equal(treasureHooks.getExtraLetterScoringPasses?.(ctx1), 1);
});

test("成功提交：只扣当前槽位剩余次数", () => {
  const ctx = makeKnobCtx(2, 0);
  treasureHooks.onSuccessfulWordSubmit?.(ctx);
  assert.equal(getScoreAddBank(ctx.treasureRun, "64", ctx), 1);
  assert.equal(getScoreAddBank(ctx.treasureRun, "64", { ...ctx, slotIndex: 1, hookSlotIndex: 1 }), 10);
});

test("耗尽后不再贡献额外字母计分", () => {
  const ctx = makeKnobCtx(0, 0);
  assert.equal(treasureHooks.getExtraLetterScoringPasses?.(ctx), 0);
  assert.equal(treasureHooks.isTreasureEffectDepleted?.(ctx), true);
});

test("旧存档：全局 extraLetterScoreWordsRemaining 迁入首个旋钮槽", () => {
  const rs = createTreasureRunState();
  rs.extraLetterScoreWordsRemaining = 7;
  const slots = [{ treasureId: "64" }, { treasureId: "64" }];
  initTreasureBankOnAcquire("64", rs, slots[0]);
  slots[0].bank.scoreAdd = 0;
  initTreasureBankOnAcquire("64", rs, slots[1]);
  migrateLegacyKnobWordsRemaining(rs, slots);
  assert.equal(slots[0].bank?.scoreAdd, 7);
  assert.equal(rs.extraLetterScoreWordsRemaining, 0);
  assert.equal(slots[1].bank?.scoreAdd, 10);
});
