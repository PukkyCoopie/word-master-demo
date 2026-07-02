import test from "node:test";
import assert from "node:assert/strict";
import {
  candidateMatchesMouthSlotPattern,
  slotPatternAlignsWithCandidate,
  buildMouthTriosForSlotPattern,
  submitPartsAlignWithResolved,
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
