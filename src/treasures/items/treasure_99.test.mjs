import test from "node:test";
import assert from "node:assert/strict";
import { treasureHooks, TREASURE_99_ID } from "./treasure_99.js";
import { createTreasureRunState } from "../treasureRunState.js";
import { getMultMulBank } from "../treasureBankHelpers.js";

const INCREMENT = 0.25;

function ownedPair() {
  const owned = [
    { treasureId: TREASURE_99_ID, bank: { multAdd: 0, multMul: 1, scoreAdd: 0 } },
    { treasureId: TREASURE_99_ID, bank: { multAdd: 0, multMul: 1, scoreAdd: 0 } },
    null,
  ];
  return { owned, ownedIds: [TREASURE_99_ID, TREASURE_99_ID, null] };
}

test("滑板 onDiscardBatch：各槽独立 +0.25/E", () => {
  const rs = createTreasureRunState();
  const { owned, ownedIds } = ownedPair();
  const baseCtx = {
    treasureRun: rs,
    ownedSlotTreasureIds: ownedIds,
    ownedTreasureInstances: owned,
    discardedLetters: [{ letter: "e" }],
    hookSource: "self",
  };

  treasureHooks.onDiscardBatch?.({ ...baseCtx, hookSlotIndex: 0 });
  treasureHooks.onDiscardBatch?.({ ...baseCtx, hookSlotIndex: 1 });

  assert.equal(
    getMultMulBank(rs, TREASURE_99_ID, { slotIndex: 0, ownedTreasureInstances: owned }),
    1 + INCREMENT,
  );
  assert.equal(
    getMultMulBank(rs, TREASURE_99_ID, { slotIndex: 1, ownedTreasureInstances: owned }),
    1 + INCREMENT,
  );
});

test("滑板 onDiscardBatch：discardSkateboardFxHandled 时跳过重复入账", () => {
  const rs = createTreasureRunState();
  const { owned, ownedIds } = ownedPair();
  const ctx = {
    treasureRun: rs,
    ownedSlotTreasureIds: ownedIds,
    ownedTreasureInstances: owned,
    discardedLetters: [{ letter: "e" }],
    hookSlotIndex: 0,
    hookSource: "self",
    discardSkateboardFxHandled: true,
  };

  treasureHooks.onDiscardBatch?.(ctx);
  treasureHooks.onDiscardBatch?.({ ...ctx, hookSlotIndex: 1 });

  assert.equal(
    getMultMulBank(rs, TREASURE_99_ID, { slotIndex: 0, ownedTreasureInstances: owned }),
    1,
  );
  assert.equal(
    getMultMulBank(rs, TREASURE_99_ID, { slotIndex: 1, ownedTreasureInstances: owned }),
    1,
  );
});
