export const CLOUD_ARCHIVE_NAME = "word_master_main";
export const CLOUD_SAVE_META_KEY = "word_master_cloud_save_meta_v1";
export const CLOUD_BUNDLE_VERSION = 1;
export const PLAYER_PROFILE_STORAGE_KEY = "word_master_player_profile_v1";
export const GAME_SETTINGS_STORAGE_KEY = "word_master_game_settings_v1";

/** @typedef {'idle' | 'pending' | 'syncing' | 'error' | 'conflict'} CloudSaveSyncState */

/** @typedef {Object} CloudSaveArchiveInfo
 * @property {string} uuid
 * @property {string} fileId
 * @property {string} name
 * @property {string} [summary]
 * @property {string} [extra]
 * @property {number} [playtime]
 * @property {number} [saveSize]
 * @property {number} [coverSize]
 * @property {number} [createdTime]
 * @property {number} [modifiedTime]
 */

/** @typedef {Object} CloudSaveBundle
 * @property {number} bundleVersion
 * @property {string} appVersion
 * @property {number} exportedAt
 * @property {string} [unionId]
 * @property {unknown} runSaves
 * @property {unknown} playerProfile
 * @property {unknown} gameSettings
 */

/** @typedef {Object} CloudSaveMeta
 * @property {number} schemaVersion
 * @property {string | null} archiveUuid
 * @property {string | null} archiveFileId
 * @property {number | null} lastSyncedAt
 * @property {string | null} lastSyncedUnionId
 * @property {CloudSaveSyncState} syncState
 * @property {boolean} conflictDeferred
 * @property {number | null} lastConflictCloudExportedAt
 */
