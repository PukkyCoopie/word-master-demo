import { computed } from "vue";
import { deckCardRaw } from "../../game/deckCardSync.js";
import { resolvePresentationBossTileDebuffed } from "../../game/bossTileDebuff.js";
import { gridTileWithInFlightPresentation } from "../../game/submitWordPipeline.js";
import {
  hasVowelNeighborSubstitute,
  isLetterSubstitutableForMouth,
  vowelDisplayLetter,
  vowelDisplayShiftForResolved,
  vowelGhostSlotsForDisplay,
} from "../../game/vowelNeighborSubstitute.js";
import { resolveLetterFromRaw } from "../../settings/letterQ.js";
import {
  advanceResolvedReadPosPastTile,
  resolveWildcardTileFromResolved,
} from "../../game/resolvedWordTileMapping.js";
import { isQuModeSubmitQFamilyTile, submitPartsAlignWithResolved } from "../../game/quSlotSubmitPattern.js";
import { getLetterQMode } from "../../settings/gameSettings.js";
import {
  getBaseScoreForRarity,
  getRarityForLetter,
  isWildcardMaterialTile,
} from "../../composables/useScoring.js";
import { resolveScoringLetterRarity } from "../../game/treasureRarityTierMerge.js";

/** @typedef {import("../runSessionTypes.js").GridStore} GridStore */
/** @typedef {import("../runSessionTypes.js").WordSlotPresentationController} WordSlotPresentationController */

/**
 * @typedef {Object} WordSlotPresentationOptions
 * @property {Pick<GridStore, "grid" | "selectedTiles" | "selectedOrder">} grid
 * @property {() => string[]} ownedSlotTreasureIds
 * @property {import("vue").Ref<Record<string, number>>} rarityLevelsByRarity
 * @property {import("vue").ComputedRef<string | null>} resolvedWordForSubmit
 * @property {import("vue").ComputedRef<string>} effectiveWordForSubmit
 * @property {import("vue").ComputedRef<{ word: string }>} effectiveWordPartsForSubmit
 * @property {(opts?: object) => { word: string }} buildEffectiveWordPartsForSubmit
 * @property {(parts: { word: string }) => string | null} resolveWordFromEffectiveParts
 * @property {(extraTile?: object | null) => object[]} listEffectiveTilesForSubmit
 * @property {() => { flyingLetters: unknown[], flyingBackBatches: { slotIndex: number }[] }} getPlayfieldFlySnapshot
 * @property {() => string} bossSlugForMechanics
 * @property {() => object} getBossTileDebuffContext
 */

/**
 * 给定整词解析，批量计算各格在词槽/飞字上应展示的字母、稀有度与元音 ghost（O(N)）
 * @param {string | null} res
 * @param {string} effWord
 * @param {object | null | undefined} extraTile
 * @param {(extraTile?: object | null) => object[]} listEffectiveTilesForSubmit
 * @param {() => string[]} ownedSlotTreasureIds
 * @returns {Map<string, { letter: string, rarity: string, vowelGhostPrev: string | null, vowelGhostNext: string | null }>}
 */
