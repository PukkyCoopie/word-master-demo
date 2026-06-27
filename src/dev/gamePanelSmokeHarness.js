import { findAllValidWordsOnGrid, pickBestWord } from "../game/gridWordFinder.js";

/**
 * DEV / Playwright smoke：局内程序化选词、提交、进商店。
 * 挂载 `globalThis.__WM_SMOKE__`（仅 import.meta.env.DEV）。
 */
export function registerGamePanelSmokeHarness(deps) {
  if (!import.meta.env.DEV) return () => {};

  function gridCellsForFinder() {
    const grid = deps.getGrid?.();
    if (!grid) return [];
    /** @type {import('../game/gridWordFinder.js').GridCell[]} */
    const cells = [];
    for (let r = 0; r < deps.ROWS; r++) {
      for (let c = 0; c < deps.COLS; c++) {
        const tile = grid[r]?.[c];
        if (!tile?.letter) continue;
        cells.push({
          row: r,
          col: c,
          letter: tile.letter,
          isWildcard: !!tile.isWildcard,
          blocked: !!tile.bossGridBlocked,
          bossDebuffed: !!tile.bossTileDebuffed,
        });
      }
    }
    return cells;
  }

  function findFirstValidWordPick() {
    if (!deps.refs.dictionaryReady.value) return null;
    const picks = findAllValidWordsOnGrid(
      gridCellsForFinder(),
      deps.getCandidateWordsByLength,
      deps.resolveWordPattern,
    );
    return pickBestWord(picks, (p) => p.word.length) ?? picks[0] ?? null;
  }

  async function clearWordSelection() {
    while (deps.getSelectedOrderLength() > 0) {
      deps.removeFromSlot(deps.getSelectedOrderLength() - 1);
      await deps.nextTick();
    }
  }

  async function selectWordPick(pick) {
    await clearWordSelection();
    for (const cell of pick.path) {
      deps.selectTile(cell.row, cell.col);
      await deps.nextTick();
    }
  }

  async function enterShop() {
    if (deps.refs.transitionBusy.value) {
      return { ok: false, reason: "transition-busy" };
    }
    deps.refs.showSettlement.value = false;
    deps.refs.showRunEnd.value = false;
    deps.refs.showPauseOptions.value = false;
    deps.refs.showDeveloperOptions.value = false;
    await deps.nextTick();
    if (!deps.refs.showShop.value) {
      deps.refs.showShop.value = true;
    }
    await deps.nextTick();
    return { ok: true };
  }

  async function submitFirstValidWord() {
    if (!deps.refs.gridIntroDone.value) {
      return { ok: false, reason: "grid-not-ready" };
    }
    if (deps.refs.showShop.value) {
      return { ok: false, reason: "in-shop" };
    }
    const pick = findFirstValidWordPick();
    if (!pick) return { ok: false, reason: "no-valid-word" };
    await selectWordPick(pick);
    await deps.submitWord();
    return { ok: true, word: pick.word };
  }

  async function waitForPlayfieldIdle(maxMs = 12000) {
    const start = performance.now();
    while (performance.now() - start < maxMs) {
      const busy =
        deps.refs.transitionBusy.value ||
        deps.getScoringAnimating?.() ||
        deps.getGridRefillAnimating?.() ||
        deps.getSubmitWordBusy?.();
      if (!busy && deps.refs.gridIntroDone.value && !deps.refs.showShop.value) {
        return { ok: true };
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    return { ok: false, reason: "timeout" };
  }

  const api = {
    findFirstValidWordPick,
    enterShop,
    submitFirstValidWord,
    waitForPlayfieldIdle,
  };

  globalThis.__WM_SMOKE__ = api;

  return () => {
    if (globalThis.__WM_SMOKE__ === api) delete globalThis.__WM_SMOKE__;
  };
}
