"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Tarayıcı client'ı — admin panel etkileşimleri + Realtime aboneliği */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
