import fs from "fs";

const src = fs.readFileSync("src/components/GamePanel.vue", "utf8");
const lines = src.split(/\r?\n/);
const fns = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^(async )?function (\w+)\(/);
  if (m) fns.push({ name: m[2], line: i + 1 });
}

const dead = [];
for (const { name, line } of fns) {
  const re = new RegExp(`\\b${name}\\b`, "g");
  const count = [...src.matchAll(re)].length;
  if (count === 1) dead.push(`${name} (L${line})`);
}

console.log(dead.join("\n"));
console.log(`\nTotal: ${dead.length}`);
