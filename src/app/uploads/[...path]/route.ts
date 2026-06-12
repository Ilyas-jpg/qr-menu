import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { uploadsRoot } from "@/lib/images";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

/**
 * /uploads/** servis köprüsü.
 * PROD: LiteSpeed bu yolu public_html/uploads'tan DOĞRUDAN servis eder — bu route'a hiç düşmez.
 * DEV (ve olası edge case'ler): UPLOADS_DIR'den stream eder.
 * Path traversal: normalize + kök kontrolü.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await params;
  const rel = parts.join("/");

  const root = uploadsRoot();
  const abs = path.normalize(path.join(root, rel));
  if (!abs.startsWith(path.normalize(root + path.sep))) {
    return new Response("Yasak", { status: 403 });
  }

  const ext = path.extname(abs).toLowerCase();
  const mime = MIME[ext];
  if (!mime || !existsSync(abs)) return new Response("Bulunamadı", { status: 404 });

  const stat = statSync(abs);
  const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream;

  return new Response(stream, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
