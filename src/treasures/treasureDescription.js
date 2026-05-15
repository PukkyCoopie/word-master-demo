/**
 * 宝藏简介富文本片段（在数据里写死结构，由 TreasureDescRichText 渲染）。
 * 规范见同目录 treasureDescriptionSpec.md
 */

/** @typedef {'普通' | '稀有' | '史诗' | '传说'} TreasureRarityLabel */

/**
 * @typedef {Object} TreasureDescText
 * @property {'text'} type
 * @property {string} v
 */

/**
 * @typedef {Object} TreasureDescRarity
 * @property {'rarity'} type
 * @property {TreasureRarityLabel} v
 */

/**
 * @typedef {Object} TreasureDescMult
 * @property {'mult'} type
 * @property {string} v  加法倍率如 "+4"、"+0-26"；乘号倍率用 ASCII `x` 开头如 "x3"（展示为 ×3 + 洋红底白字）
 */

/**
 * @typedef {Object} TreasureDescScore
 * @property {'score'} type
 * @property {string} v  如 "+20"、"+0"，含 + 号
 */

/**
 * @typedef {Object} TreasureDescMoney
 * @property {'money'} type
 * @property {string} v  仅金额数字，渲染为金色 $v
 */

/**
 * @typedef {Object} TreasureDescBreak
 * @property {'br'} type
 */

/**
 * @typedef {Object} TreasureDescGain
 * @property {'gain'} type
 * @property {string} v
 */

/**
 * @typedef {Object} TreasureDescGainBlock
 * @property {'gainBlock'} type
 * @property {TreasureDescSegment[]} parts
 */

/**
 * @typedef {TreasureDescText | TreasureDescRarity | TreasureDescMult | TreasureDescScore | TreasureDescMoney | TreasureDescBreak | TreasureDescGain | TreasureDescGainBlock} TreasureDescSegment
 * 导出类型供 JSDoc 引用（treasureTypes.js）
 */

/** @type {ReadonlySet<string>} */
export const TREASURE_RARITY_LABELS = new Set(["普通", "稀有", "史诗", "传说"]);

/**
 * @param {...(string | TreasureDescSegment)} parts  字符串自动转为 text 段
 * @returns {TreasureDescSegment[]}
 */
export function describe(...parts) {
  /** @type {TreasureDescSegment[]} */
  const out = [];
  for (const p of parts) {
    if (typeof p === "string") {
      if (p.length) out.push({ type: "text", v: p });
    } else {
      out.push(p);
    }
  }
  return out;
}

/** @param {TreasureRarityLabel} v */
export function rarity(v) {
  if (!TREASURE_RARITY_LABELS.has(v)) {
    console.warn(`[treasureDescription] 未知稀有度标签: ${v}`);
  }
  return /** @type {TreasureDescRarity} */ ({ type: "rarity", v });
}

/** @param {string} v */
export function mult(v) {
  return /** @type {TreasureDescMult} */ ({ type: "mult", v });
}

/** @param {string} v */
export function score(v) {
  return /** @type {TreasureDescScore} */ ({ type: "score", v });
}

/**
 * @param {string} v 仅数字部分，如 "3" → 显示为 $3
 */
export function money(v) {
  return /** @type {TreasureDescMoney} */ ({ type: "money", v });
}

/** 简介中须加粗的「具名材质增益」短词（非 chip）；仅用于如「万能块」等玩家向材质名，禁止整句或抽象效果文案 */
export function gain(v) {
  return /** @type {TreasureDescGain} */ ({ type: "gain", v: String(v ?? "") });
}

/**
 * @param {unknown} raw
 * @returns {TreasureDescSegment[]}
 */
export function normalizeTreasureDescription(raw) {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.length) {
    return [{ type: "text", v: raw }];
  }
  return [{ type: "text", v: "" }];
}

/**
 * 将片段中 text 里「全角或半角括号包裹」的整段前置换行（用于简介展示）
 * @param {TreasureDescSegment[]} segments
 * @returns {TreasureDescSegment[]}
 */
export function injectLineBreaksBeforeParentheses(segments) {
  /** @type {TreasureDescSegment[]} */
  const out = [];
  for (const seg of segments) {
    if (seg.type === "gain" || seg.type === "gainBlock") {
      out.push(seg);
      continue;
    }
    if (seg.type !== "text") {
      out.push(seg);
      continue;
    }
    const v = seg.v;
    if (!v) continue;
    const re = /[（(][^）)]*[）)]/g;
    let last = 0;
    let m;
    let found = false;
    while ((m = re.exec(v)) !== null) {
      found = true;
      const before = v.slice(last, m.index);
      if (before.length) out.push({ type: "text", v: before });
      out.push({ type: "br" });
      out.push({ type: "text", v: m[0] });
      last = m.index + m[0].length;
    }
    if (!found) {
      out.push({ type: "text", v });
    } else if (last < v.length) {
      out.push({ type: "text", v: v.slice(last) });
    }
  }
  return out;
}

/**
 * 字母块详情稀有度行：「+n 分 · 倍率 +m」→ 片段（与 describe 样式一致）
 * @param {number|string} score
 * @param {number|string} mult
 * @returns {TreasureDescSegment[]}
 */
