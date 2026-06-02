import { ref, shallowRef } from "vue";

/** @typedef {import('../achievements/achievementTypes.js').AchievementDefinition} AchievementDefinition */

/**
 * @returns {{
 *   active: import('vue').ShallowRef<AchievementDefinition | null>,
 *   playing: import('vue').Ref<boolean>,
 *   enqueue: (defs: AchievementDefinition[]) => void,
 *   previewRandom: (defs: readonly AchievementDefinition[], rng?: () => number) => AchievementDefinition | null,
 *   notifyItemDone: () => void,
 * }}
 */
export function createAchievementToastQueue() {
  /** @type {import('vue').ShallowRef<AchievementDefinition | null>} */
  const active = shallowRef(null);
  const playing = ref(false);
  /** @type {AchievementDefinition[]} */
  const pending = [];
  let processing = false;
  /** @type {(() => void) | null} */
  let resolveItem = null;

  /** @param {AchievementDefinition[]} defs */
  function enqueue(defs) {
    if (!defs?.length) return;
    for (const d of defs) pending.push(d);
    void drain();
  }

  async function drain() {
    if (processing) return;
    processing = true;
    while (pending.length) {
      const def = pending.shift();
      if (!def) continue;
      active.value = def;
      playing.value = true;
      await new Promise((resolve) => {
        resolveItem = resolve;
      });
      playing.value = false;
      active.value = null;
    }
    processing = false;
  }

  function notifyItemDone() {
    resolveItem?.();
    resolveItem = null;
  }

  /**
   * 仅预览 Toast，不写入成就解锁进度。
   * @param {readonly AchievementDefinition[]} defs
   * @param {() => number} [rng]
   */
  function previewRandom(defs, rng = Math.random) {
    if (!defs?.length) return null;
    const def = defs[Math.floor(rng() * defs.length)];
    enqueue([def]);
    return def;
  }

  return { active, playing, enqueue, previewRandom, notifyItemDone };
}
