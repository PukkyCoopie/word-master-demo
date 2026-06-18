import { Capacitor } from "@capacitor/core";
import { isE2eMode } from "../../e2e/isE2eMode.js";
import { ensureTapTapSdkInitialized, isTapTapAccount } from "../../taptap/tapTapPlugin.js";
import {
  bundlesHaveEquivalentSaveData,
  clearAllLocalSaveData,
  exportCloudSaveBundle,
  getBundleExportedAt,
  importCloudSaveBundle,
  localHasSaveData,
  localSaveBelongsToAccount,
  normalizeCloudSaveBundle,
} from "./cloudSaveBundle.js";
import { CLOUD_ARCHIVE_NAME } from "./cloudSaveConstants.js";
import {
  cloudSaveCreateArchive,
  cloudSaveDownloadBundleJson,
  cloudSaveGetArchiveList,
  cloudSaveUpdateArchive,
  isCloudSaveNativeAvailable,
  parseCloudSaveErrorCode,
} from "./cloudSaveApi.js";
import { buildArchiveMetadata } from "./cloudSaveMetadata.js";
import { loadCloudSaveMeta, persistCloudSaveMeta } from "./cloudSaveMeta.js";
import {
  closeCloudSaveConflict,
  closeCloudSaveForeignLocal,
  cloudSaveUiState,
  openCloudSaveConflict,
  openCloudSaveForeignLocal,
  setCloudSaveSyncState,
} from "./cloudSaveState.js";

const NORMAL_UPLOAD_INTERVAL_MS = 30_000;
const HIGH_PRIORITY_UPLOAD_INTERVAL_MS = 5_000;
const MAX_BACKOFF_MS = 120_000;

let dirty = false;
/** @type {ReturnType<typeof setTimeout> | null} */
let uploadTimer = null;
let lastUploadAttemptAt = 0;
let backoffMs = 0;
/** @type {Promise<void> | null} */
let inFlight = null;
let conflictBlockingUpload = false;
/** @type {import('../../taptap/tapTapPlugin.js').TapTapAccount | null} */
let activeAccount = null;
/** @type {(() => void) | null} */
let onCloudSaveApplied = null;

/** @param {() => void} callback */
export function setCloudSaveAppliedCallback(callback) {
  onCloudSaveApplied = callback;
}

function notifyCloudSaveApplied() {
  onCloudSaveApplied?.();
}

/** @returns {boolean} */
export function isCloudSaveEnabled() {
  return isCloudSaveNativeAvailable() && !isE2eMode() && isTapTapAccount(activeAccount);
}

export function markCloudSyncDirty() {
  if (!isCloudSaveEnabled()) return;
  dirty = true;
  setCloudSaveSyncState("pending");
  scheduleUpload(false);
}

/**
 * @param {{ priority?: 'high' | 'normal', force?: boolean }} [opts]
 */
export function requestCloudSync(opts = {}) {
  if (!isCloudSaveEnabled()) return;
  dirty = true;
  setCloudSaveSyncState("pending");
  scheduleUpload(opts.priority === "high", opts.force === true);
}

function scheduleUpload(highPriority = false, force = false) {
  if (!isCloudSaveEnabled() || conflictBlockingUpload) return;
  if (uploadTimer != null) {
    clearTimeout(uploadTimer);
    uploadTimer = null;
  }
  const minInterval = highPriority || force ? HIGH_PRIORITY_UPLOAD_INTERVAL_MS : NORMAL_UPLOAD_INTERVAL_MS;
  const elapsed = Date.now() - lastUploadAttemptAt;
  const waitMs = force ? 0 : Math.max(0, minInterval - elapsed, backoffMs);
  uploadTimer = setTimeout(() => {
    uploadTimer = null;
    void flushCloudUpload({ force });
  }, waitMs);
}

/**
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<boolean>} 是否已成功同步到云端
 */
