/**
 * @param {object | null | undefined} opt
 * @returns {string}
 */
function packPickOptionKeyOf(opt) {
  return String(opt?.optionKey ?? opt?.offerInstanceId ?? "");
}

/**
 * 读档修复：claimedKeys 已标记但宝藏未入栏（飞入动画期存档等）时，撤销无效领取标记。
 * @param {object | null | undefined} packPickSession
 * @param {unknown[]} ownedTreasureSlots
 * @returns {object | null | undefined}
 */
export function reconcilePackPickClaimedTreasures(packPickSession, ownedTreasureSlots) {
  if (!packPickSession || typeof packPickSession !== "object") return packPickSession;
  const claimed = packPickSession.claimedKeys;
  if (!Array.isArray(claimed) || claimed.length === 0) return packPickSession;
  /** @type {Set<string>} */
  const ownedIds = new Set();
  for (const slot of ownedTreasureSlots ?? []) {
    if (!slot || typeof slot !== "object") continue;
    const tid = String(/** @type {{ treasureId?: string }} */ (slot).treasureId ?? "").trim();
    if (tid) ownedIds.add(tid);
  }
  const options = Array.isArray(packPickSession.options) ? packPickSession.options : [];
  const validClaimed = claimed.filter((key) => {
    const opt = options.find((o) => packPickOptionKeyOf(o) === key);
    if (!opt || opt.offerType !== "treasure") return true;
    const tid = String(opt.treasureId ?? "").trim();
    if (!tid) return true;
    return ownedIds.has(tid);
  });
  if (validClaimed.length === claimed.length) return packPickSession;
  return { ...packPickSession, claimedKeys: validClaimed };
}
