import { reactive } from "vue";
import { isSlotOccupied } from "../save/runSaveStorage.js";
import { clampSaveSlotIndex, SAVE_SLOT_COUNT } from "../save/runSaveSchema.js";

const STORAGE_KEY = "word_master_player_profile_v1";
const PROFILE_SCHEMA_VERSION = 3;
const DISPLAY_NAME_MAX = 16;

/** @typedef {Object} SlotProfile
 * @property {string} displayName
 * @property {boolean} initialized
 */

/** @type {import('vue').Reactive<SlotProfile>[]} */
const slotProfiles = reactive(Array.from({ length: SAVE_SLOT_COUNT }, () => createDefaultSlotProfile()));

/** 当前活跃槽位的展示副本，供 UI 绑定。 */
export const playerProfile = reactive({
  schemaVersion: PROFILE_SCHEMA_VERSION,
  displayName: "Player",
  initialized: false,
  activeSaveSlotIndex: 0,
});

/** @returns {SlotProfile} */
function createDefaultSlotProfile() {
  return {
    displayName: "Player",
    initialized: false,
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
  if (changed) {
    syncReactiveFromSlot(getActiveSaveSlotIndex());
    persistPlayerProfile();
  }
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

/** @param {number} index @returns {string} */
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
