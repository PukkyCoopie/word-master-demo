import { nextTick } from "vue";
import gsap from "gsap";
import { animSleep, shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";
import { runTreasureGrantPopAnim } from "./treasureGrantPopAnim.js";

/**
 * 商店购宝 /  pack 入槽：等槽位 DOM 稳定 + 入槽 pop。
 *
 * @param {{
 *   getOwnedTreasureSlotEl: (slotIndex: number) => HTMLElement | null | undefined,
 * }} deps
 */
export function createShopTreasurePurchaseFx(deps) {
  const { getOwnedTreasureSlotEl } = deps;

  /**
   * 裁剪配饰扩槽等场景：等 DOM 挂载且 FLIP 位移稳定后再取槽位（避免飞向 5 槽布局时的旧坐标）。
   * @param {number} slotIndex
   * @param {{ slotsExpanded?: boolean }} [opts]
   * @returns {Promise<HTMLElement | null>}
   */
  async function waitForOwnedTreasureSlotEl(slotIndex, { slotsExpanded = false } = {}) {
    await nextTick();
    if (slotsExpanded && !shouldSkipDecorativeMotion()) {
      await animSleep(260);
    } else {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const el = getOwnedTreasureSlotEl(slotIndex);
      if (!el) {
        await new Promise((r) => requestAnimationFrame(r));
        continue;
      }
      const r0 = el.getBoundingClientRect();
      if (r0.width < 2 || r0.height < 2) {
        await new Promise((r) => requestAnimationFrame(r));
        continue;
      }
      await new Promise((r) => requestAnimationFrame(r));
      const r1 = el.getBoundingClientRect();
      if (
        Math.abs(r0.left - r1.left) < 1 &&
        Math.abs(r0.top - r1.top) < 1 &&
        Math.abs(r0.width - r1.width) < 1 &&
        Math.abs(r0.height - r1.height) < 1
      ) {
        return el;
      }
    }
    return getOwnedTreasureSlotEl(slotIndex);
  }

  /**
   * @param {number} slotIndex
   * @param {{ slotsExpanded?: boolean }} [opts]
   */
  async function playTreasureGrantPopAtSlotIndex(slotIndex, { slotsExpanded = false } = {}) {
    if (typeof slotIndex !== "number" || slotIndex < 0) return;
    const el = await waitForOwnedTreasureSlotEl(slotIndex, { slotsExpanded });
    if (el) {
      await runTreasureGrantPopAnim(el);
      gsap.set(el, { clearProps: "transform" });
    }
  }

  return { waitForOwnedTreasureSlotEl, playTreasureGrantPopAtSlotIndex };
}