export function formatRarityEffectLineSegments(score, mult) {
  const si = `${score}`;
  const mi = `${mult}`;
  const sChip = si.startsWith("+") || si.startsWith("-") ? si : `+${si}`;
  const mChip = mi.startsWith("+") || mi.startsWith("-") ? mi : `+${mi}`;
  return [
    { type: "score", v: sChip },
    { type: "text", v: " 分 · 倍率 " },
    { type: "mult", v: mChip },
  ];
}

/**
 * 将纯文案中的 `+$n`、`$n`、`+n 分数`、`+n 倍率`、`xn/x.n 倍率`、`n 分`、`倍率 +n` 等拆成片段（材质/配饰/法术等整段字符串用）。
 * @param {string} str
 * @returns {TreasureDescSegment[]}
 */
export function parsePlainEffectCopyToSegments(str) {
  const s = String(str ?? "");
  if (!s.length) return [];
  /** @type {TreasureDescSegment[]} */
  const out = [];
  let i = 0;
  let buf = "";
  function flushBuf() {
    if (buf.length) {
      out.push({ type: "text", v: buf });
      buf = "";
    }
  }
  while (i < s.length) {
    const rest = s.slice(i);
    let m;
    if ((m = rest.match(/^\+\$(\d+)/))) {
      flushBuf();
      out.push({ type: "money", v: m[1] });
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^\$(\d+)/))) {
      flushBuf();
      out.push({ type: "money", v: m[1] });
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^\+\d+(?:\.\d+)?\s*分数/))) {
      flushBuf();
      const head = rest.match(/^\+\d+(?:\.\d+)?/);
      if (head) out.push({ type: "score", v: head[0] });
      const tail = m[0].slice(head?.[0].length ?? 0);
      if (tail.length) out.push({ type: "text", v: tail });
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^\+\d+(?:\.\d+)?\s*倍率/))) {
      flushBuf();
      const head = rest.match(/^\+\d+(?:\.\d+)?/);
      if (head) out.push({ type: "mult", v: head[0] });
      const tail = m[0].slice(head?.[0].length ?? 0);
      if (tail.length) out.push({ type: "text", v: tail });
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^[x×]\s*\d+(?:\.\d+)?(?:\s*倍率)?/i))) {
      flushBuf();
      const full = m[0];
      const coreM = full.match(/^[x×]\s*\d+(?:\.\d+)?/i);
      const core = coreM ? coreM[0] : full;
      const numM = core.match(/[x×]\s*(\d+(?:\.\d+)?)/i);
      const num = numM ? numM[1] : "";
      out.push({ type: "mult", v: `x${num}` });
      const tail = full.slice(core.length);
      if (tail.length) out.push({ type: "text", v: tail });
      i += full.length;
      continue;
    }
    if ((m = rest.match(/^\+\d+(?:\.\d+)?\s*分(?!数)/))) {
      flushBuf();
      const head = rest.match(/^\+\d+(?:\.\d+)?/);
      if (head) out.push({ type: "score", v: head[0] });
      const tail = m[0].slice(head?.[0].length ?? 0);
      if (tail.length) out.push({ type: "text", v: tail });
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^\d+(?:\.\d+)?\s*分(?!数)/))) {
      flushBuf();
      const head = rest.match(/^\d+(?:\.\d+)?/);
      if (head) out.push({ type: "score", v: `+${head[0]}` });
      const tail = m[0].slice(head?.[0].length ?? 0);
      if (tail.length) out.push({ type: "text", v: tail });
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^倍率\s*(\+\d+(?:\.\d+)?|-?\d+(?:\.\d+)?)/))) {
      flushBuf();
      const full = m[0];
      const val = m[1];
      const prefixLen = full.length - val.length;
      const prefix = full.slice(0, prefixLen);
      if (prefix.length) out.push({ type: "text", v: prefix });
      const v = val.startsWith("+") || val.startsWith("-") ? val : `+${val}`;
      out.push({ type: "mult", v });
      i += full.length;
      continue;
    }
    buf += s[i];
    i += 1;
  }
  flushBuf();
  /** @type {TreasureDescSegment[]} */
  const merged = [];
  for (const seg of out) {
    const last = merged[merged.length - 1];
    if (seg.type === "text" && last?.type === "text") last.v += seg.v;
    else merged.push(seg);
  }
  return merged.length ? merged : [{ type: "text", v: "" }];
}

/**
 * 将片段中每个 text 段再拆出分数/倍率/金额 chip（已结构化的 score/mult 等保持不变）
 * @param {TreasureDescSegment[]} segments
 * @returns {TreasureDescSegment[]}
 */
export function expandEffectTokensInDescription(segments) {
  /** @type {TreasureDescSegment[]} */
  const out = [];
  for (const seg of segments) {
    if (seg.type === "text") {
      out.push(...parsePlainEffectCopyToSegments(seg.v));
    } else if (seg.type === "gainBlock") {
      out.push({ type: "gainBlock", parts: expandEffectTokensInDescription(seg.parts) });
    } else {
      out.push(seg);
    }
  }
  return out;
}

/**
 * 将若干片段包在同一 span 内（便于嵌套 chip）；**不再**整段加粗，宽文案请直接用 `describe(...)`。
 * @param {...(string | TreasureDescSegment)} parts
 * @returns {TreasureDescGainBlock}
 */
export function gainBlock(...parts) {
  const raw = describe(...parts);
  const expanded = expandEffectTokensInDescription(raw);
  return { type: "gainBlock", parts: injectLineBreaksBeforeParentheses(expanded) };
}
