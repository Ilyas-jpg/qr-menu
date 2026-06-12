import { requireTenantContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TablesManager, type AdminTable } from "./_components/TablesManager";

export const metadata = { title: "Masalar & QR — QR Menü" };

export default async function TablesPage() {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { data: tables } = await supabase
    .from("tables")
    .select("id, code, name, sort_order, is_active")
    .eq("tenant_id", tenant.id)
    .order("sort_order");

  return (
    <div className="mx-auto w-full max-w-4xl">
      <TablesManager initial={(tables ?? []) as AdminTable[]} slug={tenant.slug} />
    </div>
  );
}
