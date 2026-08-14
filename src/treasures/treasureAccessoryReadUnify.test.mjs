import assert from "node:assert/strict";
import test from "node:test";
import { ACCESSORY_FIRE, ACCESSORY_NO_SELL } from "../accessories/accessoryCatalog.js";
import { ownedTreasureHasNoSellAccessory } from "../game/runDifficultyRuntime.js";
import {
  checkAllOwnedTreasuresHaveAccessory,
  countOwnedTreasuresWithAccessory,
} from "./treasureRunTracking.js";

test("countOwnedTreasuresWithAccessory uses treasureAccessoryIds", () => {
  assert.equal(
    countOwnedTreasuresWithAccessory([
      { treasureId: "1", treasureAccessoryIds: [ACCESSORY_FIRE] },
      { treasureId: "2" },
      null,
    ]),
    1,
  );
});

test("checkAllOwnedTreasuresHaveAccessory ignores empty singular when ids present", () => {
  assert.equal(
    checkAllOwnedTreasuresHaveAccessory([
      { treasureId: "1", treasureAccessoryIds: [ACCESSORY_FIRE], treasureAccessoryId: null },
      { treasureId: "2", treasureAccessoryIds: [ACCESSORY_NO_SELL] },
    ]),
    true,
  );
  assert.equal(
    checkAllOwnedTreasuresHaveAccessory([{ treasureId: "1", treasureAccessoryIds: [] }]),
    false,
  );
});

test("ownedTreasureHasNoSellAccessory reads ids array", () => {
  assert.equal(
    ownedTreasureHasNoSellAccessory({
      treasureAccessoryIds: [ACCESSORY_FIRE, ACCESSORY_NO_SELL],
      treasureAccessoryId: null,
    }),
    true,
  );
  assert.equal(ownedTreasureHasNoSellAccessory({ treasureAccessoryIds: [ACCESSORY_FIRE] }), false);
});
