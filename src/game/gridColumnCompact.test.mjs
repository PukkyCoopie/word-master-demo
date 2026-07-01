import test from "node:test";
import assert from "node:assert/strict";
import { compactGridColumnsToBottom } from "./gridColumnCompact.js";

test("compactGridColumnsToBottom：牌库不足时各列字母靠底", () => {
  const tile = (id) => ({ id, letter: "a" });
  const rows = [
    [tile(1), tile(2), tile(3), tile(4)],
    [tile(5), tile(6), tile(7), tile(8)],
    [tile(9), tile(10), tile(11), tile(12)],
    [null, null, null, null],
  ];
  compactGridColumnsToBottom(rows);
  for (let c = 0; c < 4; c++) {
    assert.equal(rows[0][c], null, `col ${c} top should be empty`);
    assert.ok(rows[3][c]?.letter, `col ${c} bottom should have a tile`);
  }
});

test("compactGridColumnsToBottom：镣铐 Boss 保留顶行封锁格", () => {
  const blocked = { id: "b", letter: "", bossGridBlocked: true };
  const tile = (id) => ({ id, letter: "x" });
  const rows = [
    [blocked, blocked, blocked, blocked],
    [null, tile(2), null, null],
    [null, null, tile(3), null],
    [tile(4), null, null, tile(5)],
  ];
  compactGridColumnsToBottom(rows, { manacle: true });
  for (let c = 0; c < 4; c++) {
    assert.equal(rows[0][c].bossGridBlocked, true);
  }
  assert.equal(rows[3][0]?.id, 4);
  assert.equal(rows[3][1]?.id, 2);
  assert.equal(rows[3][2]?.id, 3);
  assert.equal(rows[3][3]?.id, 5);
});
