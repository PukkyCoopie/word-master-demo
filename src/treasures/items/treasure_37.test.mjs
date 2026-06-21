import test from "node:test";
import assert from "node:assert/strict";
import { treasureHooks } from "./treasure_37.js";

test("摇杆 getPerLetterMoneyCue：非元音不触发", () => {
  const ctx = { ownedSlotTreasureIds: ["37"], rng: () => 0 };
  assert.equal(treasureHooks.getPerLetterMoneyCue?.(ctx, { letter: "b" }, 0), null);
});

test("摇杆 getPerLetterMoneyCue：元音按 1/2 掷金币", () => {
  const hit = treasureHooks.getPerLetterMoneyCue?.(
    { ownedSlotTreasureIds: ["37"], rng: () => 0 },
    { letter: "a" },
    0,
  );
  assert.deepEqual(hit, { money: 1 });

  const miss = treasureHooks.getPerLetterMoneyCue?.(
    { ownedSlotTreasureIds: ["37"], rng: () => 0.99 },
    { letter: "e" },
    0,
  );
  assert.equal(miss, null);
});
