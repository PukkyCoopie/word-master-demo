import { reactive } from "vue";
import { isSlotOccupied, getSlotCareer, getSlotPayload } from "../save/runSaveStorage.js";
import { clampSaveSlotIndex, SAVE_SLOT_COUNT, createEmptySlotCareerStats } from "../save/runSaveSchema.js";
import { normalizeSlotCareerStats } from "../save/slotCareerStats.js";
import { hasMeaningfulRunProgress } from "../save/runSaveMeaningfulProgress.js";

const STORAGE_KEY = "word_master_player_profile_v1";
const PROFILE_SCHEMA_VERSION = 6;
const DISPLAY_NAME_MAX = 16;

/** @typedef {Object} SlotProfile
 * @property {string} displayName
 * @property {boolean} initialized
 * @property {boolean} firstWordTutorialCompleted
 * @property {import('./slotExperienceMode.js').SlotExperienceMode | null} [experienceMode]
 */

/** @type {boolean} */
let pendingLegacyGlobalTutorialCompleted = false;

/** @type {import('vue').Reactive<SlotProfile>[]} */
const slotProfiles = reactive(Array.from({ length: SAVE_SLOT_COUNT }, () => createDefaultSlotProfile()));

/** 当前活跃槽位的展示副本，供 UI 绑定。 */
export const playerProfile = reactive({
  schemaVersion: PROFILE_SCHEMA_VERSION,
  displayName: "Player",
  initialized: false,
  activeSaveSlotIndex: 0,
});

/** @param {unknown} raw @returns {import('./slotExperienceMode.js').SlotExperienceMode | null} */
function normalizeExperienceModeField(raw) {
  if (raw === "classic" || raw === "casual") return raw;
  return null;
}

/** @returns {SlotProfile} */
function createDefaultSlotProfile() {
  return {
    displayName: "Player",
    initialized: false,
    firstWordTutorialCompleted: false,
    experienceMode: null,
  };
}

/** @param {unknown} raw @returns {SlotProfile} */
function normalizeSlotProfile(raw) {
  const prof = createDefaultSlotProfile();
  if (!raw || typeof raw !== "object") return prof;
  if (typeof raw.displayName === "string" && raw.displayName.trim()) {
    prof.displayName = normalizeDisplayName(raw.displayName);
  }
  prof.initialized = raw.initialized === true;
  prof.firstWordTutorialCompleted = raw.firstWordTutorialCompleted === true;
  prof.experienceMode = normalizeExperienceModeField(raw.experienceMode);
  return prof;
}

/** @param {number} index */
function syncReactiveFromSlot(index) {
  const prof = slotProfiles[clampSaveSlotIndex(index)];
  playerProfile.displayName = prof.displayName;
  playerProfile.initialized = prof.initialized;
}

/** @param {number} index */
function syncSlotFromReactive(index) {
  const ix = clampSaveSlotIndex(index);
  const prof = slotProfiles[ix];
  prof.displayName = playerProfile.displayName;
  prof.initialized = playerProfile.initialized;
}

/** @param {number} forSlotIndex @returns {string} */
function allocateDefaultPlayerName(forSlotIndex) {
  const used = new Set();
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    if (i === forSlotIndex) continue;
    if (!slotProfiles[i].initialized) continue;
    used.add(slotProfiles[i].displayName);
  }
  if (!used.has("Player")) return "Player";
  for (let n = 2; n <= 99; n++) {
    const candidate = `Player${n}`;
    if (candidate.length > DISPLAY_NAME_MAX) break;
    if (!used.has(candidate)) return candidate;
  }
  return "Player";
}

/** @param {number} index */
export function isSlotProfileActivated(index) {
  return slotProfiles[clampSaveSlotIndex(index)].initialized === true;
}

/** @param {number} index @returns {SlotProfile} */
export function getSlotProfile(index) {
  return slotProfiles[clampSaveSlotIndex(index)];
}

export function getActiveSaveSlotIndex() {
  return clampSaveSlotIndex(playerProfile.activeSaveSlotIndex);
}

