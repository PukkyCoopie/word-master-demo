import { RUN_DIFFICULTY_COUNT } from "../game/runDifficultyDefinitions.js";
import { SAVE_SCHEMA_VERSION } from "./runSaveSchema.js";

const MAX_DIFFICULTY_INDEX = RUN_DIFFICULTY_COUNT - 1;

/**
 * v1 难度 index（旧「难度1–8」）→ v2 index（新「难度1–8」位于 1–8）。
 * @param {number | null | undefined} oldIndex
 * @returns {number}
 */
export function migrateDifficultyIndexV1ToV2(oldIndex) {
  const n = Math.floor(Number(oldIndex) || 0);
  return Math.max(0, Math.min(MAX_DIFFICULTY_INDEX, n + 1));
}

/**
 * @param {import('./runSaveSchema.js').SlotCareerStats} career
 * @returns {import('./runSaveSchema.js').SlotCareerStats}
 */
export function migrateSlotCareerV1ToV2(career) {
  const next = { ...career };

  const beaten = Math.floor(Number(next.highestDifficultyBeaten));
  if (Number.isFinite(beaten) && beaten >= 0) {
    next.highestDifficultyBeaten = Math.min(MAX_DIFFICULTY_INDEX, beaten + 1);
  }

  const runsCompleted = Math.max(0, Math.floor(Number(next.runsCompleted) || 0));
  if (runsCompleted > 0) {
    next.lastSelectedDifficultyIndex = migrateDifficultyIndexV1ToV2(next.lastSelectedDifficultyIndex);
  } else {
    next.lastSelectedDifficultyIndex = 0;
  }

  if (next.presetHighestDifficultyWon && typeof next.presetHighestDifficultyWon === "object") {
    /** @type {Record<string, number>} */
    const migrated = {};
    for (const [presetId, value] of Object.entries(next.presetHighestDifficultyWon)) {
      const n = Math.floor(Number(value));
      migrated[presetId] =
        Number.isFinite(n) && n >= 0 ? Math.min(MAX_DIFFICULTY_INDEX, n + 1) : -1;
    }
    next.presetHighestDifficultyWon = migrated;
  }

  return next;
}

/**
 * @param {import('./runSaveSchema.js').RunSaveMeta | null | undefined} meta
 * @returns {import('./runSaveSchema.js').RunSaveMeta | null | undefined}
 */
export function migrateSlotMetaV1ToV2(meta) {
  if (!meta) return meta;
  return {
    ...meta,
    runDifficultyIndex: migrateDifficultyIndexV1ToV2(meta.runDifficultyIndex ?? 0),
  };
}

/**
 * @param {import('./runSavePayload.js').RunSavePayload | null | undefined} payload
 * @returns {import('./runSavePayload.js').RunSavePayload | null | undefined}
 */
export function migrateSlotPayloadV1ToV2(payload) {
  if (!payload) return payload;
  return {
    ...payload,
    runDifficultyIndex: migrateDifficultyIndexV1ToV2(payload.runDifficultyIndex ?? 0),
  };
}

/**
 * @param {import('./runSaveSchema.js').RunSaveSlot | null} slot
 * @returns {import('./runSaveSchema.js').RunSaveSlot | null}
 */
export function migrateRunSaveSlotV1ToV2(slot) {
  if (!slot) return slot;
  const career = migrateSlotCareerV1ToV2(
    /** @type {import('./runSaveSchema.js').SlotCareerStats} */ (slot.career ?? {}),
  );
  return {
    ...slot,
    career,
    meta: migrateSlotMetaV1ToV2(slot.meta),
    payload: migrateSlotPayloadV1ToV2(slot.payload),
  };
}

/**
 * v1 → v2：在 index 0 插入「难度0」，原 0–7 顺延为 1–8。
 * @param {import('./runSaveSchema.js').SaveEnvelope} envelope
 * @returns {import('./runSaveSchema.js').SaveEnvelope}
 */
export function migrateRunSaveEnvelopeToLatest(envelope) {
  const version = Math.floor(Number(envelope?.schemaVersion) || 1);
  if (version >= SAVE_SCHEMA_VERSION) return envelope;

  let next = envelope;
  if (version < 2) {
    next = {
      ...next,
      schemaVersion: 2,
      slots: next.slots.map((slot) => migrateRunSaveSlotV1ToV2(slot)),
    };
  }

  if (next.schemaVersion < SAVE_SCHEMA_VERSION) {
    next = { ...next, schemaVersion: SAVE_SCHEMA_VERSION };
  }

  return next;
}
