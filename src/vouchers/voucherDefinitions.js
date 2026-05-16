/** @type {import("./voucherTypes.js").VoucherDef[]} */
const V = [
  { id: "v_overstock_1", pairId: "overstock", tier: 1, emoji: "📦", nameStem: "纸箱", price: 10, description: "牌包区商品格 +1。", effectKey: "overstock", inShopPool: true },
  { id: "v_overstock_2", pairId: "overstock", tier: 2, emoji: "📦", nameStem: "纸箱", price: 20, description: "牌包区商品格再 +1。", effectKey: "overstock_plus", inShopPool: true },
  { id: "v_clearance_1", pairId: "clearance", tier: 1, emoji: "🏷️", nameStem: "标签", price: 10, description: "商店中卡牌、牌包与刷新费用减价 25%。", effectKey: "clearance", inShopPool: true },
  { id: "v_clearance_2", pairId: "clearance", tier: 2, emoji: "🏷️", nameStem: "标签", price: 20, description: "商店中卡牌、牌包与刷新费用减价 50%。", effectKey: "liquidation", inShopPool: true },
  { id: "v_hone_1", pairId: "hone", tier: 1, emoji: "💎", nameStem: "宝石", price: 10, description: "商店宝藏出现宝藏配饰的概率提升。", effectKey: "hone", inShopPool: true },
  { id: "v_hone_2", pairId: "hone", tier: 2, emoji: "💎", nameStem: "宝石", price: 20, description: "商店宝藏出现宝藏配饰的概率进一步提升。", effectKey: "glow_up", inShopPool: true },
  { id: "v_reroll_1", pairId: "reroll", tier: 1, emoji: "🎲", nameStem: "骰子", price: 10, description: "商店每次刷新的费用减少 $2。", effectKey: "reroll_surplus", inShopPool: true },
  { id: "v_reroll_2", pairId: "reroll", tier: 2, emoji: "🎲", nameStem: "骰子", price: 20, description: "商店每次刷新的费用再减少 $2。", effectKey: "reroll_glut", inShopPool: true },
  { id: "v_telescope_1", pairId: "telescope", tier: 1, emoji: "🔭", nameStem: "望远镜", price: 10, description: "升级包中更易出现与你常拼长度相关的升级项。", effectKey: "telescope", inShopPool: true },
  { id: "v_telescope_2", pairId: "telescope", tier: 2, emoji: "🔭", nameStem: "望远镜", price: 20, description: "当你本局最长拼写词长与当前词长相同时，词长倍率 ×1.5。", effectKey: "observatory", inShopPool: true },
  { id: "v_grabber_1", pairId: "grabber", tier: 1, emoji: "🧤", nameStem: "手套", price: 10, description: "每小关可多拼 1 次单词。", effectKey: "grabber", inShopPool: true },
  { id: "v_grabber_2", pairId: "grabber", tier: 2, emoji: "🧤", nameStem: "手套", price: 20, description: "每小关再多拼 1 次单词。", effectKey: "nacho_tong", inShopPool: true },
  { id: "v_ruler_1", pairId: "ruler", tier: 1, emoji: "📐", nameStem: "三角尺", price: 10, description: "计分时词长在倍率与每字基础分上视为 +1。", effectKey: "measure", inShopPool: true },
  { id: "v_ruler_2", pairId: "ruler", tier: 2, emoji: "📐", nameStem: "三角尺", price: 20, description: "计分时词长在倍率与每字基础分上视为 +2。", effectKey: "measure_plus", inShopPool: true },
  { id: "v_wasteful_1", pairId: "wasteful", tier: 1, emoji: "🗑️", nameStem: "垃圾桶", price: 10, description: "每小关多 1 次移除。", effectKey: "wasteful", inShopPool: true },
  { id: "v_wasteful_2", pairId: "wasteful", tier: 2, emoji: "🗑️", nameStem: "垃圾桶", price: 20, description: "每小关再多 1 次移除。", effectKey: "recyclomancy", inShopPool: true },
  { id: "v_tarot_1", pairId: "tarot", tier: 1, emoji: "✉️", nameStem: "信封", price: 10, description: "商店中法术单卡与法术包出现更频繁。", effectKey: "tarot_merchant", inShopPool: true },
  { id: "v_tarot_2", pairId: "tarot", tier: 2, emoji: "✉️", nameStem: "信封", price: 20, description: "商店中法术单卡与法术包出现更频繁。", effectKey: "tarot_tycoon", inShopPool: true },
  { id: "v_planet_1", pairId: "planet", tier: 1, emoji: "🪐", nameStem: "土星", price: 10, description: "商店中升级单卡与升级包出现更频繁。", effectKey: "planet_merchant", inShopPool: true },
  { id: "v_planet_2", pairId: "planet", tier: 2, emoji: "🪐", nameStem: "土星", price: 20, description: "商店中升级单卡与升级包出现更频繁。", effectKey: "planet_tycoon", inShopPool: true },
  { id: "v_seed_1", pairId: "seed", tier: 1, emoji: "🌱", nameStem: "发芽", price: 10, description: "结算利息上限提高。", effectKey: "seed_money", inShopPool: true },
  { id: "v_seed_2", pairId: "seed", tier: 2, emoji: "🌱", nameStem: "发芽", price: 20, description: "结算利息上限进一步提高。", effectKey: "money_tree", inShopPool: true },
  { id: "v_blank_1", pairId: "blank", tier: 1, emoji: "⬜", nameStem: "白方块", price: 10, description: "无效果。", effectKey: "blank", inShopPool: true },
  { id: "v_blank_2", pairId: "blank", tier: 2, emoji: "⬜", nameStem: "白方块", price: 20, description: "宝藏栏位 +1。", effectKey: "antimatter", inShopPool: true },
  { id: "v_magic_1", pairId: "magic", tier: 1, emoji: "🪄", nameStem: "魔法棒", price: 10, description: "牌包区可出现单张购入的字母进库。", effectKey: "magic_trick", inShopPool: true },
  { id: "v_magic_2", pairId: "magic", tier: 2, emoji: "🪄", nameStem: "魔法棒", price: 20, description: "商店购入的字母牌可带棋盘材质与字母块配饰。", effectKey: "illusion", inShopPool: true },
  { id: "v_glyph_1", pairId: "glyph", tier: 1, emoji: "📜", nameStem: "卷轴", price: 10, description: "购买后回到上一大关首小关；每小关少 1 次拼词。", effectKey: "hieroglyph", inShopPool: true },
  { id: "v_glyph_2", pairId: "glyph", tier: 2, emoji: "📜", nameStem: "卷轴", price: 20, description: "购买后再回退一大关；每小关少 1 次移除。", effectKey: "petroglyph", inShopPool: true },
  { id: "v_paint_1", pairId: "paint", tier: 1, emoji: "🖌️", nameStem: "画笔", price: 10, description: "单次移除可选字母上限 +1。", effectKey: "paint_brush", inShopPool: true },
  { id: "v_paint_2", pairId: "paint", tier: 2, emoji: "🖌️", nameStem: "画笔", price: 20, description: "单次移除可选字母上限再 +1。", effectKey: "palette", inShopPool: true },
  { id: "v_director_1", pairId: "director", tier: 1, emoji: "🎬", nameStem: "场记板", price: 10, description: "Boss 关未实装：预留效果。", effectKey: "directors_cut", inShopPool: false },
  { id: "v_director_2", pairId: "director", tier: 2, emoji: "🎬", nameStem: "场记板", price: 20, description: "Boss 关未实装：预留效果。", effectKey: "retcon", inShopPool: false },
];

