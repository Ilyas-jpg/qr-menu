import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Panel — QR Menü" };

/** Dashboard: hızlı durum + kısayollar (analitik kartları Faz 7'de zenginleşir) */
export default async function DashboardPage() {
  const ctx = await requireAdminContext();
  if (!ctx.tenant) redirect("/admin/platform");

  const supabase = await createClient();
  const [{ count: productCount }, { count: categoryCount }, { count: soldOutCount }, { count: pendingCalls }] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.tenant.id),
      supabase.from("categories").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.tenant.id),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.tenant.id).eq("is_sold_out", true),
      supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.tenant.id).eq("status", "pending"),
    ]);

  const stats = [
    { label: "Ürün", value: productCount ?? 0, href: "/admin/menu" },
    { label: "Kategori", value: categoryCount ?? 0, href: "/admin/menu" },
    { label: "Tükendi işaretli", value: soldOutCount ?? 0, href: "/admin/menu" },
    { label: "Bekleyen çağrı", value: pendingCalls ?? 0, href: "/admin/requests" },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="font-display text-2xl font-semibold italic">Hoş geldin 👋</h1>
      <p className="mt-1 text-[14px] text-ink-2">
        {ctx.tenant.name} menüsünü buradan yönetebilirsin.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-2xl border border-line bg-card p-4 transition-colors hover:border-line-strong"
          >
            <p className="mq-tabular text-3xl font-extrabold">{s.value}</p>
            <p className="mt-1 text-[12px] font-bold uppercase tracking-wider text-ink-2">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        <Link
          href="/admin/menu"
          className="rounded-2xl border border-accent/40 bg-accent/8 p-5 transition-colors hover:bg-accent/12"
        >
          <p className="text-lg font-extrabold text-accent">Menüyü Düzenle →</p>
          <p className="mt-1 text-[13px] text-ink-2">
            Ürün ekle, fiyat güncelle, sırala, tükendi işaretle.
          </p>
        </Link>
        <Link
          href={`/${ctx.tenant.slug}`}
          target="_blank"
          className="rounded-2xl border border-line bg-card p-5 transition-colors hover:border-line-strong"
        >
          <p className="text-lg font-extrabold">Menüyü Müşteri Gözünden Gör ↗</p>
          <p className="mt-1 text-[13px] text-ink-2">/{ctx.tenant.slug}</p>
        </Link>
      </div>
    </div>
  );
}
