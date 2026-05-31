/**
 * 配饰定义表（唯一事实源）：id、应用范围、角标、效果参数、掷骰池。
 * 玩家向名称与效果说明仍由 `gameConceptCopy.js` 提供。
 */

/** @typedef {'tile' | 'treasure'} AccessoryScope */
/** @typedef {'board' | 'treasure_field'} AccessoryLegacyStorage */

/** @typedef {Object} AccessoryPerLetterEffect
 * @property {'score_add' | 'mult_add' | 'mult_mul'} kind
 * @property {number} value
 */

/** @typedef {Object} AccessoryPostLetterEffect
 * @property {'score_add' | 'mult_add' | 'mult_mul'} kind
 * @property {number} value
 */

/** @typedef {Object} AccessoryDef
 * @property {string} id
 * @property {readonly AccessoryScope[]} scopes
 * @property {AccessoryLegacyStorage} legacyStorage 运行时写入哪一字段（与旧存档/UI 兼容）
 * @property {{ chipClass: string, iconClass: string }} chip
 * @property {AccessoryPerLetterEffect} [perLetterOnTile]
 * @property {AccessoryPostLetterEffect} [postLetterOnTreasure]
 * @property {{ slotCapacityAdd?: number }} [meta]
 * @property {{ deckTileBoard?: true, deckTileEditionWeight?: number, treasureShopWeight?: number, shopPriceAdd?: number }} [roll]
 */

export const ACCESSORY_LEVEL_UPGRADE = "level_upgrade";
export const ACCESSORY_VIP_DIAMOND = "vip_diamond";
export const ACCESSORY_REWIND = "rewind";
export const ACCESSORY_COIN = "coin";
export const ACCESSORY_FIRE = "treasure_acc_fire";
export const ACCESSORY_DROP = "treasure_acc_drop";
export const ACCESSORY_WRENCH = "treasure_acc_wrench";
export const ACCESSORY_CROP = "treasure_acc_crop";
export const ACCESSORY_NO_SELL = "treasure_acc_no_sell";
export const ACCESSORY_HOURGLASS = "treasure_acc_hourglass";
export const ACCESSORY_RENTAL = "treasure_acc_rental";

