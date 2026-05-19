import { describe } from "../treasureDescription.js";
import { getPosPackProgress } from "../treasureInRunPackProgress.js";
import { tryOpenInRunPackOnPosProgress } from "../treasureInRunPackTriggers.js";

const ID = "82";
const REQUIRED = 2;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("你每拼写2个形容词，打开一个法术组合包", "（当前0/2）"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription(ctx) {
    const cur = getPosPackProgress(ctx.treasureRun, ID);
    return describe("你每拼写2个形容词，打开一个法术组合包", `（当前${cur}/${REQUIRED}）`);
  },
  async onSuccessfulWordSubmit(ctx) {
    await tryOpenInRunPackOnPosProgress(ctx, {
      treasureId: ID,
      posKey: "adj",
      packKind: "spell",
      requiredCount: REQUIRED,
    });
  },
};
