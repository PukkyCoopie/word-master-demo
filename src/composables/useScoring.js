/**

 * 稀有度与字母分类（q 显示为 "qu" 仍按传说计）

 * 分数加成见 RARITY_BONUS；倍率加法见 RARITY_MULT_BONUS。

 */

export const RARITY_BY_LETTER = {

  common: ["a", "d", "e", "g", "i", "l", "n", "o", "r", "s", "t", "u"],

  rare: ["b", "c", "f", "h", "m", "p", "v", "w", "y"],

  epic: ["j", "k"],

  legendary: ["q", "x", "z"],

};



const RARITY_BONUS = {

  common: 1,

  rare: 2,

  epic: 4,

  legendary: 10,

};

/** 每个字母因稀有度加到「倍率总和」上的量（与 tile.letterMultBonus 相加） */
const RARITY_MULT_BONUS = {

  common: 0,

  rare: 1,

  epic: 2,

  legendary: 3,

};

/** 棋盘字母稀有度（与 tile.rarity / getRarityForLetter 一致） */
export const LETTER_RARITY_ORDER = Object.freeze(["common", "rare", "epic", "legendary"]);

/**
 * 各字母稀有度每升一级（相对 1 级）在「每字母稀有度加分 / 每字母稀有度倍率加」上的增量。
 * `multPerLevel` 可为小数（如普通 1/3、稀有 0.5）：升级在内部累加，但**计入倍率总和**时按
 * `floor((等级-1) * multPerLevel)` 取整，仅当跨整数边界时倍率才 +1（与商店升级动画一致）。
 */
export const RARITY_UPGRADE_BALANCE = Object.freeze({
  common: Object.freeze({ scorePerLevel: 1, multPerLevel: 1.0 / 3 }),
  rare: Object.freeze({ scorePerLevel: 2, multPerLevel: 0.5 }),
  epic: Object.freeze({ scorePerLevel: 4, multPerLevel: 1 }),
  legendary: Object.freeze({ scorePerLevel: 5, multPerLevel: 2 }),
});

const DEFAULT_RARITY_LEVEL = 1;

function getLevelForLetterRarity(rarity, rarityLevelsByRarity) {
  if (!rarityLevelsByRarity || typeof rarityLevelsByRarity !== "object") return DEFAULT_RARITY_LEVEL;
  const raw = rarityLevelsByRarity[rarity];
  return Math.max(DEFAULT_RARITY_LEVEL, Math.round(Number(raw)) || DEFAULT_RARITY_LEVEL);
}



/**
 * 历史兼容：棋盘格子上仍用「3 + 稀有度」写入 tile（实际结算以整词长度为准）。
 * 公式区「分数」列起始值用 getWordLengthScoreForTableLen(判定词长)（每字基础×判定词长，含画笔加成）。
 */
export const BASE_SCORE_PER_LETTER = 3;

/**
 * 统一长度平衡常量（3~16）：
 * - base: [基础分, 基础倍率]
 * - upgrade: [每升一级增加的分数, 每升一级增加的倍率]
 */
export const WORD_LENGTH_BALANCE = {
  3: { base: [3, 1], upgrade: [1, 2] },
  4: { base: [3, 2], upgrade: [1, 2] },
  5: { base: [3, 3], upgrade: [2, 3] },
  6: { base: [4, 4], upgrade: [2, 4] },
  7: { base: [4, 6], upgrade: [2, 5] },
  8: { base: [5, 9], upgrade: [2, 6] },
  9: { base: [6, 12], upgrade: [3, 8] },
  10: { base: [8, 15], upgrade: [4, 10] },
  11: { base: [11, 18], upgrade: [5, 14] },
  12: { base: [16, 22], upgrade: [8, 19] },
  13: { base: [24, 27], upgrade: [12, 25] },
  14: { base: [36, 33], upgrade: [18, 32] },
  15: { base: [60, 40], upgrade: [30, 40] },
  16: { base: [100, 50], upgrade: [50, 50] },
};

