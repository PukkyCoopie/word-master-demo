/** @type {{ clientX: number; clientY: number }} */
let last = {
  clientX: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
  clientY: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
};

let listenerCount = 0;

/** @param {PointerEvent} e */
function onPointer(e) {
  last = { clientX: e.clientX, clientY: e.clientY };
}

/** 转场等效果取当前鼠标/指针位置（视口坐标） */
export function getLastPointerClientPoint() {
  return { clientX: last.clientX, clientY: last.clientY };
}

/** @returns {() => void} */
export function attachLastPointerClientTracking() {
  if (typeof window === "undefined") return () => {};
  listenerCount += 1;
  if (listenerCount === 1) {
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
  }
  return () => {
    listenerCount -= 1;
    if (listenerCount <= 0) {
      listenerCount = 0;
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
    }
  };
}
