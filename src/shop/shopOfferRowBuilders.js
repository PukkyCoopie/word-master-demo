/**
 * 商店单格商品行：单卡区（宝藏/法术/升级/字母块）与牌包区内选项共用。
 */
import { resolveRestartEffectiveSpellId } from "../game/inRunGrantFlow.js";
import { getSpellDefinition, getSpellShopPrice } from "../spells/spellDefinitions.js";
import { isSpellEligibleForPools } from "../spells/spellPoolEligibility.js";
import { LETTER_RARITY_ORDER, getRarityForLetter } from "../composables/useScoring.js";
import { getShopTreasureAccessoryPriceAddFromIds, isTreasureShopGainAccessoryId, rollShopTreasureAccessoryId, rollShopTreasureGainAccessoryId } from "../accessories/accessoryResolve.js";
import { writeTreasureAccessoryIds } from "../accessories/accessoryState.js";
import { rollDifficultyNegativeTreasureAccessoryIds, treasureOfferHasRentalAccessory } from "../game/runDifficultyRuntime.js";
import {
  SHOP_SINGLE_ROW_PRICES,
  SHOP_TILE_PACK_MATERIAL_IDS,
  resolveDeckTileShopPrice,
} from "./shopPackEconomy.js";
import { buildDeckTileOfferDisplay, rollDeckTileModifiers } from "./rollDeckTileModifiers.js";
import { RENTAL_TREASURE_LIST_PRICE } from "../treasures/ownedTreasureSlot.js";
import { resolveLetterFromRaw } from "../settings/letterQ.js";

export const UPGRADE_ICON_CLASS = "ri-arrow-up-box-fill";

export const UPGRADE_LENGTH_GROUPS = Object.freeze([
  Object.freeze({ key: "len3", minLen: 3, maxLen: 3, label: "3字母" }),
  Object.freeze({ key: "len4", minLen: 4, maxLen: 4, label: "4字母" }),
  Object.freeze({ key: "len5", minLen: 5, maxLen: 5, label: "5字母" }),
  Object.freeze({ key: "len6_7", minLen: 6, maxLen: 7, label: "6-7字母" }),
  Object.freeze({ key: "len8_10", minLen: 8, maxLen: 10, label: "8-10字母" }),
  Object.freeze({ key: "len11_plus", minLen: 11, maxLen: 16, label: "11+字母" }),
]);

export const UPGRADE_RARITY_LETTER_LABEL = Object.freeze({
  common: "普通",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
});

/**
 * @param {string | null | undefined} lastReplayableSpellId
 * @param {import("../spells/spellDefinitions.js").SpellDefinition[]} allDefs
 * @param {string[]} [spellCastHistory]
 * @param {string[]} [excludeSpellIds]
 * @param {import("../spells/spellPoolEligibility.js").SpellPoolEligibilityCounts | null} [spellPoolCounts]
 */
export function filterSpellDefsForShop(
  lastReplayableSpellId,
  allDefs,
  spellCastHistory = [],
  excludeSpellIds = [],
  spellPoolCounts = null,
) {
  const replayTarget = resolveRestartEffectiveSpellId(spellCastHistory, lastReplayableSpellId);
  const exclude = new Set(
    (Array.isArray(excludeSpellIds) ? excludeSpellIds : []).map((id) => String(id)),
  );
  return allDefs.filter((d) => {
    if (exclude.has(d.id)) return false;
    if (d.id === "restart") {
      if (!replayTarget) return false;
      const prev = getSpellDefinition(replayTarget);
      return Boolean(prev && prev.pickCount >= 0);
    }
    if (spellPoolCounts && !isSpellEligibleForPools(d.id, spellPoolCounts)) return false;
    return true;
  });
}

/**
 * @param {string | null | undefined} lastReplayableSpellId
 * @param {string[]} [spellCastHistory]
 */
export function canPurchaseRestartSpellInShop(lastReplayableSpellId, spellCastHistory = []) {
  const replayTarget = resolveRestartEffectiveSpellId(spellCastHistory, lastReplayableSpellId);
  if (!replayTarget) return false;
  const prev = getSpellDefinition(replayTarget);
  return Boolean(prev && prev.pickCount >= 0);
}

/**
 * @param {() => number} nextOfferInstanceId
 * @param {import("../spells/spellDefinitions.js").SpellDefinition} def
 */
export function buildSpellShopRow(nextOfferInstanceId, def) {
  return {
    kind: "offer",
    offerType: "spell",
    offerInstanceId: nextOfferInstanceId(),
    treasureId: `spell_${def.id}`,
    spellId: def.id,
    price: getSpellShopPrice(def),
    rarity: "rare",
    name: def.name,
    emoji: "",
    iconClass: def.iconClass,
    description: def.description,
    spellTags: def.tags ? [...def.tags] : [],
  };
}

/**
 * @param {() => number} nextOfferInstanceId
 * @param {typeof UPGRADE_LENGTH_GROUPS[number]} g
 */
