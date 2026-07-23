import { ref, nextTick } from "vue";
import gsap from "gsap";
import { EASE_TRANSFORM } from "../../constants.js";
import { animSleep } from "../../settings/animationSpeed.js";
import { scoringSleep } from "../../game/submitScoringTiming.js";
import { cloneGridDeep, restoreGridFromDeepClone } from "../../game/spellTileAppearanceAnim.js";
import { diffGridAppearanceTargets } from "../../game/spellTileAppearanceAnim.js";
import { mountLetterTileClone } from "../../game/mountLetterTileClone.js";
import { animatePackTileFlyToDeck } from "../../game/shopOfferFlyAnim.js";
import { BACKDROP_SELF_CLOSE_GUARD_MS } from "../../game/backdropSelfCloseGuard.js";
import {
  isRandomDeckRemoveSpell,
  isSpellOfferRandomPickOneSpell,
} from "../../game/spellOfferRandomPickAnim.js";
import { snapshotMaxIntrinsicGainsFromTile } from "../../game/tileIntrinsicGains.js";
import {
  runSpellTileAppearanceAnim,
  SPELL_TILE_REMOVE_GROW_DUR_S,
} from "../../game/spellTileAppearanceAnim.js";
import {
  applySpell,
  getSpellTileAppearanceTargets,
  buildSpellAnimPickTargetsFromOrdered,
  resolveStarSpellOutcome,
  applyStarSpellOutcome,
} from "../../spells/spellRuntime.js";
import {
  resolveSpellPickCount,
  resolveSpellPickMode,
  shouldOpenSpellTargetLayer,
  shouldOpenInRunSpellPreview,
  getSpellDefinition,
} from "../../spells/spellDefinitions.js";
import { buildSpellOfferSlotsFromPool } from "../../spells/spellOfferSlots.js";
import { pickDiceChainSpellIds } from "../../spells/spellInRunPool.js";
import { buildSpellOfferPreviewFromId } from "../../spells/spellReplayUi.js";
import {
  resolveRestartEffectiveSpellId,
  resolveSpellFlowEffectiveId,
} from "../../game/inRunGrantFlow.js";
import { noteTreasureRunSpellCast } from "../../treasures/treasureRunTracking.js";
import { isLengthObservatoryBoosted } from "../../vouchers/voucherRuntime.js";
import {
  rollRandomUpgradePicks,
  buildRandomUpgradeAnimPayload,
  getBeforeLevelForRandomUpgradePick,
  applyRandomUpgradePick,
} from "../../shop/randomUpgradeRoll.js";
import { UPGRADE_LENGTH_GROUPS } from "../../shop/shopOfferRowBuilders.js";
import {
  LEVEL_COMPLETE_MONEY_FX_OUTRO_WAIT_MS,
  SCORING_BUBBLE_POP_DELAY_MS,
  SCORING_TREASURE_FALLBACK_MS,
} from "../../game/scoreBubbleFx.js";

/** @typedef {import('../runSessionTypes.js').SpellCastController} SpellCastController */

export function createSpellCastStateRefs() {
  return {
    lastReplayableSpellId: ref(/** @type {string | null} */ (null)),
    spellCastHistory: ref(/** @type {string[]} */ ([])),
    spellTargetSession: ref(null),
    pendingSpellTileAppearanceAnim: ref(null),
  };
}

/**
 * 法术选格 session、confirm/cancel、棋盘/字母库交互（任务 6.2）。
 *
 * @param {object} options
 * @returns {SpellCastController}
 */
