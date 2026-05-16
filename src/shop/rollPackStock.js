/**
 * 商店牌包区每刷新库存：单张散卡 + 各类组合包（含 `bundleOptions` 供选包 UI）。
 */
import { SPELL_DEFINITIONS } from "../spells/spellDefinitions.js";
import { rollDistinctShopTreasures } from "../treasures/shopTreasureRoll.js";
import { RARITY_BY_LETTER, LETTER_RARITY_ORDER, getRarityForLetter } from "../composables/useScoring.js";
import { getTileMaterialBlockTitle } from "../game/gameConceptCopy.js";
import {
  getPackOfferSlotCount,
  PACK_OFFER_CATEGORY_WEIGHTS,
  PACK_OFFER_SINGLE_VS_BUNDLE_WEIGHTS,
  SHOP_BUNDLE_PACK_PRICES,
  SHOP_TILE_PACK_MATERIAL_IDS,
} from "./shopPackEconomy.js";
import {
  buildLengthUpgradeShopRow,
  buildRarityUpgradeShopRow,
  buildSpellShopRow,
  buildTreasureShopRowFromDef,
  buildDeckLetterShopRow,
  buildDeckTileShopRow,
  filterSpellDefsForShop,
  UPGRADE_LENGTH_GROUPS,
  UPGRADE_RARITY_LETTER_LABEL,
} from "./shopOfferRowBuilders.js";
import { rollShopDeckTileAccessoryId } from "./shopTileAccessoryRoll.js";
import {
  getPackOfferSlotBonus,
  getSpellCategoryWeightMultiplier,
  getUpgradeCategoryWeightMultiplier,
  getMostPlayedWordLength,
  hasTelescopeVoucher,
  hasMagicTrick,
  hasIllusion,
} from "../vouchers/voucherRuntime.js";

