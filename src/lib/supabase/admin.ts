import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * SERVICE ROLE client — RLS'i atlar. YALNIZCA:
 *  - misafir yazmaları (analitik ingest, garson çağrısı) API route'larında
 *  - süper-admin tenant oluşturma (auth admin)
 * Client bundle'a sızması derleme hatasıdır ('server-only').
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