/** 单词长度（Qu 算 1 格）→ 每个字母的基础分（不含稀有度加成） */
const BASE_SCORE_PER_LETTER_BY_LENGTH = Object.fromEntries(
  Object.entries(WORD_LENGTH_BALANCE).map(([len, cfg]) => [len, Number(cfg.base?.[0]) || 0]),
);

/**
 * 兼容旧接口：升级步 1..13（1 对应长度 3，13 对应长度 15）
 * 值来自 WORD_LENGTH_BALANCE[len].upgrade[0]
 */
export const BASE_SCORE_LEVEL_UP_ADD = Object.fromEntries(
  Array.from({ length: 13 }, (_, i) => {
    const step = i + 1;
    const len = step + 2;
    return [step, Number(WORD_LENGTH_BALANCE[len]?.upgrade?.[0]) || 1];
  }),
);

const DEFAULT_BASE_PER_LETTER = 3;
const DEFAULT_WORD_LEVEL = 1;

/**
 * @param {number} len 单词字母块数量（含 Qu 为 1 块）
 */
function getLevelForWordLength(len, lengthLevelsByLength) {
  if (!lengthLevelsByLength || typeof lengthLevelsByLength !== "object") return DEFAULT_WORD_LEVEL;
  return Math.max(DEFAULT_WORD_LEVEL, Math.round(Number(lengthLevelsByLength[len])) || DEFAULT_WORD_LEVEL);
}

function cumulativeUpgradeForLength(len, level, upgradeIndex) {
  const L = Math.max(3, Math.min(16, Math.round(Number(len)) || 3));
  const lv = Math.max(DEFAULT_WORD_LEVEL, Math.round(Number(level)) || DEFAULT_WORD_LEVEL);
  const perLevelAdd = Number(WORD_LENGTH_BALANCE[L]?.upgrade?.[upgradeIndex]) || 0;
  return Math.max(0, lv - 1) * perLevelAdd;
}

/** @param {Record<number, { score?: number, mult?: number }> | null | undefined} extra */
function observatoryExtraForLen(extra, len) {
  if (!extra || typeof extra !== "object") return { score: 0, mult: 0 };
  const row = extra[len];
  if (!row || typeof row !== "object") return { score: 0, mult: 0 };
  return {
    score: Math.max(0, Math.floor(Number(row.score) || 0)),
    mult: Math.max(0, Math.floor(Number(row.mult) || 0)),
  };
}

/** @param {number} len 3–16 */
export function getLengthUpgradeStepAdds(len) {
  const L = Math.max(0, Math.round(Number(len)) || 0);
  const clamped = L <= 0 ? 3 : L < 3 ? 3 : L > 16 ? 16 : L;
  const u = WORD_LENGTH_BALANCE[clamped]?.upgrade;
  return {
    scoreAdd: Math.max(0, Math.floor(Number(u?.[0]) || 1)),
    multAdd: Math.max(0, Math.floor(Number(u?.[1]) || 1)),
  };
}

/** 望远镜二级：单次升级步的分数/倍率增量 ×1.5（向下取整） */
export function getObservatoryBoostedLengthUpgradeStepAdds(len) {
  const { scoreAdd, multAdd } = getLengthUpgradeStepAdds(len);
  return {
    scoreAdd: Math.floor(scoreAdd * 1.5),
    multAdd: Math.floor(multAdd * 1.5),
  };
}

export function getBaseScorePerLetterForWordLength(
  len,
  lengthLevelsByLength = null,
  lengthUpgradeObservatoryExtra = null,
) {
  const L = Math.max(0, Math.round(Number(len)) || 0);
  const clamped = L <= 0 ? 3 : L < 3 ? 3 : L > 16 ? 16 : L;
  const base = BASE_SCORE_PER_LETTER_BY_LENGTH[clamped] ?? DEFAULT_BASE_PER_LETTER;
  const level = getLevelForWordLength(clamped, lengthLevelsByLength);
  const obs = observatoryExtraForLen(lengthUpgradeObservatoryExtra, clamped);
  return base + cumulativeUpgradeForLength(clamped, level, 0) + obs.score;
}

