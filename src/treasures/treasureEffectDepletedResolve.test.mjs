import test from "node:test";
import assert from "node:assert/strict";
import { initTreasureBankOnAcquire } from "./treasureAcquireInit.js";
import { createTreasureRunState } from "./treasureRunState.js";
import { isOwnedTreasureBarSlotContext } from "./treasureOwnedBarContext.js";
import { treasureHooks as knobHooks } from "./items/treasure_64.js";

test("isOwnedTreasureBarSlotContext：商店/开发者预览不在栏位列表 → false", () => {
  const owned = { treasureId: "64" };
  const preview = { treasureId: "64", emoji: "🎛️" };
  assert.equal(isOwnedTreasureBarSlotContext(preview, 0, [owned, null]), false);
  assert.equal(isOwnedTreasureBarSlotContext(owned, 0, [owned, null]), true);
  assert.equal(isOwnedTreasureBarSlotContext(owned, 1, [owned, null]), false);
});

test("旋钮耗尽：无栏位上下文时钩子会误判 true，UI 须先过 isOwnedTreasureBarSlotContext", () => {
  const rs = createTreasureRunState();
  const preview = { treasureId: "64" };
  assert.equal(
    knobHooks.isTreasureEffectDepleted?.({ treasureRun: rs, ownedSlot: preview }),
    true,
  );
  assert.equal(isOwnedTreasureBarSlotContext(preview, null, [{ treasureId: "64" }]), false);
});

test("旋钮耗尽：栏位实例 scoreAdd=0 时为 true，>0 时为 false", () => {
  const rs = createTreasureRunState();
  const knob = { treasureId: "64" };
  initTreasureBankOnAcquire("64", rs, knob);
  const instances = [knob, null];
  const ctx = {
    treasureRun: rs,
    ownedSlot: knob,
    slotIndex: 0,
    ownedTreasureInstances: instances,
  };

  knob.bank.scoreAdd = 0;
  assert.equal(knobHooks.isTreasureEffectDepleted?.(ctx), true);

  knob.bank.scoreAdd = 3;
  assert.equal(knobHooks.isTreasureEffectDepleted?.(ctx), false);
});
