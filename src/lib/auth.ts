import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TenantSettings, TenantTheme } from "@/lib/types";

export interface AdminTenant {
  id: string;
  slug: string;
  name: string;
  logo_path: string | null;
  theme: TenantTheme;
  default_lang: string;
  languages: string[];
  currency: string;
  whatsapp_phone: string | null;
  wifi_ssid: string | null;
  wifi_password: string | null;
  address: string | null;
  phone: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  google_maps_url: string | null;
  is_active: boolean;
  settings: TenantSettings;
}

export interface AdminContext {
  userId: string;
  email: string;
  role: "owner" | "staff" | "platform_admin";
  /** platform_admin için null */
  tenant: AdminTenant | null;
}

/**
 * Admin sayfaları/aksiyonları için oturum + üyelik çözümü.
 * proxy.ts zaten login'e yönlendiriyor; bu fonksiyon üyelik yoksa da login'e atar.
 * RLS: tüm sorgular kullanıcı-scoped client ile (service key DEĞİL).
 */
export async function requireAdminContext(): Promise<AdminContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: memberships } = await supabase
    .from("tenant_users")
    .select("tenant_id, role")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=uyelik");
  }

  // platform_admin önceliklidir; değilse ilk işletme üyeliği (v1: kullanıcı başına tek işletme)
  const admin = memberships.find((m) => m.role === "platform_admin");
  const membership = admin ?? memberships[0];

  let tenant: AdminTenant | null = null;
  if (membership.tenant_id) {
    const { data } = await supabase
      .from("tenants")
      .select(
        "id, slug, name, logo_path, theme, default_lang, languages, currency, whatsapp_phone, wifi_ssid, wifi_password, address, phone, instagram_url, facebook_url, google_maps_url, is_active, settings"
      )
      .eq("id", membership.tenant_id)
      .single();
    tenant = (data as AdminTenant) ?? null;
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    role: membership.role as AdminContext["role"],
    tenant,
  };
}

/** Yalnız işletme bağlamı gereken sayfalar için (platform_admin'i platform paneline yönlendirir) */
export async function requireTenantContext(): Promise<AdminContext & { tenant: AdminTenant }> {
  const ctx = await requireAdminContext();
  if (!ctx.tenant) redirect("/admin/platform");
  return ctx as AdminContext & { tenant: AdminTenant };
}
