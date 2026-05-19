import { describe } from "../treasureDescription.js";
import { getPosPackProgress } from "../treasureInRunPackProgress.js";
import { tryOpenInRunPackOnPosProgress } from "../treasureInRunPackTriggers.js";

const ID = "81";
const REQUIRED = 3;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("你每拼写3个名词，打开一个宝藏组合包", "（当前0/3）"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription(ctx) {
    const cur = getPosPackProgress(ctx.treasureRun, ID);
    return describe("你每拼写3个名词，打开一个宝藏组合包", `（当前${cur}/${REQUIRED}）`);
  },
  async onSuccessfulWordSubmit(ctx) {
    await tryOpenInRunPackOnPosProgress(ctx, {
      treasureId: ID,
      posKey: "n",
      packKind: "treasure",
      requiredCount: REQUIRED,
    });
  },
};
