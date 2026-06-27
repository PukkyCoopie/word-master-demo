import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveBombAdjacentVictimSlotIndices,
  resolveBombBlastDestroySlotIndices,
} from "./treasureBombBlast.js";

test("炸弹爆炸：左右紧邻非空宝藏纳入摧毁，空格跳过", () => {
  const adjacent = [{ treasureId: "1" }, { treasureId: "29" }, { treasureId: "2" }];
  assert.deepEqual(resolveBombAdjacentVictimSlotIndices(adjacent, 1), [0, 2]);
  assert.deepEqual(resolveBombBlastDestroySlotIndices(adjacent, 1), [0, 2, 1]);

  const withGap = [{ treasureId: "1" }, null, { treasureId: "29" }, { treasureId: "2" }];
  assert.deepEqual(resolveBombAdjacentVictimSlotIndices(withGap, 2), [3]);
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

test("炸弹爆炸：禁售配饰保护邻槽", () => {
  const slots = [{ treasureId: "1" }, { treasureId: "29" }, { treasureId: "2" }];
  const noSell = (ix) => ix === 0 || ix === 2;
  assert.deepEqual(resolveBombAdjacentVictimSlotIndices(slots, 1, noSell), []);
  assert.deepEqual(resolveBombBlastDestroySlotIndices(slots, 1, noSell), [1]);
});
