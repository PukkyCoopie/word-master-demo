import test from "node:test";
import assert from "node:assert/strict";
import { collectFireworkIgniteTargets, findWordSlotIndexForGridCell } from "../../game/fireworkIgniteTargets.js";

test("collectFireworkIgniteTargets：全盘火焰格引燃正上方无材质块（含已选 placeholder）", () => {
  const grid = [
    [{ letter: "A" }, { letter: "B" }],
    [{ letter: "C", materialId: "fire" }, { letter: "D", materialId: "fire", selected: true }],
    [{ letter: "E", materialId: "fire" }, null],
  ];
  assert.deepEqual(collectFireworkIgniteTargets(grid), [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
  ]);
});

test("collectFireworkIgniteTargets：顶行火焰、上方无格或无字母时不引燃", () => {
  const grid = [[{ letter: "A", materialId: "fire" }], [{ letter: "B" }]];
  assert.deepEqual(collectFireworkIgniteTargets(grid), []);
});

test("findWordSlotIndexForGridCell：按 selectedOrder 对齐棋盘格与词槽索引", () => {
  const order = [
    { row: 1, col: 0 },
    { row: 0, col: 2 },
    { row: 2, col: 1 },
  ];
  assert.equal(findWordSlotIndexForGridCell(order, 0, 2), 1);
  assert.equal(findWordSlotIndexForGridCell(order, 2, 1), 2);
  assert.equal(findWordSlotIndexForGridCell(order, 0, 0), -1);
});
