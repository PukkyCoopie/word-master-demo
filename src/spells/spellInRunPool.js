import { SPELL_DEFINITIONS, SPELL_IDS_EXCLUDED_FROM_DICE, getSpellDefinition } from "./spellDefinitions.js";
import { spellHasTag } from "./spellTags.js";
import { SPELL_TAG_SPECTRAL } from "./spellTags.js";

/** 对局内随机释法：尽量覆盖全表，仅排除会递归/无意义的 id */
export const IN_RUN_RANDOM_SPELL_EXCLUDE = Object.freeze(["restart", "dice"]);

/**
 * @param {() => number} rng
 * @param {string[]} [excludeIds]
 */
export function pickRandomInRunSpellId(rng, excludeIds = IN_RUN_RANDOM_SPELL_EXCLUDE) {
  const exclude = new Set(excludeIds.map((id) => String(id)));
  const pool = SPELL_DEFINITIONS.map((d) => d.id).filter((id) => id && !exclude.has(id));
  if (!pool.length) return null;
  const rnd = typeof rng === "function" ? rng : Math.random;
  return pool[Math.floor(rnd() * pool.length)];
}

/**
 * @param {() => number} rng
 * @param {number} count
 * @param {string[]} [excludeIds]
 */
export function pickRandomInRunSpellIds(rng, count, excludeIds = IN_RUN_RANDOM_SPELL_EXCLUDE) {
  const exclude = new Set(excludeIds.map((id) => String(id)));
  const pool = SPELL_DEFINITIONS.map((d) => d.id).filter((id) => id && !exclude.has(id));
  if (!pool.length || count <= 0) return [];
  const rnd = typeof rng === "function" ? rng : Math.random;
  const out = [];
  for (let k = 0; k < count; k++) {
    out.push(pool[Math.floor(rnd() * pool.length)]);
  }
  return out;
}

/** 骰子链式预览用池（与旧 applySpell 内 dice 一致：另排除 spectrals；可叠加 eligibility 排除如促销） */
export function pickDiceChainSpellIds(rng, excludeIds = []) {
  const exclude = new Set([
    ...SPELL_IDS_EXCLUDED_FROM_DICE,
    ...(Array.isArray(excludeIds) ? excludeIds : []).map((id) => String(id)),
  ]);
  const pool = SPELL_DEFINITIONS.map((d) => d.id).filter(
    (id) =>
      id &&
      !exclude.has(id) &&
      !spellHasTag(getSpellDefinition(id), SPELL_TAG_SPECTRAL),
  );
  if (!pool.length) return [];
  const rnd = typeof rng === "function" ? rng : Math.random;
  return [0, 1].map(() => pool[Math.floor(rnd() * pool.length)]);
}
