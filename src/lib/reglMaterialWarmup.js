/**
 * 应用启动时按当前材质管线预建 WebGL、编译 shader 并各绘 1 帧，
 * 避免首次附着字母块 canvas 时卡顿。
 */
import { getMaterialRenderPipeline, notifyMaterialRenderingCapabilityChanged } from "./reglMaterialPerf.js";
import { markMaterialCssFallbackRequired } from "../platform/webViewCapabilities.js";
import { applyMaterialAnimationCapabilityConstraints } from "../settings/materialAnimationAvailability.js";
import { warmupSharedReglMaterialHub } from "./reglMaterialHub.js";
import { warmupBitmapRendererMaterialHub } from "./reglMaterialBitmapRenderer.js";
import { warmupVideoAtlasMaterialHub } from "./reglMaterialVideoAtlas.js";
import { warmupDirectMaterialShaders } from "./reglDirectMaterialMount.js";

export function warmupAllReglMaterialHubs() {
  try {
    switch (getMaterialRenderPipeline()) {
      case "bitmaprenderer":
        warmupBitmapRendererMaterialHub();
        break;
      case "video_atlas":
        warmupVideoAtlasMaterialHub();
        break;
      case "direct_webgl":
        warmupDirectMaterialShaders();
        break;
      case "blit":
      default:
        warmupSharedReglMaterialHub();
        break;
    }
  } catch (e) {
    markMaterialCssFallbackRequired();
    applyMaterialAnimationCapabilityConstraints();
    notifyMaterialRenderingCapabilityChanged();
    console.error("[reglMaterialWarmup]", e);
  }
}
