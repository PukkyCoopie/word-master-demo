/**
 * 碎冰块：仅当该字母位于本次提交单词中并被计分时，才触发乘法倍率（含 replay 轮次）。
 * 与 `gridOnlyMaterialScoring.js` 的棋盘光环类材质分列。
 */

/** 入词碎冰块每次计分触发的乘法倍率 */
export const ICE_MATERIAL_SCORE_MULT_MUL = 2.5;

/**
 * @param {{ materialIce?: boolean } | null | undefined} step
 */
export function isIceMaterialPostLetterStep(step) {
  return step?.materialIce === true;
}

/**
 * @param {readonly unknown[]} tiles
 * @param {readonly number[]} replayCounts
 * @param {(tile: unknown) => boolean} isBossDebuffedSubmitTile
 */
export function buildIceMaterialPostLetterSteps(tiles, replayCounts, isBossDebuffedSubmitTile) {
  /** @type {{ treasureId: null, slotIndex: number, multMul: number, scoreFxWordSlotIndex: number, materialIce: true }[]} */
  const steps = [];
  for (let i = 0; i < tiles.length; i++) {
    if (isBossDebuffedSubmitTile(tiles[i])) continue;
    if (tiles[i]?.materialId !== "ice") continue;
    const triggerCount = 1 + Math.max(0, Math.floor(Number(replayCounts[i]) || 0));
    for (let k = 0; k < triggerCount; k++) {
      steps.push({
        treasureId: null,
        slotIndex: -1,
        multMul: ICE_MATERIAL_SCORE_MULT_MUL,
        scoreFxWordSlotIndex: i,
        materialIce: true,
      });
    }
  }
  return steps;
}

/**
 * 拼词预览：本次入词冰字母各叠一层乘法倍率。
 * @param {readonly { materialId?: string | null, bossTileDebuffed?: boolean }[]} tiles
 */
export function previewIceMaterialMultProduct(tiles) {
  let mul = 1;
  for (const t of tiles) {
    if (t?.materialId !== "ice" || t?.bossTileDebuffed) continue;
    mul *= ICE_MATERIAL_SCORE_MULT_MUL;
  }
  return mul;
}
