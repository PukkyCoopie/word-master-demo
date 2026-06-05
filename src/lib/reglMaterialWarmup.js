/**
 * 应用启动时预创建共享 WebGL 上下文并编译全部材质 shader，避免首次附着时卡顿。
 */
import { warmupSharedReglMaterialHub } from "./reglMaterialHub.js";

export function warmupAllReglMaterialHubs() {
  try {
    warmupSharedReglMaterialHub();
  } catch (e) {
    console.error("[reglMaterialWarmup]", e);
  }
}
