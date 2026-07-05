import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveBombAdjacentSlotIndices,
  resolveBombAdjacentVictimSlotIndices,
  resolveBombBlastAnimationSlotIndices,
  resolveBombBlastDestroySlotIndices,
  resolveBombBlastFeintSlotIndices,
} from "./treasureBombBlast.js";

test("炸弹爆炸：左右紧邻非空宝藏纳入摧毁，空格跳过", () => {
  const adjacent = [{ treasureId: "1" }, { treasureId: "29" }, { treasureId: "2" }];
  assert.deepEqual(resolveBombAdjacentSlotIndices(adjacent, 1), [0, 2]);
  assert.deepEqual(resolveBombAdjacentVictimSlotIndices(adjacent, 1), [0, 2]);
  assert.deepEqual(resolveBombBlastAnimationSlotIndices(adjacent, 1), [0, 2, 1]);
  assert.deepEqual(resolveBombBlastDestroySlotIndices(adjacent, 1), [0, 2, 1]);

  const withGap = [{ treasureId: "1" }, null, { treasureId: "29" }, { treasureId: "2" }];
  assert.deepEqual(resolveBombAdjacentSlotIndices(withGap, 2), [3]);
  assert.deepEqual(resolveBombBlastDestroySlotIndices(withGap, 2), [3, 2]);
});

test("炸弹爆炸：一侧为空时不影响该侧", () => {
  const slots = [null, { treasureId: "29" }, { treasureId: "2" }];
  assert.deepEqual(resolveBombAdjacentVictimSlotIndices(slots, 1), [2]);
  assert.deepEqual(resolveBombBlastDestroySlotIndices(slots, 1), [2, 1]);
});

test("炸弹爆炸：两侧皆空时仅摧毁炸弹", () => {
  const slots = [null, { treasureId: "29" }, null];
  assert.deepEqual(resolveBombAdjacentVictimSlotIndices(slots, 1), []);
  assert.deepEqual(resolveBombBlastDestroySlotIndices(slots, 1), [1]);
});

test("炸弹爆炸：禁售邻槽假摧毁动画、炸弹真爆炸", () => {
  const slots = [{ treasureId: "1" }, { treasureId: "29" }, { treasureId: "2" }];
  const noSell = (ix) => ix === 0 || ix === 2;
  assert.deepEqual(resolveBombAdjacentVictimSlotIndices(slots, 1, noSell), []);
  assert.deepEqual(resolveBombBlastDestroySlotIndices(slots, 1, noSell), [1]);
  assert.deepEqual(resolveBombBlastAnimationSlotIndices(slots, 1), [0, 2, 1]);
  assert.deepEqual(resolveBombBlastFeintSlotIndices(slots, 1, noSell), [0, 2]);
});

test("炸弹爆炸：禁售炸弹假爆炸、邻槽真摧毁", () => {
  const slots = [{ treasureId: "1" }, { treasureId: "29" }, { treasureId: "2" }];
  const bombNoSell = (ix) => ix === 1;
  assert.deepEqual(resolveBombBlastDestroySlotIndices(slots, 1, bombNoSell), [0, 2]);
  assert.deepEqual(resolveBombBlastFeintSlotIndices(slots, 1, bombNoSell), [1]);
  assert.deepEqual(resolveBombBlastAnimationSlotIndices(slots, 1), [0, 2, 1]);
});

test("炸弹爆炸：禁售炸弹与禁售邻槽均假动画、无真移除", () => {
  const slots = [{ treasureId: "1" }, { treasureId: "29" }, { treasureId: "2" }];
  const allNoSell = () => true;
  assert.deepEqual(resolveBombBlastDestroySlotIndices(slots, 1, allNoSell), []);
  assert.deepEqual(resolveBombBlastFeintSlotIndices(slots, 1, allNoSell), [0, 2, 1]);
});

test("炸弹爆炸：禁售炸弹+禁售左邻+非禁售右邻，仅右邻真摧毁", () => {
  const slots = [
    { treasureId: "67", treasureAccessoryIds: ["treasure_acc_no_sell"] },
    { treasureId: "29", treasureAccessoryIds: ["treasure_acc_no_sell"] },
    { treasureId: "45" },
  ];
  const noSell = (ix) => ix === 0 || ix === 1;
  assert.deepEqual(resolveBombBlastDestroySlotIndices(slots, 1, noSell), [2]);
  assert.deepEqual(resolveBombBlastFeintSlotIndices(slots, 1, noSell), [0, 1]);
});
