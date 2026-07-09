import { getBossDef } from "./bossBlindDefinitions.js";
import { buildBossTapeSubLine } from "./bossTapeUi.js";
import { pickBossSlugForLevel } from "./bossRoll.js";
import { resolveLevelTargetScoreForDifficulty } from "./runDifficultyRuntime.js";
import { parseLevelSubFromId, parseMajorFromLevelId } from "../vouchers/voucherRuntime.js";
import { normalizeRunDifficultyIndex } from "./runDifficultyDefinitions.js";
import { formatIntegerScoreForDisplay } from "../utils/scoreNumericFormat.js";

/**
 * @typedef {{
 *   id: string,
 *   targetScore: number,
 *   isBoss: boolean,
 *   bossName: string,
 *   bossRequirement: string,
 *   isCurrent: boolean,
 * }} InfoStageSubBlock
 */

/**
 * @typedef {'up' | 'down'} InfoStageFadeMask
 */

/**
 * @typedef {{
 *   rowKey: string,
 *   empty: boolean,
 *   dimmed: boolean,
 *   fadeMask: InfoStageFadeMask | null,
 *   blocks: InfoStageSubBlock[],
 * }} InfoStageChapterRow
 */

/**
 * @param {number} n
 * @returns {string}
 */
export function formatStageTargetScore(n) {
  return formatIntegerScoreForDisplay(Math.round(Number(n) || 0));
}

/**
 * @param {string} levelId
 * @param {string} currentLevelId
 * @param {string} activeBossSlug
 * @param {number} runSeedNumeric
 * @returns {string}
 */
function resolveBossSlugForStageBlock(levelId, currentLevelId, activeBossSlug, runSeedNumeric) {
  if (parseLevelSubFromId(levelId) !== 3) return "";
  if (levelId === currentLevelId && String(activeBossSlug ?? "").trim()) {
    return String(activeBossSlug).trim();
  }
  return pickBossSlugForLevel(levelId, runSeedNumeric, 0);
}

/**
 * @param {number} chapter
 * @param {{ currentLevelId: string, activeBossSlug: string, runSeedNumeric: number, runDifficultyIndex?: number, inShop?: boolean, dimmed: boolean, fadeMask?: InfoStageFadeMask | null, spellCountsByLength?: Record<string | number, number> | null }} ctx
 * @returns {InfoStageChapterRow}
 */
function buildChapterRow(chapter, ctx) {
  const ch = Math.max(0, Math.floor(Number(chapter)) || 0);
  const blocks = [1, 2, 3].map((sub) => {
    const id = `${ch}-${sub}`;
    const isBoss = sub === 3;
    const bossSlug = isBoss
      ? resolveBossSlugForStageBlock(id, ctx.currentLevelId, ctx.activeBossSlug, ctx.runSeedNumeric)
      : "";
    const bossDef = isBoss && bossSlug ? getBossDef(bossSlug) : null;
    return {
      id,
      targetScore: resolveLevelTargetScoreForDifficulty(id, bossSlug, ctx.runDifficultyIndex),
      isBoss,
      bossName: bossDef?.nameZh ?? "",
      bossRequirement: bossDef
        ? buildBossTapeSubLine(bossDef, { spellCountsByLength: ctx.spellCountsByLength ?? null })
        : "",
      isCurrent: !ctx.inShop && id === ctx.currentLevelId,
    };
  });
  return {
    rowKey: `ch-${ch}`,
    empty: false,
    dimmed: !!ctx.dimmed,
    fadeMask: ctx.fadeMask ?? null,
    blocks,
  };
}

/**
 * 对局信息 · 关卡 Tab：上/中/下三行对应前、当前、后一大关。
 * @param {{ currentLevelId: string, activeBossSlug?: string, runSeedNumeric?: number, runDifficultyIndex?: number, inShop?: boolean, isEndlessRun?: boolean, spellCountsByLength?: Record<string | number, number> | null }} opts
 * @returns {InfoStageChapterRow[]}
 */
