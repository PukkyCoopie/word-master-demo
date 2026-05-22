/** 通关胜利彩带：偏大颗粒、中线偏下发射、飘落更慢更久 */

const WIN_CONFETTI_COLORS = Object.freeze([
  "#edc22e",
  "#f2c94c",
  "#6fcf97",
  "#56ccf2",
  "#bb6bd9",
  "#ffffff",
]);

/** @type {import('canvas-confetti').Options} */
const WIN_CONFETTI_BASE = {
  startVelocity: 36,
  gravity: 0.78,
  decay: 0.94,
  ticks: 520,
  scalar: 1.65,
  shapes: ["square", "circle"],
  colors: [...WIN_CONFETTI_COLORS],
  zIndex: 1,
};

/**
 * @param {(options: import('canvas-confetti').Options) => void} fire
 * @param {Partial<import('canvas-confetti').Options>} overrides
 */
function winBurst(fire, overrides) {
  fire({ ...WIN_CONFETTI_BASE, ...overrides });
}

/**
 * @param {(options: import('canvas-confetti').Options) => void} fire
 * @param {(fn: () => void, delayMs: number) => void} scheduleDelayed
 */
export function playRunEndWinConfettiBursts(fire, scheduleDelayed) {
  winBurst(fire, {
    particleCount: 48,
    spread: 54,
    angle: 62,
    origin: { x: 0.14, y: 0.5 },
  });
  winBurst(fire, {
    particleCount: 48,
    spread: 54,
    angle: 118,
    origin: { x: 0.86, y: 0.5 },
  });

  scheduleDelayed(() => {
    winBurst(fire, {
      particleCount: 72,
      spread: 82,
      angle: 90,
      origin: { x: 0.5, y: 0.44 },
    });
  }, 340);

  scheduleDelayed(() => {
    winBurst(fire, {
      particleCount: 40,
      spread: 58,
      angle: 72,
      origin: { x: 0.32, y: 0.54 },
    });
    winBurst(fire, {
      particleCount: 40,
      spread: 58,
      angle: 108,
      origin: { x: 0.68, y: 0.54 },
    });
  }, 780);
}
