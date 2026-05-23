/**
 * 从 public/favicon.png 生成 Android 启动图标（mipmap 各密度）。
 * 与 scripts/render-favicon.mjs 输出一致；改 favicon 后运行 npm run android:icons
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FAVICON = join(__dirname, "..", "public", "favicon.png");
const ANDROID_RES = join(__dirname, "..", "android", "app", "src", "main", "res");

/** @type {Record<string, { launcher: number; foreground: number }>} */
const DENSITIES = {
  mdpi: { launcher: 48, foreground: 108 },
  hdpi: { launcher: 72, foreground: 162 },
  xhdpi: { launcher: 96, foreground: 216 },
  xxhdpi: { launcher: 144, foreground: 324 },
  xxxhdpi: { launcher: 192, foreground: 432 },
};

if (!existsSync(FAVICON)) {
  console.error("未找到 public/favicon.png，请先运行 npm run favicon");
  process.exit(1);
}

const source = sharp(FAVICON);

for (const [density, sizes] of Object.entries(DENSITIES)) {
  const dir = join(ANDROID_RES, `mipmap-${density}`);
  const resizeOpts = { kernel: sharp.kernel.lanczos3, fit: "fill" };

  await source
    .clone()
    .resize(sizes.launcher, sizes.launcher, resizeOpts)
    .png({ compressionLevel: 9 })
    .toFile(join(dir, "ic_launcher.png"));

  await source
    .clone()
    .resize(sizes.launcher, sizes.launcher, resizeOpts)
    .png({ compressionLevel: 9 })
    .toFile(join(dir, "ic_launcher_round.png"));

  await source
    .clone()
    .resize(sizes.foreground, sizes.foreground, resizeOpts)
    .png({ compressionLevel: 9 })
    .toFile(join(dir, "ic_launcher_foreground.png"));

  console.log(`Wrote mipmap-${density} (launcher ${sizes.launcher}px, foreground ${sizes.foreground}px)`);
}

console.log("Android launcher icons updated from public/favicon.png");
