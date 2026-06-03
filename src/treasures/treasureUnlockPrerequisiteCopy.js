import { describe } from "./treasureDescription.js";
import { getTreasureDef } from "./treasureRegistry.js";

/** @param {unknown} pre */
function buildUnlockPrerequisitePlainText(pre) {
  if (!pre || typeof pre !== "object") return "";
  const type = String(/** @type {{ type?: string }} */ (pre).type ?? "").trim();
  const min = Math.max(0, Math.floor(Number(/** @type {{ min?: number }} */ (pre).min) || 0));

  switch (type) {
    case "deckLegendaryMin":
      return `在牌库中拥有${min || 8}个传说字母`;
    case "deckEpicMin":
      return `在牌库中拥有${min || 16}个史诗字母`;
    case "deckRareHalf":
      return "牌库中一半或以上的字母都是稀有字母";
    case "deckAllCommon":
      return "牌库中所有字母都是普通字母";
    case "deckIceMin":
      return `在牌库中拥有${min || 5}个碎冰块`;
    case "deckRarityKindsMin":
      return `在牌库中拥有${min || 3}种不同稀有度的字母`;
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
      return "曾在同一小关内用齐 a、e、i、o、u 五种元音";
    case "runSpellsCastMin":
      return `本局已释放法术${min || 5}次`;
    case "runUpgradesUsedMin":
      return `本局已使用升级${min || 5}次`;
    case "everDiscardedFullWord":
      return "本局曾弃掉一个完整单词";
    case "discardWordLen7OrSoldBlueprint98":
      return "本局曾弃掉 7 字母及以上的完整单词，或曾卖出面具";
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
  const pre = def?.unlockPrerequisite;
  const plain = buildUnlockPrerequisitePlainText(pre);
  if (!plain) return null;
  return {
    title: "前置条件",
    description: describe(plain),
  };
}
