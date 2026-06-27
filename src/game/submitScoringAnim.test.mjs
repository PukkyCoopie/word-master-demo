import test from "node:test";
import assert from "node:assert/strict";
import { submitWordLeaveStagger } from "./submitWordLeaveStagger.js";

test("submitWordLeaveStagger: shorter stagger for longer words", () => {
  const s3 = submitWordLeaveStagger(3);
  const s8 = submitWordLeaveStagger(8);
  const s12 = submitWordLeaveStagger(12);
  assert.ok(s3 > s8);
  assert.ok(s8 > s12);
  assert.ok(s12 >= 0.03);
});

test("submitWordLeaveStagger: clamps letter count", () => {
  assert.equal(submitWordLeaveStagger(0), submitWordLeaveStagger(1));
  assert.equal(submitWordLeaveStagger(99), submitWordLeaveStagger(24));
});

test("submitWordLeaveStagger: known 3-letter baseline", () => {
  assert.equal(submitWordLeaveStagger(3), 0.082);
});
