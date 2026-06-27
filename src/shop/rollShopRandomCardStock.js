/**
 * 商店单卡区库存（对齐 [Balatro Shop](https://balatrowiki.org/w/Shop) 随机卡栏）。
 *
 * 每格按权重抽取：宝藏（小丑）/ 法术（塔罗）/ 升级（行星）；打字机券追加字母块 tile（Playing Card）。
 * 同次掷货（进店、刷新、纸箱加栏）内：宝藏 id、法术 id、升级键互不重复（与牌包区宝藏共用 `sessionExcludeTreasureIds` 集）。
 * 魔法棒/土星券提高法术/升级权重；纸箱券增加槽位数（见 `shopRandomCardEconomy.js`）。
 * 商店「刷新」仅重掷本区；牌包区与优惠券进店生成后不变。
 */
import { SPELL_DEFINITIONS } from "../spells/spellDefinitions.js";
import { pickWeightedTreasureFromPool } from "../treasures/shopTreasureRoll.js";
import {
  PREREQUISITE_PHASE1_SLOT_PRIORITY_CHANCE,
  buildPrerequisiteWeightMultiplierGetter,
  filterPhase1PrerequisiteTreasures,
} from "../treasures/prerequisiteShopBoost.js";
import {
  SHOP_RANDOM_CARD_PLAYING_CARD_WEIGHT,
  SHOP_RANDOM_CARD_TYPE_WEIGHTS,
  getShopRandomCardSlotCount,
} from "./shopRandomCardEconomy.js";
import {
  buildDeckTileShopRow,
  buildLengthUpgradeShopRow,
  buildRarityUpgradeShopRow,
  buildSpellShopRow,
  buildTreasureShopRowFromDef,
  filterSpellDefsForShop,
  letterRarityOrderKeys,
  UPGRADE_LENGTH_GROUPS,
} from "./shopOfferRowBuilders.js";
import { getShopTilePackMaterialIds } from "./shopPackEconomy.js";
import {
  getShopRandomCardSlotBonus,
  getSpellCategoryWeightMultiplier,
  getUpgradeCategoryWeightMultiplier,
  hasIllusion,
  hasMagicTrick,
} from "../vouchers/voucherRuntime.js";
import { normalizeRunDifficultyIndex } from "../game/runDifficultyDefinitions.js";
import { allLetterRaws } from "../game/initialDeckLetterCounts.js";
import { pickDifficulty0FirstShopTreasureId } from "../game/runDifficultyRuntime.js";
import { pickWeightedLetterRaw } from "./tilePackLetterRoll.js";

export { SHOP_RANDOM_CARD_SLOT_COUNT, getShopRandomCardSlotCount } from "./shopRandomCardEconomy.js";

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
 *   sessionExcludeTreasureIds?: Set<string>, // 宝藏 id；另含 spell_*、upgrade_* 单卡区互斥键
 *   lastReplayableSpellId: string | null,
 *   spellCastHistory?: string[],
 *   shopTreasurePool: import("../treasures/treasureTypes.js").TreasureDef[],
 *   ownedVoucherIds?: Iterable<string>,
 *   honeAccessoryMult?: number,
 *   runDifficultyIndex?: number | null,
 *   prerequisiteTreasureRollContext?: {
 *     snap: import("../treasures/treasureAvailability.js").TreasurePoolSnapshot,
 *     shopAppearedPrerequisiteTreasureIds: Iterable<string>,
 *     shopPrerequisiteTreasureSingleCardAppearanceCounts: Record<string, number>,
 *   },
 *   onPrerequisiteTreasureShopAppeared?: (treasureId: string) => void,
 *   guaranteeFirstShopTreasureSlot?: boolean,
 * }} ctx
 */
/**
 * @param {Parameters<typeof rollShopRandomCardOffers>[0]} ctx
 */
