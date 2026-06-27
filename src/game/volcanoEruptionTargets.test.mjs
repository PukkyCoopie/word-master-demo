import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVolcanoEruptionRippleTargets,
  collectVolcanoIgniteGridCells,
  gridTileHasMaterial,
  rectCenterDistanceSq,
  resolveVolcanoTreasureVictimIndices,
} from "./volcanoEruptionTargets.js";

test("火山喷发：除火山槽外非空宝藏纳入受害者，禁售跳过", () => {
  const slots = [{ treasureId: "1" }, { treasureId: "54" }, { treasureId: "2" }, { treasureId: "3" }];
  assert.deepEqual(resolveVolcanoTreasureVictimIndices(slots, 1), [0, 2, 3]);
  assert.deepEqual(resolveVolcanoTreasureVictimIndices(slots, 1, (ix) => ix === 0), [2, 3]);
});

test("gridTileHasMaterial：无材质 / wildcard / 有材质", () => {
  assert.equal(gridTileHasMaterial({ letter: "A" }), false);
  assert.equal(gridTileHasMaterial({ letter: "A", materialId: "fire" }), true);
  assert.equal(gridTileHasMaterial({ letter: "?", isWildcard: true }), true);
});

test("collectVolcanoIgniteGridCells：有字母且未封锁格（含任意材质与万能块）", () => {
  const grid = [
    [{ letter: "A" }, { letter: "B", materialId: "water" }],
    [{ letter: "", materialId: "" }, { letter: "C", isWildcard: true }],
    [null, { letter: "D", bossGridBlocked: true }],
  ];
  assert.deepEqual(collectVolcanoIgniteGridCells(grid, 3, 2), [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
  ]);
});

test("buildVolcanoEruptionRippleTargets：按 DOM 距离升序混排宝藏与棋盘", () => {
  const anchor = { left: 50, top: 50, width: 10, height: 10 };
  const targets = buildVolcanoEruptionRippleTargets({
    victimSlotIndices: [0, 2],
    igniteGridCells: [{ row: 0, col: 0 }],
    anchorRect: anchor,
    getTreasureSlotRect: (ix) => ({
      left: ix === 0 ? 40 : 200,
      top: 50,
      width: 20,
      height: 20,
    }),
    getGridCellRect: () => ({ left: 55, top: 55, width: 20, height: 20 }),
  });
  assert.equal(targets.length, 3);
  assert.equal(targets[0].kind, "treasure");
  assert.equal(/** @type {{ slotIndex: number }} */ (targets[0]).slotIndex, 0);
  assert.equal(targets[1].kind, "grid");
  assert.equal(targets[2].kind, "treasure");
  assert.equal(/** @type {{ slotIndex: number }} */ (targets[2]).slotIndex, 2);
  assert.ok(targets[0].distance <= targets[1].distance);
  assert.ok(targets[1].distance <= targets[2].distance);
});

test("rectCenterDistanceSq", () => {
  const anchor = { left: 0, top: 0, width: 10, height: 10 };
  const near = { left: 10, top: 10, width: 10, height: 10 };
  const far = { left: 100, top: 100, width: 10, height: 10 };
  assert.ok(rectCenterDistanceSq(near, anchor) < rectCenterDistanceSq(far, anchor));
});
