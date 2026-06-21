/**
 * 从 treasureCatalog + treasure_*.js 生成 design/treasure_concepts_with_emoji.json
 * 用法: node scripts/build-treasure-concepts-json.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** 用户 50 条批量清单原文（按提交顺序） */
const USER_BATCH_50 = [
  { batchIndex: 1, text: "$4 common 每当一次丢弃超过3个元音字母时，获得 $5" },
  { batchIndex: 2, text: "$4 common 每拼写一个单词+1倍率；每丢弃一次字母-1倍率；" },
  { batchIndex: 3, text: "$4 common 如果你拼写的单词以tion结尾，随机释放一个法术" },
  { batchIndex: 4, text: "$4 common 如果拼写的是[某种词性]，获得$4（词性每关都会变化）" },
  {
    batchIndex: 5,
    text: "$4 common x3倍率；1/1000的概率在关卡完成时自毁【需要之前那个1/6概率的宝藏已经自毁过，这个宝藏才会出现在随机池和商店中】",
  },
  { batchIndex: 6, text: "$6 rare 如果单词长度在本关内已经被拼写过，x3倍率" },
  { batchIndex: 7, text: "$5 common 每当组合包被跳过时，获得+3倍率（当前+0）" },
  { batchIndex: 8, text: "$7 rare 每当进入一个新的关卡，获得x0.5倍率并随机摧毁一个其他宝藏" },
  { batchIndex: 9, text: "$4 common 当拼写的单词长度为4时，获得+10分数（当前+0）" },
  { batchIndex: 10, text: "$6 rare 你每拼写3个名词，打开一个宝藏组合包（当前0/3）" },
  { batchIndex: 11, text: "$6 rare 你每拼写2个形容词，打开一个法术组合包（当前0/2）" },
  { batchIndex: 12, text: "$6 rare 你每拼写2个动词，打开一个升级组合包（当前0/2）" },
  { batchIndex: 13, text: "$6 rare 如果拼写的单词为副词，打开一个字母组合包" },
  { batchIndex: 14, text: "$6 common 每当进入一个新的关卡，随机获取2个新的宝藏（需要有空位）" },
  {
    batchIndex: 15,
    text: "$7 epic 每当你使用一个带有增强效果的字母，移除它的增强效果，并获得x0.1倍率（当前x1）",
  },
  {
    batchIndex: 16,
    text: "$7 epic 允许相邻的元音字母彼此替换【aeiou，a可以替代e，e可以替代a和i，以此类推，在界面上表现为在元音字母的左上和右下出现一个透明度较低的相邻元音，例如字母E的左上就是A，右下就是I，透明度低一点。0.25左右就行且偏移一点就行了不要偏移到角落上。当被用于拼写时，如果发生变形，则位置发生循环，比如拼写apple，A由E替换而来，那么中间的实心字母就显示为A，E就和原本的半透明的A替换位置】",
  },
  { batchIndex: 17, text: "$7 common 每当一个字母被加入你的牌库，获得x0.25倍率（当前x1）" },
  { batchIndex: 18, text: "$8 epic 当你拼写单词后余额少于$5，随机释放一个法术" },
  { batchIndex: 19, text: "$6 rare 你每有$1，+2分数" },
  {
    batchIndex: 20,
    text: "$6 rare 如果每关拼写的第一个单词只有3个字母，从牌库中移除这3个字母并获得$3",
  },
  { batchIndex: 21, text: "$5 rare 每当商店刷新时，获得+2倍率（当前+0）" },
  { batchIndex: 22, text: "$5 common +25倍率；每拼写一个单词-5倍率（当前+25）" },
  { batchIndex: 23, text: "$6 rare 每当你拼写一个带有相同的相邻字母的单词，获得+2倍率（当前+0）" },
  {
    batchIndex: 24,
    text: "$8 epic 所有普通字母在计分时提供x1.25倍率（稀有度和倍率在每关结束时都会变化）【普通:1.25，稀有:1.5，史诗2， 传说4，且变化那一下需要wobble】",
  },
  { batchIndex: 25, text: "$6 rare x2倍率，每弃掉1个字母损失0.01（当前x2）" },
  {
    batchIndex: 26,
    text: "$4 common 每一个s在计分时提供+5分数和+5倍率；每一个z在计分时提供+2分数和x2倍率",
  },
  {
    batchIndex: 27,
    text: "$6 rare 你接下来的10个单词都会额外触发一次字母计分【10那个字母会一直变化】",
  },
  {
    batchIndex: 28,
    text: "$6 rare 每当你弃掉一张abcde，获得+3分数（字母每回合都会变化）【把26个字母做分段，abcde，fghij，klmno，pqrst，uvwxyz，然后每次随机时从这5组里面随机挑一组】",
  },
  {
    batchIndex: 29,
    text: "$9 epic 每当你卖出宝藏时，获得x0.25倍率，在每个大关完成后重置（当前x1）",
  },
  { batchIndex: 30, text: "$5 common 黄金块在计分时会提供$4 【出现在随机池和商店的前提：打出一手全部由黄金块组成的单词】" },
  {
    batchIndex: 31,
    text: "$5 rare 如果用尽拼写次数时达到了所需分数的25%，摧毁自身并使你获得3次拼写机会",
  },
  { batchIndex: 32, text: "$6 rare 使用最后一次拼写次数时具有x3倍率" },
  { batchIndex: 33, text: "$6 rare 重新触发所有的辅音字母" },
  { batchIndex: 34, text: "$4 common 将其他宝藏的售卖价格之和添加至倍率" },
  { batchIndex: 35, text: "$6 rare 你的单词视为+1的长度，每回合拼写次数-1" },
  {
    batchIndex: 36,
    text: "$6 rare 每当进入关卡时，在你的牌库中添加一个具有随机增益效果的字母并立即抽到它【joker会在tile掉落前wobble出一个tile，然后tile飞入牌库动画、然后才是grid中的tile从上方掉下来的动画，且抽取时必定抽到这个字母】【解锁前提：拥有一个带有钱币配饰的黄金块】",
  },
  {
    batchIndex: 37,
    text: "$7 rare 普通和稀有视为同一种稀有度；史诗和传说视为同一种稀有度；【稀有度升级会同时作用于2种稀有度；解锁前提：向牌库中添加至少3种不同稀有度的字母块】",
  },
  {
    batchIndex: 38,
    text: "$4 common 你的单词的第一个字母会额外触发2次计分【解锁前提：使用全部由普通稀有度组成的单词击败boss】",
  },
  { batchIndex: 39, text: "$7 rare 传说字母在计分时会提供$10 【解锁前提：在牌库中拥有8个传说字母】" },
  { batchIndex: 40, text: "$7 rare 史诗字母在计分时提供x1.5倍率【解锁前提：在牌库中拥有16个史诗字母】" },
  { batchIndex: 41, text: "$7 rare 稀有字母在计分时提供+50分数【解锁前提：牌库中一半或以上的字母都是稀有字母】" },
  { batchIndex: 42, text: "$7 rare 普通字母在计分时提供+10倍率【解锁前提：牌库中所有字母都是普通字母】" },
  {
    batchIndex: 43,
    text: "$6 rare 每当一个碎冰块碎裂时，获得x0.75倍率（当前x1）【解锁前提：在牌库种拥有5个碎冰块】",
  },
  { batchIndex: 44, text: "$6 rare 如果你的一次拼写中拥有4种不同的稀有度，x3倍率【解锁前提：进入无尽模式】" },
  { batchIndex: 45, text: "$10 epic 复制右侧的宝藏能力【具体可以参考https://balatrowiki.org/w/Blueprint 】" },
  { batchIndex: 46, text: "$8 epic 每当你拼写了字母b，获得+8分数（当前+0）" },
  {
    batchIndex: 47,
    text: "$7 rare +3丢弃次数，你的单词被视为-1的长度【解锁前提：在一个大关的每一个小关中都用尽了丢弃次数】",
  },
  { batchIndex: 48, text: "$4 rare 所有列出的倍率翻倍【解锁前提：成功触发一个概率效果】" },
  {
    batchIndex: 49,
    text: "$5 rare 每一个拼出的xx提供x2倍率【xx 2个字母是随机的，是从词典库中随机挑1个单词，再从中随机挑得2个相邻的字母。另外，单词中如果多次出现这个组合，例如节选是na，那banana就能获得2次x2效果。宝藏在后一个字母计分完成后wobble生效并提供x2倍率】",
  },
  {
    batchIndex: 50,
    text: "$7 rare 触发boss的限制时，获得$8【如果是限制某种单词、例如只能是动词但玩家拼了名词。或者不能以普通字母结尾但玩家以普通字母结尾了。这种就算是触发。这个针对每种boss的效果不一样，你可以先帮我构思一下，对于每种boss玩家分别怎么样才算是触发】",
  },
];

