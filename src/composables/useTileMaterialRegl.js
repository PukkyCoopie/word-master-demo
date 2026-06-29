import { inject, onMounted, onUnmounted, unref, watch } from "vue";
import { attachMaterialRegl, setMaterialReglAnimated } from "../lib/reglMaterialHub.js";
import { TILE_MATERIAL_REGL_ATTACH_OPTIONS } from "./tileMaterialReglContext.js";

/**
 * 字母块材质 canvas：挂载统一 regl hub，支持 animated=false 时只绘首帧。
 * @param {string} materialId
 * @param {import("vue").Ref<HTMLCanvasElement | null>} canvasRef
 * @param {import("vue").Ref<boolean> | import("vue").ComputedRef<boolean>} animatedRef
 */
export function useTileMaterialRegl(materialId, canvasRef, animatedRef) {
  const attachOptions = inject(TILE_MATERIAL_REGL_ATTACH_OPTIONS, null);
  let dispose = null;

  function resolveAttachOptions() {
    const opts = unref(attachOptions) ?? {};
    return {
      animated: animatedRef.value !== false,
      seedFromPeers: opts.seedFromPeers === true,
    };
  }

  onMounted(() => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    dispose = attachMaterialRegl(materialId, canvas, resolveAttachOptions());
  });

  watch(
    () => animatedRef.value,
    (next) => {
      const canvas = canvasRef.value;
      if (!canvas || !dispose) return;
      setMaterialReglAnimated(materialId, canvas, next !== false);
    },
  );

  onUnmounted(() => {
    dispose?.();
    dispose = null;
  });
}
