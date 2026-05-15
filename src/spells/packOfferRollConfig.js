/**
 * 商店牌包区：每格商品「大类」的相对权重（不必加总为 1；`rollPackStock` 会按当前仍有库存的类别重新归一化）。
 *
 * - **spell**：法术卡；在尚未被本刷新抽中的法术定义中均匀抽一种。
 * - **lengthUpgrade**：长度升级（各长度组一条，抽中后该组不再出现）。
 * - **rarityUpgrade**：稀有度升级（各稀有度档一条，同上）。
 *
 * 当前权重：法术 **15%**；长度升级 **50%**；稀有度升级 **35%**。
 */
export const PACK_OFFER_CATEGORY_WEIGHTS = Object.freeze({
  spell: 15,
  lengthUpgrade: 50,
  rarityUpgrade: 35,
});
