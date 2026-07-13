import { grantDevOwnedTreasureById } from "./devGrantTreasures.js";
import { buildPromoSuperPackPickSession } from "./screenshotPresetScenario.js";
import { applyWordToGridTopRow } from "./treasureHookFxDevScenario.js";
import { ensureGlobalTreasureBank, ensureOwnedSlotBank } from "../treasures/treasureRunState.js";
import { isGlobalTreasureBank } from "../treasures/treasureRunState.js";

/** @typedef {'deckAdd' | 'deckRemove' | 'shopReroll' | 'packSkip' | 'discard' | 'submit' | 'levelComplete' | 'levelEnter' | 'enhanceStrip' | 'global' | 'treasureSold'} PerSlotBankDevTrigger */

/**
 * @typedef {Object} PerSlotBankDevScenario
 * @property {number} scenarioIndex 1-based，传给 __WM_DEV__.startPerSlotBankDevTest(n)
 * @property {string} treasureId
 * @property {string} name
 * @property {string} emoji
 * @property {PerSlotBankDevTrigger} trigger
 * @property {string} triggerHint
 * @property {readonly string[]} [auxTreasureIds] 辅助宝藏，各 1 个
 * @property {(bank: import('../treasureRunState.js').TreasureIdBank) => void} [seedFirstCopyBank] 第一块预置「已成长」银行
 * @property {boolean} [autoDeckAddOne] 设置完成后自动加 1 张字母库牌（邮筒/海浪）
 */

