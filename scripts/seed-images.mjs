// Safran Sofrası demo tenant'ına Wikimedia Commons'tan GERÇEK yemek fotoğrafları seed'ler.
// Her ürüne 2 görsel hedefi. Görseller bizim sharp pipeline'ımızdan geçer (WebP varyantlar + LQIP).
// Lisans/atıf kayıtları: supabase/seed-image-credits.json
//
// Kullanım:  SUPABASE_ACCESS_TOKEN=sbp_... node scripts/seed-images.mjs
// Önkoşul:   .uploads-dev (UPLOADS_DIR) yazılabilir; tsx gerekmiyor (images-core'u dinamik derlemek
//            yerine pipeline burada sharp ile birebir aynı parametrelerle uygulanır — tek kaynak
//            images-core.ts'tir, parametre değişirse BURAYI da güncelle).

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_REF = "rvxyycfpeqalcaibvjpc";
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.resolve(".uploads-dev");
const UA = "AlgowQRMenuSeeder/1.0 (info@algow.net)";
const VARIANTS = [200, 640, 1280];

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN gerekli");
  process.exit(1);
}

sharp.concurrency(1);

/** Ürün adı (TR, seed ile birebir) → Commons arama sorguları (öncelik sırasıyla) */
const QUERIES = {
  "Serpme Kahvaltı (2 Kişilik)": ["Turkish breakfast spread", "Van breakfast", "kahvaltı"],
  "Menemen": ["Menemen dish", "Menemen eggs"],
  "Sigara Böreği (6 Adet)": ["Sigara böreği", "fried börek rolls", "börek"],
  "Bal Kaymak": ["kaymak honey", "clotted cream honey turkish"],
  "Avokadolu Yumurta Tost": ["avocado toast egg", "avocado toast"],
  "Mercimek Çorbası": ["Mercimek çorbası", "red lentil soup"],
  "Ezogelin Çorbası": ["Ezogelin soup", "lentil bulgur soup", "lentil soup"],
  "İşkembe Çorbası": ["İşkembe çorbası", "tripe soup"],
  "Acılı Ezme": ["Acılı ezme", "ezme salad", "Turkish meze tomato"],
  "Humus": ["Hummus plate", "Hummus tahini"],
  "Paçanga Böreği": ["Paçanga böreği", "börek pastırma", "fried börek"],
  "Karides Güveç": ["shrimp casserole", "gambas al ajillo", "garlic prawns"],
  "Çıtır Kalamar": ["fried calamari", "calamari rings"],
  "Adana Kebap": ["Adana kebabı", "Adana kebab"],
  "Urfa Kebap": ["Urfa kebab", "minced meat kebab skewer"],
  "Kuzu Şiş": ["lamb shish kebab", "şiş kebap", "lamb skewers grilled"],
  "Tavuk Şiş": ["chicken shish kebab", "tavuk şiş", "grilled chicken skewers"],
  "Karışık Izgara (2 Kişilik)": ["mixed grill kebab platter", "kebab platter", "Turkish grill plate"],
  "Izgara Levrek": ["grilled sea bass", "grilled fish plate"],
  "Kıymalı Pide": ["kıymalı pide", "Turkish pide meat"],
  "Kaşarlı Pide": ["kaşarlı pide", "cheese pide", "pide"],
  "Kuşbaşılı Kaşarlı Pide": ["kuşbaşılı pide", "pide cheese meat", "Turkish pide"],
  "Sucuklu Yumurtalı Pide": ["sucuklu pide", "sucuk pide", "pide egg"],
  "Çoban Salata": ["çoban salatası", "shepherd salad", "Turkish salad tomato cucumber"],
  "Roka Salatası": ["arugula salad parmesan", "rocket salad"],
  "Izgara Tavuklu Sezar": ["chicken caesar salad", "caesar salad"],
  "Künefe": ["Künefe", "kanafeh pistachio", "kanafeh"],
  "Fıstıklı Baklava (4 Dilim)": ["pistachio baklava", "baklava"],
  "Fırın Sütlaç": ["sütlaç", "fırın sütlaç", "baked rice pudding"],
  "Katmer": ["katmer pistachio", "katmer dessert"],
  "Mevsim Meyveleri": ["fruit platter", "fresh fruit plate"],
  "Çay": ["Turkish tea glass", "çay ince belli bardak"],
  "Türk Kahvesi": ["Turkish coffee cup", "türk kahvesi fincan"],
  "Ayran": ["Ayran glass", "Ayran drink"],
  "Ev Yapımı Limonata": ["lemonade mint glass", "homemade lemonade"],
};

const BAD_TITLE = /logo|map|diagram|chart|flag|coat of arms|festival|stamp|menu card|packag/i;

