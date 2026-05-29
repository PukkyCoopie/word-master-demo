/** 种子显示串允许字符（不含易混 0/O，与 Balatro 自动种子习惯接近） */
const SEED_CHARSET = "123456789ABCDEFGHIJKLMNPQRSTUVWXYZ";
const SEED_DISPLAY_MAX_LEN = 8;

/**
 * 确定性伪随机 [0, 1)，支持导出/恢复内部状态（存档续局）
 * @param {number} seed
 * @returns {{ next: () => number, getState: () => number, setState: (t: number) => void }}
 */
export function mulberry32WithState(seed) {
  let t = seed >>> 0;
  return {
    next() {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    },
    getState() {
      return t >>> 0;
    },
    setState(nextT) {
      t = coerceRunSeedNumeric(nextT);
    },
  };
}

/**
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  const core = mulberry32WithState(seed);
  return () => core.next();
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function coerceRunSeedNumeric(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n >>> 0 : 0;
}

/**
 * @param {unknown} runSeed
 * @param {...unknown} tags
 * @returns {number}
 */
export function hashSeed32(runSeed, ...tags) {
  let h = coerceRunSeedNumeric(runSeed) ^ 0x9e3779b9;
  for (const tag of tags) {
    const s = String(tag ?? "");
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
    }
    h = Math.imul(h ^ tags.length, 0x85ebca6b);
  }
  return h >>> 0;
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeRunSeedInput(raw) {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/0/g, "O")
    .replace(/[^1-9A-Z]/g, "")
    .slice(0, SEED_DISPLAY_MAX_LEN);
}

/**
 * @param {string} display
 * @returns {number}
 */
export function stringToRunSeed(display) {
  const s = normalizeRunSeedInput(display);
  if (!s) return 0;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * @param {number} [length=8]
 * @returns {string}
 */
export function generateRandomRunSeedString(length = SEED_DISPLAY_MAX_LEN) {
  const n = Math.max(1, Math.min(SEED_DISPLAY_MAX_LEN, Math.floor(length)));
  let out = "";
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * SEED_CHARSET.length);
    out += SEED_CHARSET[idx] ?? "7";
  }
  return out;
}

/**
 * @param {string} seedDisplayInput 弹层输入（可空 → 随机生成显示串）
 * @returns {{ seedNumeric: number, seedDisplay: string }}
 */
export function resolveRunSeedFromDialog(seedDisplayInput = "") {
  let seedDisplay = normalizeRunSeedInput(seedDisplayInput);
  if (!seedDisplay) seedDisplay = generateRandomRunSeedString();
  return { seedNumeric: stringToRunSeed(seedDisplay), seedDisplay };
}

/**
 * @param {number} runSeedNumeric
 * @param {number} [initialState] 可选：恢复 mulberry32 内部 t
 * @returns {{ next: () => number, getState: () => number, setState: (t: number) => void, fork: (tag: string) => { next: () => number } }}
 */
export function createRunRng(runSeedNumeric, initialState) {
  const seed = coerceRunSeedNumeric(runSeedNumeric);
  const core = mulberry32WithState(seed);
  if (initialState != null) {
    core.setState(initialState);
  }
  return {
    next: () => core.next(),
    getState: () => core.getState(),
    setState: (t) => core.setState(t),
    fork(tag) {
      const sub = hashSeed32(seed, "fork", tag, core.next());
      const subCore = mulberry32WithState(sub);
      return { next: () => subCore.next() };
    },
  };
}
