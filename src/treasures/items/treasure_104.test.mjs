import test from "node:test";
import assert from "node:assert/strict";
import { pickMirrorCopySourceSlotIndex, treasureHooks } from "./treasure_104.js";
import { createTreasureRunState } from "../treasureRunState.js";

test("镜子充能：无槽位上下文时进度为 0", () => {
  const rs = createTreasureRunState();
  const ctx = { chargeWordsSubmitted: 0, treasureRun: rs };
  assert.equal(treasureHooks.getChargeProgress?.(ctx), 0);
  assert.equal(treasureHooks.getChargeVisualState?.(ctx), "inactive");
});

test("镜子充能：按槽位 bank.scoreAdd 解析进度与 active", () => {
  const rs = createTreasureRunState();
  const owned = [
    { treasureId: "104", bank: { multAdd: 0, multMul: 1, scoreAdd: 1 } },
    { treasureId: "104", bank: { multAdd: 0, multMul: 1, scoreAdd: 2 } },
    null,
  ];
  const ctx0 = {
    chargeWordsSubmitted: 0,
    treasureRun: rs,
    slotIndex: 0,
    ownedTreasureInstances: owned,
  };
  const ctx1 = { ...ctx0, slotIndex: 1 };
  assert.equal(treasureHooks.getChargeProgress?.(ctx0), 0.5);
  assert.equal(treasureHooks.getChargeVisualState?.(ctx0), "inactive");
  assert.equal(treasureHooks.getChargeProgress?.(ctx1), 1);
  assert.equal(treasureHooks.getChargeVisualState?.(ctx1), "active");
});

test("pickMirrorCopySourceSlotIndex：无其他宝藏时不复制", () => {
  const owned = [{ treasureId: "104" }, null, null];
  assert.equal(pickMirrorCopySourceSlotIndex(owned, 0), -1);
});

test("pickMirrorCopySourceSlotIndex：优先非镜子", () => {
  const owned = [
    { treasureId: "104" },
    { treasureId: "20" },
    { treasureId: "104" },
  ];
  assert.equal(pickMirrorCopySourceSlotIndex(owned, 0, () => 0), 1);
});

test("pickMirrorCopySourceSlotIndex：仅余镜子时复制另一枚镜子", () => {
  const owned = [{ treasureId: "104" }, { treasureId: "104" }, null];
  assert.equal(pickMirrorCopySourceSlotIndex(owned, 0, () => 0), 1);
});
