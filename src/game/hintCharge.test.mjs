import test from "node:test";
import assert from "node:assert/strict";
import { shouldChargeHintOnSuccessfulSubmit } from "./hintCharge.js";

test("shouldChargeHintOnSuccessfulSubmit: same session word after hint button", () => {
  assert.equal(
    shouldChargeHintOnSuccessfulSubmit(
      "apple",
      { viaButton: true, appliedWord: "apple" },
      null,
    ),
    true,
  );
});

test("shouldChargeHintOnSuccessfulSubmit: pending word after reload without session flags", () => {
  assert.equal(
    shouldChargeHintOnSuccessfulSubmit(
      "apple",
      { viaButton: false, appliedWord: null },
      "apple",
    ),
    true,
  );
});

test("shouldChargeHintOnSuccessfulSubmit: different word does not charge", () => {
  assert.equal(
    shouldChargeHintOnSuccessfulSubmit(
      "apply",
      { viaButton: true, appliedWord: "apple" },
      "apple",
    ),
    false,
  );
});

test("shouldChargeHintOnSuccessfulSubmit: no hint state", () => {
  assert.equal(
    shouldChargeHintOnSuccessfulSubmit("apple", { viaButton: false, appliedWord: null }, null),
    false,
  );
});
