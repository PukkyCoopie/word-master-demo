/**
 * 提交计分后：升级配饰 wobble+bubble 按登记顺序依次播放，顶栏升级动效合并为阶梯序列。
 */

/**
 * @param {Record<number, number>} src
 * @returns {Record<number, number>}
 */
function cloneLengthLevels(src) {
  /** @type {Record<number, number>} */
  const out = {};
  if (!src || typeof src !== "object") return out;
  for (const [k, v] of Object.entries(src)) {
    const len = Math.round(Number(k));
    if (len >= 3 && len <= 16) out[len] = Math.max(1, Math.round(Number(v)) || 1);
  }
  return out;
}

/**
 * @param {Record<string, number>} src
 * @returns {Record<string, number>}
 */
function cloneRarityLevels(src) {
  /** @type {Record<string, number>} */
  const out = {};
  if (!src || typeof src !== "object") return out;
  for (const [k, v] of Object.entries(src)) {
    out[String(k)] = Math.max(1, Math.round(Number(v)) || 1);
  }
  return out;
}

/**
 * @param {{ apply?: () => void, payload: object }} step
 * @param {Record<number, number>} virtualLengthLevels
 * @param {Record<string, number>} virtualRarityLevels
 * @returns {{ apply?: () => void, payload: object }}
 */
function normalizeStepWithVirtualLevels(step, virtualLengthLevels, virtualRarityLevels) {
  const p = step?.payload;
  if (!p || typeof p !== "object") return step;

  if (p.upgradeKind === "rarity") {
    const rk = String(p.rarityKey ?? "common");
    const beforeLevel = Math.max(1, Math.round(Number(virtualRarityLevels[rk])) || 1);
    virtualRarityLevels[rk] = beforeLevel + 1;
    return {
      apply: step.apply,
      payload: { ...p, rarityKey: rk, beforeLevel },
    };
  }

  const lenMin = Math.max(3, Math.min(16, Math.round(Number(p.lengthMin ?? p.lengthMax) || 3)));
  const lenMax = Math.max(lenMin, Math.min(16, Math.round(Number(p.lengthMax ?? lenMin) || lenMin)));
  if (lenMin === lenMax) {
    const beforeLevel = Math.max(1, Math.round(Number(virtualLengthLevels[lenMin])) || 1);
    virtualLengthLevels[lenMin] = beforeLevel + 1;
    return {
      apply: step.apply,
      payload: { ...p, upgradeKind: "length", lengthMin: lenMin, lengthMax: lenMax, beforeLevel },
    };
  }

  /** @type {Record<number, number>} */
  const beforeLevelsByLen = {};
  for (let len = lenMin; len <= lenMax; len += 1) {
    beforeLevelsByLen[len] = Math.max(1, Math.round(Number(virtualLengthLevels[len])) || 1);
    virtualLengthLevels[len] = beforeLevelsByLen[len] + 1;
  }
  return {
    apply: step.apply,
    payload: { ...p, upgradeKind: "length", lengthMin: lenMin, lengthMax: lenMax, beforeLevelsByLen },
  };
}

/**
 * @param {{
 *   getLengthLevels: () => Record<number, number>,
 *   getRarityLevels: () => Record<string, number>,
 *   runStaircasePlayback: (steps: { apply?: () => void, payload: object }[]) => Promise<void>,
 * }} deps
 */
export function createSubmitAccessoryUpgradeBatch(deps) {
  /** @type {(() => Promise<void>)[]} */
  const cues = [];
  /** @type {{ apply?: () => void, payload: object }[]} */
  const steps = [];
  const virtualLengthLevels = cloneLengthLevels(deps.getLengthLevels());
  const virtualRarityLevels = cloneRarityLevels(deps.getRarityLevels());

  return {
    get hasContent() {
      return cues.length > 0 || steps.length > 0;
    },
    /** @param {() => Promise<void>} fn */
    registerCue(fn) {
      if (typeof fn === "function") cues.push(fn);
    },
    /** @param {{ apply?: () => void, payload: object }} step */
    registerStep(step) {
      if (!step?.payload) return;
      steps.push(normalizeStepWithVirtualLevels(step, virtualLengthLevels, virtualRarityLevels));
    },
    async flush() {
      if (cues.length === 0 && steps.length === 0) return;
      for (const cue of cues) {
        await cue();
      }
      if (steps.length > 0) {
        await deps.runStaircasePlayback(steps);
      }
    },
  };
}
