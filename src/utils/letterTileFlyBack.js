/**
 * 飞回动画用 DOM（append 到 body，无法挂载 Vue）。
 * 内部结构与 LetterTile（宝石 + 字母）一致，样式依赖全局 game.css 中的 .fly-letter-back。
 * 黄金 / 不锈钢：attachGoldRegl / attachSteelRegl（全局单 regl 离屏 + 本节点 2D canvas 贴图）；飞回用 fixedCssWidth/Height 指定 CSS 尺寸。
 * 配饰等与 Vue 一致的 imperative 子树见 `appendImperativeTileChrome`（`tileImperativeChrome.js`）。
 * 动画结束须调用 disposeFlyBackTileElement。
 */
import { attachFireRegl } from "../lib/fireReglMount.js";
import { attachGoldRegl } from "../lib/goldReglMount.js";
import { attachIceRegl } from "../lib/iceReglMount.js";
import { attachLuckyRegl } from "../lib/luckyReglMount.js";
import { attachSteelRegl } from "../lib/steelReglMount.js";
import { attachWildcardRegl } from "../lib/wildcardReglMount.js";
import { attachWaterRegl } from "../lib/waterReglMount.js";
import { appendImperativeTileChrome } from "./tileImperativeChrome.js";

const flyMaterialReglDisposeByEl = new WeakMap();

function pushDispose(el, disposeFn) {
  if (typeof disposeFn !== "function") return;
  const prev = flyMaterialReglDisposeByEl.get(el);
  if (typeof prev === "function") {
    flyMaterialReglDisposeByEl.set(el, () => {
      try {
        prev();
      } catch {
        // no-op
      }
      try {
        disposeFn();
      } catch {
        // no-op
      }
    });
  } else {
    flyMaterialReglDisposeByEl.set(el, disposeFn);
  }
}

export function createFlyBackTileElement(item) {
  const el = document.createElement("div");
  let cls = "fly-letter fly-letter-back" + (item.letter === "Qu" ? " letter-qu" : "");
  if (item.materialId === "gold") cls += " tile-material-gold";
  if (item.materialId === "steel") cls += " tile-material-steel";
  if (item.materialId === "ice") cls += " tile-material-ice";
  if (item.materialId === "water") cls += " tile-material-water";
  if (item.materialId === "fire") cls += " tile-material-fire";
  if (item.materialId === "wildcard") cls += " tile-material-wildcard";
  if (item.materialId === "lucky") cls += " tile-material-lucky";
  if (item.bossTileDebuffed === true) cls += " letter-tile-boss-debuff";
  el.className = cls;
  const r = item.fromRect;
  const scale = item.startSlotScale ?? 1;
  el.style.left = `${r.left}px`;
  el.style.top = `${r.top}px`;
  el.style.width = `${r.width}px`;
  el.style.height = `${r.height}px`;
  el.style.setProperty("--slot-scale", String(scale));

  const tr = item.toRect;
  const cw = tr && tr.width > 0 ? tr.width : r.width;
  const ch = tr && tr.height > 0 ? tr.height : r.height;
  const reglOpts = { fixedCssWidth: cw, fixedCssHeight: ch };

  if (
    item.materialId === "gold" ||
    item.materialId === "steel" ||
    item.materialId === "ice" ||
    item.materialId === "water" ||
    item.materialId === "fire" ||
    item.materialId === "wildcard" ||
    item.materialId === "lucky"
  ) {
    const canvas = document.createElement("canvas");
    canvas.className = `tile-material-${item.materialId}-canvas`;
    canvas.setAttribute("aria-hidden", "true");
    el.appendChild(canvas);
    const attach =
      item.materialId === "gold"
        ? attachGoldRegl
        : item.materialId === "steel"
          ? attachSteelRegl
          : item.materialId === "ice"
            ? attachIceRegl
            : item.materialId === "water"
              ? attachWaterRegl
              : item.materialId === "fire"
                ? attachFireRegl
                : item.materialId === "wildcard"
                  ? attachWildcardRegl
                  : attachLuckyRegl;
    pushDispose(el, attach(canvas, reglOpts));
  }

  if (item.bossTileDebuffed === true) {
    const bossX = document.createElement("span");
    bossX.className = "letter-tile-boss-x";
    bossX.setAttribute("aria-hidden", "true");
    bossX.textContent = "×";
    el.appendChild(bossX);
  }

  const gem = document.createElement("span");
  gem.className = `letter-gem gem-${item.rarity}`;
  gem.setAttribute("aria-hidden", "true");
  el.appendChild(gem);
  const char = document.createElement("span");
  char.className = "letter-tile-char";
  char.textContent = item.letter;
  el.appendChild(char);
  appendImperativeTileChrome(el, item);
  return el;
}

/** 在移除飞回节点前调用，避免 regl / rAF 泄漏 */
export function disposeFlyBackTileElement(el) {
  if (!el) return;
  const d = flyMaterialReglDisposeByEl.get(el);
  if (typeof d === "function") {
    d();
    flyMaterialReglDisposeByEl.delete(el);
  }
}
