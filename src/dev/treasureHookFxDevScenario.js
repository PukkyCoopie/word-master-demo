import { syncTileStateToDeckCard } from "../game/deckCardSync.js";
import { initTreasureBankOnAcquire } from "../treasures/treasureAcquireInit.js";
import { buildPromoSuperPackPickSession } from "./screenshotPresetScenario.js";

export const TREASURE_HOOK_FX_DEV_QUERY = "treasureHookFx";
export const TREASURE_HOOK_FX_DEV_COPY_COUNT = 2;

/** @typedef {'playing' | 'shop' | 'packSkip' | 'levelComplete'} TreasureHookFxDevPhase */

/**
 * @typedef {Object} TreasureHookFxDevScenario
 * @property {string} id
 * @property {string} name
 * @property {string} emoji
 * @property {TreasureHookFxDevPhase} phase
 * @property {string} triggerHint
 * @property {string} [gridWord]
 * @property {number} [remainingWords]
 * @property {number} [money]
 * @property {number} [highTargetScore]
 * @property {boolean} [resetLevelDiscardFlag]
 */

/** @type {readonly string[]} */
export const TREASURE_HOOK_FX_DEV_SCENARIO_ORDER = Object.freeze([
  "24",
  "39",
  "50",
  "53",
  "59",
  "67",
  "94",
  "104",
  "111",
  "118",
]);

/** @type {Record<string, TreasureHookFxDevScenario>} */
export const TREASURE_HOOK_FX_DEV_SCENARIOS = Object.freeze({
  "24": {
    id: "24",
    name: "小票",
    emoji: "🧾",
    phase: "shop",
    money: 99,
    triggerHint: "已进入商店；每个小票槽应各播一次「免费刷新」气泡（共 2 次，互不连带）。",
  },
  "39": {
    id: "39",
    name: "飞机",
    emoji: "🛫",
    phase: "playing",
    gridWord: "run",
    triggerHint:
      "棋盘首行已摆 run（非名词）；多次提交触发 1/4 升级时，每次应只 wobble/气泡对应槽位。",
  },
  "50": {
    id: "50",
    name: "天平",
    emoji: "⚖️",
    phase: "playing",
    gridWord: "cat",
    triggerHint: "提交 cat 后每个天平槽各 +2 一次；再弃字测每个槽各 -2 一次。",
  },
  "53": {
    id: "53",
    name: "自行车",
    emoji: "🚲",
    phase: "packSkip",
    triggerHint: "已打开字母包；点「跳过」，每个自行车槽应各 +8 倍率动画一次。",
  },
  "59": {
    id: "59",
    name: "摩天轮",
    emoji: "🎡",
    phase: "shop",
    money: 99,
    triggerHint: "已在商店；点「刷新」，每个摩天轮槽应各 +3 倍率动画一次。",
  },
  "67": {
    id: "67",
    name: "金牌",
    emoji: "🥇",
    phase: "playing",
    gridWord: "cat",
    remainingWords: 1,
    highTargetScore: 999999,
    triggerHint: "剩余拼写 1 次；提交 cat（未达目标分）后，仅最左金牌自毁并 +3 拼写（多持只耗 1 枚）。",
  },
  "94": {
    id: "94",
    name: "阳光",
    emoji: "🔆",
    phase: "levelComplete",
    triggerHint: "已自动触发过关 hook；每个阳光槽应各 wobble 一次（共 2 次）。",
  },
  "104": {
    id: "104",
    name: "镜子",
    emoji: "🪞",
    phase: "levelComplete",
    triggerHint: "已自动触发过关 hook；每个镜子槽应各播一次进度气泡（如 1/2）。",
  },
  "111": {
    id: "111",
    name: "日历",
    emoji: "📆",
    phase: "playing",
    gridWord: "cat",
    resetLevelDiscardFlag: true,
    triggerHint: "选中首行 cat 整词丢弃；各日历槽依次 wobble「升级」，再合并播放批量长度升级。",
  },
  "118": {
    id: "118",
    name: "寻呼机",
    emoji: "📟",
    phase: "playing",
    gridWord: "cat",
    triggerHint: "拼出 cat 后点释义按钮；每个寻呼机槽应各播「不行哦」一次。",
  },
});

/**
 * @param {unknown} treasureId
 * @returns {TreasureHookFxDevScenario | null}
 */
export function resolveTreasureHookFxDevScenario(treasureId) {
  const id = String(treasureId ?? "").trim();
  if (!id) return null;
  return TREASURE_HOOK_FX_DEV_SCENARIOS[id] ?? null;
}

/** @returns {TreasureHookFxDevScenario[]} */
export function listTreasureHookFxDevScenarios() {
  return TREASURE_HOOK_FX_DEV_SCENARIO_ORDER.map((id) => TREASURE_HOOK_FX_DEV_SCENARIOS[id]).filter(
    Boolean,
  );
}

