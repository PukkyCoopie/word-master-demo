import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSlotIndexByLength,
  matchWordIdsForMouthPattern,
  matchWordIdsForPattern,
} from "./dictionarySlotIndex.js";
import { buildMouthSubstituteTriosForPattern } from "../game/vowelNeighborSubstitute.js";

const OWNED_MOUTH = ["95"];

/** @param {string[]} words */
function bruteMatch(raw, wildcardChar, words) {
  return words.filter((w) => {
    if (w.length !== raw.length) return false;
    for (let i = 0; i < raw.length; i += 1) {
      if (raw[i] !== wildcardChar && raw[i] !== w[i]) return false;
    }
    return true;
  });
}

test("slot index: c?t matches cat and cut only", () => {
  const byLength = new Map([[3, ["cat", "cut", "car", "dog"]]]);
  const slotIndex = buildSlotIndexByLength(byLength);
  const lenIdx = slotIndex.get(3);
  assert.ok(lenIdx);
  const ids = matchWordIdsForPattern(lenIdx, "c?t", "?");
  const matched = [...ids].map((id) => lenIdx.words[id]).sort();
  assert.deepEqual(matched, ["cat", "cut"]);
  assert.deepEqual(matched, bruteMatch("c?t", "?", byLength.get(3)).sort());
});

test("slot index: ??e?? shrinks candidate set", () => {
  const words = ["apple", "zebra", "theme", "there", "where"];
  const byLength = new Map([[5, words]]);
  const lenIdx = buildSlotIndexByLength(byLength).get(5);
  const ids = matchWordIdsForPattern(lenIdx, "??e??", "?");
  const matched = [...ids].map((id) => lenIdx.words[id]).sort();
  assert.deepEqual(matched, bruteMatch("??e??", "?", words).sort());
  assert.ok(matched.length < words.length);
});

test("slot index: mouth trio on fixed vowel slot", () => {
  const words = ["cat", "cet", "cot", "cut"];
  const byLength = new Map([[3, words]]);
  const lenIdx = buildSlotIndexByLength(byLength).get(3);
  const raw = "cat";
  const mask = [false, true, false];
  const trios = buildMouthSubstituteTriosForPattern(raw, mask, "?", OWNED_MOUTH);
  const ids = matchWordIdsForMouthPattern(lenIdx, raw, trios, "?");
  const matched = [...ids].map((id) => lenIdx.words[id]).sort();
  assert.deepEqual(matched, ["cat", "cet"]);
});

test("slot index: no match returns empty", () => {
  const byLength = new Map([[3, ["cat", "dog"]]]);
  const lenIdx = buildSlotIndexByLength(byLength).get(3);
  const ids = matchWordIdsForPattern(lenIdx, "c?x", "?");
  assert.equal(ids.length, 0);
});
