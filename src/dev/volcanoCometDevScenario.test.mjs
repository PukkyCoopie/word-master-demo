import test from "node:test";
import assert from "node:assert/strict";
import { ACCESSORY_CROP } from "../accessories/accessoryCatalog.js";
import { computeOwnedTreasureSlotTargetLength } from "../accessories/accessorySlotCapacity.js";
import {
  buildVolcanoCometOwnedTreasureSlots,
  VOLCANO_COMET_DEV_COMET_COUNT,
} from "./volcanoCometDevSlots.js";

test("火山彗星测试局：超出默认 6 栏的宝藏带裁剪配饰", () => {
  const slots = buildVolcanoCometOwnedTreasureSlots((input) => ({
    treasureId: String(input.treasureId),
    treasureAccessoryIds: input.treasureAccessoryIds ?? [],
  }));
  assert.equal(slots.length, 9);
  assert.equal(
    slots.filter((s) => s.treasureAccessoryIds?.includes(ACCESSORY_CROP)).length,
    3,
  );
  for (let i = 0; i < 6; i += 1) {
    assert.equal(slots[i].treasureAccessoryIds?.includes(ACCESSORY_CROP), false);
  }
  for (let i = 6; i < 9; i += 1) {
    assert.equal(slots[i].treasureAccessoryIds?.includes(ACCESSORY_CROP), true);
  }
  assert.equal(computeOwnedTreasureSlotTargetLength(slots), 9);
  assert.equal(
    slots.filter((s) => s.treasureId === "45").length,
    VOLCANO_COMET_DEV_COMET_COUNT,
  );
});
