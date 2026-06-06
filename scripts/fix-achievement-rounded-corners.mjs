import sharp from "sharp";
import { copyFile, mkdir, readdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const defaultIconDir = join(rootDir, "public", "images", "achievements");
const defaultOutDir = join(rootDir, "tmp", "achievement-corner-fix");

const args = parseArgs(process.argv.slice(2));
const iconDir = args.dir ?? defaultIconDir;
const outDir = args.out ?? defaultOutDir;
const write = args.write === true;
const threshold = Number(args.threshold ?? 20);
const edgeThreshold = Number(args.edgeThreshold ?? 48);
const dilate = Number(args.dilate ?? 2);

if (!existsSync(iconDir)) {
  console.error(`Achievement icon directory does not exist: ${iconDir}`);
  process.exit(1);
}

if (!Number.isFinite(threshold) || !Number.isFinite(edgeThreshold) || !Number.isFinite(dilate)) {
  console.error("Invalid numeric option. Check --threshold, --edge-threshold, or --dilate.");
  process.exit(1);
}

if (!write) await mkdir(outDir, { recursive: true });

const backupDir = write
  ? join(rootDir, "tmp", `achievement-corner-backup-${timestampForPath(new Date())}`)
  : null;
if (backupDir) await mkdir(backupDir, { recursive: true });

const entries = await readdir(iconDir, { withFileTypes: true });
const pngFiles = entries
  .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".png")
  .map((entry) => entry.name)
  .sort();

let changed = 0;
let skipped = 0;

for (const file of pngFiles) {
  const source = join(iconDir, file);
  const { data, info } = await sharp(source).raw().toBuffer({ resolveWithObject: true });
  const mask = buildCornerMask(data, info, threshold);
  const expandedMask = expandMask(data, info, mask, Math.max(0, Math.round(dilate)), edgeThreshold);
  const maskCount = countMask(expandedMask);

  if (maskCount === 0) {
    skipped += 1;
    console.log(`${file}: skipped, no connected black corner pixels`);
    continue;
  }

  const fixed = inpaintByNeighborDiffusion(data, info, expandedMask);
  const tempOut = write
    ? join(iconDir, `.${basename(file, ".png")}.corner-fix.tmp.png`)
    : join(outDir, file);

  await sharp(fixed, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png({ compressionLevel: 9 })
    .toFile(tempOut);

  if (write) {
    await copyFile(source, join(backupDir, file));
    await rename(tempOut, source);
  }

  changed += 1;
  console.log(`${file}: fixed ${maskCount} corner pixels`);
}

if (write) {
  console.log(`Done. ${changed} PNG files overwritten, ${skipped} skipped.`);
  console.log(`Original PNG backup: ${backupDir}`);
  console.log("Run `npm run icons:sync` to refresh WebP files.");
} else {
  console.log(`Done. ${changed} fixed PNG files written, ${skipped} skipped.`);
  console.log(`Preview output: ${outDir}`);
  console.log("Add `--write` to overwrite PNGs after checking the preview.");
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--write") {
      out.write = true;
    } else if (a === "--dir") {
      out.dir = argv[++i];
    } else if (a === "--out") {
      out.out = argv[++i];
    } else if (a === "--threshold") {
      out.threshold = argv[++i];
    } else if (a === "--edge-threshold") {
      out.edgeThreshold = argv[++i];
    } else if (a === "--dilate") {
      out.dilate = argv[++i];
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown option: ${a}`);
      printHelp();
      process.exit(1);
    }
  }
  return out;
}

function printHelp() {
  console.log(`Usage:
  node scripts/fix-achievement-rounded-corners.mjs [options]

Options:
  --write                 Overwrite source PNGs after backing them up under tmp/
  --dir <path>            Source icon directory
  --out <path>            Preview output directory, default tmp/achievement-corner-fix
  --threshold <number>    Max RGB value treated as black for corner flood fill, default 20
  --edge-threshold <n>    Max RGB value for anti-aliased edge expansion, default 48
  --dilate <number>       Edge expansion passes, default 2
`);
}

function buildCornerMask(data, info, thresholdValue) {
  const total = info.width * info.height;
  const mask = new Uint8Array(total);
  const visited = new Uint8Array(total);
  const queue = [];
  const starts = [
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1],
  ];

  for (const [x, y] of starts) {
    const idx = y * info.width + x;
    if (isNearBlack(data, info.channels, idx, thresholdValue)) {
      visited[idx] = 1;
      mask[idx] = 1;
      queue.push(idx);
    }
  }

  for (let head = 0; head < queue.length; head += 1) {
    const idx = queue[head];
    const x = idx % info.width;
    const y = Math.floor(idx / info.width);
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height) continue;
      const nidx = ny * info.width + nx;
      if (visited[nidx]) continue;
      visited[nidx] = 1;
      if (!isNearBlack(data, info.channels, nidx, thresholdValue)) continue;
      mask[nidx] = 1;
      queue.push(nidx);
    }
  }

  return mask;
}

function expandMask(data, info, mask, passes, thresholdValue) {
  let current = mask;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Uint8Array(current);
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const idx = y * info.width + x;
        if (current[idx]) continue;
        if (!isNearBlack(data, info.channels, idx, thresholdValue)) continue;
        let touchesMask = false;
        for (let dy = -1; dy <= 1 && !touchesMask; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height) continue;
            if (current[ny * info.width + nx]) {
              touchesMask = true;
              break;
            }
          }
        }
        if (touchesMask) next[idx] = 1;
      }
    }
    current = next;
  }
  return current;
}

function inpaintByNeighborDiffusion(data, info, mask) {
  const out = Buffer.from(data);
  const pending = new Uint8Array(mask);
  let remaining = countMask(pending);
  const maxPasses = info.width + info.height;

  for (let pass = 0; remaining > 0 && pass < maxPasses; pass += 1) {
    const updates = [];
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const idx = y * info.width + x;
        if (!pending[idx]) continue;

        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        let weight = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height) continue;
            const nidx = ny * info.width + nx;
            if (pending[nidx]) continue;
            const w = dx !== 0 && dy !== 0 ? 0.707 : 1;
            const off = nidx * info.channels;
            r += out[off] * w;
            g += out[off + 1] * w;
            b += out[off + 2] * w;
            if (info.channels >= 4) a += out[off + 3] * w;
            weight += w;
          }
        }
        if (weight <= 0) continue;
        updates.push([idx, r / weight, g / weight, b / weight, info.channels >= 4 ? a / weight : null]);
      }
    }

    if (!updates.length) break;

    for (const [idx, r, g, b, a] of updates) {
      const off = idx * info.channels;
      out[off] = clampByte(r);
      out[off + 1] = clampByte(g);
      out[off + 2] = clampByte(b);
      if (info.channels >= 4 && a != null) out[off + 3] = clampByte(a);
      pending[idx] = 0;
    }
    remaining -= updates.length;
  }

  return out;
}

function isNearBlack(data, channels, pixelIndex, thresholdValue) {
  const off = pixelIndex * channels;
  return data[off] <= thresholdValue && data[off + 1] <= thresholdValue && data[off + 2] <= thresholdValue;
}

function countMask(mask) {
  let count = 0;
  for (const v of mask) count += v;
  return count;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function timestampForPath(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}
