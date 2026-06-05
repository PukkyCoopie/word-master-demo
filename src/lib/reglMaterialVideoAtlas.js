import createREGL from "regl";
import { isGamePaused } from "../game/gamePause.js";
import { isMaterialBenchEnabled } from "../dev/materialBenchGate.js";
import { materialHubSubscribeTick, materialHubUnsubscribeTick } from "./reglMaterialTicker.js";
import { forceLoseWebglContext } from "./reglDebugLog.js";
import { MATERIAL_SHADER_MODULES } from "./reglMaterials/index.js";
import { reglHubWebglAttributes, reglOffscreenTexPx } from "./reglMaterialPerf.js";
import { executeReglHubDraw } from "./reglSubscriberAnimation.js";

const materialIndex = new Map(MATERIAL_SHADER_MODULES.map((mod, index) => [mod.MATERIAL_ID, index]));

/** @type {Map<string, Set<{ materialId: string, canvas: HTMLCanvasElement, video: HTMLVideoElement, animated: boolean, viewportVisible: boolean, prevDisplay: string, disposeBindings: () => void }>>} */
const subscribersByMaterial = new Map();

/** @type {{ canvas: HTMLCanvasElement, regl: import("regl").Regl, stream: MediaStream, track: CanvasCaptureMediaStreamTrack | null, texPx: number, drawByMaterial: Map<string, object> } | null} */
let atlasHub = null;
let tickRegistered = false;

function ensureSubscribersSet(materialId) {
  let set = subscribersByMaterial.get(materialId);
  if (!set) {
    set = new Set();
    subscribersByMaterial.set(materialId, set);
  }
  return set;
}

function ensureAtlasHub() {
  if (atlasHub) return atlasHub;
  if (typeof document === "undefined") {
    throw new Error("video atlas is only available in the browser");
  }

  const texPx = reglOffscreenTexPx();
  const canvas = document.createElement("canvas");
  canvas.width = texPx * MATERIAL_SHADER_MODULES.length;
  canvas.height = texPx;
  const captureStream = canvas.captureStream;
  if (typeof captureStream !== "function") {
    throw new Error("canvas.captureStream is unavailable");
  }

  const regl = createREGL({
    canvas,
    attributes: reglHubWebglAttributes(),
  });
  const drawByMaterial = new Map();
  for (const mod of MATERIAL_SHADER_MODULES) {
    drawByMaterial.set(mod.MATERIAL_ID, mod.createDraw(regl));
  }

  const stream = canvas.captureStream(0);
  const [track = null] = stream.getVideoTracks();
  atlasHub = {
    canvas,
    regl,
    stream,
    track: /** @type {CanvasCaptureMediaStreamTrack | null} */ (track),
    texPx,
    drawByMaterial,
  };
  drawAtlasFrame();
  requestAtlasFrame();
  publishVideoAtlasStats();
  return atlasHub;
}

function requestAtlasFrame() {
  try {
    atlasHub?.track?.requestFrame?.();
  } catch {
    // no-op
  }
}

function drawAtlasFrame() {
  const hub = atlasHub;
  if (!hub) return;
  for (const mod of MATERIAL_SHADER_MODULES) {
    const draw = hub.drawByMaterial.get(mod.MATERIAL_ID);
    const index = materialIndex.get(mod.MATERIAL_ID);
    if (!draw || typeof index !== "number") continue;
    executeReglHubDraw(hub.regl, draw, {
      x: index * hub.texPx,
      y: 0,
      width: hub.texPx,
      height: hub.texPx,
    });
  }
}

function shouldReceiveFrames(sub) {
  if (sub.animated === false) return false;
  if (sub.viewportVisible === false) return false;
  return true;
}

function anySubscriberNeedsTick() {
  for (const subs of subscribersByMaterial.values()) {
    for (const sub of subs) {
      if (shouldReceiveFrames(sub)) return true;
    }
  }
  return false;
}

function videoAtlasTick() {
  if (document.hidden || !atlasHub || !anySubscriberNeedsTick()) return;
  if (isGamePaused() && !isMaterialBenchEnabled()) return;
  drawAtlasFrame();
  requestAtlasFrame();
}

function ensureTick() {
  if (tickRegistered) return;
  tickRegistered = true;
  materialHubSubscribeTick(videoAtlasTick);
}

function stopTickIfIdle() {
  if (anySubscriberNeedsTick()) return;
  if (!tickRegistered) return;
  materialHubUnsubscribeTick(videoAtlasTick);
  tickRegistered = false;
}

function destroyAtlasHubIfIdle() {
  for (const subs of subscribersByMaterial.values()) {
    if (subs.size > 0) return;
  }
  if (!atlasHub) return;
  try {
    for (const track of atlasHub.stream.getTracks()) track.stop();
  } catch {
    // no-op
  }
  forceLoseWebglContext(atlasHub.regl, atlasHub.canvas);
  try {
    atlasHub.regl.destroy();
  } catch {
    // no-op
  }
  atlasHub = null;
  publishVideoAtlasStats();
}

