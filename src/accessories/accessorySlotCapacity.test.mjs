import assert from "node:assert/strict";
import test from "node:test";
import { ACCESSORY_CROP, ACCESSORY_NO_SELL } from "./accessoryCatalog.js";
import {
  canAcquireTreasureOffer,
  nextUniqueOwnedTreasureSlotKey,
  reconcileOwnedTreasureSlotsAfterDestruction,
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

test("nextUniqueOwnedTreasureSlotKey skips occupied ids", () => {
  assert.equal(nextUniqueOwnedTreasureSlotKey(["g-slot-0", "g-slot-4"]), "g-slot-2");
});

test("reconcileOwnedTreasureSlotsAfterDestruction keeps gaps when capacity allows", () => {
  const slots = [{ treasureId: "1" }, null, null, null, { treasureId: "5" }];
  const keys = ["g-slot-0", "g-slot-1", "g-slot-2", "g-slot-3", "g-slot-4"];
  assert.equal(reconcileOwnedTreasureSlotsAfterDestruction(slots, keys, 0), false);
  assert.deepEqual(
    slots.map((s) => s?.treasureId ?? null),
    ["1", null, null, null, "5"],
  );
  assert.deepEqual(keys, ["g-slot-0", "g-slot-1", "g-slot-2", "g-slot-3", "g-slot-4"]);
});

test("reconcileOwnedTreasureSlotsAfterDestruction moves overflow when crop capacity shrinks", () => {
  const slots = [
    { treasureId: "1" },
    null,
    null,
    null,
    null,
    null,
    { treasureId: "7" },
  ];
  const keys = [
    "g-slot-0",
    "g-slot-1",
    "g-slot-2",
    "g-slot-3",
    "g-slot-4",
    "g-slot-5",
    "g-slot-6",
  ];
  assert.equal(reconcileOwnedTreasureSlotsAfterDestruction(slots, keys, 0), true);
  assert.equal(slots.length, 6);
  assert.equal(slots[0]?.treasureId, "1");
  assert.equal(slots[5]?.treasureId, "7");
});

test("reconcileOwnedTreasureSlotsAfterDestruction：火山喷发后幸存裁剪宝藏前移", () => {
  const slots = [
    { treasureId: "1" },
    null,
    null,
    null,
    { treasureId: "54" },
    null,
    null,
    null,
    { treasureId: "129", treasureAccessoryIds: [ACCESSORY_CROP] },
  ];
  const keys = Array.from({ length: 9 }, (_, i) => `g-slot-${i}`);
  assert.equal(reconcileOwnedTreasureSlotsAfterDestruction(slots, keys, 0), true);
  assert.equal(slots.length, 7);
  assert.equal(slots[0]?.treasureId, "1");
  assert.equal(slots[4]?.treasureId, "54");
  assert.equal(slots[6]?.treasureId, "129");
});

test("reconcileOwnedTreasureSlotsAfterDestruction：空位不足时按原顺序从右裁空槽顶位", () => {
  const slots = [
    { treasureId: "1" },
    null,
    null,
    { treasureId: "54" },
    null,
    null,
    { treasureId: "2" },
    { treasureId: "3" },
    { treasureId: "4" },
  ];
  const keys = Array.from({ length: 9 }, (_, i) => `g-slot-${i}`);
  assert.equal(reconcileOwnedTreasureSlotsAfterDestruction(slots, keys, 0), true);
  assert.equal(slots.length, 6);
  assert.deepEqual(
    slots.map((s) => s?.treasureId ?? null),
    ["1", null, "54", "2", "3", "4"],
  );
});
