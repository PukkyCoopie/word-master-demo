/** 已拥有宝藏数超过此阈值时启用叠放模式（>9 即 10 个起叠放） */
export const TREASURE_BAR_STACK_FILL_THRESHOLD = 9;

/** 叠放卡面尺寸参考：与非叠放「该行均分 N 槽」一致 */
export const TREASURE_BAR_STACK_REFERENCE_SLOT_COUNT = 10;

/** 非叠放宝藏栏槽间距（rpx），同 `.treasure-slots` gap */
export const TREASURE_BAR_SLOT_GAP_RPX = 8;

/** 叠放模式 CSS 回退格宽（rpx）；运行时由 `--treasure-stack-card-size` 覆盖 */
export const TREASURE_STACK_CARD_SIZE_RPX = 108;

/** 展开按钮占位宽度（rpx） */
export const TREASURE_STACK_EXPAND_BTN_RPX = 52;

/** 叠放行内槽位与展开按钮间距（rpx） */
export const TREASURE_STACK_ROW_GAP_RPX = 6;

/**
 * @param {number} filledCount
 */
export function isTreasureBarStackMode(filledCount) {
  return Math.max(0, Math.floor(Number(filledCount) || 0)) > TREASURE_BAR_STACK_FILL_THRESHOLD;
}

/**
 * @param {readonly (object | null)[]} slots
 */
export function countFilledTreasureSlots(slots) {
  if (!Array.isArray(slots)) return 0;
  return slots.filter(Boolean).length;
}

/**
 * 叠放单卡边长（px）：与栏内「参考槽位数均分」一致。
 *
 * @param {object} opts
 * @param {number} opts.containerWidthPx 栏内容区宽（已扣 padding）
 * @param {number} [opts.referenceSlotCount=10]
 * @param {number} [opts.slotGapPx=0]
 */
export function computeStackCardSizePx({
  containerWidthPx,
  referenceSlotCount = TREASURE_BAR_STACK_REFERENCE_SLOT_COUNT,
  slotGapPx = 0,
}) {
  const n = Math.max(1, Math.floor(Number(referenceSlotCount) || 1));
  const gap = Math.max(0, Number(slotGapPx) || 0);
  const avail = Math.max(1, Number(containerWidthPx) || 0);
  return Math.max(1, (avail - (n - 1) * gap) / n);
}

/**
 * 叠放模式横向步长（px）：在叠放区宽度内均匀排布（末卡右缘对齐 avail），
 * 宝藏越多 step 越小，可叠至完全重合（step=0）。
 *
 * @param {object} opts
 * @param {number} opts.slotCount 栏内总槽位数（含空槽）
 * @param {number} opts.containerWidthPx
 * @param {number} opts.cardWidthPx
 * @param {number} [opts.expandBtnWidthPx=0]
 * @param {number} [opts.rowGapPx=0]
 */
export function computeStackStepPx({
  slotCount,
  containerWidthPx,
  cardWidthPx,
  expandBtnWidthPx = 0,
  rowGapPx = 0,
}) {
  const n = Math.max(0, Math.floor(Number(slotCount) || 0));
  const cardW = Math.max(1, Number(cardWidthPx) || 1);
  const avail = Math.max(
    cardW,
    (Number(containerWidthPx) || 0) -
      (Number(expandBtnWidthPx) || 0) -
      (Number(rowGapPx) || 0),
  );
  if (n <= 1) return cardW;

  const ideal = (avail - cardW) / (n - 1);
  return Math.max(0, ideal);
}

/**
 * 叠放区域可用宽度（px）。
 *
 * @param {object} opts
 * @param {number} opts.containerWidthPx
 * @param {number} opts.cardWidthPx
 * @param {number} [opts.expandBtnWidthPx=0]
 * @param {number} [opts.rowGapPx=0]
 */
export function computeStackAvailWidthPx({
  containerWidthPx,
  cardWidthPx,
  expandBtnWidthPx = 0,
  rowGapPx = 0,
}) {
  const cardW = Math.max(1, Number(cardWidthPx) || 1);
  return Math.max(
    cardW,
    (Number(containerWidthPx) || 0) -
      (Number(expandBtnWidthPx) || 0) -
      (Number(rowGapPx) || 0),
  );
}

/**
 * @param {number} filledCount
 * @param {number} slotCount
 * @param {string} fiveAtFourClass
 */
export function resolveTreasureSlotsLayoutClass(filledCount, slotCount, fiveAtFourClass = "") {
  if (isTreasureBarStackMode(filledCount)) return "treasure-slots--stack";
  if (slotCount === 4 && fiveAtFourClass) return fiveAtFourClass;
  return "";
}
