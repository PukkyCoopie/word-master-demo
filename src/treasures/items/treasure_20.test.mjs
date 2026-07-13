import test from "node:test";
import assert from "node:assert/strict";
import { treasureHooks } from "./treasure_20.js";
import { createTreasureRunState } from "../treasureRunState.js";
import { migrateLegacyBasketballWordsSubmitted } from "../treasureRunState.js";
import { readTreasureBankSnapshot } from "../treasureBankHelpers.js";

const ID = "20";

function ownedPair() {
  const owned = [
    { treasureId: ID, bank: { multAdd: 0, multMul: 1, scoreAdd: 0, posPackProgress: 3 } },
    { treasureId: ID, bank: { multAdd: 0, multMul: 1, scoreAdd: 0, posPackProgress: 4 } },
    null,
  ];
  return { owned, ownedIds: [ID, ID, null] };
}

test("篮球充能：各槽独立读取 posPackProgress", () => {
  const rs = createTreasureRunState();
  const { owned } = ownedPair();

  assert.equal(
    treasureHooks.getChargeVisualState?.({
      treasureRun: rs,
      slotIndex: 0,
      ownedTreasureInstances: owned,
    }),
    "inactive",
  );
  assert.equal(
    treasureHooks.getChargeProgress?.({
      treasureRun: rs,
      slotIndex: 0,
      ownedTreasureInstances: owned,
    }),
    0.6,
  );
  assert.equal(
    treasureHooks.getChargeVisualState?.({
      treasureRun: rs,
      slotIndex: 1,
      ownedTreasureInstances: owned,
    }),
    "active",
  );
  assert.equal(
    treasureHooks.getChargeProgress?.({
      treasureRun: rs,
      slotIndex: 1,
      ownedTreasureInstances: owned,
    }),
    1,
  );
});

test("篮球 buildPostLetterStep：仅充能已满的槽贡献 x4", () => {
  const rs = createTreasureRunState();
  const { owned, ownedIds } = ownedPair();

  const inactive = treasureHooks.buildPostLetterStep?.({
    treasureRun: rs,
    ownedSlotTreasureIds: ownedIds,
    ownedTreasureInstances: owned,
    hookSlotIndex: 0,
    hookSource: "self",
  });
  const active = treasureHooks.buildPostLetterStep?.({
    treasureRun: rs,
    ownedSlotTreasureIds: ownedIds,
    ownedTreasureInstances: owned,
    hookSlotIndex: 1,
    hookSource: "self",
  });

  assert.equal(inactive, null);
  assert.deepEqual(active, { multMul: 4 });
});

test("篮球 onSuccessfulWordSubmit：各槽独立 +1 进度", () => {
  const rs = createTreasureRunState();
  const { owned, ownedIds } = ownedPair();

  treasureHooks.onSuccessfulWordSubmit?.({
    treasureRun: rs,
    ownedSlotTreasureIds: ownedIds,
    ownedTreasureInstances: owned,
    hookSlotIndex: 0,
    hookSource: "self",
  });
  treasureHooks.onSuccessfulWordSubmit?.({
    treasureRun: rs,
    ownedSlotTreasureIds: ownedIds,
    ownedTreasureInstances: owned,
    hookSlotIndex: 0,
    hookSource: "self",
  });

  assert.equal(
    readTreasureBankSnapshot(rs, ID, { slotIndex: 0, ownedTreasureInstances: owned })?.posPackProgress,
    5,
  );
  assert.equal(
    readTreasureBankSnapshot(rs, ID, { slotIndex: 1, ownedTreasureInstances: owned })?.posPackProgress,
    4,
  );
});

test("migrateLegacyBasketballWordsSubmitted：写入 progress 为 0 的篮球槽", () => {
  const owned = [
    { treasureId: ID, bank: { multAdd: 0, multMul: 1, scoreAdd: 0, posPackProgress: 0 } },
    { treasureId: ID, bank: { multAdd: 0, multMul: 1, scoreAdd: 0, posPackProgress: 2 } },
  ];
  migrateLegacyBasketballWordsSubmitted(owned, 7);
  assert.equal(owned[0].bank.posPackProgress, 7);
  assert.equal(owned[1].bank.posPackProgress, 2);
});
