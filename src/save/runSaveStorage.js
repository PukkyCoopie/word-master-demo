import { APP_VERSION } from "../appVersion.js";
import {
  RUN_SAVES_STORAGE_KEY,
  SAVE_SLOT_COUNT,
  clampSaveSlotIndex,
  createEmptySaveEnvelope,
  createEmptySlotCareerStats,
  isContinuableRunPhase,
  normalizeRunSavePhase,
} from "./runSaveSchema.js";
import {
  hasMeaningfulRunProgress,
  isAbandonedFreshRunPayload,
} from "./runSaveMeaningfulProgress.js";
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

/** @param {number} index 槽位是否存在可恢复的局内进度（进行中，非整局结束，且非空白局） */
export function hasContinuableRun(index) {
  const ix = clampSaveSlotIndex(index);
  const slot = getSaveEnvelope().slots[ix];
  if (!slot?.payload) return false;
  const phase = normalizeRunSavePhase(slot.payload.phase ?? slot.meta?.phase);
  if (!isContinuableRunPhase(phase)) return false;
  return hasMeaningfulRunProgress(slot.payload);
}

/** @param {number} index */
export function hasAbandonedFreshRun(index) {
  const payload = getSlotPayload(index);
  return isAbandonedFreshRunPayload(payload);
}

/**
 * 清除「刚进局未操作」的空白进度，保留栏位生涯与 meta 摘要。
 * @param {number} index
 * @returns {boolean} 是否执行了清除
 */
export function pruneAbandonedFreshRun(index) {
  if (!hasAbandonedFreshRun(index)) return false;
  return clearSlotRunProgress(index);
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

/**
 * @param {number} index
 * @param {(career: import('./runSaveSchema.js').SlotCareerStats) => void} mutator
 */
export function mutateSlotCareer(index, mutator) {
  const ix = clampSaveSlotIndex(index);
  const envelope = structuredClone(getSaveEnvelope());
  let slot = envelope.slots[ix];
  if (!slot) {
    const savedAt = Date.now();
    envelope.slots[ix] = {
      savedAt,
      appVersion: APP_VERSION,
      meta: {
        seedDisplay: "",
        levelId: "",
        money: 0,
        isEndlessRun: false,
        phase: "playing",
        ownedTreasureEmojis: [null, null, null, null, null],
        savedAt,
      },
      career: createEmptySlotCareerStats(),
      payload: null,
    };
    slot = envelope.slots[ix];
  }
  const career = normalizeSlotCareerStats(slot.career);
  mutator(career);
  slot.career = career;
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
