import { redirect } from "next/navigation";
import { requireAdminContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlatformManager, type PlatformTenant } from "./PlatformManager";

export const metadata = { title: "İşletmeler — QR Menü" };

/** Süper-admin: tüm işletmeler + abonelik durumu (yalnız platform_admin) */
export default async function PlatformPage() {
  const ctx = await requireAdminContext();
  if (ctx.role !== "platform_admin") redirect("/admin");

  const admin = createAdminClient();
  const { data: tenants } = await admin
    .from("tenants")
    .select("id, slug, name, is_active, plan, trial_ends_at, subscription_ends_at, created_at")
    .order("created_at", { ascending: false });

  // işletme başına ürün sayısı (hızlı genel bakış)
  const { data: counts } = await admin.from("products").select("tenant_id");
  const productCount = new Map<string, number>();
  for (const r of counts ?? []) {
    productCount.set(r.tenant_id, (productCount.get(r.tenant_id) ?? 0) + 1);
  }

  const rows: PlatformTenant[] = ((tenants ?? []) as Omit<PlatformTenant, "product_count">[]).map(
    (t) => ({ ...t, product_count: productCount.get(t.id) ?? 0 })
  );

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PlatformManager initial={rows} />
    </div>
  );
}
