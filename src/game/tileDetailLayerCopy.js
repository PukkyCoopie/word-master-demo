/**
 * 字母块详情浮层（TileDetailLayer.vue）展示文案。
 * 动态内容通过 format* 或模板字符串拼接。
 *
 * 材质 / 棋盘配饰的**名称与规则长说明**以 `gameConceptCopy.js` 为唯一事实源；
 * 本文件仅保留浮层专用版式（稀有度区、数值兜底句式等）。
 */
import { getTileBoardAccessoryTitle, getTileMaterialBlockTitle } from "./gameConceptCopy.js";

export const tileDetailLayerCopy = {
  /** 无障碍：dialog 的 aria-label */
  ariaLabelDialog: "字母块说明",

  closeButton: "返回",

  rarity: {
    /** 稀有度区域：左侧类别名（与档位名之间的分隔见 titleBetweenKindAndTier） */
    sectionKind: "稀有度",
    titleBetweenKindAndTier: "·",
    /** 稀有度区「分数×倍率」行：总值左侧「分数」、倍率总值右侧「倍率」 */
    scoreLabel: "分数",
    multLabel: "倍率",
    /**
     * 每字母总分 × 总倍率（无障碍）
     * @param {string} totalScore
     * @param {string} totalMult
     */
    formatTotalPerLetterAria(totalScore, totalMult) {
      return `每字母：分数 ${totalScore}，倍率 ${totalMult}`;
    },
    /** 与 payload.rarity / rarityKey 对应 */
    tierLabels: {
      common: "普通",
      rare: "稀有",
      epic: "史诗",
      legendary: "传说",
    },
    /**
     * 稀有度区域正文：每字母基础分与倍率侧加成
     * @param {number|string} score
     * @param {number|string} mult
     */
    formatEffectLine(score, mult) {
      return `${score} 分 · 倍率 +${mult}`;
    },
  },

  material: {
    /** materialId 无对应概念时的标题 */
    fallbackTitle: "材质",
    /** 仅数值、多段之间的分隔 */
    numericSep: " · ",
    /** @param {number} n */
    formatNumericScore(n) {
      return `数值 +${n} 分`;
    },
    /** @param {string} signed 已含正负号的倍率片段，如 "+1" 或 "-0.5" */
    formatNumericMult(signed) {
      return `倍率 ${signed}`;
    },
  },

  accessory: {
    fallbackTitle: "配饰",
  },
};

/**
 * @param {string} rarity raw from tile
 * @returns {keyof typeof tileDetailLayerCopy.rarity.tierLabels}
 */
function normalizeRarityKey(rarity) {
  const r = String(rarity ?? "common");
  if (r === "rare" || r === "epic" || r === "legendary") return r;
  return "common";
}

/** @param {string} rarity */
export function getTileDetailRarityTierLabel(rarity) {
  const k = normalizeRarityKey(rarity);
  return tileDetailLayerCopy.rarity.tierLabels[k] ?? tileDetailLayerCopy.rarity.tierLabels.common;
}

/** @param {string} materialId */
export function getTileDetailMaterialTitle(materialId) {
  const t = getTileMaterialBlockTitle(materialId);
  return t || tileDetailLayerCopy.material.fallbackTitle;
}

/** @param {string} accessoryId */
export function getTileDetailAccessoryTitle(accessoryId) {
  const t = getTileBoardAccessoryTitle(accessoryId);
  return t || tileDetailLayerCopy.accessory.fallbackTitle;
}
