import { requireTenantContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CampaignManager, type AdminCampaign, type PickerCategory } from "./_components/CampaignManager";

export const metadata = { title: "Kampanyalar — QR Menü" };

export default async function CampaignsPage() {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const [{ data: campaigns }, { data: categories }, { data: products }] = await Promise.all([
    supabase
      .from("campaigns")
      .select(
        "id, name, type, value, scope, category_id, product_ids, days_of_week, start_time, end_time, starts_on, ends_on, badge_text, is_active"
      )
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name")
      .eq("tenant_id", tenant.id)
      .order("sort_order"),
    supabase
      .from("products")
      .select("id, category_id, name, price")
      .eq("tenant_id", tenant.id)
      .order("sort_order"),
  ]);

  const cats: PickerCategory[] = ((categories ?? []) as { id: string; name: { tr: string } }[]).map(
    (c) => ({
      id: c.id,
      name: c.name,
      products: ((products ?? []) as { id: string; category_id: string; name: { tr: string }; price: number }[])
        .filter((p) => p.category_id === c.id)
        .map((p) => ({ id: p.id, name: p.name, price: p.price })),
    })
  );

  return (
    <div className="mx-auto w-full max-w-4xl">
      <CampaignManager
        initial={(campaigns ?? []) as AdminCampaign[]}
        categories={cats}
        currency={tenant.currency}
      />
    </div>
  );
}
