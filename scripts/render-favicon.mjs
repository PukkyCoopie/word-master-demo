/**
 * 从 public/app-icon-source.png 缩放到 public/favicon.png（256×256）。
 * 改源图后运行 npm run favicon，再 npm run android:icons。
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(__dirname, "..", "public", "app-icon-source.png");
const OUT = join(__dirname, "..", "public", "favicon.png");
const OUT_SIZE = 256;

if (!existsSync(SOURCE)) {
  console.error("未找到 public/app-icon-source.png");
  process.exit(1);
}

await sharp(SOURCE)
  .resize(OUT_SIZE, OUT_SIZE, { kernel: sharp.kernel.lanczos3, fit: "fill" })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(`Wrote public/favicon.png (${OUT_SIZE}x${OUT_SIZE}) from app-icon-source.png`);
