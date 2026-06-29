import test from "node:test";
import assert from "node:assert/strict";
import {
  isEndlessMilestoneBossShopLevel,
  shouldGuaranteeEndlessMilestoneLegendaryShop,
} from "./endlessMilestoneShop.js";

test("无尽里程碑 Boss 关：8-3、16-3、24-3", () => {
  assert.equal(isEndlessMilestoneBossShopLevel("8-3"), true);
  assert.equal(isEndlessMilestoneBossShopLevel("16-3"), true);
  assert.equal(isEndlessMilestoneBossShopLevel("24-3"), true);
  assert.equal(isEndlessMilestoneBossShopLevel("32-3"), true);
  assert.equal(isEndlessMilestoneBossShopLevel("7-3"), false);
  assert.equal(isEndlessMilestoneBossShopLevel("8-2"), false);
  assert.equal(isEndlessMilestoneBossShopLevel("9-3"), false);
});

test("仅无尽模式下里程碑进店保底传说", () => {
  assert.equal(
    shouldGuaranteeEndlessMilestoneLegendaryShop({
      isEndlessRun: true,
      completedLevelId: "16-3",
    }),
    true,
  );
  assert.equal(
    shouldGuaranteeEndlessMilestoneLegendaryShop({
      isEndlessRun: false,
      completedLevelId: "8-3",
    }),
    false,
  );
});
