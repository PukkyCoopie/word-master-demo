import {
  buildStarSpellRandomTreasureAccessoryDescription,
  getTileBoardAccessoryTitle,
  getTileMaterialBlockTitle,
  getTreasureAccessoryPanelTitle,
} from "../game/gameConceptCopy.js";
import { concept, describe, gain, money, rarity, riskBlock, score } from "../treasures/treasureDescription.js";
import { SPELL_TAG_SPECTRAL } from "./spellTags.js";

/** 商店法术卡单价（与 `src/shop/shopPackEconomy.js` 的 `SHOP_SINGLE_ROW_PRICES.spell` 保持一致） */
export const SPELL_SHOP_PRICE = 3;

/** 法术目标候选格上限（有字母的格子中随机） */
export const SPELL_CANDIDATE_TILE_CAP = 10;

/** 骰子随机池排除（避免递归与无意义重播） */
export const SPELL_IDS_EXCLUDED_FROM_DICE = Object.freeze(["restart", "dice"]);

/**
 * @typedef {'none' | 'pick' | 'confirm_all' | 'preview_only'} SpellPickMode
 * - `none`：无选格层，直接结算
 * - `pick`：在候选格中点选 `pickCount` 个
 * - `confirm_all`：展示候选格，点确定后将在下列字母中随机生效
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   iconClass: string,
 *   pickCount: number,
 *   pickMode?: SpellPickMode,
 *   description: string | import("../treasures/treasureDescription.js").TreasureDescSegment[],
 *   tags?: readonly string[],
 *   shopPrice?: number,
 * }} SpellDefinition
 */

const SPECTRAL = Object.freeze([SPELL_TAG_SPECTRAL]);

