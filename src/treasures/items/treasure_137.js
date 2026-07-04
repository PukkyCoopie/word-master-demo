import { describe } from "../treasureDescription.js";
import { canMutateTreasureBankFromCtx, getScoreAddBank, wobbleTreasureHookContributor } from "../treasureBankHelpers.js";
import { ensureTreasureBank } from "../treasureRunState.js";
import { parseScore, scoreExcess } from "../../utils/scoreInteger.js";

const ID = "137";

/** @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx */
function buildBatteryDescription(ctx) {
  const stored = Math.max(0, Math.floor(getScoreAddBank(ctx.treasureRun, ID)));
  if (stored <= 0) {
    return describe(
      "当你以超额得分完成关卡时，会储存超过部分的一半，并在下次计分时提供",
    );
  }
  return describe(
    "当你以超额得分完成关卡时，会储存超过部分的一半，并在下次计分时提供",
    `（已储存：${stored}）`,
  );
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe(
    "当你以超额得分完成关卡时，会储存超过部分的一半，并在下次计分时提供",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription: buildBatteryDescription,
  onLevelComplete(ctx) {
    if (!canMutateTreasureBankFromCtx(ctx, ID)) return;
    const rs = ctx.treasureRun;
    if (!rs) return;
    const excess = scoreExcess(ctx.currentScore, ctx.targetScore);
    const stored = Number(parseScore(excess) / 2n);
    ensureTreasureBank(rs, ID).scoreAdd = stored;
    rs.level137BonusApplied = false;
    if (stored > 0) {
      return wobbleTreasureHookContributor(ctx, ID);
    }
  },
  buildFinalScoreStep(ctx) {
    const rs = ctx.treasureRun;
    if (!rs || rs.level137BonusApplied) return null;
    const stored = Math.max(0, Math.floor(getScoreAddBank(rs, ID)));
    if (stored <= 0) return null;
    if (canMutateTreasureBankFromCtx(ctx, ID)) {
      rs.level137BonusApplied = true;
      ensureTreasureBank(rs, ID).scoreAdd = 0;
    }
    return { finalScoreAdd: stored };
  },
};