export function formatTreasureHookFxDevScenarioHelpLines() {
  return listTreasureHookFxDevScenarios().map(
    (s) => `  ${s.id} — ${s.emoji} ${s.name}：${s.triggerHint}`,
  );
}

/**
 * @param {() => number} [rng]
 */
export function isTreasureHookFxDevScenario(rng) {
  void rng;
  if (!import.meta.env.DEV) return false;
  const q = new URLSearchParams(globalThis.location?.search ?? "").get("dev");
  if (q === TREASURE_HOOK_FX_DEV_QUERY) return true;
  const id = q?.startsWith(`${TREASURE_HOOK_FX_DEV_QUERY}=`)
    ? q.slice(TREASURE_HOOK_FX_DEV_QUERY.length + 1)
    : q?.startsWith(`${TREASURE_HOOK_FX_DEV_QUERY}:`)
      ? q.slice(TREASURE_HOOK_FX_DEV_QUERY.length + 1)
      : null;
  return id != null && Boolean(TREASURE_HOOK_FX_DEV_SCENARIOS[id]);
}

/**
 * URL `?dev=treasureHookFx=59` 或 `?dev=treasureHookFx:59` 指定宝藏。
 */
export function resolveTreasureHookFxDevScenarioFromQuery() {
  if (!import.meta.env.DEV) return null;
  const q = new URLSearchParams(globalThis.location?.search ?? "").get("dev") ?? "";
  if (q === TREASURE_HOOK_FX_DEV_QUERY) return TREASURE_HOOK_FX_DEV_SCENARIO_ORDER[0] ?? null;
  const prefixes = [`${TREASURE_HOOK_FX_DEV_QUERY}=`, `${TREASURE_HOOK_FX_DEV_QUERY}:`];
  for (const prefix of prefixes) {
    if (q.startsWith(prefix)) {
      const id = q.slice(prefix.length).trim();
      return TREASURE_HOOK_FX_DEV_SCENARIOS[id] ? id : null;
    }
  }
  return null;
}

/**
 * @param {import('vue').Ref<(object | null)[]>} ownedTreasuresRef
 * @param {(input: Record<string, unknown>) => object} buildOwnedTreasureSlot
 * @param {string} treasureId
 * @param {import('vue').Ref<object> | null | undefined} treasureRunStateRef
 * @param {number} [copyCount]
 */
export function applyTreasureHookFxDevOwnedTreasures(
  ownedTreasuresRef,
  buildOwnedTreasureSlot,
  treasureId,
  treasureRunStateRef,
  copyCount = TREASURE_HOOK_FX_DEV_COPY_COUNT,
) {
  const n = Math.max(1, Math.floor(Number(copyCount) || TREASURE_HOOK_FX_DEV_COPY_COUNT));
  ownedTreasuresRef.value = Array.from({ length: n }, () => buildOwnedTreasureSlot({ treasureId }));
  if (treasureRunStateRef?.value) {
    initTreasureBankOnAcquire(treasureId, treasureRunStateRef.value);
  }
}

/**
 * @param {object[][] | null | undefined} grid
 * @param {number} rows
 * @param {number} cols
 * @param {string} word
 */
export function applyWordToGridTopRow(grid, rows, cols, word) {
  const letters = String(word ?? "")
    .toLowerCase()
    .split("")
    .filter(Boolean);
  const row = 0;
  for (let c = 0; c < Math.min(letters.length, cols); c += 1) {
    const tile = grid?.[row]?.[c];
    if (!tile?.letter) continue;
    tile.letter = letters[c];
    const card = tile._deckCard;
    if (card && typeof card === "object") {
      card.raw = letters[c];
      delete card.vowelDisplayShift;
    }
    syncTileStateToDeckCard(tile);
  }
  void rows;
}

/**
 * @param {TreasureHookFxDevScenario} scenario
 * @param {object} deps
 */
export async function applyTreasureHookFxDevScenarioState(scenario, deps) {
  if (scenario.resetLevelDiscardFlag && deps.treasureRunState?.value) {
    deps.treasureRunState.value.levelFirstFullWordDiscardDone = false;
  }
  if (scenario.gridWord && deps.getGrid) {
    applyWordToGridTopRow(deps.getGrid(), deps.ROWS, deps.COLS, scenario.gridWord);
    deps.touchGrid?.();
  }
  if (typeof scenario.remainingWords === "number" && deps.remainingWords) {
    deps.remainingWords.value = scenario.remainingWords;
  }
  if (typeof scenario.highTargetScore === "number") {
    if (deps.targetScore) {
      deps.targetScore.value = scenario.highTargetScore;
    }
    if (deps.refs?.debugScoreCardTargetOverride) {
      deps.refs.debugScoreCardTargetOverride.value = scenario.highTargetScore;
    }
  }
  if (typeof scenario.money === "number" && deps.refs?.money) {
    deps.refs.money.value = scenario.money;
  }

  switch (scenario.phase) {
    case "shop": {
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
    case "levelComplete": {
      await deps.runTreasureLevelCompleteHooks?.();
      break;
    }
    default:
      break;
  }
}
