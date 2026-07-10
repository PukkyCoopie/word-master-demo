import test from "node:test";
import assert from "node:assert/strict";
import {
  WORD_LENGTH_BALANCE,
  getLengthBalanceBaseMult,
  getLengthBalanceBaseScore,
  getLengthUpgradeLookupKey,
  normalizeJudgedWordLength,
  resolveLengthUpgradeLen,
} from "./wordLengthBalance.js";

test("normalizeJudgedWordLength: floor at 3, no upper cap", () => {
  assert.equal(normalizeJudgedWordLength(0), 3);
  assert.equal(normalizeJudgedWordLength(2), 3);
  assert.equal(normalizeJudgedWordLength(16), 16);
  assert.equal(normalizeJudgedWordLength(17), 17);
  assert.equal(normalizeJudgedWordLength(20), 20);
});

test("getLengthUpgradeLookupKey caps at 16", () => {
  assert.equal(getLengthUpgradeLookupKey(16), 16);
  assert.equal(getLengthUpgradeLookupKey(17), 16);
});

test("resolveLengthUpgradeLen maps 17+ to 16", () => {
  assert.equal(resolveLengthUpgradeLen(17), 16);
  assert.equal(resolveLengthUpgradeLen(3), 3);
  assert.equal(resolveLengthUpgradeLen(2), null);
});

test("extrapolated base score/mult: +36/+20 first step, +4 step growth", () => {
  assert.equal(getLengthBalanceBaseScore(16), WORD_LENGTH_BALANCE[16].base[0]);
  assert.equal(getLengthBalanceBaseMult(16), WORD_LENGTH_BALANCE[16].base[1]);
  assert.equal(getLengthBalanceBaseScore(17), 156);
  assert.equal(getLengthBalanceBaseMult(17), 100);
  assert.equal(getLengthBalanceBaseScore(18), 196);
  assert.equal(getLengthBalanceBaseMult(18), 124);
  assert.equal(getLengthBalanceBaseScore(19), 240);
  assert.equal(getLengthBalanceBaseMult(19), 152);
  assert.equal(getLengthBalanceBaseScore(20), 288);
  assert.equal(getLengthBalanceBaseMult(20), 184);
});
