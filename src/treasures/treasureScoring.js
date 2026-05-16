import { computeWordScoreDetailed } from "../composables/useScoring.js";
import { TILE_ACCESSORY_REWIND } from "../game/tileAccessories.js";
import { TREASURE_HOOKS_BY_ID } from "./treasureRegistry.js";
import { buildTreasureLogicConditions } from "./treasureLogicShared.js";
import {
  aggregateReplaySubmitAdjustments,
  sumLetterRarityMultAddFromSlots,
  sumLetterRarityMultDeltaForLetterPart,
} from "./treasureReplaySubmitAggregate.js";
import {
  buildTileTreasureAccessoryPostLetterSteps,
  buildTreasureAccessoryPostLetterSteps,
} from "./treasureAccessoryScoring.js";

/** 新宝藏接入后请同步 `treasureCatalog.js` 的 implemented 字段；具体效果写在对应 `items/treasure_*.js`（本文件不出现具体 treasureId）。 */
/** 拼词中公式区预览用 `useScoring` 的 `computeWordScore`（无宝藏）；提交结算用 `computeWordScoreDetailedForSubmit`（棋盘光环类材质倍率由 `gridOnlyMaterialScoring.js` 的 `buildGridPresencePostLetterSteps` 提供字后乘法步；冰为入词格 ×2）。 */

/**
 * 所有字母结算完成后再触发的宝藏，按槽位从左到右排列。
 * @param {Array} tiles
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {{ rarity?: string }[]} letterParts
 * @param {number} basketballWordsSubmitted 本关已成功提交前的计数（与 bump 前一致；第 5/10/… 手为 active）
 * @param {number} remainingRemovals 提交时剩余移除次数
 * @param {Record<string, number> | null} spellCountsByLength 本轮各长度已拼次数
 * @param {number} remainingDeckCount 提交时牌库剩余字母数
 * @param {boolean} isLastSubmitChance 本手是否消耗本关内最后一次出牌机会
 * @param {number} baseLetterScoreSum 本词字母分（不含 post-letter 宝藏）
 * @param {number} lengthTableLen 与计分词长表一致的等效词长（含优惠券判定加成；与 `letterParts.length` 可不同）
 * @returns {{ treasureId: string, slotIndex: number, multAdd?: number, scoreAdd?: number, multMul?: number, moneyAdd?: number }[]}
 */
function buildPostLetterTreasureSteps(
  tiles,
  ownedSlotTreasureIds,
  letterParts,
  basketballWordsSubmitted,
  remainingRemovals,
  spellCountsByLength,
  remainingDeckCount,
  isLastSubmitChance,
  baseLetterScoreSum,
  lengthTableLen,
) {
  const slots = ownedSlotTreasureIds ?? [];
  const conditions = buildTreasureLogicConditions(tiles, letterParts);
  const lenKey = Math.max(0, Math.round(Number(lengthTableLen)) || 0) || Math.max(0, tiles?.length || 0);

  /** @type {{ treasureId: string, slotIndex: number, multAdd?: number, scoreAdd?: number, multMul?: number, moneyAdd?: number }[]} */
  const steps = [];

  for (let si = 0; si < slots.length; si++) {
    const tid = slots[si];
    if (tid == null || tid === "") continue;
    const hooks = TREASURE_HOOKS_BY_ID.get(tid);
    const step = hooks?.buildPostLetterStep?.({
      tiles,
      letterParts,
      conditions,
      basketballWordsSubmitted,
      ownedSlotTreasureIds: slots,
      remainingRemovals,
      spellCountsByLength: spellCountsByLength ?? undefined,
      remainingDeckCount,
      isLastSubmitChance,
      baseLetterScoreSum,
      lengthTableLen: lenKey,
    });
    if (step) steps.push({ treasureId: tid, slotIndex: si, ...step });
  }

  return steps;
}

/**
 * @param {{ multAdd?: number, scoreAdd?: number, multMul?: number }[]} postSteps
 */
function sumPostLetterScoreAdd(postSteps) {
  let s = 0;
  for (const st of postSteps) {
    s += Number(st.scoreAdd) || 0;
  }
  return s;
}

/**
 * 在逐槽 post-letter 步上依次做加法倍率与乘法倍率（与动画面板顺序一致）
 * @param {number} multBeforePost
 * @param {{ multAdd?: number, multMul?: number }[]} postSteps
 */
function applyPostLetterMultPipeline(multBeforePost, postSteps) {
  let M = multBeforePost;
  for (const st of postSteps) {
    const ma = Number(st.multAdd) || 0;
    const mm = Number(st.multMul) || 0;
    if (ma) M += ma;
    if (mm > 1) M *= mm;
  }
  return M;
}

