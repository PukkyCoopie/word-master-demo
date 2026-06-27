import { formatCompactUpToTwoDecimals } from "../components/detailLayerFormatters.js";
import {
  RARITY_UPGRADE_BALANCE,
  getLengthUpgradeStepAdds,
} from "../composables/useScoring.js";
import {
  getRarityMergePartner,
  hasRarityTierMerge,
} from "../game/treasureRarityTierMerge.js";
import { UPGRADE_RARITY_LETTER_LABEL } from "./shopOfferRowBuilders.js";

/** 升级卡详情：小数倍率时的取整说明分区正文 */
export const UPGRADE_PREVIEW_ROUNDING_RULES_TEXT =
  "分数和倍率会以整数形式参加计算，但会保留来自升级提供的小数数值";

/**
 * @typedef {object} UpgradePreviewGainRow
 * @property {string} label
 * @property {number} scoreRaw
 * @property {number} multRaw
 * @property {string} scoreDisplay
 * @property {string} multDisplay
 * @property {boolean} hasDecimal
 */

function isEffectivelyInteger(n) {
  const v = Number(n);
  return Number.isFinite(v) && Math.abs(v - Math.round(v)) < 1e-6;
}

/**
 * @param {number} scoreRaw
 * @param {number} multRaw
 * @returns {UpgradePreviewGainRow}
 */
function buildGainRow(label, scoreRaw, multRaw) {
  const score = Math.max(0, Number(scoreRaw) || 0);
  const mult = Math.max(0, Number(multRaw) || 0);
  return {
    label,
    scoreRaw: score,
    multRaw: mult,
    scoreDisplay: String(Math.round(score)),
    multDisplay: formatCompactUpToTwoDecimals(mult),
    hasDecimal: !isEffectivelyInteger(score) || !isEffectivelyInteger(mult),
  };
}

/**
 * 升级卡详情：描述框内「下一级提升」行（含分数×倍率展示值）。
 * @param {object | null | undefined} offer
 * @param {(string | null | undefined)[] | null | undefined} [ownedSlotTreasureIds]
 * @returns {UpgradePreviewGainRow[]}
 */
export function buildUpgradeOfferPreviewGainRows(offer, ownedSlotTreasureIds = null) {
  if (!offer || offer.offerType !== "upgrade") return [];

  if (offer.upgradeKind === "rarity") {
    const rk = String(offer.rarityKey ?? offer.letterRarity ?? "common").trim() || "common";
    const merged = hasRarityTierMerge(ownedSlotTreasureIds);
    /** @type {UpgradePreviewGainRow[]} */
    const rows = [];
    const pushRarityRow = (rarityKey) => {
      const cfg = RARITY_UPGRADE_BALANCE[rarityKey];
      const zh = UPGRADE_RARITY_LETTER_LABEL[rarityKey] ?? rarityKey;
      const label = merged ? `「${zh}」下一级提升：` : "下一级提升：";
      rows.push(
        buildGainRow(label, Number(cfg?.scorePerLevel) || 0, Number(cfg?.multPerLevel) || 0),
      );
    };
    pushRarityRow(rk);
    if (merged) {
      const partner = getRarityMergePartner(rk);
      if (partner) pushRarityRow(partner);
    }
    return rows;
  }

  const minLen = Math.max(3, Math.min(16, Math.round(Number(offer.lengthMin)) || 3));
  const maxLen = Math.max(minLen, Math.min(16, Math.round(Number(offer.lengthMax)) || minLen));
  const multiLength = maxLen > minLen;
  /** @type {UpgradePreviewGainRow[]} */
  const rows = [];
  for (let len = minLen; len <= maxLen; len += 1) {
    const { scoreAdd, multAdd } = getLengthUpgradeStepAdds(len);
    const label = multiLength ? `长度${len}提升` : `下一级长度${len}提升`;
    rows.push(buildGainRow(label, scoreAdd, multAdd));
  }
  return rows;
}

/**
 * @param {UpgradePreviewGainRow[]} rows
 */
export function upgradeOfferPreviewHasDecimalGains(rows) {
  return Array.isArray(rows) && rows.some((row) => row.hasDecimal);
}
