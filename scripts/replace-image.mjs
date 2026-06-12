// Bir ürünün TÜM görsellerini tek yeni görselle değiştirir (ChatGPT serisi için).
// Kullanım: SUPABASE_ACCESS_TOKEN=... node scripts/replace-image.mjs "<ürün adı TR>" "<dosya yolu.png>"
// - sharp pipeline (200/640/1280 WebP + orig + LQIP) → .uploads-dev
// - eski product_images satırları silinir + dosyaları kaldırılır, yenisi sort=10 eklenir

import { mkdir, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_REF = "rvxyycfpeqalcaibvjpc";
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.resolve(".uploads-dev");
const VARIANTS = [200, 640, 1280];
const token = process.env.SUPABASE_ACCESS_TOKEN;

const [, , productName, filePath] = process.argv;
if (!token || !productName || !filePath) {
  console.error('Kullanım: node scripts/replace-image.mjs "Ürün Adı" "dosya.png"');
  process.exit(1);
}

sharp.concurrency(1);

async function dbQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`DB ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const esc = (s) => s.replaceAll("'", "''");

// 1) ürünü bul
const products = await dbQuery(
  `select id from public.products where tenant_id = '${TENANT_ID}' and name->>'tr' = '${esc(productName)}'`
);
if (!products?.length) {
  console.error(`Ürün bulunamadı: ${productName}`);
  process.exit(1);
}
const productId = products[0].id;

// 2) yeni görseli işle
const buf = readFileSync(filePath);
const id = randomUUID();
const relStem = `t/${TENANT_ID}/${id}`;
const absDir = path.join(UPLOADS_DIR, "t", TENANT_ID);
await mkdir(absDir, { recursive: true });

const base = sharp(buf, { failOn: "error" }).rotate();
const meta = await base.metadata();
await base.clone().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(absDir, `${id}-orig.jpg`));
for (const w of VARIANTS) {
  await base.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: w <= 200 ? 72 : 78 }).toFile(path.join(absDir, `${id}-${w}.webp`));
}
const lqip = await base.clone().resize({ width: 12 }).webp({ quality: 30 }).toBuffer();
const scale = Math.min(1, 1280 / meta.width);

// 3) eskileri sil (DB + dosyalar), yenisini ekle
const old = await dbQuery(`select file_stem from public.product_images where product_id = '${productId}'`);
await dbQuery(`delete from public.product_images where product_id = '${productId}'`);
for (const row of old ?? []) {
  for (const f of [...VARIANTS.map((w) => `${row.file_stem}-${w}.webp`), `${row.file_stem}-orig.jpg`]) {
    await rm(path.join(UPLOADS_DIR, f), { force: true });
  }
}
await dbQuery(
  `insert into public.product_images (product_id, tenant_id, file_stem, width, height, blur_data, sort_order)
   values ('${productId}','${TENANT_ID}','${relStem}',${Math.round(meta.width * scale)},${Math.round(meta.height * scale)},'data:image/webp;base64,${lqip.toString("base64")}',10)`
);

console.log(`✓ ${productName} ← ${path.basename(filePath)} (eski ${old?.length ?? 0} görsel silindi)`);
