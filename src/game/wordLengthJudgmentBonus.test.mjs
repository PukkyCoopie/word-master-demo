import test from "node:test";
import assert from "node:assert/strict";
import { getLengthTableLenFromTileCountAndBonus } from "../vouchers/voucherRuntime.js";
import {
  BOW_ARROW_LENGTH_BONUS_PER_LETTER,
  countBowArrowXyzLetters,
} from "../treasures/items/treasure_145.js";

test("预览词长：弓箭 bay = 3 + 3 = 6 字母", () => {
  const tiles = [{ letter: "b" }, { letter: "a" }, { letter: "y" }];
  const contentBonus =
    countBowArrowXyzLetters({ tiles, resolvedWord: "bay" }) * BOW_ARROW_LENGTH_BONUS_PER_LETTER;
  assert.equal(getLengthTableLenFromTileCountAndBonus(3 + contentBonus, 0), 6);
});

test("预览词长：无 XYZ 时不加长", () => {
  const contentBonus =
    countBowArrowXyzLetters({ resolvedWord: "cat" }) * BOW_ARROW_LENGTH_BONUS_PER_LETTER;
  assert.equal(contentBonus, 0);
  assert.equal(getLengthTableLenFromTileCountAndBonus(3, 0), 3);
});

test("预览词长：万能块 ? 按 resolvedWord 计 XYZ", () => {
  const contentBonus =
    countBowArrowXyzLetters({
      tiles: [{ letter: "?" }, { letter: "?" }, { letter: "?" }],
      resolvedWord: "zoo",
    }) * BOW_ARROW_LENGTH_BONUS_PER_LETTER;
  assert.equal(contentBonus, 3);
  assert.equal(getLengthTableLenFromTileCountAndBonus(3 + contentBonus, 0), 6);
});
