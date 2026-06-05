import sharp from "sharp";
import { mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "images", "achievements");
const size = 1024;
const force = process.argv.includes("--force");

await mkdir(outDir, { recursive: true });

const SERIES_COLORS = {
  rare: {
    bg0: "#0c3f96",
    bg1: "#1b67d8",
    glow: "#39c8ff",
    stage: "#23427a",
    rim: "#9edfff",
    accent: "#9fe7ff",
  },
  epic: {
    bg0: "#50208a",
    bg1: "#8f48e7",
    glow: "#d78fff",
    stage: "#4b2868",
    rim: "#f0c4ff",
    accent: "#f8c4ff",
  },
  legendary: {
    bg0: "#b55a00",
    bg1: "#ffb320",
    glow: "#fff2a2",
    stage: "#7a4b10",
    rim: "#fff0b2",
    accent: "#ffe487",
  },
  jade: {
    bg0: "#146b53",
    bg1: "#2ebf89",
    glow: "#b4ffe4",
    stage: "#1d5a47",
    rim: "#dbfff3",
    accent: "#b9f5cb",
  },
  crimson: {
    bg0: "#8b2133",
    bg1: "#d94d6c",
    glow: "#ffb0c1",
    stage: "#6a2431",
    rim: "#ffd7de",
    accent: "#ffc0cb",
  },
  amber: {
    bg0: "#8f4f12",
    bg1: "#e69c34",
    glow: "#ffe3a5",
    stage: "#7a4d23",
    rim: "#fff1cb",
    accent: "#ffe19a",
  },
  slate: {
    bg0: "#33445f",
    bg1: "#607da4",
    glow: "#dbe7ff",
    stage: "#3f475d",
    rim: "#f1f4ff",
    accent: "#d5dfff",
  },
};

const discoveryPalettes = {
  all_treasures: SERIES_COLORS.legendary,
  all_spells: SERIES_COLORS.epic,
  all_upgrades: SERIES_COLORS.amber,
  all_vouchers: SERIES_COLORS.crimson,
  all_materials: SERIES_COLORS.jade,
  all_accessories: SERIES_COLORS.slate,
};

const tileLetters = ["A", "E", "I", "O", "R", "S", "T", "L", "N", "D", "U", "M", "C", "H", "Y", "G"];

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function defs(palette) {
  return `
    <defs>
      <radialGradient id="bgGlow" cx="50%" cy="38%" r="58%">
        <stop offset="0%" stop-color="${palette.glow}" stop-opacity="0.95" />
        <stop offset="54%" stop-color="${palette.bg1}" stop-opacity="0.72" />
        <stop offset="100%" stop-color="${palette.bg0}" stop-opacity="1" />
      </radialGradient>
      <linearGradient id="bgWash" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${palette.bg1}" />
        <stop offset="100%" stop-color="${palette.bg0}" />
      </linearGradient>
      <linearGradient id="stageTop" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${palette.stage}" />
        <stop offset="100%" stop-color="${rgba(palette.stage, 0.76)}" />
      </linearGradient>
      <linearGradient id="goldFace" x1="0%" y1="0%" x2="1" y2="1">
        <stop offset="0%" stop-color="#fce7bf" />
        <stop offset="1" stop-color="#edcd93" />
      </linearGradient>
      <linearGradient id="goldEdge" x1="0%" y1="0%" x2="1" y2="1">
        <stop offset="0%" stop-color="#c88b37" />
        <stop offset="1" stop-color="#8e5621" />
      </linearGradient>
      <linearGradient id="woodFace" x1="0%" y1="0%" x2="1" y2="1">
        <stop offset="0%" stop-color="#f7ebd1" />
        <stop offset="1" stop-color="#efd5aa" />
      </linearGradient>
      <linearGradient id="woodEdge" x1="0%" y1="0%" x2="1" y2="1">
        <stop offset="0%" stop-color="#bb7a35" />
        <stop offset="1" stop-color="#7a471d" />
      </linearGradient>
      <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="28" stdDeviation="20" flood-color="#000000" flood-opacity="0.24" />
      </filter>
      <filter id="tileShadow" x="-30%" y="-30%" width="180%" height="180%">
        <feDropShadow dx="0" dy="18" stdDeviation="14" flood-color="#000000" flood-opacity="0.22" />
      </filter>
      <filter id="sparkle" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="8" />
      </filter>
      <clipPath id="frameClip">
        <rect x="0" y="0" width="${size}" height="${size}" rx="72" ry="72" />
      </clipPath>
    </defs>
  `;
}

