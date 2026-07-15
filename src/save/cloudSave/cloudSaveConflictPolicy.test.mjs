import test from "node:test";
import assert from "node:assert/strict";
import {
  CLOUD_SAVE_AUTO_LOCAL_MAX_LEAD_MS,
  compareSlotRunProgress,
  getBundleContentNewestAt,
  getSlotRunFingerprint,
  shouldAutoResolveConflictPreferLocal,
} from "./cloudSaveConflictPolicy.js";
import { createEmptySaveEnvelope, createEmptySlotCareerStats } from "../runSaveSchema.js";

const UNION = "union_test";

/** @param {Partial<import('../runSavePayload.js').RunSavePayload>} payloadPatch @param {number} savedAt */
function makeSlot(payloadPatch, savedAt) {
  return {
    savedAt,
    appVersion: "1.3.10",
    meta: {
      seedDisplay: payloadPatch.runSeedDisplay ?? "SEED",
      levelId: "2-1",
      money: payloadPatch.money ?? 10,
      isEndlessRun: false,
      phase: payloadPatch.phase ?? "playing",
      ownedTreasureEmojis: [null, null, null, null, null],
      savedAt,
    },
    career: createEmptySlotCareerStats(),
    payload: {
      runSeedNumeric: 12345,
      runSeedDisplay: "SEED",
      rngState: 1,
      deckCardUidSeq: 1,
      levelIndex: 6,
      isEndlessRun: false,
      glyphShopSkipLevelAdvance: false,
      money: 10,
      phase: "playing",
      activeSlotIndex: 0,
      deckState: { cards: [], deckUids: [], grid: [], ownedUpgrades: [] },
      ownedTreasures: [],
      ownedVoucherIds: [],
      treasureRunState: {},
      spellCastHistory: [],
      lastReplayableSpellId: null,
      usedWordLengthsThisBoss: [],
      mouthLockedLengthBoss: null,
      clubRequiredKeyBoss: null,
      pillarUsedDeckUids: [],
      verdantTreasureSold: false,
      crimsonTreasureDisabledSlotIndex: null,
      pendingBossSlugOverride: "",
      settlementSnapshot: null,
      shopOffers: [],
      packOffers: [],
      shopVoucherShelf: null,
      shopRerollsThisVisit: 0,
      shopVoucherShelfGeneration: -1,
      packPickSession: null,
      bossRerollSession: null,
      runMatchStats: {},
      achievementRunState: {},
      runEndOutcome: "fail",
      runPresetId: "preset_01",
      runDifficultyIndex: 0,
      runDiscoveryLog: [],
      ...payloadPatch,
    },
  };
}

/** @param {import('../runSaveSchema.js').RunSaveSlot | null} slot0 @param {number} exportedAt */
function makeBundle(slot0, exportedAt) {
  const envelope = createEmptySaveEnvelope();
  envelope.slots[0] = slot0;
  return {
    bundleVersion: 1,
    appVersion: "1.3.10",
    exportedAt,
    unionId: UNION,
    runSaves: envelope,
    playerProfile: null,
    gameSettings: { uiScalePercent: 100 },
  };
}

test("shouldAutoResolveConflictPreferLocal: 本机同局更晚存档、云端滞后", () => {
  const cloudAt = 1_000_000;
  const localAt = cloudAt + 60_000;
  const slot = { levelIndex: 6, phase: "playing", runSeedDisplay: "ABC", runSeedNumeric: 99 };
  const localBundle = makeBundle(makeSlot(slot, localAt), Date.now());
  const cloudBundle = makeBundle(makeSlot(slot, cloudAt), cloudAt);

  assert.equal(
    shouldAutoResolveConflictPreferLocal({
      localBundle,
      cloudBundle,
      unionId: UNION,
      meta: { lastSyncedUnionId: UNION, conflictDeferred: false, lastConflictCloudExportedAt: null },
    }),
    true,
  );
});