/** @param {number} index */
export function setActiveSaveSlotIndex(index) {
  const prev = getActiveSaveSlotIndex();
  const next = clampSaveSlotIndex(index);
  if (prev !== next) {
    syncSlotFromReactive(prev);
    playerProfile.activeSaveSlotIndex = next;
    syncReactiveFromSlot(next);
  }
  persistPlayerProfile();
  void import("./slotExperienceMode.js").then((m) => {
    m.syncWordHintModeFromSlotExperience(next);
  });
}

export function loadPlayerProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      syncReactiveFromSlot(0);
      return;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      syncReactiveFromSlot(0);
      return;
    }

    playerProfile.activeSaveSlotIndex = clampSaveSlotIndex(parsed.activeSaveSlotIndex);
    pendingLegacyGlobalTutorialCompleted = parsed.firstWordTutorialCompleted === true;

    if (Array.isArray(parsed.slotProfiles)) {
      for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
        Object.assign(slotProfiles[i], normalizeSlotProfile(parsed.slotProfiles[i]));
      }
    } else {
      for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
        Object.assign(slotProfiles[i], createDefaultSlotProfile());
      }
      const legacyIx = getActiveSaveSlotIndex();
      Object.assign(
        slotProfiles[legacyIx],
        normalizeSlotProfile({
          displayName: parsed.displayName,
          initialized: parsed.initialized,
        }),
      );
    }

    syncReactiveFromSlot(getActiveSaveSlotIndex());

    if (parsed.schemaVersion == null || parsed.schemaVersion < PROFILE_SCHEMA_VERSION) {
      persistPlayerProfile();
    }
  } catch {
    syncReactiveFromSlot(0);
  }
}

export function persistPlayerProfile() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: PROFILE_SCHEMA_VERSION,
        activeSaveSlotIndex: getActiveSaveSlotIndex(),
        slotProfiles: slotProfiles.map((prof) => ({
          displayName: prof.displayName,
          initialized: prof.initialized,
          firstWordTutorialCompleted: prof.firstWordTutorialCompleted === true,
          experienceMode: prof.experienceMode ?? null,
        })),
      }),
    );
    void import("../save/cloudSave/cloudSaveSync.js").then(({ markCloudSyncDirty }) => {
      markCloudSyncDirty();
    });
  } catch {
    /* quota */
  }
}

/** @param {unknown} name */
export function normalizeDisplayName(name) {
  const s = String(name ?? "").trim();
  if (!s) return "Player";
  return s.slice(0, DISPLAY_NAME_MAX);
}

/** @param {string} name */
export function setDisplayName(name) {
  playerProfile.displayName = normalizeDisplayName(name);
  playerProfile.initialized = true;
  syncSlotFromReactive(getActiveSaveSlotIndex());
  persistPlayerProfile();
}

/** 已有展示名或存档壳时补标 initialized，不覆盖 displayName。 */
export function ensureSlotProfileActivated(index) {
  const ix = clampSaveSlotIndex(index);
  const prof = slotProfiles[ix];
  if (prof.initialized) return;
  prof.initialized = true;
  if (ix === getActiveSaveSlotIndex()) {
    syncReactiveFromSlot(ix);
  }
  persistPlayerProfile();
}

/** 须在 loadSaveEnvelope 之后调用，修复 initialized 与存档壳不一致的旧数据。 */
export function repairSlotProfilesAfterLoad() {
  let changed = false;
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    const prof = slotProfiles[i];
    if (prof.initialized) continue;
    if (isSlotOccupied(i) || prof.displayName !== "Player") {
      prof.initialized = true;
      changed = true;
    }
  }
  if (pendingLegacyGlobalTutorialCompleted) {
    for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
      const prof = slotProfiles[i];
      if (prof.firstWordTutorialCompleted) continue;
      if (isSlotOccupied(i)) {
        prof.firstWordTutorialCompleted = true;
        changed = true;
      }
    }
    pendingLegacyGlobalTutorialCompleted = false;
  }
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    const prof = slotProfiles[i];
    if (!prof.firstWordTutorialCompleted) continue;
    if (isSlotOccupied(i)) continue;
    prof.firstWordTutorialCompleted = false;
    changed = true;
  }
  if (changed) {
    syncReactiveFromSlot(getActiveSaveSlotIndex());
    persistPlayerProfile();
  }
  void import("./slotExperienceMode.js").then((m) => {
    for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
      m.backfillSlotExperienceModeIfNeeded(i);
    }
    m.syncWordHintModeFromSlotExperience(getActiveSaveSlotIndex());
  });
}

