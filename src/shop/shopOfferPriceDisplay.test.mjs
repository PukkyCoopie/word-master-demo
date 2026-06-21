import assert from "node:assert/strict";
import test from "node:test";
import {
  isShopTicketUpgradeOfferFree,
  resolveShopOfferEffectivePrice,
} from "./shopOfferPriceDisplay.js";

test("isShopTicketUpgradeOfferFree covers upgrade cards and upgrade packs only", () => {
  assert.equal(isShopTicketUpgradeOfferFree({ offerType: "upgrade" }, true), true);
  assert.equal(
    isShopTicketUpgradeOfferFree({ offerType: "bundlePack", bundleKind: "upgrade" }, true),
    true,
  );
  assert.equal(
    isShopTicketUpgradeOfferFree({ offerType: "bundlePack", bundleKind: "spell" }, true),
    false,
  );
  assert.equal(isShopTicketUpgradeOfferFree({ offerType: "treasure" }, true), false);
  assert.equal(isShopTicketUpgradeOfferFree({ offerType: "upgrade" }, false), false);
});

test("resolveShopOfferEffectivePrice zeroes ticket-eligible offers when shopUpgradesFree", () => {
  const upgrade = { offerType: "upgrade" };
  assert.equal(resolveShopOfferEffectivePrice(4, upgrade, [], "preset_01", true), 0);
  assert.equal(resolveShopOfferEffectivePrice(4, upgrade, [], "preset_01", false), 4);
  assert.equal(
    resolveShopOfferEffectivePrice(
      5,
      { offerType: "bundlePack", bundleKind: "upgrade" },
      [],
      "preset_01",
      true,
    ),
    0,
  );
});
