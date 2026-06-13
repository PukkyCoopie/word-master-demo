import assert from "node:assert/strict";
import {
  getInitialDeckLetterCount,
  allLetterRaws,
} from "../game/initialDeckLetterCounts.js";
import {
  getTilePackLetterWeight,
  pickDistinctWeightedLetterRaws,
} from "./tilePackLetterRoll.js";

assert.equal(getInitialDeckLetterCount("e"), 9);
assert.equal(getInitialDeckLetterCount("t"), 3);
assert.equal(getInitialDeckLetterCount("j"), 1);
assert.equal(getInitialDeckLetterCount("q"), 1);

assert.equal(getTilePackLetterWeight("e"), 2);
assert.equal(getTilePackLetterWeight("t"), 1.25);
assert.equal(getTilePackLetterWeight("z"), 1);

/** @type {() => number} */
function seqRng(values) {
  let i = 0;
  return () => {
    const v = values[i] ?? values[values.length - 1];
    i += 1;
    return v;
  };
}

const pool = allLetterRaws();
assert.equal(pool.length, 26);

const picked = pickDistinctWeightedLetterRaws(seqRng([0, 0]), 3, ["e", "z", "t"]);
assert.deepEqual(picked, ["e", "z", "t"]);

const picked2 = pickDistinctWeightedLetterRaws(seqRng([0.99, 0]), 2, ["e", "z"]);
assert.deepEqual(picked2, ["z", "e"]);

console.log("tilePackLetterRoll.test.mjs ok");