export async function flushCloudUpload(opts = {}) {
  if (!isCloudSaveEnabled() || conflictBlockingUpload) return false;
  if (!dirty && !opts.force) return loadCloudSaveMeta().syncState === "idle";
  if (inFlight) {
    await inFlight;
    return loadCloudSaveMeta().syncState === "idle";
  }
  /** @type {Promise<boolean>} */
  inFlight = performUpload().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** @returns {Promise<boolean>} */
async function performUpload() {
  if (!isTapTapAccount(activeAccount)) return false;
  dirty = false;
  lastUploadAttemptAt = Date.now();
  setCloudSaveSyncState("syncing");
  try {
    await ensureTapTapSdkInitialized();
    const bundle = exportCloudSaveBundle(activeAccount.unionId);
    const metadata = buildArchiveMetadata(bundle);
    const dataJson = JSON.stringify(bundle);
    const meta = loadCloudSaveMeta();
    let archive;
    if (meta.archiveUuid) {
      archive = await cloudSaveUpdateArchive({
        archiveUuid: meta.archiveUuid,
        ...metadata,
        dataJson,
      });
    } else {
      const archives = await cloudSaveGetArchiveList();
      const existing = archives.find((item) => item.name === CLOUD_ARCHIVE_NAME);
      if (existing) {
        archive = await cloudSaveUpdateArchive({
          archiveUuid: existing.uuid,
          ...metadata,
          dataJson,
        });
      } else {
        archive = await cloudSaveCreateArchive({
          ...metadata,
          dataJson,
        });
      }
    }
    persistCloudSaveMeta({
      archiveUuid: archive.uuid,
      archiveFileId: archive.fileId,
      lastSyncedAt: Date.now(),
      lastSyncedUnionId: activeAccount.unionId,
      syncState: "idle",
      conflictDeferred: false,
      lastConflictCloudExportedAt: null,
    });
    setCloudSaveSyncState("idle");
    backoffMs = 0;
    return true;
  } catch (err) {
    dirty = true;
    const code = parseCloudSaveErrorCode(err);
    if (code === 400001 || code === 400006 || code === 400007) {
      backoffMs = Math.min(MAX_BACKOFF_MS, Math.max(NORMAL_UPLOAD_INTERVAL_MS, (backoffMs || 15_000) * 2));
    } else {
      backoffMs = NORMAL_UPLOAD_INTERVAL_MS;
    }
    persistCloudSaveMeta({ syncState: "error" });
    setCloudSaveSyncState("error");
    scheduleUpload(false);
    return false;
  }
}

/**
 * @param {import('./cloudSaveConstants.js').CloudSaveArchiveInfo} archive
 */
async function downloadCloudBundle(archive) {
  const rawJson = await cloudSaveDownloadBundleJson(archive.uuid, archive.fileId);
  if (!rawJson.trim()) return null;
  try {
    return normalizeCloudSaveBundle(JSON.parse(rawJson));
  } catch {
    return null;
  }
}

function clearStaleCloudArchiveMetaForAccountSwitch(account) {
  const meta = loadCloudSaveMeta();
  if (meta.lastSyncedUnionId && meta.lastSyncedUnionId !== account.unionId) {
    persistCloudSaveMeta({
      archiveUuid: null,
      archiveFileId: null,
      conflictDeferred: false,
      lastConflictCloudExportedAt: null,
    });
  }
}

/**
 * @param {import('../../taptap/tapTapPlugin.js').TapTapAccount} account
 */
export async function syncOnLogin(account) {
  if (!Capacitor.isNativePlatform() || isE2eMode()) return;
  if (!isTapTapAccount(account)) return;

  activeAccount = account;
  await ensureTapTapSdkInitialized();
  clearStaleCloudArchiveMetaForAccountSwitch(account);

  const localHas = localHasSaveData();
  let archives = [];
  try {
    archives = await cloudSaveGetArchiveList();
  } catch {
    persistCloudSaveMeta({ syncState: "error" });
    setCloudSaveSyncState("error");
    return;
  }

  const cloudArchive = archives.find((item) => item.name === CLOUD_ARCHIVE_NAME) ?? null;
  const cloudHas = cloudArchive != null;

  if (!localHas && !cloudHas) {
    persistCloudSaveMeta({
      lastSyncedUnionId: account.unionId,
      syncState: "idle",
    });
    setCloudSaveSyncState("idle");
    return;
  }

  if (!localHas && cloudHas && cloudArchive) {
    const cloudBundle = await downloadCloudBundle(cloudArchive);
    if (cloudBundle && importCloudSaveBundle(cloudBundle)) {
      persistCloudSaveMeta({
        archiveUuid: cloudArchive.uuid,
        archiveFileId: cloudArchive.fileId,
        lastSyncedAt: Date.now(),
        lastSyncedUnionId: account.unionId,
        syncState: "idle",
        conflictDeferred: false,
      });
      setCloudSaveSyncState("idle");
      notifyCloudSaveApplied();
    }
    return;
  }

  if (localHas && !cloudHas) {
    if (!localSaveBelongsToAccount(account.unionId)) {
      conflictBlockingUpload = true;
      openCloudSaveForeignLocal({
        localBundle: exportCloudSaveBundle(loadCloudSaveMeta().lastSyncedUnionId ?? ""),
      });
      return;
    }
    dirty = true;
    await flushCloudUpload({ force: true });
    return;
  }

  if (!cloudArchive) return;

  const meta = loadCloudSaveMeta();
  const cloudBundle = await downloadCloudBundle(cloudArchive);
  if (!cloudBundle) {
    persistCloudSaveMeta({ syncState: "error" });
    setCloudSaveSyncState("error");
    return;
  }

  const localBundle = exportCloudSaveBundle(account.unionId);
  if (bundlesHaveEquivalentSaveData(localBundle, cloudBundle)) {
    persistCloudSaveMeta({
      archiveUuid: cloudArchive.uuid,
      archiveFileId: cloudArchive.fileId,
      lastSyncedAt: Date.now(),
      lastSyncedUnionId: account.unionId,
      syncState: "idle",
      conflictDeferred: false,
      lastConflictCloudExportedAt: null,
    });
    setCloudSaveSyncState("idle");
    return;
  }

  const cloudExportedAt = getBundleExportedAt(cloudBundle);
  if (
    meta.conflictDeferred &&
    meta.lastConflictCloudExportedAt === cloudExportedAt &&
    meta.lastSyncedUnionId === account.unionId
  ) {
    dirty = true;
    setCloudSaveSyncState("pending");
    scheduleUpload(false);
    return;
  }

  conflictBlockingUpload = true;
  openCloudSaveConflict({
    localBundle,
    cloudBundle,
    cloudArchive,
  });
}

export async function resolveCloudSaveUseCloud() {
  const cloudBundle = cloudSaveUiState.cloudBundle;
  const cloudArchive = cloudSaveUiState.cloudArchive;
  if (!cloudBundle || !cloudArchive || !isTapTapAccount(activeAccount)) return false;

  if (!importCloudSaveBundle(cloudBundle)) return false;

  persistCloudSaveMeta({
    archiveUuid: cloudArchive.uuid,
    archiveFileId: cloudArchive.fileId,
    lastSyncedAt: Date.now(),
    lastSyncedUnionId: activeAccount.unionId,
    syncState: "idle",
    conflictDeferred: false,
    lastConflictCloudExportedAt: null,
  });
  conflictBlockingUpload = false;
  closeCloudSaveConflict();
  setCloudSaveSyncState("idle");
  notifyCloudSaveApplied();
  return true;
}

export async function resolveCloudSaveUseLocal() {
  if (!isTapTapAccount(activeAccount)) return false;
  conflictBlockingUpload = false;
  closeCloudSaveConflict();
  dirty = true;
  const uploaded = await flushCloudUpload({ force: true });
  if (!uploaded) {
    setCloudSaveSyncState("error");
    return false;
  }
  notifyCloudSaveApplied();
  return true;
}

export function resolveCloudSaveDefer() {
  const cloudBundle = cloudSaveUiState.cloudBundle;
  if (!cloudBundle || !isTapTapAccount(activeAccount)) return;
  persistCloudSaveMeta({
    conflictDeferred: true,
    lastConflictCloudExportedAt: getBundleExportedAt(cloudBundle),
    lastSyncedUnionId: activeAccount.unionId,
    syncState: "pending",
  });
  conflictBlockingUpload = false;
  closeCloudSaveConflict();
  setCloudSaveSyncState("pending");
}

export async function resolveCloudSaveForeignLocalContinue() {
  if (!isTapTapAccount(activeAccount)) return false;
  conflictBlockingUpload = false;
  closeCloudSaveForeignLocal();
  persistCloudSaveMeta({
    archiveUuid: null,
    archiveFileId: null,
    conflictDeferred: false,
    lastConflictCloudExportedAt: null,
  });
  dirty = true;
  const uploaded = await flushCloudUpload({ force: true });
  if (!uploaded) {
    setCloudSaveSyncState("error");
    return false;
  }
  notifyCloudSaveApplied();
  return true;
}

export async function resolveCloudSaveForeignLocalNew() {
  if (!isTapTapAccount(activeAccount)) return false;
  clearAllLocalSaveData();
  persistCloudSaveMeta({
    archiveUuid: null,
    archiveFileId: null,
    lastSyncedAt: null,
    lastSyncedUnionId: activeAccount.unionId,
    syncState: "idle",
    conflictDeferred: false,
    lastConflictCloudExportedAt: null,
  });
  conflictBlockingUpload = false;
  closeCloudSaveForeignLocal();
  dirty = false;
  setCloudSaveSyncState("idle");
  notifyCloudSaveApplied();
  return true;
}

/** @param {import('../../taptap/tapTapPlugin.js').TapTapAccount | null} account */
export function setCloudSaveActiveAccount(account) {
  activeAccount = isTapTapAccount(account) ? account : null;
  if (!activeAccount) {
    dirty = false;
    conflictBlockingUpload = false;
    closeCloudSaveConflict();
    closeCloudSaveForeignLocal();
  }
}

export async function flushCloudUploadOnBackground() {
  await flushCloudUpload({ force: true });
}