export function useSpellCastController(options) {
  const {
    state,
    gates,
    phase,
    grid: gridApi,
    run,
    treasureDetail,
    spellReferencePreview,
    dom,
    shop,
    packPick,
    fx: fxApi,
    callbacks,
    sleep,
  } = options;

  const {
    lastReplayableSpellId,
    spellCastHistory,
    spellTargetSession,
    pendingSpellTileAppearanceAnim,
  } = state;

  const { shopOverlayLayersSuppressed } = gates;
  const { getShowShop } = phase;
  const {
    grid,
    deck,
    initialDeckSnapshot,
    ROWS,
    COLS,
    touchGrid,
    syncTileStateToDeckCard,
    refreshGridTileBaseScoresFromLevels,
    lengthLevelsByLength,
    rarityLevelsByRarity,
    spellCountsByLength,
    setWordLengthLevel,
    bumpWordLengthLevel,
    markTileAsWildcard,
    removeDeckLetterInstancesByRaws,
    shiftDeckCardsBackByUids,
    removeDeckCardsForSubmittedWord,
    removeDeckCardByUid,
    appendShopDeckEntries,
    remapTileFromRawLetter,
    setRunWordLengthJudgmentPenalty,
  } = gridApi;
  const {
    money,
    ownedTreasures,
    ownedVoucherIds,
    treasureRunState,
    runRandom,
    runPresetId,
  } = run;

  let spellPreviewFlowResolve =
    /** @type {null | ((r: import("../../game/inRunGrantFlow.js").SpellPreviewFlowResult) => void)} */ (
      null
    );
  let spellGrantDetailResolve =
    /** @type {null | ((r: import("../../game/inRunGrantFlow.js").SpellPreviewFlowResult) => void)} */ (
      null
    );
  let spellGrantDetailOpenGuardUntil = 0;
  /** @type {null | {
   *   purchasedSpellId: string,
   *   context: 'shop' | 'inRun',
   *   offerDeckSource: 'fullDeck' | 'remainingDeck',
   *   overrides: Record<string, unknown>,
   * }} */
  let spellGrantDetailPending = null;

async function wobbleGameTreasureSlots(slotIndices) {
  shopOverlayLayersSuppressed.value = true;
  await nextTick();
  try {
    for (const ix of slotIndices) {
      if (typeof ix === "number" && ix >= 0) await fxApi.wobbleGameTreasureSlot(ix);
      await sleep(SPELL_TREASURE_WOBBLE_GAP_MS);
    }
  } finally {
    shopOverlayLayersSuppressed.value = false;
  }
}

const SPELL_TREASURE_WOBBLE_GAP_MS = 189;

/**
 * @param {number[]} slotIndices
 * @param {number} flyCount
 */
async function animateSpellDeckAddsFromOfferSlots(slotIndices, flyCount) {
  const deckBtn = dom.getDeckBtn();
  if (!deckBtn || !slotIndices.length || flyCount <= 0) return;
  const layer = dom.getSpellTargetLayer();
  const n = Math.min(flyCount, slotIndices.length);
  for (let i = 0; i < n; i++) {
    const el = layer?.getOfferTileEl?.(slotIndices[i]) ?? null;
    if (el) await animatePackTileFlyToDeck(el, deckBtn);
  }
}

/** 对局内无选格法术：在顶栏计分板播升级动效（与商店同款流程） */
async function playInstantSpellInRunFx(effectiveSpellId) {
  const sid = String(effectiveSpellId ?? "");
  if (sid === "arrow_up") {
    const levelRefs = { rarityLevelsByRarity, lengthLevelsByLength };
    const obsFn = (len) => isLengthObservatoryBoosted(ownedVoucherIds.value, len, spellCountsByLength.value);
    const picks = rollRandomUpgradePicks(UPGRADE_LENGTH_GROUPS, 2, runRandom);
    const steps = picks.map((pick) => ({
      payload: buildRandomUpgradeAnimPayload(
        pick,
        getBeforeLevelForRandomUpgradePick(pick, levelRefs),
        obsFn,
      ),
      apply: () => {
        applyRandomUpgradePick(pick, buildSpellRuntimeContext());
        callbacks.noteCollectionUpgradeFromRandomPick(pick);
        if (pick.kind === "rarity") refreshGridTileBaseScoresFromLevels();
      },
    }));
    await shop.runInRunUpgradePlaybackSteps(steps);
    refreshGridTileBaseScoresFromLevels();
    return;
  }
  if (sid === "eclipse_length") {
    await shop.runInRunUpgradePlaybackSteps(shop.buildEclipseLengthUpgradeSteps());
    refreshGridTileBaseScoresFromLevels();
    return;
  }
  if (sid === "eclipse_rarity") {
    await shop.runInRunUpgradePlaybackSteps(shop.buildEclipseRarityUpgradeSteps());
    refreshGridTileBaseScoresFromLevels();
  }
}

/**
 * 无选格层的幻灵/升级类法术：在商店内播升级或宝藏动效。
 * @param {string} effectiveSpellId
 */
async function playInstantSpellShopFx(effectiveSpellId) {
  const sid = String(effectiveSpellId ?? "");
  if (sid === "arrow_up") {
    await shop.playArrowUpShopUpgradeSequence({ restoreLayersAfter: false });
    return;
  }
  if (sid === "eclipse_length") {
    await shop.playEclipseLengthUpgradeSequence();
    return;
  }
  if (sid === "eclipse_rarity") {
    await shop.playEclipseRarityUpgradeSequence();
    return;
  }
}

const IMMOLATE_SPELL_REWARD = 15;

/** 星星未命中：wobble +「没有！」气泡结束后再留一拍，再关预览层 */
const STAR_SPELL_MISS_POST_FX_HOLD_MS = 300;

/** 火柴：候选格 stagger 放大→缩没（与「删除」同款）→ 法术图标弹出 $15 气泡 */
async function playImmolateConfirmFxOnOfferSlots(
  slotIndices,
  oldSnaps,
  applySpellFn,
  buildNewSnapsAfterApply,
) {
  const layer = dom.getSpellTargetLayer();
  if (!layer || !slotIndices.length || oldSnaps.length !== slotIndices.length) return false;

  const iconEl = layer.getSpellIconEl?.();
  const bubbleAnchor =
    iconEl instanceof HTMLElement
      ? iconEl
      : layer.getOfferTileEl?.(slotIndices[0]);

  const sp = 1;
  const showMoneyBubble = () => {
    const bubble = fxApi.showScoreBubble(
      bubbleAnchor,
      fxApi.formatMoneyBubbleLabel(IMMOLATE_SPELL_REWARD),
      "money",
      sp,
      fxApi.bumpOverlayZ(),
    );
    fxApi.scheduleSmallPlusBubbleOutro(bubble, sp);
  };

  const animPromise = playSpellConfirmAnimOnOfferSlots(
    "immolate",
    slotIndices,
    oldSnaps,
    applySpellFn,
    buildNewSnapsAfterApply,
  );

  await animSleep(Math.round(SPELL_TILE_REMOVE_GROW_DUR_S * 1000));
  showMoneyBubble();

  const ok = await animPromise;
  if (!ok) return false;
  await animSleep(LEVEL_COMPLETE_MONEY_FX_OUTRO_WAIT_MS);
  return true;
}

/** 星星法术未命中：预览区 shop-treasure-visual wobble 与红色「没有！」气泡同拍，结束后留短后摇 */
async function playStarSpellMissFxOnVisual(visualEl) {
  if (!(visualEl instanceof HTMLElement)) {
    await animSleep(STAR_SPELL_MISS_POST_FX_HOLD_MS);
    return;
  }
  const sp = 1;
  const wobbleTl = fxApi.createWobbleScoreSlotTimeline(visualEl);
  if (wobbleTl) {
    wobbleTl.timeScale(sp);
  }
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  const bubble = fxApi.showScoreBubble(visualEl, "没有！", "star-miss", sp, fxApi.bumpOverlayZ());
  if (bubble) fxApi.scheduleSmallPlusBubbleOutro(bubble, sp);
  if (wobbleTl) {
    await fxApi.awaitWobbleScoreSlotTimeline(wobbleTl);
  }
  await animSleep(STAR_SPELL_MISS_POST_FX_HOLD_MS);
}

/** 星星命中：宝藏槽缩小→谷底写入配饰→回弹（与法术材质切换同款） */
async function playStarSpellAccessoryGrantFx(outcome) {
  if (!outcome?.ok) return;
  const slotEl = await fxApi.waitForOwnedTreasureSlotEl(outcome.slotIndex);
  const ctx = buildSpellRuntimeContext();
  if (!slotEl) {
    applyStarSpellOutcome(ctx, outcome);
    return;
  }
  await fxApi.runDetachedTileShrinkReplacePop({
    el: slotEl,
    onMidReplace: () => {
      applyStarSpellOutcome(ctx, outcome);
    },
  });
}

/**
 * 星星直接结算：在详情预览层判定；失败则预览区反馈后关闭，成功则先关层再播宝藏动效。
 */
async function fulfillStarSpellDirectSettle() {
  const ctx = buildSpellRuntimeContext();
  const outcome = resolveStarSpellOutcome(ctx, runRandom);
  const layer = dom.getTreasureDetailLayer();
  const starVisual = layer?.getTargetVisualEl?.() ?? layer?.getFlyFrameEl?.();

  if (!outcome.ok) {
    await playStarSpellMissFxOnVisual(starVisual);
    await layer?.playClose?.();
    treasureDetail.value = null;
  } else {
    await layer?.playClose?.();
    treasureDetail.value = null;
    await nextTick();
    await playStarSpellAccessoryGrantFx(outcome);
  }
  noteSpellCastForReplay("star");
  callbacks.scheduleRunAutoSave();
  return { confirmed: true, skipped: false };
}

/**
 * @param {Record<string, unknown> | null} spellFx
 * @param {string} effectiveSpellId
 */
async function playSpectralSpellResultFx(spellFx, effectiveSpellId) {
  void effectiveSpellId;
  const fx = spellFx && typeof spellFx === "object" ? spellFx : null;
  if (isTreasureGrantSpellFx(fx)) {
    shopOverlayLayersSuppressed.value = true;
    try {
      await fxApi.playTreasureGrantPopAtSlotIndex(fx.slotIndex, {
        slotsExpanded: fx.slotsExpanded === true,
      });
    } finally {
      shopOverlayLayersSuppressed.value = false;
    }
    return;
  }
  if (fx?.kind === "treasure_accessory" && typeof fx.slotIndex === "number") {
    await wobbleGameTreasureSlots([fx.slotIndex]);
    return;
  }
  if (fx?.kind === "ankh") {
    const ixs = [fx.keptSlotIndex, fx.copySlotIndex].filter((i) => typeof i === "number" && i >= 0);
    await wobbleGameTreasureSlots(ixs);
    return;
  }
  if (fx?.kind === "star_miss") {
    const spellLayer = dom.getSpellTargetLayer();
    const detailLayer = dom.getTreasureDetailLayer();
    const starVisual =
      spellLayer?.getSpellVisualEl?.() ??
      spellLayer?.getSpellIconEl?.() ??
      detailLayer?.getTargetVisualEl?.() ??
      detailLayer?.getFlyFrameEl?.();
    await playStarSpellMissFxOnVisual(starVisual);
    return;
  }
  if (fx?.kind === "deck_add" && typeof fx.count === "number") {
    if (Array.isArray(fx.addedDeckCards) && fx.addedDeckCards.length) {
      await animateSpectralDeckAddsFromSpellIcon(fx.addedDeckCards);
      return;
    }
    const layer = dom.getSpellTargetLayer();
    void layer;
    const slots = spellTargetSession.value?.offerSlots ?? [];
    const slotIxs = slots.map((sl, ix) => (sl && !sl.empty && sl.tile ? ix : -1)).filter((ix) => ix >= 0);
    const flyFrom =
      typeof fx.removedDeckCardUid === "number"
        ? slotIxs.slice(0, 1)
        : slotIxs.slice(0, Math.min(slotIxs.length, fx.count));
    await animateSpellDeckAddsFromOfferSlots(flyFrom, fx.count);
    return;
  }
}

/** @param {Record<string, unknown> | null | undefined} spellFx */
function isTreasureGrantSpellFx(spellFx) {
  return spellFx?.kind === "treasure_grant" && typeof spellFx.slotIndex === "number";
}


function buildSpellRuntimeContext() {
  return {
    grid,
    deck,
    initialDeckSnapshot,
    ROWS,
    COLS,
    rarityLevelsByRarity,
    lengthLevelsByLength,
    setRarityLevel: (rk, lv) => callbacks.setRarityLevelWithTreasurePairs(rk, lv),
    ownedSlotTreasureIds: callbacks.ownedSlotTreasureIdList(),
    setWordLengthLevel,
    bumpWordLengthLevel: (len) =>
      bumpWordLengthLevel(len, {
        observatoryBoost: isLengthObservatoryBoosted(
          ownedVoucherIds.value,
          len,
          spellCountsByLength.value,
        ),
      }),
    markTileAsWildcard: (tile) => {
      markTileAsWildcard(tile);
      callbacks.noteCollectionMaterialAcquired("wildcard");
    },
    touchGrid,
    removeDeckLetterInstancesByRaws: callbacks.removeDeckLettersByRawsWithTreasureNotify,
    shiftDeckCardsBackByUids,
    removeDeckCardsForSubmittedWord: callbacks.removeDeckCardsForSubmittedWordAndNotify,
    removeDeckCardByUid: callbacks.removeDeckCardByUidAndNotify,
    appendShopDeckEntries: callbacks.appendShopDeckEntriesAndNotify,
    remapTileFromRawLetter,
    money,
    ownedTreasures,
    upgradeLengthGroups: UPGRADE_LENGTH_GROUPS,
    grantRandomShopTreasure: callbacks.grantRandomShopTreasure,
    grantRandomShopTreasureByRarity: callbacks.grantRandomShopTreasureByRarity,
    setRunWordLengthJudgmentPenalty,
    refreshGridTileBaseScoresFromLevels,
    showToast: callbacks.showToast,
    setLastReplayableSpellId: (id) => {
      lastReplayableSpellId.value = id;
    },
    refreshBossTileDebuffOnTile: callbacks.refreshBossTileDebuffOnTile,
    onUpgradeUsed: () => callbacks.noteTreasureRunUpgradeUsed(treasureRunState.value),
    onUpgradeDiscovered: callbacks.noteCollectionUpgradeFromRandomPick,
    onMaterialAcquired: callbacks.noteCollectionMaterialAcquired,
    onAccessoryAcquired: callbacks.noteCollectionAccessoryAcquired,
    grantSpellBonusShopVoucher: callbacks.grantSpellBonusShopVoucher,
  };
}

function cloneGridTileSnapshot(tile) {
  if (!tile || typeof tile !== "object" || !tile.letter) return null;
  try {
    return JSON.parse(JSON.stringify(tile));
  } catch {
    return null;
  }
}

/**
 * 法术候选展示：角标以该 `(row,col)` 棋盘格及其 `_deckCard` 为准（与施法目标一致），不读随机抽中的牌张。
 * @param {Record<string, unknown> | null} snap
 * @param {unknown} liveTile
 */
function syncSpellOfferIntrinsicGainsOntoSnapshot(snap, liveTile) {
  if (!snap || !liveTile || typeof liveTile !== "object") return snap;
  const { sb, mb } = snapshotMaxIntrinsicGainsFromTile(liveTile);
  snap.tileScoreBonus = sb;
  snap.letterMultBonus = mb;
  return snap;
}

/** @param {number} row @param {number} col */
function buildSpellOfferSnapshotForGridCell(row, col) {
  const live = grid.value[row]?.[col];
  if (!live?.letter) return null;
  const snap = cloneGridTileSnapshot(live);
  if (!snap) return null;
  return syncSpellOfferIntrinsicGainsOntoSnapshot(snap, live);
}

/** @param {Record<string, unknown>} card */
function buildSpellOfferSnapshotFromDeckCard(card) {
  const p = callbacks.buildTileDetailPayloadFromDeckCard(card);
  if (!p) return null;
  return {
    letter: p.letter,
    rarity: p.rarity,
    materialId: p.materialId ?? null,
    accessoryId: p.accessoryId ?? null,
    treasureAccessoryId: p.treasureAccessoryId ?? null,
    tileScoreBonus: p.tileScoreBonus,
    letterMultBonus: p.tileMultBonus,
    materialScoreBonus: p.materialScoreBonus,
    materialMultBonus: p.materialMultBonus,
    isWildcard: card.isWildcard === true,
  };
}

/** 开法术目标层前：场上格状态写回绑定的牌张（含剪贴板/回形针等平面角标） */
function syncGridTilesToLinkedDeckCards() {
  const g = grid.value;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = g[r]?.[c];
      if (t?.letter) syncTileStateToDeckCard(t);
    }
  }
}

