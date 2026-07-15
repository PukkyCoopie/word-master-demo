import { normalizeRunSaveMoney, normalizeRunSavePhase } from "../runSaveSchema.js";
import { loadCloudSaveMeta } from "./cloudSaveMeta.js";

/** 本机领先云端超过此时间仍视为「可静默合并」（同一账号、进度单调）。 */
export const CLOUD_SAVE_AUTO_LOCAL_MAX_LEAD_MS = 7 * 24 * 60 * 60 * 1000;

/** @typedef {'local_ahead' | 'cloud_ahead' | 'equivalent' | 'incomparable'} SlotProgressRelation */

/** @typedef {Object} SlotRunFingerprint
 * @property {string} seedDisplay
 * @property {number} seedNumeric
 * @property {number} levelIndex
 * @property {import('../runSaveSchema.js').RunSavePhase} phase
 * @property {number} savedAt
 * @property {boolean} meaningful
 */

const PHASE_RANK = Object.freeze({
  playing: 0,
  settlement: 1,
  shop: 2,
  run_end_win: 3,
  run_end_fail: 3,
});

/** @param {import('./cloudSaveConstants.js').CloudSaveBundle | null | undefined} bundle */
function getBundleExportedAt(bundle) {
  if (!bundle) return 0;
  return Math.floor(Number(bundle.exportedAt) || 0);
}

/** @param {import('../runSaveSchema.js').RunSaveSlot | null | undefined} slot */
function getSlotContentTimestamp(slot) {
  if (!slot) return 0;
  let max = Math.max(
    Math.floor(Number(slot.savedAt) || 0),
    Math.floor(Number(slot.meta?.savedAt) || 0),
  );
  const career = slot.career;
  if (career && typeof career === "object") {
    max = Math.max(max, Math.floor(Number(career.lastRunEndedAt) || 0));
  }
  return max;
}

/**
 * 存档内容的最近更新时间（不含 bundle.exportedAt，避免本机 export 时总是 Date.now）。
 * @param {import('./cloudSaveConstants.js').CloudSaveBundle | null | undefined} bundle
 * @param {{ includeExportedAt?: boolean }} [opts]
 */
export function getBundleContentNewestAt(bundle, opts = {}) {
  if (!bundle) return 0;
  let max = opts.includeExportedAt === true ? getBundleExportedAt(bundle) : 0;
  const envelope =
    bundle.runSaves && typeof bundle.runSaves === "object"
      ? /** @type {import('../runSaveSchema.js').SaveEnvelope} */ (bundle.runSaves)
      : null;
  if (envelope?.slots) {
    for (const slot of envelope.slots) {
      max = Math.max(max, getSlotContentTimestamp(slot));
    }
  }
  return max;
}

/**
 * @param {import('../runSaveSchema.js').RunSaveSlot | null | undefined} slot
 * @returns {SlotRunFingerprint | null}
 */
export function getSlotRunFingerprint(slot) {
  if (!slot?.payload || typeof slot.payload !== "object") return null;
  const payload = /** @type {import('../runSavePayload.js').RunSavePayload} */ (slot.payload);
  const phase = normalizeRunSavePhase(payload.phase ?? slot.meta?.phase);
  const levelIndex = Math.max(0, Math.floor(Number(payload.levelIndex) || 0));
  const seedDisplay = String(payload.runSeedDisplay ?? "");
  const seedNumeric = Math.floor(Number(payload.runSeedNumeric) || 0) >>> 0;
  const meaningful =
    seedDisplay.length > 0 ||
    seedNumeric > 0 ||
    levelIndex > 0 ||
    phase !== "playing" ||
    normalizeRunSaveMoney(payload.money) !== 0;

  return {
    seedDisplay,
    seedNumeric,
    levelIndex,
    phase,
    savedAt: getSlotContentTimestamp(slot),
    meaningful,
  };
}

/**
 * 同槽位两版进度关系（仅比较局内 fingerprint，忽略 career / 设置差）。
 * @param {SlotRunFingerprint | null} localFp
 * @param {SlotRunFingerprint | null} cloudFp
 * @returns {SlotProgressRelation}
 */
