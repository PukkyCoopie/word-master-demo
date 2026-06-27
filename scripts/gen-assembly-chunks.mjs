import fs from "fs";

const src = fs.readFileSync("src/components/GamePanel.vue", "utf8");
const start = src.indexOf("    core: {");
const end = src.indexOf("  }));", start) + 4;
const body = src.slice(start, end);
const lines = body.split("\n");
const out = lines.map((line) => {
  const m = line.match(/^(\s+)(\w+),\s*$/);
  if (m) return `${m[1]}${m[2]}: ctx.${m[2]},`;
  if (line.includes("openStageSettlementSlot")) {
    return line.replace(/\bopenStageSettlementSlot\b/g, "ctx.openStageSettlementSlot");
  }
  if (line.includes("shopPhase.")) return line.replace(/shopPhase\./g, "ctx.shopPhase.");
  if (line.includes("treasureInventoryCtrl.")) {
    return line.replace(/treasureInventoryCtrl\./g, "ctx.treasureInventoryCtrl.");
  }
  if (line.includes("tileDetailCtrl.")) return line.replace(/tileDetailCtrl\./g, "ctx.tileDetailCtrl.");
  if (line.includes("runResultPresentationCtrl.")) {
    return line.replace(/runResultPresentationCtrl\./g, "ctx.runResultPresentationCtrl.");
  }
  if (line.includes("bossMechanicsCtrl.")) {
    return line.replace(/bossMechanicsCtrl\./g, "ctx.bossMechanicsCtrl.");
  }
  return line;
});

const file = `/**
 * GamePanel assembly 8 域绑定（R4 收尾：自 GamePanel 迁出）。
 * @param {Record<string, unknown>} ctx
 */
export function buildGamePanelAssemblyChunks(ctx) {
  return {
${out.join("\n")}
  };
}
`;

fs.writeFileSync("src/runSession/buildGamePanelAssemblyChunks.js", file);
console.log("wrote chunks", file.split("\n").length, "lines");