function prepareSpellOfferSlots(rng = Math.random, spellId = "") {
  syncGridTilesToLinkedDeckCards();
  return buildSpellOfferSlots(rng, spellId);
}

function prepareSpellOfferSlotsFromRemainingDeck(rng = Math.random, spellId = "") {
  syncGridTilesToLinkedDeckCards();
  const pool = filterDeckCardsForSpellPool(deck.value, spellId);
  return buildSpellOfferSlotsFromPool(pool, buildSpellOfferSnapshotFromDeckCard, rng);
}

/**
 * 法术候选 / 施法目标：优先绑定到 `deckCardUid` 所在棋盘格，避免同字母多格误伤。
 * @param {Record<string, unknown>[][]} g
 * @param {{ row?: number, col?: number, deckCardUid?: number | null }} slot
 */
function resolveSpellOfferTargetOnGrid(g, slot) {
  const uid = slot?.deckCardUid;
  if (uid != null) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = g[r]?.[c];
        if (t?._deckCard?._dcUid === uid) return { row: r, col: c };
      }
    }
  }
  const row = Number(slot?.row);
  const col = Number(slot?.col);
  if (Number.isFinite(row) && Number.isFinite(col) && g[Math.trunc(row)]?.[Math.trunc(col)]?.letter) {
    return { row: Math.trunc(row), col: Math.trunc(col) };
  }
  return null;
}

/**
 * @param {number | null | undefined} deckCardUid
 * @param {{ preferRemainingDeck?: boolean }} [opts]
 */
function findDeckCardByUid(deckCardUid, opts = {}) {
  if (deckCardUid == null) return null;
  const preferRemaining = opts.preferRemainingDeck === true;
  const lookupDeck = () => {
    const d = Array.isArray(deck.value) ? deck.value : [];
    return d.find(
      (c) => c && typeof c === "object" && /** @type {{ _dcUid?: number }} */ (c)._dcUid === deckCardUid,
    );
  };
  const lookupSnapshot = () => {
    const multiset = Array.isArray(initialDeckSnapshot.value) ? initialDeckSnapshot.value : [];
    return multiset.find(
      (c) => c && typeof c === "object" && /** @type {{ _dcUid?: number }} */ (c)._dcUid === deckCardUid,
    );
  };
  const lookupGrid = () => {
    const g = grid.value;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = g[r]?.[c];
        if (t?._deckCard?._dcUid === deckCardUid) {
          return /** @type {Record<string, unknown>} */ (t._deckCard);
        }
      }
    }
    return null;
  };

  if (preferRemaining) {
    let card = lookupDeck();
    if (card) return /** @type {Record<string, unknown>} */ (card);
    card = lookupGrid();
    if (card) return card;
    return null;
  }

  let card = lookupSnapshot();
  if (card) return /** @type {Record<string, unknown>} */ (card);
  card = lookupDeck();
  if (card) return /** @type {Record<string, unknown>} */ (card);
  return lookupGrid();
}

