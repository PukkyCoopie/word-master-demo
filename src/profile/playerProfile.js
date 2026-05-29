import { reactive } from "vue";
import { clampSaveSlotIndex, SAVE_SLOT_COUNT } from "../save/runSaveSchema.js";

const STORAGE_KEY = "word_master_player_profile_v1";
const PROFILE_SCHEMA_VERSION = 2;
const DISPLAY_NAME_MAX = 16;
const AVATAR_MAX_BYTES = 80 * 1024;
const AVATAR_SIZE = 128;

/** @typedef {'none' | 'taptap' | 'upload'} AvatarSource */

/** @typedef {Object} SlotProfile
 * @property {string} displayName
 * @property {string | null} avatarDataUrl
 * @property {AvatarSource} avatarSource
 * @property {boolean} initialized
 */

/** @type {import('vue').Reactive<SlotProfile>[]} */
const slotProfiles = reactive(Array.from({ length: SAVE_SLOT_COUNT }, () => createDefaultSlotProfile()));

/** 当前活跃槽位的展示副本，供 UI 绑定。 */
export const playerProfile = reactive({
  schemaVersion: PROFILE_SCHEMA_VERSION,
  displayName: "Player",
  avatarDataUrl: null,
  avatarSource: "none",
  initialized: false,
  activeSaveSlotIndex: 0,
});

/** @returns {SlotProfile} */
function createDefaultSlotProfile() {
  return {
    displayName: "Player",
    avatarDataUrl: null,
    avatarSource: "none",
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
  if (raw.avatarDataUrl != null && String(raw.avatarDataUrl).startsWith("data:image/")) {
    prof.avatarDataUrl = String(raw.avatarDataUrl);
  }
  const src = String(raw.avatarSource ?? "none");
  prof.avatarSource = src === "taptap" || src === "upload" ? src : "none";
  prof.initialized = raw.initialized === true;
  return prof;
}

/** @param {number} index */
function syncReactiveFromSlot(index) {
  const prof = slotProfiles[clampSaveSlotIndex(index)];
  playerProfile.displayName = prof.displayName;
  playerProfile.avatarDataUrl = prof.avatarDataUrl;
  playerProfile.avatarSource = prof.avatarSource;
  playerProfile.initialized = prof.initialized;
}

/** @param {number} index */
function syncSlotFromReactive(index) {
  const ix = clampSaveSlotIndex(index);
  const prof = slotProfiles[ix];
  prof.displayName = playerProfile.displayName;
  prof.avatarDataUrl = playerProfile.avatarDataUrl;
  prof.avatarSource = playerProfile.avatarSource;
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
          avatarDataUrl: parsed.avatarDataUrl,
          avatarSource: parsed.avatarSource,
          initialized: parsed.initialized,
        }),
      );
    }

    syncReactiveFromSlot(getActiveSaveSlotIndex());
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
          avatarDataUrl: prof.avatarDataUrl,
          avatarSource: prof.avatarSource,
          initialized: prof.initialized,
        })),
      }),
    );
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
  syncSlotFromReactive(getActiveSaveSlotIndex());
  persistPlayerProfile();
}

/** @param {number} [slotIndex] */
export function clearAvatar(slotIndex = getActiveSaveSlotIndex()) {
  const ix = clampSaveSlotIndex(slotIndex);
  const prof = slotProfiles[ix];
  prof.avatarDataUrl = null;
  prof.avatarSource = "none";
  if (ix === getActiveSaveSlotIndex()) {
    playerProfile.avatarDataUrl = null;
    playerProfile.avatarSource = "none";
  }
  persistPlayerProfile();
}

/**
 * @param {string} url
 * @param {'taptap' | 'upload'} source
 * @param {number} [slotIndex]
 */
export function setAvatarDataUrl(url, source, slotIndex = getActiveSaveSlotIndex()) {
  const ix = clampSaveSlotIndex(slotIndex);
  const prof = slotProfiles[ix];
  const s = String(url ?? "");
  if (!s.startsWith("data:image/")) {
    clearAvatar(ix);
    return false;
  }
  if (s.length > AVATAR_MAX_BYTES * 1.4) return false;
  prof.avatarDataUrl = s;
  prof.avatarSource = source;
  if (ix === getActiveSaveSlotIndex()) {
    playerProfile.avatarDataUrl = s;
    playerProfile.avatarSource = source;
  }
  persistPlayerProfile();
  return true;
}

/**
 * @param {string} imageUrl
 * @param {number} [slotIndex]
 * @returns {Promise<boolean>}
 */
export async function fetchAvatarAsDataUrl(imageUrl, slotIndex = getActiveSaveSlotIndex()) {
  const url = String(imageUrl ?? "").trim();
  if (!url) return false;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const blob = await res.blob();
    const file = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
    return setAvatarFromFile(file, "taptap", slotIndex);
  } catch {
    return false;
  }
}

/**
 * @param {File} file
 * @param {'taptap' | 'upload'} [source='upload']
 * @param {number} [slotIndex]
 * @returns {Promise<boolean>}
 */
export function setAvatarFromFile(file, source = "upload", slotIndex = getActiveSaveSlotIndex()) {
  return new Promise((resolve) => {
    if (!file || !String(file.type ?? "").startsWith("image/")) {
      resolve(false);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(false);
          return;
        }
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
        let quality = 0.85;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > AVATAR_MAX_BYTES * 1.4 && quality > 0.4) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        if (dataUrl.length > AVATAR_MAX_BYTES * 1.4) {
          resolve(false);
          return;
        }
        resolve(setAvatarDataUrl(dataUrl, source, slotIndex));
      };
      img.onerror = () => resolve(false);
      img.src = String(reader.result ?? "");
    };
    reader.onerror = () => resolve(false);
    reader.readAsDataURL(file);
  });
}

/**
 * 将指定槽位的展示名与头像重置为 TapTap 账号信息；无 TapTap 时为 Player + 无头像。
 * @param {import('../taptap/tapTapPlugin.js').TapTapAccount | null} account
 * @param {number} [slotIndex]
 */
export async function applyProfileDefaultsFromTapTap(account, slotIndex = getActiveSaveSlotIndex()) {
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

  if (account?.avatar) {
    const avatarOk = await fetchAvatarAsDataUrl(account.avatar, ix);
    if (!avatarOk) clearAvatar(ix);
  } else {
    clearAvatar(ix);
  }

  if (ix === getActiveSaveSlotIndex()) {
    syncReactiveFromSlot(ix);
  }
  persistPlayerProfile();
}

/**
 * @param {import('../taptap/tapTapPlugin.js').TapTapAccount | null} account
 */
export async function initializeProfileFromTapTap(account) {
  const ix = getActiveSaveSlotIndex();
  if (slotProfiles[ix].initialized) return;
  await applyProfileDefaultsFromTapTap(account, ix);
}

/** @param {number} [slotIndex] @returns {string} */
export function getProfileInitialLetter(slotIndex = getActiveSaveSlotIndex()) {
  const n = getSlotProfile(slotIndex).displayName.trim();
  if (!n) return "P";
  return n.charAt(0).toUpperCase();
}
