import { describe } from "./treasureDescription.js";
import { getTreasureDef } from "./treasureRegistry.js";

/** @param {unknown} pre */
function buildPoolPrerequisitePlainText(pre) {
  if (!pre || typeof pre !== "object") return "";
  const type = String(/** @type {{ type?: string }} */ (pre).type ?? "").trim();

  switch (type) {
    case "treasure29SelfDestructed":
      return "在本轮游戏中使一个炸弹爆炸";
    case "playedAllGoldWord":
      return "在本轮游戏中拼写一个全部由黄金块组成的单词";
    case "probabilityEffectTriggered":
      return "在本轮游戏中成功触发一个概率效果";
    default:
      return "";
  }
}

/** @param {unknown} pre */
function buildUnlockPrerequisitePlainText(pre) {
  if (!pre || typeof pre !== "object") return "";
  const type = String(/** @type {{ type?: string }} */ (pre).type ?? "").trim();
  const min = Math.max(0, Math.floor(Number(/** @type {{ min?: number }} */ (pre).min) || 0));

  switch (type) {
    case "deckLegendaryMin":
      return `在牌库中拥有${min || 8}个传说字母`;
    case "levelAllLegendaryDeckExhausted":
      return "在一个关卡中用尽了牌库中所有的传说字母";
    case "runIceMaterialShattered":
      return "在本轮游戏中，使一个碎冰块碎裂";
    case "everTwoTreasuresWithAccessory":
      return "同时拥有2个装备了配饰的宝藏";
    case "deckEpicMin":
      return `在牌库中拥有${min || 16}个史诗字母`;
    case "deckRareHalf":
      return "牌库中一半或以上的字母都是稀有字母";
    case "deckAllCommon":
      return "牌库中所有字母都是普通字母";
    case "deckIceMin":
      return `在牌库中拥有${min || 5}个碎冰块`;
    case "deckRarityKindsMin":
      return `向牌库中添加至少${min || 3}种不同稀有度的字母块`;
    case "deckGoldCoinAccessory":
      return "牌库中有带硬币配饰的黄金块";
    case "endlessMode":
      return "进入无尽模式";
    case "allCommonBossWin":
      return "使用全部由普通稀有度组成的单词击败 Boss";
    case "chapterAllDiscardsExhausted":
      return "在一个大关的每一个小关中都用尽了丢弃次数";
    case "chapterNoNounSpelled":
      return "曾完成一整大关且未拼写过名词";
    case "chapterNoAdjSpelled":
      return "曾完成一整大关且未拼写过形容词";
    case "chapterNoVerbSpelled":
      return "曾完成一整大关且未拼写过动词";
    case "levelAllFiveVowels":
      return "曾在同一小关内用齐 A、E、I、O、U 五种元音";
    case "runSpellsCastMin":
      return `本轮游戏已释放过${min || 5}次法术`;
    case "runUpgradesUsedMin":
      return `本轮游戏已使用过${min || 5}次升级`;
    case "everDiscardedFullWord":
      return "本轮游戏曾弃掉一个完整单词";
    case "discardWordLen7OrSoldBlueprint98":
      return "本轮游戏曾弃掉 7 字母及以上的完整单词，或曾卖出面具";
    case "allOwnedTreasuresHaveAccessory":
      return "已拥有的每个宝藏都装备了配饰";
    case "probabilityEffectTriggered":
      return "成功触发一个概率效果";
    default:
      return "";
  }
}

/**
 * 收藏图鉴预览：宝藏商店出现前提说明。
 * @param {string | null | undefined} treasureId
 * @returns {{ title: string, description: import('./treasureDescription.js').TreasureDescSegment[] } | null}
 */
export function resolveTreasureUnlockPrerequisitePanel(treasureId) {
  const id = String(treasureId ?? "").trim();
  if (!id) return null;
  const def = getTreasureDef(id);
  const unlockPlain = buildUnlockPrerequisitePlainText(def?.unlockPrerequisite);
  const poolPlain = buildPoolPrerequisitePlainText(def?.poolPrerequisite);
  const parts = [unlockPlain, poolPlain].filter(Boolean);
  if (!parts.length) return null;
  return {
    title: "前置条件",
    description: describe(parts.join("；")),
  };
}
