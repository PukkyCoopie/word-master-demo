/**
 * 从 design/challenge-source.png 导出 256×256 WebP（成就占位 icon）。
 * 运行：node scripts/render-challenge-icon.mjs
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(__dirname, "..", "design", "challenge-source.png");
const OUT = join(__dirname, "..", "public", "images", "challenge.webp");
const OUT_SIZE = 256;

if (!existsSync(SOURCE)) {
  console.error("未找到 design/challenge-source.png");
  process.exit(1);
}

await sharp(SOURCE)
  .resize(OUT_SIZE, OUT_SIZE, { kernel: sharp.kernel.lanczos3, fit: "cover" })
  .webp({ quality: 90, effort: 6 })
  .toFile(OUT);

console.log(`Wrote public/images/challenge.webp (${OUT_SIZE}x${OUT_SIZE})`);
