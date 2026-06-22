/** 收藏单词榜：宝藏格边长（rpx，与 `--leaderboard-treasure-size` 一致） */
export const COLLECTION_LEADERBOARD_TREASURE_SIZE_RPX = 80 * 0.78;

/** 收藏单词榜：宝藏格间距（rpx） */
export const COLLECTION_LEADERBOARD_TREASURE_GAP_RPX = 3;

/**
 * 单行可容纳的最大宝藏数（不含展开按钮）。
 *
 * @param {number} rowDesignW
 */
export function maxLeaderboardTreasuresPerRow(rowDesignW) {
  const cell = COLLECTION_LEADERBOARD_TREASURE_SIZE_RPX;
  const gap = COLLECTION_LEADERBOARD_TREASURE_GAP_RPX;
  const rowW = Math.max(0, Number(rowDesignW) || 0);
  return Math.max(0, Math.floor((rowW + gap) / (cell + gap)));
}

/**
 * 未展开时：可见宝藏数、隐藏数、是否需展开按钮。
 *
 * @param {number} total
 * @param {number} rowDesignW
 */
export function resolveLeaderboardTreasureRowSlice(total, rowDesignW) {
  const n = Math.max(0, Math.floor(Number(total) || 0));
  if (n <= 0) {
    return { visibleCount: 0, hiddenCount: 0, needsExpand: false };
  }

  const maxAll = maxLeaderboardTreasuresPerRow(rowDesignW);
  if (n <= maxAll) {
    return { visibleCount: n, hiddenCount: 0, needsExpand: false };
  }

  const cell = COLLECTION_LEADERBOARD_TREASURE_SIZE_RPX;
  const gap = COLLECTION_LEADERBOARD_TREASURE_GAP_RPX;
  const rowW = Math.max(cell, Number(rowDesignW) || cell);
  const withExpand = Math.max(1, Math.floor((rowW - cell) / (cell + gap)));
  const visibleCount = Math.min(withExpand, n);
  const hiddenCount = Math.max(0, n - visibleCount);
  return {
    visibleCount,
    hiddenCount,
    needsExpand: hiddenCount > 0,
  };
}
