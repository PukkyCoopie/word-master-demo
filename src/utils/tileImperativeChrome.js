/**
 * 无法挂载 LetterTile 时（如飞回 body 上的纯 DOM），在此挂载与 Vue 模板一致的「配饰」子树。
 *
 * 约定：凡创建与棋盘格视觉等价的 imperative 节点（fly-letter-back、将来其他飞行/克隆），
 * 在 append 字母/宝石后调用 `appendImperativeTileChrome(root, item)`，且 `item` 须携带与格上相同的
 * `accessoryId`（以及已有的 materialId 等由各自模块处理）。
 *
 * 新增配饰：在下方 Map 注册 builder + 在 `tileAccessories` 增加 id；LetterTile 模板与此处各维护一份 DOM 结构（类名一致，样式在 game.css）。
 */
import {
  TILE_ACCESSORY_COIN,
  TILE_ACCESSORY_LEVEL_UPGRADE,
  TILE_ACCESSORY_REWIND,
  TILE_ACCESSORY_VIP_DIAMOND,
} from "../game/tileAccessories.js";

/** @type {Map<string, (root: HTMLElement) => void>} */
const ACCESSORY_BUILDERS = new Map([
  [
    TILE_ACCESSORY_LEVEL_UPGRADE,
    (root) => {
      const chip = document.createElement("span");
      chip.className = "tile-accessory-chip tile-accessory-chip--level-upgrade";
      chip.setAttribute("aria-hidden", "true");
      const ripple = document.createElement("span");
      ripple.className = "tile-accessory-chip-ripple";
      ripple.setAttribute("aria-hidden", "true");
      chip.appendChild(ripple);
      const icon = document.createElement("i");
      icon.className = "ri-arrow-up-double-line tile-accessory-chip-icon";
      icon.setAttribute("aria-hidden", "true");
      chip.appendChild(icon);
      root.appendChild(chip);
    },
  ],
  [
    TILE_ACCESSORY_VIP_DIAMOND,
    (root) => {
      const chip = document.createElement("span");
      chip.className = "tile-accessory-chip tile-accessory-chip--vip-diamond";
      chip.setAttribute("aria-hidden", "true");
      const ripple = document.createElement("span");
      ripple.className = "tile-accessory-chip-ripple";
      ripple.setAttribute("aria-hidden", "true");
      chip.appendChild(ripple);
      const icon = document.createElement("i");
      icon.className = "ri-vip-diamond-line tile-accessory-chip-icon";
      icon.setAttribute("aria-hidden", "true");
      chip.appendChild(icon);
      root.appendChild(chip);
    },
  ],
  [
    TILE_ACCESSORY_COIN,
    (root) => {
      const chip = document.createElement("span");
      chip.className = "tile-accessory-chip tile-accessory-chip--coin";
      chip.setAttribute("aria-hidden", "true");
      const ripple = document.createElement("span");
      ripple.className = "tile-accessory-chip-ripple";
      ripple.setAttribute("aria-hidden", "true");
      chip.appendChild(ripple);
      const icon = document.createElement("i");
      icon.className = "ri-copper-coin-line tile-accessory-chip-icon";
      icon.setAttribute("aria-hidden", "true");
      chip.appendChild(icon);
      root.appendChild(chip);
    },
  ],
  [
    TILE_ACCESSORY_REWIND,
    (root) => {
      const chip = document.createElement("span");
      chip.className = "tile-accessory-chip tile-accessory-chip--rewind";
      chip.setAttribute("aria-hidden", "true");
      const ripple = document.createElement("span");
      ripple.className = "tile-accessory-chip-ripple";
      ripple.setAttribute("aria-hidden", "true");
      chip.appendChild(ripple);
      const icon = document.createElement("i");
      icon.className = "ri-rewind-line tile-accessory-chip-icon";
      icon.setAttribute("aria-hidden", "true");
      chip.appendChild(icon);
      root.appendChild(chip);
    },
  ],
]);

/**
 * @param {HTMLElement | null | undefined} rootEl 根节点须 `position: relative`（与 .grid-tile / .fly-letter-back 一致）
 * @param {{ accessoryId?: string | null }} item
 */
export function appendImperativeTileChrome(rootEl, item) {
  if (!rootEl || !item) return;
  const id = item.accessoryId;
  if (id == null || id === "") return;
  const fn = ACCESSORY_BUILDERS.get(id);
  if (typeof fn === "function") fn(rootEl);
}