/** @type {readonly PerSlotBankDevScenario[]} */
const SCENARIOS = Object.freeze([
  {
    scenarioIndex: 1,
    treasureId: "89",
    name: "邮筒",
    emoji: "📬",
    trigger: "deckAdd",
    seedFirstCopyBank: (b) => {
      b.multMul = 1.5;
    },
    autoDeckAddOne: true,
    triggerHint:
      "已自动加 1 张字母库牌。详情：第一块应 x1.75、第二块 x1.25；再购字母仅各自 +0.25。",
  },
  {
    scenarioIndex: 2,
    treasureId: "113",
    name: "花环",
    emoji: "🏵️",
    trigger: "deckRemove",
    seedFirstCopyBank: (b) => {
      b.multMul = 2;
    },
    triggerHint: "从字母库移除含元音的牌（法术/消耗等）。第一块 x2、第二块 x1；各 +0.5/元音。",
  },
  {
    scenarioIndex: 3,
    treasureId: "59",
    name: "摩天轮",
    emoji: "🎡",
    trigger: "shopReroll",
    seedFirstCopyBank: (b) => {
      b.multAdd = 10;
    },
    triggerHint: "进商店并刷新一次。第一块 +13、第二块 +3 倍率（各独立 +3）。",
  },
  {
    scenarioIndex: 4,
    treasureId: "53",
    name: "自行车",
    emoji: "🚲",
    trigger: "packSkip",
    seedFirstCopyBank: (b) => {
      b.multAdd = 8;
    },
    triggerHint: "打开任意组合包并跳过。第一块 +16、第二块 +8 倍率。",
  },
  {
    scenarioIndex: 5,
    treasureId: "64",
    name: "旋钮",
    emoji: "🎛️",
    trigger: "submit",
    seedFirstCopyBank: (b) => {
      b.scoreAdd = 3;
    },
    triggerHint: "成功提交单词。第一块「还剩3」、第二块「还剩10」；各独立 -1。",
  },
  {
    scenarioIndex: 6,
    treasureId: "88",
    name: "海绵",
    emoji: "🧽",
    trigger: "enhanceStrip",
    seedFirstCopyBank: (b) => {
      b.multMul = 1.3;
    },
    triggerHint:
      "提交带增强（配饰/材质加成）的字母。第一块 x1.3+、第二块 x1；仅先擦到的海绵 +0.1/字母。",
  },
  {
    scenarioIndex: 7,
    treasureId: "65",
    name: "陶罐",
    emoji: "🏺",
    trigger: "discard",
    seedFirstCopyBank: (b) => {
      b.scoreAdd = 12;
    },
    triggerHint: "弃牌。第一块详情 +12、第二块 +0；触发 1/8 时各自独立 +4。",
  },
  {
    scenarioIndex: 8,
    treasureId: "115",
    name: "洗衣篮",
    emoji: "🧺",
    trigger: "discard",
    seedFirstCopyBank: (b) => {
      b.multMul = 3;
    },
    triggerHint: "累计弃 26 个字母块。第一块 x3、第二块 x1；每 26 弃牌各独立 +1 倍率。",
  },
  {
    scenarioIndex: 9,
    treasureId: "99",
    name: "滑板",
    emoji: "🛹",
    trigger: "discard",
    seedFirstCopyBank: (b) => {
      b.multMul = 1.5;
    },
    triggerHint: "弃掉字母 E。第一块 x1.5、第二块 x1；各独立 +0.25/E。",
  },
  {
    scenarioIndex: 10,
    treasureId: "104",
    name: "镜子",
    emoji: "🪞",
    trigger: "levelComplete",
    seedFirstCopyBank: (b) => {
      b.scoreAdd = 1;
    },
    triggerHint: "完成小关。第一块充能 1/2、第二块 0/2；关末各自 +1。",
  },
  {
    scenarioIndex: 11,
    treasureId: "137",
    name: "电池",
    emoji: "🔋",
    trigger: "levelComplete",
    seedFirstCopyBank: (b) => {
      b.scoreAdd = 5000;
    },
    triggerHint: "超额完成关卡。第一块「已储存:5000」、第二块无储存；各自独立写入。",
  },
  {
    scenarioIndex: 12,
    treasureId: "132",
    name: "存钱罐",
    emoji: "🐷",
    trigger: "levelComplete",
    seedFirstCopyBank: (b) => {
      b.scoreAdd = 5;
    },
    triggerHint: "完成小关领金币。第一块 payout 5、第二块 1；50% 升级各自独立。",
  },
  {
    scenarioIndex: 13,
    treasureId: "122",
    name: "梯子",
    emoji: "🪜",
    trigger: "levelComplete",
    seedFirstCopyBank: (b) => {
      b.posPackProgress = 1;
    },
    triggerHint: "完成小关。第一块「还剩1关」、第二块「还剩3关」；关末各自 -1。",
  },
  {
    scenarioIndex: 14,
    treasureId: "40",
    name: "书",
    emoji: "📖",
    trigger: "submit",
    seedFirstCopyBank: (b) => {
      b.multAdd = 6;
    },
    triggerHint: "成功提交单词。第一块 +9、第二块 +3 倍率（各独立 +3）。",
  },
  {
    scenarioIndex: 15,
    treasureId: "44",
    name: "笔记本",
    emoji: "📔",
    trigger: "submit",
    seedFirstCopyBank: (b) => {
      b.scoreAdd = 20;
    },
    triggerHint: "成功提交单词。第一块 +25、第二块 +5 分数（各独立 +5）。",
  },
  {
    scenarioIndex: 16,
    treasureId: "50",
    name: "天平",
    emoji: "⚖️",
    trigger: "submit",
    seedFirstCopyBank: (b) => {
      b.multAdd = 4;
    },
    triggerHint: "成功提交单词。第一块与第二块倍率独立累积（视单词长度差）。",
  },
  {
    scenarioIndex: 17,
    treasureId: "55",
    name: "四叶草",
    emoji: "🍀",
    trigger: "submit",
    seedFirstCopyBank: (b) => {
      b.scoreAdd = 40;
    },
    triggerHint: "提交 4 字母单词。第一块 +60、第二块 +20（各独立 +20）。",
  },
  {
    scenarioIndex: 18,
    treasureId: "60",
    name: "火车",
    emoji: "🚂",
    trigger: "submit",
    seedFirstCopyBank: (b) => {
      b.multAdd = 20;
    },
    triggerHint: "成功提交单词。第一块 +15、第二块 +25（初始 +30，各独立 -5）。",
  },
  {
    scenarioIndex: 19,
    treasureId: "61",
    name: "星空",
    emoji: "🌌",
    trigger: "submit",
    seedFirstCopyBank: (b) => {
      b.multAdd = 8;
    },
    triggerHint: "连续同长度提交触发 streak。两块倍率各自独立 +4。",
  },
  {
    scenarioIndex: 20,
    treasureId: "62",
    name: "磁铁",
    emoji: "🧲",
    trigger: "submit",
    seedFirstCopyBank: (b) => {
      b.multMul = 1.5;
    },
    triggerHint: "提交含重复字母单词。第一块 x1.5、第二块 x2（初始 x2）；各自独立衰减。",
  },
  {
    scenarioIndex: 21,
    treasureId: "66",
    name: "信封",
    emoji: "📨",
    trigger: "submit",
    seedFirstCopyBank: (b) => {
      b.multMul = 1.4;
    },
    triggerHint: "连续拼词 streak。第一块 x1.4、第二块 x1；各独立 +0.2。",
  },
  {
    scenarioIndex: 22,
    treasureId: "78",
    name: "雪人",
    emoji: "⛄",
    trigger: "submit",
    seedFirstCopyBank: (b) => {
      b.multMul = 1.3;
    },
    triggerHint: "详情分别显示各自倍率；提交时读取对应槽位 bank。",
  },
  {
    scenarioIndex: 23,
    treasureId: "80",
    name: "泡泡",
    emoji: "🫧",
    trigger: "submit",
    seedFirstCopyBank: (b) => {
      b.scoreAdd = 15;
    },
    triggerHint: "详情/计分读取各自 scoreAdd bank。",
  },
  {
    scenarioIndex: 24,
    treasureId: "86",
    name: "雷管",
    emoji: "🧨",
    trigger: "levelEnter",
    auxTreasureIds: ["40"],
    seedFirstCopyBank: (b) => {
      b.multMul = 1.5;
    },
    triggerHint: "进关时摧毁辅助「书」×1。两块雷管倍率独立：第一块 x1.5→x2，第二块 x1→x1.5。",
  },
  {
    scenarioIndex: 25,
    treasureId: "143",
    name: "海浪",
    emoji: "🌊",
    trigger: "global",
    seedFirstCopyBank: () => {},
    autoDeckAddOne: true,
    triggerHint:
      "全局银行：两块详情应相同。已加 1 张牌；全局 scoreAdd 应 +3（非按槽位翻倍）。",
  },
  {
    scenarioIndex: 26,
    treasureId: "99",
    name: "滑板",
    emoji: "🛹",
    trigger: "levelComplete",
    seedFirstCopyBank: (b) => {
      b.multMul = 1.75;
    },
    triggerHint: "关末重置倍率。进关前第一块 x1.75、第二块 x1.5；过关后均回到 x1。",
  },
  {
    scenarioIndex: 27,
    treasureId: "118",
    name: "寻呼机",
    emoji: "📟",
    trigger: "submit",
    triggerHint:
      "提交顶行 cat。仅第一块寻呼机弹出翻译测验；第二块沿用同一选择，各独立结算倍率。",
  },
]);

