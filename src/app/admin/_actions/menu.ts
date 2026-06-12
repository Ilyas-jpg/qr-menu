"use server";

import { revalidateTag } from "next/cache";
import { requireTenantContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { categorySchema, productSchema, reorderSchema } from "@/lib/validation";
import { menuTag } from "@/lib/menu";

/**
 * Menü CRUD server action'ları.
 * Güvenlik modeli: kullanıcı-scoped client → RLS son sözü söyler
 * (tenant_id'yi client'tan ALMAYIZ; üyelikten çözeriz).
 * Her başarılı yazma → revalidateTag → public menü saniyeler içinde tazelenir.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function fail(error: string): ActionResult {
  return { ok: false, error };
}

export async function upsertCategory(input: unknown): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Geçersiz veri");

  const { tenant } = await requireTenantContext();
  const supabase = await createClient();
  const { id, ...data } = parsed.data;

  if (id) {
    const { error } = await supabase
      .from("categories")
      .update({ ...data, description: data.description ?? null, time_window: data.time_window ?? null })
      .eq("id", id)
      .eq("tenant_id", tenant.id);
    if (error) return fail("Kategori güncellenemedi");
    revalidateTag(menuTag(tenant.slug), { expire: 0 });
    return { ok: true, id };
  }

  // Yeni kategori sona eklenir
  const { data: maxRow } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("tenant_id", tenant.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("categories")
    .insert({
      ...data,
      description: data.description ?? null,
      time_window: data.time_window ?? null,
      tenant_id: tenant.id,
      sort_order: (maxRow?.sort_order ?? 0) + 10,
    })
    .select("id")
    .single();
  if (error || !created) return fail("Kategori eklenemedi");

  revalidateTag(menuTag(tenant.slug), { expire: 0 });
  return { ok: true, id: created.id };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenant.id);
  if (error) return fail("Kategori silinemedi");

  revalidateTag(menuTag(tenant.slug), { expire: 0 });
  return { ok: true };
}

export async function upsertProduct(input: unknown): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Geçersiz veri");

  const { tenant } = await requireTenantContext();
  const supabase = await createClient();
  const { id, ...data } = parsed.data;

  const row = {
    ...data,
    description: data.description ?? null,
    compare_at_price: data.compare_at_price ?? null,
    calories: data.calories ?? null,
    portion: data.portion || null,
    prep_time_minutes: data.prep_time_minutes ?? null,
  };

  if (id) {
    const { error } = await supabase
      .from("products")
      .update(row)
      .eq("id", id)
      .eq("tenant_id", tenant.id);
    if (error) return fail("Ürün güncellenemedi");
    revalidateTag(menuTag(tenant.slug), { expire: 0 });
    return { ok: true, id };
  }

  const { data: maxRow } = await supabase
    .from("products")
    .select("sort_order")
    .eq("category_id", row.category_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("products")
    .insert({ ...row, tenant_id: tenant.id, sort_order: (maxRow?.sort_order ?? 0) + 10 })
    .select("id")
    .single();
  if (error || !created) return fail("Ürün eklenemedi");

  revalidateTag(menuTag(tenant.slug), { expire: 0 });
  return { ok: true, id: created.id };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenant.id);
  if (error) return fail("Ürün silinemedi");

  revalidateTag(menuTag(tenant.slug), { expire: 0 });
  return { ok: true };
}

/** Hızlı toggle'lar: aktif / tükendi / öne çıkan */
export async function toggleProductFlag(
  id: string,
  flag: "is_active" | "is_sold_out" | "is_featured",
  value: boolean
): Promise<ActionResult> {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ [flag]: value })
    .eq("id", id)
    .eq("tenant_id", tenant.id);
  if (error) return fail("Güncellenemedi");

  revalidateTag(menuTag(tenant.slug), { expire: 0 });
  return { ok: true };
}

export async function toggleCategoryActive(id: string, value: boolean): Promise<ActionResult> {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .update({ is_active: value })
    .eq("id", id)
    .eq("tenant_id", tenant.id);
  if (error) return fail("Güncellenemedi");

  revalidateTag(menuTag(tenant.slug), { expire: 0 });
  return { ok: true };
}

/** Drag-drop sıralama — tek SQL reindex (0003 RPC, SECURITY INVOKER + RLS) */
export async function reorder(input: unknown): Promise<ActionResult> {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return fail("Geçersiz sıralama");

  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const fn = parsed.data.kind === "categories" ? "reorder_categories" : "reorder_products";
  const { error } = await supabase.rpc(fn, { p_ids: parsed.data.ids });
  if (error) return fail("Sıralama kaydedilemedi");

  revalidateTag(menuTag(tenant.slug), { expire: 0 });
  return { ok: true };
}
