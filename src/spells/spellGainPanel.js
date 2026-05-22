import {
  getTileAccessoryEffectDescription,
  getTileBoardAccessoryTitle,
  getTileMaterialBlockTitle,
  getTileMaterialEffectDescription,
  getTreasureAccessoryPanelDescription,
  getTreasureAccessoryPanelTitle,
} from "../game/gameConceptCopy.js";

/**
 * 法术卡详情 / 选格浮层：主描述下方的「增益说明」分区。
 *
 * **展示**：具名材质块、或主描述点名的具名棋盘/宝藏配饰（文案来自 `gameConceptCopy.js`）。
 * **不展示**：未点名的「随机配饰」等（由 `collectExplicitDescriptionConceptPanels` 补通用「配饰」）。
 *
 * @typedef {{ title: string, description: string }} SpellGainPanel
 */

/**
 * @param {string} materialId
 * @returns {SpellGainPanel | null}
 */
function materialGainPanelForMaterialId(materialId) {
  const id = String(materialId ?? "").trim();
  const title = getTileMaterialBlockTitle(id);
  const description = getTileMaterialEffectDescription(id);
  if (!title || !description) return null;
  return { title, description };
}

/** 法术卡「增益说明」：仅展示带计分/倍率/金额等增益的材质；万能块为变形规则，不展示 */
function spellMaterialGainPanel(materialId) {
  const id = String(materialId ?? "").trim();
  if (id === "wildcard") return null;
  return materialGainPanelForMaterialId(id);
}

/**
 * @param {string} accessoryId `treasure_acc_*`
 * @returns {SpellGainPanel | null}
 */
function spellTreasureAccessoryGainPanel(accessoryId) {
  const title = getTreasureAccessoryPanelTitle(accessoryId);
  const description = getTreasureAccessoryPanelDescription(accessoryId);
  if (!title || !description) return null;
  return { title, description };
}

/**
 * @param {string} accessoryId 棋盘配饰 id
 * @returns {SpellGainPanel | null}
 */
function spellTileBoardAccessoryGainPanel(accessoryId) {
  const title = getTileBoardAccessoryTitle(accessoryId);
  const description = getTileAccessoryEffectDescription(accessoryId);
  if (!title || !description) return null;
  return { title, description };
}

/**
 * @param {string} spellId 实际生效的法术 id（重播预览传 `restart` + opts）
 * @param {{ replayTargetSpellId?: string | null }} [opts] 仅 `restart` 时使用
 * @returns {SpellGainPanel | null}
 */
export function getSpellGainPanel(spellId, opts = {}) {
  const sid = String(spellId ?? "").trim();
  if (!sid) return null;

  if (sid === "restart") {
    const replay = String(opts.replayTargetSpellId ?? "").trim();
    if (!replay) return null;
    return getSpellGainPanel(replay, {});
  }

  switch (sid) {
    case "cake":
      return spellMaterialGainPanel("lucky");
    case "blaze":
      return spellMaterialGainPanel("fire");
    case "drinks":
      return spellMaterialGainPanel("water");
    case "hammer":
      return spellMaterialGainPanel("steel");
    case "snowflake":
      return spellMaterialGainPanel("ice");
    case "flask":
      return spellMaterialGainPanel("gold");
    case "diamond":
      return spellTileBoardAccessoryGainPanel("vip_diamond");
    case "ectoplasm":
      return spellTreasureAccessoryGainPanel("treasure_acc_crop");
    case "wrench":
      return spellTreasureAccessoryGainPanel("treasure_acc_wrench");
    case "talisman":
      return spellTileBoardAccessoryGainPanel("coin");
    case "deja_vu":
      return spellTileBoardAccessoryGainPanel("rewind");
    default:
      return null;
  }
}