/** @param {number} _row @param {number} _col @param {number | null | undefined} [deckCardUid] */
function getSpellOfferTileSnapshotForCell(_row, _col, deckCardUid) {
  const card = findDeckCardByUid(deckCardUid);
  return card ? buildSpellOfferSnapshotFromDeckCard(card) : null;
}

/** @param {number} _row @param {number} _col @param {number | null | undefined} [deckCardUid] */
function getSpellOfferTileSnapshotForRemainingDeck(_row, _col, deckCardUid) {
  const card = findDeckCardByUid(deckCardUid, { preferRemainingDeck: true });
  return card ? buildSpellOfferSnapshotFromDeckCard(card) : null;
}

/** @param {{ deckCardUid?: number | null, tile?: unknown } | null | undefined} slot */
function buildSpellOfferSnapFromSlot(slot) {
  if (!slot) return null;
  const uid = slot.deckCardUid;
  if (uid != null) {
    const card = findDeckCardByUid(uid);
    if (card) return buildSpellOfferSnapshotFromDeckCard(card);
  }
  return cloneGridTileSnapshot(
    slot.tile && typeof slot.tile === "object" ? /** @type {Record<string, unknown>} */ (slot.tile) : null,
  );
}

/**
 * 候选层确认动效：缩至谷底时再施法并换图（用于目标不在棋盘、无棋盘 DOM 时）。
 * @param {string} sid
 * @param {number[]} slotIndices
 * @param {unknown[]} oldSnaps
 * @param {() => void} applySpellFn
 * @param {() => unknown[]} buildNewSnapsAfterApply
 */
async function playSpellConfirmAnimOnOfferSlots(
  sid,
  slotIndices,
  oldSnaps,
  applySpellFn,
  buildNewSnapsAfterApply,
  animOpts = {},
) {
  if (!slotIndices.length || oldSnaps.length !== slotIndices.length) return false;
  return (
    (await dom.getSpellTargetLayer()?.playConfirmAppearanceAnim?.({
      spellId: sid,
      offerSlotIndices: slotIndices,
      oldSnaps,
      winnerOfferSlotIndex: animOpts.winnerOfferSlotIndex,
      onMidApply: () => {
        applySpellFn();
        return buildNewSnapsAfterApply();
      },
    })) === true
  );
}

/** @param {string} sid @param {number[]} slotIxs */
function pickSpellOfferWinnerSlotIndex(sid, slotIxs) {
  if (!isSpellOfferRandomPickOneSpell(sid) || slotIxs.length <= 1) return -1;
  return slotIxs[Math.floor(runRandom() * slotIxs.length)];
}

/**
 * @param {string} sid
 * @param {unknown[]} resolvedOrdered
 * @param {unknown[]} offerSlotsList
 * @param {number} winnerOfferSlotIndex
 */
function narrowResolvedOrderedToSpellWinner(sid, resolvedOrdered, offerSlotsList, winnerOfferSlotIndex) {
  if (
    winnerOfferSlotIndex < 0 ||
    !isSpellOfferRandomPickOneSpell(sid) ||
    isRandomDeckRemoveSpell(sid)
  ) {
    return resolvedOrdered;
  }
  const sl = offerSlotsList[winnerOfferSlotIndex];
  if (!sl) return resolvedOrdered;
  const uid = sl.deckCardUid;
  const one = resolvedOrdered.find(
    (p) =>
      (uid != null && p?.deckCardUid === uid) ||
      (Number(p?.row) === Number(sl.row) && Number(p?.col) === Number(sl.col)),
  );
  return one ? [one] : resolvedOrdered;
}

/** @param {Record<string, unknown>} ctx @param {string} sid @param {unknown[]} offerSlotsList @param {number} winnerOfferSlotIndex */
function applySpellOfferWinnerToContext(ctx, sid, offerSlotsList, winnerOfferSlotIndex) {
  if (winnerOfferSlotIndex < 0 || !isRandomDeckRemoveSpell(sid)) return;
  ctx.forcedRemoveDeckCardUid = offerSlotsList[winnerOfferSlotIndex]?.deckCardUid ?? null;
}

function spellRandomAccessoryPoolRequiresNoAccessoryTile(spellId) {
  const sid = String(spellId ?? "");
  return sid === "aura" || sid === "talisman" || sid === "deja_vu" || sid === "wrench" || sid === "diamond";
}

/** @param {unknown} card */
function deckCardHasAnyAccessoryMark(card) {
  if (!card || typeof card !== "object") return false;
  const acc = String(/** @type {{ accessoryId?: unknown }} */ (card).accessoryId ?? "").trim();
  const tAcc = String(/** @type {{ treasureAccessoryId?: unknown }} */ (card).treasureAccessoryId ?? "").trim();
  return Boolean(acc || tAcc);
}

/**
 * @param {unknown[]} pool
 * @param {string} spellId
 */
function filterDeckCardsForSpellPool(pool, spellId) {
  const cards = Array.isArray(pool) ? pool.filter((c) => c && typeof c === "object") : [];
  if (!spellRandomAccessoryPoolRequiresNoAccessoryTile(spellId)) return cards;
  return cards.filter((c) => !deckCardHasAnyAccessoryMark(c));
}

/** 10 格候选：从本局完整字母库 multiset 均匀随机抽牌张 */
function buildSpellOfferSlots(rng = Math.random, spellId = "") {
  const pool = filterDeckCardsForSpellPool(initialDeckSnapshot.value, spellId);
  return buildSpellOfferSlotsFromPool(pool, buildSpellOfferSnapshotFromDeckCard, rng);
}

/** @param {unknown} tile */
function tileHasAnyAccessoryMark(tile) {
  if (!tile || typeof tile !== "object") return false;
  const acc = String(/** @type {{ accessoryId?: unknown }} */ (tile).accessoryId ?? "").trim();
  const tAcc = String(/** @type {{ treasureAccessoryId?: unknown }} */ (tile).treasureAccessoryId ?? "").trim();
  return Boolean(acc || tAcc);
}

/**
 * 随机加配饰类法术：候选池仅保留“无任何配饰”的字母块（普通/宝藏配饰均视为已占用）。
 * @param {unknown[]} slots
 * @param {string} spellId
 */
function filterSpellOfferSlotsBySpell(slots, spellId) {
  if (!spellRandomAccessoryPoolRequiresNoAccessoryTile(spellId)) return slots;
  if (!Array.isArray(slots) || slots.length === 0) return slots;
  return slots.map((slot, i) => {
    if (!slot || typeof slot !== "object") return { key: `sp-empty-${i}`, empty: true };
    if (slot.empty === true || !slot.tile) return slot;
    if (tileHasAnyAccessoryMark(slot.tile)) return { key: slot.key ?? `sp-empty-${i}`, empty: true };
    return slot;
  });
}

function noteSpellCastForReplay(purchasedSpellId) {
  const sid = String(purchasedSpellId ?? "");
  if (!sid) return;
  callbacks.noteCollectionDiscovery({ spellId: sid });
  if (sid === "restart" || sid === "dice") return;
  spellCastHistory.value = [...spellCastHistory.value, sid];
  noteTreasureRunSpellCast(treasureRunState.value);
  treasureRunState.value.lastSpellIdBeforeShopLeave = sid;
}

