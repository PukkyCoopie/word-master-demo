import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveVoucherShelfClearTarget,
  shouldClearVoucherShelfSlot,
} from "./shopVoucherShelfPurchase.js";

test("resolveVoucherShelfClearTarget routes spell-granted offers to bonus shelf", () => {
  assert.equal(
    resolveVoucherShelfClearTarget({ offerType: "voucher", spellGranted: true }),
    "bonus",
  );
  assert.equal(resolveVoucherShelfClearTarget({ offerType: "voucher" }), "main");
  assert.equal(resolveVoucherShelfClearTarget({ offerType: "spell" }), null);
});

test("shouldClearVoucherShelfSlot matches offerInstanceId only on offer rows", () => {
  const shelf = { kind: "offer", offerInstanceId: 1 };
  assert.equal(shouldClearVoucherShelfSlot(shelf, 1), true);
  assert.equal(shouldClearVoucherShelfSlot(shelf, 2), false);
  assert.equal(shouldClearVoucherShelfSlot({ kind: "empty" }, 1), false);
});