/** @type {Readonly<Record<string, AccessoryDef>>} */
export const ACCESSORY_CATALOG = Object.freeze({
  [ACCESSORY_LEVEL_UPGRADE]: Object.freeze({
    id: ACCESSORY_LEVEL_UPGRADE,
    scopes: Object.freeze(["tile"]),
    legacyStorage: "board",
    chip: Object.freeze({
      chipClass: "tile-accessory-chip--level-upgrade",
      iconClass: "ri-arrow-up-double-line",
    }),
    roll: Object.freeze({ deckTileBoard: true }),
  }),
  [ACCESSORY_VIP_DIAMOND]: Object.freeze({
    id: ACCESSORY_VIP_DIAMOND,
    scopes: Object.freeze(["tile"]),
    legacyStorage: "board",
    chip: Object.freeze({
      chipClass: "tile-accessory-chip--vip-diamond",
      iconClass: "ri-vip-diamond-line",
    }),
    roll: Object.freeze({ deckTileBoard: true }),
  }),
  [ACCESSORY_REWIND]: Object.freeze({
    id: ACCESSORY_REWIND,
    scopes: Object.freeze(["tile"]),
    legacyStorage: "board",
    chip: Object.freeze({
      chipClass: "tile-accessory-chip--rewind",
      iconClass: "ri-rewind-line",
    }),
    roll: Object.freeze({ deckTileBoard: true }),
  }),
  [ACCESSORY_COIN]: Object.freeze({
    id: ACCESSORY_COIN,
    scopes: Object.freeze(["tile"]),
    legacyStorage: "board",
    chip: Object.freeze({
      chipClass: "tile-accessory-chip--coin",
      iconClass: "ri-copper-coin-line",
    }),
    roll: Object.freeze({ deckTileBoard: true }),
  }),
  [ACCESSORY_FIRE]: Object.freeze({
    id: ACCESSORY_FIRE,
    scopes: Object.freeze(["tile", "treasure"]),
    legacyStorage: "treasure_field",
    chip: Object.freeze({
      chipClass: "treasure-accessory-chip--fire",
      iconClass: "ri-fire-fill",
    }),
    perLetterOnTile: Object.freeze({ kind: "mult_add", value: 10 }),
    postLetterOnTreasure: Object.freeze({ kind: "mult_add", value: 10 }),
    roll: Object.freeze({ deckTileEditionWeight: 0.028, treasureShopWeight: 30, shopPriceAdd: 1 }),
  }),
  [ACCESSORY_DROP]: Object.freeze({
    id: ACCESSORY_DROP,
    scopes: Object.freeze(["tile", "treasure"]),
    legacyStorage: "treasure_field",
    chip: Object.freeze({
      chipClass: "treasure-accessory-chip--drop",
      iconClass: "ri-drop-fill",
    }),
    perLetterOnTile: Object.freeze({ kind: "score_add", value: 50 }),
    postLetterOnTreasure: Object.freeze({ kind: "score_add", value: 50 }),
    roll: Object.freeze({ deckTileEditionWeight: 0.04, treasureShopWeight: 30, shopPriceAdd: 1 }),
  }),
  [ACCESSORY_WRENCH]: Object.freeze({
    id: ACCESSORY_WRENCH,
    scopes: Object.freeze(["tile", "treasure"]),
    legacyStorage: "treasure_field",
    chip: Object.freeze({
      chipClass: "treasure-accessory-chip--wrench",
      iconClass: "ri-wrench-fill",
    }),
    perLetterOnTile: Object.freeze({ kind: "mult_mul", value: 1.5 }),
    postLetterOnTreasure: Object.freeze({ kind: "mult_mul", value: 1.5 }),
    roll: Object.freeze({ deckTileEditionWeight: 0.012, treasureShopWeight: 25, shopPriceAdd: 2 }),
  }),
  [ACCESSORY_CROP]: Object.freeze({
    id: ACCESSORY_CROP,
    scopes: Object.freeze(["treasure"]),
    legacyStorage: "treasure_field",
    chip: Object.freeze({
      chipClass: "treasure-accessory-chip--crop",
      iconClass: "ri-crop-2-fill",
    }),
    meta: Object.freeze({ slotCapacityAdd: 1 }),
    roll: Object.freeze({ treasureShopWeight: 15, shopPriceAdd: 3 }),
  }),
  [ACCESSORY_NO_SELL]: Object.freeze({
    id: ACCESSORY_NO_SELL,
    scopes: Object.freeze(["treasure"]),
    legacyStorage: "treasure_field",
    chip: Object.freeze({
      chipClass: "treasure-accessory-chip--no-sell",
      iconClass: "ri-creative-commons-nc-fill",
    }),
    meta: Object.freeze({ noSell: true }),
  }),
  [ACCESSORY_HOURGLASS]: Object.freeze({
    id: ACCESSORY_HOURGLASS,
    scopes: Object.freeze(["treasure"]),
    legacyStorage: "treasure_field",
    chip: Object.freeze({
      chipClass: "treasure-accessory-chip--hourglass",
      iconClass: "ri-hourglass-fill",
    }),
    meta: Object.freeze({ hourglass: true }),
  }),
  [ACCESSORY_RENTAL]: Object.freeze({
    id: ACCESSORY_RENTAL,
    scopes: Object.freeze(["treasure"]),
    legacyStorage: "treasure_field",
    chip: Object.freeze({
      chipClass: "treasure-accessory-chip--rental",
      iconClass: "ri-contract-fill",
    }),
    meta: Object.freeze({ rental: true }),
  }),
});

/** @type {readonly string[]} */
export const ALL_ACCESSORY_IDS = Object.freeze(Object.keys(ACCESSORY_CATALOG));

/** 商店货架宝藏带配饰基准概率 */
export const SHOP_TREASURE_ACCESSORY_CHANCE = 0.15;

/** Balatro Seal（棋盘配饰） */
export const DECK_TILE_BOARD_ACCESSORY_CHANCE = 0.2;
