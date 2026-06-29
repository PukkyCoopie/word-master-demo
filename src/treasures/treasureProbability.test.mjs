import assert from "node:assert/strict";
import test from "node:test";
import {
  countProbabilityDoublerContributions,
  effectiveProbability,
  formatProbabilityLabel,
  hasProbabilityDoubler,
  parseProbabilityFraction,
} from "./treasureProbability.js";

test("countProbabilityDoublerContributions 按槽位与 blueprint 叠乘", () => {
  assert.equal(countProbabilityDoublerContributions(["45", null, null]), 1);
  assert.equal(countProbabilityDoublerContributions(["45", "45", null]), 2);
  assert.equal(countProbabilityDoublerContributions(["98", "45", null]), 2);
  assert.equal(hasProbabilityDoubler(["45", "45"]), true);
  assert.equal(hasProbabilityDoubler([null, "12"]), false);
});

test("effectiveProbability 多枚彗星按 2^n 叠乘并封顶 1", () => {
  assert.equal(effectiveProbability(1, 5, ["45"]), 0.4);
  assert.equal(effectiveProbability(1, 5, ["45", "45"]), 0.8);
  assert.equal(effectiveProbability(1, 5, ["45", "45", "45"]), 1);
});

test("formatProbabilityLabel 与 parseProbabilityFraction 展示叠乘分子", () => {
  assert.equal(formatProbabilityLabel(1, 5, 0), "1/5");
  assert.equal(formatProbabilityLabel(1, 5, 1), "2/5");
  assert.equal(formatProbabilityLabel(1, 5, 2), "4/5");
  assert.equal(formatProbabilityLabel(1, 5, 3), "5/5");
  assert.equal(parseProbabilityFraction("1/5", 2), "4/5");
});
