/**
 * 对齐 Balatro「商店随机卡」栏：固定 2 格；每格类型权重 小丑 20 / 塔罗 4 / 行星 4
 *（本项目映射为：宝藏 / 法术单卡 / 升级卡）。
 *
 * 宝藏稀有度在 `pickWeightedTreasureFromPool` 使用 Balatro 小丑档 70% / 25% / 5%。
 */
import { SPELL_DEFINITIONS } from "../spells/spellDefinitions.js";
import { pickWeightedTreasureFromPool } from "../treasures/shopTreasureRoll.js";
import {
  buildLengthUpgradeShopRow,
  buildRarityUpgradeShopRow,
  buildSpellShopRow,
  buildTreasureShopRowFromDef,
  filterSpellDefsForShop,
  letterRarityOrderKeys,
  UPGRADE_LENGTH_GROUPS,
} from "./shopOfferRowBuilders.js";
import {
  getSpellCategoryWeightMultiplier,
  getUpgradeCategoryWeightMultiplier,
} from "../vouchers/voucherRuntime.js";

/** 与 Balatro 商店「2 张随机卡」槽位数一致 */
export const SHOP_RANDOM_CARD_SLOT_COUNT = 2;

/** Balatro 默认：Joker 20、Tarot 4、Planet 4 → 映射 treasure / spell / upgrade */
export const SHOP_RANDOM_CARD_TYPE_WEIGHTS = Object.freeze({
  treasure: 20,
  spell: 4,
  upgrade: 4,
});

/**
 * @param {string[]} keys
 * @param {number[]} weights
 * @param {() => number} rng
 * @returns {string | null}
 */
function pickWeightedCategory(keys, weights, rng) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return null;
  let u = rng() * sum;
  for (let i = 0; i < keys.length; i += 1) {
    u -= weights[i];
    if (u < 0) return keys[i];
  }
  return keys[keys.length - 1] ?? null;
}

/**
 * @param {{
 *   rng?: () => number,
 *   nextOfferInstanceId: () => number,
 *   nextShopEmptySlotId: () => number,
 *   ownedTreasureIdSet: Set<string>,
 *   lastReplayableSpellId: string | null,
 *   shopTreasurePool: import("../treasures/treasureTypes.js").TreasureDef[],
 *   ownedVoucherIds?: Iterable<string>,
 *   honeAccessoryMult?: number,
 * }} ctx
 */
export function rollShopRandomCardOffers(ctx) {
  const rng = typeof ctx.rng === "function" ? ctx.rng : Math.random;
  const owned = ctx.ownedTreasureIdSet;
  const pool = Array.isArray(ctx.shopTreasurePool) ? ctx.shopTreasurePool : [];
  const lastReplay = ctx.lastReplayableSpellId ? String(ctx.lastReplayableSpellId) : null;
  const ownedV = ctx.ownedVoucherIds != null ? new Set([...ctx.ownedVoucherIds]) : new Set();
  const spellWt = getSpellCategoryWeightMultiplier(ownedV);
  const upgradeWt = getUpgradeCategoryWeightMultiplier(ownedV);
  const honeMult = Math.max(0, Number(ctx.honeAccessoryMult) || 1);

  const spellDefsAll = filterSpellDefsForShop(lastReplay, SPELL_DEFINITIONS);
  const rarityKeys = letterRarityOrderKeys();

  const makeEmpty = () => ({ kind: "empty", emptySlotId: ctx.nextShopEmptySlotId() });

  const unownedTreasurePool = pool.filter((t) => t && !owned.has(t.treasureId));

  function tryTreasure() {
    if (unownedTreasurePool.length === 0) return null;
    const def = pickWeightedTreasureFromPool(unownedTreasurePool, rng);
    return def ? buildTreasureShopRowFromDef(ctx.nextOfferInstanceId, def, rng, honeMult) : null;
  }

  function trySpell() {
    if (!spellDefsAll.length) return null;
    const def = spellDefsAll[Math.floor(rng() * spellDefsAll.length)];
    return def ? buildSpellShopRow(ctx.nextOfferInstanceId, def) : null;
  }

  function tryUpgrade() {
    if (rng() < 0.5 && UPGRADE_LENGTH_GROUPS.length) {
      const g = UPGRADE_LENGTH_GROUPS[Math.floor(rng() * UPGRADE_LENGTH_GROUPS.length)];
      return buildLengthUpgradeShopRow(ctx.nextOfferInstanceId, g);
    }
    if (rarityKeys.length) {
      const rk = rarityKeys[Math.floor(rng() * rarityKeys.length)];
      return buildRarityUpgradeShopRow(ctx.nextOfferInstanceId, rk);
    }
    if (UPGRADE_LENGTH_GROUPS.length) {
      const g = UPGRADE_LENGTH_GROUPS[Math.floor(rng() * UPGRADE_LENGTH_GROUPS.length)];
      return buildLengthUpgradeShopRow(ctx.nextOfferInstanceId, g);
    }
    return null;
  }

  function rollOneSlot() {
    const keys = /** @type {const} */ (["treasure", "spell", "upgrade"]);
    const weights = [
      unownedTreasurePool.length ? SHOP_RANDOM_CARD_TYPE_WEIGHTS.treasure : 0,
      spellDefsAll.length ? SHOP_RANDOM_CARD_TYPE_WEIGHTS.spell * spellWt : 0,
      UPGRADE_LENGTH_GROUPS.length || rarityKeys.length ? SHOP_RANDOM_CARD_TYPE_WEIGHTS.upgrade * upgradeWt : 0,
    ];
    let cat = pickWeightedCategory([...keys], weights, rng);
    if (!cat) return makeEmpty();

    /** @type {null | object} */
    let row = null;
    if (cat === "treasure") row = tryTreasure();
    else if (cat === "spell") row = trySpell();
    else row = tryUpgrade();

    if (row) return row;

    const fallbacks =
      cat === "treasure"
        ? [trySpell, tryUpgrade]
        : cat === "spell"
          ? [tryTreasure, tryUpgrade]
          : [tryTreasure, trySpell];
    for (const fn of fallbacks) {
      row = fn();
      if (row) return row;
    }
    return makeEmpty();
  }

  /** @type {object[]} */
  const rows = [];
  for (let i = 0; i < SHOP_RANDOM_CARD_SLOT_COUNT; i += 1) {
    rows.push(rollOneSlot());
  }
  return rows;
}
