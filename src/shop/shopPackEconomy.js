/**
 * 商店「牌包区」经济参数与抽选权重（单张 + 各类组合包）。
 *
 * ## 修改入口（调数值只看本文件）
 *
 * - **组合包售价**：`SHOP_BUNDLE_PACK_PRICES`
 * - **单张法术 / 升级卡售价**（牌包区与详情一致）：`SHOP_SINGLE_ROW_PRICES`
 * - **单张 vs 组合包总占比**：`PACK_OFFER_SINGLE_VS_BUNDLE_WEIGHTS`（默认各 50；一侧无货时另一侧占满）。
 * - **分支内细权重**：`PACK_OFFER_CATEGORY_WEIGHTS`（只在「单张」或「组合包」子集内归一化）。
 *
 * 组合包规则（与玩法约定一致）：
 * - 法术 / 升级 / 字母 / 字母（带棋盘材质）：**小**包池子 3 张选 1，**大**包池子 5 张选 2。
 * - 宝藏：**小**包 2 选 1，**大**包 4 选 2。
 */

/** 牌包区横向槽位数（与 `ShopPanel` 模板一致）；实际槽位 = 此值 + 优惠券「纸箱」加成 */
export const PACK_OFFER_SLOT_COUNT = 3;

/**
 * @param {number} bonus 优惠券纸箱加成格数
 */
export function getPackOfferSlotCount(bonus = 0) {
  const b = Math.max(0, Math.floor(Number(bonus) || 0));
  return Math.max(1, PACK_OFFER_SLOT_COUNT + b);
}

/**
 * 组合包售价（美元）。按 `bundleKind` + `bundleSize`。
 * - `spell` / `upgrade` / `letter` / `tile`：小/大 = 3选1 / 5选2。
 * - `treasure`：小/大 = 2选1 / 4选2。
 */
export const SHOP_BUNDLE_PACK_PRICES = Object.freeze({
  spell: Object.freeze({ small: 8, large: 14 }),
  upgrade: Object.freeze({ small: 10, large: 18 }),
  treasure: Object.freeze({ small: 12, large: 22 }),
  letter: Object.freeze({ small: 5, large: 9 }),
  tile: Object.freeze({ small: 9, large: 16 }),
});

/**
 * 牌包区「单张」卡售价（与组合包无关的散卡）。
 * 法术单价建议与 `spellDefinitions.js` 的 `SPELL_SHOP_PRICE` 保持一致（本处再写一份便于一眼调整个商店）。
 */
export const SHOP_SINGLE_ROW_PRICES = Object.freeze({
  spell: 3,
  lengthUpgrade: 4,
  rarityUpgrade: 6,
  /** 单张字母进库（魔法棒） */
  deckLetter: 3,
  /** 单张带材质字母进库 */
  deckTile: 5,
});

/**
 * 每格先抽「单张」还是「组合包」：相对权重（不必加总为 1；`rollPackStock` 内归一化）。
 * 默认与 `PACK_OFFER_CATEGORY_WEIGHTS` 配合：先定分支，再在分支内按细权重抽具体形态。
 */
export const PACK_OFFER_SINGLE_VS_BUNDLE_WEIGHTS = Object.freeze({
  single: 50,
  bundle: 50,
});

/**
 * 分支内细权重：仅在「单张」或「组合包」子集内归一化。
 * - `single*`：单张散卡。
 * - `bundle*`：各类组合包（含纯字母与带棋盘材质的字母等）。
 */
export const PACK_OFFER_CATEGORY_WEIGHTS = Object.freeze({
  singleSpell: 10,
  singleLengthUpgrade: 18,
  singleRarityUpgrade: 14,
  bundleSpellSmall: 8,
  bundleSpellLarge: 5,
  bundleUpgradeSmall: 8,
  bundleUpgradeLarge: 4,
  bundleTreasureSmall: 7,
  bundleTreasureLarge: 4,
  bundleLetterSmall: 9,
  bundleLetterLarge: 5,
  bundleTileSmall: 6,
  bundleTileLarge: 4,
});

/** 字母（带棋盘材质）包：可出现的材质 id（不含万能） */
export const SHOP_TILE_PACK_MATERIAL_IDS = Object.freeze(["gold", "steel", "ice", "water", "fire", "lucky"]);
