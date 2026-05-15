/**
 * 使用系统 Arial（优先 Bold）绘制 W，光栅化为 public/favicon.png。
 * 未找到字体时可设置环境变量 ARIAL_FONT 指向 .ttf
 */
import opentype from "opentype.js";
import sharp from "sharp";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "favicon.png");
const OUT_SIZE = 256;
const VIEW = 64;

function resolveArialPath() {
  const env = process.env.ARIAL_FONT;
  if (env && existsSync(env)) return env;
  const candidates = [
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/WINDOWS/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "/mnt/c/Windows/Fonts/arialbd.ttf",
    "/mnt/c/Windows/Fonts/arial.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Arial.ttf",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    "未找到 Arial 字体。请在 Windows 保留 arialbd.ttf，或设置环境变量 ARIAL_FONT 为 .ttf 路径。",
  );
}

const fontPath = resolveArialPath();
const fontBuf = readFileSync(fontPath);
const font = opentype.parse(fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength));

const fontSize = 38;
let path = font.getPath("W", 0, 0, fontSize);
const bb = path.getBoundingBox();
const cx = (bb.x1 + bb.x2) / 2;
const cy = (bb.y1 + bb.y2) / 2;
const targetX = VIEW / 2;
const targetY = VIEW / 2;
path = font.getPath("W", targetX - cx, targetY - cy, fontSize);
const wPathData = path.toPathData(2);

const pad = 2;
const rw = VIEW - pad * 2;
const rr = (9 / 54) * rw;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}">
  <rect x="${pad}" y="${pad}" width="${rw}" height="${rw}" rx="${rr}" ry="${rr}" fill="#eee4da"/>
  <path fill="#776e65" d="${wPathData}"/>
</svg>`;

const png = await sharp(Buffer.from(svg, "utf8"))
  .resize(OUT_SIZE, OUT_SIZE, { kernel: sharp.kernel.lanczos3, fit: "fill" })
  .png({ compressionLevel: 9 })
  .toBuffer();

writeFileSync(OUT, png);
console.log(`Wrote public/favicon.png (${OUT_SIZE}x${OUT_SIZE}) using ${fontPath}`);
