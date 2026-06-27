import { describe } from "../treasures/treasureDescription.js";

/** @typedef {'treasure' | 'spell' | 'upgrade' | 'voucher'} CollectionUnlockHintKind */

/** @type {Record<CollectionUnlockHintKind, { verb: string; noun: string }>} */
const UNLOCK_HINT_WORDS = {
  treasure: { verb: "获取", noun: "宝藏" },
  spell: { verb: "获取", noun: "法术" },
  upgrade: { verb: "获取", noun: "升级" },
  voucher: { verb: "获取", noun: "优惠券" },
};

/**
 * @param {object | null | undefined} treasure
 * @returns {CollectionUnlockHintKind}
 */
export function resolveCollectionUnlockHintKind(treasure) {
  const offerType = String(treasure?.offerType ?? "").trim();
  if (offerType === "upgrade") return "upgrade";
  if (offerType === "spell") return "spell";
  if (offerType === "voucher") return "voucher";
  return "treasure";
}

/**
 * 收藏图鉴：未解锁条目详情下的通用解锁说明。
 * @param {object | null | undefined} treasure
 * @returns {{ title: string; description: import('../treasures/treasureDescription.js').TreasureDescSegment[] }}
 */
export function resolveCollectionUnlockHintPanel(treasure) {
  const kind = resolveCollectionUnlockHintKind(treasure);
  const { verb, noun } = UNLOCK_HINT_WORDS[kind] ?? UNLOCK_HINT_WORDS.treasure;
  return {
    title: "解锁",
    description: describe(`在游戏中${verb}该${noun}以解锁`),
  };
}

/**
 * @param {object | null | undefined} treasure
 * @returns {boolean}
 */
export function isCollectionLegendaryTreasure(treasure) {
  if (resolveCollectionUnlockHintKind(treasure) !== "treasure") return false;
  const r = String(treasure?.rarity ?? "").trim();
  if (r === "legendary") return true;
  return String(treasure?.letterRarity ?? "").trim() === "legendary";
}

/**
 * 收藏图鉴：传说宝藏详情下的商店刷新说明。
 * @returns {{ title: string; description: import('../treasures/treasureDescription.js').TreasureDescSegment[] }}
 */
export function resolveCollectionLegendaryRarityPanel() {
  return {
    title: "传说稀有度",
    description: describe("通常不会刷新在商店中"),
  };
}