function hasRewindAccessory(tile) {
  return tile?.accessoryId === TILE_ACCESSORY_REWIND;
}

function isBossDebuffedSubmitTile(tile) {
  return tile?.bossTileDebuffed === true;
}

const LUCKY_MATERIAL_MULT_ADD = 20;
const LUCKY_MATERIAL_MONEY_ADD = 20;
const LUCKY_MATERIAL_MULT_CHANCE = 1 / 5;
const LUCKY_MATERIAL_MONEY_CHANCE = 1 / 15;

/**
 * 拼词结算：在基础计分之上叠加已拥有宝藏（逐项扩展）。
 * @param {Array} tiles
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds 宝藏槽从左到右的 treasureId，空位 null（须与 UI 槽位一致）
 * @param {number} [basketballWordsSubmitted=0] 充能类计数（提交本词前；与篮球 `getBasketballChargeVisualState` 一致）
 * @param {number} [remainingRemovals=0] 提交本词时剩余移除次数
 * @param {Record<string, number> | null} [spellCountsByLength=null] 本轮各长度已拼次数
 * @param {number} [remainingDeckCount=0] 提交本词时牌库剩余字母数
 * @param {boolean} [isLastSubmitChance=false] 本手是否消耗本关内最后一次出牌机会
 * @param {Record<string, number> | null} [rarityLevelsByRarity=null] 各字母稀有度等级（common/rare/epic/legendary）
 * @param {readonly { treasureId: null, slotIndex: number, multMul: number, scoreFxGridTileIndex: number, accessoryTriggered?: boolean }[] | null} [gridPresencePostLetterSteps=null] 棋盘光环类字后倍率步（见 `gridOnlyMaterialScoring.js` 的 `buildGridPresencePostLetterSteps`）
 * @param {(string | null | undefined)[] | null} [ownedSlotTreasureAccessoryIds=null] 与槽位同索引的具名配饰 id（`treasureAccessories.js`）；空位忽略
 * @param {number} [lengthMultFactor=1] 词长倍率额外乘数（保留参数；望远镜二级在升级步生效，见 `lengthUpgradeObservatoryExtra`）
 * @param {number} [lengthJudgmentBonus=0] 计分时词长表上的额外长度（直尺券）
 * @param {{ disabledTreasureSlotIndices?: Set<number> | readonly number[], bossFlintQuarter?: boolean, lengthUpgradeObservatoryExtra?: Record<number, { score?: number, mult?: number }> | null }} [submitOptions={}]
 */
