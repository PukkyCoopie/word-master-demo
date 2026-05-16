/**
 * 商店单卡区库存（对齐 [Balatro Shop](https://balatrowiki.org/w/Shop) 随机卡栏）。
 *
 * 每格按权重抽取：宝藏（小丑）/ 法术（塔罗）/ 升级（行星）；魔法棒券追加字母块（Playing Card）。
 * 信封/土星券提高法术/升级权重；纸箱券增加槽位数（见 `shopRandomCardEconomy.js`）。
 * 商店「刷新」仅重掷本区；牌包区与优惠券进店生成后不变。
 */
import { SPELL_DEFINITIONS } from "../spells/spellDefinitions.js";
import { RARITY_BY_LETTER } from "../composables/useScoring.js";
import { pickWeightedTreasureFromPool } from "../treasures/shopTreasureRoll.js";
import {
  SHOP_RANDOM_CARD_PLAYING_CARD_WEIGHT,
  SHOP_RANDOM_CARD_TYPE_WEIGHTS,
  getShopRandomCardSlotCount,
} from "./shopRandomCardEconomy.js";
import {
  buildDeckLetterShopRow,
  buildDeckTileShopRow,
  buildLengthUpgradeShopRow,
  buildRarityUpgradeShopRow,
  buildSpellShopRow,
  buildTreasureShopRowFromDef,
  filterSpellDefsForShop,
  letterRarityOrderKeys,
  UPGRADE_LENGTH_GROUPS,
} from "./shopOfferRowBuilders.js";
import {
  getShopRandomCardSlotBonus,
  getSpellCategoryWeightMultiplier,
  getUpgradeCategoryWeightMultiplier,
  hasIllusion,
  hasMagicTrick,
} from "../vouchers/voucherRuntime.js";

export { SHOP_RANDOM_CARD_SLOT_COUNT, getShopRandomCardSlotCount } from "./shopRandomCardEconomy.js";

function allLetterRaws() {
  /** @type {string[]} */
  const out = [];
  for (const letters of Object.values(RARITY_BY_LETTER)) {
    for (const x of letters) out.push(x);
  }
  return out;
}

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
 *   sessionExcludeTreasureIds?: Set<string>,
 *   lastReplayableSpellId: string | null,
 *   shopTreasurePool: import("../treasures/treasureTypes.js").TreasureDef[],
 *   ownedVoucherIds?: Iterable<string>,
 *   honeAccessoryMult?: number,
 * }} ctx
 */
export function rollShopRandomCardOffers(ctx) {
  const rng = typeof ctx.rng === "function" ? ctx.rng : Math.random;
  const owned = ctx.ownedTreasureIdSet;
  const sessionExcluded = ctx.sessionExcludeTreasureIds ?? null;
  const pool = Array.isArray(ctx.shopTreasurePool) ? ctx.shopTreasurePool : [];
  const lastReplay = ctx.lastReplayableSpellId ? String(ctx.lastReplayableSpellId) : null;
  const ownedV = ctx.ownedVoucherIds != null ? new Set([...ctx.ownedVoucherIds]) : new Set();
  const spellWt = getSpellCategoryWeightMultiplier(ownedV);
  const upgradeWt = getUpgradeCategoryWeightMultiplier(ownedV);
  const honeMult = Math.max(0, Number(ctx.honeAccessoryMult) || 1);
  const magicOwned = hasMagicTrick(ownedV);
  const illusionOwned = hasIllusion(ownedV);
  const letterRaws = allLetterRaws();
  const slotCount = getShopRandomCardSlotCount(getShopRandomCardSlotBonus(ownedV));

  const spellDefsAll = filterSpellDefsForShop(lastReplay, SPELL_DEFINITIONS);
  const rarityKeys = letterRarityOrderKeys();

  const makeEmpty = () => ({ kind: "empty", emptySlotId: ctx.nextShopEmptySlotId() });

  function availableTreasurePool() {
    return pool.filter(
      (t) => t && !owned.has(t.treasureId) && !sessionExcluded?.has(t.treasureId),
    );
  }

  function tryTreasure() {
    const avail = availableTreasurePool();
    if (avail.length === 0) return null;
    const def = pickWeightedTreasureFromPool(avail, rng);
    if (!def) return null;
    sessionExcluded?.add(def.treasureId);
    return buildTreasureShopRowFromDef(ctx.nextOfferInstanceId, def, rng, honeMult);
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

  function tryDeckLetter() {
    if (!letterRaws.length) return null;
    const raw = letterRaws[Math.floor(rng() * letterRaws.length)] || "e";
    return buildDeckLetterShopRow(ctx.nextOfferInstanceId, raw);
  }

  function tryDeckTile() {
    if (!letterRaws.length) return null;
    const raw = letterRaws[Math.floor(rng() * letterRaws.length)] || "e";
    return buildDeckTileShopRow(ctx.nextOfferInstanceId, raw, rng, honeMult);
  }

  /** 魔法棒：幻术 II 前为纯字母，II 后可为带材质/配饰的字母块 */
  function tryPlayingCard() {
    if (illusionOwned) return tryDeckTile() ?? tryDeckLetter();
    return tryDeckLetter();
  }

  function rollOneSlot() {
    const keys = /** @type {string[]} */ (["treasure", "spell", "upgrade"]);
    const weights = [
      availableTreasurePool().length ? SHOP_RANDOM_CARD_TYPE_WEIGHTS.treasure : 0,
      spellDefsAll.length ? SHOP_RANDOM_CARD_TYPE_WEIGHTS.spell * spellWt : 0,
      UPGRADE_LENGTH_GROUPS.length || rarityKeys.length ? SHOP_RANDOM_CARD_TYPE_WEIGHTS.upgrade * upgradeWt : 0,
    ];
    if (magicOwned) {
      keys.push("playingCard");
      weights.push(letterRaws.length ? SHOP_RANDOM_CARD_PLAYING_CARD_WEIGHT : 0);
    }

    let cat = pickWeightedCategory(keys, weights, rng);
    if (!cat) return makeEmpty();

    /** @type {null | object} */
    let row = null;
    if (cat === "treasure") row = tryTreasure();
    else if (cat === "spell") row = trySpell();
    else if (cat === "upgrade") row = tryUpgrade();
    else row = tryPlayingCard();

    if (row) return row;

    const fallbacks = [
      tryTreasure,
      trySpell,
      tryUpgrade,
      ...(magicOwned ? [tryPlayingCard] : []),
    ];
    for (const fn of fallbacks) {
      row = fn();
      if (row) return row;
    }
    return makeEmpty();
  }

  /** @type {object[]} */
  const rows = [];
  for (let i = 0; i < slotCount; i += 1) {
    rows.push(rollOneSlot());
  }
  return rows;
}
