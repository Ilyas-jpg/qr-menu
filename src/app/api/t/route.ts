import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { sessionHash } from "@/lib/session-hash";

export const runtime = "nodejs";

const EVENT_TYPES = [
  "qr_scan",
  "menu_view",
  "category_view",
  "product_view",
  "whatsapp_order_click",
  "lang_switch",
] as const;

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,40}$/),
  events: z
    .array(
      z.object({
        type: z.enum(EVENT_TYPES),
        product_id: z.uuid().nullable().optional(),
        category_id: z.uuid().nullable().optional(),
        lang: z.enum(["tr", "en"]).nullable().optional(),
        table_code: z.string().max(30).nullable().optional(),
      })
    )
    .min(1)
    .max(25), // batch cap
});

/**
 * Analitik ingest — sendBeacon batch'leri.
 * anon INSERT yok: session hash sunucu sırrı ister + rate limit policy'de yapılamaz.
 * Bilinmeyen tip/şişkin batch sessizce reddedilir; misafir akışını asla bozmaz (her durumda 2xx dışı da sorun değil).
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`t:${ip}`, { capacity: 30, refillPerSec: 0.5 })) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, is_active")
    .eq("slug", parsed.data.slug)
    .maybeSingle();
  if (!tenant || !tenant.is_active) return NextResponse.json({ ok: false }, { status: 404 });

  const hash = sessionHash(ip, request.headers.get("user-agent") ?? "", tenant.id);

  const rows = parsed.data.events.map((e) => ({
    tenant_id: tenant.id,
    type: e.type,
    product_id: e.product_id ?? null,
    category_id: e.category_id ?? null,
    lang: e.lang ?? null,
    table_code: e.table_code ?? null,
    session_hash: hash,
  }));

  await admin.from("analytics_events").insert(rows);
  return NextResponse.json({ ok: true });
}
