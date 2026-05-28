/** @type {{ clientX: number; clientY: number }} */
let last = {
  clientX: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
  clientY: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
};

let listenerCount = 0;

const LISTENER_OPTS = { passive: true, capture: true };

/** @param {number} clientX @param {number} clientY */
function setLast(clientX, clientY) {
  last = { clientX, clientY };
}

/** @param {PointerEvent} e */
function onPointerDownCapture(e) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  setLast(e.clientX, e.clientY);
}

/**
 * 鼠标仅在按键按下时跟手；触摸/笔在接触期间跟手。
 * 避免松手后的 mousemove 或悬停坐标覆盖本次点击（转场 play 常有 await）。
 */
/** @param {PointerEvent} e */
function onPointerMoveCapture(e) {
  if (e.pointerType === "mouse" && e.buttons === 0) return;
  setLast(e.clientX, e.clientY);
}

/** @param {TouchEvent} e */
function onTouchStartCapture(e) {
  const t = e.changedTouches[0] ?? e.touches[0];
  if (!t) return;
  setLast(t.clientX, t.clientY);
}

/** @param {MouseEvent} e */
function onClickCapture(e) {
  setLast(e.clientX, e.clientY);
}

/** 转场等效果取当前鼠标/指针位置（视口坐标） */
export function getLastPointerClientPoint() {
  return { clientX: last.clientX, clientY: last.clientY };
}

/**
 * 从交互事件写入最后触点（转场触发处、await 之前调用更稳）。
 * @param {MouseEvent | PointerEvent | TouchEvent | undefined | null} e
 */
export function recordPointerClientFromEvent(e) {
  if (!e) return;
  if ("changedTouches" in e && e.changedTouches?.length) {
    const t = e.changedTouches[0];
    setLast(t.clientX, t.clientY);
    return;
  }
  if ("touches" in e && e.touches?.length) {
    const t = e.touches[0];
    setLast(t.clientX, t.clientY);
    return;
  }
  if (typeof e.clientX === "number" && typeof e.clientY === "number") {
    setLast(e.clientX, e.clientY);
  }
}

/** @returns {() => void} */
export function attachLastPointerClientTracking() {
  if (typeof window === "undefined") return () => {};
  listenerCount += 1;
  if (listenerCount === 1) {
    window.addEventListener("pointerdown", onPointerDownCapture, LISTENER_OPTS);
    window.addEventListener("pointermove", onPointerMoveCapture, LISTENER_OPTS);
    window.addEventListener("touchstart", onTouchStartCapture, LISTENER_OPTS);
    window.addEventListener("click", onClickCapture, LISTENER_OPTS);
  }
  return () => {
    listenerCount -= 1;
    if (listenerCount <= 0) {
      listenerCount = 0;
      window.removeEventListener("pointerdown", onPointerDownCapture, LISTENER_OPTS);
      window.removeEventListener("pointermove", onPointerMoveCapture, LISTENER_OPTS);
      window.removeEventListener("touchstart", onTouchStartCapture, LISTENER_OPTS);
      window.removeEventListener("click", onClickCapture, LISTENER_OPTS);
    }
  };
}
