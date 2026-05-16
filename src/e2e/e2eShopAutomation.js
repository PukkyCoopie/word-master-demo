/**
 * @typedef {object} ShopOfferView
 * @property {number} offerInstanceId
 * @property {string} offerType
 * @property {number} price
 * @property {string} [name]
 * @property {string} [treasureId]
 * @property {string} [spellId]
 * @property {string} [voucherId]
 * @property {string} [upgradeKind]
 * @property {string} source
 */

const BUY_PRIORITY = Object.freeze([
  "voucher",
  "upgrade",
  "spell",
  "deckTile",
  "deckLetter",
  "treasure",
  "bundlePack",
]);

/**
 * @param {ShopOfferView[]} offers
 * @param {number} money
 * @param {() => number} rng
 */
export function planShopPurchases(offers, money, hasTreasureSlot = true, rng = Math.random) {
  const affordable = offers.filter((o) => o.canBuy !== false && o.price <= money);
  if (!affordable.length) return [];

  /** @type {ShopOfferView[]} */
  const chosen = [];
  let budget = money;
  const reserve = money >= 12 ? 2 : money >= 6 ? 1 : 0;

  const byType = new Map();
  for (const o of affordable) {
    const t = o.offerType;
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t).push(o);
  }
  for (const arr of byType.values()) {
    arr.sort((a, b) => a.price - b.price);
  }

  const maxBuys = Math.min(4, 1 + Math.floor(rng() * 3));
  const types = [...BUY_PRIORITY].sort(() => rng() - 0.5);

  for (const type of types) {
    if (chosen.length >= maxBuys) break;
    const list = byType.get(type);
    if (!list?.length) continue;
    if (type === "treasure" && !hasTreasureSlot) continue;

    const pick = list.find((o) => o.price <= budget - reserve) ?? list.find((o) => o.price <= budget);
    if (!pick) continue;
    if (chosen.some((c) => c.offerInstanceId === pick.offerInstanceId)) continue;
    chosen.push(pick);
    budget -= pick.price;
  }

  return chosen;
}

/**
 * @param {object} ctx
 * @param {() => import('./registerGameTestHarness.js').E2eHarnessApi['getState']} ctx.getState
 * @param {(offerInstanceId: number) => Promise<{ ok: boolean, reason?: string }>} ctx.buyOffer
 * @param {() => Promise<{ ok: boolean }>} ctx.autoPackPick
 * @param {() => Promise<{ ok: boolean }>} ctx.autoSpellTarget
 * @param {() => Promise<void>} ctx.shopReroll
 * @param {() => boolean} ctx.canReroll
 * @param {(msg: string, level?: string) => void} ctx.log
 */
export async function runShopVisit(ctx) {
  const { getState, buyOffer, autoPackPick, autoSpellTarget, shopReroll, canReroll, log } = ctx;

  let packRounds = 0;
  while (getState().packPickOpen && packRounds < 6) {
    const r = await autoPackPick();
    packRounds += 1;
    if (!r.ok) break;
    log("开包选取一件");
    await sleep(400);
  }

  let spellRounds = 0;
  while (getState().spellTargetOpen && spellRounds < 4) {
    await autoSpellTarget();
    spellRounds += 1;
    log("法术选格已自动确认");
    await sleep(500);
  }

  const snap = ctx.getShopSnapshot();
  const offers = snap?.offers ?? [];
  const plan = planShopPurchases(offers, snap.money ?? 0, !!snap.hasTreasureSlot, ctx.rng ?? Math.random);
  let bought = 0;
  for (const o of plan) {
    const label = o.name || o.offerType;
    const res = await buyOffer(o.offerInstanceId);
    if (res.ok) {
      bought += 1;
      log(`购买: ${label} ($${o.price})`);
      await sleep(350);
      while (getState().packPickOpen) {
        await autoPackPick();
        await sleep(400);
      }
      while (getState().spellTargetOpen) {
        await autoSpellTarget();
        await sleep(500);
      }
    }
  }

  if (bought === 0 && canReroll() && (snap.money ?? 0) >= 5) {
    log("刷新商店货架");
    await shopReroll();
    await sleep(600);
    const snap2 = ctx.getShopSnapshot();
    const plan2 = planShopPurchases(
      snap2?.offers ?? [],
      snap2.money ?? 0,
      !!snap2.hasTreasureSlot,
      ctx.rng ?? Math.random,
    );
    for (const o of plan2.slice(0, 2)) {
      const res = await buyOffer(o.offerInstanceId);
      if (res.ok) {
        bought += 1;
        log(`刷新后购买: ${o.name || o.offerType}`);
        await sleep(400);
      }
    }
  }

  return { bought };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
