/**
 * 从 public/favicon.png 生成 Android 启动图标（mipmap）与开屏 splash（drawable*）。
 * 与 scripts/render-favicon.mjs 输出一致；改 favicon 后运行 npm run android:icons
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FAVICON = join(__dirname, "..", "public", "favicon.png");
const ANDROID_RES = join(__dirname, "..", "android", "app", "src", "main", "res");

/** 与 capacitor.config.json android.backgroundColor、WebView 背景一致 */
const SPLASH_BG = { r: 0xc4, g: 0xb7, b: 0xa6, alpha: 1 };

/** @type {Record<string, { width: number; height: number }>} */
const SPLASH_SCREENS = {
  drawable: { width: 480, height: 320 },
  "drawable-port-mdpi": { width: 320, height: 480 },
  "drawable-port-hdpi": { width: 480, height: 800 },
  "drawable-port-xhdpi": { width: 720, height: 1280 },
  "drawable-port-xxhdpi": { width: 960, height: 1600 },
  "drawable-port-xxxhdpi": { width: 1280, height: 1920 },
  "drawable-land-mdpi": { width: 480, height: 320 },
  "drawable-land-hdpi": { width: 800, height: 480 },
  "drawable-land-xhdpi": { width: 1280, height: 720 },
  "drawable-land-xxhdpi": { width: 1600, height: 960 },
  "drawable-land-xxxhdpi": { width: 1920, height: 1280 },
};

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

/**
 * @param {number} width
 * @param {number} height
 * @param {string} outPath
 */
async function writeSplash(width, height, outPath) {
  const logoSize = Math.round(Math.min(width, height) * 0.42);
  const logo = await source
    .clone()
    .resize(logoSize, logoSize, { kernel: sharp.kernel.lanczos3, fit: "fill" })
    .png()
    .toBuffer();

  await sharp({
    create: { width, height, channels: 4, background: SPLASH_BG },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

for (const [folder, { width, height }] of Object.entries(SPLASH_SCREENS)) {
  const outPath = join(ANDROID_RES, folder, "splash.png");
  await writeSplash(width, height, outPath);
  console.log(`Wrote ${folder}/splash.png (${width}x${height})`);
}

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

console.log("Android launcher icons and splash screens updated from public/favicon.png");
