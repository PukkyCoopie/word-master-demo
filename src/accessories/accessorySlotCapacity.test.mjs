import assert from "node:assert/strict";
import test from "node:test";
import { ACCESSORY_CROP, ACCESSORY_NO_SELL } from "./accessoryCatalog.js";
import {
  canAcquireTreasureOffer,
  willCropAccessoryExpandSlots,
  willIncomingTreasureAccessoriesExpandSlots,
} from "./accessorySlotCapacity.js";

const filledFiveSlots = Array.from({ length: 5 }, (_, i) => ({
  treasureId: String(i + 1),
}));

test("willCropAccessoryExpandSlots rejects accessory id arrays", () => {
  assert.equal(
    willCropAccessoryExpandSlots(filledFiveSlots, 0, [ACCESSORY_NO_SELL, ACCESSORY_CROP]),
    false,
  );
  assert.equal(willCropAccessoryExpandSlots(filledFiveSlots, 0, ACCESSORY_CROP), true);
});

test("willIncomingTreasureAccessoriesExpandSlots handles multi-accessory offers", () => {
  assert.equal(
    willIncomingTreasureAccessoriesExpandSlots(filledFiveSlots, 0, [
      ACCESSORY_NO_SELL,
      ACCESSORY_CROP,
    ]),
    true,
  );
});

test("canAcquireTreasureOffer accepts crop when slots are full", () => {
  assert.equal(
    canAcquireTreasureOffer(filledFiveSlots, 0, [ACCESSORY_NO_SELL, ACCESSORY_CROP]),
    true,
  );
  assert.equal(canAcquireTreasureOffer(filledFiveSlots, 0, [ACCESSORY_NO_SELL]), false);
});
