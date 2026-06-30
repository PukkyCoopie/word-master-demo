import test from "node:test";
import assert from "node:assert/strict";
import {
  applyBossTileDebuffState,
  reconcileContinuousBossDebuffsAfterRestrictionLifted,
  resolvePresentationBossTileDebuffed,
} from "./bossTileDebuff.js";

const ctx = Object.freeze({ ownedSlotTreasureIds: [] });
const suppressedRun = Object.freeze({ levelBossRestrictionSuppressed: true });

test("钥匙抑制后：持续无效化（枯枝）清除，非持续标记保留", () => {
  const grid = [
    [
      { letter: "a", rarity: "rare", bossTileDebuffed: true },
      { letter: "b", rarity: "common", bossTileDebuffed: true },
    ],
  ];
  reconcileContinuousBossDebuffsAfterRestrictionLifted(grid, "the_plant", {
    ...ctx,
    treasureRun: suppressedRun,
  });
  assert.equal(grid[0][0].bossTileDebuffed, false);
  assert.equal(grid[0][1].bossTileDebuffed, true);
});

test("钥匙抑制后：倒钩无效化全盘清除", () => {
  const grid = [
    [
      { letter: "a", rarity: "rare", bossTileDebuffed: true },
      { letter: "b", rarity: "common", bossTileDebuffed: true },
    ],
  ];
  reconcileContinuousBossDebuffsAfterRestrictionLifted(grid, "the_hook", {
    ...ctx,
    treasureRun: suppressedRun,
  });
  assert.equal(grid[0][0].bossTileDebuffed, false);
  assert.equal(grid[0][1].bossTileDebuffed, false);
});

test("钥匙抑制后：展示层不再显示无效化", () => {
  const hookTile = { letter: "b", rarity: "common", bossTileDebuffed: true };
  assert.equal(
    resolvePresentationBossTileDebuffed(hookTile, "", {
      ...ctx,
      treasureRun: suppressedRun,
    }),
    false,
  );
});

test("抑制中按持续规则刷新格会清除无效化", () => {
  const tile = { letter: "a", rarity: "rare", bossTileDebuffed: true };
  applyBossTileDebuffState(tile, "the_plant", {
    ...ctx,
    treasureRun: suppressedRun,
  });
  assert.equal(tile.bossTileDebuffed, false);
});

test("抑制中倒钩 slug 清除已有无效化标记", () => {
  const tile = { letter: "b", rarity: "common", bossTileDebuffed: true };
  applyBossTileDebuffState(tile, "the_hook", {
    ...ctx,
    treasureRun: suppressedRun,
  });
  assert.equal(tile.bossTileDebuffed, false);
});
