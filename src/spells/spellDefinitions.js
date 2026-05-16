import {
  buildStarSpellRandomTreasureAccessoryDescription,
  getTileMaterialBlockTitle,
} from "../game/gameConceptCopy.js";

/** 商店法术卡单价（与 `src/shop/shopPackEconomy.js` 的 `SHOP_SINGLE_ROW_PRICES.spell` 保持一致） */
export const SPELL_SHOP_PRICE = 3;

/** 法术目标候选格上限（有字母的格子中随机） */
export const SPELL_CANDIDATE_TILE_CAP = 10;

/** 骰子随机池排除（避免递归与无意义重播） */
export const SPELL_IDS_EXCLUDED_FROM_DICE = Object.freeze(["restart", "dice"]);

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   iconClass: string,
 *   pickCount: number,
 *   description: string,
 * }} SpellDefinition
 */

/** @returns {SpellDefinition[]} */
function buildSpellDefinitions() {
  const m = getTileMaterialBlockTitle;
  return [
    {
      id: "restart",
      name: "重播",
      iconClass: "ri-restart-fill",
      pickCount: -1,
      description: "重复你的上一张法术卡的效果",
    },
    {
      id: "cake",
      name: "蛋糕",
      iconClass: "ri-cake-2-fill",
      pickCount: 2,
      description: `选择2个字母块，使其变为${m("lucky")}`,
    },
    {
      id: "dice",
      name: "骰子",
      iconClass: "ri-dice-fill",
      pickCount: 0,
      description: "随机释放2张其他法术卡",
    },
    {
      id: "arrow_up",
      name: "向上",
      iconClass: "ri-arrow-up-circle-fill",
      pickCount: 0,
      description: "随机释放2个升级卡",
    },
    {
      id: "blaze",
      name: "炙烤",
      iconClass: "ri-blaze-fill",
      pickCount: 2,
      description: `选择2个字母块，使其变为${m("fire")}`,
    },
    {
      id: "drinks",
      name: "饮料",
      iconClass: "ri-drinks-2-fill",
      pickCount: 2,
      description: `选择2个字母块，使其变为${m("water")}`,
    },
    {
      id: "lightbulb",
      name: "点亮",
      iconClass: "ri-lightbulb-ai-fill",
      pickCount: 1,
      description: `选择1个字母块，使其变为${m("wildcard")}`,
    },
    {
      id: "hammer",
      name: "锤炼",
      iconClass: "ri-hammer-fill",
      pickCount: 1,
      description: `选择1个字母块，使其变为${m("steel")}`,
    },
    {
      id: "snowflake",
      name: "降温",
      iconClass: "ri-snowflake-fill",
      pickCount: 1,
      description: `选择1个字母块，使其变为${m("ice")}`,
    },
    {
      id: "hand_coin",
      name: "积累",
      iconClass: "ri-hand-coin-fill",
      pickCount: 0,
      description: "翻倍余额，至多获得$20",
    },
    {
      id: "star",
      name: "星星",
      iconClass: "ri-star-fill",
      pickCount: 0,
      description: buildStarSpellRandomTreasureAccessoryDescription(),
    },
    {
      id: "seedling",
      name: "生长",
      iconClass: "ri-seedling-fill",
      pickCount: 2,
      description: "选择2个字母块，使他们后移1位",
    },
    {
      id: "delete_back",
      name: "删除",
      iconClass: "ri-delete-back-2-fill",
      pickCount: 2,
      description: "选择2个字母块，从牌库中将其移除",
    },
    {
      id: "file_copy",
      name: "复制",
      iconClass: "ri-file-copy-fill",
      pickCount: 2,
      description: "选择2个字母块，将第1个变为第2个的复制",
    },
    {
      id: "price_tag",
      name: "标签",
      iconClass: "ri-price-tag-3-fill",
      pickCount: 0,
      description: "获得金币，数值相当于当前所有宝藏的售出价值总和",
    },
    {
      id: "flask",
      name: "炼金",
      iconClass: "ri-flask-fill",
      pickCount: 1,
      description: `选择1个字母块，使其变为${m("gold")}`,
    },
    {
      id: "bard",
      name: "抛光",
      iconClass: "ri-bard-fill",
      pickCount: 2,
      description: "选择2个字母块，使其稀有度提升1级",
    },
    {
      id: "mic",
      name: "麦克风",
      iconClass: "ri-mic-fill",
      pickCount: 2,
      description: "选择2个字母块，使其变为随机的辅音字母",
    },
    {
      id: "notification",
      name: "铃铛",
      iconClass: "ri-notification-3-fill",
      pickCount: 2,
      description: "选择2个字母块，使其变为随机的元音字母",
    },
    {
      id: "phone",
      name: "电话",
      iconClass: "ri-phone-fill",
      pickCount: 3,
      description: "选择3个字母块，使其变为随机的任意字母",
    },
    {
      id: "treasure_map",
      name: "藏宝图",
      iconClass: "ri-treasure-map-fill",
      pickCount: 0,
      description: "获取一个随机宝藏。",
    },
  ];
}

/** @type {SpellDefinition[]} */
export const SPELL_DEFINITIONS = Object.freeze(buildSpellDefinitions());

const BY_ID = new Map(SPELL_DEFINITIONS.map((d) => [d.id, d]));

/** @param {string} id */
export function getSpellDefinition(id) {
  return BY_ID.get(String(id ?? "")) ?? null;
}

/**
 * @param {string} spellId
 * @param {string | null} lastReplayableSpellId
 */
export function resolveSpellPickCount(spellId, lastReplayableSpellId) {
  const sid = String(spellId ?? "");
  if (sid === "restart") {
    const prev = lastReplayableSpellId ? getSpellDefinition(lastReplayableSpellId) : null;
    return prev && prev.pickCount >= 0 ? prev.pickCount : 0;
  }
  const d = getSpellDefinition(sid);
  return d ? Math.max(0, d.pickCount) : 0;
}
