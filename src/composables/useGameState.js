import { ref, computed, shallowRef, triggerRef } from "vue";

import { LEVELS, RUN_START_LEVEL_INDEX, resolveLevelTargetScore } from "../levelDefinitions";

import {

  RARITY_BY_LETTER,

  getRarityForLetter,

  getBaseScoreForRarity,

  computeWordScore,

  computeWordScoreDetailed,

  getLengthUpgradeStepAdds,

  getObservatoryBoostedLengthUpgradeStepAdds,

  LETTER_RARITY_ORDER,

} from "./useScoring";

import {
  gridSelectedPositionKeySet,
  previewGridPresenceMultProduct,
} from "../game/gridOnlyMaterialScoring.js";
import { snapshotMaxIntrinsicGainsFromTile, applyIntrinsicGainsToTileAndLinkedCard } from "../game/tileIntrinsicGains.js";
import { getWordLengthJudgmentBonus } from "../vouchers/voucherRuntime.js";

const VOWEL_LETTERS = new Set(["a", "e", "i", "o", "u"]);

/** 棋盘/牌库展示：字母显示串 → 小写 raw（q 表示 Qu） */
function tileLetterToRawLowerForDeck(letter) {
  const L = String(letter ?? "").trim().toLowerCase();
  if (!L) return "";
  return L === "qu" ? "q" : L.charAt(0);
}

const WILDCARD_STACK_RAW = "?";

/** 牌库堆叠分组用：通配符单独成摞，其余走字母 raw（含 q→Qu） */
function tileRawForDeckStack(tile) {
  if (!tile?.letter) return "";
  if (tile.isWildcard === true) return WILDCARD_STACK_RAW;
  const L = String(tile.letter).trim();
  if (L === "?") return WILDCARD_STACK_RAW;
  return tileLetterToRawLowerForDeck(tile.letter);
}

/** 元音张数按英文频率大致分层：E 最高，U 最低（较基础版略多，便于组词） */
const VOWEL_DECK_COUNT = Object.freeze({
  e: 8,
  a: 7,
  o: 6,
  i: 6,
  u: 5,
});

const WILDCARD_MATERIAL_ID = "wildcard";
const WILDCARD_TILE_LETTER = "?";

let deckCardUidSeq = 0;

/** 新局开局前调用，避免跨局 _dcUid 与调试混淆 */
export function resetDeckCardUidSeqForRun(runSeedNumeric = 0) {
  const base = Math.floor(Number(runSeedNumeric)) || 0;
  deckCardUidSeq = (base % 100000) * 1000;
}

function defaultRng() {
  return Math.random();
}

/**
 * 牌库 multiset 中一枚「牌张」的稳定引用；材质/稀有度/万能等跨小关保存在此对象上，
 * 棋盘格 `tile._deckCard` 指向同一引用。
 * @param {string} raw0 小写；`q` 表示 Qu。
 */
function createDeckCard(raw0) {
  let raw = String(raw0 ?? "").toLowerCase();
  if (raw === "qu") raw = "q";
  if (!raw) raw = "e";
  return {
    _dcUid: ++deckCardUidSeq,
    raw,
    rarity: getRarityForLetter(raw),
    materialId: /** @type {string | null} */ (null),
    materialScoreBonus: 0,
    materialMultBonus: 0,
    tileScoreBonus: 0,
    letterMultBonus: 0,
    isWildcard: false,
    accessoryId: /** @type {string | null} */ (null),
    treasureAccessoryId: /** @type {string | null} */ (null),
    /** 曾离开抽牌堆上场（在棋盘消耗后亦不再回库）；牌库预览用半透明展示 */
    everLeftDrawPile: false,
  };
}

function buildInitialDeckCards() {
  /** @type {ReturnType<typeof createDeckCard>[]} */
  const out = [];
  for (const letter of RARITY_BY_LETTER.common) {
    const count = VOWEL_LETTERS.has(letter) ? VOWEL_DECK_COUNT[letter] : 3;
    for (let i = 0; i < count; i++) out.push(createDeckCard(letter));
  }
  for (const letter of RARITY_BY_LETTER.rare) {
    for (let i = 0; i < 2; i++) out.push(createDeckCard(letter));
  }
  for (const letter of RARITY_BY_LETTER.epic) {
    out.push(createDeckCard(letter));
  }
  for (const letter of RARITY_BY_LETTER.legendary) {
    out.push(createDeckCard(letter));
  }
  return out;
}

/** @param {unknown} card */
export function deckCardRaw(card) {
  if (!card || typeof card !== "object") return "";
  const r = /** @type {{ raw?: string }} */ (card).raw;
  let raw = String(r ?? "").toLowerCase();
  if (raw === "qu") raw = "q";
  return raw.slice(0, 1) || "";
}

/**
 * 将棋盘格当前展示状态写回其绑定的牌张（用于法术、材质、饰品等持久化）。
 * @param {Record<string, unknown> | null | undefined} tile
 */
export function syncTileStateToDeckCard(tile) {
  const c = /** @type {Record<string, unknown> | null | undefined} */ (tile?._deckCard);
  if (!c || typeof c !== "object") return;
  if (tile.isWildcard === true) {
    c.isWildcard = true;
    c.materialId = WILDCARD_MATERIAL_ID;
  } else {
    c.isWildcard = false;
    const lr = tileLetterToRawLowerForDeck(tile.letter);
    if (lr && lr !== "?") c.raw = lr === "qu" ? "q" : lr.slice(0, 1);
    c.materialId = tile.materialId != null ? String(tile.materialId) : null;
  }
  c.rarity = String(tile?.rarity || "common");
  c.materialScoreBonus = Math.max(0, Math.floor(Number(tile?.materialScoreBonus) || 0));
  c.materialMultBonus = Number(tile?.materialMultBonus) || 0;
  c.tileScoreBonus = Math.max(0, Math.floor(Number(tile?.tileScoreBonus) || 0));
  c.letterMultBonus = Math.max(0, Math.round(Number(tile?.letterMultBonus) || 0));
  c.accessoryId = tile?.accessoryId != null ? String(tile.accessoryId) : null;
  c.treasureAccessoryId =
    tile?.treasureAccessoryId != null ? String(tile.treasureAccessoryId) : null;
}

