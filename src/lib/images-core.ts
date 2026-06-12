// Saf sharp pipeline — hem server (lib/images.ts) hem seed script'leri kullanır.
// 'server-only' guard'ı lib/images.ts'te; bu dosya Node bağlamında import edilebilir.

import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const IMAGE_VARIANT_WIDTHS = [200, 640, 960, 1280] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGES_PER_TENANT = 400;

sharp.concurrency(1);

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

/** Magic byte kontrolü — MIME header'a güvenme */
export function sniffFormat(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP")
    return "webp";
  return null;
}

export interface ProcessedImage {
  /** DB'ye yazılan: "t/{tenantId}/{uuid}" — varyant yolları bundan türer */
  fileStem: string;
  width: number;
  height: number;
  blurData: string;
}

/**
 * Upload anında TÜM varyantlar üretilir (runtime optimizer YOK):
 *   {stem}-200.webp / -640.webp / -1280.webp + {stem}-orig.jpg (max 1600w) + 12px LQIP
 */
export async function processProductImageCore(
  input: Buffer,
  tenantId: string,
  uploadsDir: string
): Promise<ProcessedImage> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new Error("Dosya 10MB sınırını aşıyor");
  const format = sniffFormat(input);
  if (!format) throw new Error("Yalnızca JPG, PNG veya WebP yükleyin");

  const id = randomUUID();
  const relStem = `t/${tenantId}/${id}`;
  const absDir = path.join(uploadsDir, "t", tenantId);
  await mkdir(absDir, { recursive: true });

  const base = sharp(input, { failOn: "error" }).rotate(); // EXIF yönünü düzelt
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error("Görsel okunamadı");

  await base
    .clone()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(absDir, `${id}-orig.jpg`));

  for (const w of IMAGE_VARIANT_WIDTHS) {
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

/** Görsel satırı silinince dosyaları da kaldır (eksik dosya yutulur) */
export async function deleteImageFilesCore(fileStem: string, uploadsDir: string): Promise<void> {
  const targets = [
    ...IMAGE_VARIANT_WIDTHS.map((w) => `${fileStem}-${w}.webp`),
    `${fileStem}-orig.jpg`,
  ];
  await Promise.all(
    targets.map((rel) => unlink(path.join(uploadsDir, rel)).catch(() => undefined))
  );
}