export function compareSlotRunProgress(localFp, cloudFp) {
  if (!localFp?.meaningful && !cloudFp?.meaningful) return "equivalent";
  if (!localFp?.meaningful && cloudFp?.meaningful) return "cloud_ahead";
  if (localFp?.meaningful && !cloudFp?.meaningful) return "local_ahead";

  const local = /** @type {SlotRunFingerprint} */ (localFp);
  const cloud = /** @type {SlotRunFingerprint} */ (cloudFp);

  const sameRun =
    local.seedNumeric === cloud.seedNumeric &&
    (local.seedDisplay === cloud.seedDisplay ||
      !local.seedDisplay ||
      !cloud.seedDisplay);
  if (!sameRun) return "incomparable";

  if (local.levelIndex !== cloud.levelIndex) {
    return local.levelIndex > cloud.levelIndex ? "local_ahead" : "cloud_ahead";
  }

  const localRank = PHASE_RANK[local.phase] ?? 0;
  const cloudRank = PHASE_RANK[cloud.phase] ?? 0;
  if (localRank !== cloudRank) {
    return localRank > cloudRank ? "local_ahead" : "cloud_ahead";
  }

  if (local.savedAt > cloud.savedAt) return "local_ahead";
  if (local.savedAt < cloud.savedAt) return "cloud_ahead";
  return "equivalent";
}

/**
 * 登录静默合并时，槽位关系是否允许以本机为准。
 * `incomparable`（同槽不同局）时：仅当本机更新时间严格新于云端才视为「本机重开覆盖旧云档」。
 * @param {SlotProgressRelation} relation
 * @param {SlotRunFingerprint | null} localFp
 * @param {SlotRunFingerprint | null} cloudFp
 */
export function slotRelationAllowsAutoLocalPrefer(relation, localFp, cloudFp) {
  if (relation === "cloud_ahead") return false;
  if (relation === "local_ahead" || relation === "equivalent") return true;
  if (relation !== "incomparable") return false;
  if (!localFp?.meaningful || !cloudFp?.meaningful) return false;
  return localFp.savedAt > cloudFp.savedAt;
}

/**
 * 登录冲突时是否可静默「以本机为准」并后台上传云端。
 *
 * 标准（须全部满足）：
 * 1. 本机曾同步到当前 TapTap 账号（lastSyncedUnionId 一致）；
 * 2. 本机内容时间戳严格新于云端（典型：本地已 flush，云上传有延迟）；
 * 3. 领先时间在 CLOUD_SAVE_AUTO_LOCAL_MAX_LEAD_MS 内（防异常时钟/长期离线误合并）；
 * 4. 各槽位：同局则本机进度不得落后；**不同局则仅当本机更新时间新于云端**（典型：开局上传云档后几秒内本机重开）。
 *
 * @param {{
 *   localBundle: import('./cloudSaveConstants.js').CloudSaveBundle,
 *   cloudBundle: import('./cloudSaveConstants.js').CloudSaveBundle,
 *   unionId: string,
 *   meta?: import('./cloudSaveConstants.js').CloudSaveMeta,
 * }} input
 * @returns {boolean}
 */
export function shouldAutoResolveConflictPreferLocal(input) {
  const unionId = String(input.unionId ?? "").trim();
  if (!unionId) return false;

  const meta = input.meta ?? loadCloudSaveMeta();
  if (meta.lastSyncedUnionId !== unionId) return false;

  const localNewest = getBundleContentNewestAt(input.localBundle, { includeExportedAt: false });
  const cloudNewest = getBundleContentNewestAt(input.cloudBundle, { includeExportedAt: true });
  if (localNewest <= cloudNewest) return false;

  const leadMs = localNewest - cloudNewest;
  if (leadMs > CLOUD_SAVE_AUTO_LOCAL_MAX_LEAD_MS) return false;

  const envelope =
    input.localBundle.runSaves && typeof input.localBundle.runSaves === "object"
      ? /** @type {import('../runSaveSchema.js').SaveEnvelope} */ (input.localBundle.runSaves)
      : null;
  const cloudEnvelope =
    input.cloudBundle.runSaves && typeof input.cloudBundle.runSaves === "object"
      ? /** @type {import('../runSaveSchema.js').SaveEnvelope} */ (input.cloudBundle.runSaves)
      : null;
  const slotCount = Math.max(envelope?.slots?.length ?? 0, cloudEnvelope?.slots?.length ?? 0, 3);

  for (let i = 0; i < slotCount; i += 1) {
    const localSlot = envelope?.slots?.[i] ?? null;
    const cloudSlot = cloudEnvelope?.slots?.[i] ?? null;
    const localFp = getSlotRunFingerprint(localSlot);
    const cloudFp = getSlotRunFingerprint(cloudSlot);
    const relation = compareSlotRunProgress(localFp, cloudFp);
    if (!slotRelationAllowsAutoLocalPrefer(relation, localFp, cloudFp)) return false;
  }

  return true;
}
