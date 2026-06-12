"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireTenantContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { menuTag } from "@/lib/menu";
import type { ActionResult } from "./menu";

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  instagram_url: z.url().nullable().optional().or(z.literal("").transform(() => null)),
  google_maps_url: z.url().nullable().optional().or(z.literal("").transform(() => null)),
  wifi_ssid: z.string().trim().max(40).nullable().optional(),
  wifi_password: z.string().trim().max(60).nullable().optional(),
  whatsapp_phone: z.string().trim().max(20).nullable().optional(),
  theme: z.object({
    mode: z.enum(["dark", "light"]),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  english_enabled: z.boolean(),
  waiter_call_enabled: z.boolean(),
  bill_request_enabled: z.boolean(),
  show_calories: z.boolean(),
});

export async function updateTenantSettings(input: unknown): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };

  const { tenant } = await requireTenantContext();
  const supabase = await createClient();
  const d = parsed.data;

  // Korunan kolonlara (slug/is_active/plan/abonelik) DOKUNMUYORUZ — trigger zaten engeller
  const { error } = await supabase
    .from("tenants")
    .update({
      name: d.name,
      address: d.address || null,
      phone: d.phone || null,
      instagram_url: d.instagram_url || null,
      google_maps_url: d.google_maps_url || null,
      wifi_ssid: d.wifi_ssid || null,
      wifi_password: d.wifi_password || null,
      whatsapp_phone: d.whatsapp_phone || null,
      theme: d.theme,
      languages: d.english_enabled ? ["tr", "en"] : ["tr"],
      settings: {
        ...tenant.settings,
        waiter_call_enabled: d.waiter_call_enabled,
        bill_request_enabled: d.bill_request_enabled,
        show_calories: d.show_calories,
      },
    })
    .eq("id", tenant.id);

  if (error) return { ok: false, error: "Kaydedilemedi" };

  revalidateTag(menuTag(tenant.slug), { expire: 0 });
  return { ok: true };
}
