import {
  getTileMaterialBlockTitle,
  getTileMaterialEffectDescription,
} from "../game/gameConceptCopy.js";

/**
 * 法术卡详情 / 选格浮层：主描述下方的「增益说明」分区。
 *
 * **仅展示**：具名单种字母块材质及其计分/倍率/关卡金币等说明；名称与正文均来自 `gameConceptCopy.js`。
 *
 * **不展示**：类目词（如「宝藏配饰」）、抛光稀有度、复制、星星随机附魔、万能变形、麦克风/铃铛/电话换字等——见 `.cursor/rules/spell-gain-panel.mdc`。
 *
 * 骰子/向上/积累/标签/藏宝图/生长/删除/重播本体等仍不在此解释；重播仅嵌套上一张法术**仍满足上述条件时**的材质说明（正文与单独展示该法术时一致，不另加套话）。
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
    default:
      return null;
  }
}
