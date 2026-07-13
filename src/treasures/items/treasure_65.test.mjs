import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPotteryDiscardProcs,
  rollPotteryDiscardProcIndicesBySlot,
  treasureHooks,
  TREASURE_65_ID,
  DISCARD_SCORE_AWARD,
} from "./treasure_65.js";
import { createTreasureRunState } from "../treasureRunState.js";
import { getScoreAddBank } from "../treasureBankHelpers.js";

test("双陶罐：各槽独立掷骰，入账到各自 bank", () => {
  const rs = createTreasureRunState();
  const owned = [
    { treasureId: "65", bank: { multAdd: 0, multMul: 1, scoreAdd: 0 } },
    { treasureId: "65", bank: { multAdd: 0, multMul: 1, scoreAdd: 0 } },
    null,
  ];
  const ownedIds = ["65", "65", null];
  const bySlot = { 0: [0], 1: [1] };

  treasureHooks.onDiscardBatch?.({
    treasureRun: rs,
    ownedSlotTreasureIds: ownedIds,
    ownedTreasureInstances: owned,
    hookSlotIndex: 0,
    hookSource: "self",
    potteryDiscardProcIndicesBySlot: bySlot,
    discardedLetters: [{ letter: "a" }, { letter: "b" }],
  });
  treasureHooks.onDiscardBatch?.({
    treasureRun: rs,
    ownedSlotTreasureIds: ownedIds,
    ownedTreasureInstances: owned,
    hookSlotIndex: 1,
    hookSource: "self",
    potteryDiscardProcIndicesBySlot: bySlot,
    discardedLetters: [{ letter: "a" }, { letter: "b" }],
  });

  assert.equal(
    getScoreAddBank(rs, TREASURE_65_ID, { slotIndex: 0, ownedTreasureInstances: owned }),
    4,
  );
  assert.equal(
    getScoreAddBank(rs, TREASURE_65_ID, { slotIndex: 1, ownedTreasureInstances: owned }),
    4,
  );
});

test("rollPotteryDiscardProcIndicesBySlot：为每个实体陶罐槽各掷一次", () => {
  const ownedIds = ["65", "65", null];
  let n = 0;
  const rng = () => {
    n += 1;
    return n === 1 || n === 4 ? 0.01 : 0.99;
  };
  const bySlot = rollPotteryDiscardProcIndicesBySlot(ownedIds, 2, rng);
  assert.deepEqual(bySlot[0], [0]);
  assert.deepEqual(bySlot[1], [1]);
});

test("applyPotteryDiscardProcs：按 hookSlotIndex 写入对应槽位", () => {
  const rs = createTreasureRunState();
  const owned = [
    { treasureId: "65", bank: { multAdd: 0, multMul: 1, scoreAdd: 0 } },
    { treasureId: "65", bank: { multAdd: 0, multMul: 1, scoreAdd: 0 } },
    null,
  ];
  applyPotteryDiscardProcs(rs, [0, 1], {
    hookSlotIndex: 1,
    ownedSlotTreasureIds: ["65", "65", null],
    ownedTreasureInstances: owned,
    hookSource: "self",
  });
  assert.equal(getScoreAddBank(rs, TREASURE_65_ID, { slotIndex: 0, ownedTreasureInstances: owned }), 0);
  assert.equal(getScoreAddBank(rs, TREASURE_65_ID, { slotIndex: 1, ownedTreasureInstances: owned }), 8);
});
