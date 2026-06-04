/**
 * 预览层同组翻页：列表快照 + 当前下标。
 * @template T
 * @typedef {{ items: T[], index: number }} PreviewNavGroup
 */

/**
 * @template T
 * @param {T[] | null | undefined} items
 * @param {number} index
 * @returns {PreviewNavGroup<T> | null}
 */
export function createPreviewNavGroup(items, index) {
  if (!Array.isArray(items) || items.length <= 1) return null;
  const idx = Math.max(0, Math.min(items.length - 1, Math.floor(Number(index) || 0)));
  return { items, index: idx };
}

/**
 * @template T
 * @param {T[] | null | undefined} items
 * @param {(item: T, index: number) => boolean} matches
 * @returns {PreviewNavGroup<T> | null}
 */
export function createPreviewNavGroupFromItems(items, matches) {
  if (!Array.isArray(items) || items.length <= 1) return null;
  const index = items.findIndex(matches);
  if (index < 0) return null;
  return { items, index };
}

/**
 * @template T
 * @param {PreviewNavGroup<T> | null | undefined} nav
 * @param {number} delta
 * @returns {PreviewNavGroup<T> | null}
 */
export function stepPreviewNavGroup(nav, delta) {
  if (!nav || !Array.isArray(nav.items) || nav.items.length <= 1) return nav ?? null;
  const len = nav.items.length;
  const step = Math.trunc(Number(delta) || 0);
  if (!step) return nav;
  const index = ((nav.index + step) % len + len) % len;
  if (index === nav.index) return nav;
  return { ...nav, index };
}

/** @param {PreviewNavGroup<unknown> | null | undefined} nav */
export function previewNavTotal(nav) {
  return nav?.items?.length ?? 0;
}

/** @param {PreviewNavGroup<unknown> | null | undefined} nav */
export function previewNavIndex(nav) {
  return nav?.index ?? 0;
}

/**
 * @param {PreviewNavGroup<unknown> | null | undefined} nav
 * @returns {string}
 */
export function formatPreviewNavProgress(nav) {
  const total = previewNavTotal(nav);
  if (total <= 1) return "";
  return `${previewNavIndex(nav) + 1} / ${total}`;
}

/**
 * @template T
 * @param {PreviewNavGroup<T> | null} nav
 * @param {string} kind
 * @returns {(PreviewNavGroup<T> & { kind: string }) | null}
 */
export function withPreviewNavKind(nav, kind) {
  if (!nav) return null;
  return { ...nav, kind: String(kind ?? "") };
}

/**
 * @param {import('../game/runCollectionDiscoveriesDisplay.js').RunDiscoveryDisplayItem} a
 * @param {import('../game/runCollectionDiscoveriesDisplay.js').RunDiscoveryDisplayItem} b
 */
export function sameRunDiscoveryDisplayItem(a, b) {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === "treasure") return a.treasureId === b.treasureId;
  if (a.kind === "spell") return a.spellId === b.spellId;
  if (a.kind === "upgrade") return a.upgradeId === b.upgradeId;
  if (a.kind === "voucher") return a.pairId === b.pairId && a.tier === b.tier;
  if (a.kind === "material") return a.materialId === b.materialId;
  if (a.kind === "accessory") return a.accessoryId === b.accessoryId;
  return false;
}
