/**
 * 游戏内「增益与概念」说明文案的**唯一事实源**。
 *
 * 材质 / 棋盘配饰 / 宝藏装备配饰等，凡面向玩家的**名称 + 效果说明**均集中在此；
 * 其他模块（详情浮层、法术卡、商店等）只通过本文件导出的 getter 读取，避免同一机制多处手写分叉。
 *
 * @see `tileDetailDescriptions.js` 仅作向后兼容 re-export，新代码请直接 import 本文件。
 */

/** @param {string | null | undefined} raw */
function normId(raw) {
  return String(raw ?? "").trim();
}

// ---------------------------------------------------------------------------
// 字母块材质（materialId）
// ---------------------------------------------------------------------------

/** @type {Readonly<Record<string, Readonly<{ blockTitle: string, effectDescription: string }>>>} */
export const TILE_MATERIAL_CONCEPT_BY_ID = Object.freeze({
  gold: Object.freeze({
    blockTitle: "黄金块",
    effectDescription: "关卡完成时，如果黄金块位于棋盘中，提供 +$3",
  }),
  steel: Object.freeze({
    blockTitle: "钢铁块",
    effectDescription: "单词计分时，如果钢铁块位于棋盘中，提供 x1.5 倍率",
  }),
  ice: Object.freeze({
    blockTitle: "碎冰块",
    effectDescription: "计分时提供 x2 倍率，有 1/4 的概率碎裂",
  }),
  water: Object.freeze({
    blockTitle: "水波块",
    effectDescription: "+30 分数",
  }),
  fire: Object.freeze({
    blockTitle: "火焰块",
    effectDescription: "+4 倍率",
  }),
  wildcard: Object.freeze({
    blockTitle: "万能块",
    effectDescription: "可以变形为任意字母",
  }),
  lucky: Object.freeze({
    blockTitle: "幸运块",
    effectDescription: "计分时有 1/5 的概率提供 +20 倍率，且有 1/15 的概率提供 +$20",
  }),
});

/**
 * 玩家向材质块全名（法术主描述、字母块详情标题、法术增益分区标题等与材质相关的展示统一使用）。
 * @param {string | null | undefined} materialId
 * @returns {string} 未知 id 时返回空字符串
 */
export function getTileMaterialBlockTitle(materialId) {
  const id = normId(materialId);
  return TILE_MATERIAL_CONCEPT_BY_ID[id]?.blockTitle ?? "";
}

/**
 * 材质效果长说明（与局内规则一致，供详情 / 法术增益区等使用）。
 * @param {string | null | undefined} materialId
 * @returns {string | null}
 */
export function getTileMaterialEffectDescription(materialId) {
  const id = normId(materialId);
  const v = TILE_MATERIAL_CONCEPT_BY_ID[id]?.effectDescription;
  return v ?? null;
}

// ---------------------------------------------------------------------------
// 棋盘字母块配饰（tile.accessoryId，与宝藏货架配饰不是同一套 id）
// ---------------------------------------------------------------------------

/** @type {Readonly<Record<string, Readonly<{ accessoryTitle: string, effectDescription: string }>>>} */
export const TILE_BOARD_ACCESSORY_CONCEPT_BY_ID = Object.freeze({
  level_upgrade: Object.freeze({
    accessoryTitle: "升级",
    effectDescription: "关卡完成时，如果升级配饰位于棋盘中，升级最后拼出的单词的长度等级",
  }),
  vip_diamond: Object.freeze({
    accessoryTitle: "钻石",
    effectDescription: "关卡完成时，如果钻石配饰位于最后拼出的单词的首位，升级该字母的稀有度等级",
  }),
  rewind: Object.freeze({
    accessoryTitle: "重播",
    effectDescription: "额外触发1次",
  }),
  coin: Object.freeze({
    accessoryTitle: "硬币",
    effectDescription: "计分时提供 +$3",
  }),
});

/**
 * @param {string | null | undefined} accessoryId
 * @returns {string}
 */
export function getTileBoardAccessoryTitle(accessoryId) {
  const id = normId(accessoryId);
  return TILE_BOARD_ACCESSORY_CONCEPT_BY_ID[id]?.accessoryTitle ?? "";
}

/**
 * @param {string | null | undefined} accessoryId
 * @returns {string | null}
 */
export function getTileAccessoryEffectDescription(accessoryId) {
  const id = normId(accessoryId);
  const v = TILE_BOARD_ACCESSORY_CONCEPT_BY_ID[id]?.effectDescription;
  return v ?? null;
}

// ---------------------------------------------------------------------------
// 已拥有宝藏上的具名装备配饰（treasureAccessoryId，与 treasureAccessories.js 常量同值）
// ---------------------------------------------------------------------------

/** @type {Readonly<Record<string, Readonly<{ title: string, effectDescription: string }>>>} */
export const TREASURE_ACCESSORY_CONCEPT_BY_ID = Object.freeze({
  treasure_acc_fire: Object.freeze({
    title: "火焰配饰",
    effectDescription: "+10 倍率",
  }),
  treasure_acc_drop: Object.freeze({
    title: "水滴配饰",
    effectDescription: "+50 分数",
  }),
  treasure_acc_wrench: Object.freeze({
    title: "扳手配饰",
    effectDescription: "×1.5 倍率",
  }),
  treasure_acc_crop: Object.freeze({
    title: "裁剪配饰",
    effectDescription: "+1 宝藏栏位",
  }),
});

/**
 * @param {string | null | undefined} accessoryId
 * @returns {string}
 */
export function getTreasureAccessoryPanelTitle(accessoryId) {
  const id = normId(accessoryId);
  return TREASURE_ACCESSORY_CONCEPT_BY_ID[id]?.title ?? "";
}

/**
 * @param {string | null | undefined} accessoryId
 * @returns {string}
 */
export function getTreasureAccessoryPanelDescription(accessoryId) {
  const id = normId(accessoryId);
  return TREASURE_ACCESSORY_CONCEPT_BY_ID[id]?.effectDescription ?? "";
}

/** 星星法术：随机装备四配饰之一（整句主描述用，与配饰展示名一致） */
export function buildStarSpellRandomTreasureAccessoryDescription() {
  const ids = Object.freeze(["treasure_acc_fire", "treasure_acc_drop", "treasure_acc_wrench", "treasure_acc_crop"]);
  const titles = ids.map((id) => TREASURE_ACCESSORY_CONCEPT_BY_ID[id]?.title).filter(Boolean);
  if (titles.length === 0) return "";
  if (titles.length === 1) return titles[0];
  const head = titles.slice(0, -1).join("、");
  const last = titles[titles.length - 1];
  return `1/4 概率：为你的一个随机宝藏装备一个随机配饰`;
}
