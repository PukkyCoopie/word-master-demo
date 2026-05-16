/**
 * 商店「单卡区」经济参数（对齐 [Balatro Shop](https://balatrowiki.org/w/Shop) 随机卡栏）。
 *
 * - 默认 2 格；纸箱券增加本区槽位（Overstock / Overstock Plus → +1 / +2）。
 * - 类型权重：小丑 20 / 塔罗 4 / 行星 4 → 宝藏 / 法术 / 升级；魔法棒解锁字母块权重 4。
 */

/** 单卡区横向槽位数（与 `ShopPanel` 模板一致）；实际槽位 = 此值 + 纸箱券加成 */
export const SHOP_RANDOM_CARD_SLOT_COUNT = 2;

/**
 * @param {number} bonus 优惠券纸箱加成格数
 */
export function getShopRandomCardSlotCount(bonus = 0) {
  const b = Math.max(0, Math.floor(Number(bonus) || 0));
  return Math.max(1, SHOP_RANDOM_CARD_SLOT_COUNT + b);
}

/** Balatro 默认：Joker 20、Tarot 4、Planet 4 */
export const SHOP_RANDOM_CARD_TYPE_WEIGHTS = Object.freeze({
  treasure: 20,
  spell: 4,
  upgrade: 4,
});

/** 魔法棒：Playing Card 权重 4（与塔罗/行星同档） */
export const SHOP_RANDOM_CARD_PLAYING_CARD_WEIGHT = 4;
