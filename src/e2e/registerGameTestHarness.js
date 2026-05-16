import { findAllValidWordsOnGrid } from "./gridWordFinder.js";
import { pickPlayerLikeWord } from "./e2ePickStrategy.js";
import { bossViolationReasonForPick } from "./e2eBossRules.js";
import { runShopVisit } from "./e2eShopAutomation.js";

/**
 * @param {object} ctx
 */
export function registerGameTestHarness(ctx) {
  const {
    getGridSnapshot,
    getTileAt,
    selectTile,
    clearCurrentWord,
    submitWord,
    getPreviewScoreForPick,
    resolveWordPattern,
    getDictCandidatesByLength,
    getStateSnapshot,
    getBossPlayContext,
    getShopSnapshot,
    buyOffer,
    autoPackPick,
    autoSpellTarget,
    shopReroll,
    canShopReroll,
    dismissOverlays,
    shopNextLevel,
    settlementContinue,
    bossBlindContinue,
    getRng,
  } = ctx;

  const logs = [];
  const issues = [];
  const rng = typeof getRng === "function" ? getRng : () => Math.random();

  function log(msg, level = "info") {
    const line = { t: Date.now(), level, msg: String(msg) };
    logs.push(line);
    const tag = level === "error" ? "E2E ✗" : level === "warn" ? "E2E ⚠" : "E2E";
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](`${tag}`, line.msg);
  }

  function findBestPick() {
    const cells = getGridSnapshot();
    const picks = findAllValidWordsOnGrid(
      cells,
      getDictCandidatesByLength,
      resolveWordPattern,
    );
    if (!picks.length) return null;

    const boss = getBossPlayContext();
    const pick = pickPlayerLikeWord(
      picks,
      (p) => getPreviewScoreForPick(p.path),
      boss,
      (row, col) => getTileAt(row, col),
      rng,
    );

    if (pick && boss?.slug) {
      const reason = bossViolationReasonForPick(pick, boss, (row, col) => getTileAt(row, col));
      if (reason) {
        issues.push({ type: "boss_pick_leak", reason, word: pick.word });
        log(`Boss 合规警告: ${pick.word} — ${reason}`, "warn");
      }
    }
    return pick;
  }

  async function waitForIdle(timeoutMs = 180_000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const s = getStateSnapshot();
      if (s.idle) return s;
      await sleep(80);
    }
    const s = getStateSnapshot();
    issues.push({ type: "timeout_idle", state: s });
    throw new Error(`waitForIdle 超时 (${timeoutMs}ms): ${JSON.stringify(s)}`);
  }

  async function playBestWord() {
    dismissOverlays();
    const boss = getBossPlayContext();
    if (boss?.slug) {
      log(`Boss 关: ${boss.slug}${boss.mouthLockedLength != null ? ` 锁定长度=${boss.mouthLockedLength}` : ""}`);
    }

    const pick = findBestPick();
    if (!pick) {
      log("棋盘上找不到符合 Boss 的可提交单词", "warn");
      return { ok: false, reason: "no_word" };
    }

    clearCurrentWord();
    await sleep(50);
    for (const cell of pick.path) {
      selectTile(cell.row, cell.col);
      await sleep(55);
    }
    await sleep(120);
    const s = getStateSnapshot();
    if (!s.canSubmit) {
      log(`选词后仍不可提交: ${pick.word}`, "warn");
      return { ok: false, reason: "cannot_submit", word: pick.word };
    }
    log(`提交: ${pick.word} (${pick.path.length} 字)`);
    await submitWord();
    await waitForIdle();
    return { ok: true, word: pick.word, len: pick.path.length };
  }

  async function runShopPhase() {
    if (getStateSnapshot().bossBlindOpen) {
      log("Boss 盲选 → 继续");
      await bossBlindContinue();
      await waitForIdle();
    }

    const visit = await runShopVisit({
      getState: getStateSnapshot,
      getShopSnapshot,
      buyOffer,
      autoPackPick,
      autoSpellTarget,
      shopReroll,
      canReroll: canShopReroll,
      log,
      rng,
    });

    log(`离开商店 (本店购入 ${visit.bought} 件)`);
    await shopNextLevel();
    await waitForIdle();
    return { phase: "shop", bought: visit.bought };
  }

  async function runTurn() {
    dismissOverlays();
    const s0 = getStateSnapshot();

    if (s0.showRunEnd) {
      log(`整局结束 (${s0.runEndOutcome})`, "warn");
      return { phase: "run_end", outcome: s0.runEndOutcome };
    }

    if (s0.showSettlement) {
      log(`关卡完成 ${s0.levelId}，进入商店`);
      await settlementContinue();
      await waitForIdle();
      return { phase: "settlement" };
    }

    if (s0.showShop) {
      return runShopPhase();
    }

    if (s0.packPickOpen) {
      const r = await autoPackPick();
      await waitForIdle();
      return { phase: "pack_pick", ...r };
    }

    if (s0.spellTargetOpen) {
      await autoSpellTarget();
      await waitForIdle();
      return { phase: "spell_target" };
    }

    if (s0.remainingWords <= 0 && s0.currentScore < s0.targetScore && !s0.showRunEnd) {
      log(`出牌次数用尽且未达标 (${s0.currentScore}/${s0.targetScore})`, "warn");
      return { phase: "stuck", reason: "no_submits_left" };
    }

    const r = await playBestWord();
    return { phase: "play", ...r };
  }

  const api = {
    version: 2,
    logs: () => [...logs],
    issues: () => [...issues],
    getState: getStateSnapshot,
    getGridCells: getGridSnapshot,
    waitForIdle,
    findBestPick,
    listValidWords: () =>
      findAllValidWordsOnGrid(
        getGridSnapshot(),
        getDictCandidatesByLength,
        resolveWordPattern,
      ).slice(0, 20),
    playBestWord,
    runShopPhase,
    runTurn,
    clearSelection: clearCurrentWord,
    dismissOverlays,
    log,
  };

  globalThis.__WM_E2E__ = api;
  log("游戏内 E2E 桥接已就绪（玩家向选词 + 商店购买）");
  return () => {
    if (globalThis.__WM_E2E__ === api) delete globalThis.__WM_E2E__;
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
