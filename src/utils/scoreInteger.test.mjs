import assert from "node:assert/strict";
import {
  addScore,
  ceilScoreProduct,
  compareScore,
  deserializeScore,
  multiplyScoreRound,
  interpolateScore,
  normalizeScore,
  parseScore,
  roundBigIntToTwoSignificantDigits,
  scoreGte,
  scoreGt,
  scoreLt,
  serializeScore,
  subtractScore,
} from "./scoreInteger.js";

assert.equal(parseScore(0), 0n);
assert.equal(parseScore("860000000000000000000"), 860000000000000000000n);
assert.equal(parseScore(9007199254740991), 9007199254740991n);

assert.equal(normalizeScore(1234n), 1234);
assert.equal(normalizeScore(9007199254740992n), "9007199254740992");

assert.equal(serializeScore(100), 100);
assert.equal(serializeScore("9007199254740992"), "9007199254740992");
assert.equal(deserializeScore(999), 999);
assert.equal(deserializeScore("860000000000000000000"), "860000000000000000000");

{
  assert.equal(addScore("9007199254740992", "1"), "9007199254740993");
  assert.equal(Number("9007199254740990") + 10, 9007199254741000);
  assert.equal(addScore("9007199254740992", "10"), "9007199254741002");
}

assert.equal(multiplyScoreRound(1_000_000, 2.5, 1), 2_500_000);
assert.equal(
  multiplyScoreRound("1000000000000", 1000000, 1),
  "1000000000000000000",
);

assert.equal(scoreGte("9007199254740992", 9007199254740991), true);
assert.equal(scoreLt(100, 200), true);
assert.equal(compareScore(addScore("860000000000000000000", 1), "860000000000000000000"), 1);

assert.equal(ceilScoreProduct(100, 0.25), 25);
assert.equal(ceilScoreProduct(101, 0.25), 26);

assert.equal(roundBigIntToTwoSignificantDigits(12345n), 12000n);
assert.equal(roundBigIntToTwoSignificantDigits(98765n), 99000n);

assert.equal(subtractScore(100, 30), 70);
assert.equal(subtractScore(30, 100), 0);

{
  const handScore = 500;
  assert.equal(interpolateScore(handScore, 0, 0), handScore);
  assert.ok(scoreLt(interpolateScore(handScore, 0, 1), handScore));
  assert.ok(scoreGt(interpolateScore(handScore, 0, 0.25), interpolateScore(handScore, 0, 0.75)));
}

console.log("scoreInteger.test.mjs ok");