function frameBase(palette) {
  return `
    <g clip-path="url(#frameClip)">
      <rect width="${size}" height="${size}" fill="url(#bgWash)" />
      <rect width="${size}" height="${size}" fill="url(#bgGlow)" opacity="0.96" />
      <ellipse cx="512" cy="250" rx="260" ry="120" fill="${rgba(palette.accent, 0.12)}" filter="url(#sparkle)" />
      <ellipse cx="512" cy="770" rx="330" ry="90" fill="${rgba("#000000", 0.22)}" />
      <ellipse cx="512" cy="832" rx="354" ry="96" fill="#6d4220" filter="url(#softShadow)" />
      <ellipse cx="512" cy="812" rx="328" ry="84" fill="url(#stageTop)" stroke="${rgba(palette.rim, 0.3)}" stroke-width="8" />
    </g>
  `;
}

function sparkles(palette, count = 8) {
  return Array.from({ length: count }, (_, i) => {
    const x = 160 + ((i * 101) % 700);
    const y = 120 + ((i * 137) % 420);
    const r = 4 + (i % 3) * 3;
    return `<g opacity="${0.34 + (i % 4) * 0.12}">
      <circle cx="${x}" cy="${y}" r="${r * 1.8}" fill="${rgba(palette.rim, 0.22)}" filter="url(#sparkle)" />
      <circle cx="${x}" cy="${y}" r="${r}" fill="${palette.rim}" />
    </g>`;
  }).join("");
}

function tile({
  x,
  y,
  w = 174,
  h = 174,
  angle = 0,
  letter = "",
  pip = "#4aa3ff",
  pip2 = null,
  face = "url(#woodFace)",
  edge = "url(#woodEdge)",
  opacity = 1,
}) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const pipFill = pip2 ?? pip;
  return `
    <g transform="rotate(${angle} ${cx} ${cy})" opacity="${opacity}" filter="url(#tileShadow)">
      <rect x="${x}" y="${y + 18}" width="${w}" height="${h}" rx="30" fill="${edge}" />
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="30" fill="${face}" stroke="${rgba("#fff4dd", 0.72)}" stroke-width="8" />
      <rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${h - 28}" rx="22" fill="none" stroke="${rgba("#a56f2c", 0.35)}" stroke-width="4" />
      ${letter ? `<text x="${cx}" y="${y + h * 0.62}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${w * 0.46}" font-weight="700" fill="#5b5147">${esc(letter)}</text>` : ""}
      <circle cx="${x + 24}" cy="${y + h - 24}" r="${10}" fill="${pipFill}" stroke="${rgba("#ffffff", 0.48)}" stroke-width="3" />
    </g>
  `;
}

