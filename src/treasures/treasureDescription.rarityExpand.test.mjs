import assert from "node:assert/strict";
import { describe, expandRarityLabelsInDescription } from "./treasureDescription.js";

function rarityValues(segments) {
  return segments.filter((s) => s.type === "rarity").map((s) => s.v);
}

assert.deepEqual(
  rarityValues(expandRarityLabelsInDescription(describe("传说字母在计分时会提供", { type: "money", v: "10" }))),
  ["传说"],
);

assert.deepEqual(
  rarityValues(expandRarityLabelsInDescription(describe("普通和稀有视为同一种稀有度；史诗和传说视为同一种稀有度；"))),
  ["普通", "稀有", "史诗", "传说"],
);

assert.deepEqual(
  rarityValues(
    expandRarityLabelsInDescription(describe("（稀有度和倍率在每关结束时都会变化）")),
  ),
  [],
);

assert.deepEqual(
  rarityValues(expandRarityLabelsInDescription(describe("如果单词中所有字母的稀有度相同"))),
  [],
);

assert.deepEqual(
  rarityValues(expandRarityLabelsInDescription(describe("传说宝藏有概率出现在商店中"))),
  ["传说"],
);

console.log("treasureDescription.rarityExpand.test.mjs ok");