function createShopRandomCardRoller(ctx) {
  const rng = typeof ctx.rng === "function" ? ctx.rng : Math.random;
  const owned = ctx.ownedTreasureIdSet;
  const sessionExcluded = ctx.sessionExcludeTreasureIds ?? null;
  const pool = Array.isArray(ctx.shopTreasurePool) ? ctx.shopTreasurePool : [];
  const lastReplay = ctx.lastReplayableSpellId ? String(ctx.lastReplayableSpellId) : null;
  const spellCastHistory = Array.isArray(ctx.spellCastHistory) ? ctx.spellCastHistory : [];
  const ownedV = ctx.ownedVoucherIds != null ? new Set([...ctx.ownedVoucherIds]) : new Set();
  const spellWt = getSpellCategoryWeightMultiplier(ownedV);
  const upgradeWt = getUpgradeCategoryWeightMultiplier(ownedV);
  const honeMult = Math.max(0, Number(ctx.honeAccessoryMult) || 1);
  const magicOwned = hasMagicTrick(ownedV);
  const illusionOwned = hasIllusion(ownedV);
  const letterRaws = allLetterRaws();
  const prerequisiteRollContext = ctx.prerequisiteTreasureRollContext ?? null;

  const spellDefsAll = filterSpellDefsForShop(
    lastReplay,
    SPELL_DEFINITIONS,
    spellCastHistory,
    ctx.excludeSpellIds,
    ctx.spellPoolEligibilityCounts ?? null,
  );
  const rarityKeys = letterRarityOrderKeys();

  const makeEmpty = () => ({ kind: "empty", emptySlotId: ctx.nextShopEmptySlotId() });

  function spellShelfKey(spellId) {
    return `spell_${spellId}`;
  }

  function lengthUpgradeShelfKey(groupKey) {
    return `upgrade_${groupKey}`;
  }

  function rarityUpgradeShelfKey(rarityKey) {
    return `upgrade_rarity_${rarityKey}`;
  }

  function availableTreasurePool() {
    const allowOwned = ctx.allowOwnedTreasuresInShop === true;
    return pool.filter(
      (t) =>
        t &&
        (allowOwned || !owned.has(t.treasureId)) &&
        !sessionExcluded?.has(t.treasureId),
    );
  }

  function availableSpellDefs() {
    return spellDefsAll.filter((d) => !sessionExcluded?.has(spellShelfKey(d.id)));
  }

  function availableLengthUpgradeGroups() {
    return UPGRADE_LENGTH_GROUPS.filter((g) => !sessionExcluded?.has(lengthUpgradeShelfKey(g.key)));
  }

  function availableRarityUpgradeKeys() {
    return rarityKeys.filter((rk) => !sessionExcluded?.has(rarityUpgradeShelfKey(rk)));
  }

  function tryTreasure() {
    const avail = availableTreasurePool();
    if (avail.length === 0) return null;

    let pickPool = avail;
    if (prerequisiteRollContext) {
      const phase1 = filterPhase1PrerequisiteTreasures(
        avail,
        prerequisiteRollContext.snap,
        owned,
        prerequisiteRollContext.shopAppearedPrerequisiteTreasureIds,
      );
      if (phase1.length > 0 && rng() < PREREQUISITE_PHASE1_SLOT_PRIORITY_CHANCE) {
        pickPool = phase1;
      }
    }

    /** @type {import('../treasures/shopTreasureRoll.js').ShopTreasurePickOpts} */
    const treasurePickOpts = {
      onPrerequisiteTreasureShopAppeared: ctx.onPrerequisiteTreasureShopAppeared,
      allowOwnedTreasuresInShop: ctx.allowOwnedTreasuresInShop === true,
    };
    if (prerequisiteRollContext && pickPool === avail) {
      treasurePickOpts.getPrerequisiteWeightMultiplier = buildPrerequisiteWeightMultiplierGetter(
        prerequisiteRollContext.shopAppearedPrerequisiteTreasureIds,
        prerequisiteRollContext.shopPrerequisiteTreasureSingleCardAppearanceCounts,
      );
    }

    const def = pickWeightedTreasureFromPool(pickPool, rng, treasurePickOpts);
    if (!def) return null;
    sessionExcluded?.add(def.treasureId);
    return buildTreasureShopRowFromDef(ctx.nextOfferInstanceId, def, rng, honeMult, ctx.runDifficultyIndex ?? null);
  }

  /**
   * @param {string} treasureId
   * @param {{ includeAccessories?: boolean }} [opts]
   */
  function tryTreasureById(treasureId, opts = {}) {
    const tid = String(treasureId ?? "").trim();
    const allowOwned = ctx.allowOwnedTreasuresInShop === true;
    if (!tid || (!allowOwned && owned.has(tid)) || sessionExcluded?.has(tid)) return null;
    const def = pool.find((t) => String(t?.treasureId) === tid);
    if (!def) return null;
    sessionExcluded?.add(tid);
    const includeAccessories = opts.includeAccessories !== false;
    return buildTreasureShopRowFromDef(
      ctx.nextOfferInstanceId,
      def,
      rng,
      honeMult,
      includeAccessories ? (ctx.runDifficultyIndex ?? null) : null,
      includeAccessories,
    );
  }

  function trySpell() {
    const avail = availableSpellDefs();
    if (!avail.length) return null;
    const def = avail[Math.floor(rng() * avail.length)];
    if (!def) return null;
    sessionExcluded?.add(spellShelfKey(def.id));
    return buildSpellShopRow(ctx.nextOfferInstanceId, def);
  }

  function tryUpgrade() {
    const lenAvail = availableLengthUpgradeGroups();
    const rarAvail = availableRarityUpgradeKeys();
    if (!lenAvail.length && !rarAvail.length) return null;

    const preferLength = rng() < 0.5;
    const tryLengthFirst =
      preferLength && lenAvail.length > 0
        ? true
        : !rarAvail.length && lenAvail.length > 0;

    if (tryLengthFirst) {
      const g = lenAvail[Math.floor(rng() * lenAvail.length)];
      sessionExcluded?.add(lengthUpgradeShelfKey(g.key));
      return buildLengthUpgradeShopRow(ctx.nextOfferInstanceId, g);
    }
    if (rarAvail.length) {
      const rk = rarAvail[Math.floor(rng() * rarAvail.length)];
      sessionExcluded?.add(rarityUpgradeShelfKey(rk));
      return buildRarityUpgradeShopRow(ctx.nextOfferInstanceId, rk);
    }
    const g = lenAvail[Math.floor(rng() * lenAvail.length)];
    sessionExcluded?.add(lengthUpgradeShelfKey(g.key));
    return buildLengthUpgradeShopRow(ctx.nextOfferInstanceId, g);
  }

  const tileMaterialIds = getShopTilePackMaterialIds();

  /** 打字机券：单卡区 tile；二级前无材质/配饰掷骰，二级后可带增益 */
  function tryPlayingCard() {
    if (!letterRaws.length) return null;
    const raw = pickWeightedLetterRaw(rng, letterRaws);
    return buildDeckTileShopRow(ctx.nextOfferInstanceId, raw, rng, {
      honeAccessoryMult: honeMult,
      materialIds: tileMaterialIds,
      allowModifiers: illusionOwned,
    });
  }

  function rollOneSlot() {
    const keys = /** @type {string[]} */ (["treasure", "spell", "upgrade"]);
    const weights = [
      availableTreasurePool().length ? SHOP_RANDOM_CARD_TYPE_WEIGHTS.treasure : 0,
      availableSpellDefs().length ? SHOP_RANDOM_CARD_TYPE_WEIGHTS.spell * spellWt : 0,
      availableLengthUpgradeGroups().length || availableRarityUpgradeKeys().length
        ? SHOP_RANDOM_CARD_TYPE_WEIGHTS.upgrade * upgradeWt
        : 0,
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

  return { rollOneSlot, tryTreasure, tryTreasureById };
}

export function rollShopRandomCardOffers(ctx) {
  const ownedV = ctx.ownedVoucherIds != null ? new Set([...ctx.ownedVoucherIds]) : new Set();
  const slotCount = getShopRandomCardSlotCount(getShopRandomCardSlotBonus(ownedV));
  const { rollOneSlot, tryTreasure, tryTreasureById } = createShopRandomCardRoller(ctx);
  const guaranteeTreasure = ctx.guaranteeFirstShopTreasureSlot === true;
  const difficulty0FirstShop =
    guaranteeTreasure && normalizeRunDifficultyIndex(ctx.runDifficultyIndex) === 0;
  /** @type {object[]} */
  const rows = [];
  for (let i = 0; i < slotCount; i += 1) {
    if (guaranteeTreasure && i === 0) {
      let treasureRow = null;
      if (difficulty0FirstShop) {
        const forcedId = pickDifficulty0FirstShopTreasureId(
          typeof ctx.rng === "function" ? ctx.rng : Math.random,
          ctx.ownedTreasureIdSet,
          ctx.shopTreasurePool,
          ctx.sessionExcludeTreasureIds,
        );
        if (forcedId) treasureRow = tryTreasureById(forcedId, { includeAccessories: false });
      }
      if (!treasureRow) treasureRow = tryTreasure();
      if (treasureRow) {
        rows.push(treasureRow);
        continue;
      }
    }
    rows.push(rollOneSlot());
  }
  return rows;
}

/**
 * 纸箱券等同次进店即时加栏：在现有单卡区末尾追加若干新格并各掷一件商品。
 * @param {number} extraCount
 * @param {Parameters<typeof rollShopRandomCardOffers>[0]} ctx
 */
export function rollExtraShopRandomCardOffers(extraCount, ctx) {
  const n = Math.max(0, Math.floor(Number(extraCount) || 0));
  if (n <= 0) return [];
  const { rollOneSlot } = createShopRandomCardRoller(ctx);
  /** @type {object[]} */
  const rows = [];
  for (let i = 0; i < n; i += 1) {
    rows.push(rollOneSlot());
  }
  return rows;
}
