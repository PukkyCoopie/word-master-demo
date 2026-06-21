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
import { migrateRunSaveEnvelopeToLatest } from "./migrateRunSaveEnvelope.js";
import { normalizeSlotCareerStats } from "./slotCareerStats.js";
import { SAVE_SCHEMA_VERSION } from "./runSaveSchema.js";

/** @type {import('./runSaveSchema.js').SaveEnvelope | null} */
let cachedEnvelope = null;

/** @type {string | null} */
let pendingPersistJson = null;
/** @type {number | null} */
let persistIdleHandle = null;
let persistIdleUsesRequestIdle = false;

/** @type {typeof requestIdleCallback | undefined} */
const schedulePersistIdle =
  typeof requestIdleCallback === "function"
    ? requestIdleCallback
    : undefined;

const PERSIST_IDLE_TIMEOUT_MS = 3000;

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
  const raw = readRawEnvelope();
  if (Math.floor(Number(raw.schemaVersion) || 1) < SAVE_SCHEMA_VERSION) {
    const migrated = migrateRunSaveEnvelopeToLatest(raw);
    persistEnvelope(migrated, { immediate: true });
    return migrated;
  }
  cachedEnvelope = raw;
  return cachedEnvelope;
}

function cancelPersistIdle() {
  if (persistIdleHandle == null) return;
  if (persistIdleUsesRequestIdle && typeof cancelIdleCallback === "function") {
    cancelIdleCallback(persistIdleHandle);
  } else {
    clearTimeout(persistIdleHandle);
  }
  persistIdleHandle = null;
  persistIdleUsesRequestIdle = false;
}

function flushSaveStorageToLocal() {
  const json = pendingPersistJson;
  if (json == null) return true;
  try {
    localStorage.setItem(RUN_SAVES_STORAGE_KEY, json);
    pendingPersistJson = null;
    markCloudSyncDirtyLater();
    return true;
  } catch {
    return false;
  }
}

function schedulePersistToStorage() {
  if (persistIdleHandle != null) return;
  const run = () => {
    persistIdleHandle = null;
    persistIdleUsesRequestIdle = false;
    flushSaveStorageToLocal();
  };
  if (schedulePersistIdle) {
    persistIdleUsesRequestIdle = true;
    persistIdleHandle = schedulePersistIdle(run, { timeout: PERSIST_IDLE_TIMEOUT_MS });
  } else {
    persistIdleUsesRequestIdle = false;
    persistIdleHandle = setTimeout(run, 0);
  }
}

/** 将尚未写入 localStorage 的缓存立即落盘（退菜单等路径调用）。 */
export function flushSaveStorageSync() {
  cancelPersistIdle();
  return flushSaveStorageToLocal();
}

/**
 * @param {import('./runSaveSchema.js').SaveEnvelope} envelope
 * @param {{ immediate?: boolean }} [opts]
 */
function persistEnvelope(envelope, opts = {}) {
  cachedEnvelope = envelope;
  try {
    pendingPersistJson = JSON.stringify(envelope);
  } catch {
    return false;
  }
  if (opts.immediate === true) {
    cancelPersistIdle();
    return flushSaveStorageToLocal();
  }
  schedulePersistToStorage();
  return true;
}

/** 延迟加载，避免 cloudSave ↔ runSaveStorage 循环依赖。 */
function markCloudSyncDirtyLater() {
  void import("./cloudSave/cloudSaveSync.js").then(({ markCloudSyncDirty }) => {
    markCloudSyncDirty();
  });
}

/** @returns {import('./runSaveSchema.js').SaveEnvelope} */
export function getSaveEnvelope() {
  return cachedEnvelope ?? loadSaveEnvelope();
}

/**
 * 浅拷贝 envelope 并替换单槽，避免 structuredClone 整包。
 * @param {number} slotIndex
 * @param {import('./runSaveSchema.js').RunSaveSlot | null} nextSlot
 */
function persistEnvelopeWithSlot(slotIndex, nextSlot, persistOpts = {}) {
  const prev = getSaveEnvelope();
  const ix = clampSaveSlotIndex(slotIndex);
  const slots = prev.slots.slice();
  slots[ix] = nextSlot;
  return persistEnvelope(
    {
      ...prev,
      slots,
    },
    persistOpts,
  );
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
  const slot = getSaveEnvelope().slots[ix];
  if (!slot?.payload) return true;
  const career = normalizeSlotCareerStats(slot.career);
  return persistEnvelopeWithSlot(ix, {
    savedAt: slot.savedAt ?? Date.now(),
    appVersion: slot.appVersion ?? APP_VERSION,
    meta: slot.meta ?? null,
    career,
    payload: null,
  });
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
 * @param {{ immediate?: boolean }} [persistOpts]
 */
export function writeSlot(index, meta, payload, careerOverride, persistOpts = {}) {
  const ix = clampSaveSlotIndex(index);
  const prevSlot = getSaveEnvelope().slots[ix];
  const career = normalizeSlotCareerStats(careerOverride ?? prevSlot?.career ?? createEmptySlotCareerStats());
  const savedAt = Date.now();
  return persistEnvelopeWithSlot(
    ix,
    {
      savedAt,
      appVersion: APP_VERSION,
      meta: { ...meta, savedAt, phase: normalizeRunSavePhase(meta.phase) },
      career,
      payload,
    },
    persistOpts,
  );
}

/** @param {number} index @param {import('./runSaveSchema.js').SlotCareerStats} career */
export function updateSlotCareer(index, career) {
  const ix = clampSaveSlotIndex(index);
  const slot = getSaveEnvelope().slots[ix];
  if (!slot) return false;
  return persistEnvelopeWithSlot(ix, {
    ...slot,
    career: normalizeSlotCareerStats(career),
  });
}

/**
 * @param {number} index
 * @param {(career: import('./runSaveSchema.js').SlotCareerStats) => void} mutator
 */
export function mutateSlotCareer(index, mutator) {
  const ix = clampSaveSlotIndex(index);
  let slot = getSaveEnvelope().slots[ix];
  if (!slot) {
    const savedAt = Date.now();
    slot = {
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
  }
  const career = normalizeSlotCareerStats(slot.career);
  mutator(career);
  return persistEnvelopeWithSlot(ix, {
    ...slot,
    career,
  });
}

/** @param {number} index */
export function clearSlot(index) {
  const ix = clampSaveSlotIndex(index);
  return persistEnvelopeWithSlot(ix, null);
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
