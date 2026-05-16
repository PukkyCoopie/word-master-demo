import { isPickLegalForBoss } from "./e2eBossRules.js";

/** @typedef {import('./gridWordFinder.js').WordPick} WordPick */

/**
 * @param {import('./e2eBossRules.js').BossPlayContext | null} boss
 */
function preferredLengthRange(boss) {
  const slug = String(boss?.slug ?? "");
  if (slug === "the_psychic") return { min: 5, max: 5 };
  if (boss?.mouthLockedLength != null && Number.isFinite(boss.mouthLockedLength)) {
    const L = Math.max(1, Math.round(Number(boss.mouthLockedLength)));
    return { min: L, max: L };
  }
  return { min: 3, max: 8 };
}

/**
 * 偏「普通玩家」：中等词长、适度分数，带少量随机，避免总选最长生僻词。
 * @param {WordPick[]} picks
 * @param {(pick: WordPick) => { finalScore?: number } | null | undefined} getPreview
 * @param {import('./e2eBossRules.js').BossPlayContext | null} boss
 * @param {(row: number, col: number) => { rarity?: string } | null | undefined} getTileAt
 * @param {() => number} [rng]
 */
export function pickPlayerLikeWord(picks, getPreview, boss, getTileAt, rng = Math.random) {
  if (!picks?.length) return null;

  let pool = picks;
  if (boss?.slug) {
    const legal = picks.filter((p) => isPickLegalForBoss(p, boss, getTileAt));
    if (legal.length) pool = legal;
  }

  const { min: lenMin, max: lenMax } = preferredLengthRange(boss);
  const inRange = pool.filter((p) => p.word.length >= lenMin && p.word.length <= lenMax);
  if (inRange.length) pool = inRange;

  /** @type {{ pick: WordPick, weight: number, score: number }[]} */
  const scored = [];
  for (const pick of pool) {
    const preview = getPreview(pick);
    const raw = Number(preview?.finalScore);
    const score = Number.isFinite(raw) && raw > 0 ? raw : pick.word.length * 12;
    const len = pick.word.length;
    let lenMul = 1;
    if (len <= 3) lenMul = 0.88;
    else if (len <= 5) lenMul = 1.12;
    else if (len <= 7) lenMul = 1;
    else lenMul = 0.35;
    if (len < lenMin || len > lenMax) lenMul *= 0.15;
    const jitter = 0.88 + rng() * 0.24;
    scored.push({ pick, score, weight: Math.max(1, score * lenMul * jitter) });
  }

  scored.sort((a, b) => b.weight - a.weight);
  const top = scored.slice(0, Math.min(8, scored.length));
  const totalW = top.reduce((s, x) => s + x.weight, 0);
  let r = rng() * totalW;
  for (const item of top) {
    r -= item.weight;
    if (r <= 0) return item.pick;
  }
  return top[0]?.pick ?? null;
}
