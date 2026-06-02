/** @type {readonly string[]} */
export const COLLECTION_MATERIAL_DISPLAY_ORDER = Object.freeze([
  "water",
  "fire",
  "ice",
  "gold",
  "steel",
  "lucky",
  "wildcard",
]);

/** @type {Readonly<Record<string, import('../treasures/treasureDescription.js').TreasureDescSegment[]>>} */
export const COLLECTION_MATERIAL_RICH_SEGMENTS = Object.freeze({
  water: Object.freeze([
    { type: "score", v: "+30" },
    { type: "text", v: " 分数" },
  ]),
  fire: Object.freeze([
    { type: "mult", v: "+4" },
    { type: "text", v: " 倍率" },
  ]),
  ice: Object.freeze([
    { type: "text", v: "计分时提供 " },
    { type: "mult", v: "×2" },
    { type: "text", v: " 倍率，有 " },
    { type: "prob", v: "1/4" },
    { type: "text", v: " 的概率碎裂" },
  ]),
  gold: Object.freeze([
    { type: "text", v: "关卡完成时，如果黄金块位于棋盘中，提供 " },
    { type: "money", v: "3" },
  ]),
  steel: Object.freeze([
    { type: "text", v: "单词计分时，如果钢铁块位于棋盘中，提供 " },
    { type: "mult", v: "×1.5" },
    { type: "text", v: " 倍率" },
  ]),
  lucky: Object.freeze([
    { type: "text", v: "计分时有 " },
    { type: "prob", v: "1/5" },
    { type: "text", v: " 的概率提供 " },
    { type: "mult", v: "+20" },
    { type: "text", v: " 倍率，且有 " },
    { type: "prob", v: "1/15" },
    { type: "text", v: " 的概率提供 " },
    { type: "money", v: "20" },
  ]),
  wildcard: Object.freeze([{ type: "text", v: "可以变形为任意字母" }]),
});
