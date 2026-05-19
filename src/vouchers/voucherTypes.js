/**
 * @typedef {1|2} VoucherTier
 * @typedef {{
 *   id: string,
 *   pairId: string,
 *   tier: VoucherTier,
 *   emoji: string,
 *   nameStem: string,
 *   price: number,
 *   description: string | import("../treasures/treasureDescription.js").TreasureDescSegment[],
 *   effectKey: string,
 *   inShopPool: boolean,
 * }} VoucherDef
 */

export {};