function star(cx, cy, rOuter, rInner = rOuter * 0.46, fill = "url(#goldFace)", stroke = "#c78529") {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = (-90 + i * 36) * (Math.PI / 180);
    const radius = i % 2 === 0 ? rOuter : rInner;
    points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`);
  }
  return `<polygon points="${points.join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="10" filter="url(#tileShadow)" />`;
}

function coin(x, y, r = 40, fill = "#ffd46e") {
  return `
    <g filter="url(#tileShadow)">
      <ellipse cx="${x}" cy="${y + 14}" rx="${r}" ry="${r * 0.34}" fill="${rgba("#9a5b15", 0.58)}" />
      <circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#c78529" stroke-width="10" />
      <circle cx="${x}" cy="${y}" r="${r * 0.62}" fill="none" stroke="${rgba("#fff1bb", 0.72)}" stroke-width="6" />
    </g>
  `;
}

function ribbon(x, y, w, h, fill, text, textColor = "#fff8f0") {
  const notch = Math.min(36, h * 0.36);
  return `
    <g filter="url(#tileShadow)">
      <path d="M ${x} ${y} H ${x + w - notch} L ${x + w} ${y + h / 2} L ${x + w - notch} ${y + h} H ${x} Z"
        fill="${fill}" stroke="${rgba("#ffffff", 0.2)}" stroke-width="6" />
      <text x="${x + w * 0.46}" y="${y + h * 0.62}" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="${h * 0.42}" font-weight="700" fill="${textColor}">${esc(text)}</text>
    </g>
  `;
}

function archway({ scale = 1, flag = true, stars = 1 }) {
  const x = 292;
  const y = 250;
  const w = 440 * scale;
  const h = 430 * scale;
  return `
    <g filter="url(#softShadow)">
      <ellipse cx="512" cy="${702 + (1 - scale) * 70}" rx="${220 * scale}" ry="${66 * scale}" fill="${rgba("#000000", 0.18)}" />
      <rect x="${x}" y="${y + 112}" width="${w}" height="${h - 112}" rx="${34 * scale}" fill="url(#woodFace)" stroke="${rgba("#b48a55", 0.5)}" stroke-width="${10 * scale}" />
      <path d="M ${x} ${y + 148} C ${x} ${y + 44}, ${x + w} ${y + 44}, ${x + w} ${y + 148}" fill="url(#woodFace)" stroke="${rgba("#b48a55", 0.5)}" stroke-width="${10 * scale}" />
      <rect x="${x + 128 * scale}" y="${y + 220 * scale}" width="${184 * scale}" height="${200 * scale}" rx="${92 * scale}" fill="${rgba("#d49f62", 0.34)}" />
      <rect x="${x + 164 * scale}" y="${y + 256 * scale}" width="${112 * scale}" height="${164 * scale}" rx="${56 * scale}" fill="${rgba("#fff4de", 0.85)}" />
      <circle cx="${512}" cy="${y + 142 * scale}" r="${64 * scale}" fill="${rgba("#6f879e", 0.9)}" />
      ${Array.from({ length: stars }, (_, i) => star(512 + (i - (stars - 1) / 2) * 72 * scale, y + 142 * scale, 34 * scale, 16 * scale)).join("")}
      <path d="M 416 760 C 456 722, 468 676, 512 650 C 560 622, 584 580, 620 544" fill="none" stroke="${rgba("#f6e2b6", 0.96)}" stroke-width="${72 * scale}" stroke-linecap="round" />
      <path d="M 418 760 C 462 724, 476 684, 518 656 C 560 628, 584 590, 620 554" fill="none" stroke="${rgba("#caa470", 0.42)}" stroke-width="${14 * scale}" stroke-linecap="round" />
      ${flag ? `
        <rect x="${744 * scale}" y="${420 * scale}" width="${18 * scale}" height="${244 * scale}" rx="${8 * scale}" fill="#8c5b32" />
        <path d="M ${760 * scale} ${434 * scale} C ${828 * scale} ${426 * scale}, ${860 * scale} ${450 * scale}, ${894 * scale} ${446 * scale}
          L ${894 * scale} ${522 * scale} C ${860 * scale} ${528 * scale}, ${824 * scale} ${560 * scale}, ${760 * scale} ${542 * scale} Z"
          fill="#6b879e" stroke="${rgba("#ffffff", 0.18)}" stroke-width="${8 * scale}" />
        ${star(832 * scale, 492 * scale, 28 * scale, 13 * scale)}
      ` : ""}
    </g>
  `;
}

function tilePile({ count = 10, rows = 3, width = 560, centerX = 512, baseY = 718, angleSpread = 18, letters = tileLetters }) {
  const pieces = [];
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const row = i % rows;
    const layer = Math.floor(i / rows);
    const x = centerX - width / 2 + lerp(0, width - 158, t) + ((row % 2) * 12 - 6);
    const y = baseY - layer * 82 - row * 36 - Math.sin(t * Math.PI) * 24;
    const angle = lerp(-angleSpread, angleSpread, t) + (row - 1) * 3;
    pieces.push(tile({
      x,
      y,
      w: 158,
      h: 158,
      angle,
      letter: letters[i % letters.length],
      pip: ["#58a9ff", "#ae75ff", "#ffb340", "#7ec79f", "#f06a9a"][i % 5],
    }));
  }
  return pieces.join("");
}

function wordScrolls({ count = 4, tier = "rare" }) {
  const words = tier === "legendary"
    ? ["MASTER", "LEGEND", "GLORY", "MYTHIC", "TREASURE"]
    : tier === "epic"
      ? ["STORY", "LETTER", "RHYME", "COMBO", "SPARK"]
      : ["WORD", "PLAY", "LUCK", "BONUS", "SPELL"];
  const fills = tier === "legendary"
    ? ["#ffb22c", "#e97e17", "#ffd470"]
    : tier === "epic"
      ? ["#9055ee", "#ba7bff", "#6431c7"]
      : ["#2a75e8", "#4cb7ff", "#1a4fb4"];
  const ribbons = Array.from({ length: count }, (_, i) => {
    const x = 238 + (i % 2) * 170 + i * 26;
    const y = 286 + i * 64;
    const w = 292 - (i % 2) * 18;
    return ribbon(x, y, w, 70, fills[i % fills.length], words[i % words.length], "#fff9f0");
  }).join("");
  const looseTiles = Array.from({ length: tier === "legendary" ? 8 : tier === "epic" ? 6 : 5 }, (_, i) =>
    tile({
      x: 226 + ((i * 94) % 530),
      y: 562 + ((i * 43) % 150),
      w: 110,
      h: 110,
      angle: -18 + (i % 5) * 8,
      letter: tileLetters[(i * 3) % tileLetters.length],
      pip: ["#58a9ff", "#ae75ff", "#ffb340"][i % 3],
    }),
  ).join("");
  return `
    <g>
      <g filter="url(#softShadow)">
        <path d="M 278 610 C 338 586, 404 582, 470 610 C 520 632, 560 632, 610 610 C 676 582, 742 586, 800 610 V 744
          C 738 718, 672 718, 610 742 C 560 760, 520 760, 470 742 C 406 718, 340 718, 278 744 Z"
          fill="#6d47c4" stroke="${rgba("#ffffff", 0.18)}" stroke-width="10" />
        <path d="M 504 602 V 744" stroke="${rgba("#ffffff", 0.18)}" stroke-width="8" />
        <path d="M 290 620 C 350 600, 408 602, 466 626" fill="none" stroke="${rgba("#ffffff", 0.18)}" stroke-width="8" />
        <path d="M 738 620 C 678 600, 620 602, 562 626" fill="none" stroke="${rgba("#ffffff", 0.18)}" stroke-width="8" />
      </g>
      ${ribbons}
      ${looseTiles}
    </g>
  `;
}

