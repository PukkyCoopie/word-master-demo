/**
 * 整局各词长拼写次数统计（与 Boss 机制解耦，供 node 单测等轻量导入）。
 */

/**
 * 整局各词长拼写次数中唯一最多者的词长；并列最多或无记录时返回 null。
 * @param {Record<string | number, number> | Map<number, number> | null | undefined} counts
 * @returns {number | null}
 */
export function resolveUniqueMostSpellLength(counts) {
  if (!counts) return null;
  /** @type {[number, number][]} */
  const entries =
    counts instanceof Map
      ? [...counts.entries()]
      : Object.entries(counts).map(([k, v]) => [Math.floor(Number(k) || 0), Math.floor(Number(v) || 0)]);

  let bestN = 0;
  let bestLen = /** @type {number | null} */ (null);
  let tied = false;
  for (const [len, n] of entries) {
    const L = Math.max(0, Math.floor(Number(len) || 0));
    const c = Math.max(0, Math.floor(Number(n) || 0));
    if (L <= 0 || c <= 0) continue;
    if (c > bestN) {
      bestN = c;
      bestLen = L;
      tied = false;
    } else if (c === bestN) {
      tied = true;
    }
  }
  if (bestLen == null || tied) return null;
  return bestLen;
}