/**
 * 将指定槽位的展示名重置为 TapTap 账号昵称；无 TapTap 时为默认 Player 名。
 * @param {import('../taptap/tapTapPlugin.js').TapTapAccount | null} account
 * @param {number} [slotIndex]
 */
export function applyProfileDefaultsFromTapTap(account, slotIndex = getActiveSaveSlotIndex()) {
  const ix = clampSaveSlotIndex(slotIndex);
  const prof = slotProfiles[ix];
  let name;
  if (account?.name && String(account.name).trim()) {
    name = normalizeDisplayName(account.name);
  } else {
    name = allocateDefaultPlayerName(ix);
  }
  prof.displayName = name;
  prof.initialized = true;

  if (ix === getActiveSaveSlotIndex()) {
    syncReactiveFromSlot(ix);
  }
  persistPlayerProfile();
}

/**
 * @param {import('../taptap/tapTapPlugin.js').TapTapAccount | null} account
 */
export function initializeProfileFromTapTap(account) {
  const ix = getActiveSaveSlotIndex();
  if (slotProfiles[ix].initialized) return;
  applyProfileDefaultsFromTapTap(account, ix);
}

/** @param {number} index */
export function resetSlotProfile(index) {
  const ix = clampSaveSlotIndex(index);
  Object.assign(slotProfiles[ix], createDefaultSlotProfile());
  if (ix === getActiveSaveSlotIndex()) {
    syncReactiveFromSlot(ix);
  }
  persistPlayerProfile();
}

/** @param {number} [slotIndex] @returns {boolean} */
export function isFirstWordTutorialCompleted(slotIndex = getActiveSaveSlotIndex()) {
  return slotProfiles[clampSaveSlotIndex(slotIndex)].firstWordTutorialCompleted === true;
}

/** @param {number} [slotIndex] */
export function markFirstWordTutorialCompleted(slotIndex = getActiveSaveSlotIndex()) {
  const ix = clampSaveSlotIndex(slotIndex);
  const prof = slotProfiles[ix];
  if (prof.firstWordTutorialCompleted) return;
  prof.firstWordTutorialCompleted = true;
  persistPlayerProfile();
}

/** @param {number} [slotIndex] */
export function resetFirstWordTutorialCompleted(slotIndex = getActiveSaveSlotIndex()) {
  slotProfiles[clampSaveSlotIndex(slotIndex)].firstWordTutorialCompleted = false;
  persistPlayerProfile();
}

/** 本地尚无实质游玩进度时，清除各槽位误标记的教程完成态。 */
export function resetFirstWordTutorialIfNoRunProgress() {
  let changed = false;
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    const career = normalizeSlotCareerStats(getSlotCareer(i) ?? createEmptySlotCareerStats());
    if (career.runsCompleted > 0 || career.runsWon > 0) continue;
    const payload = getSlotPayload(i);
    if (payload && hasMeaningfulRunProgress(payload)) continue;
    const prof = slotProfiles[i];
    if (!prof.firstWordTutorialCompleted) continue;
    prof.firstWordTutorialCompleted = false;
    changed = true;
  }
  if (changed) persistPlayerProfile();
}

/** @param {number} [slotIndex] @returns {string} */
export function getProfileInitialLetter(slotIndex = getActiveSaveSlotIndex()) {
  const n = getSlotProfile(slotIndex).displayName.trim();
  if (!n) return "P";
  return n.charAt(0).toUpperCase();
}

/** @param {number} [slotIndex] @returns {{ background: string }} */
export function getProfileInitialLetterStyle(slotIndex = getActiveSaveSlotIndex()) {
  const ch = getProfileInitialLetter(slotIndex).charCodeAt(0) || 80;
  const hue = (ch * 17) % 360;
  return { background: `hsl(${hue} 42% 62%)` };
}
