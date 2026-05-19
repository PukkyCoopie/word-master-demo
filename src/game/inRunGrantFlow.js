/**
 * 对局内授予流程（释法 / 开包 / 升级等）的共享类型与纯函数。
 * 具体 UI 与状态由 GamePanel 注入并驱动。
 */

/**
 * @typedef {'shop' | 'inRun'} InRunGrantSpellContext
 */

/**
 * @typedef {'fullDeck' | 'remainingDeck'} SpellOfferDeckSource
 */

/**
 * @typedef {Object} SpellPreviewFlowResult
 * @property {boolean} confirmed
 * @property {boolean} skipped
 */

/**
 * 从施法历史向前追溯，跳过 restart，得到可重播的法术 id。
 * @param {string[]} spellCastHistory
 * @param {string | null} [lastReplayableSpellId]
 */
export function resolveRestartEffectiveSpellId(spellCastHistory, lastReplayableSpellId = null) {
  if (Array.isArray(spellCastHistory)) {
    for (let i = spellCastHistory.length - 1; i >= 0; i--) {
      const id = String(spellCastHistory[i] ?? "");
      if (id && id !== "restart") return id;
    }
  }
  const last = lastReplayableSpellId ? String(lastReplayableSpellId) : "";
  return last && last !== "restart" ? last : null;
}

/**
 * @param {string} purchasedSpellId
 * @param {string | null} lastReplayableSpellId
 * @param {string[]} [spellCastHistory]
 */
export function resolveSpellFlowEffectiveId(purchasedSpellId, lastReplayableSpellId, spellCastHistory) {
  const sid = String(purchasedSpellId ?? "");
  if (sid === "restart") {
    return resolveRestartEffectiveSpellId(spellCastHistory, lastReplayableSpellId) ?? sid;
  }
  return sid;
}

/**
 * 对局内授予入口类型（开包 / 释法 / 升级等共用编排，由 GamePanel 实现具体 UI）。
 * @typedef {'spell' | 'pack' | 'upgrade'} InRunGrantKind
 */

/**
 * @typedef {'shop' | 'inRun'} PackPickGrantContext
 */
