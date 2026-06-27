/** @param {unknown} raw @returns {string[]} */
function normalizeIdList(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  /** @type {string[]} */
  const out = [];
  for (const item of raw) {
    const id = String(item ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * 收藏展示用：合并生涯已发现列表与「新发现」标记（防止两者短暂不一致时仍显示 ???）。
 *
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 * @returns {string[]}
 */
export function getEffectiveDiscoveredTreasureIds(career) {
  const ids = new Set(normalizeIdList(career?.discoveredTreasureIds));
  for (const key of career?.collectionNewDiscoveryKeys ?? []) {
    const k = String(key ?? "").trim();
    if (!k.startsWith("treasure:")) continue;
    const id = k.slice("treasure:".length).trim();
    if (id) ids.add(id);
  }
  return [...ids];
}
