// Mevcut upload görsellerine 960w varyantı ekler (pipeline'a 960 eklendi — 2026-06-13).
// Yeni upload'lar varyantı otomatik alır; bu script geriye dönük tamamlar.
// Kullanım: node scripts/add-960-variant.mjs [uploadsDir]   (varsayılan: .uploads-dev)

import { readdir, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.argv[2] ?? ".uploads-dev";

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let made = 0, skipped = 0;
for await (const file of walk(root)) {
  if (!file.endsWith("-orig.jpg")) continue;
  const target = file.replace(/-orig\.jpg$/, "-960.webp");
  try {
    await access(target);
    skipped++;
    continue;
  } catch {}
  await sharp(file)
    .resize({ width: 960, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(target);
  made++;
  console.log("✓", path.relative(root, target));
}
console.log(`bitti: ${made} üretildi, ${skipped} zaten vardı`);
