/**
 * @typedef {Object} AchievementRunState
 * @property {Record<string, number>} wordsPerLevelId
 * @property {number} interestEarnedTotal
 * @property {number} moneySpentTotal
 * @property {number} discardUsesCount
 */

/** @returns {AchievementRunState} */
export function createAchievementRunState() {
  return {
    wordsPerLevelId: {},
    interestEarnedTotal: 0,
    moneySpentTotal: 0,
    discardUsesCount: 0,
  };
}

/**
 * @param {AchievementRunState} state
 * @param {string} levelId
 */
export function recordAchievementRunWordSubmitted(state, levelId) {
  const id = String(levelId ?? "").trim();
  if (!id) return;
  state.wordsPerLevelId[id] = (state.wordsPerLevelId[id] ?? 0) + 1;
}

/**
 * @param {AchievementRunState} state
 * @param {import('../game/runMatchStats.js').RunMatchStats} stats
 * @param {readonly string[]} completedLevelIds
 */
export function checkOneWordPerLevelWin(state, stats, completedLevelIds) {
  for (const levelId of completedLevelIds) {
    const count = state.wordsPerLevelId[levelId] ?? 0;
    if (count !== 1) return false;
  }
  const totalWords = Math.max(0, Math.floor(Number(stats.wordsSubmitted) || 0));
  return totalWords >= completedLevelIds.length && completedLevelIds.length > 0;
}

/** @param {AchievementRunState} state @param {number} amount */
export function recordAchievementRunInterest(state, amount) {
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  if (n > 0) state.interestEarnedTotal += n;
}

/** @param {AchievementRunState} state @param {number} amount */
export function recordAchievementRunMoneySpent(state, amount) {
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  if (n > 0) state.moneySpentTotal += n;
}

/** @param {AchievementRunState} state */
export function recordAchievementRunDiscardUse(state) {
  state.discardUsesCount += 1;
}

/**
 * @param {unknown} raw
 * @returns {AchievementRunState}
 */
export function deserializeAchievementRunState(raw) {
  const base = createAchievementRunState();
  if (!raw || typeof raw !== "object") return base;
  const o = /** @type {Record<string, unknown>} */ (raw);
  if (o.wordsPerLevelId && typeof o.wordsPerLevelId === "object") {
    for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (o.wordsPerLevelId))) {
      base.wordsPerLevelId[String(k)] = Math.max(0, Math.floor(Number(v) || 0));
    }
  }
  base.interestEarnedTotal = Math.max(0, Math.floor(Number(o.interestEarnedTotal) || 0));
  base.moneySpentTotal = Math.max(0, Math.floor(Number(o.moneySpentTotal) || 0));
  base.discardUsesCount = Math.max(0, Math.floor(Number(o.discardUsesCount) || 0));
  return base;
}

/** @param {AchievementRunState} state */
export function serializeAchievementRunState(state) {
  return {
    wordsPerLevelId: { ...state.wordsPerLevelId },
    interestEarnedTotal: state.interestEarnedTotal,
    moneySpentTotal: state.moneySpentTotal,
    discardUsesCount: state.discardUsesCount,
  };
}