export function buildInfoStageProgressRows(opts) {
  const currentLevelId = String(opts.currentLevelId ?? "1-1");
  const activeBossSlug = String(opts.activeBossSlug ?? "");
  const runSeedNumeric = Math.max(0, Math.floor(Number(opts.runSeedNumeric) || 0));
  const inShop = opts.inShop === true;
  const isEndlessRun = opts.isEndlessRun === true;
  const runDifficultyIndex = normalizeRunDifficultyIndex(opts.runDifficultyIndex);
  const spellCountsByLength = opts.spellCountsByLength ?? null;
  const MAX_NORMAL_CHAPTER = 8;
  const chapter = parseMajorFromLevelId(currentLevelId);
  const rowCtxBase = {
    currentLevelId,
    activeBossSlug,
    runSeedNumeric,
    runDifficultyIndex,
    inShop,
    spellCountsByLength,
  };

  /** @type {InfoStageChapterRow[]} */
  const rows = [];

  if (chapter <= 0) {
    rows.push({ rowKey: "prev-empty", empty: true, dimmed: true, fadeMask: null, blocks: [] });
    rows.push(buildChapterRow(0, { ...rowCtxBase, dimmed: false, fadeMask: null }));
    rows.push(buildChapterRow(1, { ...rowCtxBase, dimmed: true, fadeMask: "down" }));
    return rows;
  }

  if (chapter <= 1) {
    rows.push({ rowKey: "prev-empty", empty: true, dimmed: true, fadeMask: null, blocks: [] });
  } else {
    rows.push(
      buildChapterRow(chapter - 1, { ...rowCtxBase, dimmed: true, fadeMask: "up" }),
    );
  }

  rows.push(
    buildChapterRow(chapter, { ...rowCtxBase, dimmed: false, fadeMask: null }),
  );
  const canShowNextChapter = isEndlessRun || chapter < MAX_NORMAL_CHAPTER;
  if (canShowNextChapter) {
    rows.push(
      buildChapterRow(chapter + 1, { ...rowCtxBase, dimmed: true, fadeMask: "down" }),
    );
  }

  return rows;
}

/**
 * 商店中：高亮「当前已通关」与「下一关」之间的箭头（同章横向 / 跨章向下）。
 * @param {string} clearedLevelId 刚通关的小关（商店时 currentLevelId）
 * @param {string} nextLevelId 下一小关 id
 * @returns {{ vBeforeChapter: number | null, inlineBeforeLevelId: string | null }}
 */
export function resolveInfoStageShopConnector(clearedLevelId, nextLevelId) {
  const from = String(clearedLevelId ?? "").trim();
  const to = String(nextLevelId ?? "").trim();
  if (!from || !to || from === to) {
    return { vBeforeChapter: null, inlineBeforeLevelId: null };
  }
  const fromCh = parseMajorFromLevelId(from);
  const toCh = parseMajorFromLevelId(to);
  if (fromCh === toCh) {
    return { vBeforeChapter: null, inlineBeforeLevelId: to };
  }
  if (toCh === fromCh + 1 && parseLevelSubFromId(from) === 3 && parseLevelSubFromId(to) === 1) {
    return { vBeforeChapter: toCh, inlineBeforeLevelId: null };
  }
  return { vBeforeChapter: toCh, inlineBeforeLevelId: null };
}

/**
 * @param {InfoStageChapterRow} row
 * @param {number | null} vBeforeChapter
 */
export function isInfoStageVConnectorActive(row, vBeforeChapter) {
  if (vBeforeChapter == null || row.empty || !row.blocks?.length) return false;
  return parseMajorFromLevelId(row.blocks[0].id) === vBeforeChapter;
}

/**
 * @param {string} levelId 箭头右侧 / 下方块 id
 * @param {string | null} inlineBeforeLevelId
 */
export function isInfoStageInlineConnectorActive(levelId, inlineBeforeLevelId) {
  return inlineBeforeLevelId != null && levelId === inlineBeforeLevelId;
}
