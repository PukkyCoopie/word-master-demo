import { createApp, h } from "vue";
import LetterTile from "../components/LetterTile.vue";

/**
 * 在任意容器内挂载一枚完整 LetterTile（材质 Regl、角标、配饰等），用于飞行动画等 imperative 场景。
 * @param {HTMLElement} host
 * @param {Record<string, unknown>} snap `buildSpellOfferSnapshotFromDeckCard` 形态
 * @param {"grid" | "fly" | "deck"} [variant]
 * @returns {() => void} unmount
 */
export function mountLetterTileClone(host, snap, variant = "grid") {
  const props = {
    variant,
    letter: String(snap.letter ?? "E"),
    rarity: String(snap.rarity ?? "common"),
    materialId: snap.materialId != null ? String(snap.materialId) : null,
    accessoryId: snap.accessoryId != null ? String(snap.accessoryId) : null,
    treasureAccessoryId:
      snap.treasureAccessoryId != null ? String(snap.treasureAccessoryId) : null,
    tileScoreBonus: Math.max(0, Math.floor(Number(snap.tileScoreBonus) || 0)),
    tileMultBonus: Math.max(
      0,
      Math.round(Number(snap.letterMultBonus ?? snap.tileMultBonus) || 0),
    ),
  };
  const mountPoint = document.createElement("div");
  mountPoint.className = "letter-tile-mount-host";
  mountPoint.style.cssText = "width:100%;height:100%;position:relative;box-sizing:border-box;";
  host.appendChild(mountPoint);
  const app = createApp({
    render: () => h(LetterTile, props),
  });
  app.mount(mountPoint);
  return () => {
    app.unmount();
    mountPoint.remove();
  };
}
