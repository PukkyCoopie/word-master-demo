import test from "node:test";
import assert from "node:assert/strict";
import {
  getGlyphPurchaseTargetLevelIndex,
  getTelescopeLengthUpgradeSlot,
  isLengthObservatoryBoosted,
  resolveTelescopeLengthUpgradeGroupKey,
} from "./voucherRuntime.js";
import { getRunLevelAtIndex, getRunLevelIndexForId, STANDARD_RUN_FINAL_LEVEL_INDEX } from "../levelDefinitions.js";

const LENGTH_GROUPS = Object.freeze([
  Object.freeze({ key: "len3", minLen: 3, maxLen: 3 }),
  Object.freeze({ key: "len4", minLen: 4, maxLen: 4 }),
  Object.freeze({ key: "len5", minLen: 5, maxLen: 5 }),
  Object.freeze({ key: "len6_7", minLen: 6, maxLen: 7 }),
  Object.freeze({ key: "len8_10", minLen: 8, maxLen: 10 }),
  Object.freeze({ key: "len11_plus", minLen: 11, maxLen: 16 }),
]);

test("getGlyphPurchaseTargetLevelIndex: 2-2 店后回退至 1-3", () => {
  const ix22 = getRunLevelIndexForId("2-2");
  assert.notEqual(ix22, null);
  assert.equal(getGlyphPurchaseTargetLevelIndex(ix22), getRunLevelIndexForId("1-3"));
});

test("getGlyphPurchaseTargetLevelIndex: 无尽 12-1 店后回退至 11-2", () => {
  const ix121 = getRunLevelIndexForId("12-1");
  assert.notEqual(ix121, null);
  assert.equal(
    getGlyphPurchaseTargetLevelIndex(ix121, { isEndlessRun: true }),
    getRunLevelIndexForId("11-2"),
  );
});

test("getGlyphPurchaseTargetLevelIndex: 无尽 9-1 店后不可回退至 8 章", () => {
  const ix91 = getRunLevelIndexForId("9-1");
  assert.notEqual(ix91, null);
  assert.equal(getGlyphPurchaseTargetLevelIndex(ix91, { isEndlessRun: true }), null);
});

test("getGlyphPurchaseTargetLevelIndex: 标准终局下标以上不再钳制到 8-3", () => {
  const beyondFinal = STANDARD_RUN_FINAL_LEVEL_INDEX + 6;
  const upcomingId = getRunLevelAtIndex(beyondFinal + 1).id;
  const [upMajor, upMinor] = upcomingId.split("-").map(Number);
  const expectedId = `${upMajor - 1}-${upMinor}`;
  const target = getGlyphPurchaseTargetLevelIndex(beyondFinal, { isEndlessRun: true });
  assert.notEqual(target, getRunLevelIndexForId("8-3"));
  assert.equal(target, getRunLevelIndexForId(expectedId));
});

test("getTelescopeLengthUpgradeSlot maps 17+ to 16", () => {
  assert.equal(getTelescopeLengthUpgradeSlot(16), 16);
  assert.equal(getTelescopeLengthUpgradeSlot(17), 16);
  assert.equal(getTelescopeLengthUpgradeSlot(19), 16);
  assert.equal(getTelescopeLengthUpgradeSlot(12), 12);
  assert.equal(getTelescopeLengthUpgradeSlot(2), 0);
});

test("resolveTelescopeLengthUpgradeGroupKey: 16+ maps to len11_plus", () => {
  assert.equal(resolveTelescopeLengthUpgradeGroupKey(16, LENGTH_GROUPS), "len11_plus");
  assert.equal(resolveTelescopeLengthUpgradeGroupKey(17, LENGTH_GROUPS), "len11_plus");
  assert.equal(resolveTelescopeLengthUpgradeGroupKey(19, LENGTH_GROUPS), "len11_plus");
  assert.equal(resolveTelescopeLengthUpgradeGroupKey(9, LENGTH_GROUPS), "len8_10");
  assert.equal(resolveTelescopeLengthUpgradeGroupKey(2, LENGTH_GROUPS), null);
});

test("isLengthObservatoryBoosted: most 19 boosts slot 16 only", () => {
  const owned = ["v_telescope_2"];
  const counts = { 19: 3 };
  assert.equal(isLengthObservatoryBoosted(owned, 16, counts), true);
  assert.equal(isLengthObservatoryBoosted(owned, 19, counts), true);
  assert.equal(isLengthObservatoryBoosted(owned, 11, counts), false);
  assert.equal(isLengthObservatoryBoosted(owned, 12, counts), false);
});

test("isLengthObservatoryBoosted: most 12 boosts slot 12 only", () => {
  const owned = ["v_telescope_2"];
  const counts = { 12: 2 };
  assert.equal(isLengthObservatoryBoosted(owned, 12, counts), true);
  assert.equal(isLengthObservatoryBoosted(owned, 16, counts), false);
});