/**
 * @param {string} purchasedSpellId
 * @param {string} effectiveSpellId
 * @param {'shop' | 'inRun'} context
 * @param {'fullDeck' | 'remainingDeck'} offerDeckSource
 * @param {{
 *   confirmDisabled?: boolean,
 *   forcePreview?: boolean,
 *   forcePreviewOnly?: boolean,
 *   skipDisabled?: boolean,
 *   spellDescription?: import('../treasures/treasureDescription.js').TreasureDescSegment[] | string,
 *   spellName?: string,
 *   spellIconClass?: string,
 *   spellRarity?: string,
 *   replayAsPurchasedId?: string,
 * }} [overrides]
 */
function onOpenSpellReplayTargetPreview(spellId) {
  const id =
    String(spellId ?? "").trim() ||
    resolveRestartEffectiveSpellId(spellCastHistory.value, lastReplayableSpellId.value);
  if (!id) return;
  const offer = buildSpellOfferPreviewFromId(id);
  if (offer) spellReferencePreview.value = offer;
}

/** 法术购入详情层关闭（仅 spellGrantFlow 分支；普通详情由 GamePanel 处理） */
function handleSpellGrantDetailClose() {
  if (treasureDetail.value?.spellGrantFlow !== true) return false;
  if (performance.now() < spellGrantDetailOpenGuardUntil) return true;
  const resolve = spellGrantDetailResolve;
  spellGrantDetailPending = null;
  spellGrantDetailResolve = null;
  treasureDetail.value = null;
  spellReferencePreview.value = null;
  resolve?.({ confirmed: false, skipped: true });
  return true;
}

function buildSpellTargetSessionFields(
  purchasedSpellId,
  effectiveSpellId,
  context,
  offerDeckSource,
  overrides = {},
) {
  const pid = String(purchasedSpellId ?? "");
  const replayAs = overrides.replayAsPurchasedId ? String(overrides.replayAsPurchasedId) : null;
  const sessionPurchasedId = replayAs ?? pid;
  const replayTarget = resolveRestartEffectiveSpellId(spellCastHistory.value, lastReplayableSpellId.value);
  const eff =
    pid === "restart"
      ? replayTarget ?? String(effectiveSpellId ?? pid)
      : resolveSpellFlowEffectiveId(pid, lastReplayableSpellId.value, spellCastHistory.value);
  const displaySpellId =
    replayAs === "restart"
      ? pid
      : pid === "restart" && replayTarget
        ? replayTarget
        : pid;
  const displayDef = getSpellDefinition(displaySpellId);
  const pickSourceId =
    pid === "restart" && replayTarget ? replayTarget : replayAs === "restart" ? pid : pid;
  let pickMode = resolveSpellPickMode(pickSourceId);
  let pickCount = resolveSpellPickCount(sessionPurchasedId, lastReplayableSpellId.value);
  if (overrides.forcePreviewOnly === true) {
    pickMode = "preview_only";
    pickCount = 0;
  }
  if (context === "inRun" && pickMode === "none") {
    pickMode = "preview_only";
    pickCount = 0;
  }
  const preferRemaining = offerDeckSource === "remainingDeck";
  const sessionEffectiveId = replayAs === "restart" ? pid : eff;
  const offerSlots = preferRemaining
    ? prepareSpellOfferSlotsFromRemainingDeck(runRandom, sessionEffectiveId)
    : prepareSpellOfferSlots(runRandom, sessionEffectiveId);
  const filteredOfferSlots = filterSpellOfferSlotsBySpell(offerSlots, sessionEffectiveId);
  const couponDropBlocked = shop.isCouponDropSpellBlockedByBonusVoucher(sessionEffectiveId);
  return {
    spellName: overrides.spellName ?? displayDef?.name ?? "法术",
    spellIconClass: overrides.spellIconClass ?? displayDef?.iconClass ?? "ri-magic-fill",
    spellDescription: overrides.spellDescription ?? displayDef?.description ?? "",
    spellRarity: overrides.spellRarity ?? "rare",
    pickCount,
    pickMode,
    offerSlots: filteredOfferSlots,
    offerDeckSource,
    context,
    confirmDisabled: overrides.confirmDisabled === true || couponDropBlocked,
    skipDisabled: overrides.skipDisabled === true,
    purchasedSpellId: sessionPurchasedId,
    effectiveSpellId: sessionEffectiveId,
    getOfferTileSnapshot: preferRemaining
      ? getSpellOfferTileSnapshotForRemainingDeck
      : getSpellOfferTileSnapshotForCell,
  };
}

/**
 * @param {import('../game/inRunGrantFlow.js').SpellPreviewFlowResult} [previewResult]
 */
function resolveSpellPreviewFlow(previewResult) {
  const r = spellPreviewFlowResolve;
  spellPreviewFlowResolve = null;
  r?.(previewResult ?? { confirmed: false, skipped: true });
}

/**
 * 骰子：逐张展示随机抽到的法术详情，点「施放」后再结算（或进入该法术的操作层）。
 * @param {'shop' | 'inRun'} context
 * @param {'fullDeck' | 'remainingDeck'} offerDeckSource
 * @param {Parameters<typeof buildSpellTargetSessionFields>[4]} [overrides]
 */
async function runDiceSubSpellChain(context, offerDeckSource, overrides = {}) {
  const { spellDescription, spellName, spellIconClass, spellRarity, ...diceRestOverrides } =
    overrides;
  void spellDescription;
  void spellName;
  void spellIconClass;
  void spellRarity;
  for (const subId of pickDiceChainSpellIds(runRandom)) {
    const result = await openSpellGrantDetailPreviewThenCast(
      subId,
      subId,
      context,
      offerDeckSource,
      diceRestOverrides,
    );
    if (!result.confirmed) return result;
  }
  return { confirmed: true, skipped: false };
}

/**
 * 详情层点「施放」后：无选格则即时结算，否则打开 SpellTargetLayer。
 * @param {string} purchasedSpellId
 * @param {'shop' | 'inRun'} context
 * @param {'fullDeck' | 'remainingDeck'} offerDeckSource
 * @param {Parameters<typeof buildSpellTargetSessionFields>[4]} [overrides]
 */
async function runSpellCastAfterDetailPreview(purchasedSpellId, context, offerDeckSource, overrides = {}) {
  const pid = String(purchasedSpellId ?? "");
  if (pid === "dice") {
    return runDiceSubSpellChain(context, offerDeckSource, overrides);
  }
  const replayTarget = resolveRestartEffectiveSpellId(spellCastHistory.value, lastReplayableSpellId.value);
  if (overrides.afterDetailUseShopCastLogic === true) {
    const openTargetLayer = shouldOpenSpellTargetLayer(pid, replayTarget);
    if (!openTargetLayer) {
      await applyInstantSpellWithoutPreview(pid, context, offerDeckSource);
      return { confirmed: true, skipped: false };
    }
    return openSingleSpellPreviewSession(pid, context, offerDeckSource, overrides);
  }
  const openTargetLayer =
    context === "inRun"
      ? shouldOpenInRunSpellPreview(pid, replayTarget)
      : shouldOpenSpellTargetLayer(pid, replayTarget);

  if (!openTargetLayer) {
    await applyInstantSpellWithoutPreview(pid, context, offerDeckSource);
    return { confirmed: true, skipped: false };
  }
  return openSingleSpellPreviewSession(pid, context, offerDeckSource, overrides);
}

/**
 * 先开商店同款法术详情（TreasureDetailLayer），点「施放」后再进入选格/结算。
 * @param {string} purchasedSpellId
 * @param {string} displaySpellId 详情层展示的法术 id
 * @param {'shop' | 'inRun'} context
 * @param {'fullDeck' | 'remainingDeck'} offerDeckSource
 * @param {Parameters<typeof buildSpellTargetSessionFields>[4]} [overrides]
 */