function shuffleArrayInPlace(arr, rng = Math.random) {
  const rnd = typeof rng === "function" ? rng : Math.random;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/** @param {unknown} card */
function markDeckCardLeftDrawPile(card) {
  if (card && typeof card === "object") {
    /** @type {{ everLeftDrawPile?: boolean }} */ (card).everLeftDrawPile = true;
  }
}

function drawFromDeck(deckArr, rng = defaultRng) {
  if (!deckArr.length) return null;
  const rnd = typeof rng === "function" ? rng : defaultRng;
  const idx = Math.floor(rnd() * deckArr.length);
  const [card] = deckArr.splice(idx, 1);
  markDeckCardLeftDrawPile(card);
  return card;
}

/**
 * 棋盘格被消耗（拼词、移除、冰块等）：状态写回牌张，但**不**放回 `deck` 抽牌堆。
 * @param {Record<string, unknown> | null | undefined} tile
 */
function finalizeConsumedGridTileDeckCard(tile) {
  if (tile?.letter) syncTileStateToDeckCard(tile);
}

/** @param {Record<string, unknown> | null | undefined} tile */
function cloneGridTileShallowForColumn(tile) {
  if (!tile || typeof tile !== "object") return tile;
  return /** @type {Record<string, unknown>} */ ({ ...tile, _deckCard: tile._deckCard });
}



function emptyTile(idGen) {

  return {

    id: idGen(),

    letter: "",

    baseScore: 0,

    rarity: "common",

    letterMultBonus: 0,

    /** 该字母块自带的平面额外分（与稀有度加分相加后计入总分与记分气泡） */
    tileScoreBonus: 0,

    /** 材质额外分（不走角标，仅参与计分） */
    materialScoreBonus: 0,

    /** 材质 id，如 "gold"；无材质则为 null */
    materialId: null,

    /** 材质额外倍率（不走角标，仅参与计分） */
    materialMultBonus: 0,

    /** 配饰 id，如 level_upgrade；无则为 null */
    accessoryId: null,
    treasureAccessoryId: null,

    selected: false,
    isWildcard: false,

    bossGridBlocked: false,

    bossTileDebuffed: false,

    /** 青铃锁：该格被 Boss 强制选入词槽后不可点回棋盘 */
    ceruleanBellLocked: false,

  };

}



function createTileFromLetter(raw, idGen, rarityLevelsSnapshot = null) {

  const letter = raw === "q" ? "Qu" : raw.toUpperCase();

  const rarity = getRarityForLetter(raw);

  const baseScore = getBaseScoreForRarity(rarity, rarityLevelsSnapshot);

  return {

    id: idGen(),

    letter,

    baseScore,

    rarity,

    letterMultBonus: 0,

    tileScoreBonus: 0,

    materialScoreBonus: 0,

    materialId: null,

    materialMultBonus: 0,

    accessoryId: null,
    treasureAccessoryId: null,

    selected: false,
    isWildcard: false,

    bossGridBlocked: false,
    bossTileDebuffed: false,
    ceruleanBellLocked: false,

  };

}

/**
 * 由牌张生成棋盘格（绑定 `_deckCard`）。
 * @param {ReturnType<typeof createDeckCard>} card
 * @param {() => string} idGen
 * @param {Record<string, number> | null} [rarityLevelsSnapshot]
 */
function createTileFromDeckCard(card, idGen, rarityLevelsSnapshot = null) {
  const raw = deckCardRaw(card);
  const useWildcard = card.isWildcard === true;
  const rarity = useWildcard
    ? "common"
    : card.rarity != null && String(card.rarity).trim() !== ""
      ? String(card.rarity)
      : getRarityForLetter(raw);
  const letter = useWildcard ? WILDCARD_TILE_LETTER : raw === "q" ? "Qu" : String(raw).toUpperCase();
  const baseScore = getBaseScoreForRarity(rarity, rarityLevelsSnapshot);
  return {
    id: idGen(),
    letter,
    baseScore,
    rarity,
    letterMultBonus: Math.max(0, Math.round(Number(card.letterMultBonus) || 0)),
    tileScoreBonus: Math.max(0, Math.floor(Number(card.tileScoreBonus) || 0)),
    materialScoreBonus: Math.max(0, Math.floor(Number(card.materialScoreBonus) || 0)),
    materialId: useWildcard ? WILDCARD_MATERIAL_ID : card.materialId ?? null,
    materialMultBonus: Number(card.materialMultBonus) || 0,
    accessoryId: card.accessoryId ?? null,
    treasureAccessoryId: card.treasureAccessoryId ?? null,
    selected: false,
    isWildcard: useWildcard,
    bossGridBlocked: false,
    bossTileDebuffed: false,
    ceruleanBellLocked: false,
    _deckCard: card,
  };
}

const ROWS = 4;

const COLS = 4;

/**
 * 小关结束前：从棋盘格 + 抽牌堆收集当前 multiset 中的牌张（按 `_dcUid` 去重）。
 * @param {unknown[][]} g `grid.value`
 * @param {unknown[]} deckArr `deck.value`
 */
function collectLiveDeckCardsFromGridAndDeck(g, deckArr) {
  const seen = new Set();
  /** @type {unknown[]} */
  const out = [];
  /** @param {unknown} c */
  function push(c) {
    if (!c || typeof c !== "object") return;
    const uid = /** @type {{ _dcUid?: number }} */ (c)._dcUid;
    if (uid != null) {
      if (seen.has(uid)) return;
      seen.add(uid);
    }
    out.push(c);
  }
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      push(/** @type {Record<string, unknown> | null | undefined} */ (g[r]?.[col])?._deckCard);
    }
  }
  if (Array.isArray(deckArr)) {
    for (const c of deckArr) push(c);
  }
  return out;
}

/**
 * 在「满库」模板 multiset 下保留本关已有牌张对象（剪贴板/回形针等写在牌张上的增益），再为各 raw 补足与模板一致的张数。
 * @param {unknown[]} liveCards
 * @param {ReturnType<typeof buildInitialDeckCards>} templateCards
 */
function reconcileMultisetPreserveLiveWithTemplate(liveCards, templateCards) {
  const live = [...liveCards];
  /** @type {Map<string, number>} */
  const templateByRaw = new Map();
  for (const tc of templateCards) {
    if (!tc || typeof tc !== "object") continue;
    if (/** @type {{ isWildcard?: boolean }} */ (tc).isWildcard === true) continue;
    const raw = deckCardRaw(tc);
    if (!raw) continue;
    templateByRaw.set(raw, (templateByRaw.get(raw) || 0) + 1);
  }
  /** @type {Map<string, number>} */
  const liveByRaw = new Map();
  for (const c of live) {
    if (!c || typeof c !== "object") continue;
    if (/** @type {{ isWildcard?: boolean }} */ (c).isWildcard === true) continue;
    const raw = deckCardRaw(c);
    if (!raw) continue;
    liveByRaw.set(raw, (liveByRaw.get(raw) || 0) + 1);
  }
  /** @type {ReturnType<typeof createDeckCard>[]} */
  const additions = [];
  for (const [raw, need] of templateByRaw) {
    const have = liveByRaw.get(raw) || 0;
    for (let i = have; i < need; i++) additions.push(createDeckCard(raw));
  }
  return [...live, ...additions];
}

