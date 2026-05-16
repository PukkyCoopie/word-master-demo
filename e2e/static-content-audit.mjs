/**
 * 静态内容审计：宝藏/关卡/法术等定义一致性（无需浏览器）。
 * 用法: node e2e/static-content-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** @type {{ ok: boolean, category: string, id: string, message: string }[]} */
const findings = [];

function ok(category, id, message) {
  findings.push({ ok: true, category, id, message });
}
function fail(category, id, message) {
  findings.push({ ok: false, category, id, message });
}

async function loadModule(rel) {
  return import(pathToFileURL(path.join(root, rel)).href);
}

function fileExists(rel) {
  return fs.existsSync(path.join(root, rel));
}

async function auditTreasures() {
  const { TREASURE_CATALOG } = await loadModule("./src/treasures/treasureCatalog.js");
  const emojis = new Set();
  for (const t of TREASURE_CATALOG) {
    const id = t.treasureId;
    if (emojis.has(t.emoji)) fail("treasure", id, `emoji 重复: ${t.emoji}`);
    else emojis.add(t.emoji);
    if (t.implemented) {
      if (!t.scriptPath) fail("treasure", id, "implemented 但无 scriptPath");
      else if (!fileExists(path.join("src/treasures/items", path.basename(t.scriptPath))))
        fail("treasure", id, `缺少文件 ${t.scriptPath}`);
      else ok("treasure", id, `已实装 ${t.name}`);
    } else {
      ok("treasure", id, `未实装 ${t.name}`);
    }
  }
}

async function auditLevels() {
  const { LEVELS, LEVEL_TARGET_BY_ID } = await loadModule("./src/levelDefinitions.js");
  for (const l of LEVELS) {
    const target = LEVEL_TARGET_BY_ID[l.id];
    if (!Number.isFinite(target) || target <= 0) {
      fail("level", l.id, `目标分异常: ${target}`);
    } else {
      ok("level", l.id, `目标分 ${target}，奖励 ${l.rewardYuan} 元`);
    }
  }
}

async function auditDictionary() {
  const dictPath = path.join(root, "data", "dictionary", "dict.json");
  if (!fs.existsSync(dictPath)) {
    fail("dictionary", "dict.json", "缺少 data/dictionary/dict.json");
    return;
  }
  const raw = JSON.parse(fs.readFileSync(dictPath, "utf8"));
  if (!Array.isArray(raw) || raw.length < 1000) {
    fail("dictionary", "dict.json", `词条过少: ${raw?.length ?? 0}`);
  } else {
    ok("dictionary", "dict.json", `${raw.length} 条词条`);
  }
}

async function auditSpells() {
  try {
    const mod = await loadModule("./src/spells/spellDefinitions.js");
    const spells = mod.SPELL_DEFINITIONS ?? mod.spells ?? mod.default;
    if (!spells) {
      fail("spell", "*", "spellDefinitions 未导出 SPELL_DEFINITIONS");
      return;
    }
    const list = Array.isArray(spells) ? spells : Object.values(spells);
    for (const s of list) {
      const id = s.id ?? s.spellId ?? "?";
      if (!s.description && !s.name) fail("spell", id, "缺少 name/description");
      else ok("spell", id, s.name ?? id);
    }
  } catch (e) {
    fail("spell", "*", `加载失败: ${e.message}`);
  }
}

async function main() {
  console.log("\n=== Word Master 静态内容审计 ===\n");
  await auditDictionary();
  await auditLevels();
  await auditTreasures();
  await auditSpells();

  const passed = findings.filter((f) => f.ok);
  const failed = findings.filter((f) => !f.ok);

  console.log(`通过 ${passed.length} 项，问题 ${failed.length} 项\n`);
  if (failed.length) {
    console.log("--- 需关注 ---");
    for (const f of failed.slice(0, 40)) {
      console.log(`  [${f.category}] ${f.id}: ${f.message}`);
    }
    if (failed.length > 40) console.log(`  … 另有 ${failed.length - 40} 项`);
  }

  const outDir = path.join(__dirname, "reports");
  fs.mkdirSync(outDir, { recursive: true });
  const reportPath = path.join(outDir, "static-audit.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ at: new Date().toISOString(), passed, failed }, null, 2),
  );
  console.log(`\n报告已写入 ${reportPath}\n`);
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
