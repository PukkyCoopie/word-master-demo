/**
 * 提交记分「字母阶段之后」钩子上下文（自 GamePanel 迁出）。
 * @param {{
 *   ownedSlotTreasureIdList: () => string[],
 *   resolveRealSubmitTileForWordSlot: (index: number, scoringTile?: object | null) => object | null,
 *   touchGrid: () => void,
 *   playSubmitTileEnhancementStripLeave: (opts: object) => Promise<void>,
 *   wordSlotRefs: (HTMLElement | undefined)[],
 *   getSelectedGridTileElsInOrder: () => HTMLElement[],
 *   getPendingPagerQuizSession: () => unknown,
 *   findOwnedTreasureSlotIndex: (treasureId: string) => number,
 *   runPagerQuizRequest: (...args: unknown[]) => unknown,
 * }} deps
 * @param {object[]} tiles
 * @param {object} detailed
 */
export function buildSubmitAfterLettersContext(deps, tiles, detailed) {
  return {
    submittedScoringTiles: tiles,
    ownedSlotTreasureIds: deps.ownedSlotTreasureIdList(),
    resolveSubmitTileAtIndex: (index, scoringTile) =>
      deps.resolveRealSubmitTileForWordSlot(index, scoringTile),
    touchGrid: deps.touchGrid,
    playSubmitTileEnhancementStripLeave: deps.playSubmitTileEnhancementStripLeave,
    getWordSlotEls: () => {
      const out = [];
      for (let i = 0; i < tiles.length; i += 1) {
        const el = deps.wordSlotRefs[i];
        if (el) out[i] = el;
      }
      return out;
    },
    getGridTileElsInOrder: () => deps.getSelectedGridTileElsInOrder(),
    detailed,
    pagerQuizSession: deps.getPendingPagerQuizSession(),
    findOwnedTreasureSlotIndex: deps.findOwnedTreasureSlotIndex,
    requestPagerQuiz: deps.runPagerQuizRequest,
  };
}
