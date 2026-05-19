import { SPELL_CANDIDATE_TILE_CAP } from "./spellDefinitions.js";

/**
 * 从牌张池构建法术候选格（按 deckCardUid 绑定具体牌张）。
 * @param {unknown[]} pool
 * @param {(snap: Record<string, unknown>) => Record<string, unknown> | null} buildSnapshotFromCard
 * @param {() => number} [rng]
 * @param {number} [cap]
 */
export function buildSpellOfferSlotsFromPool(pool, buildSnapshotFromCard, rng = Math.random, cap = SPELL_CANDIDATE_TILE_CAP) {
  const CAP = cap;
  const rnd = typeof rng === "function" ? rng : Math.random;
  const cards = Array.isArray(pool) ? pool.filter((c) => c && typeof c === "object") : [];

  if (!cards.length) {
    return Array.from({ length: CAP }, (_, i) => ({ key: `sp-${i}`, empty: true }));
  }

  const allowReuse = cards.length < CAP;
  const usedUid = new Set();

  /** @type {Array<{ key: string, deckOnly: true, deckCardUid: number | null, tile?: unknown, empty?: boolean }>} */
  const slots = [];
  for (let i = 0; i < CAP; i++) {
    let candidates = allowReuse
      ? cards
      : cards.filter((c) => {
          const uid = /** @type {{ _dcUid?: number }} */ (c)._dcUid;
          return uid == null || !usedUid.has(uid);
        });
    if (!candidates.length) candidates = cards;
    const card = candidates[Math.floor(rnd() * candidates.length)];
    const uid = /** @type {{ _dcUid?: number }} */ (card)._dcUid ?? null;
    if (!allowReuse && uid != null) usedUid.add(uid);
    const tile = buildSnapshotFromCard(/** @type {Record<string, unknown>} */ (card));
    if (!tile) {
      slots.push({ key: `sp-${i}`, empty: true });
      continue;
    }
    slots.push({
      key: `sp-${i}`,
      deckOnly: true,
      deckCardUid: uid,
      tile,
    });
  }
  return slots;
}