function binScene(level) {
  const tileCounts = { rare: 4, epic: 7, legendary: 11 };
  const palette = SERIES_COLORS[level];
  const pieces = Array.from({ length: tileCounts[level] }, (_, i) =>
    tile({
      x: 254 + ((i * 73) % 500),
      y: 356 + ((i * 59) % 320),
      w: 126,
      h: 126,
      angle: -34 + (i % 6) * 12,
      letter: tileLetters[(i * 2) % tileLetters.length],
      pip: palette.accent,
      opacity: 0.94,
    }),
  ).join("");
  return `
    <g>
      ${pieces}
      <g filter="url(#softShadow)">
        <path d="M 374 350 H 650 L 620 684 H 404 Z" fill="#6f7b89" />
        <path d="M 404 388 H 620 L 598 668 H 426 Z" fill="#4f5f70" stroke="${rgba("#ffffff", 0.16)}" stroke-width="8" />
        <rect x="430" y="286" width="164" height="42" rx="18" fill="#8090a4" />
        <rect x="398" y="314" width="228" height="34" rx="14" fill="#667487" />
      </g>
      <path d="M 266 268 C 294 330, 334 364, 392 402" fill="none" stroke="${rgba(palette.rim, 0.55)}" stroke-width="14" stroke-linecap="round" />
      <path d="M 738 278 C 694 340, 646 390, 590 420" fill="none" stroke="${rgba(palette.rim, 0.48)}" stroke-width="14" stroke-linecap="round" />
    </g>
  `;
}

function walletScene(kind) {
  if (kind === "wallet") {
    return `
      <g filter="url(#softShadow)">
        <path d="M 278 560 C 286 454, 356 384, 470 384 H 598 C 720 384, 792 462, 792 574
          C 792 688, 704 752, 576 752 H 420 C 322 752, 268 690, 278 560 Z"
          fill="#8c5127" />
        <path d="M 302 548 C 308 470, 366 418, 470 418 H 592 C 686 418, 758 472, 758 570
          C 758 670, 686 718, 566 718 H 430 C 338 718, 296 670, 302 548 Z"
          fill="url(#woodFace)" stroke="${rgba("#a76e36", 0.54)}" stroke-width="10" />
        <rect x="452" y="478" width="152" height="88" rx="30" fill="#5b8cb5" stroke="${rgba("#ffffff", 0.3)}" stroke-width="8" />
        ${coin(628, 438, 52)}
        ${coin(694, 500, 46)}
        ${coin(744, 572, 40)}
        ${star(530, 522, 40, 18)}
      </g>
    `;
  }

  if (kind === "interest") {
    return `
      <g filter="url(#softShadow)">
        <path d="M 312 652 H 712 V 700 H 312 Z" fill="${rgba("#6d4220", 0.55)}" />
        ${coin(392, 600, 78)}
        ${coin(520, 560, 88)}
        ${coin(650, 612, 72)}
        <path d="M 736 396 C 692 430, 682 494, 682 532" fill="none" stroke="${rgba("#ffffff", 0.58)}" stroke-width="20" stroke-linecap="round" />
        <path d="M 714 392 L 780 388 L 760 446" fill="none" stroke="${rgba("#ffffff", 0.58)}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />
      </g>
    `;
  }

  return `
    <g filter="url(#softShadow)">
      ${coin(430, 470, 58)}
      ${coin(550, 522, 54)}
      ${coin(664, 580, 50)}
      <path d="M 310 340 C 372 414, 450 468, 544 510" fill="none" stroke="${rgba("#ffe7a5", 0.82)}" stroke-width="24" stroke-linecap="round" />
      <path d="M 534 500 L 620 476 L 588 556" fill="${rgba("#ffe7a5", 0.82)}" />
      ${tile({ x: 312, y: 544, w: 182, h: 182, angle: -20, letter: "BUY", pip: "#f07b57", face: "#ffe4cb", edge: "#b95f28" })}
    </g>
  `;
}

function trophyScene(stars = 1, bannerText = "WIN") {
  return `
    <g filter="url(#softShadow)">
      <path d="M 424 340 H 600 V 396 C 600 464, 558 516, 512 538 C 466 516, 424 464, 424 396 Z" fill="url(#goldFace)" stroke="#be8634" stroke-width="12" />
      <path d="M 400 356 C 336 350, 320 430, 370 470" fill="none" stroke="#be8634" stroke-width="18" stroke-linecap="round" />
      <path d="M 624 356 C 688 350, 704 430, 654 470" fill="none" stroke="#be8634" stroke-width="18" stroke-linecap="round" />
      <rect x="486" y="534" width="52" height="82" rx="18" fill="#be8634" />
      <rect x="428" y="612" width="168" height="40" rx="18" fill="#7f5121" />
      <rect x="390" y="650" width="244" height="62" rx="24" fill="#5f3718" />
      ${Array.from({ length: stars }, (_, i) => star(432 + i * 80, 286 - Math.abs(i - 1) * 18, 30, 14)).join("")}
      ${ribbon(326, 728, 372, 88, "#255bc9", bannerText)}
    </g>
  `;
}