export function buildLengthUpgradeShopRow(nextOfferInstanceId, g) {
  return {
    kind: "offer",
    offerType: "upgrade",
    upgradeKind: "length",
    offerInstanceId: nextOfferInstanceId(),
    treasureId: `upgrade_${g.key}`,
    price: SHOP_SINGLE_ROW_PRICES.lengthUpgrade,
    rarity: "rare",
    name: `升级 · ${g.label}`,
    emoji: "",
    iconClass: UPGRADE_ICON_CLASS,
    description: `${g.label}单词的等级提升1级`,
    lengthGroupKey: g.key,
    lengthLabel: g.label,
    lengthBadgeLabel: g.label.replace("字母", ""),
    lengthMin: g.minLen,
    lengthMax: g.maxLen,
  };
}

/**
 * @param {() => number} nextOfferInstanceId
 * @param {string} rk
 */
export function buildRarityUpgradeShopRow(nextOfferInstanceId, rk) {
  const label = UPGRADE_RARITY_LETTER_LABEL[rk] ?? rk;
  return {
    kind: "offer",
    offerType: "upgrade",
    upgradeKind: "rarity",
    offerInstanceId: nextOfferInstanceId(),
    treasureId: `upgrade_rarity_${rk}`,
    price: SHOP_SINGLE_ROW_PRICES.rarityUpgrade,
    rarity: "rare",
    letterRarity: rk,
    rarityKey: rk,
    name: `升级 · ${label}`,
    emoji: "",
    iconClass: UPGRADE_ICON_CLASS,
    description: `「${label}」稀有度字母的等级提升 1 级`,
    lengthLabel: label,
    lengthBadgeLabel: label,
  };
}

/**
 * @param {() => number} nextOfferInstanceId
 * @param {import("../treasures/treasureTypes.js").TreasureDef} def
 * @param {() => number} rng
 * @param {number} [accessoryChanceMult=1]
 * @param {number | null | undefined} [runDifficultyIndex=null] 非 null 时启用难度负面配饰掷骰
 * @param {boolean} [includeAccessories=true] false 时不掷配饰（对局内生成/直接授予宝藏）
 * @param {boolean} [guaranteeGainAccessory=false] 为 true 时确保至少一枚增益配饰（负面配饰不计）
 */
export function buildTreasureShopRowFromDef(
  nextOfferInstanceId,
  def,
  rng,
  accessoryChanceMult = 1,
  runDifficultyIndex = null,
  includeAccessories = true,
  guaranteeGainAccessory = false,
) {
  /** @type {string[]} */
  const ids = [];
  if (includeAccessories) {
    if (runDifficultyIndex != null) {
      ids.push(...rollDifficultyNegativeTreasureAccessoryIds(rng, runDifficultyIndex));
    }
    const positive = rollShopTreasureAccessoryId(rng, accessoryChanceMult);
    if (positive) ids.push(positive);
  }
  let uniqueIds = [...new Set(ids)];
  if (includeAccessories && guaranteeGainAccessory && !uniqueIds.some(isTreasureShopGainAccessoryId)) {
    uniqueIds = [...new Set([...uniqueIds, rollShopTreasureGainAccessoryId(rng)])];
  }
  let price = def.price + getShopTreasureAccessoryPriceAddFromIds(uniqueIds);
  if (treasureOfferHasRentalAccessory(uniqueIds)) price = RENTAL_TREASURE_LIST_PRICE;
  /** @type {Record<string, unknown>} */
  const row = {
    kind: "offer",
    offerInstanceId: nextOfferInstanceId(),
    offerType: "treasure",
    treasureId: def.treasureId,
    price,
    rarity: def.rarity,
    name: def.name,
    emoji: def.emoji,
    description: def.description,
  };
  writeTreasureAccessoryIds(row, uniqueIds);
  return row;
}

/**
 * @param {() => number} nextOfferInstanceId
 * @param {string} raw 小写单字母，q 表示 Qu
 * @param {() => number} rng
 * @param {{ honeAccessoryMult?: number, materialIds?: readonly string[], allowModifiers?: boolean }} [opts]
 */
export function buildDeckTileShopRow(nextOfferInstanceId, raw, rng, opts = {}) {
  const r = String(raw ?? "e").toLowerCase() === "qu" ? "q" : String(raw ?? "e").toLowerCase();
  const honeAccessoryMult = opts.honeAccessoryMult ?? 1;
  const materialIds = opts.materialIds ?? SHOP_TILE_PACK_MATERIAL_IDS;
  const mods = rollDeckTileModifiers(rng, {
    honeAccessoryMult,
    materialIds,
    allowModifiers: opts.allowModifiers !== false,
  });
  const rarity = getRarityForLetter(r);
  const letterDisp = resolveLetterFromRaw(r);
  const copy = buildDeckTileOfferDisplay(letterDisp, {
    ...mods,
    rarityLabel: UPGRADE_RARITY_LETTER_LABEL[rarity] ?? rarity,
  });
  const oid = nextOfferInstanceId();
  return {
    kind: "offer",
    offerType: "deckTile",
    offerInstanceId: oid,
    treasureId: `deck_tile_shop_${r}_${mods.materialId ?? "x"}_${oid}`,
    price: resolveDeckTileShopPrice(mods),
    rarity,
    letterRarity: rarity,
    name: copy.name,
    emoji: "",
    description: copy.description,
    deckLetterRaw: r,
    deckTileMaterialId: mods.materialId,
    deckTileAccessoryId: mods.accessoryId,
    deckTileTreasureAccessoryId: mods.treasureAccessoryId,
  };
}

export function letterRarityOrderKeys() {
  return [...LETTER_RARITY_ORDER];
}
