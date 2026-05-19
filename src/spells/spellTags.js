import { getSpellDefinition } from "./spellDefinitions.js";

/** 对齐 Balatro Spectral（幻灵）类消耗品；本项目中仍走法术卡流程，仅打标供日后筛选/展示 */
export const SPELL_TAG_SPECTRAL = "spectral";

/** @param {import("./spellDefinitions.js").SpellDefinition | null | undefined} def */
export function spellHasTag(def, tag) {
  if (!def?.tags?.length) return false;
  return def.tags.includes(tag);
}

/** @param {string} spellId */
export function isSpectralSpellId(spellId) {
  return spellHasTag(getSpellDefinition(spellId), SPELL_TAG_SPECTRAL);
}