function openSpellGrantDetailPreviewThenCast(purchasedSpellId, displaySpellId, context, offerDeckSource, overrides = {}) {
  const offer = buildSpellOfferPreviewFromId(displaySpellId);
  if (!offer) return Promise.resolve({ confirmed: false, skipped: true });

  return new Promise((resolve) => {
    spellGrantDetailResolve = resolve;
    spellGrantDetailPending = {
      purchasedSpellId: String(purchasedSpellId ?? ""),
      context,
      offerDeckSource,
      overrides,
    };
    spellGrantDetailOpenGuardUntil = performance.now() + BACKDROP_SELF_CLOSE_GUARD_MS;
    treasureDetail.value = {
      kind: "offer",
      spellGrantFlow: true,
      treasure: offer,
      originRect: null,
    };
  });
}

async function fulfillSpellGrantDetailCast() {
  const pending = spellGrantDetailPending;
  const resolve = spellGrantDetailResolve;
  if (!pending || !resolve) return;
  spellGrantDetailPending = null;
  spellGrantDetailResolve = null;

  /** 骰子：须先关详情再开子法术链；不可在关层前写入下一层 treasureDetail（会被 playClose 一起关掉） */
  let result;
  if (pending.purchasedSpellId === "dice") {
    await nextTick();
    const layer = dom.getTreasureDetailLayer();
    await layer?.playClose?.();
    treasureDetail.value = null;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    result = await runSpellPreviewChain(
      "dice",
      pending.context,
      pending.offerDeckSource,
      pending.overrides,
    );
  } else if (pending.purchasedSpellId === "star") {
    result = await fulfillStarSpellDirectSettle();
  } else {
    result = await runSpellPreviewChainAfterDetailClose(() =>
      runSpellCastAfterDetailPreview(
        pending.purchasedSpellId,
        pending.context,
        pending.offerDeckSource,
        pending.overrides,
      ),
    );
  }
  resolve(result);
}

/**
 * 先挂载法术操作层，再淡出详情层，避免两浮层切换时空档闪屏。
 * @param {() => Promise<import('../game/inRunGrantFlow.js').SpellPreviewFlowResult>} startPreviewChain
 */
async function runSpellPreviewChainAfterDetailClose(startPreviewChain) {
  const previewPromise = startPreviewChain();
  await nextTick();
  const layer = dom.getTreasureDetailLayer();
  await layer?.playClose?.();
  treasureDetail.value = null;
  return previewPromise;
}

/**
 * @param {string} purchasedSpellId
 * @param {'shop' | 'inRun'} context
 * @param {'fullDeck' | 'remainingDeck'} offerDeckSource
 * @param {Parameters<typeof buildSpellTargetSessionFields>[4]} [overrides]
 */
function openSingleSpellPreviewSession(purchasedSpellId, context, offerDeckSource, overrides = {}) {
  return new Promise((resolve) => {
    spellPreviewFlowResolve = resolve;
    spellTargetSession.value = buildSpellTargetSessionFields(
      purchasedSpellId,
      purchasedSpellId,
      context,
      offerDeckSource,
      overrides,
    );
  });
}

/**
 * @param {string} purchasedSpellId
 * @param {'shop' | 'inRun'} context
 * @param {'fullDeck' | 'remainingDeck'} offerDeckSource
 */
async function applyInstantSpellWithoutPreview(purchasedSpellId, context, offerDeckSource) {
  const pid = String(purchasedSpellId ?? "");
  const effectiveSpellId = resolveSpellFlowEffectiveId(
    pid,
    lastReplayableSpellId.value,
    spellCastHistory.value,
  );
  if (effectiveSpellId === "star") {
    const ctx = buildSpellRuntimeContext();
    const outcome = resolveStarSpellOutcome(ctx, runRandom);
    if (outcome.ok) {
      await playStarSpellAccessoryGrantFx(outcome);
    } else {
      const detailLayer = dom.getTreasureDetailLayer();
      const starVisual = detailLayer?.getTargetVisualEl?.() ?? detailLayer?.getFlyFrameEl?.();
      await playStarSpellMissFxOnVisual(starVisual);
    }
    noteSpellCastForReplay(pid);
    void offerDeckSource;
    callbacks.scheduleRunAutoSave();
    return;
  }
  if (
    effectiveSpellId === "arrow_up" ||
    effectiveSpellId === "eclipse_length" ||
    effectiveSpellId === "eclipse_rarity"
  ) {
    if (context === "inRun") await playInstantSpellInRunFx(effectiveSpellId);
    else if (getShowShop()) await playInstantSpellShopFx(effectiveSpellId);
    noteSpellCastForReplay(pid);
    callbacks.scheduleRunAutoSave();
    return;
  }
  const beforeGrid = cloneGridDeep(grid.value, ROWS, COLS);
  const applyOpts =
    pid === "dice" ? { rng: runRandom, skipDiceInline: true } : { rng: runRandom };
  const spellResult = applySpell(buildSpellRuntimeContext(), pid, effectiveSpellId, [], applyOpts);
  await playSpellVoucherBonusShelfEnterFx(spellResult?.spellFx ?? null);
  if (getShowShop() && context === "shop") {
    await playInstantSpellShopFx(effectiveSpellId);
  }
  await playSpectralSpellResultFx(spellResult?.spellFx ?? null, effectiveSpellId);
  const afterGrid = cloneGridDeep(grid.value, ROWS, COLS);
  const animTargets = diffGridAppearanceTargets(beforeGrid, afterGrid, ROWS, COLS);
  if (animTargets.length > 0) {
    restoreGridFromDeepClone(grid, beforeGrid, ROWS, COLS);
    touchGrid();
    await nextTick();
    const oldSnaps0 = animTargets.map(({ row, col }) => beforeGrid[row][col]);
    const newSnaps0 = animTargets.map(({ row, col }) => afterGrid[row][col]);
    await queueOrRunSpellTileAppearanceAnim({
      spellId: effectiveSpellId,
      targets: animTargets,
      oldSnaps: oldSnaps0,
      newSnaps: newSnaps0,
      grid,
      touchGrid,
      getTileEl: (row, col) => dom.getGridTileElByIndex(row * COLS + col),
      nextTick,
    });
  }
  syncGridTilesToLinkedDeckCards();
  noteSpellCastForReplay(pid);
  void offerDeckSource;
  callbacks.scheduleRunAutoSave();
}

/**
 * @param {string} purchasedSpellId
 * @param {'shop' | 'inRun'} context
 * @param {'fullDeck' | 'remainingDeck'} offerDeckSource
 * @param {Parameters<typeof buildSpellTargetSessionFields>[4]} [overrides]
 * @returns {Promise<import('../game/inRunGrantFlow.js').SpellPreviewFlowResult>}
 */
async function runSpellPreviewChain(purchasedSpellId, context, offerDeckSource, overrides = {}) {
  const pid = String(purchasedSpellId ?? "");
  if (!pid) return { confirmed: false, skipped: true };

  if (pid === "restart") {
    callbacks.noteCollectionDiscovery({ spellId: "restart" });
    const replayTarget = resolveRestartEffectiveSpellId(
      spellCastHistory.value,
      lastReplayableSpellId.value,
    );
    if (!replayTarget) return { confirmed: false, skipped: true };
    const { spellDescription, spellName, spellIconClass, spellRarity, ...restartRestOverrides } =
      overrides;
    void spellDescription;
    void spellName;
    void spellIconClass;
    void spellRarity;
    return openSpellGrantDetailPreviewThenCast(
      "restart",
      "restart",
      context,
      offerDeckSource,
      restartRestOverrides,
    );
  }

  if (pid === "dice") {
    callbacks.noteCollectionDiscovery({ spellId: "dice" });
    return runDiceSubSpellChain(context, offerDeckSource, overrides);
  }

  const replayTarget = resolveRestartEffectiveSpellId(spellCastHistory.value, lastReplayableSpellId.value);
  const openPreview =
    overrides.forcePreview === true
      ? true
      : context === "inRun"
      ? shouldOpenInRunSpellPreview(pid, replayTarget)
      : shouldOpenSpellTargetLayer(pid, replayTarget);

  if (!openPreview) {
    await applyInstantSpellWithoutPreview(pid, context, offerDeckSource);
    return { confirmed: true, skipped: false };
  }

  return openSingleSpellPreviewSession(pid, context, offerDeckSource, overrides);
}

