"use server";

import { revalidateTag } from "next/cache";
import { requireTenantContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { campaignSchema } from "@/lib/validation";
import { menuTag } from "@/lib/menu";
import type { ActionResult } from "./menu";

export async function upsertCampaign(input: unknown): Promise<ActionResult> {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };

  const { tenant } = await requireTenantContext();
  const supabase = await createClient();
  const { id, ...data } = parsed.data;

  const row = {
    ...data,
    category_id: data.scope === "category" ? data.category_id : null,
    product_ids: data.scope === "products" ? data.product_ids : [],
    start_time: data.start_time || null,
    end_time: data.end_time || null,
    starts_on: data.starts_on || null,
    ends_on: data.ends_on || null,
    badge_text: data.badge_text ?? null,
  };

  if (id) {
    const { error } = await supabase
      .from("campaigns")
      .update(row)
      .eq("id", id)
      .eq("tenant_id", tenant.id);
    if (error) return { ok: false, error: "Kampanya güncellenemedi" };
    revalidateTag(menuTag(tenant.slug), { expire: 0 });
    return { ok: true, id };
  }

  const { data: created, error } = await supabase
    .from("campaigns")
    .insert({ ...row, tenant_id: tenant.id })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: "Kampanya eklenemedi" };

  revalidateTag(menuTag(tenant.slug), { expire: 0 });
  return { ok: true, id: created.id };
}

export async function deleteCampaign(id: string): Promise<ActionResult> {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenant.id);
  if (error) return { ok: false, error: "Silinemedi" };

  revalidateTag(menuTag(tenant.slug), { expire: 0 });
  return { ok: true };
}

export async function toggleCampaignActive(id: string, value: boolean): Promise<ActionResult> {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("campaigns")
    .update({ is_active: value })
    .eq("id", id)
    .eq("tenant_id", tenant.id);
  if (error) return { ok: false, error: "Güncellenemedi" };

  revalidateTag(menuTag(tenant.slug), { expire: 0 });
  return { ok: true };
}
