import { NORMAL_BOSS_SLUGS, SHOWDOWN_BOSS_SLUGS } from "./bossBlindDefinitions.js";
import { hashSeed32, mulberry32 } from "./runRng.js";

/**
 * @param {readonly string[]} pool
 * @param {number} runSeed
 * @param {string} poolKey
 * @returns {string[]}
 */
function shuffledBossPool(pool, runSeed, poolKey) {
  const list = [...pool];
  if (!list.length) return list;
  const rnd = mulberry32(hashSeed32(runSeed, "boss-order", poolKey));
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/**
 * 本局各章 Boss：对池子洗牌后按章序号依次取用，同局内不重复（1–7 普通池，8 终局池）。
 * @param {number} chapter 1..8
 * @param {number} runSeed
 * @returns {string}
 */
function pickBossForChapterDeterministic(chapter, runSeed) {
  const ch = Math.floor(Number(chapter)) || 0;
  if (ch < 1) return "";
  if (ch === 8) {
    const order = shuffledBossPool(SHOWDOWN_BOSS_SLUGS, runSeed, "showdown");
    return order[0] ?? "";
  }
  const order = shuffledBossPool(NORMAL_BOSS_SLUGS, runSeed, "normal");
  const idx = ch - 1;
  return order[idx % order.length] ?? order[0] ?? "";
}

/**
 * @param {number} chapter
 * @param {number} runSeed
 * @returns {Set<string>}
 */
function usedBossSlugsInRunExcludingChapter(chapter, runSeed) {
  const used = new Set();
  const skip = Math.floor(Number(chapter)) || 0;
  for (let c = 1; c <= 8; c++) {
    if (c === skip) continue;
    const slug = pickBossForChapterDeterministic(c, runSeed);
    if (slug) used.add(slug);
  }
  return used;
}

/**
 * 场记板券重掷：优先从未被其它章占用的 Boss 中换选，并尽量与当前不同。
 * @param {number} chapter
 * @param {number} runSeed
 * @param {number} rerollNonce
 * @returns {string}
 */
function pickBossForChapterReroll(chapter, runSeed, rerollNonce) {
  const ch = Math.floor(Number(chapter)) || 0;
  if (ch < 1) return "";
  const pool = ch === 8 ? [...SHOWDOWN_BOSS_SLUGS] : [...NORMAL_BOSS_SLUGS];
  if (!pool.length) return "";
  const current = pickBossForChapterDeterministic(ch, runSeed);
  const usedElsewhere = usedBossSlugsInRunExcludingChapter(ch, runSeed);
  let candidates = pool.filter((s) => !usedElsewhere.has(s) && s !== current);
  if (!candidates.length) candidates = pool.filter((s) => s !== current);
  if (!candidates.length) candidates = pool.filter((s) => !usedElsewhere.has(s));
  if (!candidates.length) candidates = [...pool];
  const seed = hashSeed32(runSeed, "boss-reroll", ch, Math.max(0, Math.floor(Number(rerollNonce) || 0)));
  const rnd = mulberry32(seed);
  const idx = Math.floor(rnd() * candidates.length);
  return candidates[idx] ?? candidates[0] ?? "";
}

/**
 * @param {string} levelId
 * @param {number} [runSeed=0] 局种子（可与 levelIndex 组合）
 * @param {number} [rerollNonce=0] 场记板券重掷序号（0 = 首次抽取）
 * @returns {string}
 */
export function pickBossSlugForLevel(levelId, runSeed = 0, rerollNonce = 0) {
  const parts = String(levelId).split("-");
  const sub = Math.floor(Number(parts[1])) || 1;
  const chapter = Math.floor(Number(parts[0])) || 1;
  if (sub !== 3) return "";
  const seed = Math.floor(Number(runSeed) || 0);
  const nonce = Math.max(0, Math.floor(Number(rerollNonce) || 0));
  if (nonce === 0) return pickBossForChapterDeterministic(chapter, seed);
  return pickBossForChapterReroll(chapter, seed, nonce);
}