/**
 * 词长分数段：查表每字基础 × **判定词长**（含画笔等；与棋盘格数可不同）。
 * @param {number} judgedLen 等效词长（已 clamp 的 3–16）
 */
export function getWordLengthScoreForTableLen(
  judgedLen,
  lengthLevelsByLength = null,
  lengthUpgradeObservatoryExtra = null,
) {
  const L = Math.max(0, Math.round(Number(judgedLen)) || 0);
  const clamped = L <= 0 ? 3 : L < 3 ? 3 : L > 16 ? 16 : L;
  return (
    clamped *
    getBaseScorePerLetterForWordLength(clamped, lengthLevelsByLength, lengthUpgradeObservatoryExtra)
  );
}

/** 与 {@link getBaseScorePerLetterForWordLength} 相同，供新代码引用 */
export const getBaseScoreForWordLength = getBaseScorePerLetterForWordLength;



export const RARITY_SCORES = {

  common: BASE_SCORE_PER_LETTER + RARITY_BONUS.common,

  rare: BASE_SCORE_PER_LETTER + RARITY_BONUS.rare,

  epic: BASE_SCORE_PER_LETTER + RARITY_BONUS.epic,

  legendary: BASE_SCORE_PER_LETTER + RARITY_BONUS.legendary,

};



const LETTER_TO_RARITY = (() => {

  const m = new Map();

  for (const [rarity, letters] of Object.entries(RARITY_BY_LETTER)) {

    for (const c of letters) m.set(c, rarity);

  }

  return m;

})();



/** 单词长度（Qu 算一个字母块）→ 倍率 */
export const LENGTH_MULTIPLIER = Object.fromEntries(
  Object.entries(WORD_LENGTH_BALANCE).map(([len, cfg]) => [len, Number(cfg.base?.[1]) || 0]),
);

/**
 * 兼容旧接口：升级步 1..13（1 对应长度 3，13 对应长度 15）
 * 值来自 WORD_LENGTH_BALANCE[len].upgrade[1]
 */
export const BASE_MULTIPLIER_LEVEL_UP_ADD = Object.fromEntries(
  Array.from({ length: 13 }, (_, i) => {
    const step = i + 1;
    const len = step + 2;
    return [step, Number(WORD_LENGTH_BALANCE[len]?.upgrade?.[1]) || 1];
  }),
);

const DEFAULT_LENGTH_MULT = 1;



export function getRarityForLetter(letter) {

  const key = letter.toLowerCase() === "qu" ? "q" : letter.toLowerCase();

  return LETTER_TO_RARITY.get(key) ?? "common";

}



export function getBaseScoreForRarity(rarity, rarityLevelsByRarity = null) {

  return BASE_SCORE_PER_LETTER + getRarityBonusForRarity(rarity, rarityLevelsByRarity);

}



/** 稀有度奖励分（不含随词长变化的基础分） */

export function getRarityBonusForRarity(rarity, rarityLevelsByRarity = null) {

  const base = RARITY_BONUS[rarity] ?? 1;

  const cfg = RARITY_UPGRADE_BALANCE[rarity];

  const per = cfg ? Number(cfg.scorePerLevel) || 0 : 0;

  const lv = getLevelForLetterRarity(rarity, rarityLevelsByRarity);

  return base + Math.max(0, lv - 1) * per;

}

/** 稀有度带来的倍率加法（不含宝藏写在 tile 上的 letterMultBonus） */
export function getRarityMultBonusForRarity(rarity, rarityLevelsByRarity = null) {
  const base = RARITY_MULT_BONUS[rarity] ?? 0;
  const cfg = RARITY_UPGRADE_BALANCE[rarity];
  const per = cfg ? Number(cfg.multPerLevel) || 0 : 0;
  const lv = getLevelForLetterRarity(rarity, rarityLevelsByRarity);
  const upgradeSteps = Math.max(0, lv - 1);
  return base + Math.floor(upgradeSteps * per);
}

/**
 * 详情「分数×倍率」分数侧：与 {@link computeWordScoreDetailed} 单字母项一致（稀有度奖励分 + 格上加分；
 * 不含词长每字基础 3、不含材质分——材质见独立分区）。
 */
