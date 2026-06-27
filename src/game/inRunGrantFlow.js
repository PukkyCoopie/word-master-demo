/**
 * 对局内授予流程（释法 / 开包 / 升级等）的共享类型与纯函数。
 * 具体 UI 与状态由 GamePanel / controller 注入并驱动。
 */

import { rollBundleOptionsForOffer } from "../shop/rollPackStock.js";

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

/**
 * @param {object | null | undefined} opt
 * @returns {string}
 */
export function packPickOptionKeyOf(opt) {
  return String(opt?.optionKey ?? opt?.offerInstanceId ?? "");
}

/**
 * @param {object | null | undefined} sess
 * @returns {number}
 */
export function packPickRequiredPicks(sess) {
  const pc = Math.max(1, Math.floor(Number(sess?.pickCount) || 1));
  const n = Array.isArray(sess?.options) ? sess.options.length : 0;
  return Math.min(pc, Math.max(1, n));
}

/**
 * @param {object} bundle
 * @param {PackPickGrantContext} [grantContext]
 * @param {(kind: PackPickGrantContext) => object} getRollCtx
 */
export function buildPackPickSessionFromBundle(bundle, grantContext = "shop", getRollCtx) {
  let opts = Array.isArray(bundle.bundleOptions) ? bundle.bundleOptions : [];
  if (!opts.length && bundle?.offerType === "bundlePack") {
    const rollCtx = getRollCtx(grantContext === "inRun" ? "inRun" : "shop");
    opts = rollBundleOptionsForOffer(bundle, rollCtx);
  }
  const pickCount = Math.max(1, Math.floor(Number(bundle.pickCount) || 1));
  const withKeys = opts.map((o, i) => ({
    ...o,
    optionKey: o.optionKey ?? `opt-${o.offerInstanceId ?? i}-${i}`,
  }));
  return {
    bundleRow: bundle,
    bundleKind: bundle.bundleKind,
    title: bundle.name,
    pickCount,
    options: withKeys,
    claimedKeys: /** @type {string[]} */ ([]),
    grantContext,
  };
}