/** 用户 batchIndex → 游戏 treasureId（与实装映射一致） */
const BATCH_TO_TREASURE_ID = {
  1: "49",
  2: "50",
  3: "51",
  4: "83",
  5: "54",
  6: "52",
  7: "53",
  8: "86",
  9: "55",
  10: "81",
  11: "82",
  12: "84",
  13: "85",
  14: "87",
  15: "88",
  16: null,
  17: "89",
  18: "56",
  19: "57",
  20: "58",
  21: "59",
  22: "60",
  23: "61",
  24: "94",
  25: "62",
  26: "63",
  27: "64",
  28: "65",
  29: "66",
  30: "91",
  31: "67",
  32: "68",
  33: "93",
  34: "69",
  35: "92",
  36: null,
  37: null,
  38: "70",
  39: "71",
  40: "72",
  41: "73",
  42: "74",
  43: "78",
  44: "79",
  45: null,
  46: "80",
  47: "42",
  48: "45",
  49: "46",
  50: "48",
};

const DEFERRED_NOTES = {
  16: "元音邻接替换 UI + 选词变形 + 持久化；未实装",
  36: "入关 Joker 字母 + 飞牌/下落时序；未实装",
  37: "稀有度两组合并（全局）；未实装",
  45: "Blueprint 复制右侧；未实装",
};

