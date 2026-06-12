"use server";

import { z } from "zod";
import { requireTenantContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./menu";

const statusSchema = z.enum(["acknowledged", "resolved"]);

export async function updateRequestStatus(id: string, status: unknown): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Geçersiz durum" };

  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const patch =
    parsed.data === "acknowledged"
      ? { status: "acknowledged", acknowledged_at: new Date().toISOString() }
      : { status: "resolved", resolved_at: new Date().toISOString() };

  const { error } = await supabase
    .from("service_requests")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", tenant.id);
  if (error) return { ok: false, error: "Güncellenemedi" };
  return { ok: true };
}
