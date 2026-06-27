import fs from "fs";

const file = process.argv[2] ?? "src/components/GamePanel.vue";
let src = fs.readFileSync(file, "utf8");
const scriptStart = src.indexOf("<script setup>") + 14;
const scriptEnd = src.indexOf("</script>");
const script = src.slice(scriptStart, scriptEnd);
const template = src.slice(src.indexOf("<template>") + 10, src.indexOf("</template>"));
const scriptWithoutImports = script.replace(/import[\s\S]*?from\s+["'][^"']+["'];?\n?/g, "");
const usageText = template + "\n" + scriptWithoutImports;

function isUsed(name) {
  return new RegExp(`\\b${name.replace(/\$/g, "\\$&")}\\b`).test(usageText);
}

const importBlockRe = /^import[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm;
let removedSymbols = 0;
let removedBlocks = 0;

const newScript = script.replace(importBlockRe, (block) => {
  const from = block.match(/from\s+["']([^"']+)["']/)?.[1] ?? "";
  const defaultMatch = block.match(/^import\s+(\w+)\s+from/m);
  if (defaultMatch) {
    const name = defaultMatch[1];
    if (!isUsed(name)) {
      removedBlocks++;
      removedSymbols++;
      return "";
    }
    return block;
  }

  const braceMatch = block.match(/\{([\s\S]+)\}/);
  if (!braceMatch) return block;

  const kept = [];
  for (const part of braceMatch[1].split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const name = trimmed.split(/\s+as\s+/).pop()?.trim();
    if (!name) continue;
    if (isUsed(name)) kept.push(trimmed);
    else removedSymbols++;
  }

  if (kept.length === 0) {
    removedBlocks++;
    return "";
  }

  if (kept.length === braceMatch[1].split(",").filter((p) => p.trim()).length) {
    return block;
  }

  const isMultiline = block.includes("\n");
  if (isMultiline) {
    return `import {\n  ${kept.join(",\n  ")},\n} from "${from}";\n`;
  }
  return `import { ${kept.join(", ")} } from "${from}";\n`;
});

const cleaned = newScript.replace(/\n{3,}/g, "\n\n");
src = src.slice(0, scriptStart) + cleaned + src.slice(scriptEnd);
fs.writeFileSync(file, src);

const importLinesAfter = cleaned.split("\n").filter((l) => /^\s*import\b/.test(l)).length;
console.log(`Removed symbols: ${removedSymbols}`);
console.log(`Removed blocks: ${removedBlocks}`);
console.log(`Import lines after: ${importLinesAfter}`);
