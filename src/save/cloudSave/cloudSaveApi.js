import { Capacitor } from "@capacitor/core";
import { TapTap } from "../../taptap/tapTapPlugin.js";

/**
 * @param {unknown} raw
 * @returns {import('./cloudSaveConstants.js').CloudSaveArchiveInfo | null}
 */
function normalizeArchiveInfo(raw) {
  if (!raw || typeof raw !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const uuid = String(o.uuid ?? "").trim();
  const fileId = String(o.fileId ?? "").trim();
  const name = String(o.name ?? "").trim();
  if (!uuid || !fileId || !name) return null;
  return {
    uuid,
    fileId,
    name,
    summary: typeof o.summary === "string" ? o.summary : undefined,
    extra: typeof o.extra === "string" ? o.extra : undefined,
    playtime: Number.isFinite(Number(o.playtime)) ? Math.floor(Number(o.playtime)) : undefined,
    saveSize: Number.isFinite(Number(o.saveSize)) ? Math.floor(Number(o.saveSize)) : undefined,
    coverSize: Number.isFinite(Number(o.coverSize)) ? Math.floor(Number(o.coverSize)) : undefined,
    createdTime: Number.isFinite(Number(o.createdTime)) ? Math.floor(Number(o.createdTime)) : undefined,
    modifiedTime: Number.isFinite(Number(o.modifiedTime)) ? Math.floor(Number(o.modifiedTime)) : undefined,
  };
}

/** @returns {Promise<import('./cloudSaveConstants.js').CloudSaveArchiveInfo[]>} */
export async function cloudSaveGetArchiveList() {
  if (!Capacitor.isNativePlatform()) return [];
  /** @type {{ archives?: unknown[] }} */
  const result = await TapTap.cloudSaveGetArchiveList();
  const archives = Array.isArray(result?.archives) ? result.archives : [];
  return archives.map(normalizeArchiveInfo).filter(Boolean);
}

/**
 * @param {{
 *   archiveName: string;
 *   archiveSummary: string;
 *   archiveExtra?: string;
 *   archivePlaytime?: number;
 *   dataJson: string;
 * }} params
 */
export async function cloudSaveCreateArchive(params) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Cloud save is only available in the native app");
  }
  const result = await TapTap.cloudSaveCreateArchive(params);
  const archive = normalizeArchiveInfo(result);
  if (!archive) throw new Error("Invalid create archive response");
  return archive;
}

/**
 * @param {{
 *   archiveUuid: string;
 *   archiveName: string;
 *   archiveSummary: string;
 *   archiveExtra?: string;
 *   archivePlaytime?: number;
 *   dataJson: string;
 * }} params
 */
export async function cloudSaveUpdateArchive(params) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Cloud save is only available in the native app");
  }
  const result = await TapTap.cloudSaveUpdateArchive(params);
  const archive = normalizeArchiveInfo(result);
  if (!archive) throw new Error("Invalid update archive response");
  return archive;
}

/**
 * @param {string} archiveUuid
 * @param {string} archiveFileId
 */
export async function cloudSaveDownloadBundleJson(archiveUuid, archiveFileId) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Cloud save is only available in the native app");
  }
  /** @type {{ dataJson?: string }} */
  const result = await TapTap.cloudSaveGetArchiveData({ archiveUuid, archiveFileId });
  return String(result?.dataJson ?? "");
}

/** @returns {boolean} */
export function isCloudSaveNativeAvailable() {
  return Capacitor.isNativePlatform();
}

/** @param {unknown} err */
export function parseCloudSaveErrorCode(err) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const match = message.match(/^(\d{6}):/);
  return match ? Math.floor(Number(match[1])) : null;
}
