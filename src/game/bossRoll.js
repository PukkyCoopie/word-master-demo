import { NORMAL_BOSS_SLUGS, SHOWDOWN_BOSS_SLUGS } from "./bossBlindDefinitions.js";
import { parseMajorFromLevelId } from "../vouchers/voucherRuntime.js";
import { hashSeed32, mulberry32 } from "./runRng.js";
import { ENDLESS_MILESTONE_BOSS_CHAPTER_INTERVAL } from "./endlessMilestoneShop.js";

/**
 * 将任意章序号映射到 0–8 Boss 槽位（无尽 9+ 按 8 章循环；8/16/24… 为终局池）。
 * @param {number} chapter
 * @returns {number} -1 表示无效
 */
export function normalizeBossChapterSlot(chapter) {
  const ch = Math.floor(Number(chapter));
  if (!Number.isFinite(ch) || ch < 0) return -1;
  if (ch <= ENDLESS_MILESTONE_BOSS_CHAPTER_INTERVAL) return ch;
  const mod = ch % ENDLESS_MILESTONE_BOSS_CHAPTER_INTERVAL;
  return mod === 0 ? ENDLESS_MILESTONE_BOSS_CHAPTER_INTERVAL : mod;
}

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
 * 本局各章 Boss：对池子洗牌后按章序号依次取用，同局内不重复（0–7 普通池各 1 个，8 终局池）。
 * 第 0 章在开局即占位；无尽 9+ 章按 {@link normalizeBossChapterSlot} 循环映射。
 * @param {number} chapter
 * @param {number} runSeed
 * @returns {string}
 */
function pickBossForChapterDeterministic(chapter, runSeed) {
  const slot = normalizeBossChapterSlot(chapter);
  if (slot < 0) return "";
  if (slot === ENDLESS_MILESTONE_BOSS_CHAPTER_INTERVAL) {
    const order = shuffledBossPool(SHOWDOWN_BOSS_SLUGS, runSeed, "showdown");
    return order[0] ?? "";
  }
  const order = shuffledBossPool(NORMAL_BOSS_SLUGS, runSeed, "normal");
  return order[slot % order.length] ?? order[0] ?? "";
}

/**
 * @param {number} chapter
 * @param {number} runSeed
 * @returns {Set<string>}
 */
function usedBossSlugsInRunExcludingChapter(chapter, runSeed) {
  const used = new Set();
  const skipSlot = normalizeBossChapterSlot(chapter);
  for (let c = 0; c <= ENDLESS_MILESTONE_BOSS_CHAPTER_INTERVAL; c++) {
    const slot = normalizeBossChapterSlot(c);
    if (slot === skipSlot) continue;
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
  const slot = normalizeBossChapterSlot(chapter);
  if (slot < 0) return "";
  const pool =
    slot === ENDLESS_MILESTONE_BOSS_CHAPTER_INTERVAL
      ? [...SHOWDOWN_BOSS_SLUGS]
      : [...NORMAL_BOSS_SLUGS];
  if (!pool.length) return "";
  const current = pickBossForChapterDeterministic(chapter, runSeed);
  const usedElsewhere = usedBossSlugsInRunExcludingChapter(chapter, runSeed);
  let candidates = pool.filter((s) => !usedElsewhere.has(s) && s !== current);
  if (!candidates.length) candidates = pool.filter((s) => s !== current);
  if (!candidates.length) candidates = pool.filter((s) => !usedElsewhere.has(s));
  if (!candidates.length) candidates = [...pool];
  const seed = hashSeed32(runSeed, "boss-reroll", slot, Math.max(0, Math.floor(Number(rerollNonce) || 0)));
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
  const sub = Math.floor(Number(String(levelId).split("-")[1])) || 1;
  const chapter = parseMajorFromLevelId(levelId);
  if (sub !== 3) return "";
  const seed = Math.floor(Number(runSeed) || 0);
  const nonce = Math.max(0, Math.floor(Number(rerollNonce) || 0));
  if (nonce === 0) return pickBossForChapterDeterministic(chapter, seed);
  return pickBossForChapterReroll(chapter, seed, nonce);
}