/** @type {readonly import("./voucherTypes.js").VoucherDef[]} */
export const VOUCHER_DEFINITIONS = Object.freeze(V.map((x) => Object.freeze({ ...x })));

/** @type {ReadonlyMap<string, import("./voucherTypes.js").VoucherDef>} */
export const VOUCHERS_BY_ID = new Map(VOUCHER_DEFINITIONS.map((d) => [d.id, d]));

/** @type {ReadonlyMap<string, [import("./voucherTypes.js").VoucherDef, import("./voucherTypes.js").VoucherDef]>} */
export const VOUCHER_PAIR_ORDER = buildPairOrderMap();

function buildPairOrderMap() {
  /** @type {Map<string, import("./voucherTypes.js").VoucherDef[]>} */
  const m = new Map();
  for (const d of VOUCHER_DEFINITIONS) {
    const arr = m.get(d.pairId) ?? [];
    arr.push(d);
    m.set(d.pairId, arr);
  }
  /** @type {Map<string, [import("./voucherTypes.js").VoucherDef, import("./voucherTypes.js").VoucherDef]>} */
  const out = new Map();
  for (const [pid, arr] of m) {
    const a = [...arr].sort((x, y) => x.tier - y.tier);
    if (a.length >= 2) out.set(pid, [a[0], a[1]]);
  }
  return out;
}

/** @param {string} pairId */
export function getTier1DefForPair(pairId) {
  const p = VOUCHER_PAIR_ORDER.get(pairId);
  return p?.[0] ?? null;
}

/** @param {string} pairId */
export function getTier2DefForPair(pairId) {
  const p = VOUCHER_PAIR_ORDER.get(pairId);
  return p?.[1] ?? null;
}

/** @param {Iterable<string>} ownedIds */
export function pairHasTier2Owned(pairId, ownedIds) {
  const t2 = getTier2DefForPair(pairId);
  if (!t2) return false;
  const s = new Set(ownedIds);
  return s.has(t2.id);
}
