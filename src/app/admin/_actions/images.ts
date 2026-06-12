"use server";

import { revalidateTag } from "next/cache";
import { requireTenantContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteImageFiles } from "@/lib/images";
import { menuTag } from "@/lib/menu";
import type { ActionResult } from "./menu";

export async function deleteProductImage(imageId: string): Promise<ActionResult> {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("product_images")
    .select("id, file_stem")
    .eq("id", imageId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Görsel bulunamadı" };

  const { error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId)
    .eq("tenant_id", tenant.id);
  if (error) return { ok: false, error: "Silinemedi" };

  await deleteImageFiles(row.file_stem);
  revalidateTag(menuTag(tenant.slug), { expire: 0 });
  return { ok: true };
}

/** Galeri sıralaması: küçük listeler (≤8) — sıralı id listesi tek tek reindex */
export async function reorderProductImages(ids: string[]): Promise<ActionResult> {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 30) {
    return { ok: false, error: "Geçersiz sıralama" };
  }
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from("product_images")
      .update({ sort_order: (i + 1) * 10 })
      .eq("id", ids[i])
      .eq("tenant_id", tenant.id);
    if (error) return { ok: false, error: "Sıralama kaydedilemedi" };
  }

  revalidateTag(menuTag(tenant.slug), { expire: 0 });
  return { ok: true };
}
