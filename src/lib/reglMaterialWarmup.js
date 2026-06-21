/**
 * 应用启动时预创建各材质离屏 regl 并编译 shader，避免首次附着时卡顿。
 * 无订阅者时各 mount 不订阅 material ticker，故不会在离屏 canvas 上每帧 draw。
 */
import { warmupGoldReglHub } from "./goldReglMount.js";
import { warmupSteelReglHub } from "./steelReglMount.js";
import { warmupFireReglHub } from "./fireReglMount.js";
import { warmupIceReglHub } from "./iceReglMount.js";
import { warmupWaterReglHub } from "./waterReglMount.js";
import { warmupLuckyReglHub } from "./luckyReglMount.js";
import { warmupWildcardReglHub } from "./wildcardReglMount.js";

const WARMUPS = [
  warmupGoldReglHub,
  warmupSteelReglHub,
  warmupFireReglHub,
  warmupIceReglHub,
  warmupWaterReglHub,
  warmupLuckyReglHub,
  warmupWildcardReglHub,
];

export function warmupAllReglMaterialHubs() {
  for (const fn of WARMUPS) {
    try {
      fn();
    } catch (e) {
      console.error("[reglMaterialWarmup]", e);
    }
  }
}
