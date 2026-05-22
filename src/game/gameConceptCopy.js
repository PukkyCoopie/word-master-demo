/**
 * 游戏内「增益与概念」说明文案的**唯一事实源**。
 *
 * 材质 / 棋盘配饰 / 宝藏装备配饰 / 简介触发的机制词等，凡面向玩家的**名称 + 效果说明**均集中在此；
 * 其他模块（详情浮层、法术卡、商店等）只通过本文件导出的 getter 读取，避免同一机制多处手写分叉。
 *
 * - 材质、配饰：见下方 `TILE_*` / `TREASURE_ACCESSORY_*` 表。
 * - 机制词：在 `GAME_TERM_CONCEPT_BY_LABEL` 登记后，简介里用 `concept('词')` 显式标记 → 详情/法术选格在主描述下补充分区（不做全文匹配）。
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
    accessoryTitle: "升级配饰",
    effectDescription: "关卡完成时，如果升级配饰位于棋盘中，升级最后拼出的单词的长度等级",
  }),
  vip_diamond: Object.freeze({
    accessoryTitle: "钻石配饰",
    effectDescription: "关卡完成时，如果钻石配饰位于最后拼出的单词的首位，升级该字母的稀有度等级",
  }),
  rewind: Object.freeze({
    accessoryTitle: "重播配饰",
    effectDescription: "额外触发1次",
  }),
  coin: Object.freeze({
    accessoryTitle: "硬币配饰",
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

/**
 * 棋盘配饰的关联机制补充分区（用于详情层在配饰分区下追加说明）。
 * @param {string | null | undefined} accessoryId
 * @returns {{ title: string, effectDescription: string }[]}
 */
export function getTileAccessoryLinkedConceptPanels(_accessoryId) {
  return [];
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
  return `1/4 概率：为你的一个随机宝藏装备一个随机配饰`;
}

// ---------------------------------------------------------------------------
// 机制词（须在简介中用 `concept('…')` 显式标记，详情层才会补充分区）
// ---------------------------------------------------------------------------

/**
 * 机制词说明。键须与 `treasureDescription.concept(label)` 的 `label` 一致。
 *
 * @type {Readonly<Record<string, Readonly<{ title: string, effectDescription: string }>>>}
 */
export const GAME_TERM_CONCEPT_BY_LABEL = Object.freeze({
  升级: Object.freeze({
    title: "升级",
    effectDescription: "提高长度或稀有度的等级，从而提高它们提供的分数和倍率",
  }),
  配饰: Object.freeze({
    title: "配饰",
    effectDescription: "可以镶嵌在宝藏或字母块上，提供一些增益",
  }),
});

/** @typedef {{ title: string, effectDescription: string }} DescriptionConceptPanel */

/**
 * @typedef {{ title: string, effectDescription: string, matchAliases: string[] }} NamedAccessoryCatalogEntry
 */

/** @returns {NamedAccessoryCatalogEntry[]} */
function buildNamedAccessoryCatalogEntries() {
  /** @type {NamedAccessoryCatalogEntry[]} */
  const entries = [];
  for (const c of Object.values(TREASURE_ACCESSORY_CONCEPT_BY_ID)) {
    entries.push({
      title: c.title,
      effectDescription: c.effectDescription,
      matchAliases: [c.title],
    });
  }
  for (const c of Object.values(TILE_BOARD_ACCESSORY_CONCEPT_BY_ID)) {
    const title = c.accessoryTitle;
    const aliases = [title];
    if (!title.endsWith("配饰")) aliases.push(`${title}配饰`);
    entries.push({ title, effectDescription: c.effectDescription, matchAliases: aliases });
  }
  return entries.sort((a, b) => {
    const al = Math.max(...a.matchAliases.map((x) => x.length));
    const bl = Math.max(...b.matchAliases.map((x) => x.length));
    return bl - al;
  });
}

/**
 * @param {unknown} description
 * @returns {string}
 */
