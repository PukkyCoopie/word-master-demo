import { deckCardRaw } from "./deckCardSync.js";
import {
  bossHasWholeWordSoftRule,
  evaluateBossSoftWordViolation,
  getEndingLetterRarityForResolvedWord,
} from "./bossWordViolation.js";
import { isBossEffectsSuppressedByTreasures } from "./treasureBossSuppress.js";
import { getWordLetterCount } from "../composables/useScoring.js";
import {
  hasTestTubeAllVowelsForMouth,
  hasVowelNeighborSubstitute,
  isLetterSubstitutableForMouth,
} from "./vowelNeighborSubstitute.js";

/**
 * @typedef {Object} SubmitSelectionSnapshot
 * @property {{ tile: object }[]} selectedTiles
 * @property {{ slotIndex: number }[]} flyingBackBatches
 * @property {{ pendingRow: number, pendingCol: number, letter?: string, rarity?: string }[]} flyingLetters
 * @property {object[][] | null | undefined} grid
 * @property {object | null | undefined} [appendTile]
 */

/**
 * @typedef {Object} SubmitRunContext
 * @property {(string | null | undefined)[]} ownedSlotTreasureIds
 * @property {string[]} [ownedVoucherIds]
 * @property {string} [presetId]
 * @property {number} [runWordLengthJudgmentPenalty]
 * @property {string} [bossSlug]
 * @property {Set<number>} [usedWordLengthsThisLevel]
 * @property {number | null} [mouthLockedLength]
 * @property {string | null} [clubRequiredKey]
 * @property {(w: string) => { pos?: string, translation_zh?: string } | null | undefined} [getWordDefinition]
 * @property {Record<string, number> | null | undefined} [rarityLevelsByRarity]
 * @property {(wordLetterCount: number) => number} [getJudgedLengthTableLen]
 */

/** 飞入在途：拼词/展示用解析字母，而非棋盘格上存的 ? */
export function gridTileWithInFlightPresentation(gridTile, flyItem) {
  if (!gridTile || !flyItem) return gridTile;
  const flyLetter = String(flyItem.letter ?? "").trim();
  if (!flyLetter || flyLetter === String(gridTile.letter ?? "").trim()) return gridTile;
  return {
    ...gridTile,
    letter: flyLetter,
    rarity: flyItem.rarity ?? gridTile.rarity,
  };
}

/**
 * 与提交按钮一致的 tile 序列：飞入中视为已加入，飞回截断视为已移除。
 * @param {SubmitSelectionSnapshot} snap
 * @returns {object[]}
 */
export function listEffectiveTilesForSubmit(snap) {
  let tiles = (snap.selectedTiles ?? []).map(({ tile }) => tile);
  const batches = snap.flyingBackBatches ?? [];
  if (batches.length > 0) {
    const minSlot = Math.min(...batches.map((b) => b.slotIndex));
    tiles = tiles.slice(0, minSlot);
  }
  const grid = snap.grid;
  for (const f of snap.flyingLetters ?? []) {
    const t = grid?.[f.pendingRow]?.[f.pendingCol];
    if (t) tiles.push(gridTileWithInFlightPresentation(t, f));
    else if (f) tiles.push(f);
  }
  if (snap.appendTile) tiles.push(snap.appendTile);
  return tiles;
}

/**
 * @param {SubmitSelectionSnapshot & { ownedSlotTreasureIds?: (string | null | undefined)[] }} snap
 * @returns {{ word: string, vowelAltMask: boolean[] }}
 */
export function buildEffectiveWordPartsForSubmit(snap) {
  /** @type {string[]} */
  const chars = [];
  /** @type {boolean[]} */
  const vowelAltMask = [];
  const owned = snap.ownedSlotTreasureIds ?? [];
  const vowelTreasure = hasVowelNeighborSubstitute(owned);

  const pushFromTile = (tile) => {
    if (!tile?.letter) return;
    const card = tile._deckCard;
    const natural =
      card && typeof card === "object" ? deckCardRaw(card) : String(tile.letter).toLowerCase();
    const frag = String(tile.letter ?? "").toLowerCase();
    for (const ch of frag) {
      if (!ch) continue;
      chars.push(ch);
      vowelAltMask.push(
        vowelTreasure && ch !== "?" && isLetterSubstitutableForMouth(natural, owned),
      );
    }
  };

  let slots = snap.selectedTiles ?? [];
  const batches = snap.flyingBackBatches ?? [];
  if (batches.length > 0) {
    const minSlot = Math.min(...batches.map((b) => b.slotIndex));
    slots = slots.slice(0, minSlot);
  }
  for (const { tile } of slots) pushFromTile(tile);
  const grid = snap.grid;
  for (const f of snap.flyingLetters ?? []) {
    const t = grid?.[f.pendingRow]?.[f.pendingCol];
    if (t) pushFromTile(gridTileWithInFlightPresentation(t, f));
    else {
      const frag = String(f.letter ?? "").toLowerCase();
      for (const ch of frag) {
        chars.push(ch);
        vowelAltMask.push(false);
      }
    }
  }
  if (snap.appendTile) pushFromTile(snap.appendTile);
  return { word: chars.join(""), vowelAltMask };
}

/**
 * @param {SubmitRunContext & { tiles: object[] }} ctx
 * @returns {import("./bossWordViolation.js").BossWildcardResolveContext | null}
 */