function wildcardScene() {
  const colors = ["#48b8ff", "#9e73ff", "#ffb33f", "#ff6c93", "#7ed6a5"];
  return `
    <g>
      ${Array.from({ length: 5 }, (_, i) =>
        tile({
          x: 210 + i * 120,
          y: 390 + Math.abs(2 - i) * 34,
          w: 156,
          h: 156,
          angle: -16 + i * 8,
          letter: "",
          pip: colors[i],
        }),
      ).join("")}
      ${Array.from({ length: 5 }, (_, i) => star(288 + i * 120, 466 + Math.abs(2 - i) * 32, 46, 22, colors[i], rgba("#ffffff", 0.65))).join("")}
      ${ribbon(278, 666, 468, 82, "#5b44d5", "WILD WORD")}
    </g>
  `;
}

function challengeScene(kind) {
  if (kind === "one_word") {
    return `
      <g>
        ${archway({ scale: 0.88, flag: true, stars: 1 })}
        ${tile({ x: 432, y: 566, w: 160, h: 160, angle: -3, letter: "WORD", pip: "#4cb7ff" })}
        ${ribbon(330, 736, 364, 78, "#2664d6", "ONE EACH")}
      </g>
    `;
  }
  if (kind === "no_discard") {
    return `
      <g>
        ${tilePile({ count: 8, rows: 3, width: 430, centerX: 474, baseY: 700, angleSpread: 10 })}
        <circle cx="742" cy="372" r="112" fill="${rgba("#f9f4e9", 0.16)}" stroke="${rgba("#ffffff", 0.55)}" stroke-width="20" />
        <path d="M 680 434 L 804 310" stroke="${rgba("#ffffff", 0.7)}" stroke-width="24" stroke-linecap="round" />
        <g filter="url(#softShadow)">
          <path d="M 674 492 H 814 L 796 660 H 692 Z" fill="#6a7889" />
          <rect x="706" y="450" width="76" height="24" rx="12" fill="#94a4b7" />
        </g>
      </g>
    `;
  }
  return `
    <g>
      ${tile({ x: 346, y: 448, w: 220, h: 220, angle: -6, letter: "SHOP", pip: "#ffb340" })}
      <g filter="url(#softShadow)">
        <path d="M 622 432 C 690 438, 750 486, 750 560 C 750 638, 694 692, 614 692" fill="none" stroke="${rgba("#f7f0df", 0.82)}" stroke-width="26" stroke-linecap="round" />
        <path d="M 640 384 L 768 402 L 700 492" fill="${rgba("#f7f0df", 0.82)}" />
      </g>
      <circle cx="734" cy="310" r="98" fill="none" stroke="${rgba("#ffffff", 0.68)}" stroke-width="22" />
      <path d="M 676 368 L 792 252" stroke="${rgba("#ffffff", 0.74)}" stroke-width="24" stroke-linecap="round" />
    </g>
  `;
}