function publishVideoAtlasStats() {
  try {
    let subscribers = 0;
    let visible = 0;
    for (const subs of subscribersByMaterial.values()) {
      subscribers += subs.size;
      for (const sub of subs) {
        if (sub.viewportVisible !== false) visible += 1;
      }
    }
    globalThis.__WM_MATERIAL_PIPELINE_STATS__ = {
      type: "video_atlas",
      contexts: atlasHub ? 1 : 0,
      subscribers,
      visible,
      atlas: atlasHub ? [atlasHub.canvas.width, atlasHub.canvas.height] : null,
      hasTrackRequestFrame: Boolean(atlasHub?.track?.requestFrame),
    };
  } catch {
    // no-op
  }
}

function copyCanvasClasses(canvas, video) {
  for (const cls of canvas.classList) {
    video.classList.add(cls);
  }
  video.classList.add("wm-material-video-atlas");
}

function styleVideoForMaterial(video, materialId) {
  const index = materialIndex.get(materialId) ?? 0;
  const count = MATERIAL_SHADER_MODULES.length;
  video.style.position = "absolute";
  video.style.left = `-${index * 100}%`;
  video.style.top = "0";
  video.style.width = `${count * 100}%`;
  video.style.height = "calc(100% + 1px)";
  video.style.maxWidth = "none";
  video.style.objectFit = "fill";
  video.style.pointerEvents = "none";
  video.style.borderRadius = "inherit";
  video.style.zIndex = "0";
}

function bindVideoVisibility(sub) {
  const cleanups = [];
  if (typeof IntersectionObserver !== "undefined") {
    const io = new IntersectionObserver((entries) => {
      sub.viewportVisible = entries.some((e) => e.isIntersecting);
      if (sub.viewportVisible && sub.animated) ensureTick();
      stopTickIfIdle();
      publishVideoAtlasStats();
    }, { threshold: 0 });
    io.observe(sub.video);
    cleanups.push(() => io.disconnect());
  }
  sub.disposeBindings = () => {
    for (const fn of cleanups) fn();
  };
}

/**
 * @param {string} materialId
 * @param {HTMLCanvasElement} canvas
 * @param {{ animated?: boolean }} [options]
 * @returns {() => void}
 */
export function attachVideoAtlasMaterial(materialId, canvas, options = {}) {
  const hub = ensureAtlasHub();
  const parent = canvas.parentElement;
  if (!parent) {
    throw new Error("material canvas has no parent for video atlas display");
  }

  const video = document.createElement("video");
  copyCanvasClasses(canvas, video);
  styleVideoForMaterial(video, materialId);
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.disablePictureInPicture = true;
  video.setAttribute("aria-hidden", "true");
  video.srcObject = hub.stream;
  parent.insertBefore(video, canvas);

  const prevDisplay = canvas.style.display;
  canvas.style.display = "none";
  void video.play().catch(() => {
    // Autoplay should be allowed for muted video; if it is not, the bench will expose it.
  });

  const sub = {
    materialId,
    canvas,
    video,
    animated: options.animated !== false,
    viewportVisible: true,
    prevDisplay,
    disposeBindings: () => {},
  };
  bindVideoVisibility(sub);
  ensureSubscribersSet(materialId).add(sub);
  if (sub.animated) ensureTick();
  publishVideoAtlasStats();

  return function disposeVideoAtlasMaterial() {
    sub.disposeBindings();
    subscribersByMaterial.get(materialId)?.delete(sub);
    stopTickIfIdle();
    try {
      video.pause();
      video.srcObject = null;
    } catch {
      // no-op
    }
    video.remove();
    canvas.style.display = sub.prevDisplay;
    destroyAtlasHubIfIdle();
    publishVideoAtlasStats();
  };
}

/**
 * @param {string} materialId
 * @param {HTMLCanvasElement} canvas
 * @param {boolean} animated
 * @returns {boolean}
 */
export function setVideoAtlasMaterialAnimated(materialId, canvas, animated) {
  const subs = subscribersByMaterial.get(materialId);
  if (!subs) return false;
  for (const sub of subs) {
    if (sub.canvas !== canvas) continue;
    sub.animated = animated;
    if (animated) ensureTick();
    stopTickIfIdle();
    publishVideoAtlasStats();
    return true;
  }
  return false;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (tickRegistered) {
      materialHubUnsubscribeTick(videoAtlasTick);
      tickRegistered = false;
    }
    for (const subs of subscribersByMaterial.values()) {
      for (const sub of subs) {
        sub.disposeBindings();
        try {
          sub.video.pause();
          sub.video.srcObject = null;
        } catch {
          // no-op
        }
        sub.video.remove();
        sub.canvas.style.display = sub.prevDisplay;
      }
    }
    subscribersByMaterial.clear();
    destroyAtlasHubIfIdle();
  });
}
