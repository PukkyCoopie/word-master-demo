import { APP_VERSION } from "../appVersion.js";
import {
  RUN_SAVES_STORAGE_KEY,
  SAVE_SLOT_COUNT,
  clampSaveSlotIndex,
  createEmptySaveEnvelope,
  createEmptySlotCareerStats,
  normalizeRunSavePhase,
} from "./runSaveSchema.js";
import { normalizeSlotCareerStats } from "./slotCareerStats.js";

/** @type {import('./runSaveSchema.js').SaveEnvelope | null} */
let cachedEnvelope = null;

function readRawEnvelope() {
  try {
    const raw = localStorage.getItem(RUN_SAVES_STORAGE_KEY);
    if (!raw) return createEmptySaveEnvelope();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return createEmptySaveEnvelope();
    const slots = Array.isArray(parsed.slots) ? parsed.slots : [];
    while (slots.length < SAVE_SLOT_COUNT) slots.push(null);
    return {
      schemaVersion: Math.floor(Number(parsed.schemaVersion) || 1),
      slotCount: SAVE_SLOT_COUNT,
      slots: slots.slice(0, SAVE_SLOT_COUNT),
    };
  } catch {
    return createEmptySaveEnvelope();
  }
}

export function loadSaveEnvelope() {
  cachedEnvelope = readRawEnvelope();
  return cachedEnvelope;
}

function persistEnvelope(envelope) {
  cachedEnvelope = envelope;
  try {
    localStorage.setItem(RUN_SAVES_STORAGE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

/** @returns {import('./runSaveSchema.js').SaveEnvelope} */
export function getSaveEnvelope() {
  return cachedEnvelope ?? loadSaveEnvelope();
}

/** @param {number} index */
export function isSlotOccupied(index) {
  const ix = clampSaveSlotIndex(index);
  return getSaveEnvelope().slots[ix] != null;
}

/** @param {number} index 槽位是否存在可恢复的局内进度（payload） */
export function hasContinuableRun(index) {
  const ix = clampSaveSlotIndex(index);
  return getSaveEnvelope().slots[ix]?.payload != null;
}

/**
 * 清除可继续的局内进度，保留栏位生涯（profile / 解锁进度等）。
 * @param {number} index
 */
export function clearSlotRunProgress(index) {
  const ix = clampSaveSlotIndex(index);
  const envelope = structuredClone(getSaveEnvelope());
  const slot = envelope.slots[ix];
  if (!slot?.payload) return persistEnvelope(envelope);
  const career = normalizeSlotCareerStats(slot.career);
  envelope.slots[ix] = {
    savedAt: slot.savedAt ?? Date.now(),
    appVersion: slot.appVersion ?? APP_VERSION,
    meta: slot.meta ?? null,
    career,
    payload: null,
  };
  return persistEnvelope(envelope);
}

export function getOccupiedSlotCount() {
  return getSaveEnvelope().slots.filter((s) => s != null).length;
}

/** @param {number} index @returns {import('./runSaveSchema.js').RunSaveMeta | null} */
export function getSlotMeta(index) {
  const slot = getSaveEnvelope().slots[clampSaveSlotIndex(index)];
  return slot?.meta ?? null;
}

/** @param {number} index @returns {import('./runSaveSchema.js').SlotCareerStats} */
export function getSlotCareer(index) {
  const slot = getSaveEnvelope().slots[clampSaveSlotIndex(index)];
  return normalizeSlotCareerStats(slot?.career ?? createEmptySlotCareerStats());
}

/** @param {number} index @returns {import('./runSavePayload.js').RunSavePayload | null} */
export function getSlotPayload(index) {
  const slot = getSaveEnvelope().slots[clampSaveSlotIndex(index)];
  return slot?.payload ?? null;
}

/**
 * @param {number} index
 * @param {import('./runSaveSchema.js').RunSaveMeta} meta
 * @param {import('./runSavePayload.js').RunSavePayload} payload
 * @param {import('./runSaveSchema.js').SlotCareerStats} [careerOverride]
 */
export function writeSlot(index, meta, payload, careerOverride) {
  const ix = clampSaveSlotIndex(index);
  const envelope = structuredClone(getSaveEnvelope());
  const prev = envelope.slots[ix];
  const career = normalizeSlotCareerStats(careerOverride ?? prev?.career ?? createEmptySlotCareerStats());
  const savedAt = Date.now();
  envelope.slots[ix] = {
    savedAt,
    appVersion: APP_VERSION,
    meta: { ...meta, savedAt, phase: normalizeRunSavePhase(meta.phase) },
    career,
    payload,
  };
  return persistEnvelope(envelope);
}

/** @param {number} index @param {import('./runSaveSchema.js').SlotCareerStats} career */
export function updateSlotCareer(index, career) {
  const ix = clampSaveSlotIndex(index);
  const envelope = structuredClone(getSaveEnvelope());
  const slot = envelope.slots[ix];
  if (!slot) return false;
  slot.career = normalizeSlotCareerStats(career);
  return persistEnvelope(envelope);
}

/** @param {number} index */
export function clearSlot(index) {
  const ix = clampSaveSlotIndex(index);
  const envelope = structuredClone(getSaveEnvelope());
  envelope.slots[ix] = null;
  return persistEnvelope(envelope);
}

/** @returns {import('./runSaveSchema.js').RunSaveMeta | null}[]} */
export function listAllSlotMeta() {
  return getSaveEnvelope().slots.map((s) => s?.meta ?? null);
}

/**
 * @returns {{ hasSave: boolean, meta: import('./runSaveSchema.js').RunSaveMeta | null, career: import('./runSaveSchema.js').SlotCareerStats }[]}
 */
export function listAllSlotEntries() {
  return getSaveEnvelope().slots.map((s) => {
    if (!s) {
      return {
        hasSave: false,
        meta: null,
        career: createEmptySlotCareerStats(),
      };
    }
    return {
      hasSave: s.payload != null,
      meta: s.meta ?? null,
      career: normalizeSlotCareerStats(s.career),
    };
  });
}
