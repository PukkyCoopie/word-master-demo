import { describe, discardDelta, entityInline, handDelta, money } from "../treasures/treasureDescription.js";

/** @typedef {'default' | 'convertRemainsNoInterest'} RunPresetSettlementMode */

/**
 * @typedef {Object} RunPresetEffects
 * @property {number} [handsPerLevelDelta]
 * @property {number} [removalsPerLevelDelta]
 * @property {number} [treasureSlotDelta]
 * @property {string[]} [startVoucherIds]
 * @property {number} [startMoneyBonus]
 * @property {number} [startWildcardCount]
 * @property {number} [wordLengthJudgmentBonus]
 * @property {RunPresetSettlementMode} [settlementMode]
 * @property {boolean} [treasureSlotsUseFiveSlotLayoutAtFour]
 * @property {{ upgrade?: number, spell?: number, letter?: number }} [shopFlatDiscount]
 */

/**
 * @typedef {Object} RunPresetDef
 * @property {string} id
 * @property {string} emoji
 * @property {string} name
 * @property {import('../treasures/treasureDescription.js').TreasureDescSegment[]} description
 * @property {RunPresetEffects} effects
 */

/** @type {readonly RunPresetDef[]} */
const PRESETS = [
  {
    id: "preset_01",
    emoji: "✒️",
    name: "钢笔",
    description: describe("每关", handDelta("+1"), "拼写次数"),
    effects: { handsPerLevelDelta: 1 },
  },
  {
    id: "preset_02",
    emoji: "♻️",
    name: "回收",
    description: describe("每关", discardDelta("+1"), "丢弃次数"),
    effects: { removalsPerLevelDelta: 1 },
  },
  {
    id: "preset_03",
    emoji: "💱",
    name: "兑换",
    description: describe(
      "拼写和丢弃次数会结算为",
      money("2"),
      "和",
      money("1"),
      "，你无法获得利息",
    ),
    effects: { settlementMode: "convertRemainsNoInterest" },
  },
  {
    id: "preset_04",
    emoji: "🔀",
    name: "交叉",
    description: describe(handDelta("+1"), "宝藏栏位，", discardDelta("-1"), "拼词次数"),
    effects: { treasureSlotDelta: 1, handsPerLevelDelta: -1 },
  },
  {
    id: "preset_05",
    emoji: "🛰️",
    name: "卫星",
    description: describe(
      "开局时拥有",
      entityInline("voucher", "v_telescope_1"),
      "，升级卡和升级包的价格降低",
      money("1"),
    ),
    effects: { startVoucherIds: ["v_telescope_1"], shopFlatDiscount: { upgrade: 1 } },
  },
  {
    id: "preset_06",
    emoji: "🎩",
    name: "礼帽",
    description: describe(
      "开局时拥有",
      entityInline("voucher", "v_tarot_1"),
      "，法术卡和法术包的价格降低",
      money("1"),
    ),
    effects: { startVoucherIds: ["v_tarot_1"], shopFlatDiscount: { spell: 1 } },
  },
  {
    id: "preset_07",
    emoji: "👔",
    name: "领带",
    description: describe(
      "开局时拥有",
      entityInline("voucher", "v_overstock_1"),
      "和",
      entityInline("voucher", "v_magic_1"),
      "，字母块和字母包的价格降低",
      money("1"),
    ),
    effects: { startVoucherIds: ["v_overstock_1", "v_magic_1"], shopFlatDiscount: { letter: 1 } },
  },
  {
    id: "preset_08",
    emoji: "🌳",
    name: "树",
    description: describe("开局时拥有", entityInline("voucher", "v_seed_1"), "和额外", money("5")),
    effects: { startVoucherIds: ["v_seed_1"], startMoneyBonus: 5 },
  },
  {
    id: "preset_09",
    emoji: "🎴",
    name: "纸牌",
    description: describe("开局时拥有 5 颗额外的", entityInline("wildcardTile", "wildcard")),
    effects: { startWildcardCount: 5 },
  },
  {
    id: "preset_10",
    emoji: "📐",
    name: "三角尺",
    description: describe("你的单词被视为", handDelta("+1"), "长度，", discardDelta("-1"), "宝藏栏位"),
    effects: {
      wordLengthJudgmentBonus: 1,
      treasureSlotDelta: -1,
      treasureSlotsUseFiveSlotLayoutAtFour: true,
    },
  },
];

/** @type {readonly RunPresetDef[]} */
export const RUN_PRESET_DEFINITIONS = Object.freeze(PRESETS.map((p) => Object.freeze({ ...p })));

/** @type {ReadonlyMap<string, RunPresetDef>} */
export const RUN_PRESETS_BY_ID = new Map(RUN_PRESET_DEFINITIONS.map((p) => [p.id, p]));

export const DEFAULT_RUN_PRESET_ID = "preset_01";

/** @param {string | null | undefined} id */
export function normalizeRunPresetId(id) {
  const s = String(id ?? "").trim();
  if (s && RUN_PRESETS_BY_ID.has(s)) return s;
  return DEFAULT_RUN_PRESET_ID;
}

/** @param {string | null | undefined} id */
export function getRunPresetDef(id) {
  return RUN_PRESETS_BY_ID.get(normalizeRunPresetId(id)) ?? RUN_PRESETS_BY_ID.get(DEFAULT_RUN_PRESET_ID);
}

/** @typedef {'normal' | 'medium' | 'compact'} PresetDescriptionLayoutTier */

/**
 * 按描述长度估算排版档位（长文案缩小字号以保持框高一致）。
 * @param {RunPresetDef | null | undefined} def
 * @returns {PresetDescriptionLayoutTier}
 */
export function getPresetDescriptionLayoutTier(def) {
  const desc = def?.description;
  if (!Array.isArray(desc)) return "normal";
  let chars = 0;
  for (const seg of desc) {
    if (seg.type === "text") chars += String(seg.v ?? "").length;
    else if (seg.type === "handDelta" || seg.type === "discardDelta") chars += String(seg.v ?? "").length + 2;
    else if (seg.type === "money") chars += String(seg.v ?? "").length + 1;
    else if (seg.type === "entityInline") chars += 4;
  }
  if (chars >= 32) return "compact";
  if (chars >= 26) return "medium";
  return "normal";
}
