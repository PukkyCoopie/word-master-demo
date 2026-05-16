/**
 * 商店牌包区库存：仅各类组合包（含 `bundleOptions` 供选包 UI）；进店生成，不随「刷新」重掷。
 */
import { SPELL_DEFINITIONS } from "../spells/spellDefinitions.js";
import { rollDistinctShopTreasures } from "../treasures/shopTreasureRoll.js";
import { RARITY_BY_LETTER, LETTER_RARITY_ORDER, getRarityForLetter } from "../composables/useScoring.js";
import {
  getPackOfferSlotCount,
  PACK_OFFER_CATEGORY_WEIGHTS,
  SHOP_BUNDLE_PACK_PRICES,
  SHOP_TILE_PACK_MATERIAL_IDS,
} from "./shopPackEconomy.js";
import {
  buildLengthUpgradeShopRow,
  buildRarityUpgradeShopRow,
  buildSpellShopRow,
  buildTreasureShopRowFromDef,
  filterSpellDefsForShop,
  UPGRADE_LENGTH_GROUPS,
  UPGRADE_RARITY_LETTER_LABEL,
} from "./shopOfferRowBuilders.js";
import { buildDeckTileOfferDisplay, rollDeckTileModifiers } from "./rollDeckTileModifiers.js";
import {
  getSpellCategoryWeightMultiplier,
  getUpgradeCategoryWeightMultiplier,
  getMostPlayedWordLength,
  hasTelescopeVoucher,
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

/** @param {"normal"|"jumbo"|"mega"} tier */
function bundleTreasureIdSuffixForTier(tier) {
  if (tier === "mega") return "M";
  if (tier === "jumbo") return "J";
  return "N";
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
 *   sessionExcludeTreasureIds?: Set<string>,
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
  const sessionExcluded = ctx.sessionExcludeTreasureIds ?? null;
  const emptySlots = Math.max(0, Math.floor(Number(ctx.emptyTreasureSlots) || 0));
  const lastReplay = ctx.lastReplayableSpellId ? String(ctx.lastReplayableSpellId) : null;
  const pool = Array.isArray(ctx.shopTreasurePool) ? ctx.shopTreasurePool : [];

  const ownedV = ctx.ownedVoucherIds != null ? new Set([...ctx.ownedVoucherIds]) : new Set();
  const spellWt = getSpellCategoryWeightMultiplier(ownedV);
  const upgradeWt = getUpgradeCategoryWeightMultiplier(ownedV);
  const honeMult = Math.max(0, Number(ctx.honeAccessoryMult) || 1);
  const slotCount = getPackOfferSlotCount();
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

  const availableTreasureCount = pool.filter(
    (t) => t && !owned.has(t.treasureId) && !sessionExcluded?.has(t.treasureId),
  ).length;

  /** @type {Record<string, number>} */
  const effW = { ...PACK_OFFER_CATEGORY_WEIGHTS };
  for (const k of /** @type {const} */ (["bundleSpellNormal", "bundleSpellJumbo", "bundleSpellMega"])) {
    effW[k] = Math.max(0, (effW[k] || 0) * spellWt);
  }
  for (const k of /** @type {const} */ ([
    "bundleUpgradeNormal",
    "bundleUpgradeJumbo",
    "bundleUpgradeMega",
  ])) {
    effW[k] = Math.max(0, (effW[k] || 0) * upgradeWt);
  }

  const spellIdsForPool = spellDefsAll.map((d) => d.id);
  const spellPoolNormalOk = spellIdsForPool.length >= 3;
  const spellPoolJumboOk = spellIdsForPool.length >= 5;
  const spellPoolMegaOk = spellIdsForPool.length >= 5;

  const lengthKeys = UPGRADE_LENGTH_GROUPS.map((g) => g.key);
  const rarityKeys = [...LETTER_RARITY_ORDER];
  const upgradeKeyPool = [...lengthKeys, ...rarityKeys.map((k) => `r:${k}`)];
  const upgradePoolNormalOk = upgradeKeyPool.length >= 3;
  const upgradePoolJumboOk = upgradeKeyPool.length >= 5;
  const upgradePoolMegaOk = upgradeKeyPool.length >= 5;

  const letterRaws = allLetterRaws();
  const materialIds = [...SHOP_TILE_PACK_MATERIAL_IDS];

  const treasureNormalOk = emptySlots >= 1 && availableTreasureCount >= 2;
  const treasureJumboOk = emptySlots >= 1 && availableTreasureCount >= 4;
  const treasureMegaOk = emptySlots >= 2 && availableTreasureCount >= 4;

  if (!spellPoolNormalOk) effW.bundleSpellNormal = 0;
  if (!spellPoolJumboOk) effW.bundleSpellJumbo = 0;
  if (!spellPoolMegaOk) effW.bundleSpellMega = 0;
  if (!upgradePoolNormalOk) effW.bundleUpgradeNormal = 0;
  if (!upgradePoolJumboOk) effW.bundleUpgradeJumbo = 0;
  if (!upgradePoolMegaOk) effW.bundleUpgradeMega = 0;
  if (!treasureNormalOk) effW.bundleTreasureNormal = 0;
  if (!treasureJumboOk) effW.bundleTreasureJumbo = 0;
  if (!treasureMegaOk) effW.bundleTreasureMega = 0;
  if (letterRaws.length < 3) effW.bundleLetterNormal = 0;
  if (letterRaws.length < 5) effW.bundleLetterJumbo = 0;
  if (letterRaws.length < 5) effW.bundleLetterMega = 0;
  if (letterRaws.length < 3 || materialIds.length < 1) effW.bundleTileNormal = 0;
  if (letterRaws.length < 5 || materialIds.length < 1) effW.bundleTileJumbo = 0;
  if (letterRaws.length < 5 || materialIds.length < 1) effW.bundleTileMega = 0;

  /** @returns {object} */
  function rollOneSlotRow() {
    const bundleKeys = /** @type {const} */ ([
      "bundleSpellNormal",
      "bundleSpellJumbo",
      "bundleSpellMega",
      "bundleUpgradeNormal",
      "bundleUpgradeJumbo",
      "bundleUpgradeMega",
      "bundleTreasureNormal",
      "bundleTreasureJumbo",
      "bundleTreasureMega",
      "bundleLetterNormal",
      "bundleLetterJumbo",
      "bundleLetterMega",
      "bundleTileNormal",
      "bundleTileJumbo",
      "bundleTileMega",
    ]);
    const bundleWeights = bundleKeys.map((k) => (effW[k] > 0 ? effW[k] : 0));
    const sumBundle = bundleWeights.reduce((a, b) => a + b, 0);
    if (sumBundle <= 0) return makeEmpty();

    const cat = pickWeightedCategory([...bundleKeys], bundleWeights, rng);
    if (!cat) return makeEmpty();

    if (cat === "bundleSpellNormal" || cat === "bundleSpellJumbo" || cat === "bundleSpellMega") {
      const tier = cat === "bundleSpellMega" ? "mega" : cat === "bundleSpellJumbo" ? "jumbo" : "normal";
      const poolSize = tier === "normal" ? 3 : 5;
      const pickCount = tier === "mega" ? 2 : 1;
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
      const price = SHOP_BUNDLE_PACK_PRICES.spell[tier];
      const bid = ctx.nextPackOfferInstanceId();
      const tag = bundleTreasureIdSuffixForTier(tier);
      const name = tier === "normal" ? "法术包" : tier === "jumbo" ? "巨型法术包" : "超级法术包";
      return {
        kind: "offer",
        offerType: "bundlePack",
        bundleKind: "spell",
        bundleSize: tier,
        poolSize: picks.length,
        pickCount,
        offerInstanceId: bid,
        treasureId: `bundle_spell_${tag}_${bid}`,
        price,
        rarity: "rare",
        name,
        emoji: "",
        iconClass: "ri-gift-2-line",
        description: `从${pn}张法术卡中选择${px}张并使用`,
        bundleOptions: picks.map((def) => makeSingleSpell(def)),
      };
    }

    if (cat === "bundleUpgradeNormal" || cat === "bundleUpgradeJumbo" || cat === "bundleUpgradeMega") {
      const tier = cat === "bundleUpgradeMega" ? "mega" : cat === "bundleUpgradeJumbo" ? "jumbo" : "normal";
      const n = tier === "normal" ? 3 : 5;
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
      const price = SHOP_BUNDLE_PACK_PRICES.upgrade[tier];
      const bid = ctx.nextPackOfferInstanceId();
      const upPick = tier === "mega" ? 2 : 1;
      const pn = opts.length;
      const px = Math.min(upPick, Math.max(1, pn));
      const tag = bundleTreasureIdSuffixForTier(tier);
      const name = tier === "normal" ? "升级包" : tier === "jumbo" ? "巨型升级包" : "超级升级包";
      return {
        kind: "offer",
        offerType: "bundlePack",
        bundleKind: "upgrade",
        bundleSize: tier,
        poolSize: opts.length,
        pickCount: upPick,
        offerInstanceId: bid,
        treasureId: `bundle_upgrade_${tag}_${bid}`,
        price,
        rarity: "rare",
        name,
        emoji: "",
        iconClass: "ri-gift-2-line",
        description: `从${pn}张升级卡中选择${px}张并使用`,
        bundleOptions: opts,
      };
    }

    if (cat === "bundleTreasureNormal" || cat === "bundleTreasureJumbo" || cat === "bundleTreasureMega") {
      const tier = cat === "bundleTreasureMega" ? "mega" : cat === "bundleTreasureJumbo" ? "jumbo" : "normal";
      const nOpt = tier === "normal" ? 2 : 4;
      const picks = rollDistinctShopTreasures(
        pool,
        owned,
        sessionExcluded ?? new Set(),
        nOpt,
        rng,
      );
      if (sessionExcluded) {
        for (const def of picks) sessionExcluded.add(def.treasureId);
      }
      const opts = picks.map((def) => toTreasureOfferRow(def));
      const price = SHOP_BUNDLE_PACK_PRICES.treasure[tier];
      const bid = ctx.nextPackOfferInstanceId();
      const trPick = tier === "mega" ? 2 : 1;
      const pn = opts.length;
      const px = Math.min(trPick, Math.max(1, pn));
      const tag = bundleTreasureIdSuffixForTier(tier);
      const name = tier === "normal" ? "宝藏包" : tier === "jumbo" ? "巨型宝藏包" : "超级宝藏包";
      return {
        kind: "offer",
        offerType: "bundlePack",
        bundleKind: "treasure",
        bundleSize: tier,
        poolSize: opts.length,
        pickCount: trPick,
        offerInstanceId: bid,
        treasureId: `bundle_treasure_${tag}_${bid}`,
        price,
        rarity: "epic",
        name,
        emoji: "",
        iconClass: "ri-gift-2-line",
        description: `从${pn}个宝藏中选择${px}个并获取`,
        bundleOptions: opts,
      };
    }

    if (cat === "bundleLetterNormal" || cat === "bundleLetterJumbo" || cat === "bundleLetterMega") {
      const tier = cat === "bundleLetterMega" ? "mega" : cat === "bundleLetterJumbo" ? "jumbo" : "normal";
      const n = tier === "normal" ? 3 : 5;
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
          description: `选中后「${letterDisp}」加入牌库（${UPGRADE_RARITY_LETTER_LABEL[rarity] ?? rarity}）`,
          deckLetterRaw: raw,
        };
      });
      const price = SHOP_BUNDLE_PACK_PRICES.letter[tier];
      const bid = ctx.nextPackOfferInstanceId();
      const letPick = tier === "mega" ? 2 : 1;
      const pn = opts.length;
      const px = Math.min(letPick, Math.max(1, pn));
      const tag = bundleTreasureIdSuffixForTier(tier);
      const name = tier === "normal" ? "字母包" : tier === "jumbo" ? "巨型字母包" : "超级字母包";
      return {
        kind: "offer",
        offerType: "bundlePack",
        bundleKind: "letter",
        bundleSize: tier,
        poolSize: opts.length,
        pickCount: letPick,
        offerInstanceId: bid,
        treasureId: `bundle_letter_${tag}_${bid}`,
        price,
        rarity: "rare",
        name,
        emoji: "",
        iconClass: "ri-gift-2-line",
        description: `从${pn}个字母块中选择${px}个并加入牌库`,
        bundleOptions: opts,
      };
    }

    if (cat === "bundleTileNormal" || cat === "bundleTileJumbo" || cat === "bundleTileMega") {
      const tier = cat === "bundleTileMega" ? "mega" : cat === "bundleTileJumbo" ? "jumbo" : "normal";
      const n = tier === "normal" ? 3 : 5;
      const raws = pickDistinctFromPool(rng, letterRaws, n);
      const opts = raws.map((raw, i) => {
        const mods = rollDeckTileModifiers(rng, { honeAccessoryMult: honeMult, materialIds });
        const rarity = getRarityForLetter(raw);
        const letterDisp = raw === "q" ? "Qu" : raw.toUpperCase();
        const copy = buildDeckTileOfferDisplay(letterDisp, mods);
        return {
          kind: "offer",
          offerType: "deckTile",
          optionKey: `tile-${raw}-${mods.materialId ?? "b"}-${i}`,
          offerInstanceId: ctx.nextPackOfferInstanceId(),
          treasureId: `deck_tile_${raw}_${mods.materialId ?? "b"}_${i}`,
          price: 0,
          rarity,
          letterRarity: rarity,
          name: copy.name,
          emoji: "",
          description: copy.description,
          deckLetterRaw: raw,
          deckTileMaterialId: mods.materialId,
          deckTileAccessoryId: mods.accessoryId,
          deckTileTreasureAccessoryId: mods.treasureAccessoryId,
        };
      });
      const price = SHOP_BUNDLE_PACK_PRICES.tile[tier];
      const bid = ctx.nextPackOfferInstanceId();
      const tilePick = tier === "mega" ? 2 : 1;
      const pn = opts.length;
      const px = Math.min(tilePick, Math.max(1, pn));
      const tag = bundleTreasureIdSuffixForTier(tier);
      const name = tier === "normal" ? "字母包" : tier === "jumbo" ? "巨型字母包" : "超级字母包";
      return {
        kind: "offer",
        offerType: "bundlePack",
        bundleKind: "tile",
        bundleSize: tier,
        poolSize: opts.length,
        pickCount: tilePick,
        offerInstanceId: bid,
        treasureId: `bundle_tile_${tag}_${bid}`,
        price,
        rarity: "epic",
        name,
        emoji: "",
        iconClass: "ri-gift-2-line",
        description: `从${pn}个字母块中选择${px}个并加入牌库`,
        bundleOptions: opts,
      };
    }

    return makeEmpty();
  }

  function buildGuaranteedSpellNormalBundleRow() {
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
    const price = SHOP_BUNDLE_PACK_PRICES.spell.normal;
    const bid = ctx.nextPackOfferInstanceId();
    return {
      kind: "offer",
      offerType: "bundlePack",
      bundleKind: "spell",
      bundleSize: "normal",
      poolSize: picks.length,
      pickCount,
      offerInstanceId: bid,
      treasureId: `bundle_spell_N_${bid}`,
      price,
      rarity: "rare",
      name: "法术包",
      emoji: "",
      iconClass: "ri-gift-2-line",
      description: `从${pn}张法术卡中选择${px}张并使用`,
      bundleOptions: picks.map((def) => makeSingleSpell(def)),
    };
  }

  /** @type {object[]} */
  const rows = [];
  const guaranteeBuffoon = ctx.guaranteeBalatroFirstShopBuffoonSlot === true;
  for (let slot = 0; slot < slotCount; slot += 1) {
    if (guaranteeBuffoon && slot === 0 && spellDefsAll.length > 0) {
      rows.push(buildGuaranteedSpellNormalBundleRow());
    } else {
      rows.push(rollOneSlotRow());
    }
  }
  while (rows.length < slotCount) rows.push(makeEmpty());
  return rows;
}
