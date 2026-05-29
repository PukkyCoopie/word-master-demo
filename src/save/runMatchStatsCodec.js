import { createRunMatchStats } from "../game/runMatchStats.js";

/** @param {import('../game/runMatchStats.js').RunMatchStats} stats */
export function serializeRunMatchStats(stats) {
  if (!stats || typeof stats !== "object") return null;
  const lengthCounts = [];
  for (const [len, count] of stats.lengthCounts ?? []) {
    lengthCounts.push([Math.floor(Number(len) || 0), Math.max(0, Math.floor(Number(count) || 0))]);
  }
  return {
    bestWord: String(stats.bestWord ?? ""),
    bestWordScore: Math.max(0, Math.floor(Number(stats.bestWordScore) || 0)),
    longestWord: String(stats.longestWord ?? ""),
    longestWordLength: Math.max(0, Math.floor(Number(stats.longestWordLength) || 0)),
    lengthCounts,
    lettersUsed: Math.max(0, Math.floor(Number(stats.lettersUsed) || 0)),
    lettersDiscarded: Math.max(0, Math.floor(Number(stats.lettersDiscarded) || 0)),
    shopPurchases: Math.max(0, Math.floor(Number(stats.shopPurchases) || 0)),
    rerolls: Math.max(0, Math.floor(Number(stats.rerolls) || 0)),
  };
}

/** @param {unknown} raw */
export function deserializeRunMatchStats(raw) {
  const stats = createRunMatchStats();
  if (!raw || typeof raw !== "object") return stats;
  const o = /** @type {Record<string, unknown>} */ (raw);
  stats.bestWord = String(o.bestWord ?? "");
  stats.bestWordScore = Math.max(0, Math.floor(Number(o.bestWordScore) || 0));
  stats.longestWord = String(o.longestWord ?? "");
  stats.longestWordLength = Math.max(0, Math.floor(Number(o.longestWordLength) || 0));
  stats.lettersUsed = Math.max(0, Math.floor(Number(o.lettersUsed) || 0));
  stats.lettersDiscarded = Math.max(0, Math.floor(Number(o.lettersDiscarded) || 0));
  stats.shopPurchases = Math.max(0, Math.floor(Number(o.shopPurchases) || 0));
  stats.rerolls = Math.max(0, Math.floor(Number(o.rerolls) || 0));
  stats.lengthCounts = new Map();
  if (Array.isArray(o.lengthCounts)) {
    for (const entry of o.lengthCounts) {
      if (!Array.isArray(entry) || entry.length < 2) continue;
      const len = Math.floor(Number(entry[0]) || 0);
      const count = Math.max(0, Math.floor(Number(entry[1]) || 0));
      if (len > 0 && count > 0) stats.lengthCounts.set(len, count);
    }
  }
  return stats;
}