function parseCatalog() {
  const src = fs.readFileSync(path.join(root, "src/treasures/treasureCatalog.js"), "utf8");
  const entries = [];
  const re =
    /\{\s*treasureId:\s*"(\d+)"\s*,\s*name:\s*"([^"]*)"\s*,\s*emoji:\s*"([^"]*)"\s*,\s*scriptPath:\s*"([^"]*)"\s*,\s*implemented:\s*(true|false)\s*\}/g;
  let m;
  while ((m = re.exec(src))) {
    entries.push({
      treasureId: m[1],
      name: m[2],
      emoji: m[3],
      scriptPath: m[4],
      implemented: m[5] === "true",
    });
  }
  return entries.sort((a, b) => Number(a.treasureId) - Number(b.treasureId));
}

function extractDescriptionFromJs(filePath) {
  const t = fs.readFileSync(filePath, "utf8");
  const price = Number(t.match(/price:\s*(\d+)/)?.[1] ?? 0);
  const rarity = t.match(/rarity:\s*"([^"]+)"/)?.[1] ?? "common";
  let unlock = null;
  let pool = null;
  const um = t.match(/unlockPrerequisite:\s*(\{[^}]+\})/);
  if (um) {
    try {
      unlock = Function(`return (${um[1]})`)();
    } catch {
      unlock = um[1];
    }
  }
  const pm = t.match(/poolPrerequisite:\s*(\{[^}]+\})/);
  if (pm) {
    try {
      pool = Function(`return (${pm[1]})`)();
    } catch {
      pool = pm[1];
    }
  }

  const descMatch = t.match(/description:\s*describe\(([\s\S]*?)\)\s*,?\s*\n\s*\};/);
  let description = "";
  if (descMatch) {
    const block = descMatch[1];
    const parts = [];
    const tokenRe =
      /"([^"\\]*(?:\\.[^"\\]*)*)"|money\("([^"]*)"\)|score\("([^"]*)"\)|mult\("([^"]*)"\)|rarity\("([^"]*)"\)/g;
    let sm;
    while ((sm = tokenRe.exec(block))) {
      if (sm[1] != null) parts.push(sm[1].replace(/\\n/g, "\n"));
      else if (sm[2] != null) parts.push(`$${sm[2]}`);
      else if (sm[3] != null) parts.push(sm[3]);
      else if (sm[4] != null) parts.push(sm[4]);
      else if (sm[5] != null) parts.push(sm[5]);
    }
    description = parts.join("");
  }

  return { price, rarity, description, unlockPrerequisite: unlock, poolPrerequisite: pool };
}

