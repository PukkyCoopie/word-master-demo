/**
 * 商店按稀有度加权抽取：rare 65%、epic 30%、legendary 5%；某档池空则权重落到其余档。
 *
 * @param {import('./treasureTypes.js').TreasureDef[]} pool
 * @param {() => number} rng 返回 [0,1)
 */
export function pickWeightedTreasureFromPool(pool, rng = Math.random) {
  if (pool.length === 0) return null;
  const rare = pool.filter((t) => t.rarity === "rare");
  const epic = pool.filter((t) => t.rarity === "epic");
  const leg = pool.filter((t) => t.rarity === "legendary");
  const wR = rare.length > 0 ? 65 : 0;
  const wE = epic.length > 0 ? 30 : 0;
  const wL = leg.length > 0 ? 5 : 0;
  const total = wR + wE + wL;
  if (total <= 0) return pool[Math.floor(rng() * pool.length)];
  const r = rng() * total;
  /** @type {import('./treasureTypes.js').TreasureDef[]} */
  let tier = leg;
  if (r < wR) tier = rare;
  else if (r < wR + wE) tier = epic;
  return tier[Math.floor(rng() * tier.length)];
}

/**
 * 从全集中抽取若干互不重复的宝藏（排除已拥有与额外排除集）。
 *
 * @param {import('./treasureTypes.js').TreasureDef[]} all
 * @param {Set<string>} ownedTreasureIds
 * @param {Set<string>} excludeTreasureIds
 * @param {number} count
 * @param {() => number} [rng]
 * @returns {import('./treasureTypes.js').TreasureDef[]}
 */
export function rollDistinctShopTreasures(all, ownedTreasureIds, excludeTreasureIds, count, rng = Math.random) {
  const used = new Set([...ownedTreasureIds, ...excludeTreasureIds]);
  /** @type {import('./treasureTypes.js').TreasureDef[]} */
  const picks = [];
  for (let i = 0; i < count; i += 1) {
    const pool = all.filter((t) => !used.has(t.treasureId));
    if (pool.length === 0) break;
    const t = pickWeightedTreasureFromPool(pool, rng);
    if (!t) break;
    picks.push(t);
    used.add(t.treasureId);
  }
  return picks;
}

/**
 * @param {import('./treasureTypes.js').TreasureDef[]} all
 * @param {Set<string>} ownedTreasureIds
 */
export function countShopPoolSize(all, ownedTreasureIds) {
  return all.filter((t) => !ownedTreasureIds.has(t.treasureId)).length;
}