/** @type {ReadonlyMap<number, PerSlotBankDevScenario>} */
const BY_INDEX = new Map(SCENARIOS.map((s) => [s.scenarioIndex, s]));

/**
 * @param {unknown} n
 * @returns {PerSlotBankDevScenario | null}
 */
export function resolvePerSlotBankDevScenario(n) {
  const ix = Math.floor(Number(n));
  if (!Number.isFinite(ix) || ix < 1) return null;
  return BY_INDEX.get(ix) ?? null;
}

/** @returns {readonly PerSlotBankDevScenario[]} */
export function listPerSlotBankDevScenarios() {
  return SCENARIOS;
}

/** @returns {string[]} */
export function formatPerSlotBankDevScenarioHelpLines() {
  return SCENARIOS.map(
    (s) =>
      `  ${s.scenarioIndex}. ${s.emoji} ${s.name}(${s.treasureId}) — ${s.triggerHint.split("。")[0]}。`,
  );
}

/**
 * @param {PerSlotBankDevScenario} scenario
 * @param {Parameters<typeof grantDevOwnedTreasureById>[1]} grantDeps
 * @param {import('../treasures/treasureRunState.js').TreasureRunState | null | undefined} runState
 */
export function applyPerSlotBankDevOwnedTreasures(scenario, grantDeps, runState) {
  grantDeps.setOwnedTreasures([]);

  /** @type {{ slotIndex: number, treasureId: string, copyIndex: number }[]} */
  const targetGrants = [];

  for (const auxId of scenario.auxTreasureIds ?? []) {
    grantDevOwnedTreasureById(auxId, grantDeps);
  }

  for (let copy = 0; copy < 2; copy += 1) {
    const result = grantDevOwnedTreasureById(scenario.treasureId, grantDeps);
    if (result.ok) targetGrants.push({ slotIndex: result.slotIndex, treasureId: scenario.treasureId, copyIndex: copy });
  }

  const slots = grantDeps.getOwnedTreasures();
  for (const { slotIndex, copyIndex } of targetGrants) {
    const slot = slots[slotIndex];
    if (!slot || typeof slot !== "object") continue;
    if (isGlobalTreasureBank(scenario.treasureId)) continue;
    const bank = ensureOwnedSlotBank(slot);
    if (copyIndex === 0 && scenario.seedFirstCopyBank) {
      scenario.seedFirstCopyBank(bank);
    }
  }

  if (isGlobalTreasureBank(scenario.treasureId) && runState && scenario.scenarioIndex === 25) {
    const globalBank = ensureGlobalTreasureBank(runState, scenario.treasureId);
    globalBank.scoreAdd = 50;
  }

  return {
    targetCount: targetGrants.length,
    slotIndices: targetGrants.map((g) => g.slotIndex),
  };
}

/**
 * @param {PerSlotBankDevScenario} scenario
 * @param {object} deps
 */
export async function applyPerSlotBankDevScenarioState(scenario, deps) {
  if (scenario.trigger === "submit" && deps.getGrid) {
    applyWordToGridTopRow(deps.getGrid(), deps.ROWS, deps.COLS, "cat");
    deps.touchGrid?.();
  }

  if (scenario.autoDeckAddOne && deps.appendShopDeckEntriesAndNotify) {
    deps.appendShopDeckEntriesAndNotify([{ raw: "a" }]);
  }

  switch (scenario.trigger) {
    case "shopReroll": {
      if (deps.refs?.money) deps.refs.money.value = 99;
      deps.refs.shopOverlayLayersSuppressed.value = false;
      deps.refs.packPickSession.value = null;
      deps.refs.showShop.value = true;
      await deps.nextTick();
      deps.onShopVisitEnter?.();
      break;
    }
    case "packSkip": {
      deps.refs.shopOverlayLayersSuppressed.value = false;
      deps.refs.packPickOverlaySuppressed.value = false;
      deps.refs.showShop.value = false;
      deps.refs.packPickSession.value = buildPromoSuperPackPickSession(
        () => deps.nextOfferInstanceId.value++,
        deps.runRandom,
      );
      await deps.nextTick();
      break;
    }
    default:
      break;
  }
}