function utilityScene(kind, tier = "rare") {
  const palette = SERIES_COLORS[tier];
  if (kind === "letter_score") {
    return `
      <g>
        ${tile({ x: 346, y: 386, w: 220, h: 220, angle: -6, letter: "A", pip: palette.accent })}
        ${Array.from({ length: 4 }, (_, i) => star(640 + Math.cos(i * (Math.PI / 6)) * 86, 480 + Math.sin(i * (Math.PI / 6)) * 66, 34, 15)).join("")}
      </g>
    `;
  }
  if (kind === "ice_break") {
    return `
      <g>
        ${tile({ x: 286, y: 422, w: 196, h: 196, angle: -10, letter: "ICE", pip: "#85e4ff", face: "#d6f7ff", edge: "#5fa6c8" })}
        ${tile({ x: 544, y: 422, w: 196, h: 196, angle: 10, letter: "ICE", pip: "#85e4ff", face: "#d6f7ff", edge: "#5fa6c8" })}
        <path d="M 512 370 L 472 468 L 536 468 L 494 610" fill="#f7fbff" stroke="${rgba("#7bc3ff", 0.7)}" stroke-width="10" stroke-linejoin="round" filter="url(#tileShadow)" />
      </g>
    `;
  }
  if (kind === "vouchers") {
    return `
      <g>
        ${Array.from({ length: 5 }, (_, i) =>
          ribbon(244 + i * 74, 390 + ((i % 2) * 24), 252, 84, ["#ff8d5d", "#ffb14f", "#6aa8ff", "#7ccf8d", "#c58cff"][i], "TICKET"),
        ).join("")}
        ${archway({ scale: 0.66, flag: true, stars: 1 })}
      </g>
    `;
  }
  if (kind === "length_level") {
    return `
      <g>
        ${ribbon(212, 398, 610, 96, "#2f78e5", "LONGER WORDS")}
        ${Array.from({ length: 6 }, (_, i) => tile({ x: 174 + i * 118, y: 558 + Math.abs(2.5 - i) * 22, w: 134, h: 134, angle: -10 + i * 4, letter: tileLetters[i] })).join("")}
        <circle cx="792" cy="298" r="84" fill="${rgba(palette.accent, 0.24)}" />
        <text x="792" y="322" text-anchor="middle" font-family="Arial, sans-serif" font-size="92" font-weight="800" fill="#fff7e8">10</text>
      </g>
    `;
  }
  if (kind === "rarity_level") {
    return `
      <g>
        ${Array.from({ length: 3 }, (_, i) => star(350 + i * 158, 532 - Math.abs(1 - i) * 56, 82 - Math.abs(1 - i) * 14, 34 - Math.abs(1 - i) * 6)).join("")}
        ${ribbon(306, 686, 404, 86, "#8a5de2", "RARITY")}
        <circle cx="762" cy="332" r="78" fill="${rgba("#ffffff", 0.18)}" />
        <text x="762" y="356" text-anchor="middle" font-family="Arial, sans-serif" font-size="86" font-weight="800" fill="#fff7e8">8</text>
      </g>
    `;
  }
  if (kind === "deck_big") {
    return `
      <g>
        ${tilePile({ count: 16, rows: 4, width: 500, centerX: 494, baseY: 710, angleSpread: 8 })}
        ${ribbon(352, 278, 318, 82, "#2a75e8", "100+")}
      </g>
    `;
  }
  return `
    <g>
      ${Array.from({ length: 5 }, (_, i) => tile({ x: 250 + i * 92, y: 480 + Math.abs(2 - i) * 16, w: 144, h: 144, angle: -14 + i * 7, letter: tileLetters[(i + 3) % tileLetters.length] })).join("")}
      ${ribbon(358, 300, 300, 82, "#dfa235", "LEAN")}
    </g>
  `;
}

