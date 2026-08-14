import assert from "node:assert/strict";
import test from "node:test";
import {
  ACCESSORY_CROP,
  ACCESSORY_DROP,
  ACCESSORY_FIRE,
  ACCESSORY_WRENCH,
  ACCESSORY_NO_SELL,
} from "./accessoryCatalog.js";
import {
  TREASURE_ACCESSORY_SLOT_CAP,
  addTreasureAccessory,
  readTreasureAccessoryIds,
  writeTreasureAccessoryIds,
} from "./accessoryState.js";

test("TREASURE_ACCESSORY_SLOT_CAP is 4", () => {
  assert.equal(TREASURE_ACCESSORY_SLOT_CAP, 4);
});

test("writeTreasureAccessoryIds truncates past cap", () => {
  const entity = {};
  writeTreasureAccessoryIds(entity, [
    ACCESSORY_FIRE,
    ACCESSORY_DROP,
    ACCESSORY_WRENCH,
    ACCESSORY_CROP,
    ACCESSORY_NO_SELL,
  ]);
  assert.deepEqual(readTreasureAccessoryIds(entity), [
    ACCESSORY_FIRE,
    ACCESSORY_DROP,
    ACCESSORY_WRENCH,
    ACCESSORY_CROP,
  ]);
});

test("addTreasureAccessory refuses duplicate and past cap", () => {
  const entity = {};
  assert.equal(addTreasureAccessory(entity, ACCESSORY_FIRE), true);
  assert.equal(addTreasureAccessory(entity, ACCESSORY_FIRE), false);
  assert.equal(addTreasureAccessory(entity, ACCESSORY_DROP), true);
  assert.equal(addTreasureAccessory(entity, ACCESSORY_WRENCH), true);
  assert.equal(addTreasureAccessory(entity, ACCESSORY_CROP), true);
  assert.equal(addTreasureAccessory(entity, ACCESSORY_NO_SELL), false);
  assert.equal(readTreasureAccessoryIds(entity).length, 4);
});
