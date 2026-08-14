import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeOwnedTreasureSlot,
  readTreasureAccessoryIds,
  writeTreasureAccessoryIds,
} from "./accessoryState.js";
import { ACCESSORY_CROP, ACCESSORY_FIRE } from "./accessoryCatalog.js";

test("writeTreasureAccessoryIds is authoritative over lone treasureAccessoryId", () => {
  const slot = {
    treasureId: "1",
    treasureAccessoryIds: [ACCESSORY_CROP],
    treasureAccessoryId: ACCESSORY_CROP,
  };
  writeTreasureAccessoryIds(slot, [ACCESSORY_FIRE]);
  assert.deepEqual(readTreasureAccessoryIds(slot), [ACCESSORY_FIRE]);
  assert.equal(slot.treasureAccessoryId, ACCESSORY_FIRE);
});

test("star-style replace on slot with existing treasureAccessoryIds is visible to read", () => {
  const cur = {
    treasureId: "141",
    treasureAccessoryIds: [ACCESSORY_CROP],
    treasureAccessoryId: ACCESSORY_CROP,
  };
  // 旧星星只写 singular 时读路径仍见 crop；统一后应替换为 fire
  const broken = { ...cur, treasureAccessoryId: ACCESSORY_FIRE };
  assert.deepEqual(readTreasureAccessoryIds(broken), [ACCESSORY_CROP]);

  const next = { ...cur };
  writeTreasureAccessoryIds(next, [ACCESSORY_FIRE]);
  normalizeOwnedTreasureSlot(next);
  assert.deepEqual(readTreasureAccessoryIds(next), [ACCESSORY_FIRE]);
});

test("normalizeOwnedTreasureSlot lifts legacy singular into array", () => {
  const slot = { treasureId: "2", treasureAccessoryId: ACCESSORY_FIRE };
  normalizeOwnedTreasureSlot(slot);
  assert.deepEqual(slot.treasureAccessoryIds, [ACCESSORY_FIRE]);
  assert.equal(slot.treasureAccessoryId, ACCESSORY_FIRE);
});
