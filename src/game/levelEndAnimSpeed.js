/** @typedef {{ currentSpeed: number, advanceBeat: () => number, addBeats: (n: number) => void }} LevelEndBeatState */

/** @type {() => number} */
let speedProvider = () => 1;

/** @type {LevelEndBeatState | null} */
let boundBeatState = null;

/** @param {() => number} fn */
export function setLevelEndAnimSpeedProvider(fn) {
  speedProvider = typeof fn === "function" ? fn : () => 1;
}

export function resetLevelEndAnimSpeedProvider() {
  speedProvider = () => 1;
  boundBeatState = null;
}

/** @param {LevelEndBeatState | null} state */
export function bindLevelEndBeatState(state) {
  boundBeatState = state;
}

/** @param {number} n */
export function addLevelEndExtraBeats(n) {
  boundBeatState?.addBeats(n);
}

export function getLevelEndAnimSpeed() {
  const s = Number(speedProvider());
  return Number.isFinite(s) && s > 0 ? s : 1;
}
