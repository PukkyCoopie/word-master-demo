import { CLOUD_SAVE_META_KEY } from "./cloudSaveConstants.js";

const META_SCHEMA_VERSION = 1;

/** @returns {import('./cloudSaveConstants.js').CloudSaveMeta} */
export function createEmptyCloudSaveMeta() {
  return {
    schemaVersion: META_SCHEMA_VERSION,
    archiveUuid: null,
    archiveFileId: null,
    lastSyncedAt: null,
    lastSyncedUnionId: null,
    syncState: "idle",
    conflictDeferred: false,
    lastConflictCloudExportedAt: null,
  };
}

/** @returns {import('./cloudSaveConstants.js').CloudSaveMeta} */
export function loadCloudSaveMeta() {
  try {
    const raw = localStorage.getItem(CLOUD_SAVE_META_KEY);
    if (!raw) return createEmptyCloudSaveMeta();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return createEmptyCloudSaveMeta();
    const o = /** @type {Record<string, unknown>} */ (parsed);
    const syncState = String(o.syncState ?? "idle");
    /** @type {import('./cloudSaveConstants.js').CloudSaveSyncState} */
    const normalizedState =
      syncState === "pending" ||
      syncState === "syncing" ||
      syncState === "error" ||
      syncState === "conflict"
        ? syncState
        : "idle";
    return {
      schemaVersion: META_SCHEMA_VERSION,
      archiveUuid: typeof o.archiveUuid === "string" ? o.archiveUuid : null,
      archiveFileId: typeof o.archiveFileId === "string" ? o.archiveFileId : null,
      lastSyncedAt: Number.isFinite(Number(o.lastSyncedAt)) ? Math.floor(Number(o.lastSyncedAt)) : null,
      lastSyncedUnionId: typeof o.lastSyncedUnionId === "string" ? o.lastSyncedUnionId : null,
      syncState: normalizedState,
      conflictDeferred: o.conflictDeferred === true,
      lastConflictCloudExportedAt: Number.isFinite(Number(o.lastConflictCloudExportedAt))
        ? Math.floor(Number(o.lastConflictCloudExportedAt))
        : null,
    };
  } catch {
    return createEmptyCloudSaveMeta();
  }
}

/** @param {Partial<import('./cloudSaveConstants.js').CloudSaveMeta>} patch */
export function persistCloudSaveMeta(patch) {
  const prev = loadCloudSaveMeta();
  const next = { ...prev, ...patch, schemaVersion: META_SCHEMA_VERSION };
  try {
    localStorage.setItem(CLOUD_SAVE_META_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}
