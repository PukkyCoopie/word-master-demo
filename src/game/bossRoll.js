import { NORMAL_BOSS_SLUGS, SHOWDOWN_BOSS_SLUGS } from "./bossBlindDefinitions.js";

/**
 * 确定性伪随机 0..1
 * @param {number} seed
 * @returns {number}
 */
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
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
  const pool = chapter === 8 ? [...SHOWDOWN_BOSS_SLUGS] : [...NORMAL_BOSS_SLUGS];
  if (!pool.length) return "";
  const nonce = Math.max(0, Math.floor(Number(rerollNonce) || 0));
  const seed = (runSeed * 10007 + chapter * 131 + 17 + nonce * 9749) >>> 0;
  const rnd = mulberry32(seed);
  const idx = Math.floor(rnd() * pool.length);
  return pool[idx] ?? pool[0];
}
