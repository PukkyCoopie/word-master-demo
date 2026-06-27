import { computeWalletInterest } from "../constants.js";
import { getPresetSettlementMode, presetDisablesInterest } from "./runPresetRuntime.js";
import { getEconomyInterestCap } from "../vouchers/voucherRuntime.js";

/** @typedef {'default' | 'convertRemainsNoInterest'} SettlementMode */

/**
 * @typedef {Object} SettlementSnapshot
 * @property {SettlementMode | 'default'} mode
 * @property {number} moneyBefore
 * @property {number} clearReward
 * @property {number} spareMoves
 * @property {number} spareWordsReward
 * @property {number} spareDiscardsReward
 * @property {number} interest
 * @property {number} [extraInterest] 账本等：常规利息之外的等额追加（默认 0）
 * @property {number} rentalDeduction
 * @property {number} total
 */

/**
 * @typedef {Object} SettlementDisplayRow
 * @property {string} key
 * @property {string} label
 * @property {string} countKey
 * @property {boolean} [isTotal]
 */

/**
 * @param {Object} input
 * @param {number} input.moneyBefore
 * @param {number} input.clearReward
 * @param {number} input.remainingWords
 * @param {number} input.remainingRemovals
 * @param {number} input.rentalTreasureCount
 * @param {string} input.runPresetId
 * @param {string[]} input.ownedVoucherIds
 * @param {(string | null | undefined)[]} [input.ownedSlotTreasureIds]
 * @returns {SettlementSnapshot}
 */
export function buildSettlementSnapshot(input) {
  const moneyBefore = input.moneyBefore;
  const clearReward = input.clearReward;
  const rentalDeduction = Math.max(0, Math.round(Number(input.rentalTreasureCount) || 0)) * 3;
  const mode = getPresetSettlementMode(input.runPresetId);
  if (mode === "convertRemainsNoInterest") {
    const spareWordsReward = Math.max(0, input.remainingWords) * 2;
    const spareDiscardsReward = Math.max(0, input.remainingRemovals);
    const interest = 0;
    const extraInterest = 0;
    const total =
      clearReward + spareWordsReward + spareDiscardsReward + interest + extraInterest - rentalDeduction;
    return {
      mode,
      moneyBefore,
      clearReward,
      spareWordsReward,
      spareDiscardsReward,
      spareMoves: 0,
      interest,
      extraInterest,
      rentalDeduction,
      total,
    };
  }
  const spareMoves = input.remainingWords;
  const cap = presetDisablesInterest(input.runPresetId)
    ? 0
    : getEconomyInterestCap(input.ownedVoucherIds);
  const interest = presetDisablesInterest(input.runPresetId)
    ? 0
    : computeWalletInterest(moneyBefore, cap);
  const ownsLedger = (input.ownedSlotTreasureIds ?? []).some((id) => String(id ?? "") === "124");
  const extraInterest = ownsLedger && interest > 0 ? interest : 0;
  const total = clearReward + spareMoves + interest + extraInterest - rentalDeduction;
  return {
    mode: "default",
    moneyBefore,
    clearReward,
    spareMoves,
    spareWordsReward: 0,
    spareDiscardsReward: 0,
    interest,
    extraInterest,
    rentalDeduction,
    total,
  };
}

/**
 * @param {SettlementSnapshot | null | undefined} snapshot
 * @returns {SettlementDisplayRow[]}
 */
export function buildSettlementDisplayRows(snapshot) {
  if (!snapshot) return [];
  if (snapshot.mode === "convertRemainsNoInterest") {
    const rows = [
      { key: "clear", label: "关卡奖励", countKey: "clearReward" },
      { key: "spareWords", label: "剩余拼写", countKey: "spareWordsReward" },
      { key: "spareDiscards", label: "剩余丢弃", countKey: "spareDiscardsReward" },
      { key: "interest", label: "利息", countKey: "interest" },
    ];
    if ((snapshot.rentalDeduction ?? 0) > 0) {
      rows.push({ key: "rental", label: "租赁扣费", countKey: "rentalDeduction" });
    }
    rows.push({ key: "total", label: "本关共计", countKey: "total", isTotal: true });
    return rows;
  }
  const rows = [
    { key: "clear", label: "关卡奖励", countKey: "clearReward" },
    { key: "spare", label: "剩余次数", countKey: "spareMoves" },
    { key: "interest", label: "利息", countKey: "interest" },
  ];
  if ((snapshot.extraInterest ?? 0) > 0) {
    rows.push({ key: "extraInterest", label: "额外利息", countKey: "extraInterest" });
  }
  if ((snapshot.rentalDeduction ?? 0) > 0) {
    rows.push({ key: "rental", label: "租赁扣费", countKey: "rentalDeduction" });
  }
  rows.push({ key: "total", label: "本关共计", countKey: "total", isTotal: true });
  return rows;
}

/**
 * @param {SettlementSnapshot | null | undefined} snapshot
 * @param {{ countKey: string }} row
 */
export function settlementCountForRow(snapshot, row) {
  if (!snapshot) return 0;
  return Math.round(Number(snapshot[row.countKey]) || 0);
}

export const SETTLEMENT_TOTAL_SHRINK_START = 15;
export const SETTLEMENT_TOTAL_SHRINK_FULL_AT = 30;
export const SETTLEMENT_TOTAL_MIN_SCALE = 0.6;

/**
 * @param {number} rawTotalAnim
 */
export function computeSettlementTotalScale(rawTotalAnim) {
  const count = Math.abs(Math.round(Number(rawTotalAnim) || 0));
  if (count <= SETTLEMENT_TOTAL_SHRINK_START) return 1;
  const span = Math.max(1, SETTLEMENT_TOTAL_SHRINK_FULL_AT - SETTLEMENT_TOTAL_SHRINK_START);
  const t = Math.min(1, (count - SETTLEMENT_TOTAL_SHRINK_START) / span);
  return 1 - (1 - SETTLEMENT_TOTAL_MIN_SCALE) * t;
}

/**
 * @param {number} rawTotalAnim
 */
export function settlementTotalNeedsWrap(rawTotalAnim) {
  const count = Math.abs(Math.round(Number(rawTotalAnim) || 0));
  return count > SETTLEMENT_TOTAL_SHRINK_FULL_AT;
}
