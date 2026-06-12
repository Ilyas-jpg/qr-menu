"use server";

import { z } from "zod";
import { requireTenantContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./menu";

const tableSchema = z.object({
  id: z.uuid().optional(),
  code: z
    .string()
    .trim()
    .min(1, "Masa kodu zorunlu")
    .max(30)
    .regex(/^[a-zA-Z0-9-]+$/, "Kod yalnız harf/rakam/tire içerebilir"),
  name: z.string().trim().min(1, "Masa adı zorunlu").max(60),
  is_active: z.boolean().default(true),
});

export async function upsertTable(input: unknown): Promise<ActionResult> {
  const parsed = tableSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };

  const { tenant } = await requireTenantContext();
  const supabase = await createClient();
  const { id, ...data } = parsed.data;
  const code = data.code.toLowerCase();

  if (id) {
    const { error } = await supabase
      .from("tables")
      .update({ ...data, code })
      .eq("id", id)
      .eq("tenant_id", tenant.id);
    if (error) return { ok: false, error: "Bu kod başka masada kullanılıyor olabilir" };
    return { ok: true, id };
  }

  const { data: maxRow } = await supabase
    .from("tables")
    .select("sort_order")
    .eq("tenant_id", tenant.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("tables")
    .insert({ ...data, code, tenant_id: tenant.id, sort_order: (maxRow?.sort_order ?? 0) + 10 })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: "Bu kod zaten kullanılıyor olabilir" };
  return { ok: true, id: created.id };
}

export async function deleteTable(id: string): Promise<ActionResult> {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();
  const { error } = await supabase.from("tables").delete().eq("id", id).eq("tenant_id", tenant.id);
  if (error) return { ok: false, error: "Silinemedi" };
  return { ok: true };
}
