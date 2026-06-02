import { ref, shallowRef } from "vue";

/** @typedef {import('../achievements/achievementTypes.js').AchievementDefinition} AchievementDefinition */

/**
 * @returns {{
 *   active: import('vue').ShallowRef<AchievementDefinition | null>,
 *   playing: import('vue').Ref<boolean>,
 *   enqueue: (defs: AchievementDefinition[]) => void,
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

  return { active, playing, enqueue, notifyItemDone };
}
