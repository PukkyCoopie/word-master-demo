/** 极高风险法术：需描述高亮 + 可选按住确认 */
export const HIGH_RISK_SPELL_IDS = Object.freeze(["ankh", "wraith", "immolate", "ectoplasm"]);

/** @param {string | null | undefined} spellId */
export function isHighRiskSpellId(spellId) {
  return HIGH_RISK_SPELL_IDS.includes(String(spellId ?? ""));
}