async function commonsSearch(query) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: "6",
    gsrlimit: "10",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "1600",
    format: "json",
  }).toString();

  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  const data = await res.json();
  const pages = Object.values(data?.query?.pages ?? {});

  return pages
    .map((p) => {
      const ii = p.imageinfo?.[0];
      if (!ii) return null;
      const md = ii.extmetadata ?? {};
      return {
        title: p.title,
        mime: ii.mime,
        width: ii.width,
        height: ii.height,
        thumbUrl: ii.thumburl ?? ii.url,
        sourceUrl: ii.descriptionurl,
        author: (md.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 120),
        license: md.LicenseShortName?.value ?? "?",
      };
    })
    .filter(Boolean)
    .filter(
      (c) =>
        (c.mime === "image/jpeg" || c.mime === "image/png") &&
        c.width >= 800 &&
        c.width / c.height >= 0.65 &&
        c.width / c.height <= 2.4 &&
        !BAD_TITLE.test(c.title)
    )
    // yataylar + büyükler öne
    .sort((a, b) => (b.width >= b.height ? 1 : 0) - (a.width >= a.height ? 1 : 0) || b.width - a.width);
}

async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`indirme ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** images-core.ts pipeline'ının birebir kopyası (parametreler eşit tutulmalı) */
async function processImage(input) {
  const id = randomUUID();
  const relStem = `t/${TENANT_ID}/${id}`;
  const absDir = path.join(UPLOADS_DIR, "t", TENANT_ID);
  await mkdir(absDir, { recursive: true });

  const base = sharp(input, { failOn: "error" }).rotate();
  const meta = await base.metadata();

  await base
    .clone()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(absDir, `${id}-orig.jpg`));

  for (const w of VARIANTS) {
    await base
      .clone()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: w <= 200 ? 72 : 78 })
      .toFile(path.join(absDir, `${id}-${w}.webp`));
  }

  const lqip = await base.clone().resize({ width: 12 }).webp({ quality: 30 }).toBuffer();
  const scale = Math.min(1, 1280 / meta.width);
  return {
    fileStem: relStem,
    width: Math.round(meta.width * scale),
    height: Math.round(meta.height * scale),
    blurData: `data:image/webp;base64,${lqip.toString("base64")}`,
  };
}

async function dbQuery(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`DB ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

/* ============================ akış ============================ */

console.log("1) Ürün listesi çekiliyor…");
const products = await dbQuery(
  `select id, name->>'tr' as ad from public.products where tenant_id = '${TENANT_ID}' order by created_at`
);
console.log(`   ${products.length} ürün`);

console.log("2) Mevcut demo görselleri temizleniyor (DB satırları + dosyalar)…");
await dbQuery(`delete from public.product_images where tenant_id = '${TENANT_ID}'`);
await rm(path.join(UPLOADS_DIR, "t", TENANT_ID), { recursive: true, force: true });

const usedTitles = new Set();
const credits = {};
const inserts = [];
let okCount = 0;
let missing = [];

for (const { id: productId, ad } of products) {
  const queries = QUERIES[ad];
  if (!queries) {
    console.warn(`   ⚠ sorgu haritasında yok: ${ad}`);
    missing.push(ad);
    continue;
  }

  const picked = [];
  for (const q of queries) {
    if (picked.length >= 2) break;
    try {
      const candidates = await commonsSearch(q);
      for (const c of candidates) {
        if (picked.length >= 2) break;
        if (usedTitles.has(c.title)) continue;
        picked.push(c);
        usedTitles.add(c.title);
      }
    } catch (e) {
      console.warn(`   ⚠ arama hatası "${q}": ${e.message}`);
    }
  }

  if (picked.length === 0) {
    console.warn(`   ✗ ${ad}: hiç aday yok`);
    missing.push(ad);
    continue;
  }

  let sort = 10;
  credits[ad] = [];
  for (const c of picked) {
    try {
      const buf = await download(c.thumbUrl);
      const img = await processImage(buf);
      inserts.push(
        `('${productId}','${TENANT_ID}','${img.fileStem}',${img.width},${img.height},'${img.blurData}',${sort})`
      );
      credits[ad].push({
        file: img.fileStem,
        commons: c.title,
        author: c.author || "bilinmiyor",
        license: c.license,
        source: c.sourceUrl,
      });
      sort += 10;
      okCount++;
      console.log(`   ✓ ${ad} ← ${c.title} [${c.license}]`);
    } catch (e) {
      console.warn(`   ⚠ ${ad} işleme hatası: ${e.message}`);
    }
  }
  if (picked.length === 1) console.warn(`   ◐ ${ad}: tek görsel bulunabildi`);
}

console.log(`3) ${inserts.length} görsel DB'ye yazılıyor…`);
for (let i = 0; i < inserts.length; i += 25) {
  const chunk = inserts.slice(i, i + 25);
  await dbQuery(
    `insert into public.product_images (product_id, tenant_id, file_stem, width, height, blur_data, sort_order) values ${chunk.join(",")}`
  );
}

await writeFile(
  path.resolve("supabase/seed-image-credits.json"),
  JSON.stringify({ generated: "seed-images.mjs", source: "Wikimedia Commons", products: credits }, null, 2),
  "utf8"
);

console.log("──────────────────────────────");
console.log(`Bitti: ${okCount} görsel yüklendi (${products.length} ürün).`);
if (missing.length) console.log(`Eksik kalanlar: ${missing.join(", ")}`);
console.log("Atıflar: supabase/seed-image-credits.json");