export function getPerLetterIntrinsicScoreDisplay(
  rarity,
  rarityLevelsByRarity = null,
  tileScoreBonus = 0,
) {
  const rarityPart = getRarityBonusForRarity(rarity, rarityLevelsByRarity);
  const extra = Math.max(0, Math.floor(Number(tileScoreBonus) || 0));
  return rarityPart + extra;
}

/**
 * 详情「分数×倍率」倍率侧：稀有度倍率 + 格上倍率（不含材质倍率——材质见独立分区）。
 */
export function getPerLetterIntrinsicMultDisplay(
  rarity,
  rarityLevelsByRarity = null,
  tileMultBonus = 0,
) {
  const rarityPart = getRarityMultBonusForRarity(rarity, rarityLevelsByRarity);
  const extra = Math.max(0, Math.round(Number(tileMultBonus) || 0));
  return rarityPart + extra;
}

export function sumLetterScores(tiles) {

  return tiles.reduce((sum, c) => sum + (c.baseScore ?? 0), 0);

}



export function getWordLength(tiles) {

  return tiles.length;

}



export function getLengthMultiplier(
  len,
  lengthLevelsByLength = null,
  lengthUpgradeObservatoryExtra = null,
) {
  const L = Math.max(0, Math.round(Number(len)) || 0);
  const clamped = L <= 0 ? 3 : L < 3 ? 3 : L > 16 ? 16 : L;
  const base = LENGTH_MULTIPLIER[clamped] ?? DEFAULT_LENGTH_MULT;
  const level = getLevelForWordLength(clamped, lengthLevelsByLength);
  const obs = observatoryExtraForLen(lengthUpgradeObservatoryExtra, clamped);
  return base + cumulativeUpgradeForLength(clamped, level, 1) + obs.mult;
}



/**

 * 详细计分：

 * 分数部分 = 判定词长×每字基础分 + Σ 单字母 baseScore（稀有度/材质/角标等，不含词长每字基础）；
 * 倍率部分 = 长度倍率 + Σ(tile.letterMultBonus + tile.materialMultBonus + 稀有度倍率)；

 * 最终 = round(分数部分 × 倍率部分 × 宝藏倍率)

 */

export function computeWordScoreDetailed(
  tiles,
  treasureMultiplier = 1,
  lengthLevelsByLength = null,
  rarityLevelsByRarity = null,
  lengthMultFactor = 1,
  lengthJudgmentBonus = 0,
  opts = {},
) {

  const tileCount = tiles.length;
  const jb = Math.max(0, Math.floor(Number(lengthJudgmentBonus) || 0));
  const rawLen = tileCount + jb;
  const len = rawLen <= 0 ? 3 : rawLen < 3 ? 3 : rawLen > 16 ? 16 : rawLen;

  const lm = Math.max(0, Number(lengthMultFactor) || 1);
  const lengthUpgradeExtra = opts?.lengthUpgradeObservatoryExtra ?? null;
  const lengthMult = getLengthMultiplier(len, lengthLevelsByLength, lengthUpgradeExtra) * lm;

  const wordLengthScore = getWordLengthScoreForTableLen(len, lengthLevelsByLength, lengthUpgradeExtra);

  const letterParts = tiles.map((c) => {

    if (c?.bossTileDebuffed) {
      return {
        letter: c.letter,
        baseScore: 0,
        rarityBonus: 0,
        tileScoreBonus: 0,
        materialScoreBonus: 0,
        rarity: c.rarity ?? "common",
        rarityMultBonus: 0,
        tileLetterMultBonus: 0,
        materialMultBonus: 0,
        letterMultBonus: 0,
      };
    }

    const rarity = c.rarity ?? "common";

    const rarityBonus = getRarityBonusForRarity(rarity, rarityLevelsByRarity);

    const rarityMultBonus = getRarityMultBonusForRarity(rarity, rarityLevelsByRarity);

    const tileScoreBonus = Math.max(0, Math.floor(Number(c.tileScoreBonus) || 0));

    const materialScoreBonus = Math.max(0, Math.floor(Number(c.materialScoreBonus) || 0));

    const tileLetterMultBonus = Number(c.letterMultBonus) || 0;

    const materialMultBonus = Number(c.materialMultBonus) || 0;

    return {

      letter: c.letter,

      baseScore: rarityBonus + tileScoreBonus + materialScoreBonus,

      rarityBonus,

      tileScoreBonus,

      materialScoreBonus,

      rarity,

      rarityMultBonus,

      tileLetterMultBonus,

      materialMultBonus,

      letterMultBonus: tileLetterMultBonus + materialMultBonus + rarityMultBonus,

    };

  });

  const letterScoreSum = letterParts.reduce((s, p) => s + p.baseScore, 0);
  const scoreSum = wordLengthScore + letterScoreSum;

  const letterMultSum = letterParts.reduce((s, p) => s + p.letterMultBonus, 0);

  const multTotal = lengthMult + letterMultSum;

  const fq = opts?.bossFlintQuarter === true;
  const scoreSumAdj = fq ? scoreSum * 0.5 : scoreSum;
  const multTotalAdj = fq ? multTotal * 0.5 : multTotal;

  const finalScore = Math.round(scoreSumAdj * multTotalAdj * treasureMultiplier);

  return {

    letterParts,

    wordLengthScore,

    letterScoreSum,

    scoreSum: scoreSumAdj,

    lengthMultiplier: lengthMult,

    letterMultSum,

    multTotal: multTotalAdj,

    treasureMultiplier,

    finalScore,

    /** 用于长度倍率与每字基础分的等效词长（已 clamp）；字母块数仍为 `letterParts.length` */
    lengthTableLen: len,

    lengthJudgmentBonus: jb,

  };

}



