import { reactive } from "vue";
import { clampSaveSlotIndex } from "../save/runSaveSchema.js";

const STORAGE_KEY = "word_master_player_profile_v1";
const DISPLAY_NAME_MAX = 16;
const AVATAR_MAX_BYTES = 80 * 1024;
const AVATAR_SIZE = 128;

/** @typedef {'none' | 'taptap' | 'upload'} AvatarSource */

/** @type {{ schemaVersion: number, displayName: string, avatarDataUrl: string | null, avatarSource: AvatarSource, initialized: boolean, activeSaveSlotIndex: number }} */
export const playerProfile = reactive({
  schemaVersion: 1,
  displayName: "Player",
  avatarDataUrl: null,
  avatarSource: "none",
  initialized: false,
  activeSaveSlotIndex: 0,
});

export function getActiveSaveSlotIndex() {
  return clampSaveSlotIndex(playerProfile.activeSaveSlotIndex);
}

/** @param {number} index */
export function setActiveSaveSlotIndex(index) {
  playerProfile.activeSaveSlotIndex = clampSaveSlotIndex(index);
  persistPlayerProfile();
}

export function loadPlayerProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;
    if (typeof parsed.displayName === "string" && parsed.displayName.trim()) {
      playerProfile.displayName = normalizeDisplayName(parsed.displayName);
    }
    if (parsed.avatarDataUrl != null && String(parsed.avatarDataUrl).startsWith("data:image/")) {
      playerProfile.avatarDataUrl = String(parsed.avatarDataUrl);
    } else {
      playerProfile.avatarDataUrl = null;
    }
    const src = String(parsed.avatarSource ?? "none");
    playerProfile.avatarSource = src === "taptap" || src === "upload" ? src : "none";
    playerProfile.initialized = parsed.initialized === true;
    playerProfile.activeSaveSlotIndex = clampSaveSlotIndex(parsed.activeSaveSlotIndex);
  } catch {
    /* ignore */
  }
}

export function persistPlayerProfile() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        displayName: playerProfile.displayName,
        avatarDataUrl: playerProfile.avatarDataUrl,
        avatarSource: playerProfile.avatarSource,
        initialized: playerProfile.initialized,
        activeSaveSlotIndex: playerProfile.activeSaveSlotIndex,
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
  persistPlayerProfile();
}

export function clearAvatar() {
  playerProfile.avatarDataUrl = null;
  playerProfile.avatarSource = "none";
  persistPlayerProfile();
}

/**
 * @param {string} url
 * @param {'taptap' | 'upload'} source
 */
export function setAvatarDataUrl(url, source) {
  const s = String(url ?? "");
  if (!s.startsWith("data:image/")) {
    clearAvatar();
    return false;
  }
  if (s.length > AVATAR_MAX_BYTES * 1.4) return false;
  playerProfile.avatarDataUrl = s;
  playerProfile.avatarSource = source;
  persistPlayerProfile();
  return true;
}

/**
 * @param {string} imageUrl
 * @returns {Promise<boolean>}
 */
export async function fetchAvatarAsDataUrl(imageUrl) {
  const url = String(imageUrl ?? "").trim();
  if (!url) return false;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const blob = await res.blob();
    const file = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
    return setAvatarFromFile(file, "taptap");
  } catch {
    return false;
  }
}

/**
 * @param {File} file
 * @param {'taptap' | 'upload'} [source='upload']
 * @returns {Promise<boolean>}
 */
export function setAvatarFromFile(file, source = "upload") {
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
        resolve(setAvatarDataUrl(dataUrl, source));
      };
      img.onerror = () => resolve(false);
      img.src = String(reader.result ?? "");
    };
    reader.onerror = () => resolve(false);
    reader.readAsDataURL(file);
  });
}

/**
 * @param {import('../taptap/tapTapPlugin.js').TapTapAccount | null} account
 */
export async function initializeProfileFromTapTap(account) {
  if (playerProfile.initialized) return;
  let name = "Player";
  let avatarOk = false;
  if (account?.name && String(account.name).trim()) {
    name = normalizeDisplayName(account.name);
  }
  playerProfile.displayName = name;
  playerProfile.initialized = true;
  persistPlayerProfile();
  if (account?.avatar) {
    avatarOk = await fetchAvatarAsDataUrl(account.avatar);
  }
  if (!avatarOk) {
    playerProfile.avatarSource = "none";
    playerProfile.avatarDataUrl = null;
    persistPlayerProfile();
  }
}

/** @returns {string} */
export function getProfileInitialLetter() {
  const n = playerProfile.displayName.trim();
  if (!n) return "P";
  return n.charAt(0).toUpperCase();
}
