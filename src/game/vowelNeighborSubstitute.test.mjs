import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveWordPatternWithVowelSubstitutions,
  vowelDisplayShiftForResolved,
  hasTestTubeAllVowelsForMouth,
  buildMouthSubstituteTriosForPattern,
  candidateMatchesMouthSubstitutePattern,
} from "./vowelNeighborSubstitute.js";

const OWNED_MOUTH = ["95"];
const OWNED_MOUTH_TUBE = ["95", "30"];

/** @param {Set<string>} dict @returns {(p: string) => string | null} */
function exactFromSet(dict) {
  return (p) => (dict.has(p) ? p : null);
}

test("resolveWordPatternWithVowelSubstitutions: exact match first", () => {
  const dict = new Set(["cat"]);
  const mask = [true, true, true];
  const hit = resolveWordPatternWithVowelSubstitutions("cat", mask, exactFromSet(dict), OWNED_MOUTH_TUBE);
  assert.equal(hit, "cat");
});

test("resolveWordPatternWithVowelSubstitutions: single alphabet neighbor (tube+mouth)", () => {
  const dict = new Set(["bat"]);
  const mask = [true, true, true];
  const hit = resolveWordPatternWithVowelSubstitutions("cat", mask, exactFromSet(dict), OWNED_MOUTH_TUBE);
  assert.equal(hit, "bat");
});

test("resolveWordPatternWithVowelSubstitutions: vowel-only mouth chain", () => {
  const dict = new Set(["cet"]);
  const mask = [false, true, false];
  const hit = resolveWordPatternWithVowelSubstitutions("cat", mask, exactFromSet(dict), OWNED_MOUTH);
  assert.equal(hit, "cet");
});

test("resolveWordPatternWithVowelSubstitutions: two-position tube substitution", () => {
  const dict = new Set(["bau"]);
  const mask = [true, true, true];
  const hit = resolveWordPatternWithVowelSubstitutions("cat", mask, exactFromSet(dict), OWNED_MOUTH_TUBE);
  assert.equal(hit, "bau");
});

test("resolveWordPatternWithVowelSubstitutions: no match returns null", () => {
  const dict = new Set(["zzz"]);
  const mask = [true, true];
  const hit = resolveWordPatternWithVowelSubstitutions("ab", mask, exactFromSet(dict), OWNED_MOUTH_TUBE);
  assert.equal(hit, null);
});

test("hasTestTubeAllVowelsForMouth", () => {
  assert.equal(hasTestTubeAllVowelsForMouth(["30"]), true);
  assert.equal(hasTestTubeAllVowelsForMouth(["95"]), false);
});

test("vowelDisplayShiftForResolved with alphabet neighbors", () => {
  assert.equal(vowelDisplayShiftForResolved("c", "b", OWNED_MOUTH_TUBE), -1);
  assert.equal(vowelDisplayShiftForResolved("c", "d", OWNED_MOUTH_TUBE), 1);
  assert.equal(vowelDisplayShiftForResolved("c", "c", OWNED_MOUTH_TUBE), 0);
});

test("candidateMatchesMouthSubstitutePattern: tube single neighbor", () => {
  const trios = buildMouthSubstituteTriosForPattern("cat", [true, true, true], "?", OWNED_MOUTH_TUBE);
  assert.equal(candidateMatchesMouthSubstitutePattern("cat", "bat", trios), true);
  assert.equal(candidateMatchesMouthSubstitutePattern("cat", "dog", trios), false);
});

test("candidateMatchesMouthSubstitutePattern: wildcard position", () => {
  const trios = buildMouthSubstituteTriosForPattern("c?t", [true, false, true], "?", OWNED_MOUTH_TUBE);
  assert.equal(candidateMatchesMouthSubstitutePattern("c?t", "cat", trios), true);
  assert.equal(candidateMatchesMouthSubstitutePattern("c?t", "cut", trios), true);
  assert.equal(candidateMatchesMouthSubstitutePattern("c?t", "dog", trios), false);
});
