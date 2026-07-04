import test from "node:test";
import assert from "node:assert/strict";
import {
  candidateMatchesMouthSlotPattern,
  isQuModeSubmitQFamilyTile,
  slotPatternAlignsWithCandidate,
  buildMouthTriosForSlotPattern,
  submitPartsAlignWithResolved,
  submitPatternCharFromTile,
} from "./quSlotSubmitPattern.js";
import { resolveWordPatternWithVowelSubstitutions } from "./vowelNeighborSubstitute.js";

const OWNED_MOUTH_TUBE = ["95", "30"];

test("slotPatternAlignsWithCandidate: quarter via Qu slot", () => {
  assert.equal(
    slotPatternAlignsWithCandidate("qarter", "quarter", [true, false, false, false, false, false]),
    true,
  );
});

test("submitPartsAlignWithResolved: problem via mouth on Qu slot", () => {
  assert.equal(
    submitPartsAlignWithResolved(
      {
        word: "qroblem",
        vowelAltMask: [true, false, false, false, false, false, false],
        quSlotMask: [true, false, false, false, false, false, false],
      },
      "problem",
      OWNED_MOUTH_TUBE,
    ),
    true,
  );
});

test("candidateMatchesMouthSlotPattern: Qu to p with tube+mouth", () => {
  const trios = buildMouthTriosForSlotPattern(
    "qroblem",
    [true, false, false, false, false, false, false],
    OWNED_MOUTH_TUBE,
  );
  assert.equal(
    candidateMatchesMouthSlotPattern(
      "qroblem",
      "problem",
      [true, false, false, false, false, false, false],
      trios,
    ),
    true,
  );
});

test("isQuModeSubmitQFamilyTile: wildcard from q deck card is not Qu slot", () => {
  const tile = {
    letter: "?",
    isWildcard: true,
    materialId: "wildcard",
    id: "wc-q",
    _deckCard: { raw: "q", isWildcard: true },
  };
  assert.equal(isQuModeSubmitQFamilyTile(tile, "qu"), false);
  assert.equal(submitPatternCharFromTile(tile, "qu"), "?");
});

test("slotPatternAlignsWithCandidate: ??are aligns with square (wildcard absorbs qu)", () => {
  assert.equal(
    slotPatternAlignsWithCandidate("??are", "square", [false, false, false, false, false], "?", "qu"),
    true,
  );
});

test("submitPartsAlignWithResolved: ??are aligns with square", () => {
  assert.equal(
    submitPartsAlignWithResolved(
      {
        word: "??are",
        vowelAltMask: [],
        quSlotMask: [false, false, false, false, false],
      },
      "square",
      [],
    ),
    true,
  );
});

test("submitPartsAlignWithResolved: holde? aligns with holden (wildcard-from-q)", () => {
  assert.equal(
    submitPartsAlignWithResolved(
      {
        word: "holde?",
        vowelAltMask: [],
        quSlotMask: [false, false, false, false, false, false],
      },
      "holden",
      [],
    ),
    true,
  );
});

test("resolveWordPatternWithVowelSubstitutions: slot pattern qroblem to problem", () => {
  const dict = new Set(["problem"]);
  const mask = [true, false, false, false, false, false, false];
  const resolveExact = (p) => (dict.has(p) ? p : null);
  const hit = resolveWordPatternWithVowelSubstitutions(
    "qroblem",
    mask,
    resolveExact,
    OWNED_MOUTH_TUBE,
  );
  assert.equal(hit, "problem");
});

console.log("quSlotSubmitPattern integration tests ok");