export function computeWordScoreDetailedForSubmit(
  tiles,
  ownedSlotTreasureIds,
  basketballWordsSubmitted = 0,
  remainingRemovals = 0,
  spellCountsByLength = null,
  remainingDeckCount = 0,
  isLastSubmitChance = false,
  lengthLevelsByLength = null,
  rarityLevelsByRarity = null,
  gridPresencePostLetterSteps = null,
  ownedSlotTreasureAccessoryIds = null,
  lengthMultFactor = 1,
  lengthJudgmentBonus = 0,
  submitOptions = {},
) {
  const rawSlots = ownedSlotTreasureIds ?? [];
  const dis = submitOptions?.disabledTreasureSlotIndices;
  const disabledSet =
    dis instanceof Set
      ? dis
      : Array.isArray(dis)
        ? new Set(dis.map((x) => Math.floor(Number(x))).filter((i) => i >= 0))
        : null;
  const slots = rawSlots.map((tid, si) => (disabledSet?.has(si) ? null : tid));
  const bossFlintQuarter = submitOptions?.bossFlintQuarter === true;

  const lengthUpgradeExtra = submitOptions?.lengthUpgradeObservatoryExtra ?? null;
  const base = computeWordScoreDetailed(
    tiles,
    1,
    lengthLevelsByLength,
    rarityLevelsByRarity,
    lengthMultFactor,
    lengthJudgmentBonus,
    { bossFlintQuarter, lengthUpgradeObservatoryExtra: lengthUpgradeExtra },
  );
  const conditions = buildTreasureLogicConditions(tiles, base.letterParts);
  let postLetterTreasureSteps = buildPostLetterTreasureSteps(
    tiles,
    slots,
    base.letterParts,
    basketballWordsSubmitted,
    remainingRemovals,
    spellCountsByLength,
    remainingDeckCount,
    isLastSubmitChance,
    base.scoreSum,
    base.lengthTableLen ?? tiles.length,
  );
  const accessoryRow =
    ownedSlotTreasureAccessoryIds == null
      ? slots.map(() => null)
      : slots.map((_, i) => (disabledSet?.has(i) ? null : (ownedSlotTreasureAccessoryIds[i] ?? null)));
  postLetterTreasureSteps.push(...buildTreasureAccessoryPostLetterSteps(slots, accessoryRow));
  postLetterTreasureSteps.push(...buildTileTreasureAccessoryPostLetterSteps(tiles));

  const baseHookCtx = {
    tiles,
    letterParts: base.letterParts,
    conditions,
    basketballWordsSubmitted,
    ownedSlotTreasureIds: slots,
    remainingRemovals,
    spellCountsByLength: spellCountsByLength ?? undefined,
    remainingDeckCount,
    isLastSubmitChance,
    baseLetterScoreSum: base.scoreSum,
    lengthTableLen: base.lengthTableLen ?? tiles.length,
  };
  const letterRarityTreasureMultAddTotal = sumLetterRarityMultAddFromSlots(baseHookCtx);

  let extraLetterScoringPasses = 0;
  /** 每多一轮逐字母记分前，在 UI 上对应播一次「触发宝藏」提示（与 getExtraLetterScoringPasses 次数、槽位顺序一致） */
  /** @type {{ treasureId: string, slotIndex: number }[]} */
  const extraLetterPassCueSteps = [];
  for (let si = 0; si < slots.length; si++) {
    const tid = slots[si];
    if (!tid) continue;
    const hooks = TREASURE_HOOKS_BY_ID.get(tid);
    const p = Math.max(0, Math.floor(Number(hooks?.getExtraLetterScoringPasses?.(baseHookCtx)) || 0));
    if (p <= 0) continue;
    extraLetterScoringPasses += p;
    for (let k = 0; k < p; k++) {
      extraLetterPassCueSteps.push({ treasureId: tid, slotIndex: si });
    }
  }

  const treasureReplayCounts = base.letterParts.map((_, i) =>
    isBossDebuffedSubmitTile(tiles[i]) ? 0 : extraLetterScoringPasses,
  );
  for (const tid of slots) {
    if (!tid) continue;
    const hooks = TREASURE_HOOKS_BY_ID.get(tid);
    if (!hooks?.getLetterReplayCountForLetter) continue;
    for (let i = 0; i < base.letterParts.length; i++) {
      if (isBossDebuffedSubmitTile(tiles[i])) continue;
      const part = base.letterParts[i];
      const n = Math.max(0, Math.floor(Number(hooks.getLetterReplayCountForLetter(baseHookCtx, part, i)) || 0));
      if (n > 0) treasureReplayCounts[i] += n;
    }
  }
  /**
   * 「重播配饰」按触发性质叠加：
   * - 固定给字母自身 +1 次；
   * - 若存在整词额外 replay 轮（如号角），每一轮该字母也会再额外 +1 次；
   * - 不会把「按字母额外次数」再次放大（与宝藏按字母加次关系为相加）。
   */
  const accessoryReplayCounts = base.letterParts.map((_, i) =>
    isBossDebuffedSubmitTile(tiles[i])
      ? 0
      : hasRewindAccessory(tiles[i])
        ? 1 + extraLetterScoringPasses
        : 0,
  );
  const replayCounts = treasureReplayCounts.map((v, i) => v + accessoryReplayCounts[i]);

  const letterReplayExtraCounts = replayCounts.map((v) =>
    Math.max(0, (Math.floor(Number(v) || 0) || 0) - extraLetterScoringPasses),
  );

  let replayScoreAdd = 0;
  let replayLetterMultAdd = 0;
  let replayRarityTreasureMultAdd = 0;
  for (let i = 0; i < base.letterParts.length; i++) {
    if (isBossDebuffedSubmitTile(tiles[i])) continue;
    const k = replayCounts[i] || 0;
    if (k <= 0) continue;
    const part = base.letterParts[i];
    replayScoreAdd += (Number(part.baseScore) || 0) * k;
    replayLetterMultAdd += (Number(part.letterMultBonus) || 0) * k;
    replayRarityTreasureMultAdd += sumLetterRarityMultDeltaForLetterPart(slots, part) * k;
  }

  const replayCtx = { ...baseHookCtx, letterReplayCounts: replayCounts };
  for (let si = 0; si < slots.length; si++) {
    const tid = slots[si];
    if (!tid) continue;
    const hooks = TREASURE_HOOKS_BY_ID.get(tid);
    const step = hooks?.buildPostLetterReplayStep?.(replayCtx);
    if (step) postLetterTreasureSteps.push({ treasureId: tid, slotIndex: si, ...step });
  }

  const { flatScoreAdd: perLetterTreasureFlatScoreAdd, flatMultAdd: perLetterTreasureFlatMultAdd } =
    aggregateReplaySubmitAdjustments({
      letterParts: base.letterParts,
      ownedSlotTreasureIds: slots,
      replayCounts,
    });

  const gridPresenceSteps = gridPresencePostLetterSteps ?? [];
  for (const st of gridPresenceSteps) {
    const idx = st?.scoreFxGridTileIndex;
    const mm = Number(st?.multMul) || 0;
    if (idx == null || !Number.isFinite(idx) || idx < 0 || mm <= 1) continue;
    postLetterTreasureSteps.push({
      treasureId: null,
      slotIndex: -1,
      multMul: mm,
      scoreFxGridTileIndex: Math.floor(idx),
      accessoryTriggered: !!st.accessoryTriggered,
    });
  }

  // 冰材质：仅当该字母位于本次提交单词中并被计分时，才触发 x2（含 replay 轮次）。
  for (let i = 0; i < tiles.length; i++) {
    if (isBossDebuffedSubmitTile(tiles[i])) continue;
    if (tiles[i]?.materialId !== "ice") continue;
    const triggerCount = 1 + Math.max(0, Math.floor(Number(replayCounts[i]) || 0));
    for (let k = 0; k < triggerCount; k++) {
      postLetterTreasureSteps.push({
        treasureId: null,
        slotIndex: -1,
        multMul: 2,
        scoreFxWordSlotIndex: i,
      });
    }
  }

  /** 存在字后「倍率乘法」步时，幸运材质的平面倍率加法须仍在乘法之后结算，保持与动画面板一致。 */
  const hasPostLetterMultMul = postLetterTreasureSteps.some((st) => (Number(st.multMul) || 0) > 1);

  /** 幸运材质：每字母每次计分（含 replay）各掷一次；金币并入该字母逐字动效，倍率加法在无字后乘法步时并入该次倍率 wobble。 */
  /** @type {{ multAdd: number, moneyAdd: number }[][]} */
  const luckyMaterialRollsByLetter = tiles.map(() => []);
  let luckyMaterialMultAddTotal = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (isBossDebuffedSubmitTile(tiles[i])) continue;
    if (tiles[i]?.materialId !== "lucky") continue;
    const triggerCount = 1 + Math.max(0, Math.floor(Number(replayCounts[i]) || 0));
    for (let k = 0; k < triggerCount; k++) {
      let multAdd = 0;
      if (Math.random() < LUCKY_MATERIAL_MULT_CHANCE) multAdd = LUCKY_MATERIAL_MULT_ADD;
      let moneyAdd = 0;
      if (Math.random() < LUCKY_MATERIAL_MONEY_CHANCE) moneyAdd = LUCKY_MATERIAL_MONEY_ADD;
      luckyMaterialRollsByLetter[i].push({ multAdd, moneyAdd });
      luckyMaterialMultAddTotal += multAdd;
    }
  }

  if (hasPostLetterMultMul) {
    for (let i = 0; i < tiles.length; i++) {
      for (const r of luckyMaterialRollsByLetter[i]) {
        if (r.multAdd > 0) {
          postLetterTreasureSteps.push({
            treasureId: null,
            slotIndex: -1,
            multAdd: r.multAdd,
            scoreFxWordSlotIndex: i,
          });
        }
      }
    }
  }

  const multBeforePostLetterTreasures =
    base.multTotal +
    letterRarityTreasureMultAddTotal +
    replayLetterMultAdd +
    replayRarityTreasureMultAdd +
    perLetterTreasureFlatMultAdd;

  const postLetterScoreAdd =
    sumPostLetterScoreAdd(postLetterTreasureSteps) + replayScoreAdd + perLetterTreasureFlatScoreAdd;
  const scoreSumForSubmit = base.scoreSum + postLetterScoreAdd;

  const multTotal =
    applyPostLetterMultPipeline(multBeforePostLetterTreasures, postLetterTreasureSteps) +
    (hasPostLetterMultMul ? 0 : luckyMaterialMultAddTotal);
  const finalScore = Math.round(scoreSumForSubmit * multTotal * base.treasureMultiplier);

  return {
    ...base,
    scoreSum: scoreSumForSubmit,
    multTotal,
    finalScore,
    postLetterTreasureSteps,
    hasPostLetterMultMul,
    luckyMaterialRollsByLetter,
    letterReplayExtraCounts,
    /** 提交记分动画中逐字母高亮/加分的轮数（含首遍，至少为 1） */
    letterScoringPassCount: 1 + extraLetterScoringPasses,
    extraLetterPassCueSteps,
  };
}