test("shouldAutoResolveConflictPreferLocal: 云端同局关卡更前时不静默", () => {
  const cloudAt = 1_000_000;
  const localAt = cloudAt + 60_000;
  const localBundle = makeBundle(
    makeSlot({ levelIndex: 5, runSeedDisplay: "ABC", runSeedNumeric: 99 }, localAt),
    Date.now(),
  );
  const cloudBundle = makeBundle(
    makeSlot({ levelIndex: 8, runSeedDisplay: "ABC", runSeedNumeric: 99 }, cloudAt),
    cloudAt,
  );

  assert.equal(
    shouldAutoResolveConflictPreferLocal({
      localBundle,
      cloudBundle,
      unionId: UNION,
      meta: { lastSyncedUnionId: UNION, conflictDeferred: false, lastConflictCloudExportedAt: null },
    }),
    false,
  );
});

test("shouldAutoResolveConflictPreferLocal: 同槽不同种子须弹窗", () => {
  const ts = 1_000_000;
  const localBundle = makeBundle(
    makeSlot({ levelIndex: 5, runSeedDisplay: "AAA", runSeedNumeric: 1 }, ts + 1000),
    Date.now(),
  );
  const cloudBundle = makeBundle(
    makeSlot({ levelIndex: 5, runSeedDisplay: "BBB", runSeedNumeric: 2 }, ts + 2000),
    ts + 2000,
  );

  assert.equal(
    shouldAutoResolveConflictPreferLocal({
      localBundle,
      cloudBundle,
      unionId: UNION,
      meta: { lastSyncedUnionId: UNION, conflictDeferred: false, lastConflictCloudExportedAt: null },
    }),
    false,
  );
});

test("shouldAutoResolveConflictPreferLocal: 本机重开新局（同槽不同种子、本机更新）可静默", () => {
  const cloudAt = 1_000_000;
  const localAt = cloudAt + 5_000;
  const localBundle = makeBundle(
    makeSlot({ levelIndex: 3, runSeedDisplay: "NEW_RUN", runSeedNumeric: 2 }, localAt),
    Date.now(),
  );
  const cloudBundle = makeBundle(
    makeSlot({ levelIndex: 3, runSeedDisplay: "OLD_RUN", runSeedNumeric: 1 }, cloudAt),
    cloudAt,
  );

  assert.equal(
    shouldAutoResolveConflictPreferLocal({
      localBundle,
      cloudBundle,
      unionId: UNION,
      meta: { lastSyncedUnionId: UNION, conflictDeferred: false, lastConflictCloudExportedAt: null },
    }),
    true,
  );
});

test("shouldAutoResolveConflictPreferLocal: 未同步过此账号不静默", () => {
  const cloudAt = 1_000_000;
  const localAt = cloudAt + 1000;
  const slot = { levelIndex: 3, runSeedDisplay: "X", runSeedNumeric: 7 };
  const localBundle = makeBundle(makeSlot(slot, localAt), Date.now());
  const cloudBundle = makeBundle(makeSlot(slot, cloudAt), cloudAt);

  assert.equal(
    shouldAutoResolveConflictPreferLocal({
      localBundle,
      cloudBundle,
      unionId: UNION,
      meta: { lastSyncedUnionId: "other_account", conflictDeferred: false, lastConflictCloudExportedAt: null },
    }),
    false,
  );
});

test("compareSlotRunProgress: 同关本机进商店视为领先", () => {
  const base = { levelIndex: 10, runSeedDisplay: "S", runSeedNumeric: 1, meaningful: true, savedAt: 100 };
  assert.equal(
    compareSlotRunProgress(
      { ...base, phase: "shop", savedAt: 200 },
      { ...base, phase: "playing", savedAt: 100 },
    ),
    "local_ahead",
  );
});

test("getBundleContentNewestAt ignores local exportedAt by default", () => {
  const bundle = makeBundle(null, 9_999_999_999);
  assert.equal(getBundleContentNewestAt(bundle, { includeExportedAt: false }), 0);
  assert.equal(getBundleContentNewestAt(bundle, { includeExportedAt: true }), 9_999_999_999);
});

test("auto resolve max lead constant is one week", () => {
  assert.equal(CLOUD_SAVE_AUTO_LOCAL_MAX_LEAD_MS, 7 * 24 * 60 * 60 * 1000);
});
