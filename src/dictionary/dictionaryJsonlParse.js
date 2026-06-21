/**
 * 词库 JSONL（每行一条 JSON 数组）流式扫描，避免 JSON.parse 整包数组的内存峰值。
 */

/** @param {string} text */
export function* iterateTrimmedLines(text) {
  let start = 0;
  const len = text.length;
  for (let i = 0; i <= len; i += 1) {
    if (i === len || text.charCodeAt(i) === 10) {
      if (i > start) {
        const line = text.slice(start, i).trim();
        if (line) yield line;
      }
      start = i + 1;
    }
  }
}

/**
 * @param {string} line
 * @returns {{ word: string, pos: string } | null}
 */
export function parseCoreJsonlLine(line) {
  let row;
  try {
    row = JSON.parse(line);
  } catch {
    return null;
  }
  if (!Array.isArray(row) || row.length < 2) return null;
  const [word, pos] = row;
  if (typeof word !== "string" || !word) return null;
  return { word, pos: String(pos ?? "") };
}

/**
 * @param {string} line
 * @returns {{ word: string, translation_zh: string } | null}
 */
export function parseDefsJsonlLine(line) {
  let row;
  try {
    row = JSON.parse(line);
  } catch {
    return null;
  }
  if (!Array.isArray(row) || row.length < 2) return null;
  const [word, translation_zh] = row;
  if (typeof word !== "string" || !word) return null;
  return { word, translation_zh: String(translation_zh ?? "") };
}

/**
 * @param {string} text
 */
export function estimateLineCountFromText(text) {
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) count += 1;
  }
  return Math.max(1, count);
}

/**
 * @param {string} text
 */
export function estimateJsonlLineCount(text) {
  return estimateLineCountFromText(text);
}
