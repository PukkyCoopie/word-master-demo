/** 琥珀橡子 Boss：进关翻转并打乱宝藏栏；离关恢复进关前顺序（仅本关生效）。 */

export const AMBER_BOSS_SLUG = "amber_acorn";

/**
 * @typedef {Object} AmberBossTreasureSnapshot
 * @property {readonly (object | null)[]} slots 进关前槽位（浅拷贝引用，恢复时用当前实例）
 * @property {readonly string[]} keys 进关前稳定 key 顺序
 */

/**
 * @param {readonly (object | null)[]} slots
 * @param {readonly string[]} keys
 * @returns {AmberBossTreasureSnapshot}
 */
export function captureAmberBossTreasureSnapshot(slots, keys) {
  const len = Math.max(slots.length, keys.length);
  const snapSlots = [];
  const snapKeys = [];
  for (let i = 0; i < len; i += 1) {
    snapKeys.push(String(keys[i] ?? `g-slot-${i}`));
    const slot = slots[i] ?? null;
    snapSlots.push(slot && typeof slot === "object" ? { ...slot } : null);
  }
  return { slots: snapSlots, keys: snapKeys };
}

/**
 * @param {unknown[]} arr
 * @param {() => number} rng
 */
function shuffleArrayInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

/**
 * 仅对已填充宝藏：整体反转后再 Fisher–Yates 打乱，空槽留在尾部。
 *
 * @param {readonly (object | null)[]} slots
 * @param {readonly string[]} keys
 * @param {() => number} [rng]
 * @returns {{ slots: (object | null)[], keys: string[] }}
 */
export function applyFlipAndShuffleToOwnedTreasures(slots, keys, rng = Math.random) {
  const len = Math.max(slots.length, keys.length);
  /** @type {{ slot: object, key: string }[]} */
  const filled = [];
  for (let i = 0; i < len; i += 1) {
    const slot = slots[i] ?? null;
    if (!slot || typeof slot !== "object") continue;
    filled.push({ slot, key: String(keys[i] ?? `g-slot-${i}`) });
  }
  filled.reverse();
  shuffleArrayInPlace(filled, rng);

  const nextSlots = [];
  const nextKeys = [];
  for (let i = 0; i < len; i += 1) {
    if (i < filled.length) {
      nextSlots.push(filled[i].slot);
      nextKeys.push(filled[i].key);
    } else {
      nextSlots.push(null);
      nextKeys.push(String(keys[i] ?? `g-slot-${i}`));
    }
  }
  return { slots: nextSlots, keys: nextKeys };
}

/**
 * 按进关快照的 key 顺序还原；本关已摧毁的宝藏不再出现。
 *
 * @param {readonly (object | null)[]} currentSlots
 * @param {readonly string[]} currentKeys
 * @param {AmberBossTreasureSnapshot} snapshot
 * @returns {{ slots: (object | null)[], keys: string[] }}
 */
export function restoreAmberBossTreasureLayout(currentSlots, currentKeys, snapshot) {
  const currentByKey = new Map();
  const curLen = Math.max(currentSlots.length, currentKeys.length);
  for (let i = 0; i < curLen; i += 1) {
    const slot = currentSlots[i] ?? null;
    if (!slot) continue;
    currentByKey.set(String(currentKeys[i] ?? `g-slot-${i}`), slot);
  }

  const nextSlots = [];
  const nextKeys = [];
  for (let i = 0; i < snapshot.keys.length; i += 1) {
    const key = String(snapshot.keys[i] ?? `g-slot-${i}`);
    nextKeys.push(key);
    const hadTreasure = snapshot.slots[i] != null;
    nextSlots.push(hadTreasure && currentByKey.has(key) ? currentByKey.get(key) : null);
  }
  return { slots: nextSlots, keys: nextKeys };
}
