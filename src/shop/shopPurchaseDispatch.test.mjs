import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveShopOfferHandler,
  resolveShopPurchaseRoute,
} from "./shopPurchaseDispatch.js";

test("resolveShopOfferHandler maps deckLetter to deckTile and defaults empty to treasure", () => {
  assert.equal(resolveShopOfferHandler("deckLetter"), "deckTile");
  assert.equal(resolveShopOfferHandler("deckTile"), "deckTile");
  assert.equal(resolveShopOfferHandler("treasure"), "treasure");
  assert.equal(resolveShopOfferHandler(null), "treasure");
  assert.equal(resolveShopOfferHandler("unknown"), null);
});

test("resolveShopPurchaseRoute prioritizes spell grant and pack-inner before offer", () => {
  assert.deepEqual(resolveShopPurchaseRoute(null), { route: "none" });
  assert.deepEqual(resolveShopPurchaseRoute({ spellGrantFlow: true }), {
    route: "spellGrantFlow",
  });
  assert.deepEqual(resolveShopPurchaseRoute({ kind: "pack-inner" }), {
    route: "packInner",
  });
  assert.deepEqual(resolveShopPurchaseRoute({ kind: "owned" }), { route: "none" });
  assert.deepEqual(
    resolveShopPurchaseRoute({ kind: "offer", treasure: { offerType: "spell" } }),
    { route: "offer", offerType: "spell", handler: "spell" },
  );
});
