// Seed görsel düzeltme turu — iki mod:
//   node scripts/fix-images.mjs --candidates          → her slot için adayları indir, kontak sayfası + candidates.json üret
//   node scripts/fix-images.mjs --apply "serpme1=2,ayran1=0,..."  → seçilen adayları uygula (eski satır+dosyalar silinir)
// SUPABASE_ACCESS_TOKEN gerekli.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_REF = "rvxyycfpeqalcaibvjpc";
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.resolve(".uploads-dev");
const UA = "AlgowQRMenuSeeder/1.0 (info@algow.net)";
const VARIANTS = [200, 640, 1280];
const QA_DIR = path.join(UPLOADS_DIR, "_qa");
const token = process.env.SUPABASE_ACCESS_TOKEN;

sharp.concurrency(1);

/** slot → { ürün adı (TR), değişecek mevcut image satırı id'si, aday sorguları }
 *  TUR 2 (2026-06-12): serpme1 (askeri etkinlik çıktı) + kalamar1 (sandviç çıktı)
 *  + limonata×2 ve baklava2 (tur-1 adayları zayıftı) */
const SLOTS = {
  // TUR 3: Commons kategori araması — serbest arama bu ikisinde saçmaladı
  serpme1:   { ad: "Serpme Kahvaltı (2 Kişilik)", oldId: "aa58ea22-5463-4b52-ad29-fc8c728539d1", q: ['incategory:"Breakfasts of Turkey"', 'incategory:"Breakfast foods of Turkey"', 'incategory:"Turkish cuisine" breakfast'] },
  baklava2:  { ad: "Fıstıklı Baklava (4 Dilim)",   oldId: "060bbfaa-7d01-42b3-9919-ffd0a2416963", q: ['incategory:"Baklava"', "baklava"] },
};

const BAD_TITLE = /logo|map|diagram|chart|flag|coat of arms|stamp|packag|factory|bottle plant/i;

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

async function commonsSearch(query) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query", generator: "search",
    gsrsearch: `filetype:bitmap ${query}`, gsrnamespace: "6", gsrlimit: "8",
    prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1600", format: "json",
  }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Commons ${res.status}`);
  const data = await res.json();
  return Object.values(data?.query?.pages ?? {})
    .map((p) => {
      const ii = p.imageinfo?.[0];
      if (!ii) return null;
      const md = ii.extmetadata ?? {};
      return {
        title: p.title, mime: ii.mime, width: ii.width, height: ii.height,
        thumbUrl: ii.thumburl ?? ii.url, sourceUrl: ii.descriptionurl,
        author: (md.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 120),
        license: md.LicenseShortName?.value ?? "?",
      };
    })
    .filter(Boolean)
    .filter((c) =>
      (c.mime === "image/jpeg" || c.mime === "image/png") &&
      c.width >= 700 && c.width / c.height >= 0.6 && c.width / c.height <= 2.5 &&
      !BAD_TITLE.test(c.title)
    );
}

async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`indirme ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const mode = process.argv[2];

