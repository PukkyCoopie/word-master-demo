import assert from "node:assert/strict";
import {
  normalizeSkipSettlementAnimMode,
  shouldSkipSettlementAnim,
  setSubmitScoringMidPhaseSkipActive,
  isSubmitScoringMidPhaseSkipActive,
  shouldSkipSettlementTreasureFx,
  shouldSkipSubmitTailTreasureFx,
  setTestSkipSettlementAnimModeOverride,
} from "./settlementAnimSkip.js";

assert.equal(normalizeSkipSettlementAnimMode("off"), "off");
assert.equal(normalizeSkipSettlementAnimMode("endless"), "endless");
assert.equal(normalizeSkipSettlementAnimMode("always"), "always");
assert.equal(normalizeSkipSettlementAnimMode("invalid"), "endless");
assert.equal(normalizeSkipSettlementAnimMode(null), "endless");

setTestSkipSettlementAnimModeOverride("off");
assert.equal(shouldSkipSettlementAnim(false), false);
assert.equal(shouldSkipSettlementAnim(true), false);

setTestSkipSettlementAnimModeOverride("endless");
assert.equal(shouldSkipSettlementAnim(false), false);
assert.equal(shouldSkipSettlementAnim(true), true);

setTestSkipSettlementAnimModeOverride("always");
assert.equal(shouldSkipSettlementAnim(false), true);
assert.equal(shouldSkipSettlementAnim(true), true);

setTestSkipSettlementAnimModeOverride(null);

setSubmitScoringMidPhaseSkipActive(true);
assert.equal(isSubmitScoringMidPhaseSkipActive(), true);
setSubmitScoringMidPhaseSkipActive(false);
assert.equal(isSubmitScoringMidPhaseSkipActive(), false);

setTestSkipSettlementAnimModeOverride("always");
assert.equal(shouldSkipSettlementTreasureFx(), true);
assert.equal(shouldSkipSubmitTailTreasureFx(), true);
setTestSkipSettlementAnimModeOverride(null);

console.log("settlementAnimSkip.test.mjs ok");
