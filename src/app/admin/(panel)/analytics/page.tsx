import { requireTenantContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AnalyticsCharts } from "./AnalyticsCharts";

export const metadata = { title: "Analitik — QR Menü" };

/**
 * Veri kaynakları:
 *  - "Bugün" kartı: raw analytics_events (admin client — üyelik requireTenantContext ile doğrulandı;
 *    raw log'a member RLS bilinçli olarak yok)
 *  - 7g/30g: analytics_daily rollup (kullanıcı client, member RLS)
 * Rollup dünden geriye tam günleri kapsar (pg_cron 00:15 UTC).
 */
export default async function AnalyticsPage() {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();
  const admin = createAdminClient();

  const todayStartIstanbul = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
  todayStartIstanbul.setHours(0, 0, 0, 0);

  const [todayViews, daily, products] = await Promise.all([
    admin
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("type", "menu_view")
      .gte("created_at", todayStartIstanbul.toISOString()),
    supabase
      .from("analytics_daily")
      .select("day, type, product_id, views, uniques")
      .eq("tenant_id", tenant.id)
      .gte("day", new Date(Date.now() - 31 * 86400_000).toISOString().slice(0, 10))
      .order("day"),
    supabase.from("products").select("id, name").eq("tenant_id", tenant.id),
  ]);

  const rows = daily.data ?? [];
  const last7 = (type: string) =>
    rows
      .filter(
        (r) =>
          r.type === type &&
          r.day >= new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10)
      )
      .reduce((s, r) => s + r.views, 0);

  const stats = {
    today: todayViews.count ?? 0,
    views7: last7("menu_view"),
    whatsapp7: last7("whatsapp_order_click"),
    calls7: last7("waiter_call") + last7("bill_request"),
  };

  // 30 günlük seri (boş günler 0)
  const series: { day: string; views: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    const v = rows
      .filter((r) => r.day === day && r.type === "menu_view")
      .reduce((s, r) => s + r.views, 0);
    series.push({ day: day.slice(5), views: v });
  }

  // Top 10 ürün (7g product_view uniques)
  const nameById = new Map(
    ((products.data ?? []) as { id: string; name: { tr: string } }[]).map((p) => [p.id, p.name.tr])
  );
  const productAgg = new Map<string, number>();
  for (const r of rows) {
    if (r.type !== "product_view" || !r.product_id) continue;
    if (r.day < new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10)) continue;
    productAgg.set(r.product_id, (productAgg.get(r.product_id) ?? 0) + r.uniques);
  }
  const topProducts = [...productAgg.entries()]
    .map(([id, uniques]) => ({ name: nameById.get(id) ?? "?", uniques }))
    .sort((a, b) => b.uniques - a.uniques)
    .slice(0, 10);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="font-display text-2xl font-semibold italic">Analitik</h1>
      <p className="mt-0.5 text-[13px] text-ink-2">
        Rakamlar günlük derlenir (raw veriler 90 gün sonra otomatik silinir — KVKK)
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Bugün görüntülenme", value: stats.today },
          { label: "Son 7 gün", value: stats.views7 },
          { label: "WhatsApp sipariş tıkı (7g)", value: stats.whatsapp7 },
          { label: "Garson/hesap çağrısı (7g)", value: stats.calls7 },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-card p-4">
            <p className="mq-tabular text-3xl font-extrabold">{s.value}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-ink-2">{s.label}</p>
          </div>
        ))}
      </div>

      <AnalyticsCharts series={series} topProducts={topProducts} />

      {rows.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-line-strong p-5 text-center text-[13px] text-ink-2">
          Grafikler ilk gece derlemesinden (00:15 UTC) sonra dolmaya başlar — &quot;Bugün&quot; kartı canlıdır.
        </p>
      )}
    </div>
  );
}
