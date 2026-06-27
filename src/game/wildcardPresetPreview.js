import { offerFlyOriginRectFromEl } from "./offerFlyOrigin.js";

/** 预设简介 / 开局弹窗中万能块详情预览 payload */
export const WILDCARD_PRESET_TILE_DETAIL_PAYLOAD = Object.freeze({
  letter: "?",
  rarity: "common",
  materialId: "wildcard",
  accessoryId: null,
  treasureAccessoryId: null,
  tileScoreBonus: 0,
  tileMultBonus: 0,
  hideRarityGem: true,
});

/**
 * @param {MouseEvent | { currentTarget?: EventTarget | null } | null | undefined} event
 * @returns {{ left: number, top: number, width: number, height: number } | null}
 */
export function wildcardPresetPreviewOriginRectFromEvent(event) {
  const el = event?.currentTarget;
  return offerFlyOriginRectFromEl(el instanceof HTMLElement ? el : null);
}
