import type { MenuPayload } from "./types";

/**
 * Public menü verisi — get_menu RPC'sine TEK round-trip.
 * GET kullanılır (fonksiyon STABLE): Next Data Cache yalnız GET fetch'i cache'ler.
 * Tag'li cache → admin kaydında revalidateTag(`tenant:${slug}`) ile anında tazelenir.
 * (cacheMaxMemorySize:0 → FS cache tek doğruluk kaynağı; Passenger çok-process güvenli)
 */
export async function getMenu(slug: string): Promise<MenuPayload | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase env eksik (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)");

  const res = await fetch(
    `${url}/rest/v1/rpc/get_menu?p_slug=${encodeURIComponent(slug)}`,
    {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      next: { tags: [`tenant:${slug}`], revalidate: 3600 },
    }
  );

  if (!res.ok) {
    // RPC hatası menüyü düşürmesin: log + null (404'e düşer)
    console.error(`get_menu(${slug}) HTTP ${res.status}: ${await res.text()}`);
    return null;
  }

  const data = (await res.json()) as MenuPayload | null;
  // Tenant yok/pasif → RPC null döner
  if (!data || !data.tenant) return null;
  return data;
}

export const menuTag = (slug: string) => `tenant:${slug}`;