/** @returns {SpellDefinition[]} */
function buildSpellDefinitions() {
  const m = getTileMaterialBlockTitle;
  return [
    {
      id: "restart",
      name: "重播",
      iconClass: "ri-restart-fill",
      pickCount: -1,
      shopPrice: 4,
      description: "重复你的上一张法术卡的效果",
    },
    {
      id: "cake",
      name: "蛋糕",
      iconClass: "ri-cake-2-fill",
      pickCount: 2,
      shopPrice: 4,
      description: `选择2个字母块，使其变为${m("lucky")}`,
    },
    {
      id: "dice",
      name: "骰子",
      iconClass: "ri-dice-fill",
      pickCount: 0,
      shopPrice: 4,
      description: "随机释放2张其他法术卡",
    },
    {
      id: "arrow_up",
      name: "向上",
      iconClass: "ri-arrow-up-circle-fill",
      pickCount: 0,
      shopPrice: 4,
      description: describe("随机释放2个", concept("升级"), "卡"),
    },
    {
      id: "blaze",
      name: "炙烤",
      iconClass: "ri-blaze-fill",
      pickCount: 2,
      shopPrice: 3,
      description: `选择2个字母块，使其变为${m("fire")}`,
    },
    {
      id: "drinks",
      name: "饮料",
      iconClass: "ri-drinks-2-fill",
      pickCount: 2,
      shopPrice: 3,
      description: `选择2个字母块，使其变为${m("water")}`,
    },
    {
      id: "lightbulb",
      name: "点亮",
      iconClass: "ri-lightbulb-ai-fill",
      pickCount: 1,
      shopPrice: 5,
      description: `选择1个字母块，使其变为${m("wildcard")}`,
    },
    {
      id: "hammer",
      name: "锤炼",
      iconClass: "ri-hammer-fill",
      pickCount: 1,
      shopPrice: 4,
      description: `选择1个字母块，使其变为${m("steel")}`,
    },
    {
      id: "snowflake",
      name: "降温",
      iconClass: "ri-snowflake-fill",
      pickCount: 1,
      shopPrice: 3,
      description: `选择1个字母块，使其变为${m("ice")}`,
    },
    {
      id: "hand_coin",
      name: "积累",
      iconClass: "ri-hand-coin-fill",
      pickCount: 0,
      shopPrice: 3,
      description: "翻倍余额，至多获得$20",
    },
    {
      id: "star",
      name: "星星",
      iconClass: "ri-star-fill",
      pickCount: 0,
      shopPrice: 3,
      description: buildStarSpellRandomTreasureAccessoryDescription(),
    },
    {
      id: "seedling",
      name: "生长",
      iconClass: "ri-seedling-fill",
      pickCount: 2,
      shopPrice: 2,
      description: "选择2个字母块，使他们后移1位",
    },
    {
      id: "delete_back",
      name: "删除",
      iconClass: "ri-delete-back-2-fill",
      pickCount: 2,
      shopPrice: 3,
      description: "选择2个字母块，从牌库中将其移除",
    },
    {
      id: "file_copy",
      name: "复制",
      iconClass: "ri-file-copy-fill",
      pickCount: 2,
      shopPrice: 3,
      description: "选择2个字母块，将第1个变为第2个的复制",
    },
    {
      id: "price_tag",
      name: "标签",
      iconClass: "ri-price-tag-3-fill",
      pickCount: 0,
      shopPrice: 3,
      description: "获得金币，数值相当于当前所有宝藏的售出价值总和",
    },
    {
      id: "coupon_drop",
      name: "促销",
      iconClass: "ri-ticket-2-fill",
      pickCount: 0,
      shopPrice: 5,
      description:
        "向商店优惠券区添加一张随机优惠券，持续到下个 Boss 关前（至多额外 1 张）",
    },
    {
      id: "flask",
      name: "炼金",
      iconClass: "ri-flask-fill",
      pickCount: 1,
      shopPrice: 3,
      description: `选择1个字母块，使其变为${m("gold")}`,
    },
    {
      id: "bard",
      name: "抛光",
      iconClass: "ri-bard-fill",
      pickCount: 2,
      shopPrice: 3,
      description: "选择2个字母块，使其稀有度提升1级",
    },
    {
      id: "mic",
      name: "麦克风",
      iconClass: "ri-mic-fill",
      pickCount: 2,
      shopPrice: 2,
      description: "选择2个字母块，使其变为随机的辅音字母",
    },
    {
      id: "notification",
      name: "铃铛",
      iconClass: "ri-notification-3-fill",
      pickCount: 2,
      shopPrice: 3,
      description: "选择2个字母块，使其变为随机的元音字母",
    },
    {
      id: "phone",
      name: "电话",
      iconClass: "ri-phone-fill",
      pickCount: 3,
      shopPrice: 3,
      description: "选择3个字母块，使其变为随机的字母",
    },
    {
      id: "treasure_map",
      name: "藏宝图",
      iconClass: "ri-treasure-map-fill",
      pickCount: 0,
      shopPrice: 4,
      description: "获取一个随机宝藏",
    },
    // --- Spectral（幻灵）对齐 Balatro，简化为法术卡；见 spellTags.js ---
    {
      id: "familiar",
      name: "家猫",
      iconClass: "ri-bear-smile-fill",
      pickCount: 0,
      pickMode: "confirm_all",
      tags: SPECTRAL,
      shopPrice: 4,
      description: "从下列字母中随机移除1个，将3个带有增强效果的元音字母加入你的牌库",
    },
    {
      id: "grim",
      name: "幽魂",
      iconClass: "ri-ghost-smile-fill",
      pickCount: 0,
      pickMode: "confirm_all",
      tags: SPECTRAL,
      shopPrice: 4,
      description: "从下列字母中随机移除1个，将2个带有增强效果的E加入你的牌库",
    },
    {
      id: "incantation",
      name: "卷轴",
      iconClass: "ri-pages-fill",
      pickCount: 0,
      pickMode: "confirm_all",
      tags: SPECTRAL,
      shopPrice: 4,
      description: "从下列字母中随机移除1个，将4个带有增强效果的辅音字母加入你的牌库",
    },
    {
      id: "talisman",
      name: "奖章",
      iconClass: "ri-medal-fill",
      pickCount: 0,
      pickMode: "confirm_all",
      tags: SPECTRAL,
      shopPrice: 4,
      description: `从下列字母中随机挑选1个，为其添加${getTileBoardAccessoryTitle("coin")}`,
    },
    {
      id: "aura",
      name: "棱镜",
      iconClass: "ri-shining-2-fill",
      pickCount: 1,
      tags: SPECTRAL,
      shopPrice: 3,
      description: "选择1个字母，为其添加一个随机配饰",
    },
    {
      id: "cache",
      name: "宝匣",
      iconClass: "ri-archive-2-fill",
      pickCount: 0,
      tags: SPECTRAL,
      shopPrice: 4,
      description: "获取一个随机的史诗宝藏",
    },
    {
      id: "wraith",
      name: "空钱包",
      iconClass: "ri-wallet-3-fill",
      pickCount: 0,
      tags: SPECTRAL,
      shopPrice: 7,
      description: describe(
        "获取一个随机的",
        rarity("传说"),
        "宝藏",
        riskBlock("，将钱包余额变为", money("0")),
      ),
    },
    {
      id: "ouija",
      name: "曜板",
      iconClass: "ri-layout-masonry-fill",
      pickCount: 0,
      pickMode: "confirm_all",
      tags: SPECTRAL,
      shopPrice: 3,
      description: "将下列字母全部转换为同一个随机的稀有度",
    },
    {
      id: "ectoplasm",
      name: "烛台",
      iconClass: "ri-candle-fill",
      pickCount: 0,
      tags: SPECTRAL,
      shopPrice: 5,
      description: describe(
        "为你的一个随机宝藏添加",
        gain("裁剪配饰"),
        riskBlock("，但你之后拼写的单词都会视为", score("-1"), "长度"),
      ),
    },
    {
      id: "immolate",
      name: "火柴",
      iconClass: "ri-fire-fill",
      pickCount: 0,
      pickMode: "confirm_all",
      tags: SPECTRAL,
      shopPrice: 5,
      description: describe(riskBlock("随机移除下方全部字母"), "，获得", money("15")),
    },
    {
      id: "ankh",
      name: "钥匙",
      iconClass: "ri-key-2-fill",
      pickCount: 0,
      tags: SPECTRAL,
      shopPrice: 5,
      description: describe(
        "从你的宝藏中随机挑选1个，",
        riskBlock("摧毁其他宝藏"),
        "，然后创建一个挑选的宝藏的复制",
      ),
    },
    {
      id: "deja_vu",
      name: "胶片",
      iconClass: "ri-film-fill",
      pickCount: 0,
      pickMode: "confirm_all",
      tags: SPECTRAL,
      shopPrice: 4,
      description: `从下列字母中随机挑选1个，为其添加${getTileBoardAccessoryTitle("rewind")}`,
    },
    {
      id: "wrench",
      name: "扳手",
      iconClass: "ri-wrench-fill",
      pickCount: 0,
      pickMode: "confirm_all",
      tags: SPECTRAL,
      shopPrice: 4,
      description: `从下列字母中随机挑选1个，为其添加${getTreasureAccessoryPanelTitle("treasure_acc_wrench")}`,
    },
    {
      id: "diamond",
      name: "钻石",
      iconClass: "ri-vip-diamond-fill",
      pickCount: 0,
      pickMode: "confirm_all",
      tags: SPECTRAL,
      shopPrice: 4,
      description: `从下列字母中随机挑选1个，为其添加${getTileBoardAccessoryTitle("vip_diamond")}`,
    },
    {
      id: "eclipse_length",
      name: "阶梯",
      iconClass: "ri-stairs-fill",
      pickCount: 0,
      tags: SPECTRAL,
      shopPrice: 7,
      description: "将所有单词长度的等级提升1级",
    },
    {
      id: "eclipse_rarity",
      name: "色盘",
      iconClass: "ri-palette-fill",
      pickCount: 0,
      tags: SPECTRAL,
      shopPrice: 7,
      description: "将所有稀有度的等级提升1级",
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

/** @param {SpellDefinition | string | null | undefined} defOrId */
export function getSpellShopPrice(defOrId) {
  const def =
    typeof defOrId === "string" ? getSpellDefinition(defOrId) : defOrId && typeof defOrId === "object" ? defOrId : null;
  return Math.max(0, Math.round(Number(def?.shopPrice ?? SPELL_SHOP_PRICE)) || SPELL_SHOP_PRICE);
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

/** @param {string} spellId */
export function resolveSpellPickMode(spellId) {
  const d = getSpellDefinition(String(spellId ?? ""));
  if (d?.pickMode) return d.pickMode;
  const n = d ? Math.max(0, d.pickCount) : 0;
  return n > 0 ? "pick" : "none";
}

/**
 * 是否打开法术选格层（含「仅确认」的 confirm_all）。
 * @param {string} spellId
 * @param {string | null} [lastReplayableSpellId]
 */
export function shouldOpenSpellTargetLayer(spellId, lastReplayableSpellId) {
  const sid = String(spellId ?? "");
  if (sid === "restart" || sid === "dice") return true;
  return resolveSpellPickMode(sid) !== "none";
}

/**
 * 对局内释法：一律先开预览层（含无选格法术）。
 * @param {string} spellId
 */
export function shouldOpenInRunSpellPreview(spellId) {
  return Boolean(String(spellId ?? "").trim());
}
