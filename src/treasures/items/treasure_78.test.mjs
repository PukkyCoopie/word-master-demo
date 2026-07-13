import test from "node:test";
import assert from "node:assert/strict";
import { addMultMulBank, getMultMulBank } from "../treasureBankHelpers.js";
import { createTreasureRunState } from "../treasureRunState.js";
import { initTreasureBankOnAcquire } from "../treasureAcquireInit.js";
import { TREASURE_78_ICE_SHATTER_MULT_INCREMENT } from "./treasure_78.js";

test("雪人 78：双持时碎冰入账应写入各自槽位 bank", () => {
  const rs = createTreasureRunState();
  const slot0 = { treasureId: "78" };
  const slot1 = { treasureId: "78" };
  initTreasureBankOnAcquire("78", rs, slot0);
  initTreasureBankOnAcquire("78", rs, slot1);
  const instances = [slot0, slot1];
  const owned = ["78", "78"];

  addMultMulBank(rs, "78", TREASURE_78_ICE_SHATTER_MULT_INCREMENT, {
    ownedSlotTreasureIds: owned,
    hookSlotIndex: 0,
    ownedTreasureInstances: instances,
  });
  addMultMulBank(rs, "78", TREASURE_78_ICE_SHATTER_MULT_INCREMENT, {
    ownedSlotTreasureIds: owned,
    hookSlotIndex: 1,
    ownedTreasureInstances: instances,
  });

  assert.equal(
    getMultMulBank(rs, "78", { slotIndex: 0, ownedTreasureInstances: instances }),
    2,
  );
  assert.equal(
    getMultMulBank(rs, "78", { slotIndex: 1, ownedTreasureInstances: instances }),
    2,
  );
});
