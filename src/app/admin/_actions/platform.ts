"use server";

import { randomBytes } from "node:crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdminContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { RESERVED_SLUGS } from "@/lib/constants";
import { menuTag } from "@/lib/menu";

/**
 * Süper-admin (platform_admin) aksiyonları — İlyas'ın işletme açma/yönetme yüzeyi.
 * Tek yetki kapısı: assertPlatformAdmin(). service-role yalnız burada kullanılır
 * (auth admin createUser RLS'le yapılamaz).
 */

async function assertPlatformAdmin() {
  const ctx = await requireAdminContext();
  if (ctx.role !== "platform_admin") throw new Error("Yetkisiz");
  return ctx;
}

const createTenantSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9](-?[a-z0-9]){1,38}$/, "Slug: küçük harf, rakam, tire"),
  owner_email: z.email("Geçerli e-posta girin"),
  trial_days: z.coerce.number().int().min(0).max(365).default(30),
  whatsapp_phone: z.string().trim().max(20).optional().nullable(),
});

export interface CreateTenantResult {
  ok: boolean;
  error?: string;
  /** Bir kez gösterilir — işletmeciye iletilecek geçici şifre */
  ownerPassword?: string;
  slug?: string;
}

export async function createTenant(input: unknown): Promise<CreateTenantResult> {
  try {
    await assertPlatformAdmin();
  } catch {
    return { ok: false, error: "Yetkisiz" };
  }

  const parsed = createTenantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  const { name, slug, owner_email, trial_days, whatsapp_phone } = parsed.data;

  if (RESERVED_SLUGS.has(slug)) return { ok: false, error: "Bu slug rezerve — başka seçin" };

  const admin = createAdminClient();

  const { data: existing } = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
  if (existing) return { ok: false, error: "Bu slug kullanımda" };

  // 1) işletme sahibi auth kullanıcısı (geçici güçlü şifre)
  const ownerPassword = randomBytes(9).toString("base64url"); // ~12 karakter
  const { data: user, error: userErr } = await admin.auth.admin.createUser({
    email: owner_email,
    password: ownerPassword,
    email_confirm: true,
  });
  if (userErr || !user.user) {
    return { ok: false, error: `Kullanıcı oluşturulamadı: ${userErr?.message ?? "?"}` };
  }

  // 2) tenant
  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .insert({
      name,
      slug,
      whatsapp_phone: whatsapp_phone || null,
      plan: "trial",
      trial_ends_at: new Date(Date.now() + trial_days * 86400_000).toISOString(),
    })
    .select("id")
    .single();
  if (tenantErr || !tenant) {
    await admin.auth.admin.deleteUser(user.user.id); // yarım durum bırakma
    return { ok: false, error: "İşletme kaydı oluşturulamadı" };
  }

  // 3) owner üyeliği
  const { error: memberErr } = await admin
    .from("tenant_users")
    .insert({ tenant_id: tenant.id, user_id: user.user.id, role: "owner" });
  if (memberErr) {
    await admin.from("tenants").delete().eq("id", tenant.id);
    await admin.auth.admin.deleteUser(user.user.id);
    return { ok: false, error: "Üyelik oluşturulamadı" };
  }

  return { ok: true, ownerPassword, slug };
}

const updateTenantSchema = z.object({
  id: z.uuid(),
  is_active: z.boolean().optional(),
  plan: z.enum(["trial", "full"]).optional(),
  trial_ends_at: z.string().nullable().optional(),
  subscription_ends_at: z.string().nullable().optional(),
});

export async function updateTenantStatus(input: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertPlatformAdmin();
  } catch {
    return { ok: false, error: "Yetkisiz" };
  }

  const parsed = updateTenantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz veri" };
  const { id, ...patch } = parsed.data;

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("tenants")
    .update({
      ...patch,
      ...(patch.plan === "full" && { activated_at: new Date().toISOString() }),
    })
    .eq("id", id)
    .select("slug")
    .single();
  if (error || !row) return { ok: false, error: "Güncellenemedi" };

  // Aktif/pasif değişimi public menüyü anında etkilesin
  revalidateTag(menuTag(row.slug), { expire: 0 });
  return { ok: true };
}
