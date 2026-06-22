import test from "node:test";
import assert from "node:assert/strict";
import {
  computeDragEdgeScrollSpeed,
  DRAG_EDGE_SCROLL_MAX_PX,
  DRAG_EDGE_SCROLL_MIN_PX,
  DRAG_EDGE_ZONE_RATIO,
} from "./dragEdgeAutoScroll.js";

test("computeDragEdgeScrollSpeed returns 0 in middle band", () => {
  const rect = { top: 100, bottom: 300, height: 200, left: 0, right: 100 };
  const midY = 100 + rect.height * 0.5;
  assert.equal(computeDragEdgeScrollSpeed(midY, rect), 0);
});

test("computeDragEdgeScrollSpeed ramps up toward top edge", () => {
  const rect = { top: 0, bottom: 100, height: 100, left: 0, right: 100 };
  const innerTop = rect.top + rect.height * DRAG_EDGE_ZONE_RATIO;
  const atInner = computeDragEdgeScrollSpeed(innerTop, rect);
  const justInside = computeDragEdgeScrollSpeed(innerTop - 1, rect);
  const atOuter = computeDragEdgeScrollSpeed(rect.top, rect);
  assert.equal(atInner, 0);
  assert.ok(justInside < 0);
  assert.ok(Math.abs(justInside) >= DRAG_EDGE_SCROLL_MIN_PX);
  assert.ok(Math.abs(atOuter) > Math.abs(justInside));
  assert.ok(Math.abs(atOuter) <= DRAG_EDGE_SCROLL_MAX_PX);
});

test("computeDragEdgeScrollSpeed ramps up toward bottom edge", () => {
  const rect = { top: 0, bottom: 100, height: 100, left: 0, right: 100 };
  const innerBottom = rect.bottom - rect.height * DRAG_EDGE_ZONE_RATIO;
  const atInner = computeDragEdgeScrollSpeed(innerBottom, rect);
  const justInside = computeDragEdgeScrollSpeed(innerBottom + 1, rect);
  const atOuter = computeDragEdgeScrollSpeed(rect.bottom, rect);
  assert.equal(atInner, 0);
  assert.ok(justInside > 0);
  assert.ok(justInside >= DRAG_EDGE_SCROLL_MIN_PX);
  assert.ok(atOuter > justInside);
  assert.ok(atOuter <= DRAG_EDGE_SCROLL_MAX_PX);
});
