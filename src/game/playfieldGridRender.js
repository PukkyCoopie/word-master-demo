import { computed } from "vue";

/**
 * @typedef {Object} PlayfieldGridRenderDeps
 * @property {import('vue').Ref<object[][]>} grid
 * @property {number} COLS
 * @property {(row: number, col: number, tile: object) => boolean} isGridTilePlaceholder
 * @property {import('vue').Ref<boolean>} tileDragActive
 * @property {import('vue').Ref<{ zone?: string, row?: number, col?: number } | null>} tileDragSource
 * @property {(tile: object) => object | null} gridPlaceholderFrozenPresentation
 * @property {import('vue').Ref<number>} [submitTilePresentationRevision]
 * @property {import('vue').Ref<Map<unknown, string>>} gridTileLetterForRender
 * @property {import('vue').Ref<Map<unknown, string>>} gridTileRarityForRender
 * @property {import('vue').Ref<Map<unknown, { prev?: string | null, next?: string | null }>>} gridTileVowelGhostForRender
 */

/**
 * 棋盘格 v-memo / 展示字段（S.5：自 GamePanel 迁出）。
 *
 * @param {PlayfieldGridRenderDeps} deps
 */
export function createPlayfieldGridRender(deps) {
  const {
    grid,
    COLS,
    isGridTilePlaceholder,
    tileDragActive,
    tileDragSource,
    gridPlaceholderFrozenPresentation,
    submitTilePresentationRevision,
    gridTileLetterForRender,
    gridTileRarityForRender,
    gridTileVowelGhostForRender,
  } = deps;

  const flatGrid = computed(() => grid.value.flat());

  /** @param {object} tile @param {number} index */
  function gridTileRenderLetter(tile, index) {
    const frozen = gridPlaceholderFrozenPresentation(tile);
    if (frozen) return frozen.letter;
    return gridTileLetterForRender.value.get(tile.id) ?? tile.letter;
  }

  /** @param {object} tile @param {number} index */
  function gridTileRenderRarity(tile, index) {
    const frozen = gridPlaceholderFrozenPresentation(tile);
    if (frozen) return frozen.rarity;
    return gridTileRarityForRender.value.get(tile.id) ?? tile.rarity;
  }

  /** @param {object} tile */
  function gridTileRenderVowelGhostPrev(tile) {
    const frozen = gridPlaceholderFrozenPresentation(tile);
    if (frozen) return frozen.vowelGhostPrev;
    return gridTileVowelGhostForRender.value.get(tile.id)?.prev ?? null;
  }

  /** @param {object} tile */
  function gridTileRenderVowelGhostNext(tile) {
    const frozen = gridPlaceholderFrozenPresentation(tile);
    if (frozen) return frozen.vowelGhostNext;
    return gridTileVowelGhostForRender.value.get(tile.id)?.next ?? null;
  }

  /**
   * @param {object} tile
   * @param {number} index flatGrid index
   */
  function gridTileRenderMemoDeps(tile, index) {
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    const placeholder = isGridTilePlaceholder(row, col, tile);
    const dragSourceCell =
      tileDragActive.value &&
      tileDragSource.value?.zone === "grid" &&
      tileDragSource.value.row === row &&
      tileDragSource.value.col === col;
    if (placeholder) {
      const frozen = gridPlaceholderFrozenPresentation(tile);
      return [
        tile.id,
        placeholder,
        tileDragActive.value,
        dragSourceCell,
        frozen?.materialId ?? tile.materialId ?? null,
        frozen?.accessoryId ?? tile.accessoryId ?? null,
        frozen?.treasureAccessoryId ?? tile.treasureAccessoryId ?? null,
        frozen?.tileScoreBonus ?? (Number(tile.tileScoreBonus) || 0),
        frozen?.tileMultBonus ?? (Number(tile.letterMultBonus) || 0),
        submitTilePresentationRevision?.value ?? 0,
      ];
    }
    const shared = [
      tile.id,
      tile.materialId,
      tile.accessoryId,
      tile.treasureAccessoryId,
      tile.tileScoreBonus,
      tile.letterMultBonus,
      tile.bossTileDebuffed,
      tile.ceruleanBellLocked,
      tile.playerMarked,
      tile.bossGridBlocked,
      tile.selected,
      tileDragActive.value,
      dragSourceCell,
      placeholder,
    ];
    const ghost = gridTileVowelGhostForRender.value.get(tile.id);
    return [
      ...shared,
      gridTileLetterForRender.value.get(tile.id) ?? tile.letter,
      gridTileRarityForRender.value.get(tile.id) ?? tile.rarity,
      ghost?.prev ?? null,
      ghost?.next ?? null,
    ];
  }

  return {
    flatGrid,
    gridTileRenderLetter,
    gridTileRenderRarity,
    gridTileRenderVowelGhostPrev,
    gridTileRenderVowelGhostNext,
    gridTileRenderMemoDeps,
  };
}
