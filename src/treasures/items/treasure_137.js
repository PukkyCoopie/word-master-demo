import { describe } from "../treasureDescription.js";
import {
  assignOwnedSlotTreasureBank,
  canMutateTreasureBankFromCtx,
  getScoreAddBank,
  wobbleTreasureHookContributor,
} from "../treasureBankHelpers.js";
import { normalizeScore, parseScore, scoreExcess, scoreIsPositive } from "../../utils/scoreInteger.js";
import { formatIntegerScoreForDisplay } from "../../utils/scoreNumericFormat.js";

const ID = "137";

/** @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx */
function buildBatteryDescription(ctx) {
  const stored = getScoreAddBank(ctx.treasureRun, ID, ctx);
  if (!scoreIsPositive(stored)) {
    return describe(
      "当你以超额得分完成关卡时，会储存超过部分的一半，并在下次计分时提供",
    );
  }
  return describe(
    "当你以超额得分完成关卡时，会储存超过部分的一半，并在下次计分时提供",
    `（已储存：${formatIntegerScoreForDisplay(stored)}）`,
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
    // 勿 Number(巨大 bigint)：会变成 Infinity，后续 BigInt(Infinity) 在提交计分时抛错
    const stored = normalizeScore(parseScore(excess) / 2n);
    assignOwnedSlotTreasureBank(ctx, ID, { scoreAdd: stored });
    rs.level137BonusApplied = false;
    if (scoreIsPositive(stored)) {
      return wobbleTreasureHookContributor(ctx, ID);
    }
  },
  buildFinalScoreStep(ctx) {
    const rs = ctx.treasureRun;
    if (!rs || rs.level137BonusApplied) return null;
    const stored = normalizeScore(parseScore(getScoreAddBank(rs, ID, ctx)));
    if (!scoreIsPositive(stored)) return null;
    if (canMutateTreasureBankFromCtx(ctx, ID)) {
      rs.level137BonusApplied = true;
      assignOwnedSlotTreasureBank(ctx, ID, { scoreAdd: 0 });
    }
    return { finalScoreAdd: stored };
  },
};
