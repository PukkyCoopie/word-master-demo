import gsap from "gsap";
import { shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";

/** @typedef {{ key: string, x: number, y: number, width: number, height: number, rx: number }} TutorialHole */

const HOLE_TWEEN_DURATION = 0.35;
const HOLE_EASE = "expo.inOut";
const HOLE_EPSILON = 0.5;

/**
 * @param {TutorialHole} hole
 * @returns {TutorialHole}
 */
function cloneHole(hole) {
  return {
    key: hole.key,
    x: hole.x,
    y: hole.y,
    width: hole.width,
    height: hole.height,
    rx: hole.rx,
  };
}

/**
 * @param {TutorialHole} hole
 * @returns {{ cx: number, cy: number }}
 */
function holeCenter(hole) {
  return {
    cx: hole.x + hole.width / 2,
    cy: hole.y + hole.height / 2,
  };
}

/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} width
 * @param {number} height
 * @param {number} rx
 * @returns {Pick<TutorialHole, "x" | "y" | "width" | "height" | "rx">}
 */
function holeFromCenterSize(cx, cy, width, height, rx) {
  return {
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
    rx,
  };
}

/**
 * @param {TutorialHole} target
 * @returns {Pick<TutorialHole, "x" | "y" | "width" | "height" | "rx">}
 */
function collapsedHoleAtCenter(target) {
  const { cx, cy } = holeCenter(target);
  return holeFromCenterSize(cx, cy, 0, 0, 0);
}

/**
 * @param {TutorialHole} a
 * @param {TutorialHole} b
 * @returns {boolean}
 */
function holesNearlyEqual(a, b) {
  return (
    Math.abs(a.x - b.x) < HOLE_EPSILON &&
    Math.abs(a.y - b.y) < HOLE_EPSILON &&
    Math.abs(a.width - b.width) < HOLE_EPSILON &&
    Math.abs(a.height - b.height) < HOLE_EPSILON &&
    Math.abs(a.rx - b.rx) < HOLE_EPSILON
  );
}

/**
 * @param {import('vue').Ref<TutorialHole[]>} displayHolesRef
 * @returns {{ syncHoles: (targets: TutorialHole[]) => void, snapHoles: (targets: TutorialHole[]) => void, dispose: () => void }}
 */
export function createTutorialHoleAnimator(displayHolesRef) {
  /** @type {gsap.core.Tween[]} */
  const activeTweens = [];

  function killAllTweens() {
    for (const tw of activeTweens) tw.kill();
    activeTweens.length = 0;
  }

  /**
   * 单一 eased 进度驱动中心、尺寸与圆角，保证 scale / 位移共用同一条 expo.inOut 曲线。
   * @param {TutorialHole} hole
   * @param {TutorialHole} to
   * @param {TutorialHole} [from]
   * @returns {Promise<void>}
   */
  function tweenHole(hole, to, from) {
    const start = from ? cloneHole(from) : cloneHole(hole);
    const startCenter = holeCenter(start);
    const endCenter = holeCenter(to);
    const proxy = { t: 0 };

    return new Promise((resolve) => {
      const tw = gsap.to(proxy, {
        t: 1,
        duration: HOLE_TWEEN_DURATION,
        ease: HOLE_EASE,
        overwrite: "auto",
        onUpdate: () => {
          const p = proxy.t;
          const width = start.width + (to.width - start.width) * p;
          const height = start.height + (to.height - start.height) * p;
          const rx = start.rx + (to.rx - start.rx) * p;
          const cx = startCenter.cx + (endCenter.cx - startCenter.cx) * p;
          const cy = startCenter.cy + (endCenter.cy - startCenter.cy) * p;
          const next = holeFromCenterSize(cx, cy, width, height, rx);
          hole.x = next.x;
          hole.y = next.y;
          hole.width = next.width;
          hole.height = next.height;
          hole.rx = next.rx;
        },
        onComplete: () => {
          hole.x = to.x;
          hole.y = to.y;
          hole.width = to.width;
          hole.height = to.height;
          hole.rx = to.rx;
          resolve();
        },
      });
      activeTweens.push(tw);
    });
  }

  /**
   * @param {TutorialHole[]} targets
   */
  function snapHoles(targets) {
    killAllTweens();
    displayHolesRef.value = targets.map(cloneHole);
  }

  /**
   * @param {TutorialHole[]} holes
   * @returns {Promise<void>}
   */
  function hideAllHoles(holes) {
    if (holes.length === 0) {
      displayHolesRef.value = [];
      return Promise.resolve();
    }
    return Promise.all(
      holes.map((hole) => tweenHole(hole, { ...hole, ...collapsedHoleAtCenter(hole) })),
    ).then(() => {
      displayHolesRef.value = [];
    });
  }

  /**
   * @param {TutorialHole[]} targets
   * @returns {Promise<void>}
   */
  function showAllHoles(targets) {
    const nextTargets = targets.map(cloneHole);
    displayHolesRef.value = nextTargets.map((target) => ({
      key: target.key,
      ...collapsedHoleAtCenter(target),
    }));
    return Promise.all(
      displayHolesRef.value.map((hole, i) => tweenHole(hole, nextTargets[i])),
    ).then(() => {});
  }

  /**
   * 按 key 增量同步：仅新增洞展开、移除洞收起，已有 key 原位更新，互不影响。
   * @param {TutorialHole[]} targets
   */
  function syncHoles(targets) {
    if (shouldSkipDecorativeMotion()) {
      snapHoles(targets);
      return;
    }

    const current = displayHolesRef.value;
    const nextTargets = targets.map(cloneHole);

    if (nextTargets.length === 0) {
      if (current.length === 0) return;
      void hideAllHoles([...current]);
      return;
    }

    if (current.length === 0) {
      void showAllHoles(nextTargets);
      return;
    }

    const nextKeySet = new Set(nextTargets.map((t) => t.key));
    /** @type {Promise<void>[]} */
    const jobs = [];

    for (const hole of [...current]) {
      if (nextKeySet.has(hole.key)) continue;
      jobs.push(
        tweenHole(hole, { ...hole, ...collapsedHoleAtCenter(hole) }).then(() => {
          const ix = displayHolesRef.value.indexOf(hole);
          if (ix >= 0) displayHolesRef.value.splice(ix, 1);
        }),
      );
    }

    for (const target of nextTargets) {
      const existing = displayHolesRef.value.find((h) => h.key === target.key);
      if (existing) {
        if (!holesNearlyEqual(existing, target)) {
          jobs.push(tweenHole(existing, target));
        }
        continue;
      }
      const hole = { key: target.key, ...collapsedHoleAtCenter(target) };
      displayHolesRef.value.push(hole);
      jobs.push(tweenHole(hole, target));
    }

    void Promise.all(jobs);
  }

  function dispose() {
    killAllTweens();
  }

  return { syncHoles, snapHoles, dispose };
}