/**
 * @param {string} spellId
 * @param {{ treasureSlotIndex?: number, cdShopLeaveReplay?: boolean, skipPrecursorFx?: boolean }} [opts]
 */
async function runInRunSpellGrant(spellId, { treasureSlotIndex, cdShopLeaveReplay = false, skipPrecursorFx = false } = {}) {
  if (
    !skipPrecursorFx &&
    typeof treasureSlotIndex === "number" &&
    treasureSlotIndex >= 0
  ) {
    shopOverlayLayersSuppressed.value = true;
    await nextTick();
    try {
      await fxApi.wobbleGameTreasureSlot(treasureSlotIndex);
    } finally {
      shopOverlayLayersSuppressed.value = false;
    }
  }
  const pid = String(spellId ?? "");
  if (!pid) return { confirmed: false, skipped: true };
  const context = cdShopLeaveReplay ? "shop" : "inRun";
  const offerDeckSource = cdShopLeaveReplay ? "fullDeck" : "remainingDeck";
  return openSpellGrantDetailPreviewThenCast(pid, pid, context, offerDeckSource, {
    afterDetailUseShopCastLogic: cdShopLeaveReplay,
  });
}

async function queueOrRunSpellTileAppearanceAnim(opts) {
  if (!getShowShop()) {
    await runSpellTileAppearanceAnim(opts);
    return;
  }
  pendingSpellTileAppearanceAnim.value = opts;
}

/** 先播法术目标层关闭动画，再卸载（与商店 `TreasureDetailLayer.playClose` 一致） */
async function dismissSpellTargetLayer(previewResult) {
  const layer = dom.getSpellTargetLayer();
  if (layer && typeof layer.playClose === "function") {
    await layer.playClose();
  }
  spellTargetSession.value = null;
  resolveSpellPreviewFlow(previewResult);
  if (packPick.shouldRestorePackPickOverlayAfterSpellConfirm()) {
    packPick.ensurePackPickOverlayVisible();
  }
}

async function onSpellTargetCancel() {
  await dismissSpellTargetLayer({ confirmed: false, skipped: true });
}