function scoreScene(tier) {
  const numerals = { rare: "10K", epic: "1M", legendary: "100M" };
  const palette = SERIES_COLORS[tier];
  const rayCount = tier === "legendary" ? 12 : tier === "epic" ? 9 : 7;
  const tileCount = tier === "legendary" ? 6 : tier === "epic" ? 5 : 4;
  return `
    <g>
      ${star(500, 448, tier === "legendary" ? 176 : tier === "epic" ? 154 : 138, tier === "legendary" ? 76 : tier === "epic" ? 66 : 58)}
      <circle cx="500" cy="448" r="${tier === "legendary" ? 92 : tier === "epic" ? 84 : 76}" fill="${rgba(palette.bg0, 0.28)}" />
      ${Array.from({ length: rayCount }, (_, i) => {
        const angle = (i / rayCount) * Math.PI * 2;
        const x = 500 + Math.cos(angle) * 238;
        const y = 448 + Math.sin(angle) * 190;
        return `<path d="M 500 448 L ${x} ${y}" stroke="${rgba("#fff4c4", 0.5)}" stroke-width="${tier === "legendary" ? 18 : 14}" stroke-linecap="round" />`;
      }).join("")}
      ${Array.from({ length: tileCount }, (_, i) =>
        tile({
          x: 180 + i * 132,
          y: 552 + Math.abs(2 - i) * 24,
          w: 116,
          h: 116,
          angle: -16 + i * 7,
          letter: ["S", "C", "O", "R", "E", "!"][i],
          pip: ["#58a9ff", "#ae75ff", "#ffb340"][i % 3],
        }),
      ).join("")}
      ${ribbon(338, 706, 344, 84, tier === "legendary" ? "#da8a18" : tier === "epic" ? "#7a4adf" : "#2a75e8", numerals[tier])}
    </g>
  `;
}

function wordLengthScene(tier) {
  const words = {
    rare: ["R", "E", "A", "D", "I", "N", "G", "S", "!"],
    epic: ["E", "N", "C", "H", "A", "N", "T", "E", "D", "!", "!"],
    legendary: ["M", "A", "G", "N", "I", "F", "I", "C", "E", "N", "C", "E", "!", "!", "!", "!"],
  };
  const letters = words[tier];
  return letters.map((letter, i) =>
    tile({
      x: 100 + i * 48,
      y: 432 + Math.sin(i / 2) * 54,
      w: 118,
      h: 118,
      angle: -18 + i * 3,
      letter,
      pip: ["#58a9ff", "#b97cff", "#ffb341"][i % 3],
    }),
  ).join("");
}

function discoveryScene(kind) {
  switch (kind) {
    case "all_treasures":
      return `
        <g filter="url(#softShadow)">
          <path d="M 290 540 H 734 V 676 H 290 Z" fill="#6e401d" rx="24" />
          <path d="M 274 514 C 314 442, 418 398, 512 398 C 610 398, 712 444, 750 514 V 566 H 274 Z" fill="#945620" />
          <rect x="312" y="534" width="400" height="154" rx="26" fill="#8e4f1d" stroke="${rgba("#ffffff", 0.16)}" stroke-width="10" />
          ${coin(394, 502, 52)}
          ${coin(506, 468, 60)}
          ${coin(620, 508, 54)}
          ${star(512, 536, 54, 24)}
        </g>
      `;
    case "all_spells":
      return `
        <g filter="url(#softShadow)">
          <path d="M 318 408 C 386 382, 452 384, 512 426 C 574 384, 638 382, 706 408 V 712 C 642 686, 574 692, 512 726 C 452 692, 382 686, 318 712 Z" fill="#5d36a5" stroke="${rgba("#ffffff", 0.22)}" stroke-width="10" />
          <path d="M 512 426 V 726" stroke="${rgba("#ffffff", 0.18)}" stroke-width="8" />
          ${star(450, 526, 42, 18)}
          ${star(574, 502, 52, 22)}
          ${star(504, 614, 46, 20)}
        </g>
      `;
    case "all_upgrades":
      return `
        <g filter="url(#softShadow)">
          <rect x="380" y="502" width="264" height="162" rx="34" fill="#7b4d22" />
          <rect x="432" y="408" width="160" height="124" rx="28" fill="#dda54b" />
          <rect x="486" y="318" width="52" height="114" rx="20" fill="#f4cb6c" />
          <path d="M 512 292 L 586 384 H 548 V 464 H 476 V 384 H 438 Z" fill="#fff1bf" />
        </g>
      `;
    case "all_vouchers":
      return `
        <g>
          ${Array.from({ length: 6 }, (_, i) => ribbon(214 + (i % 3) * 170, 374 + Math.floor(i / 3) * 142, 260, 84, ["#d9536f", "#ffb14f", "#6aa8ff", "#87c98d", "#c58cff", "#ef7b52"][i], "PASS")).join("")}
        </g>
      `;
    case "all_materials":
      return `
        <g filter="url(#softShadow)">
          <path d="M 358 642 L 454 430 L 548 642 Z" fill="#88d4a4" />
          <path d="M 520 648 L 648 382 L 770 648 Z" fill="#5fd0e5" />
          <circle cx="328" cy="594" r="64" fill="#f0c25d" />
          <circle cx="656" cy="640" r="44" fill="#cf88ff" />
          <circle cx="476" cy="710" r="54" fill="#ff8a73" />
        </g>
      `;
    default:
      return `
        <g filter="url(#softShadow)">
          <circle cx="512" cy="564" r="138" fill="#6f86a8" />
          <circle cx="460" cy="530" r="54" fill="#ffe2a6" />
          <circle cx="566" cy="502" r="44" fill="#cba6ff" />
          <circle cx="592" cy="610" r="50" fill="#9ce0ff" />
          <path d="M 428 646 C 478 600, 548 600, 596 650" fill="none" stroke="${rgba("#fff8f0", 0.74)}" stroke-width="20" stroke-linecap="round" />
        </g>
      `;
  }
}

function difficultyScene(tier) {
  const starsCount = tier === "legendary" ? 3 : tier === "epic" ? 2 : 1;
  return `
    <g>
      <g filter="url(#softShadow)">
        <path d="M 212 722 C 322 602, 398 556, 470 486 C 514 446, 560 410, 614 366 C 650 462, 714 560, 814 722 Z" fill="${tier === "legendary" ? "#5b3518" : tier === "epic" ? "#4e2a6d" : "#224c89"}" />
        <path d="M 398 722 C 468 610, 540 546, 612 478 C 646 534, 694 610, 748 722 Z" fill="${tier === "legendary" ? "#7f4e22" : tier === "epic" ? "#7440b4" : "#2c72d8"}" />
        <rect x="614" y="304" width="18" height="250" rx="8" fill="#8f5b2f" />
        <path d="M 630 314 C 704 308, 752 334, 810 326 V 420 C 748 428, 704 462, 630 446 Z" fill="${tier === "legendary" ? "#ffb53a" : tier === "epic" ? "#b87cff" : "#5ebfff"}" />
      </g>
      ${Array.from({ length: starsCount }, (_, i) => star(734 + i * 54, 248 + Math.abs(1 - i) * 20, 28, 12)).join("")}
    </g>
  `;
}

const ICONS = {
  reach_4_1: { palette: SERIES_COLORS.rare, build: () => archway({ scale: 1, flag: true, stars: 1 }) },
  reach_8_1: { palette: SERIES_COLORS.legendary, build: () => archway({ scale: 1.02, flag: true, stars: 3 }) },
  win_run: { palette: SERIES_COLORS.legendary, build: () => trophyScene(3, "VICTORY") },
  words_50: { palette: SERIES_COLORS.rare, build: () => wordScrolls({ count: 3, tier: "rare" }) },
  words_100: { palette: SERIES_COLORS.epic, build: () => wordScrolls({ count: 4, tier: "epic" }) },
  words_200: { palette: SERIES_COLORS.legendary, build: () => wordScrolls({ count: 5, tier: "legendary" }) },
  discard_200: { palette: SERIES_COLORS.rare, build: () => binScene("rare") },
  discard_400: { palette: SERIES_COLORS.epic, build: () => binScene("epic") },
  discard_800: { palette: SERIES_COLORS.legendary, build: () => binScene("legendary") },
  wallet_400: { palette: SERIES_COLORS.amber, build: () => walletScene("wallet") },
  interest_200: { palette: SERIES_COLORS.jade, build: () => walletScene("interest") },
  spend_500: { palette: SERIES_COLORS.crimson, build: () => walletScene("spend") },
  all_wildcard_word: { palette: SERIES_COLORS.epic, build: wildcardScene },
  one_word_per_level_win: { palette: SERIES_COLORS.rare, build: () => challengeScene("one_word") },
  no_discard_win: { palette: SERIES_COLORS.jade, build: () => challengeScene("no_discard") },
  no_reroll_win: { palette: SERIES_COLORS.amber, build: () => challengeScene("no_reroll") },
  letter_score_4: { palette: SERIES_COLORS.rare, build: () => utilityScene("letter_score", "rare") },
  double_ice_break: { palette: SERIES_COLORS.slate, build: () => utilityScene("ice_break", "rare") },
  five_vouchers_at_4_1: { palette: SERIES_COLORS.crimson, build: () => utilityScene("vouchers", "rare") },
  length_level_10: { palette: SERIES_COLORS.rare, build: () => utilityScene("length_level", "rare") },
  rarity_level_8: { palette: SERIES_COLORS.epic, build: () => utilityScene("rarity_level", "epic") },
  score_10k: { palette: SERIES_COLORS.rare, build: () => scoreScene("rare") },
  score_1m: { palette: SERIES_COLORS.epic, build: () => scoreScene("epic") },
  score_100m: { palette: SERIES_COLORS.legendary, build: () => scoreScene("legendary") },
  word_len_9: { palette: SERIES_COLORS.rare, build: () => wordLengthScene("rare") },
  word_len_11: { palette: SERIES_COLORS.epic, build: () => wordLengthScene("epic") },
  word_len_16: { palette: SERIES_COLORS.legendary, build: () => wordLengthScene("legendary") },
  deck_100: { palette: SERIES_COLORS.rare, build: () => utilityScene("deck_big", "rare") },
  deck_40: { palette: SERIES_COLORS.legendary, build: () => utilityScene("deck_small", "legendary") },
  all_treasures: { palette: discoveryPalettes.all_treasures, build: () => discoveryScene("all_treasures") },
  all_spells: { palette: discoveryPalettes.all_spells, build: () => discoveryScene("all_spells") },
  all_upgrades: { palette: discoveryPalettes.all_upgrades, build: () => discoveryScene("all_upgrades") },
  all_vouchers: { palette: discoveryPalettes.all_vouchers, build: () => discoveryScene("all_vouchers") },
  all_materials: { palette: discoveryPalettes.all_materials, build: () => discoveryScene("all_materials") },
  all_accessories: { palette: discoveryPalettes.all_accessories, build: () => discoveryScene("all_accessories") },
  diff_3_win: { palette: SERIES_COLORS.rare, build: () => difficultyScene("rare") },
  diff_6_win: { palette: SERIES_COLORS.epic, build: () => difficultyScene("epic") },
  diff_8_win: { palette: SERIES_COLORS.legendary, build: () => difficultyScene("legendary") },
};

const seriesGenerated = {
  tiles_used_250: false,
  tiles_used_500: false,
  tiles_used_1000: false,
};

for (const [id, generated] of Object.entries(seriesGenerated)) {
  if (!generated && !existsSync(join(outDir, `${id}.png`))) {
    console.warn(`Expected approved source icon missing: ${id}.png`);
  }
}

function renderIconSvg(id, palette, content) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      ${defs(palette)}
      ${frameBase(palette)}
      ${sparkles(palette, 7)}
      ${content}
    </svg>
  `;
}

const existing = new Set(
  (await readdir(outDir)).filter((name) => name.toLowerCase().endsWith(".png")),
);

let written = 0;
let skipped = 0;

for (const [id, config] of Object.entries(ICONS)) {
  const outPath = join(outDir, `${id}.png`);
  if (!force && existing.has(`${id}.png`)) {
    skipped += 1;
    continue;
  }

  const svg = renderIconSvg(id, config.palette, config.build());
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outPath);
  written += 1;
}

console.log(`Achievement PNG icons generated: ${written} written, ${skipped} skipped.`);