export function computeWordScore(
  tiles,
  treasureMultiplier = 1,
  lengthLevelsByLength = null,
  rarityLevelsByRarity = null,
  lengthJudgmentBonus = 0,
  opts = {},
) {

  const d = computeWordScoreDetailed(
    tiles,
    treasureMultiplier,
    lengthLevelsByLength,
    rarityLevelsByRarity,
    1,
    lengthJudgmentBonus,
    opts,
  );

  return {

    rawLetterScore: d.scoreSum,

    lengthMultiplier: d.lengthMultiplier,

    letterMultSum: d.letterMultSum,

    multTotal: d.multTotal,

    treasureMultiplier: d.treasureMultiplier,

    finalScore: d.finalScore,

    letterParts: d.letterParts,

  };

}

/** 万能材质格：显示 `?`，提交时由词典解析为真实字母。 */
export function isWildcardMaterialTile(tile) {
  return Boolean(
    tile?.isWildcard === true ||
      tile?.materialId === "wildcard" ||
      String(tile?.letter ?? "").trim() === "?",
  );
}

/**
 * 按 `resolveWordPattern` 得到的小写整词，把各槽位 pattern 片段为单个 `?` 的格写回真实 `letter`/`rarity`/`baseScore`（与棋盘普通字母一致）。
 * `resolvedLower` 须与 `tiles` 拼出的 pattern 等长（`qu` 等双字符格占 pattern 中两格）。
 */
export function withWildcardsResolvedForScoring(tiles, resolvedLower, rarityLevelsByRarity = null) {
  const res = String(resolvedLower ?? "").toLowerCase();
  if (!Array.isArray(tiles) || tiles.length === 0 || !res) return (tiles ?? []).map((t) => ({ ...t }));
  let pos = 0;
  return tiles.map((tile) => {
    const frag = String(tile?.letter ?? "").toLowerCase();
    const start = pos;
    pos += frag.length;
    const out = { ...tile };
    if (!isWildcardMaterialTile(tile) || frag !== "?") return out;
    const ch = res[start];
    if (!ch || ch < "a" || ch > "z") return out;
    const letter = ch === "q" ? "Qu" : ch.toUpperCase();
    const rarity = getRarityForLetter(ch);
    out.letter = letter;
    out.rarity = rarity;
    out.baseScore = getBaseScoreForRarity(rarity, rarityLevelsByRarity);
    return out;
  });
}