/** @param {string | null | undefined} raw */
function parseUserOriginalText(raw) {
  if (!raw) return { playerLine: null, devNotes: null };
  const devMatch = raw.match(/【([\s\S]*)】/);
  const devNotes = devMatch ? devMatch[1].trim() : null;
  let playerLine = raw.replace(/【[\s\S]*】/g, "").trim();
  playerLine = playerLine.replace(/^\$\d+\s+(?:common|rare|epic|legendary)\s+/i, "").trim();
  return { playerLine: playerLine || null, devNotes };
}

function build() {
  const catalog = parseCatalog();
  const batchByTid = new Map();
  for (const b of USER_BATCH_50) {
    const tid = BATCH_TO_TREASURE_ID[b.batchIndex];
    if (tid) batchByTid.set(tid, b);
  }

  const treasures = catalog.map((c) => {
    const jsPath = path.join(root, "src/treasures/items", `treasure_${c.treasureId}.js`);
    const meta = fs.existsSync(jsPath) ? extractDescriptionFromJs(jsPath) : {};
    const batch = batchByTid.get(c.treasureId);
    const batchIndex = batch?.batchIndex ?? null;

    let implementationStatus = c.implemented ? "implemented" : "not_implemented";
    let notes = null;
    if (batchIndex && DEFERRED_NOTES[batchIndex]) {
      implementationStatus = "deferred";
      notes = DEFERRED_NOTES[batchIndex];
    } else if (!c.implemented && !batch) {
      notes = "catalog 占位，非用户 50 条批次";
    }

    const parsedUser = parseUserOriginalText(batch?.text);
    const fromCode = meta.description?.trim() || "";
    const fromUser = parsedUser.playerLine?.trim() || "";
    const description =
      fromCode && fromUser && fromCode !== fromUser
        ? fromCode
        : fromCode || fromUser || null;

    return {
      treasureId: c.treasureId,
      price: meta.price ?? null,
      rarity: meta.rarity ?? null,
      name: c.name,
      emoji: c.emoji,
      description,
      userBatchIndex: batchIndex,
      userOriginalText: batch?.text ?? null,
      userDevNotes: parsedUser.devNotes,
      implemented: c.implemented,
      implementationStatus,
      scriptPath: c.scriptPath.replace(/^\.\//, "src/treasures/"),
      unlockPrerequisite: meta.unlockPrerequisite ?? null,
      poolPrerequisite: meta.poolPrerequisite ?? null,
      notes,
    };
  });

  const unmappedBatch = USER_BATCH_50.filter((b) => !BATCH_TO_TREASURE_ID[b.batchIndex]).map((b) => {
    const parsed = parseUserOriginalText(b.text);
    return {
      batchIndex: b.batchIndex,
      userOriginalText: b.text,
      description: parsed.playerLine,
      userDevNotes: parsed.devNotes,
      implementationStatus: "deferred",
      notes: DEFERRED_NOTES[b.batchIndex] ?? "未分配 treasureId",
    };
  });

  const out = {
    version: 3,
    updatedAt: new Date().toISOString().slice(0, 10),
    description:
      "宝藏设计中转表：与 src/treasures/treasureCatalog.js 及 treasure_<id>.js 同步。对话中请用 treasureId（游戏 id）或 userBatchIndex（用户 50 条清单序号）引用。改 catalog/实装后请运行 node scripts/build-treasure-concepts-json.mjs 刷新本文件。",
    howToUse: {
      treasureId: "游戏内 id，对应 treasure_<id>.js",
      userBatchIndex: "用户提交的 50 条清单第几条（1–50）",
      userOriginalText: "清单原文（含价格稀有度前缀）",
      userDevNotes: "原文【】内给开发的备注",
      description: "玩家向简介（优先来自代码 describe，否则来自清单正文）",
      implementationStatus: "implemented | not_implemented | deferred",
    },
    userBatch50Count: 50,
    treasures,
    userBatchUnmapped: unmappedBatch,
    implementationSummary: {
      implemented: treasures.filter((t) => t.implementationStatus === "implemented").length,
      notImplemented: treasures.filter((t) => t.implementationStatus === "not_implemented").length,
      deferredFromBatch50: unmappedBatch.length,
    },
  };

  const outPath = path.join(root, "design/treasure_concepts_with_emoji.json");
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(`Wrote ${treasures.length} treasures to ${outPath}`);
}

build();
