import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSettlementSnapshot,
  buildSettlementDisplayRows,
  settlementCountForRow,
} from "./buildSettlementSnapshot.js";
import { settlementDollarMarks } from "./moneyDisplay.js";

test("buildSettlementSnapshot: default mode with interest and spare moves", () => {
  const snap = buildSettlementSnapshot({
    moneyBefore: 25,
    clearReward: 4,
    remainingWords: 2,
    remainingRemovals: 1,
    rentalTreasureCount: 0,
    runPresetId: "preset_01",
    ownedVoucherIds: [],
  });
  assert.equal(snap.mode, "default");
  assert.equal(snap.clearReward, 4);
  assert.equal(snap.spareMoves, 2);
  assert.equal(snap.interest, 5);
  assert.equal(snap.rentalDeduction, 0);
  assert.equal(snap.total, 11);
});

test("buildSettlementSnapshot: rental deduction subtracts from total", () => {
  const snap = buildSettlementSnapshot({
    moneyBefore: 10,
    clearReward: 3,
    remainingWords: 0,
    remainingRemovals: 0,
    rentalTreasureCount: 2,
    runPresetId: "preset_01",
    ownedVoucherIds: [],
  });
  assert.equal(snap.rentalDeduction, 6);
  assert.equal(snap.total, -1);
  const rentalRow = buildSettlementDisplayRows(snap).find((r) => r.key === "rental");
  assert.ok(rentalRow?.isDeduction);
  assert.equal(settlementCountForRow(snap, rentalRow), -6);
  assert.equal(settlementDollarMarks(-6), "-$$$$$$");
});

test("buildSettlementSnapshot: convertRemainsNoInterest mode", () => {
  const snap = buildSettlementSnapshot({
    moneyBefore: 8,
    clearReward: 5,
    remainingWords: 3,
    remainingRemovals: 2,
    rentalTreasureCount: 0,
    runPresetId: "preset_03",
    ownedVoucherIds: [],
  });
  assert.equal(snap.mode, "convertRemainsNoInterest");
  assert.equal(snap.spareWordsReward, 6);
  assert.equal(snap.spareDiscardsReward, 2);
  assert.equal(snap.interest, 0);
  assert.equal(snap.total, 13);
});

test("buildSettlementSnapshot: ledger extraInterest mirrors base interest", () => {
  const snap = buildSettlementSnapshot({
    moneyBefore: 25,
    clearReward: 4,
    remainingWords: 0,
    remainingRemovals: 0,
    rentalTreasureCount: 0,
    runPresetId: "preset_01",
    ownedVoucherIds: [],
    ownedSlotTreasureIds: ["124"],
  });
  assert.equal(snap.interest, 5);
  assert.equal(snap.extraInterest, 5);
  assert.equal(snap.total, 14);
});

test("buildSettlementSnapshot: no extraInterest without ledger", () => {
  const snap = buildSettlementSnapshot({
    moneyBefore: 25,
    clearReward: 4,
    remainingWords: 0,
    remainingRemovals: 0,
    rentalTreasureCount: 0,
    runPresetId: "preset_01",
    ownedVoucherIds: [],
    ownedSlotTreasureIds: [],
  });
  assert.equal(snap.extraInterest ?? 0, 0);
});

test("buildSettlementSnapshot: negative wallet interest", () => {
  const snap = buildSettlementSnapshot({
    moneyBefore: -12,
    clearReward: 3,
    remainingWords: 1,
    remainingRemovals: 0,
    rentalTreasureCount: 0,
    runPresetId: "preset_01",
    ownedVoucherIds: [],
  });
  assert.equal(snap.interest, -2);
  assert.equal(snap.total, 2);
});