export function buildTilePresentationIndex(
  res,
  effWord,
  extraTile,
  listEffectiveTilesForSubmit,
  ownedSlotTreasureIds,
  alignParts = null,
) {
  /** @type {Map<string, { letter: string, rarity: string, vowelGhostPrev: string | null, vowelGhostNext: string | null }>} */
  const byId = new Map();
  const upGhost = (ch) => (ch ? resolveLetterFromRaw(ch) : null);
  const partsForAlign = alignParts ?? {
    word: effWord,
    vowelAltMask: [],
    quSlotMask: [],
  };
  if (!res || !effWord || !submitPartsAlignWithResolved(partsForAlign, res, ownedSlotTreasureIds())) {
    return byId;
  }

  const owned = ownedSlotTreasureIds();
  const vowelTreasure = hasVowelNeighborSubstitute(owned);
  let readPos = 0;
  for (const tile of listEffectiveTilesForSubmit(extraTile)) {
    if (!tile?.id) continue;
    let letter = tile.letter;
    let rarity = tile.rarity;
    let vowelGhostPrev = null;
    let vowelGhostNext = null;

    if (vowelTreasure && !isWildcardMaterialTile(tile)) {
      const card = tile._deckCard;
      const frag = String(tile?.letter ?? "").toLowerCase();
      const natural =
        card && typeof card === "object"
          ? deckCardRaw(card)
          : frag.replace(/^qu/, "q").charAt(0);
      const naturalCh = natural.charAt(0) === "q" ? "q" : natural.charAt(0);
      if (isLetterSubstitutableForMouth(naturalCh, owned)) {
        const resolvedCh = res[readPos];
        if (resolvedCh >= "a" && resolvedCh <= "z") {
          const shift = vowelDisplayShiftForResolved(naturalCh, resolvedCh, owned);
          const ghosts = vowelGhostSlotsForDisplay(naturalCh, shift, owned);
          vowelGhostPrev = upGhost(ghosts?.prev ?? null);
          vowelGhostNext = upGhost(ghosts?.next ?? null);
          const isQuPair =
            isQuModeSubmitQFamilyTile(tile, getLetterQMode()) &&
            resolvedCh === "q" &&
            res[readPos + 1] === "u";
          if (!isQuPair && resolvedCh !== naturalCh) {
            letter = resolveLetterFromRaw(resolvedCh);
            rarity = getRarityForLetter(resolvedCh);
          }
        }
      }
    }

    if (isWildcardMaterialTile(tile) && String(tile?.letter ?? "").toLowerCase() === "?") {
      const hit = resolveWildcardTileFromResolved(tile, res, readPos);
      if (hit.letter) {
        letter = hit.letter;
        rarity = hit.raw ? getRarityForLetter(hit.raw) : rarity;
      }
      readPos = hit.nextReadPos;
    } else {
      readPos = advanceResolvedReadPosPastTile(tile, res, readPos);
    }

    byId.set(tile.id, { letter, rarity, vowelGhostPrev, vowelGhostNext });
  }
  return byId;
}

/**
 * 飞回棋盘：牌张自然展示（deck + vowelDisplayShift）；万能块立即恢复 ?，不沿用词内解析态
 * @param {object} tile
 * @param {() => string[]} ownedSlotTreasureIds
 */
export function computeFlyBackTilePresentation(tile, ownedSlotTreasureIds) {
  const upGhost = (ch) => (ch ? resolveLetterFromRaw(ch) : null);
  if (!tile?.letter) {
    return { letter: "", rarity: "common", vowelGhostPrev: null, vowelGhostNext: null };
  }
  if (isWildcardMaterialTile(tile)) {
    return {
      letter: tile.letter ?? "?",
      rarity: tile.rarity ?? "common",
      vowelGhostPrev: null,
      vowelGhostNext: null,
    };
  }
  const card = tile._deckCard;
  let rawLower = null;
  if (card && typeof card === "object") {
    const natural = deckCardRaw(card);
    rawLower = natural.charAt(0) === "q" ? "q" : natural.charAt(0);
  } else {
    rawLower = String(tile.letter).toLowerCase().replace(/^qu/, "q").charAt(0);
  }

  let letter = tile.letter;
  let rarity = tile.rarity ?? "common";
  let vowelGhostPrev = null;
  let vowelGhostNext = null;

  const ownedFlyBack = ownedSlotTreasureIds();
  if (hasVowelNeighborSubstitute(ownedFlyBack) && isLetterSubstitutableForMouth(rawLower, ownedFlyBack)) {
    const shift = card && typeof card === "object" ? Math.sign(Number(card.vowelDisplayShift) || 0) : 0;
    const displayed = vowelDisplayLetter(rawLower, shift, ownedFlyBack);
    letter = resolveLetterFromRaw(displayed);
    rarity =
      card?.rarity != null && String(card.rarity).trim() !== "" && shift === 0
        ? String(card.rarity)
        : getRarityForLetter(displayed);
    const ghosts = vowelGhostSlotsForDisplay(rawLower, shift, ownedFlyBack);
    vowelGhostPrev = upGhost(ghosts?.prev ?? null);
    vowelGhostNext = upGhost(ghosts?.next ?? null);
  } else if (card && typeof card === "object") {
    const displayed = rawLower === "q" ? "q" : rawLower;
    letter = resolveLetterFromRaw(displayed);
    rarity =
      card.rarity != null && String(card.rarity).trim() !== ""
        ? String(card.rarity)
        : getRarityForLetter(displayed);
  }

  return { letter, rarity, vowelGhostPrev, vowelGhostNext };
}

