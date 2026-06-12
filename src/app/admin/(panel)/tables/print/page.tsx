import { requireTenantContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrintSheet } from "./PrintSheet";

export const metadata = { title: "QR Baskı Sayfası — QR Menü" };

/**
 * A4 baskıya hazır QR kartları — server PDF lib YOK:
 * tarayıcının print-to-PDF'i print CSS ile kusursuz A4 üretir.
 */
export default async function PrintPage() {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { data: tables } = await supabase
    .from("tables")
    .select("id, code, name")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("sort_order");

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  return (
    <PrintSheet
      tenantName={tenant.name}
      slug={tenant.slug}
      baseUrl={baseUrl}
      tables={tables ?? []}
    />
  );
}