function descriptionToPlainText(description) {
  if (!Array.isArray(description)) return String(description ?? "");
  /** @type {string[]} */
  const parts = [];
  /** @param {unknown[]} segs */
  function walk(segs) {
    for (const seg of segs) {
      if (!seg || typeof seg !== "object") continue;
      if (seg.type === "text" || seg.type === "gain" || seg.type === "concept") {
        parts.push(String(seg.v ?? ""));
      } else if (seg.type === "gainBlock" && Array.isArray(seg.parts)) {
        walk(seg.parts);
      }
    }
  }
  walk(description);
  return parts.join("");
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function textMentionsAnyNamedAccessory(text) {
  const s = String(text ?? "");
  for (const entry of buildNamedAccessoryCatalogEntries()) {
    for (const alias of entry.matchAliases) {
      if (alias && s.includes(alias)) return true;
    }
  }
  return false;
}

/**
 * @param {string} text
 * @param {Set<string>} seen
 * @returns {DescriptionConceptPanel[]}
 */
function collectNamedAccessoryPanelsFromPlainText(text, seen) {
  const s = String(text ?? "");
  /** @type {DescriptionConceptPanel[]} */
  const panels = [];
  for (const entry of buildNamedAccessoryCatalogEntries()) {
    if (!entry.title || seen.has(entry.title)) continue;
    const hit = entry.matchAliases.some((alias) => alias && s.includes(alias));
    if (!hit) continue;
    seen.add(entry.title);
    panels.push({ title: entry.title, effectDescription: entry.effectDescription });
  }
  return panels;
}

/**
 * @param {string} label
 * @returns {DescriptionConceptPanel | null}
 */
export function getGameTermConceptPanel(label) {
  const key = normId(label);
  const c = GAME_TERM_CONCEPT_BY_LABEL[key];
  if (!c?.title || !c?.effectDescription) return null;
  return { title: c.title, effectDescription: c.effectDescription };
}

/**
 * 从简介收集补充分区：`concept('升级')` 等机制词；文案出现具名配饰（火焰/裁剪/钻石配饰等）时追加该配饰说明；
 * 仅当提到「配饰」但未指名任何一种时，才追加通用「配饰」机制词。
 *
 * @param {unknown} description
 * @param {Set<string> | Iterable<string>} [excludeTitles] 已单独展示的分区标题
 * @returns {DescriptionConceptPanel[]}
 */
export function collectExplicitDescriptionConceptPanels(description, excludeTitles = new Set()) {
  const seen = new Set([...excludeTitles].map((t) => String(t ?? "").trim()).filter(Boolean));
  /** @type {DescriptionConceptPanel[]} */
  const panels = [];
  /** @param {unknown[]} segs */
  function walkConceptSegments(segs) {
    for (const seg of segs) {
      if (!seg || typeof seg !== "object") continue;
      if (seg.type === "concept") {
        const label = String(seg.v ?? "").trim();
        if (label === "配饰") continue;
        const entry = getGameTermConceptPanel(label);
        if (!entry || seen.has(entry.title)) continue;
        seen.add(entry.title);
        panels.push(entry);
      } else if (seg.type === "gainBlock" && Array.isArray(seg.parts)) {
        walkConceptSegments(seg.parts);
      }
    }
  }
  if (Array.isArray(description)) {
    walkConceptSegments(description);
  }
  const plain = descriptionToPlainText(description);
  for (const panel of collectNamedAccessoryPanelsFromPlainText(plain, seen)) {
    panels.push(panel);
  }
  if (plain.includes("配饰") && !textMentionsAnyNamedAccessory(plain)) {
    const entry = getGameTermConceptPanel("配饰");
    if (entry && !seen.has(entry.title)) {
      seen.add(entry.title);
      panels.push(entry);
    }
  }
  return panels;
}

/**
 * 合并多段简介后收集显式 `concept` 分区（顺序保留、标题去重）。
 *
 * @param {unknown[]} descriptions
 * @param {Set<string> | Iterable<string>} [excludeTitles]
 * @returns {DescriptionConceptPanel[]}
 */
export function collectExplicitDescriptionConceptPanelsFromMany(descriptions, excludeTitles = new Set()) {
  const seen = new Set([...excludeTitles].map((t) => String(t ?? "").trim()).filter(Boolean));
  /** @type {DescriptionConceptPanel[]} */
  const panels = [];
  for (const desc of descriptions) {
    for (const p of collectExplicitDescriptionConceptPanels(desc, seen)) {
      panels.push(p);
      seen.add(p.title);
    }
  }
  return panels;
}