/**
 * 词槽展示 computed（元音 ghost、飞回截断、万能解析、青铃锁位保留）与纯函数（任务 4.1）。
 *
 * @param {WordSlotPresentationOptions} options
 * @returns {WordSlotPresentationController}
 */
export function useWordSlotPresentation(options) {
  const {
    grid: gridStore,
    ownedSlotTreasureIds,
    rarityLevelsByRarity,
    resolvedWordForSubmit,
    effectiveWordForSubmit,
    effectiveWordPartsForSubmit,
    buildEffectiveWordPartsForSubmit,
    resolveWordFromEffectiveParts,
    listEffectiveTilesForSubmit,
    getPlayfieldFlySnapshot,
    bossSlugForMechanics,
    getBossTileDebuffContext,
  } = options;

  const { grid, selectedTiles, selectedOrder } = gridStore;

  const flatGrid = computed(() => grid.value.flat());

  /** @param {object | null | undefined} tile */
  function selectedSlotIndexForTile(tile) {
    if (!tile) return -1;
    return selectedTiles.value.findIndex(
      ({ tile: t }) => t === tile || (tile.id != null && t?.id === tile.id),
    );
  }

  /** 该格是否正在从词槽飞回棋盘（含同批后续槽位） */
  function isTileInFlyingBackFromWord(tile) {
    const idx = selectedSlotIndexForTile(tile);
    if (idx < 0) return false;
    return getPlayfieldFlySnapshot().flyingBackBatches.some((b) => idx >= b.slotIndex);
  }

  /**
   * 分数×倍率面板用：与 effectiveWordForSubmit 同步的 tile 序列（飞入即算入、飞回截断即算移除）
   */
  const effectiveFormulaTiles = computed(() => {
    let tiles = selectedTiles.value.map(({ tile }) => tile);
    const { flyingBackBatches: batches, flyingLetters: flying } = getPlayfieldFlySnapshot();
    if (batches.length > 0) {
      const minSlot = Math.min(...batches.map((b) => b.slotIndex));
      tiles = tiles.slice(0, minSlot);
    }
    for (const f of flying) {
      const t = grid.value[f.pendingRow]?.[f.pendingCol];
      if (t) tiles.push(gridTileWithInFlightPresentation(t, f));
    }
    return tiles;
  });

  /** 已选词各格元音展示偏移（O(词长) 一次，供 ghost 批量查表） */
  const vowelDisplayShiftBySelectedTileId = computed(() => {
    const res = resolvedWordForSubmit.value;
    const parts = effectiveWordPartsForSubmit.value;
    const eff = parts?.word ?? effectiveWordForSubmit.value;
    const owned = ownedSlotTreasureIds();
    /** @type {Map<string, number>} */
    const m = new Map();
    if (
      !res ||
      !eff ||
      !submitPartsAlignWithResolved(parts, res, owned) ||
      !hasVowelNeighborSubstitute(owned)
    ) {
      return m;
    }
    let readPos = 0;
    for (const t of effectiveFormulaTiles.value) {
      const card = t._deckCard;
      const frag = String(t?.letter ?? "").toLowerCase();
      const natural =
        card && typeof card === "object"
          ? deckCardRaw(card)
          : frag.replace(/^qu/, "q").charAt(0);
      const naturalCh = natural.charAt(0) === "q" ? "q" : natural.charAt(0);
      if (t?.id != null && isLetterSubstitutableForMouth(naturalCh, owned)) {
        const resolvedCh = res[readPos];
        if (resolvedCh) {
          m.set(t.id, vowelDisplayShiftForResolved(naturalCh, resolvedCh, owned));
        }
      }
      readPos = advanceResolvedReadPosPastTile(t, res, readPos);
    }
    return m;
  });

  /** 拼词中：按当前词典解析结果推算该格的元音展示偏移；无解析则 null */
  function resolveVowelDisplayShiftForTile(tile) {
    if (!tile?.id) return null;
    const hit = vowelDisplayShiftBySelectedTileId.value.get(tile.id);
    return hit != null ? hit : null;
  }

  /** @param {object | null | undefined} tile @param {{ skipLiveWordResolve?: boolean }} [opts] */
  function vowelGhostForTile(tile, opts = {}) {
    const owned = ownedSlotTreasureIds();
    if (!hasVowelNeighborSubstitute(owned) || !tile?.letter) return null;
    if (isWildcardMaterialTile(tile)) return null;
    if (isTileInFlyingBackFromWord(tile)) {
      const back = computeFlyBackTilePresentation(tile, ownedSlotTreasureIds);
      return { prev: back.vowelGhostPrev, next: back.vowelGhostNext };
    }
    const card = tile._deckCard;
    let raw;
    if (card && typeof card === "object") {
      const natural = deckCardRaw(card);
      raw = natural.charAt(0) === "q" ? "q" : natural.charAt(0);
    } else {
      raw = String(tile.letter).toLowerCase().replace(/^qu/, "q").charAt(0);
    }
    if (!isLetterSubstitutableForMouth(raw, owned)) return null;
    const liveShift = opts.skipLiveWordResolve ? null : resolveVowelDisplayShiftForTile(tile);
    const shift =
      liveShift != null
        ? liveShift
        : card && typeof card === "object"
          ? Math.sign(Number(card.vowelDisplayShift) || 0)
          : 0;
    const ghosts = vowelGhostSlotsForDisplay(raw, shift, owned);
    if (!ghosts) return null;
    const up = (ch) => (ch ? resolveLetterFromRaw(ch) : null);
    return { prev: up(ghosts.prev), next: up(ghosts.next) };
  }

  /**
   * 给定整词解析，计算单格在词槽/飞字上应展示的字母、稀有度与元音 ghost
   * @param {object} tile
   * @param {string | null} res
   * @param {string} effWord
   * @param {object | null | undefined} [extraTile]
   */
  function tilePresentationInResolvedWord(tile, res, effWord, extraTile = null) {
    const parts = buildEffectiveWordPartsForSubmit(
      extraTile ? { appendTile: extraTile } : undefined,
    );
    const indexed = buildTilePresentationIndex(
      res,
      effWord,
      extraTile,
      listEffectiveTilesForSubmit,
      ownedSlotTreasureIds,
      parts,
    );
    const hit = tile?.id != null ? indexed.get(tile.id) : null;
    if (hit) return hit;
    const g = vowelGhostForTile(tile);
    return {
      letter: tile.letter,
      rarity: tile.rarity,
      vowelGhostPrev: g?.prev ?? null,
      vowelGhostNext: g?.next ?? null,
    };
  }

  /** 飞入启程：按「该格已加入词串」预解析展示（字母与 ghost 同步变化） */
  function computeFlyInTilePresentation(tile) {
    const parts = buildEffectiveWordPartsForSubmit({ appendTile: tile });
    const res = resolveWordFromEffectiveParts(parts);
    return tilePresentationInResolvedWord(tile, res, parts.word, tile);
  }

  /** 词槽/详情：已入词万能块优先用词内解析展示 */
  function resolveWildcardInWordPresentation(tile) {
    if (!tile?.letter || !isWildcardMaterialTile(tile)) return null;
    const parts = buildEffectiveWordPartsForSubmit();
    const res = resolveWordFromEffectiveParts(parts);
    const eff = parts.word;
    if (!res || !submitPartsAlignWithResolved(parts, res, ownedSlotTreasureIds())) return null;
    const pres = tilePresentationInResolvedWord(tile, res, eff);
    if (String(pres.letter ?? "").trim() === "?") return null;
    return pres;
  }

  /** 词槽展示用：按展示字母重算 Boss 无效化（万能块变形入词后生效），并保留倒钩等格上已有标记 */
  function normalizeWordSlotPresentationTile(tile) {
    if (!tile || typeof tile !== "object") return tile;
    const bossTileDebuffed = resolvePresentationBossTileDebuffed(
      tile,
      bossSlugForMechanics(),
      getBossTileDebuffContext(),
    );
    const next = { ...tile, bossTileDebuffed };
    if (tile.playerMarked === true) next.playerMarked = true;
    if (tile.ceruleanBellLocked === true) next.ceruleanBellLocked = true;
    return next;
  }

  /**
   * 词槽与已选棋盘格展示：与 effectiveWordForSubmit 同步（含飞入在途格），解析出万能/元音替换字母。
   * 飞回截断时仅对齐 minSlot 之前槽位。
   */
  const wordSlotTilePresentations = computed(() => {
    const orderTiles = selectedTiles.value.map(({ tile }) => tile);
    const batches = getPlayfieldFlySnapshot().flyingBackBatches;
    const minSlot = batches.length > 0 ? Math.min(...batches.map((b) => b.slotIndex)) : orderTiles.length;
    const res = resolvedWordForSubmit.value;
    const parts = effectiveWordPartsForSubmit.value;
    const eff = parts?.word ?? effectiveWordForSubmit.value;
    const owned = ownedSlotTreasureIds();
    const presById =
      res && submitPartsAlignWithResolved(parts, res, owned)
        ? buildTilePresentationIndex(
            res,
            eff,
            null,
            listEffectiveTilesForSubmit,
            ownedSlotTreasureIds,
            parts,
          )
        : null;
    if (!res || !submitPartsAlignWithResolved(parts, res, owned)) {
      return orderTiles.map((tile) => {
        const g = vowelGhostForTile(tile);
        return normalizeWordSlotPresentationTile({
          ...tile,
          vowelGhostPrev: g?.prev ?? null,
          vowelGhostNext: g?.next ?? null,
        });
      });
    }
    return orderTiles.map((tile, idx) => {
      if (idx >= minSlot) {
        const back = computeFlyBackTilePresentation(tile, ownedSlotTreasureIds);
        return normalizeWordSlotPresentationTile({
          ...tile,
          letter: back.letter,
          rarity: back.rarity,
          baseScore: getBaseScoreForRarity(
            resolveScoringLetterRarity(back.rarity, owned),
            rarityLevelsByRarity.value,
          ),
          vowelGhostPrev: back.vowelGhostPrev,
          vowelGhostNext: back.vowelGhostNext,
        });
      }
      const pres = presById?.get(tile.id) ?? tilePresentationInResolvedWord(tile, res, eff);
      return normalizeWordSlotPresentationTile({
        ...tile,
        letter: pres.letter,
        rarity: pres.rarity,
        baseScore: getBaseScoreForRarity(
          resolveScoringLetterRarity(pres.rarity, owned),
          rarityLevelsByRarity.value,
        ),
        vowelGhostPrev: pres.vowelGhostPrev,
        vowelGhostNext: pres.vowelGhostNext,
      });
    });
  });

  /** 已选格在棋盘上与词槽同步展示解析后的字母/稀有度 */
  const gridTileLetterForRender = computed(() => {
    const m = new Map();
    selectedTiles.value.forEach(({ tile }, i) => {
      m.set(tile.id, wordSlotTilePresentations.value[i]?.letter ?? tile.letter);
    });
    return m;
  });

  const gridTileRarityForRender = computed(() => {
    const m = new Map();
    selectedTiles.value.forEach(({ tile }, i) => {
      m.set(tile.id, wordSlotTilePresentations.value[i]?.rarity ?? tile.rarity);
    });
    return m;
  });

  /** 棋盘格元音 ghost：computed 缓存，避免模板每格重复调用 vowelGhostForTile */
  const gridTileVowelGhostForRender = computed(() => {
    const m = new Map();
    for (const tile of flatGrid.value) {
      if (!tile) continue;
      const g = vowelGhostForTile(tile);
      if (g) m.set(tile.id, g);
    }
    return m;
  });

  return {
    effectiveFormulaTiles,
    wordSlotTilePresentations,
    gridTileLetterForRender,
    gridTileRarityForRender,
    gridTileVowelGhostForRender,
    vowelGhostForTile,
    computeFlyInTilePresentation,
    computeFlyBackTilePresentation: (tile) => computeFlyBackTilePresentation(tile, ownedSlotTreasureIds),
    tilePresentationInResolvedWord,
    resolveWildcardInWordPresentation,
    normalizeWordSlotPresentationTile,
    isTileInFlyingBackFromWord,
    selectedSlotIndexForTile,
    resolvedWordForSubmit,
    effectiveWordForSubmit,
    effectiveWordPartsForSubmit,
  };
}
