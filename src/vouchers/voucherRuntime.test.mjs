import test from "node:test";
import assert from "node:assert/strict";
import {
  getTelescopeLengthUpgradeSlot,
  isLengthObservatoryBoosted,
  resolveTelescopeLengthUpgradeGroupKey,
} from "./voucherRuntime.js";

const LENGTH_GROUPS = Object.freeze([
  Object.freeze({ key: "len3", minLen: 3, maxLen: 3 }),
  Object.freeze({ key: "len4", minLen: 4, maxLen: 4 }),
  Object.freeze({ key: "len5", minLen: 5, maxLen: 5 }),
  Object.freeze({ key: "len6_7", minLen: 6, maxLen: 7 }),
  Object.freeze({ key: "len8_10", minLen: 8, maxLen: 10 }),
  Object.freeze({ key: "len11_plus", minLen: 11, maxLen: 16 }),
]);

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
