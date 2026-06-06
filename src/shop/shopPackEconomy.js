/**
 * 商店「牌包区」经济参数与抽选权重（仅各类组合包；单张散卡见单卡区 `rollShopRandomCardStock`）。
 *
 * ## 修改入口（调数值只看本文件）
 *
 * - **组合包售价**：`SHOP_BUNDLE_PACK_PRICES`
 * - **单张法术 / 升级 / 字母售价**（单卡区与包内选项详情）：`SHOP_SINGLE_ROW_PRICES`
 * - **组合包类型权重**：`PACK_OFFER_CATEGORY_WEIGHTS`（槽位内归一化）。
 *
 * 组合包规则对齐 Balatro Booster Packs（Normal / Jumbo / Mega）：
 * - 法术 / 升级 / 字母块（tile，随机有无材质）：Normal 3 选 1；Jumbo 5 选 1；Mega 5 选至多 2。
 * - 宝藏：Normal 2 选 1；Jumbo 4 选 1；Mega 4 选至多 2。
 */

/** 牌包区横向槽位数（固定 2，对齐 Balatro 默认 2 个 Booster Pack；纸箱券加成在单卡区） */
export const PACK_OFFER_SLOT_COUNT = 2;

/** 牌包区槽位恒为 {@link PACK_OFFER_SLOT_COUNT} */
export function getPackOfferSlotCount() {
  return PACK_OFFER_SLOT_COUNT;
}

/**
 * 组合包售价（美元）。按 `bundleKind` + `bundleSize`（与 Balatro 补充包同档：$4 / $6 / $8）。
 */
export const SHOP_BUNDLE_PACK_PRICES = Object.freeze({
  spell: Object.freeze({ normal: 4, jumbo: 6, mega: 8 }),
  upgrade: Object.freeze({ normal: 3, jumbo: 5, mega: 7 }),
  treasure: Object.freeze({ normal: 4, jumbo: 6, mega: 8 }),
  tile: Object.freeze({ normal: 4, jumbo: 6, mega: 8 }),
});

/**
 * 商店单张商品售价（随机卡栏；组合包内选项展示价亦引用）。
 * 法术单价建议与 `spellDefinitions.js` 的 `SPELL_SHOP_PRICE` 保持一致（本处再写一份便于一眼调整个商店）。
 */
export const SHOP_SINGLE_ROW_PRICES = Object.freeze({
  spell: 3,
  lengthUpgrade: 3,
  rarityUpgrade: 4,
  /** 单张字母块进库（无材质/配饰） */
  deckTilePlain: 3,
  /** 单张字母块进库（带材质/配饰） */
  deckTile: 5,
});

/**
 * 牌包区每格组合包类型权重（槽位内归一化）。
 */
export const PACK_OFFER_CATEGORY_WEIGHTS = Object.freeze({
  /** Standard / Arcana / Celestial 类在 Wiki 上的相对权重 4 : 2 : 0.5 */
  bundleSpellNormal: 4,
  bundleSpellJumbo: 2,
  bundleSpellMega: 0.5,
  bundleUpgradeNormal: 4,
  bundleUpgradeJumbo: 2,
  bundleUpgradeMega: 0.5,
  /** Buffoon 类：1.2 : 0.6 : 0.15 */
  bundleTreasureNormal: 1.2,
  bundleTreasureJumbo: 0.6,
  bundleTreasureMega: 0.15,
  bundleTileNormal: 8,
  bundleTileJumbo: 4,
  bundleTileMega: 1,
});

/** 字母块包 / 带增益 tile：可出现的材质 id（不含万能） */
export const SHOP_TILE_PACK_MATERIAL_IDS = Object.freeze(["gold", "steel", "ice", "water", "fire", "lucky"]);

/** 打字机·二级：商店材质池追加万能块（不在券面文案中说明） */
export const SHOP_WILDCARD_MATERIAL_ID = "wildcard";

/** 商店单张万能材质字母块售价 */
export const SHOP_WILDCARD_TILE_PRICE = 6;

/**
 * @param {boolean} [illusionOwned] 是否拥有打字机二级（v_magic_2）
 * @returns {readonly string[]}
 */
export function getShopTilePackMaterialIds(illusionOwned = false) {
  if (!illusionOwned) return SHOP_TILE_PACK_MATERIAL_IDS;
  return Object.freeze([...SHOP_TILE_PACK_MATERIAL_IDS, SHOP_WILDCARD_MATERIAL_ID]);
}

/**
 * @param {{ materialId?: string | null, accessoryId?: string | null, treasureAccessoryId?: string | null }} mods
 * @returns {number}
 */
export function resolveDeckTileShopPrice(mods) {
  const mat = String(mods?.materialId ?? "").trim();
  const acc = String(mods?.accessoryId ?? "").trim();
  const tAcc = String(mods?.treasureAccessoryId ?? "").trim();
  if (!mat && !acc && !tAcc) return SHOP_SINGLE_ROW_PRICES.deckTilePlain;
  if (mat === SHOP_WILDCARD_MATERIAL_ID) return SHOP_WILDCARD_TILE_PRICE;
  return SHOP_SINGLE_ROW_PRICES.deckTile;
}
