import assert from "node:assert/strict";
import test from "node:test";
import { nextAlphabetLetterRaw } from "./spellLetterShift.js";

test("nextAlphabetLetterRaw advances a-y and wraps z", () => {
  assert.equal(nextAlphabetLetterRaw("a"), "b");
  assert.equal(nextAlphabetLetterRaw("o"), "p");
  assert.equal(nextAlphabetLetterRaw("z"), "a");
  assert.equal(nextAlphabetLetterRaw("Z"), "a");
  assert.equal(nextAlphabetLetterRaw("qu"), "r");
  assert.equal(nextAlphabetLetterRaw("q"), "r");
  assert.equal(nextAlphabetLetterRaw("?"), null);
  assert.equal(nextAlphabetLetterRaw(""), null);
});
