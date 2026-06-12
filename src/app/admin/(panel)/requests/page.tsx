import { requireTenantContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RequestsBoard, type RequestRow } from "./RequestsBoard";

export const metadata = { title: "Çağrılar — QR Menü" };

export default async function RequestsPage() {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("service_requests")
    .select("id, type, status, created_at, tables(name, code)")
    .eq("tenant_id", tenant.id)
    .in("status", ["pending", "acknowledged"])
    .order("created_at", { ascending: true });

  return <RequestsBoard initial={(data ?? []) as unknown as RequestRow[]} tenantId={tenant.id} />;
}
