// QA kontak sayfası: tüm seed görsellerinin 200px thumb'larını indeks+ürün etiketli
// grid'lere dizer → .uploads-dev/_qa/sheet-N.jpg. Görsel inceleme için.
// Kullanım: SUPABASE_ACCESS_TOKEN=... node scripts/contact-sheet.mjs

import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_REF = "rvxyycfpeqalcaibvjpc";
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.resolve(".uploads-dev");
const token = process.env.SUPABASE_ACCESS_TOKEN;

const COLS = 5;
const CELL = 220;
const LABEL_H = 34;

const rows = await (async () => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `select i.id, i.file_stem, i.sort_order, p.name->>'tr' as ad
              from public.product_images i join public.products p on p.id = i.product_id
              where i.tenant_id = '${TENANT_ID}'
              order by p.created_at, i.sort_order`,
    }),
  });
  return JSON.parse(await res.text());
})();

console.log(`${rows.length} görsel`);
await mkdir(path.join(UPLOADS_DIR, "_qa"), { recursive: true });

const perSheet = COLS * 7;
for (let s = 0; s * perSheet < rows.length; s++) {
  const chunk = rows.slice(s * perSheet, (s + 1) * perSheet);
  const sheetRows = Math.ceil(chunk.length / COLS);
  const W = COLS * CELL;
  const H = sheetRows * (CELL + LABEL_H);

  const composites = [];
  for (let i = 0; i < chunk.length; i++) {
    const r = chunk[i];
    const x = (i % COLS) * CELL;
    const y = Math.floor(i / COLS) * (CELL + LABEL_H);
    const thumbPath = path.join(UPLOADS_DIR, `${r.file_stem}-200.webp`);
    try {
      const img = await sharp(thumbPath).resize(CELL, CELL, { fit: "cover" }).toBuffer();
      composites.push({ input: img, left: x, top: y });
    } catch {
      // eksik dosya — boş bırak
    }
    const globalIdx = s * perSheet + i;
    const label = Buffer.from(
      `<svg width="${CELL}" height="${LABEL_H}"><rect width="100%" height="100%" fill="#111"/><text x="6" y="22" font-family="Arial" font-size="15" fill="#fff" font-weight="bold">#${globalIdx} ${r.ad.slice(0, 20).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text></svg>`
    );
    composites.push({ input: label, left: x, top: y + CELL });
  }

  const out = path.join(UPLOADS_DIR, "_qa", `sheet-${s}.jpg`);
  await sharp({ create: { width: W, height: H, channels: 3, background: "#222" } })
    .composite(composites)
    .jpeg({ quality: 80 })
    .toFile(out);
  console.log(`yazıldı: ${out} (${chunk.length} hücre)`);
}

// indeks → id eşlemesi (silme/değiştirme için)
console.log(JSON.stringify(rows.map((r, i) => ({ i, ad: r.ad, id: r.id })), null, 0));