function shuffleArrayInPlace(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

function allLetterRaws() {
  /** @type {string[]} */
  const out = [];
  for (const letters of Object.values(RARITY_BY_LETTER)) {
    for (const x of letters) out.push(x);
  }
  return out;
}

/**
 * @param {() => number} rng
 * @param {string[]} pool
 * @param {number} n
 */
function pickDistinctFromPool(rng, pool, n) {
  const copy = [...pool];
  shuffleArrayInPlace(copy, rng);
  return copy.slice(0, Math.min(n, copy.length));
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
 * @param {object[]} opts
 * @param {number} mostLen
 * @param {(g: (typeof UPGRADE_LENGTH_GROUPS)[number]) => object} makeLengthUpgrade
 * @param {() => number} rng
 */
function ensureTelescopeLengthUpgradeInBundleOpts(opts, mostLen, makeLengthUpgrade, rng) {
  if (!mostLen || mostLen < 3) return;
  const g = UPGRADE_LENGTH_GROUPS.find((x) => mostLen >= x.minLen && mostLen <= x.maxLen);
  if (!g) return;
  const has = opts.some(
    (o) => o && o.offerType === "upgrade" && o.upgradeKind === "length" && o.lengthGroupKey === g.key,
  );
  if (has) return;
  if (!opts.length) return;
  const j = Math.floor(rng() * opts.length);
  opts[j] = makeLengthUpgrade(g);
}

/**
 * @param {{
 *   rng?: () => number,
 *   nextPackOfferInstanceId: () => number,
 *   nextPackEmptySlotId: () => number,
 *   ownedTreasureIdSet: Set<string>,
 *   emptyTreasureSlots: number,
 *   lastReplayableSpellId: string | null,
 *   shopTreasurePool: import("../treasures/treasureTypes.js").TreasureDef[],
 *   guaranteeBalatroFirstShopBuffoonSlot?: boolean,
 *   ownedVoucherIds?: Iterable<string>,
 *   spellCountsByLength?: Record<string, number> | null,
 *   honeAccessoryMult?: number,
 * }} ctx
 */
export function rollPackOfferStock(ctx) {
  const rng = typeof ctx.rng === "function" ? ctx.rng : Math.random;
  const owned = ctx.ownedTreasureIdSet;
  const emptySlots = Math.max(0, Math.floor(Number(ctx.emptyTreasureSlots) || 0));
  const lastReplay = ctx.lastReplayableSpellId ? String(ctx.lastReplayableSpellId) : null;
  const pool = Array.isArray(ctx.shopTreasurePool) ? ctx.shopTreasurePool : [];

  const ownedV = ctx.ownedVoucherIds != null ? new Set([...ctx.ownedVoucherIds]) : new Set();
  const spellWt = getSpellCategoryWeightMultiplier(ownedV);
  const upgradeWt = getUpgradeCategoryWeightMultiplier(ownedV);
  const honeMult = Math.max(0, Number(ctx.honeAccessoryMult) || 1);
  const magicOwned = hasMagicTrick(ownedV);
  const illusionOwned = hasIllusion(ownedV);
  const packSlotBonus = getPackOfferSlotBonus(ownedV);
  const slotCount = getPackOfferSlotCount(packSlotBonus);
  const telescopeMost = hasTelescopeVoucher(ownedV)
    ? getMostPlayedWordLength(ctx.spellCountsByLength ?? null)
    : 0;

  const spellDefsAll = filterSpellDefsForShop(lastReplay, SPELL_DEFINITIONS);
  const nextPackId = () => ctx.nextPackOfferInstanceId();

  const makeEmpty = () => ({ kind: "empty", emptySlotId: ctx.nextPackEmptySlotId() });

  const makeSingleSpell = (def) => buildSpellShopRow(nextPackId, def);

  const makeLengthUpgrade = (g) => buildLengthUpgradeShopRow(nextPackId, g);

  const makeRarityUpgrade = (rk) => buildRarityUpgradeShopRow(nextPackId, rk);

  const toTreasureOfferRow = (def) => buildTreasureShopRowFromDef(nextPackId, def, rng, honeMult);

  const availableTreasureCount = pool.filter((t) => t && !owned.has(t.treasureId)).length;

  /** @type {Record<string, number>} */
  const effW = { ...PACK_OFFER_CATEGORY_WEIGHTS };
  for (const k of /** @type {const} */ (["singleSpell", "bundleSpellSmall", "bundleSpellLarge"])) {
    effW[k] = Math.max(0, (effW[k] || 0) * spellWt);
  }
  for (const k of /** @type {const} */ ([
    "singleLengthUpgrade",
    "singleRarityUpgrade",
    "bundleUpgradeSmall",
    "bundleUpgradeLarge",
  ])) {
    effW[k] = Math.max(0, (effW[k] || 0) * upgradeWt);
  }

  const spellIdsForPool = spellDefsAll.map((d) => d.id);
  const spellPoolSmallOk = spellIdsForPool.length >= 3;
  const spellPoolLargeOk = spellIdsForPool.length >= 5;

  const lengthKeys = UPGRADE_LENGTH_GROUPS.map((g) => g.key);
  const rarityKeys = [...LETTER_RARITY_ORDER];
  const upgradeKeyPool = [...lengthKeys, ...rarityKeys.map((k) => `r:${k}`)];
  const upgradePoolSmallOk = upgradeKeyPool.length >= 3;
  const upgradePoolLargeOk = upgradeKeyPool.length >= 5;

  const letterRaws = allLetterRaws();
  const materialIds = [...SHOP_TILE_PACK_MATERIAL_IDS];

  const treasureSmallOk = emptySlots >= 1 && availableTreasureCount >= 2;
  const treasureLargeOk = emptySlots >= 2 && availableTreasureCount >= 4;

  if (!spellPoolSmallOk) effW.bundleSpellSmall = 0;
  if (!spellPoolLargeOk) effW.bundleSpellLarge = 0;
  if (!upgradePoolSmallOk) effW.bundleUpgradeSmall = 0;
  if (!upgradePoolLargeOk) effW.bundleUpgradeLarge = 0;
  if (!treasureSmallOk) effW.bundleTreasureSmall = 0;
  if (!treasureLargeOk) effW.bundleTreasureLarge = 0;
  if (letterRaws.length < 3) effW.bundleLetterSmall = 0;
  if (letterRaws.length < 5) effW.bundleLetterLarge = 0;
  if (letterRaws.length < 3 || materialIds.length < 1) effW.bundleTileSmall = 0;
  if (letterRaws.length < 5 || materialIds.length < 1) effW.bundleTileLarge = 0;

  if (!spellIdsForPool.length) effW.singleSpell = 0;

  /** @returns {object} */
  function rollOneSlotRow() {
    const SB = PACK_OFFER_SINGLE_VS_BUNDLE_WEIGHTS;
    const wSingleBranch = Math.max(0, Number(SB.single) || 0);
    const wBundleBranch = Math.max(0, Number(SB.bundle) || 0);

    /** @type {string[]} */
    const singleKeys = ["singleSpell", "singleLengthUpgrade", "singleRarityUpgrade"];
    const singleWeights = [
      effW.singleSpell > 0 && spellIdsForPool.length ? effW.singleSpell : 0,
      effW.singleLengthUpgrade > 0 && lengthKeys.length ? effW.singleLengthUpgrade : 0,
      effW.singleRarityUpgrade > 0 && rarityKeys.length ? effW.singleRarityUpgrade : 0,
    ];
    if (magicOwned) {
      singleKeys.push("singleDeckLetter", "singleDeckTile");
      singleWeights.push(12, 10);
    }

    const sumSingle = singleWeights.reduce((a, b) => a + b, 0);

    const bundleKeys = /** @type {const} */ ([
      "bundleSpellSmall",
      "bundleSpellLarge",
      "bundleUpgradeSmall",
      "bundleUpgradeLarge",
      "bundleTreasureSmall",
      "bundleTreasureLarge",
      "bundleLetterSmall",
      "bundleLetterLarge",
      "bundleTileSmall",
      "bundleTileLarge",
    ]);
    const bundleWeights = bundleKeys.map((k) => (effW[k] > 0 ? effW[k] : 0));
    const sumBundle = bundleWeights.reduce((a, b) => a + b, 0);

    if (sumSingle <= 0 && sumBundle <= 0) return makeEmpty();

    let wantSingle;
    if (sumSingle <= 0) wantSingle = false;
    else if (sumBundle <= 0) wantSingle = true;
    else {
      const ws0 = wSingleBranch + wBundleBranch;
      if (ws0 <= 0) wantSingle = rng() < 0.5;
      else {
        const u0 = rng() * ws0;
        wantSingle = u0 < wSingleBranch;
      }
    }

    /** @type {string | null} */
    let cat = null;
    if (wantSingle) {
      cat = pickWeightedCategory([...singleKeys], singleWeights, rng);
      if (!cat && sumBundle > 0) {
        cat = pickWeightedCategory([...bundleKeys], bundleWeights, rng);
      }
    } else {
      cat = pickWeightedCategory([...bundleKeys], bundleWeights, rng);
      if (!cat && sumSingle > 0) {
        cat = pickWeightedCategory([...singleKeys], singleWeights, rng);
      }
    }

    if (!cat) return makeEmpty();

    if (cat === "singleSpell") {
      const def = spellDefsAll[Math.floor(rng() * spellDefsAll.length)];
      return def ? makeSingleSpell(def) : makeEmpty();
    }
    if (cat === "singleLengthUpgrade") {
      const g = UPGRADE_LENGTH_GROUPS[Math.floor(rng() * UPGRADE_LENGTH_GROUPS.length)];
      return makeLengthUpgrade(g);
    }
    if (cat === "singleRarityUpgrade") {
      const rk = rarityKeys[Math.floor(rng() * rarityKeys.length)];
      return makeRarityUpgrade(rk);
    }
    if (cat === "singleDeckLetter") {
      const raw = letterRaws[Math.floor(rng() * letterRaws.length)] || "e";
      return buildDeckLetterShopRow(nextPackId, raw);
    }
    if (cat === "singleDeckTile") {
      const raw = letterRaws[Math.floor(rng() * letterRaws.length)] || "e";
      return buildDeckTileShopRow(nextPackId, raw, rng, illusionOwned);
    }

    if (cat === "bundleSpellSmall" || cat === "bundleSpellLarge") {
      const large = cat === "bundleSpellLarge";
      const poolSize = large ? 5 : 3;
      const pickCount = large ? 2 : 1;
      const idPicks = pickDistinctFromPool(
        rng,
        spellDefsAll.map((d) => d.id),
        poolSize,
      );
      const picks = idPicks
        .map((id) => spellDefsAll.find((d) => d.id === id))
        .filter(Boolean);
      const pn = picks.length;
      const px = Math.min(pickCount, Math.max(1, pn));
      const price = SHOP_BUNDLE_PACK_PRICES.spell[large ? "large" : "small"];
      const bid = ctx.nextPackOfferInstanceId();
      return {
        kind: "offer",
        offerType: "bundlePack",
        bundleKind: "spell",
        bundleSize: large ? "large" : "small",
        poolSize: picks.length,
        pickCount,
        offerInstanceId: bid,
        treasureId: `bundle_spell_${large ? "L" : "S"}_${bid}`,
        price,
        rarity: "rare",
        name: large ? "法术包（大）" : "法术包（小）",
        emoji: "",
        iconClass: "ri-gift-2-line",
        description: `从${pn}张法术卡中选择${px}张并获取。`,
        bundleOptions: picks.map((def) => makeSingleSpell(def)),
      };
    }

    if (cat === "bundleUpgradeSmall" || cat === "bundleUpgradeLarge") {
      const large = cat === "bundleUpgradeLarge";
      const n = large ? 5 : 3;
      const keysPicked = pickDistinctFromPool(rng, upgradeKeyPool, n);
      /** @type {object[]} */
      const opts = [];
      for (const key of keysPicked) {
        if (String(key).startsWith("r:")) {
          const rk = String(key).slice(2);
          opts.push(makeRarityUpgrade(rk));
        } else {
          const g = UPGRADE_LENGTH_GROUPS.find((x) => x.key === key);
          if (g) opts.push(makeLengthUpgrade(g));
        }
      }
      ensureTelescopeLengthUpgradeInBundleOpts(opts, telescopeMost, makeLengthUpgrade, rng);
      const price = SHOP_BUNDLE_PACK_PRICES.upgrade[large ? "large" : "small"];
      const bid = ctx.nextPackOfferInstanceId();
      const upPick = large ? 2 : 1;
      const pn = opts.length;
      const px = Math.min(upPick, Math.max(1, pn));
      return {
        kind: "offer",
        offerType: "bundlePack",
        bundleKind: "upgrade",
        bundleSize: large ? "large" : "small",
        poolSize: opts.length,
        pickCount: large ? 2 : 1,
        offerInstanceId: bid,
        treasureId: `bundle_upgrade_${large ? "L" : "S"}_${bid}`,
        price,
        rarity: "rare",
        name: large ? "升级包（大）" : "升级包（小）",
        emoji: "",
        iconClass: "ri-gift-2-line",
        description: `从${pn}张升级卡中选择${px}张并获取（长度或稀有度升级）。`,
        bundleOptions: opts,
      };
    }

    if (cat === "bundleTreasureSmall" || cat === "bundleTreasureLarge") {
      const large = cat === "bundleTreasureLarge";
      const nOpt = large ? 4 : 2;
      const picks = rollDistinctShopTreasures(pool, owned, new Set(), nOpt, rng);
      const opts = picks.map((def) => toTreasureOfferRow(def));
      const price = SHOP_BUNDLE_PACK_PRICES.treasure[large ? "large" : "small"];
      const bid = ctx.nextPackOfferInstanceId();
      const trPick = large ? 2 : 1;
      const pn = opts.length;
      const px = Math.min(trPick, Math.max(1, pn));
      return {
        kind: "offer",
        offerType: "bundlePack",
        bundleKind: "treasure",
        bundleSize: large ? "large" : "small",
        poolSize: opts.length,
        pickCount: large ? 2 : 1,
        offerInstanceId: bid,
        treasureId: `bundle_treasure_${large ? "L" : "S"}_${bid}`,
        price,
        rarity: "epic",
        name: large ? "宝藏包（大）" : "宝藏包（小）",
        emoji: "",
        iconClass: "ri-gift-2-line",
        description: `从${pn}个宝藏中选择${px}个并获取（加入空宝藏槽）。`,
        bundleOptions: opts,
      };
    }

    if (cat === "bundleLetterSmall" || cat === "bundleLetterLarge") {
      const large = cat === "bundleLetterLarge";
      const n = large ? 5 : 3;
      const raws = pickDistinctFromPool(rng, letterRaws, n);
      const opts = raws.map((raw, i) => {
        const rarity = getRarityForLetter(raw);
        const letterDisp = raw === "q" ? "Qu" : raw.toUpperCase();
        return {
          kind: "offer",
          offerType: "deckLetter",
          optionKey: `letter-${raw}-${i}`,
          offerInstanceId: ctx.nextPackOfferInstanceId(),
          treasureId: `deck_letter_${raw}_${i}`,
          price: 0,
          rarity,
          letterRarity: rarity,
          name: `字母 ${letterDisp}`,
          emoji: "",
          description: `选中后「${letterDisp}」加入牌库（${UPGRADE_RARITY_LETTER_LABEL[rarity] ?? rarity}）。`,
          deckLetterRaw: raw,
        };
      });
      const price = SHOP_BUNDLE_PACK_PRICES.letter[large ? "large" : "small"];
      const bid = ctx.nextPackOfferInstanceId();
      const letPick = large ? 2 : 1;
      const pn = opts.length;
      const px = Math.min(letPick, Math.max(1, pn));
      return {
        kind: "offer",
        offerType: "bundlePack",
        bundleKind: "letter",
        bundleSize: large ? "large" : "small",
        poolSize: opts.length,
        pickCount: large ? 2 : 1,
        offerInstanceId: bid,
        treasureId: `bundle_letter_${large ? "L" : "S"}_${bid}`,
        price,
        rarity: "rare",
        name: large ? "字母包（大）" : "字母包（小）",
        emoji: "",
        iconClass: "ri-gift-2-line",
        description: `从${pn}个字母块中选择${px}个并加入牌库。`,
        bundleOptions: opts,
      };
    }

    if (cat === "bundleTileSmall" || cat === "bundleTileLarge") {
      const large = cat === "bundleTileLarge";
      const n = large ? 5 : 3;
      const raws = pickDistinctFromPool(rng, letterRaws, n);
      const opts = raws.map((raw, i) => {
        const mat = materialIds[Math.floor(rng() * materialIds.length)];
        const rarity = getRarityForLetter(raw);
        const letterDisp = raw === "q" ? "Qu" : raw.toUpperCase();
        const matTitle = getTileMaterialBlockTitle(mat) || mat;
        const accessoryId = rollShopDeckTileAccessoryId(rng, illusionOwned);
        return {
          kind: "offer",
          offerType: "deckTile",
          optionKey: `tile-${raw}-${mat}-${i}`,
          offerInstanceId: ctx.nextPackOfferInstanceId(),
          treasureId: `deck_tile_${raw}_${mat}_${i}`,
          price: 0,
          rarity,
          letterRarity: rarity,
          name: `${matTitle} · ${letterDisp}`,
          emoji: "",
          description: `选中后「${matTitle}」材质的「${letterDisp}」加入牌库。`,
          deckLetterRaw: raw,
          deckTileMaterialId: mat,
          deckTileAccessoryId: accessoryId,
        };
      });
      const price = SHOP_BUNDLE_PACK_PRICES.tile[large ? "large" : "small"];
      const bid = ctx.nextPackOfferInstanceId();
      const tilePick = large ? 2 : 1;
      const pn = opts.length;
      const px = Math.min(tilePick, Math.max(1, pn));
      return {
        kind: "offer",
        offerType: "bundlePack",
        bundleKind: "tile",
        bundleSize: large ? "large" : "small",
        poolSize: opts.length,
        pickCount: large ? 2 : 1,
        offerInstanceId: bid,
        treasureId: `bundle_tile_${large ? "L" : "S"}_${bid}`,
        price,
        rarity: "epic",
        name: large ? "字母包（大）" : "字母包（小）",
        emoji: "",
        iconClass: "ri-gift-2-line",
        description: `从${pn}个字母块中选择${px}个并加入牌库（可含棋盘材质）。`,
        bundleOptions: opts,
      };
    }

    return makeEmpty();
  }

  function buildGuaranteedSpellSmallBundleRow() {
    const pickCount = 1;
    const poolSize = Math.min(3, Math.max(1, spellDefsAll.length));
    const idPicks = pickDistinctFromPool(
      rng,
      spellDefsAll.map((d) => d.id),
      poolSize,
    );
    const picks = idPicks
      .map((id) => spellDefsAll.find((d) => d.id === id))
      .filter(Boolean);
    const pn = picks.length;
    const px = Math.min(pickCount, Math.max(1, pn));
    const price = SHOP_BUNDLE_PACK_PRICES.spell.small;
    const bid = ctx.nextPackOfferInstanceId();
    return {
      kind: "offer",
      offerType: "bundlePack",
      bundleKind: "spell",
      bundleSize: "small",
      poolSize: picks.length,
      pickCount,
      offerInstanceId: bid,
      treasureId: `bundle_spell_S_${bid}`,
      price,
      rarity: "rare",
      name: "法术包（小）",
      emoji: "",
      iconClass: "ri-gift-2-line",
      description: `从${pn}张法术卡中选择${px}张并获取。`,
      bundleOptions: picks.map((def) => makeSingleSpell(def)),
    };
  }

  /** @type {object[]} */
  const rows = [];
  const guaranteeBuffoon = ctx.guaranteeBalatroFirstShopBuffoonSlot === true;
  for (let slot = 0; slot < slotCount; slot += 1) {
    if (guaranteeBuffoon && slot === 0 && spellDefsAll.length > 0) {
      rows.push(buildGuaranteedSpellSmallBundleRow());
    } else {
      rows.push(rollOneSlotRow());
    }
  }
  while (rows.length < slotCount) rows.push(makeEmpty());
  return rows;
}
