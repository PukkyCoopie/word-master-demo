import sharp from "sharp";
import { readdir, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconDir = join(__dirname, "..", "public", "images", "achievements");

if (!existsSync(iconDir)) {
  console.log("Achievement icon directory does not exist, skipping sync.");
  process.exit(0);
}

const entries = await readdir(iconDir, { withFileTypes: true });
const pngFiles = entries
  .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".png")
  .map((entry) => entry.name)
  .sort();

const webpFiles = new Set(
  entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".webp")
    .map((entry) => entry.name),
);

let converted = 0;
let skipped = 0;
let removed = 0;

for (const file of pngFiles) {
  const pngPath = join(iconDir, file);
  const webpName = `${basename(file, ".png")}.webp`;
  const webpPath = join(iconDir, webpName);

  let shouldConvert = true;
  if (existsSync(webpPath)) {
    const [pngInfo, webpInfo] = await Promise.all([stat(pngPath), stat(webpPath)]);
    shouldConvert = pngInfo.mtimeMs > webpInfo.mtimeMs || pngInfo.size === 0 || webpInfo.size === 0;
  }

  if (shouldConvert) {
    await sharp(pngPath)
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 90, effort: 6 })
      .toFile(webpPath);
    converted += 1;
  } else {
    skipped += 1;
  }

  webpFiles.delete(webpName);
}

for (const staleWebp of webpFiles) {
  await rm(join(iconDir, staleWebp), { force: true });
  removed += 1;
}

console.log(
  `Achievement icons synced: ${converted} converted, ${skipped} unchanged, ${removed} stale webp removed.`,
);
