import { buildSpellShopRow } from "../shop/shopOfferRowBuilders.js";
import { getSpellDefinition } from "./spellDefinitions.js";

/** @type {() => number} */
let previewOfferInstanceSeq = 0;

/**
 * 构建仅用于详情预览的法术货架商品（非真实商店槽位）。
 * @param {string} spellId
 */
export function buildSpellOfferPreviewFromId(spellId) {
  const def = getSpellDefinition(String(spellId ?? "").trim());
  if (!def) return null;
  return buildSpellShopRow(() => ++previewOfferInstanceSeq, def);
}
