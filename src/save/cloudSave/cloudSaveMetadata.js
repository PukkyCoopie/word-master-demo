import { getActiveSaveSlotIndex } from "../../profile/playerProfile.js";
import { formatRelativeSaveTime } from "../saveDisplayUtils.js";
import { getSlotCareerSummaryRows, normalizeSlotCareerStats } from "../slotCareerStats.js";
import { createEmptySlotCareerStats } from "../runSaveSchema.js";
import { CLOUD_ARCHIVE_NAME } from "./cloudSaveConstants.js";
import { exportCloudSaveBundle, getBundleSlotSummaries } from "./cloudSaveBundle.js";

/**
 * @param {import('./cloudSaveConstants.js').CloudSaveBundle} [bundle]
 */
export function buildArchiveMetadata(bundle = exportCloudSaveBundle()) {
  const activeIx = getActiveSaveSlotIndex();
  const summaries = getBundleSlotSummaries(bundle);
  const activeEntry = summaries[activeIx];
  const careerRows = getSlotCareerSummaryRows(
    normalizeSlotCareerStats(activeEntry?.career ?? createEmptySlotCareerStats()),
  );
  const runsStarted = careerRows.find((row) => row.label === "开局次数")?.value ?? "0";
  const levelHint =
    activeEntry?.meta?.levelId != null ? String(activeEntry.meta.levelId) : "无存档";
  const moneyHint =
    activeEntry?.meta?.money != null ? `$${activeEntry.meta.money}` : "";
  const savedAt = activeEntry?.meta?.savedAt ?? bundle.exportedAt;
  const summary = `槽位 ${activeIx + 1} · ${levelHint}${moneyHint ? ` · ${moneyHint}` : ""} · 开局 ${runsStarted} 次`;
  const extra = `savedAt=${savedAt};exportedAt=${bundle.exportedAt};appVersion=${bundle.appVersion}`;

  return {
    archiveName: CLOUD_ARCHIVE_NAME,
    archiveSummary: summary.slice(0, 240) || "单词大师云存档",
    archiveExtra: extra.slice(0, 480),
    archivePlaytime: Math.max(0, Math.floor(Number(activeEntry?.career?.runsStarted) || 0)),
  };
}

/** @param {number} exportedAt */
export function formatCloudSaveTimestamp(exportedAt) {
  const ts = Math.floor(Number(exportedAt) || 0);
  if (!ts) return "未知时间";
  return formatRelativeSaveTime(ts);
}