export function buildBossWildcardResolveContext(ctx) {
  const slug = String(ctx.bossSlug ?? "");
  if (!bossHasWholeWordSoftRule(slug)) return null;
  if (isBossEffectsSuppressedByTreasures(ctx.ownedSlotTreasureIds)) return null;
  const tiles = ctx.tiles ?? [];
  const getJudgedLengthTableLen =
    typeof ctx.getJudgedLengthTableLen === "function"
      ? ctx.getJudgedLengthTableLen
      : (n) => Math.max(0, Math.floor(Number(n) || 0));
  return {
    slug,
    usedLengthsThisLevel: ctx.usedWordLengthsThisLevel,
    mouthLockedLength: ctx.mouthLockedLength ?? null,
    clubRequiredKey: ctx.clubRequiredKey ?? "",
    ownedSlotTreasureIds: ctx.ownedSlotTreasureIds,
    getWordDefinition: ctx.getWordDefinition,
    tiles,
    getJudgedWordLen(resolvedWord) {
      return getJudgedLengthTableLen(getWordLetterCount(tiles, resolvedWord));
    },
    getEndingLetterRarity(resolvedWord) {
      return getEndingLetterRarityForResolvedWord(tiles, resolvedWord);
    },
  };
}

/**
 * 整词软规则预览：当前串若提交将违规（与提交结算判定一致）。
 * @param {SubmitRunContext & { resolvedWord: string, tiles: object[], dictionaryReady?: boolean }} ctx
 */
export function previewBossSoftWordViolation(ctx) {
  if (ctx.dictionaryReady === false) return false;
  const slug = String(ctx.bossSlug ?? "");
  if (!bossHasWholeWordSoftRule(slug)) return false;
  const res = ctx.resolvedWord;
  if (res == null || res === "") return false;
  const getJudgedLengthTableLen =
    typeof ctx.getJudgedLengthTableLen === "function"
      ? ctx.getJudgedLengthTableLen
      : (n) => Math.max(0, Math.floor(Number(n) || 0));
  const judgedLen = getJudgedLengthTableLen(getWordLetterCount(ctx.tiles ?? [], res));
  const soft = evaluateBossSoftWordViolation({
    slug,
    wordLen: judgedLen,
    resolvedWord: res,
    endingLetterRarity: getEndingLetterRarityForResolvedWord(ctx.tiles ?? [], res),
    getWordDefinition: ctx.getWordDefinition,
    usedLengthsThisLevel: ctx.usedWordLengthsThisLevel ?? new Set(),
    mouthLockedLength: ctx.mouthLockedLength ?? null,
    clubRequiredKey: ctx.clubRequiredKey ?? "",
    ownedSlotTreasureIds: ctx.ownedSlotTreasureIds,
  });
  return soft.violated;
}

/**
 * 带同帧 memo 的整词解析器（嘴邻位 / 万能 / Boss 合规路径）。
 * @param {{ resolveWordPattern: Function, resolveWordPatternWithMouthSubstitutions: Function }} deps
 */
export function createSubmitWordResolver(deps) {
  let vowelResolveMemoKey = "";
  /** @type {string | null | undefined} */
  let vowelResolveMemoResult = undefined;

  function clearResolveMemo() {
    vowelResolveMemoKey = "";
    vowelResolveMemoResult = undefined;
  }

  /**
   * @param {{ word: string, vowelAltMask: boolean[] }} parts
   * @param {{ ownedSlotTreasureIds?: (string | null | undefined)[], rarityLevelsByRarity?: Record<string, number> | null, bossResolveContext?: import("./bossWordViolation.js").BossWildcardResolveContext | null }} ctx
   * @returns {string | null}
   */
  function resolveWordFromEffectiveParts(parts, ctx) {
    const { word, vowelAltMask } = parts;
    const rl = ctx.rarityLevelsByRarity ?? null;
    const bossCtx = ctx.bossResolveContext ?? null;
    const owned = ctx.ownedSlotTreasureIds ?? [];
    const bossKey = bossCtx
      ? `${bossCtx.slug}|${bossCtx.mouthLockedLength}|${bossCtx.clubRequiredKey}`
      : "";
    const maskBits = vowelAltMask.map((b) => (b ? "1" : "0")).join("");
    const memoKey = `${word}\0${maskBits}\0${hasTestTubeAllVowelsForMouth(owned) ? "1" : "0"}\0${bossKey}`;
    if (memoKey === vowelResolveMemoKey) return vowelResolveMemoResult ?? null;

    let result;
    if (hasVowelNeighborSubstitute(owned) && vowelAltMask.some(Boolean)) {
      result = deps.resolveWordPatternWithMouthSubstitutions(
        word,
        vowelAltMask,
        "?",
        rl,
        bossCtx,
        owned,
      );
    } else {
      result = deps.resolveWordPattern(word, "?", rl, bossCtx);
    }
    vowelResolveMemoKey = memoKey;
    vowelResolveMemoResult = result;
    return result;
  }

  return { resolveWordFromEffectiveParts, clearResolveMemo };
}

/**
 * 提交入口前半段：从有效词槽读取并解析单词。
 * @param {{ buildParts: () => { word?: string } | null | undefined, resolveWord: (parts: unknown) => string | null | undefined }} deps
 * @returns {{ parts: any, wordPattern: string, resolvedWord: string } | { error: 'empty' | 'invalid' }}
 */
export function resolveSubmitWordInput({ buildParts, resolveWord }) {
  const parts = buildParts?.();
  const wordPattern = String(parts?.word ?? "");
  if (!wordPattern) return { error: "empty" };
  const resolvedWord = String(resolveWord?.(parts) ?? "");
  if (!resolvedWord) return { error: "invalid" };
  return { parts, wordPattern, resolvedWord };
}