/** 水域材质平面加分（写入 `materialScoreBonus`） */
const WATER_MATERIAL_SCORE_BONUS = 30;
const FIRE_MATERIAL_MULT_BONUS = 4;

/** 单次移除棋盘上已选字母上限（与 remove 按钮可用条件一致） */
export const MAX_LETTERS_PER_REMOVAL = 8;



/**
 * @param {{ ownedVoucherIdsRef?: import("vue").Ref<readonly string[]> | import("vue").Ref<string[]> | null, getRng?: () => number, runSeedNumeric?: number }} [gameOpts]
 */
export function useGameState(gameOpts = {}) {
  const ownedVoucherIdsRef = gameOpts?.ownedVoucherIdsRef ?? null;
  const getRng =
    typeof gameOpts?.getRng === "function" ? gameOpts.getRng : defaultRng;
  resetDeckCardUidSeqForRun(gameOpts?.runSeedNumeric ?? 0);

  let idCounter = 0;

  const nextId = () => `t-${++idCounter}-${Date.now()}`;

  const initialCards = buildInitialDeckCards();
  /** 本局 multiset 全部牌张（稳定引用）；`deck` 为尚未抽上场、仍可被抽到的抽牌堆 */
  const initialDeckSnapshot = ref(initialCards);
  const deck = ref([...initialCards]);
  shuffleArrayInPlace(deck.value, getRng);

  /** 当前小关 Boss slug（x-3 / 8-3）；非 Boss 小关为空串） */
  const activeBossSlug = ref("");

  /** 青铃锁：被锁字母在 `selectedOrder` 中的下标；不可 `removeFromSlot` 清到该位之前 */
  const ceruleanBellSlotIndex = ref(/** @type {number | null} */ (null));

  const deckCount = computed(() => deck.value.length);

  /** @param {Record<string, unknown>[][]} g @param {unknown} card */
  function findDeckCardOnGrid(g, card) {
    const uid = /** @type {{ _dcUid?: number }} */ (card)._dcUid;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = g[r]?.[c];
        if (!t?.letter) continue;
        const dc = t._deckCard;
        if (dc === card || (uid != null && dc?._dcUid === uid)) return { row: r, col: c };
      }
    }
    return null;
  }

  /**
   * 牌库界面：按字母 raw 分堆；`entries` 为本局 multiset 中**该字母每一枚牌张**（含场上、抽牌堆、已消耗离堆）。
   * `dimmed`：曾上场（`everLeftDrawPile`）——半透明。`count` 为全集张数；`inDrawPile` 为仍在抽牌堆可抽的张数。
   */
  const deckStacksView = computed(() => {
    const snap = initialDeckSnapshot.value;
    const d = deck.value;
    const g = grid.value;

    const cardsByRaw = new Map();
    for (const entry of snap) {
      if (!entry || typeof entry !== "object") continue;
      const e = /** @type {{ isWildcard?: boolean }} */ (entry);
      const key = e.isWildcard === true ? WILDCARD_STACK_RAW : deckCardRaw(entry);
      if (!key) continue;
      if (!cardsByRaw.has(key)) cardsByRaw.set(key, []);
      cardsByRaw.get(key).push(entry);
    }

    const sortedRaws = [...cardsByRaw.keys()].sort((a, b) => a.localeCompare(b, "en"));
    const stackRaws = sortedRaws.includes(WILDCARD_STACK_RAW)
      ? sortedRaws
      : [...sortedRaws, WILDCARD_STACK_RAW];

    /** @type {object[]} */
    const out = [];
    for (const raw of stackRaws) {
      const displayLetter =
        raw === "q" ? "Qu" : raw === WILDCARD_STACK_RAW ? "?" : String(raw).toUpperCase();
      const cardsForRaw = cardsByRaw.get(raw) ?? [];
      const count = cardsForRaw.length;
      const isGhost = count <= 0;
      let inDrawPile = 0;

      /** @type {{ kind: string, row?: number, col?: number, raw?: string, card?: unknown, dimmed?: boolean }[]} */
      const entries = [];
      for (const card of cardsForRaw) {
        const pos = findDeckCardOnGrid(g, /** @type {Record<string, unknown>} */ (card));
        const inDeck = d.indexOf(card) >= 0;
        const dimmed = /** @type {{ everLeftDrawPile?: boolean }} */ (card).everLeftDrawPile === true;
        if (inDeck) inDrawPile += 1;
        if (pos) {
          entries.push({ kind: "grid", row: pos.row, col: pos.col, card, dimmed: true });
        } else if (inDeck) {
          entries.push({ kind: "deck", raw, card, dimmed: false });
        } else {
          entries.push({ kind: "spent", raw, card, dimmed: true });
        }
      }

      let topLetter = displayLetter;
      let topRarity = getRarityForLetter(raw === WILDCARD_STACK_RAW ? "e" : raw);
      let topMaterialId = null;
      let topAccessoryId = null;
      let topTileScoreBonus = 0;
      let topTileMultBonus = 0;

      if (!isGhost) {
        const peekInDeck =
          raw === WILDCARD_STACK_RAW
            ? d.find((c) => c && typeof c === "object" && c.isWildcard === true)
            : d.find((c) => c && typeof c === "object" && !c.isWildcard && deckCardRaw(c) === raw);
        const peekCard =
          peekInDeck ??
          cardsForRaw.find((c) => d.indexOf(c) < 0 && !findDeckCardOnGrid(g, /** @type {Record<string, unknown>} */ (c))) ??
          cardsForRaw[cardsForRaw.length - 1];
        if (peekCard && typeof peekCard === "object") {
          const isWc = peekCard.isWildcard === true;
          topLetter = isWc ? WILDCARD_TILE_LETTER : displayLetter;
          topRarity =
            peekCard.rarity != null && String(peekCard.rarity).trim() !== ""
              ? String(peekCard.rarity)
              : getRarityForLetter(raw === WILDCARD_STACK_RAW ? "e" : raw);
          topMaterialId = isWc ? WILDCARD_MATERIAL_ID : peekCard.materialId ?? null;
          topAccessoryId = peekCard.accessoryId ?? null;
          topTileScoreBonus = Math.max(0, Math.floor(Number(peekCard.tileScoreBonus) || 0));
          topTileMultBonus = Math.max(0, Math.round(Number(peekCard.letterMultBonus) || 0));
        }
      }

      out.push({
        raw,
        displayLetter,
        count,
        inDrawPile,
        isGhost,
        topLetter,
        topRarity,
        topMaterialId,
        topAccessoryId,
        topTileScoreBonus,
        topTileMultBonus,
        entries,
      });
    }
    return out;
  });

  /** 各字母稀有度（common / rare / epic / legendary）的等级，初始 1；跨小关保留 */
  function buildDefaultRarityLevels() {
    const o = /** @type {Record<string, number>} */ ({});
    for (const r of LETTER_RARITY_ORDER) o[r] = 1;
    return o;
  }
  const rarityLevelsByRarity = shallowRef(buildDefaultRarityLevels());

  function setRarityLevel(rarity, level) {
    const r = String(rarity ?? "");
    if (!LETTER_RARITY_ORDER.includes(r)) return;
    const lv = Math.max(1, Math.round(Number(level)) || 1);
    const cur = rarityLevelsByRarity.value;
    rarityLevelsByRarity.value = { ...cur, [r]: lv };
  }

  const grid = shallowRef(buildGrid());

  const remainingWords = ref(4);

  /** 每小关默认弃牌（移除补牌）次数 */
  const remainingRemovals = ref(3);

  const currentScore = ref(0);

  const targetScore = ref(
    resolveLevelTargetScore(LEVELS[RUN_START_LEVEL_INDEX]?.id ?? "1-1", ""),
  );

  const lastWordInfo = ref(null);

  /** 本局内各「单词长度」（Qu 算 1 格，与 tiles.length 一致）成功拼出次数；跨关保留 */
  const spellCountsByLength = shallowRef(/** @type {Record<number, number>} */ ({}));

  /** 本局已成功结算的拼词次数（篮球宝藏简介进度；跨关卡保留） */
  const basketballWordsSubmitted = ref(0);

  function bumpBasketballWordSubmitted() {
    basketballWordsSubmitted.value += 1;
  }

  /** 各单词长度对应的「等级」（可升级，初始 1）；跨小关保留，新开一局随 composable 重建恢复为 1 */
  function buildDefaultLengthLevels() {
    const o = /** @type {Record<number, number>} */ ({});
    for (let len = 3; len <= 16; len++) o[len] = 1;
    return o;
  }
  const lengthLevelsByLength = shallowRef(buildDefaultLengthLevels());

  /** 望远镜二级：超出整数等级表的额外每字分数/倍率（按次升级累加） */
  const lengthUpgradeObservatoryExtra = shallowRef(
    /** @type {Record<number, { score: number, mult: number }>} */ ({}),
  );

  /** 供后续升级系统调用 */
  function setWordLengthLevel(len, level) {
    const L = Math.max(0, Math.round(Number(len)) || 0);
    if (L < 3 || L > 16) return;
    const lv = Math.max(1, Math.round(Number(level)) || 1);
    const cur = lengthLevelsByLength.value;
    lengthLevelsByLength.value = { ...cur, [L]: lv };
  }

  /**
   * 词长等级 +1；`observatoryBoost` 时本步增量按 1.5 倍（向下取整）写入 `lengthUpgradeObservatoryExtra`。
   * @param {number} len
   * @param {{ observatoryBoost?: boolean }} [opts]
   */
  function bumpWordLengthLevel(len, opts = {}) {
    const L = Math.max(0, Math.round(Number(len)) || 0);
    if (L < 3 || L > 16) return;
    const curLv = Math.max(1, Math.round(Number(lengthLevelsByLength.value[L])) || 1);
    setWordLengthLevel(L, curLv + 1);
    if (!opts.observatoryBoost) return;
    const base = getLengthUpgradeStepAdds(L);
    const boosted = getObservatoryBoostedLengthUpgradeStepAdds(L);
    const scoreDelta = boosted.scoreAdd - base.scoreAdd;
    const multDelta = boosted.multAdd - base.multAdd;
    if (scoreDelta <= 0 && multDelta <= 0) return;
    const prevAll = lengthUpgradeObservatoryExtra.value;
    const prev = prevAll[L] ?? { score: 0, mult: 0 };
    lengthUpgradeObservatoryExtra.value = {
      ...prevAll,
      [L]: { score: prev.score + scoreDelta, mult: prev.mult + multDelta },
    };
  }

  function recordSpellWordLength(tileCount) {
    const len = Math.max(0, Math.round(Number(tileCount)) || 0);
    if (len <= 0) return;
    const cur = spellCountsByLength.value;
    spellCountsByLength.value = { ...cur, [len]: (cur[len] || 0) + 1 };
  }

  function markTileAsWildcard(tile) {
    if (!tile || typeof tile !== "object") return;
    const gains = snapshotMaxIntrinsicGainsFromTile(tile);
    tile.materialId = WILDCARD_MATERIAL_ID;
    tile.letter = WILDCARD_TILE_LETTER;
    tile.rarity = "common";
    tile.baseScore = getBaseScoreForRarity("common", rarityLevelsByRarity.value);
    tile.isWildcard = true;
    const c = tile._deckCard;
    if (c && typeof c === "object") {
      c.isWildcard = true;
      c.materialId = WILDCARD_MATERIAL_ID;
      c.rarity = "common";
    }
    applyIntrinsicGainsToTileAndLinkedCard(tile, gains);
    syncTileStateToDeckCard(tile);
  }

  function buildGrid() {
    const d = deck.value;

    const manacle = activeBossSlug.value === "the_manacle";

    const rows = [];

    for (let r = 0; r < ROWS; r++) {
      const row = [];

      for (let c = 0; c < COLS; c++) {
        if (manacle && r === 0) {
          const ph = emptyTile(nextId);
          ph.bossGridBlocked = true;
          ph.letter = "";
          row.push(ph);
        } else {
          const card = drawFromDeck(d, getRng);
          row.push(
            card ? createTileFromDeckCard(card, nextId, rarityLevelsByRarity.value) : emptyTile(nextId),
          );
        }
      }

      rows.push(row);
    }

    return rows;
  }



  const selectedOrder = ref([]);



  const selectedTiles = computed(() => {

    const g = grid.value;

    return selectedOrder.value.map(({ row, col }) => ({

      row,

      col,

      tile: g[row][col],

    }));

  });



  const currentWordString = computed(() => {

    return selectedTiles.value.map(({ tile }) => tile.letter.toLowerCase()).join("");

  });



  const previewScore = computed(() => {

    const tiles = selectedTiles.value.map(({ tile }) => tile);

    if (tiles.length === 0) return null;

    const lengthJb =
      ownedVoucherIdsRef != null ? getWordLengthJudgmentBonus(ownedVoucherIdsRef.value ?? []) : 0;
    const flintOpts = activeBossSlug.value === "the_flint" ? { bossFlintQuarter: true } : {};
    flintOpts.lengthUpgradeObservatoryExtra = lengthUpgradeObservatoryExtra.value;
    const base = computeWordScore(tiles, 1, lengthLevelsByLength.value, rarityLevelsByRarity.value, lengthJb, flintOpts);
    const g = grid.value;
    const excludedKeys = gridSelectedPositionKeySet(selectedTiles.value);
    const gridPresenceMul = previewGridPresenceMultProduct(g, ROWS, COLS, excludedKeys);
    // 预览对齐当前规则：棋盘光环类材质仅统计未入本手拼词的格；冰材质仅对本次入词的冰字母位触发。
    const selectedIceCount = tiles.reduce((n, t) => n + (t?.materialId === "ice" ? 1 : 0), 0);
    const mul = gridPresenceMul * Math.pow(2, selectedIceCount);
    if (mul === 1) return base;
    return {
      ...base,
      multTotal: base.multTotal * mul,
      finalScore: Math.round(base.rawLetterScore * base.multTotal * mul * (base.treasureMultiplier || 1)),
    };

  });



  function selectTile(row, col) {

    const g = grid.value;

    const tile = g[row][col];

    if (!tile) return;

    if (tile.bossGridBlocked) return;

    if (tile.selected) return;

    tile.selected = true;

    selectedOrder.value = [...selectedOrder.value, { row, col }];

    /* 原地改 selected，用 triggerRef 通知视图；避免整盘复制引用导致快速连点时 grid 整片重协调闪烁 */
    triggerRef(grid);

  }



  function removeFromSlot(index) {

    const order = selectedOrder.value;

    if (index < 0 || index >= order.length) return;

    if (ceruleanBellSlotIndex.value != null && index <= ceruleanBellSlotIndex.value) return;

    const g = grid.value;

    for (let j = index; j < order.length; j++) {

      const { row, col } = order[j];

      g[row][col].selected = false;

    }

    selectedOrder.value = order.slice(0, index);

    triggerRef(grid);

  }



  function clearCurrentWord() {

    removeFromSlot(0);

    lastWordInfo.value = null;

  }



  /** 收集当前选中格位置（提交动画结束后调用补牌） */

  function getSelectedPositions() {

    const g = grid.value;

    const toRemove = [];

    for (let r = 0; r < ROWS; r++) {

      for (let c = 0; c < COLS; c++) {

        if (g[r][c]?.selected) toRemove.push({ row: r, col: c });

      }

    }

    return toRemove;

  }



  function clearCeruleanBellFlagsOnGrid() {
    ceruleanBellSlotIndex.value = null;
    const g = grid.value;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = g[r]?.[c];
        if (t && typeof t === "object") t.ceruleanBellLocked = false;
      }
    }
  }

  /**
   * 棋盘稳定后：青铃锁 Boss 随机标记一格（不立刻 selectTile；由 GamePanel 飞字入槽）。
   * @returns {{ row: number, col: number } | null}
   */
  function prepareCeruleanBellPickAfterGridStable() {
    if (activeBossSlug.value !== "cerulean_bell") return null;
    clearCeruleanBellFlagsOnGrid();
    const g = grid.value;
    const top = activeBossSlug.value === "the_manacle" ? 1 : 0;
    /** @type {{ r: number, c: number }[]} */
    const opts = [];
    for (let r = top; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = g[r][c];
        if (t?.letter && !t.bossGridBlocked && !t.bossTileDebuffed && !t.selected) opts.push({ r, c });
      }
    }
    if (!opts.length) return null;
    const { r, c } = opts[Math.floor(getRng() * opts.length)];
    const t = g[r][c];
    if (t && typeof t === "object") t.ceruleanBellLocked = true;
    triggerRef(grid);
    return { row: r, col: c };
  }

  function finalizeCeruleanBellSlotIndex() {
    ceruleanBellSlotIndex.value = Math.max(0, selectedOrder.value.length - 1);
  }

  function applySerpentBonusFillIfNeeded(skipNewFromDeck) {
    if (skipNewFromDeck) return;
    if (activeBossSlug.value !== "the_serpent") return;
    const g = grid.value;
    const d = deck.value;
    const top = activeBossSlug.value === "the_manacle" ? 1 : 0;
    let placed = 0;
    while (placed < 4 && d.length > 0) {
      let progressed = false;
      outer: for (let r = top; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = g[r][c];
          if (cell && !cell.bossGridBlocked && (!cell.letter || String(cell.letter).trim() === "")) {
            const card = drawFromDeck(d, getRng);
            if (!card) break outer;
            g[r][c] = createTileFromDeckCard(card, nextId, rarityLevelsByRarity.value);
            placed += 1;
            progressed = true;
            if (placed >= 4) break outer;
          }
        }
      }
      if (!progressed) break;
    }
  }

  /**
   * 下落补牌、清空选字；不修改分数与 lastWordInfo。出牌次数在点击提交时扣减，或由 finalizeSubmitAfterAnimation 扣减。
   * @param {{ skipNewFromDeck?: boolean }} [options] skipNewFromDeck：本关已结束（通关或用尽出牌仍未达标）时 true，已有字母下落到底部，顶部用 null 占位（不补牌库、不生成空字母块）。
   */
  function applySubmitRefill(options = {}) {
    const skipNewFromDeck = options.skipNewFromDeck === true;

    const g = grid.value;

    const d = deck.value;

    const manacle = activeBossSlug.value === "the_manacle";

    for (const col of [...Array(COLS).keys()]) {
      if (manacle) {
        const blocked = g[0][col];
        const columnTiles = [];
        for (let r = 1; r < ROWS; r++) {
          const cell = g[r][col];
          if (cell && !cell.selected) columnTiles.push(cloneGridTileShallowForColumn(cell));
          else if (cell?.selected) finalizeConsumedGridTileDeckCard(cell);
        }
        const playableRows = ROWS - 1;
        const removeCount = playableRows - columnTiles.length;
        const newColumn = [];
        for (let i = 0; i < removeCount; i++) {
          if (skipNewFromDeck) {
            newColumn.push(null);
          } else {
            const card = drawFromDeck(d, getRng);
            newColumn.push(
              card ? createTileFromDeckCard(card, nextId, rarityLevelsByRarity.value) : emptyTile(nextId),
            );
          }
        }
        newColumn.push(...columnTiles);
        g[0][col] = blocked;
        for (let r = 1; r < ROWS; r++) {
          g[r][col] = newColumn[r - 1];
        }
        continue;
      }

      const columnTiles = [];

      for (let r = 0; r < ROWS; r++) {

        const cell = g[r][col];
        if (cell && !cell.selected) columnTiles.push(cloneGridTileShallowForColumn(cell));
        else if (cell?.selected) finalizeConsumedGridTileDeckCard(cell);

      }

      const removeCount = ROWS - columnTiles.length;

      const newColumn = [];

      for (let i = 0; i < removeCount; i++) {

        if (skipNewFromDeck) {
          newColumn.push(null);
        } else {
          const card = drawFromDeck(d, getRng);

          newColumn.push(
            card ? createTileFromDeckCard(card, nextId, rarityLevelsByRarity.value) : emptyTile(nextId),
          );
        }

      }

      newColumn.push(...columnTiles);

      for (let r = 0; r < ROWS; r++) {

        g[r][col] = newColumn[r];

      }

    }

    applySerpentBonusFillIfNeeded(skipNewFromDeck);

    triggerRef(grid);

    selectedOrder.value = [];

  }



  /** 动画结束后：加分、lastWord、补牌 */

  function buildLastWordPayload(getDefinition, tilesSnapshot) {
    const word = tilesSnapshot.map((c) => c.letter.toLowerCase()).join("");
    const flintOpts = activeBossSlug.value === "the_flint" ? { bossFlintQuarter: true } : {};
    flintOpts.lengthUpgradeObservatoryExtra = lengthUpgradeObservatoryExtra.value;
    const scoreInfo = computeWordScoreDetailed(
      tilesSnapshot,
      1,
      lengthLevelsByLength.value,
      rarityLevelsByRarity.value,
      1,
      0,
      flintOpts,
    );
    const definition = getDefinition ? getDefinition(word) : null;
    return { word, scoreInfo, definition };
  }

  /**
   * 仅写入 lastWord（补牌前调用，避免动画末尾 UI 空窗）
   * @param {object | null} [scoreInfoOverride] 已含宝藏等调整后的计分结果（与 computeWordScoreDetailed 返回同形）
   * @param {{ resolvedWord?: string | null }} [options]
   */
  function setLastWordFromSubmit(getDefinition, tilesSnapshot, scoreInfoOverride = null, options = {}) {
    const fallbackWord = tilesSnapshot.map((c) => c.letter.toLowerCase()).join("");
    const resolvedWord = String(options?.resolvedWord ?? "").toLowerCase().trim();
    const word = resolvedWord || fallbackWord;
    const definition = getDefinition ? getDefinition(word) : null;
    const flintOpts = activeBossSlug.value === "the_flint" ? { bossFlintQuarter: true } : {};
    flintOpts.lengthUpgradeObservatoryExtra = lengthUpgradeObservatoryExtra.value;
    const scoreInfo =
      scoreInfoOverride != null
        ? scoreInfoOverride
        : computeWordScoreDetailed(tilesSnapshot, 1, lengthLevelsByLength.value, rarityLevelsByRarity.value, 1, 0, flintOpts);
    lastWordInfo.value = { word, scoreInfo, definition };
    return lastWordInfo.value;
  }

  /** skipScoreAdd：动画里已加过分时用 */
  function finalizeSubmitAfterAnimation(getDefinition, tilesSnapshot, options = {}) {
    const skipScoreAdd = options.skipScoreAdd === true;
    const payload = buildLastWordPayload(getDefinition, tilesSnapshot);
    lastWordInfo.value = payload;
    if (!skipScoreAdd) currentScore.value += payload.scoreInfo.finalScore;
    remainingWords.value = Math.max(0, remainingWords.value - 1);
    applySubmitRefill();
    return lastWordInfo.value;
  }



  /** 立即提交（无动画时可用） */

  function consumeAndRefill(getDefinition) {

    const toRemove = getSelectedPositions();

    const tiles = toRemove.map(({ row, col }) => grid.value[row][col]);

    return finalizeSubmitAfterAnimation(getDefinition, tiles);

  }



  /** 补牌/移除前：tile.id → 当前逻辑格位（与棋盘数据一致，不依赖 DOM） */
  function snapshotGridCellsByTileId() {
    const g = grid.value;
    const cells = new Map();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = g[r][c];
        if (t?.id != null && t.id !== "") cells.set(String(t.id), { row: r, col: c });
      }
    }
    return cells;
  }

  /**
   * @param {{ prevCells?: Map<string, { row: number, col: number }> }} [options]
   *        若传入与 `captureGridRectsByTileId()` 同时刻拍的 `prevCells`，可与提交路径一样保证 rect/cell 快照严格对齐。
   */
  function removeSelectedLetters(options = {}) {
    const cap = Math.max(
      1,
      Math.floor(
        Number(options?.maxRemovalLetters) >= 1 ? Number(options.maxRemovalLetters) : MAX_LETTERS_PER_REMOVAL,
      ),
    );

    const order = selectedOrder.value;

    const n = order.length;

    if (n === 0) return { success: false, error: "请先选择要移除的字母", prevCells: null };

    if (n > cap)
      return { success: false, error: `最多移除 ${cap} 个字母`, prevCells: null };

    if (remainingRemovals.value <= 0) return { success: false, error: "移除次数已用完", prevCells: null };

    const prevCells = options.prevCells ?? snapshotGridCellsByTileId();

    const g = grid.value;

    const d = deck.value;

    const removeSet = new Set(order.map(({ row, col }) => `${row},${col}`));

    const manacleRm = activeBossSlug.value === "the_manacle";

    for (let col = 0; col < COLS; col++) {

      if (manacleRm) {
        const blocked = g[0][col];
        const columnTiles = [];
        for (let r = 1; r < ROWS; r++) {
          if (!removeSet.has(`${r},${col}`)) {
            columnTiles.push(cloneGridTileShallowForColumn(g[r][col]));
          } else {
            finalizeConsumedGridTileDeckCard(g[r][col]);
          }
        }
        const playableRows = ROWS - 1;
        const removeCount = playableRows - columnTiles.length;
        const newColumn = [];
        for (let i = 0; i < removeCount; i++) {
          const card = drawFromDeck(d, getRng);
          newColumn.push(
            card ? createTileFromDeckCard(card, nextId, rarityLevelsByRarity.value) : emptyTile(nextId),
          );
        }
        newColumn.push(...columnTiles);
        g[0][col] = blocked;
        for (let r = 1; r < ROWS; r++) {
          g[r][col] = newColumn[r - 1];
        }
        continue;
      }

      const columnTiles = [];

      for (let r = 0; r < ROWS; r++) {

        if (!removeSet.has(`${r},${col}`)) {

          columnTiles.push(cloneGridTileShallowForColumn(g[r][col]));

        } else {

          finalizeConsumedGridTileDeckCard(g[r][col]);

        }

      }

      const removeCount = ROWS - columnTiles.length;

      const newColumn = [];

      for (let i = 0; i < removeCount; i++) {

        const card = drawFromDeck(d, getRng);

        newColumn.push(
          card ? createTileFromDeckCard(card, nextId, rarityLevelsByRarity.value) : emptyTile(nextId),
        );

      }

      newColumn.push(...columnTiles);

      for (let r = 0; r < ROWS; r++) {

        g[r][col] = newColumn[r];

      }

    }

    triggerRef(grid);

    selectedOrder.value = [];

    remainingRemovals.value -= 1;

    return { success: true, prevCells };

  }

  /**
   * 结算后冰块材质自毁：移除目标格并执行一列补牌（与普通移除同规则）。
   * @param {string | null | undefined} tileId
   * @returns {boolean}
   */
  function consumeIceTileOnGrid(tileId) {
    const id = String(tileId ?? "");
    if (!id) return false;
    const g = grid.value;
    let targetRow = -1;
    let targetCol = -1;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = g[r][c];
        if (t?.id === id) {
          targetRow = r;
          targetCol = c;
          break;
        }
      }
      if (targetRow >= 0) break;
    }
    if (targetRow < 0 || targetCol < 0) return false;

    const d = deck.value;
    finalizeConsumedGridTileDeckCard(g[targetRow][targetCol]);
    const manacleIce = activeBossSlug.value === "the_manacle";
    if (manacleIce) {
      const blocked = g[0][targetCol];
      const columnTiles = [];
      for (let r = 1; r < ROWS; r++) {
        if (r === targetRow) continue;
        columnTiles.push(cloneGridTileShallowForColumn(g[r][targetCol]));
      }
      const playableRows = ROWS - 1;
      const removeCount = playableRows - columnTiles.length;
      const newColumn = [];
      for (let i = 0; i < removeCount; i++) {
        const card = drawFromDeck(d, getRng);
        newColumn.push(
          card ? createTileFromDeckCard(card, nextId, rarityLevelsByRarity.value) : emptyTile(nextId),
        );
      }
      newColumn.push(...columnTiles);
      g[0][targetCol] = blocked;
      for (let r = 1; r < ROWS; r++) {
        g[r][targetCol] = newColumn[r - 1];
      }
      triggerRef(grid);
      return true;
    }
    const columnTiles = [];
    for (let r = 0; r < ROWS; r++) {
      if (r === targetRow) continue;
      columnTiles.push(cloneGridTileShallowForColumn(g[r][targetCol]));
    }
    const card = drawFromDeck(d, getRng);
    const topTile = card
      ? createTileFromDeckCard(card, nextId, rarityLevelsByRarity.value)
      : emptyTile(nextId);
    const newColumn = [topTile, ...columnTiles];
    for (let r = 0; r < ROWS; r++) {
      g[r][targetCol] = newColumn[r];
    }
    triggerRef(grid);
    return true;
  }

  function gridTileBindingRawForStageEnd(tile) {
    if (!tile?.letter) return "";
    if (tile.isWildcard === true && tile._deckCard && typeof tile._deckCard === "object") {
      return deckCardRaw(tile._deckCard);
    }
    return tileLetterToRawLowerForDeck(tile.letter);
  }

  /**
   * 小关结束进商店时调用：牌库与快照恢复为满，牌库浮层预览全部为「在库」状态。
   * 棋盘等仍保持本关结束态（进商店时主界面不展示）；点「下一关」时 resetLevel 会再整盘重建。
   * 会为本关结束时的棋盘格重新绑定牌张引用，并把格上材质/稀有度等写回牌张，以便下一小关仍生效。
   * multiset 须保留场上+牌库中已有牌张对象（剪贴板/回形针等写在牌张上的增益），再按模板补足张数，禁止整副换成全新 createDeckCard 导致增益丢失。
   */
  function resetDeckAfterStageEnd() {
    const g = grid.value;
    const template = buildInitialDeckCards();
    const live = initialDeckSnapshot.value.filter((c) => c && typeof c === "object");
    const cards = reconcileMultisetPreserveLiveWithTemplate(live, template);
    for (const c of cards) {
      if (c && typeof c === "object") /** @type {{ everLeftDrawPile?: boolean }} */ (c).everLeftDrawPile = false;
    }
    const pool = [...cards];
    initialDeckSnapshot.value = cards;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = g[r]?.[c];
        if (!t?.letter) continue;
        const bindRaw = gridTileBindingRawForStageEnd(t);
        if (!bindRaw) continue;
        const wantWildcard = t.isWildcard === true;
        if (wantWildcard) {
          const p2 = pool.findIndex((card) => deckCardRaw(card) === bindRaw && !card.isWildcard);
          if (p2 >= 0) {
            const [card] = pool.splice(p2, 1);
            t._deckCard = card;
          }
        } else {
          const pi = pool.findIndex((card) => deckCardRaw(card) === bindRaw && !card.isWildcard);
          if (pi >= 0) {
            const [card] = pool.splice(pi, 1);
            t._deckCard = card;
          }
        }
        // 重绑失败时仍保留原 _deckCard：必须把格上角标/材质等写回牌张，否则下一关 buildGrid 从牌张读会丢剪贴板等持久化。
        syncTileStateToDeckCard(t);
      }
    }
    shuffleArrayInPlace(pool, getRng);
    deck.value = pool;
  }

  /**
   * 进入下一小关：重洗牌库与棋盘，重置分数与出牌/移除次数（保留本局累计拼出次数）。
   * @param {{ id: string }} levelDef
   * @param {{ remainingWords?: number, remainingRemovals?: number, targetScore?: number, bossSlug?: string, postGridBuild?: (g: unknown[][]) => void }} [runOpts]
   */
  function resetLevel(levelDef, runOpts = {}) {
    activeBossSlug.value = String(runOpts.bossSlug ?? "");
    const tsOpt = runOpts.targetScore;
    const lid = levelDef?.id ?? "1-1";
    const ts =
      tsOpt != null && Number.isFinite(Number(tsOpt))
        ? Number(tsOpt)
        : resolveLevelTargetScore(lid, activeBossSlug.value);
    const snap = initialDeckSnapshot.value.filter((c) => c && typeof c === "object");
    for (const c of snap) {
      /** @type {{ everLeftDrawPile?: boolean }} */ (c).everLeftDrawPile = false;
    }
    shuffleArrayInPlace(snap, getRng);
    deck.value = [...snap];
    grid.value = buildGrid();
    const bh =
      runOpts?.remainingWords != null && Number.isFinite(Number(runOpts.remainingWords))
        ? Math.max(0, Math.floor(Number(runOpts.remainingWords)))
        : 4;
    const br =
      runOpts?.remainingRemovals != null && Number.isFinite(Number(runOpts.remainingRemovals))
        ? Math.max(0, Math.floor(Number(runOpts.remainingRemovals)))
        : 3;
    remainingWords.value = bh;
    remainingRemovals.value = br;
    currentScore.value = 0;
    targetScore.value = Number.isFinite(ts) ? ts : 300;
    selectedOrder.value = [];
    clearCeruleanBellFlagsOnGrid();
    lastWordInfo.value = null;
    if (typeof runOpts.postGridBuild === "function") {
      runOpts.postGridBuild(grid.value);
    }
  }

  function touchGrid() {
    triggerRef(grid);
  }

  /**
   * 从牌库与初始快照中各删去一枚对应字母（法术「删除」）。
   * @param {string[]} raws 小写；`q` 表示 Qu。
   */
  function removeDeckLetterInstancesByRaws(raws) {
    const snap = [...initialDeckSnapshot.value];
    const d = [...deck.value];
    for (const raw0 of raws) {
      let raw = String(raw0 ?? "").toLowerCase();
      if (raw === "qu") raw = "q";
      if (!raw) continue;
      const si = snap.findIndex((e) => deckCardRaw(e) === raw && !e.isWildcard);
      if (si < 0) continue;
      const removed = snap[si];
      snap.splice(si, 1);
      const di = d.indexOf(removed);
      if (di >= 0) d.splice(di, 1);
    }
    deck.value = d;
    initialDeckSnapshot.value = snap;
  }

  /**
   * 将棋盘一格替换为牌库中某 raw 的新字母块（保留格位 id，可选保留配饰）。
   * @param {boolean} [keepTileId=true]
   */
  function remapTileFromRawLetter(row, col, raw, keepTileId = true) {
    const g = grid.value;
    const prev = g[row]?.[col];
    if (!prev?.letter || raw == null || String(raw).trim() === "") return;
    const gains = snapshotMaxIntrinsicGainsFromTile(prev);
    const r = String(raw).toLowerCase() === "qu" ? "q" : String(raw).toLowerCase();
    const prevId = prev.id;
    const acc = prev.accessoryId;
    const card = prev._deckCard;
    if (card && typeof card === "object") {
      card.raw = r;
      card.isWildcard = false;
      card.materialId = null;
      card.materialScoreBonus = 0;
      card.materialMultBonus = 0;
      card.rarity = getRarityForLetter(r);
      const merged = createTileFromDeckCard(card, nextId, rarityLevelsByRarity.value);
      Object.assign(prev, merged);
      if (keepTileId) prev.id = prevId;
      prev.accessoryId = acc ?? null;
      card.accessoryId = prev.accessoryId;
      applyIntrinsicGainsToTileAndLinkedCard(prev, gains);
      syncTileStateToDeckCard(prev);
    } else {
      const nt = createTileFromLetter(r, nextId, rarityLevelsByRarity.value);
      Object.assign(prev, nt);
      if (keepTileId) prev.id = prevId;
      prev.accessoryId = acc ?? null;
      applyIntrinsicGainsToTileAndLinkedCard(prev, gains);
    }
    triggerRef(grid);
  }

  /** 全局稀有度等级变化后，刷新棋盘上各字母块的 `baseScore`（与计分侧一致） */
  function refreshGridTileBaseScoresFromLevels() {
    const rl = rarityLevelsByRarity.value;
    const g = grid.value;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = g[r]?.[c];
        if (t?.letter) {
          t.baseScore = getBaseScoreForRarity(String(t.rarity || "common"), rl);
        }
      }
    }
    triggerRef(grid);
  }

  /**
   * 商店购入：向 multiset 追加新牌张并进入抽牌堆（与初始建库同构的 `createDeckCard`）。
   * @param {{ raw: string, materialId?: string | null, accessoryId?: string | null, treasureAccessoryId?: string | null }[]} entries `raw` 小写单字母，`q` 表示 Qu。
   */
  function appendShopDeckEntries(entries) {
    if (!Array.isArray(entries) || entries.length === 0) return;
    const snap = [...initialDeckSnapshot.value];
    const d = [...deck.value];
    for (const e of entries) {
      let raw = String(e?.raw ?? "e").toLowerCase();
      if (raw === "qu") raw = "q";
      if (!/^[a-z]$/.test(raw)) raw = "e";
      const card = createDeckCard(raw);
      const mat = e?.materialId != null ? String(e.materialId).trim() : "";
      if (mat && mat !== "wildcard") {
        card.materialId = mat;
        card.materialScoreBonus = 0;
        card.materialMultBonus = 0;
        if (mat === "water") card.materialScoreBonus = WATER_MATERIAL_SCORE_BONUS;
        if (mat === "fire") card.materialMultBonus = FIRE_MATERIAL_MULT_BONUS;
      }
      const acc = e?.accessoryId != null ? String(e.accessoryId).trim() : "";
      if (acc) card.accessoryId = acc;
      const tAcc = e?.treasureAccessoryId != null ? String(e.treasureAccessoryId).trim() : "";
      if (tAcc) card.treasureAccessoryId = tAcc;
      snap.push(card);
      d.push(card);
    }
    initialDeckSnapshot.value = snap;
    deck.value = d;
  }

  return {

    grid,

    spellCountsByLength,

    basketballWordsSubmitted,

    bumpBasketballWordSubmitted,

    recordSpellWordLength,

    lengthLevelsByLength,

    lengthUpgradeObservatoryExtra,

    setWordLengthLevel,

    bumpWordLengthLevel,

    rarityLevelsByRarity,

    setRarityLevel,

    ROWS,

    COLS,

    deckCount,

    /** 当前牌库抽牌堆：牌张对象 multiset（`raw` 小写，`q` 表示 Qu） */
    deck,

    /** 本局完整牌库 multiset（含场上绑定 + 抽牌堆）；法术候选从此全集随机抽 */
    initialDeckSnapshot,

    deckStacksView,

    remainingWords,

    remainingRemovals,

    currentScore,

    targetScore,

    activeBossSlug,

    lastWordInfo,

    selectedOrder,

    ceruleanBellSlotIndex,

    selectedTiles,

    currentWordString,

    previewScore,

    selectTile,

    removeFromSlot,

    clearCurrentWord,

    consumeAndRefill,

    applySubmitRefill,

    prepareCeruleanBellPickAfterGridStable,
    finalizeCeruleanBellSlotIndex,

    finalizeSubmitAfterAnimation,

    setLastWordFromSubmit,

    getSelectedPositions,

    removeSelectedLetters,
    consumeIceTileOnGrid,

    snapshotGridCellsByTileId,

    resetLevel,

    resetDeckAfterStageEnd,

    touchGrid,

    removeDeckLetterInstancesByRaws,

    remapTileFromRawLetter,

    markTileAsWildcard,

    refreshGridTileBaseScoresFromLevels,

    appendShopDeckEntries,

  };

}

