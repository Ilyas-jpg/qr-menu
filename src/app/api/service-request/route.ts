import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,40}$/),
  tableCode: z.string().trim().min(1).max(30),
  type: z.enum(["waiter", "bill"]),
});

/**
 * 🎯 İLYAS KARAR NOKTASI #3 — Garson çağrı cooldown'u
 * Aynı masadan aynı tip çağrı için bekleme süresi. Restoran işletme pratiğine
 * göre ayarla: çok kısa = spam, çok uzun = "çalışmıyor" hissi.
 */
const COOLDOWN_SECONDS = 90;

/**
 * Misafir garson çağrısı / hesap isteme.
 * anon INSERT yok — yalnız bu route (service-role) yazar:
 *  1) IP token bucket   2) pending-idempotent (partial unique index DB'de de korur)
 *  3) (masa,tip) cooldown   4) tenant aktif + özellik açık + masa aktif doğrulaması
 */
export async function POST(request: Request) {
  if (!rateLimit(`sr:${clientIp(request)}`, { capacity: 10, refillPerSec: 0.17 })) {
    return NextResponse.json({ error: "Çok sık deneme — biraz bekleyin" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const { slug, tableCode, type } = parsed.data;

  const admin = createAdminClient();

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, is_active, settings")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant || !tenant.is_active) {
    return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  }

  const settings = tenant.settings as { waiter_call_enabled?: boolean; bill_request_enabled?: boolean };
  if (type === "waiter" && settings.waiter_call_enabled === false) {
    return NextResponse.json({ error: "Garson çağrısı kapalı" }, { status: 403 });
  }
  if (type === "bill" && settings.bill_request_enabled === false) {
    return NextResponse.json({ error: "Hesap isteme kapalı" }, { status: 403 });
  }

  const { data: table } = await admin
    .from("tables")
    .select("id, name")
    .eq("tenant_id", tenant.id)
    .eq("code", tableCode)
    .eq("is_active", true)
    .maybeSingle();
  if (!table) {
    return NextResponse.json({ error: "Masa bulunamadı" }, { status: 404 });
  }

  // Idempotent: aynı (masa,tip) için pending varsa onu döndür
  const { data: pending } = await admin
    .from("service_requests")
    .select("id, created_at")
    .eq("table_id", table.id)
    .eq("type", type)
    .eq("status", "pending")
    .maybeSingle();
  if (pending) {
    return NextResponse.json({ ok: true, status: "already_pending", id: pending.id });
  }

  // Cooldown: son çağrıdan COOLDOWN_SECONDS geçmemişse reddet
  const { data: recent } = await admin
    .from("service_requests")
    .select("created_at")
    .eq("table_id", table.id)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent) {
    const elapsed = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
    if (elapsed < COOLDOWN_SECONDS) {
      return NextResponse.json(
        { error: `Az önce çağrıldı — ${Math.ceil(COOLDOWN_SECONDS - elapsed)} sn sonra tekrar deneyin` },
        { status: 429 }
      );
    }
  }

  const { data: created, error } = await admin
    .from("service_requests")
    .insert({ tenant_id: tenant.id, table_id: table.id, type })
    .select("id")
    .single();

  if (error || !created) {
    // Yarışta partial unique index'e takıldıysa = zaten pending
    return NextResponse.json({ ok: true, status: "already_pending" });
  }

  // Analitik: server-side log (client'tan spoof edilemez)
  const { sessionHash } = await import("@/lib/session-hash");
  await admin.from("analytics_events").insert({
    tenant_id: tenant.id,
    type: type === "waiter" ? "waiter_call" : "bill_request",
    table_code: tableCode,
    session_hash: sessionHash(clientIp(request), request.headers.get("user-agent") ?? "", tenant.id),
  });

  return NextResponse.json({ ok: true, status: "created", id: created.id });
}
