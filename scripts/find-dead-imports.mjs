import fs from "fs";

const file = process.argv[2] ?? "src/components/GamePanel.vue";
const src = fs.readFileSync(file, "utf8");
const script = src.slice(src.indexOf("<script setup>") + 14, src.indexOf("</script>"));
const template = src.slice(src.indexOf("<template>") + 10, src.indexOf("</template>"));
const usageText =
  template +
  "\n" +
  script
    .split("\n")
    .filter((l) => !/^\s*import\b/.test(l))
    .join("\n");

/** @type {{ name: string, from: string, line: number }[]} */
const all = [];
const stmts = script.match(/import[\s\S]*?from\s+["'][^"']+["'];?/g) ?? [];
for (const stmt of stmts) {
  const from = stmt.match(/from\s+["']([^"']+)["']/)?.[1] ?? "";
  const def = stmt.match(/^import\s+(\w+)\s+from/)?.[1];
  if (def) {
    all.push({ name: def, from, line: 0 });
    continue;
  }
  const brace = stmt.match(/\{([\s\S]+)\}/)?.[1];
  if (!brace) continue;
  for (const part of brace.split(",")) {
    const name = part.trim().split(/\s+as\s+/).pop()?.trim();
    if (!name || name.startsWith("type ")) continue;
    all.push({ name, from, line: 0 });
  }
}

/** @type {{ name: string, from: string }[]} */
const dead = [];
for (const { name, from } of all) {
  const re = new RegExp(`\\b${name.replace(/\$/g, "\\$&")}\\b`);
  if (!re.test(usageText)) dead.push({ name, from });
}

console.log(`Total named imports: ${all.length}`);
console.log(`Dead imports: ${dead.length}`);
dead.sort((a, b) => a.from.localeCompare(b.from) || a.name.localeCompare(b.name));
for (const d of dead) console.log(`${d.name} <- ${d.from}`);
