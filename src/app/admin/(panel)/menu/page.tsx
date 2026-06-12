import { requireTenantContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MenuManager, type AdminCategory, type AdminProduct } from "./_components/MenuManager";

export const metadata = { title: "Menü Yönetimi — QR Menü" };

export default async function MenuAdminPage() {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const [{ data: categories }, { data: products }, { data: images }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, description, icon, sort_order, time_window, is_active")
      .eq("tenant_id", tenant.id)
      .order("sort_order"),
    supabase
      .from("products")
      .select(
        "id, category_id, name, description, price, compare_at_price, spiciness, allergens, dietary, badges, calories, portion, prep_time_minutes, sort_order, is_active, is_sold_out, is_featured, is_bestseller"
      )
      .eq("tenant_id", tenant.id)
      .order("sort_order"),
    supabase
      .from("product_images")
      .select("id, product_id, file_stem, width, height, sort_order")
      .eq("tenant_id", tenant.id)
      .order("sort_order"),
  ]);

  const imagesByProduct = new Map<string, NonNullable<typeof images>>();
  for (const img of images ?? []) {
    const list = imagesByProduct.get(img.product_id) ?? [];
    list.push(img);
    imagesByProduct.set(img.product_id, list);
  }

  const byCategory = new Map<string, AdminProduct[]>();
  for (const raw of (products ?? []) as Omit<AdminProduct, "images">[]) {
    const p: AdminProduct = { ...raw, images: imagesByProduct.get(raw.id) ?? [] };
    const list = byCategory.get(p.category_id) ?? [];
    list.push(p);
    byCategory.set(p.category_id, list);
  }

  const data: AdminCategory[] = ((categories ?? []) as Omit<AdminCategory, "products">[]).map(
    (c) => ({ ...c, products: byCategory.get(c.id) ?? [] })
  );

  return (
    <div className="mx-auto w-full max-w-4xl">
      <MenuManager initial={data} currency={tenant.currency} menuSlug={tenant.slug} />
    </div>
  );
}
