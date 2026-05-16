/**
 * 商店单格商品行：牌包区与「随机卡」栏共用（法术单卡、升级、宝藏）。
 */
import { getSpellDefinition } from "../spells/spellDefinitions.js";
import { LETTER_RARITY_ORDER, getRarityForLetter } from "../composables/useScoring.js";
import { getShopTreasureAccessoryPriceAdd, rollShopTreasureAccessoryId } from "../treasures/shopTreasureAccessoryRoll.js";
import { SHOP_SINGLE_ROW_PRICES, SHOP_TILE_PACK_MATERIAL_IDS } from "./shopPackEconomy.js";
import { getTileMaterialBlockTitle } from "../game/gameConceptCopy.js";
import { rollShopDeckTileAccessoryId } from "./shopTileAccessoryRoll.js";

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
 */
export function filterSpellDefsForShop(lastReplayableSpellId, allDefs) {
  const lastReplay = lastReplayableSpellId ? String(lastReplayableSpellId) : null;
  return allDefs.filter((d) => {
    if (d.id === "restart") {
      if (!lastReplay) return false;
      const prev = getSpellDefinition(lastReplay);
      return Boolean(prev && prev.pickCount >= 0);
    }
    return true;
  });
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
    price: SHOP_SINGLE_ROW_PRICES.spell,
    rarity: "rare",
    name: def.name,
    emoji: "",
    iconClass: def.iconClass,
    description: def.description,
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
 */
export function buildTreasureShopRowFromDef(nextOfferInstanceId, def, rng, accessoryChanceMult = 1) {
  const treasureAccessoryId = rollShopTreasureAccessoryId(rng, accessoryChanceMult);
  const priceAdd = getShopTreasureAccessoryPriceAdd(treasureAccessoryId);
  return {
    kind: "offer",
    offerInstanceId: nextOfferInstanceId(),
    offerType: "treasure",
    treasureId: def.treasureId,
    price: def.price + priceAdd,
    rarity: def.rarity,
    name: def.name,
    emoji: def.emoji,
    description: def.description,
    treasureAccessoryId: treasureAccessoryId ?? null,
  };
}

/**
 * @param {() => number} nextOfferInstanceId
 * @param {string} raw 小写单字母，q 表示 Qu
 * @param {() => number} rng
 * @param {boolean} illusionOwned
 */
export function buildDeckTileShopRow(nextOfferInstanceId, raw, rng, illusionOwned) {
  const r = String(raw ?? "e").toLowerCase() === "qu" ? "q" : String(raw ?? "e").toLowerCase();
  const mats = [...SHOP_TILE_PACK_MATERIAL_IDS];
  const mat = mats.length ? mats[Math.floor(rng() * mats.length)] : null;
  const rarity = getRarityForLetter(r);
  const letterDisp = r === "q" ? "Qu" : r.toUpperCase();
  const matTitle = mat ? getTileMaterialBlockTitle(mat) || mat : "";
  const accessoryId = rollShopDeckTileAccessoryId(rng, illusionOwned);
  const oid = nextOfferInstanceId();
  return {
    kind: "offer",
    offerType: "deckTile",
    offerInstanceId: oid,
    treasureId: `deck_tile_shop_${r}_${mat ?? "x"}_${oid}`,
    price: SHOP_SINGLE_ROW_PRICES.deckTile,
    rarity,
    letterRarity: rarity,
    name: mat ? `${matTitle} · ${letterDisp}` : `字母 ${letterDisp}`,
    emoji: "",
    description: mat
      ? `「${matTitle}」材质的「${letterDisp}」加入牌库。`
      : `「${letterDisp}」加入牌库（${UPGRADE_RARITY_LETTER_LABEL[rarity] ?? rarity}）。`,
    deckLetterRaw: r,
    deckTileMaterialId: mat,
    deckTileAccessoryId: accessoryId,
  };
}

/**
 * @param {() => number} nextOfferInstanceId
 * @param {string} raw
 */
export function buildDeckLetterShopRow(nextOfferInstanceId, raw) {
  const r = String(raw ?? "e").toLowerCase() === "qu" ? "q" : String(raw ?? "e").toLowerCase();
  const rarity = getRarityForLetter(r);
  const letterDisp = r === "q" ? "Qu" : r.toUpperCase();
  const oid = nextOfferInstanceId();
  return {
    kind: "offer",
    offerType: "deckLetter",
    offerInstanceId: oid,
    treasureId: `deck_letter_shop_${r}_${oid}`,
    price: SHOP_SINGLE_ROW_PRICES.deckLetter,
    rarity,
    letterRarity: rarity,
    name: `字母 ${letterDisp}`,
    emoji: "",
    description: `「${letterDisp}」加入牌库（${UPGRADE_RARITY_LETTER_LABEL[rarity] ?? rarity}）。`,
    deckLetterRaw: r,
  };
}

export function letterRarityOrderKeys() {
  return [...LETTER_RARITY_ORDER];
}