async function onSpellTargetConfirm(ordered, selectionSlotIndices) {
  const s = spellTargetSession.value;
  if (!s) return;
  if (s.confirmDisabled === true) return;

  const offerSlotsList = Array.isArray(s.offerSlots) ? s.offerSlots : [];
  let confirmSelectionSlotIndices = selectionSlotIndices;
  let resolvedOrdered = Array.isArray(confirmSelectionSlotIndices)
      ? confirmSelectionSlotIndices
          .map((ix) => {
            const sl = offerSlotsList[ix];
            if (!sl || sl.empty) return null;
            const pos = resolveSpellOfferTargetOnGrid(grid.value, sl);
            if (pos) return { ...pos, deckCardUid: sl.deckCardUid ?? undefined };
            if (sl.deckOnly && sl.deckCardUid != null) return { deckCardUid: sl.deckCardUid };
            return { row: sl.row, col: sl.col, deckCardUid: sl.deckCardUid ?? undefined };
          })
          .filter(Boolean)
      : ordered;
  const ctx = buildSpellRuntimeContext();
  const sid = String(s.effectiveSpellId ?? "");
  const confirmAllSlotIxs = Array.isArray(confirmSelectionSlotIndices)
    ? confirmSelectionSlotIndices.filter((ix) => {
        const sl = offerSlotsList[ix];
        return typeof ix === "number" && ix >= 0 && sl && !sl.empty && sl.tile;
      })
    : [];
  const winnerOfferSlotIndex = pickSpellOfferWinnerSlotIndex(sid, confirmAllSlotIxs);
  applySpellOfferWinnerToContext(ctx, sid, offerSlotsList, winnerOfferSlotIndex);
  resolvedOrdered = narrowResolvedOrderedToSpellWinner(
    sid,
    resolvedOrdered,
    offerSlotsList,
    winnerOfferSlotIndex,
  );
  const deferInRunUpgradeFxApply =
    s.context === "inRun" &&
    s.pickMode === "preview_only" &&
    (sid === "arrow_up" || sid === "eclipse_length" || sid === "eclipse_rarity");
  const g = grid.value;
  /** 与点选 1:1、允许重复坐标（`getSpellTileAppearanceTargets` 会去重，导致少格动效/少格快照） */
  const usePickSequenceAnim =
    sid === "cake" ||
    sid === "blaze" ||
    sid === "drinks" ||
    sid === "lightbulb" ||
    sid === "hammer" ||
    sid === "snowflake" ||
    sid === "flask" ||
    sid === "bard" ||
    sid === "mic" ||
    sid === "notification" ||
    sid === "phone" ||
    sid === "delete_back";
  const targets = usePickSequenceAnim
    ? buildSpellAnimPickTargetsFromOrdered(resolvedOrdered, g)
    : getSpellTileAppearanceTargets(sid, resolvedOrdered, g, ROWS, COLS);
  const offerSlotAnimIxs = Array.isArray(confirmSelectionSlotIndices)
    ? confirmSelectionSlotIndices.filter((ix) => {
        const sl = offerSlotsList[ix];
        return typeof ix === "number" && ix >= 0 && sl && !sl.empty && sl.tile;
      })
    : [];
  /** 与 `targets` 逐项对齐的候选槽下标（供弹层动效绑定） */
  const animSelectionSlotIndices =
    usePickSequenceAnim && Array.isArray(confirmSelectionSlotIndices)
      ? offerSlotAnimIxs
      : confirmSelectionSlotIndices;
  const animOrderedForLayer = usePickSequenceAnim ? targets : resolvedOrdered;
  /** 候选格上播缩小→换图→回弹（含仅改字母库、候选数与棋盘目标数不一致、以及蛋糕等材质法术） */
  const useOfferSlotConfirmPath =
    offerSlotAnimIxs.length > 0 &&
    (sid === "delete_back" ||
      sid === "ouija" ||
      sid === "immolate" ||
      usePickSequenceAnim ||
      sid === "seedling" ||
      sid === "file_copy" ||
      sid === "aura" ||
      !targets.length ||
      (s.pickMode === "confirm_all" && offerSlotAnimIxs.length !== targets.length));

  if (useOfferSlotConfirmPath) {
    const slotIxs = offerSlotAnimIxs;
    const oldOfferSnaps =
      slotIxs.length > 0 ? slotIxs.map((ix) => buildSpellOfferSnapFromSlot(offerSlotsList[ix])) : [];
    const beforeGrid = cloneGridDeep(g, ROWS, COLS);
    /** @type {Record<string, unknown> | null} */
    let lastSpellFx = null;
    const applySpellNow = () => {
      if (deferInRunUpgradeFxApply) return;
      const r = applySpell(ctx, s.purchasedSpellId, s.effectiveSpellId, resolvedOrdered, { rng: runRandom });
      lastSpellFx = r?.spellFx ?? null;
    };
    let playedOnOffer = false;
    if (sid === "immolate" && slotIxs.length > 0 && oldOfferSnaps.every(Boolean)) {
      playedOnOffer = await playImmolateConfirmFxOnOfferSlots(
        slotIxs,
        oldOfferSnaps,
        applySpellNow,
        () => slotIxs.map((ix) => buildSpellOfferSnapFromSlot(offerSlotsList[ix])).filter(Boolean),
      );
    } else if (slotIxs.length > 0 && oldOfferSnaps.every(Boolean)) {
      playedOnOffer = await playSpellConfirmAnimOnOfferSlots(
        sid,
        slotIxs,
        oldOfferSnaps,
        applySpellNow,
        () => slotIxs.map((ix) => buildSpellOfferSnapFromSlot(offerSlotsList[ix])).filter(Boolean),
        { winnerOfferSlotIndex },
      );
    }
    if (!playedOnOffer) {
      const animTargets = buildSpellAnimPickTargetsFromOrdered(resolvedOrdered, g);
      if (animTargets.length) {
        const oldSnaps0 = animTargets.map(({ row, col }) => cloneGridTileSnapshot(g[row][col]));
        await queueOrRunSpellTileAppearanceAnim({
          spellId: sid,
          targets: animTargets,
          oldSnaps: oldSnaps0,
          grid,
          touchGrid,
          getTileEl: (row, col) => dom.getGridTileElByIndex(row * COLS + col),
          nextTick,
          getNewSnapsAtMid: () => {
            applySpellNow();
            touchGrid();
            return animTargets.map(({ row, col }) => cloneGridTileSnapshot(grid.value[row][col]));
          },
        });
      } else {
        applySpellNow();
      }
    }
    await sleep(
      playedOnOffer && !isTreasureGrantSpellFx(lastSpellFx) && sid !== "immolate" ? 500 : 0,
    );
    await playSpectralSpellResultFx(lastSpellFx, sid);
    await playSpellVoucherBonusShelfEnterFx(lastSpellFx);
    if (deferInRunUpgradeFxApply) await playInstantSpellInRunFx(sid);
    syncGridTilesToLinkedDeckCards();
    noteSpellCastForReplay(s.purchasedSpellId);
    await dismissSpellTargetLayer({ confirmed: true, skipped: false });
    callbacks.scheduleRunAutoSave();
    return;
  }
  /** @type {Record<string, unknown> | null} */
  let lastSpellFx = null;
  const applySpellNow = () => {
    if (deferInRunUpgradeFxApply) return;
    const r = applySpell(ctx, s.purchasedSpellId, s.effectiveSpellId, resolvedOrdered, { rng: runRandom });
    lastSpellFx = r?.spellFx ?? null;
  };
  const oldSnaps = targets.map(({ row, col }) => cloneGridTileSnapshot(g[row][col]));
  await nextTick();
  const playedOnOffer =
    (await dom.getSpellTargetLayer()?.playConfirmAppearanceAnim?.({
      spellId: sid,
      targets,
      oldSnaps,
      ordered: animOrderedForLayer,
      selectionSlotIndices: animSelectionSlotIndices,
      winnerOfferSlotIndex,
      onMidApply: () => {
        applySpellNow();
        touchGrid();
        return targets.map(({ row, col }) => cloneGridTileSnapshot(grid.value[row][col]));
      },
    })) === true;
  if (!playedOnOffer) {
    if (targets.length === 0) {
      applySpellNow();
    } else {
      await queueOrRunSpellTileAppearanceAnim({
        spellId: sid,
        targets,
        oldSnaps,
        grid,
        touchGrid,
        getTileEl: (row, col) => dom.getGridTileElByIndex(row * COLS + col),
        nextTick,
        getNewSnapsAtMid: () => {
          applySpellNow();
          touchGrid();
          return targets.map(({ row, col }) => cloneGridTileSnapshot(grid.value[row][col]));
        },
      });
    }
  }
  await sleep(
    playedOnOffer && !isTreasureGrantSpellFx(lastSpellFx)
      ? 500
      : isTreasureGrantSpellFx(lastSpellFx)
        ? 0
        : 300,
  );
  await playSpectralSpellResultFx(lastSpellFx, sid);
  await playSpellVoucherBonusShelfEnterFx(lastSpellFx);
  if (deferInRunUpgradeFxApply) await playInstantSpellInRunFx(sid);
  syncGridTilesToLinkedDeckCards();
  noteSpellCastForReplay(s.purchasedSpellId);
  await dismissSpellTargetLayer({ confirmed: true, skipped: false });
  callbacks.scheduleRunAutoSave();
}
async function animateSpectralDeckAddsFromSpellIcon(deckCards) {
  const cards = Array.isArray(deckCards) ? deckCards.filter(Boolean) : [];
  if (!cards.length) return;
  const deckBtn = dom.getDeckBtn();
  if (!deckBtn) return;
  const layer = dom.getSpellTargetLayer();
  const iconEl = layer?.getSpellIconEl?.() ?? null;
  const origin =
    iconEl && typeof iconEl.getBoundingClientRect === "function"
      ? iconEl.getBoundingClientRect()
      : null;
  if (!origin) {
    await animateSpellDeckAddsFromOfferSlots([], cards.length);
    return;
  }
  const gridSample = dom.getGridTileElByIndex(0);
  const gridRect =
    gridSample && typeof gridSample.getBoundingClientRect === "function"
      ? gridSample.getBoundingClientRect()
      : null;
  const size =
    gridRect && gridRect.width > 1
      ? gridRect.width
      : Math.max(48, origin.width * 0.85);

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const snap = buildSpellOfferSnapshotFromDeckCard(card);
    if (!snap) continue;
    const host = document.createElement("div");
    host.className = "pack-tile-purchase-fly-clone pack-tile-purchase-fly-clone--deck-tile grim-spell-tile-spawn";
    host.setAttribute("aria-hidden", "true");
    Object.assign(host.style, {
      position: "fixed",
      left: `${origin.left + origin.width / 2 - size / 2}px`,
      top: `${origin.top + origin.height / 2 - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      zIndex: "9999",
      pointerEvents: "none",
      transform: "scale(0)",
      transformOrigin: "50% 50%",
    });
    document.body.appendChild(host);
    const disposeTile = mountLetterTileClone(host, snap, "grid", {
      tileClass: "shop-shelf-letter-tile",
    });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((resolve) => {
      gsap.to(host, {
        scale: 1,
        duration: 0.2,
        ease: EASE_TRANSFORM,
        onComplete: resolve,
      });
    });
    await animatePackTileFlyToDeck(host, deckBtn, { flyLiveElement: true, deckTileFly: true });
    disposeTile();
    if (i < cards.length - 1) await sleep(120);
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} spellFx
 */
async function playSpellVoucherBonusShelfEnterFx(spellFx) {
  const fxPayload = spellFx && typeof spellFx === "object" ? spellFx : null;
  if (fxPayload?.kind !== "voucher_bonus" || fxPayload.granted !== true) return;
  if (!getShowShop()) return;
  await shop.getShopPanel()?.playVoucherBonusEnterAnim?.();
}

function isSpellGrantDetailOpenGuardActive() {
  return performance.now() < spellGrantDetailOpenGuardUntil;
}

function getSpellGrantDetailPendingPurchasedSpellId() {
  return spellGrantDetailPending?.purchasedSpellId ?? "";
}

  return {
    lastReplayableSpellId,
    spellCastHistory,
    spellTargetSession,
    pendingSpellTileAppearanceAnim,
    buildSpellRuntimeContext,
    cloneGridTileSnapshot,
    queueOrRunSpellTileAppearanceAnim,
    runSpellPreviewChain,
    runSpellPreviewChainAfterDetailClose,
    runInRunSpellGrant,
    fulfillStarSpellShopPurchase: fulfillStarSpellDirectSettle,
    fulfillSpellGrantDetailCast,
    onSpellTargetConfirm,
    onSpellTargetCancel,
    onOpenSpellReplayTargetPreview,
    handleSpellGrantDetailClose,
    playSpellVoucherBonusShelfEnterFx,
    isSpellGrantDetailOpenGuardActive,
    getSpellGrantDetailPendingPurchasedSpellId,
  };
}