/* ---------------- ADAY MODU ---------------- */
if (mode === "--candidates") {
  // mevcut kullanılan başlıkları dışla
  const credits = JSON.parse(await readFile("supabase/seed-image-credits.json", "utf8"));
  const used = new Set(Object.values(credits.products).flat().map((c) => c.commons));

  await mkdir(QA_DIR, { recursive: true });
  const all = {};
  const CELL = 200, LABEL_H = 30, COLS = 5;

  for (const [slot, def] of Object.entries(SLOTS)) {
    const cands = [];
    for (const q of def.q) {
      if (cands.length >= 5) break;
      try {
        for (const c of await commonsSearch(q)) {
          if (cands.length >= 5) break;
          if (used.has(c.title) || cands.some((x) => x.title === c.title)) continue;
          cands.push(c);
        }
      } catch (e) {
        console.warn(`⚠ ${slot} "${q}": ${e.message}`);
      }
    }
    all[slot] = cands;
    console.log(`${slot}: ${cands.length} aday`);
  }

  // kontak sayfaları (slot başına 1 satır: 5 aday)
  const slots = Object.keys(all);
  const W = COLS * CELL;
  const H = slots.length * (CELL + LABEL_H);
  const composites = [];
  for (let r = 0; r < slots.length; r++) {
    const slot = slots[r];
    for (let i = 0; i < all[slot].length; i++) {
      const c = all[slot][i];
      try {
        // küçük thumb iste (400px) — hızlı
        const thumb400 = c.thumbUrl.replace(/\/1600px-/, "/400px-");
        const buf = await download(thumb400).catch(() => download(c.thumbUrl));
        const img = await sharp(buf).resize(CELL, CELL, { fit: "cover" }).toBuffer();
        composites.push({ input: img, left: i * CELL, top: r * (CELL + LABEL_H) });
      } catch {}
    }
    const label = Buffer.from(
      `<svg width="${W}" height="${LABEL_H}"><rect width="100%" height="100%" fill="#111"/><text x="6" y="20" font-family="Arial" font-size="14" fill="#FFD66B" font-weight="bold">${slot} — ${SLOTS[slot].ad.replace(/&/g, "&amp;")} (0-4)</text></svg>`
    );
    composites.push({ input: label, left: 0, top: r * (CELL + LABEL_H) + CELL });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: "#222" } })
    .composite(composites).jpeg({ quality: 80 }).toFile(path.join(QA_DIR, "candidates.jpg"));
  await writeFile(path.join(QA_DIR, "candidates.json"), JSON.stringify(all, null, 1), "utf8");
  console.log(`Kontak: ${path.join(QA_DIR, "candidates.jpg")}`);
}

/* ---------------- UYGULAMA MODU ---------------- */
if (mode === "--apply") {
  const picks = Object.fromEntries(
    (process.argv[3] ?? "").split(",").filter(Boolean).map((s) => s.split("=").map((x) => x.trim()))
  );
  const all = JSON.parse(await readFile(path.join(QA_DIR, "candidates.json"), "utf8"));
  const creditsPath = "supabase/seed-image-credits.json";
  const credits = JSON.parse(await readFile(creditsPath, "utf8"));

  for (const [slot, idxStr] of Object.entries(picks)) {
    const def = SLOTS[slot];
    const cand = all[slot]?.[Number(idxStr)];
    if (!def || !cand) { console.warn(`⚠ atlandı: ${slot}=${idxStr}`); continue; }

    // eski satır (sort_order + product_id + file_stem)
    const [old] = await dbQuery(
      `select product_id, file_stem, sort_order from public.product_images where id = '${def.oldId}'`
    );
    if (!old) { console.warn(`⚠ eski satır yok: ${slot}`); continue; }

    // yeni görseli işle
    const buf = await download(cand.thumbUrl);
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

    // DB: sil + ekle (aynı product, aynı sort_order)
    await dbQuery(`delete from public.product_images where id = '${def.oldId}'`);
    await dbQuery(
      `insert into public.product_images (product_id, tenant_id, file_stem, width, height, blur_data, sort_order)
       values ('${old.product_id}','${TENANT_ID}','${relStem}',${Math.round(meta.width * scale)},${Math.round(meta.height * scale)},'data:image/webp;base64,${lqip.toString("base64")}',${old.sort_order})`
    );

    // eski dosyaları sil
    for (const f of [...VARIANTS.map((w) => `${old.file_stem}-${w}.webp`), `${old.file_stem}-orig.jpg`]) {
      await rm(path.join(UPLOADS_DIR, f), { force: true });
    }

    // credits güncelle
    const list = credits.products[def.ad] ?? [];
    const pos = list.findIndex((c) => c.file === old.file_stem);
    const entry = { file: relStem, commons: cand.title, author: cand.author || "bilinmiyor", license: cand.license, source: cand.sourceUrl };
    if (pos >= 0) list[pos] = entry; else list.push(entry);
    credits.products[def.ad] = list;

    console.log(`✓ ${slot}: ${cand.title} [${cand.license}]`);
  }

  await writeFile(creditsPath, JSON.stringify(credits, null, 2), "utf8");
  console.log("Bitti — revalidate etmeyi unutma.");
}
