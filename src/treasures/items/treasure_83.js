import { describe, money } from "../treasureDescription.js";
import {
  dictionaryPosMatchesTreasureLevelKey,
  getTreasureLevelPosLabelZh,
  rollTreasureLevelPosKey,
} from "../../game/wordPosMatch.js";

const ID = "83";
const REWARD = 3;

/** @param {import('../treasureRunState.js').TreasureRunState | undefined} rs @param {() => number} rng */
function ensureLevelPosTarget(rs, rng) {
  if (!rs) return;
  if (!rs.levelPosTargetKey) rs.levelPosTargetKey = rollTreasureLevelPosKey(rng);
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("如果拼写的是名词，获得", money("3"), "（词性每关都会变化）"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription(ctx) {
    ensureLevelPosTarget(ctx.treasureRun, ctx.rng ?? Math.random);
    const key = ctx.levelPosTargetKey ?? ctx.treasureRun?.levelPosTargetKey ?? "n";
    const label = getTreasureLevelPosLabelZh(key);
    return describe(`如果拼写的是${label}，获得`, money("3"), "（词性每关都会变化）");
  },
  onLevelEnter(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    ensureLevelPosTarget(rs, ctx.rng ?? Math.random);
  },
  async onLevelComplete(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    const rng = ctx.rng ?? Math.random;
    const had = rs.levelPosTargetKey != null;
    rs.levelPosTargetKey = rollTreasureLevelPosKey(rng);
    if (had) await ctx.wobbleOwnedTreasureById?.(ID);
  },
  async onSuccessfulWordSubmit(ctx) {
    const rs = ctx.treasureRun;
    if (!rs?.levelPosTargetKey) return;
    const word = String(ctx.resolvedWord ?? "").toLowerCase().trim();
    if (!word) return;
    const def = ctx.getWordDefinition?.(word);
    if (!dictionaryPosMatchesTreasureLevelKey(def?.pos, rs.levelPosTargetKey)) return;
    await ctx.playOwnedTreasureMoneyFx?.(ID, REWARD);
  },
};
