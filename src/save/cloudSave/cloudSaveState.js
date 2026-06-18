import { reactive } from "vue";
import { loadCloudSaveMeta } from "./cloudSaveMeta.js";

/** @type {import('vue').Reactive<{ syncState: import('./cloudSaveConstants.js').CloudSaveSyncState; conflictOpen: boolean; localBundle: import('./cloudSaveConstants.js').CloudSaveBundle | null; cloudBundle: import('./cloudSaveConstants.js').CloudSaveBundle | null; cloudArchive: import('./cloudSaveConstants.js').CloudSaveArchiveInfo | null; foreignLocalOpen: boolean; foreignLocalBundle: import('./cloudSaveConstants.js').CloudSaveBundle | null }>} */
export const cloudSaveUiState = reactive({
  syncState: loadCloudSaveMeta().syncState,
  conflictOpen: false,
  localBundle: null,
  cloudBundle: null,
  cloudArchive: null,
  foreignLocalOpen: false,
  foreignLocalBundle: null,
});

/** @param {import('./cloudSaveConstants.js').CloudSaveSyncState} syncState */
export function setCloudSaveSyncState(syncState) {
  cloudSaveUiState.syncState = syncState;
}

/** @returns {string} */
export function getCloudSaveStatusLabel() {
  switch (cloudSaveUiState.syncState) {
    case "pending":
      return "待同步";
    case "syncing":
      return "同步中…";
    case "error":
      return "同步失败";
    case "conflict":
      return "存档冲突";
    default:
      return "已同步";
  }
}

/**
 * @param {{
 *   localBundle: import('./cloudSaveConstants.js').CloudSaveBundle;
 *   cloudBundle: import('./cloudSaveConstants.js').CloudSaveBundle;
 *   cloudArchive: import('./cloudSaveConstants.js').CloudSaveArchiveInfo;
 * }} payload
 */
export function openCloudSaveConflict(payload) {
  cloudSaveUiState.localBundle = payload.localBundle;
  cloudSaveUiState.cloudBundle = payload.cloudBundle;
  cloudSaveUiState.cloudArchive = payload.cloudArchive;
  cloudSaveUiState.conflictOpen = true;
  cloudSaveUiState.syncState = "conflict";
}

export function closeCloudSaveConflict() {
  cloudSaveUiState.conflictOpen = false;
  cloudSaveUiState.localBundle = null;
  cloudSaveUiState.cloudBundle = null;
  cloudSaveUiState.cloudArchive = null;
}

/**
 * @param {{ localBundle: import('./cloudSaveConstants.js').CloudSaveBundle }} payload
 */
export function openCloudSaveForeignLocal(payload) {
  cloudSaveUiState.foreignLocalBundle = payload.localBundle;
  cloudSaveUiState.foreignLocalOpen = true;
  cloudSaveUiState.syncState = "conflict";
}

export function closeCloudSaveForeignLocal() {
  cloudSaveUiState.foreignLocalOpen = false;
  cloudSaveUiState.foreignLocalBundle = null;
}
