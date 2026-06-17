import { APP_VERSION } from "../../appVersion.js";
import { loadGameSettings } from "../../settings/gameSettings.js";
import { loadPlayerProfile, repairSlotProfilesAfterLoad } from "../../profile/playerProfile.js";
import { loadSaveEnvelope } from "../runSaveStorage.js";
import { migrateRunSaveEnvelopeToLatest } from "../migrateRunSaveEnvelope.js";
import { createEmptySaveEnvelope, RUN_SAVES_STORAGE_KEY, SAVE_SLOT_COUNT } from "../runSaveSchema.js";
import {
  CLOUD_BUNDLE_VERSION,
  GAME_SETTINGS_STORAGE_KEY,
  PLAYER_PROFILE_STORAGE_KEY,
} from "./cloudSaveConstants.js";

/** @param {string} key */
function readLocalStorageJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** @param {string} key @param {unknown} value */
function writeLocalStorageJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * @param {string} [unionId]
 * @returns {import('./cloudSaveConstants.js').CloudSaveBundle}
 */
export function exportCloudSaveBundle(unionId = "") {
  const runSaves = readLocalStorageJson(RUN_SAVES_STORAGE_KEY) ?? createEmptySaveEnvelope();
  const playerProfile = readLocalStorageJson(PLAYER_PROFILE_STORAGE_KEY) ?? {
    schemaVersion: 3,
    activeSaveSlotIndex: 0,
    slotProfiles: Array.from({ length: SAVE_SLOT_COUNT }, () => ({
      displayName: "Player",
      initialized: false,
    })),
  };
  const gameSettings = readLocalStorageJson(GAME_SETTINGS_STORAGE_KEY) ?? {};

  return {
    bundleVersion: CLOUD_BUNDLE_VERSION,
    appVersion: APP_VERSION,
    exportedAt: Date.now(),
    unionId: String(unionId ?? "").trim() || undefined,
    runSaves,
    playerProfile,
    gameSettings,
  };
}

/**
 * @param {unknown} bundle
 * @returns {import('./cloudSaveConstants.js').CloudSaveBundle | null}
 */
export function normalizeCloudSaveBundle(bundle) {
  if (!bundle || typeof bundle !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (bundle);
  if (!o.runSaves || typeof o.runSaves !== "object") return null;
  return {
    bundleVersion: Math.floor(Number(o.bundleVersion) || CLOUD_BUNDLE_VERSION),
    appVersion: String(o.appVersion ?? APP_VERSION),
    exportedAt: Math.floor(Number(o.exportedAt) || Date.now()),
    unionId: typeof o.unionId === "string" ? o.unionId : undefined,
    runSaves: o.runSaves,
    playerProfile: o.playerProfile ?? null,
    gameSettings: o.gameSettings ?? null,
  };
}

/**
 * @param {import('./cloudSaveConstants.js').CloudSaveBundle} bundle
 */
export function importCloudSaveBundle(bundle) {
  const normalized = normalizeCloudSaveBundle(bundle);
  if (!normalized) return false;

  const rawEnvelope =
    normalized.runSaves && typeof normalized.runSaves === "object"
      ? /** @type {import('../runSaveSchema.js').SaveEnvelope} */ (normalized.runSaves)
      : createEmptySaveEnvelope();
  const migrated = migrateRunSaveEnvelopeToLatest({
    schemaVersion: Math.floor(Number(rawEnvelope.schemaVersion) || 1),
    slotCount: SAVE_SLOT_COUNT,
    slots: Array.isArray(rawEnvelope.slots) ? rawEnvelope.slots : [],
  });
  writeLocalStorageJson(RUN_SAVES_STORAGE_KEY, migrated);

  if (normalized.playerProfile && typeof normalized.playerProfile === "object") {
    writeLocalStorageJson(PLAYER_PROFILE_STORAGE_KEY, normalized.playerProfile);
  }

  if (normalized.gameSettings && typeof normalized.gameSettings === "object") {
    writeLocalStorageJson(GAME_SETTINGS_STORAGE_KEY, normalized.gameSettings);
  }

  loadSaveEnvelope();
  loadPlayerProfile();
  repairSlotProfilesAfterLoad();
  loadGameSettings();
  return true;
}

/** @param {import('./cloudSaveConstants.js').CloudSaveBundle | null | undefined} bundle */
export function getBundleExportedAt(bundle) {
  if (!bundle) return 0;
  return Math.floor(Number(bundle.exportedAt) || 0);
}

/** @param {unknown} value */
function stableSavePayload(value) {
  return JSON.stringify(value ?? null);
}

/**
 * 比较本机与云端 bundle 的实际存档内容（忽略 exportedAt / unionId 等同步元数据）。
 * @param {import('./cloudSaveConstants.js').CloudSaveBundle | null | undefined} a
 * @param {import('./cloudSaveConstants.js').CloudSaveBundle | null | undefined} b
 */
export function bundlesHaveEquivalentSaveData(a, b) {
  if (!a || !b) return false;
  return (
    stableSavePayload(a.runSaves) === stableSavePayload(b.runSaves) &&
    stableSavePayload(a.playerProfile) === stableSavePayload(b.playerProfile) &&
    stableSavePayload(a.gameSettings) === stableSavePayload(b.gameSettings)
  );
}

/** @returns {boolean} */
export function localHasSaveData() {
  const envelope = readLocalStorageJson(RUN_SAVES_STORAGE_KEY);
  if (envelope && typeof envelope === "object") {
    const slots = /** @type {{ slots?: unknown[] }} */ (envelope).slots;
    if (Array.isArray(slots) && slots.some((slot) => slot != null)) {
      return true;
    }
  }

  const profile = readLocalStorageJson(PLAYER_PROFILE_STORAGE_KEY);
  if (profile && typeof profile === "object") {
    const slotProfiles = /** @type {{ slotProfiles?: { initialized?: boolean }[] }} */ (profile).slotProfiles;
    if (Array.isArray(slotProfiles) && slotProfiles.some((p) => p?.initialized === true)) {
      return true;
    }
    if (/** @type {{ initialized?: boolean }} */ (profile).initialized === true) {
      return true;
    }
  }

  return false;
}

/**
 * @param {import('./cloudSaveConstants.js').CloudSaveBundle} bundle
 */
export function getBundleSlotSummaries(bundle) {
  const envelope =
    bundle?.runSaves && typeof bundle.runSaves === "object"
      ? /** @type {import('../runSaveSchema.js').SaveEnvelope} */ (bundle.runSaves)
      : createEmptySaveEnvelope();
  /** @type {{ index: number; hasSave: boolean; career: import('../runSaveSchema.js').SlotCareerStats | null; meta: import('../runSaveSchema.js').RunSaveMeta | null }[]} */
  const entries = [];
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    const slot = envelope.slots?.[i] ?? null;
    entries.push({
      index: i,
      hasSave: slot != null,
      career: slot?.career ?? null,
      meta: slot?.meta ?? null,
    });
  }
  return entries;
}
