import fs from "fs";

const gp = fs.readFileSync("src/components/GamePanel.vue", "utf8");
const start = gp.indexOf("const { ports: gamePanelPorts } = setupGamePanelAssembly({");
const end = gp.indexOf("const panelAssembly = useGamePanelSessionAssembly", start);
if (start < 0 || end < 0) {
  console.error("block not found", start, end);
  process.exit(1);
}
const block = gp.slice(start + "const { ports: gamePanelPorts } = setupGamePanelAssembly(".length, end + 1);

function mapSection(objStr) {
  return objStr.replace(/(\n\s*)([A-Za-z_$][\w$]*)(\s*,?\s*)$/gm, (_, indent, key, tail) => {
    if (key === "true" || key === "false" || key === "null") return _;
    return `${indent}${key}: d.${key}${tail}`;
  }).replace(/(\n\s*)([A-Za-z_$][\w$]*)\s*:\s*([A-Za-z_$][\w$]*)(\s*,?\s*)$/gm, (_, indent, key, val, tail) => {
    if (val === "true" || val === "false" || val === "null") return _;
    return `${indent}${key}: d.${val}${tail}`;
  });
}

const out = `/**
 * GamePanel assembly 8 域 sections（自 GamePanel 迁出）。
 * @param {Record<string, unknown>} d
 */
export function buildGamePanelAssemblySectionsInput(d) {
  return ${mapSection(block)};
}
`;

fs.writeFileSync("src/runSession/buildGamePanelAssemblySectionsInput.js", out);
console.log("wrote buildGamePanelAssemblySectionsInput.js", out.length, "chars");
