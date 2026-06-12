import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { menuTag } from "@/lib/menu";

export const runtime = "nodejs";

/**
 * Manuel/ops revalidation: seed script'leri ve DB'ye doğrudan yazan akışlar için.
 * Normal admin akışı buna İHTİYAÇ DUYMAZ (server action'lar revalidateTag çağırır).
 *   POST /api/revalidate?secret=...&slug=safran-sofrasi
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const slug = url.searchParams.get("slug");

  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  if (!slug || !/^[a-z0-9-]{2,40}$/.test(slug)) {
    return NextResponse.json({ error: "Geçersiz slug" }, { status: 400 });
  }

  revalidateTag(menuTag(slug), { expire: 0 });
  return NextResponse.json({ ok: true, slug });
}
