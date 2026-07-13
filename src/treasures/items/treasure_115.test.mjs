import test from "node:test";
import assert from "node:assert/strict";
import { treasureHooks } from "./treasure_115.js";
import { createTreasureRunState } from "../treasureRunState.js";
import { getMultMulBank, readTreasureBankSnapshot } from "../treasureBankHelpers.js";
import { expandEffectTokensInDescription } from "../treasureDescription.js";

const ID = "115";

function ownedPair() {
  const owned = [
    { treasureId: ID, bank: { multAdd: 0, multMul: 1, scoreAdd: 0, posPackProgress: 0 } },
    { treasureId: ID, bank: { multAdd: 0, multMul: 1, scoreAdd: 0, posPackProgress: 10 } },
    null,
  ];
  return { owned, ownedIds: [ID, ID, null] };
}

test("洗衣篮 patchDescription：未拥有时无还差提示，已拥有时在字母块后写（还差x个）", () => {
  const rs = createTreasureRunState();
  const unowned = treasureHooks.patchDescription?.({ treasureRun: rs });
  assert.ok(unowned?.some((s) => s.type === "text" && s.v.includes("26个字母块")));
  assert.ok(!unowned?.some((s) => s.type === "text" && s.v.includes("还差")));

  const { owned, ownedIds } = ownedPair();
  const ownedDesc = treasureHooks.patchDescription?.({
    treasureRun: rs,
    ownedSlotTreasureIds: ownedIds,
    ownedTreasureInstances: owned,
    slotIndex: 1,
  });
  assert.ok(ownedDesc?.some((s) => s.type === "text" && s.v.includes("26个字母块（还差16个）")));
  assert.ok(!expandEffectTokensInDescription(ownedDesc ?? []).some((s) => s.type === "prob"));
});

test("洗衣篮 onDiscardBatch：各槽独立累计弃牌进度", async () => {
  const rs = createTreasureRunState();
  const { owned, ownedIds } = ownedPair();

  await treasureHooks.onDiscardBatch?.({
    treasureRun: rs,
    ownedSlotTreasureIds: ownedIds,
    ownedTreasureInstances: owned,
    hookSlotIndex: 0,
    hookSource: "self",
    letterCount: 5,
  });
  await treasureHooks.onDiscardBatch?.({
    treasureRun: rs,
    ownedSlotTreasureIds: ownedIds,
    ownedTreasureInstances: owned,
    hookSlotIndex: 1,
    hookSource: "self",
    letterCount: 5,
  });

  assert.equal(
    readTreasureBankSnapshot(rs, ID, { slotIndex: 0, ownedTreasureInstances: owned })?.posPackProgress,
    5,
  );
  assert.equal(
    readTreasureBankSnapshot(rs, ID, { slotIndex: 1, ownedTreasureInstances: owned })?.posPackProgress,
    15,
  );
});

test("洗衣篮 onDiscardBatch：满 26 时各自独立 +1 倍率并重置进度", async () => {
  const rs = createTreasureRunState();
  const { owned, ownedIds } = ownedPair();
  owned[0].bank.posPackProgress = 24;
  owned[1].bank.multMul = 2;

  await treasureHooks.onDiscardBatch?.({
    treasureRun: rs,
    ownedSlotTreasureIds: ownedIds,
    ownedTreasureInstances: owned,
    hookSlotIndex: 0,
    hookSource: "self",
    letterCount: 3,
  });

  assert.equal(
    readTreasureBankSnapshot(rs, ID, { slotIndex: 0, ownedTreasureInstances: owned })?.posPackProgress,
    1,
  );
  assert.equal(getMultMulBank(rs, ID, { slotIndex: 0, ownedTreasureInstances: owned }), 2);
  assert.equal(getMultMulBank(rs, ID, { slotIndex: 1, ownedTreasureInstances: owned }), 2);
});
