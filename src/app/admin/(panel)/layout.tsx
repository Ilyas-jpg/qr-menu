import Link from "next/link";
import { requireAdminContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../_actions/auth";
import { AdminNav } from "./_components/AdminNav";
import { AdminRealtimeProvider } from "./_components/AdminRealtimeProvider";

/**
 * Admin kabuğu — mobil: alt tab bar, masaüstü: sol sidebar.
 * Tema: sabit koyu (tenant temasından bağımsız; işletmeci her cihazda aynı paneli görür).
 * AdminRealtimeProvider: garson çağrıları her admin sayfasında ses+toast+badge düşürür.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdminContext();

  let initialPending = 0;
  if (ctx.tenant) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("service_requests")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenant.id)
      .eq("status", "pending");
    initialPending = count ?? 0;
  }

  return (
    <AdminRealtimeProvider tenantId={ctx.tenant?.id ?? null} initialPending={initialPending}>
      <div data-mode="dark" className="dark flex min-h-dvh w-full flex-col bg-surface text-ink md:flex-row">
        {/* Masaüstü sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface-2/60 px-4 py-6 md:flex print:!hidden">
          <div className="px-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-accent">QR Menü</p>
            <p className="font-display mt-1 truncate text-lg font-semibold italic">
              {ctx.tenant?.name ?? "Platform"}
            </p>
          </div>
          <div className="mt-6 flex-1">
            <AdminNav role={ctx.role} orientation="vertical" />
          </div>
          <div className="space-y-2 px-2">
            {ctx.tenant && (
              <Link
                href={`/${ctx.tenant.slug}`}
                target="_blank"
                className="block truncate text-[12px] font-semibold text-ink-2 hover:text-accent"
              >
                ↗ Menüyü görüntüle
              </Link>
            )}
            <p className="truncate text-[11px] text-ink-2/70">{ctx.email}</p>
            <form action={signOut}>
              <button type="submit" className="text-[12px] font-bold text-danger/90 hover:text-danger">
                Çıkış yap
              </button>
            </form>
          </div>
        </aside>

        {/* İçerik */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobil üst bar */}
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-surface/92 px-4 py-3 backdrop-blur-md md:hidden print:!hidden">
            <p className="font-display truncate text-base font-semibold italic">
              {ctx.tenant?.name ?? "Platform"}
            </p>
            <form action={signOut}>
              <button type="submit" className="text-[12px] font-bold text-ink-2">
                Çıkış
              </button>
            </form>
          </header>

          <main className="flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10 print:p-0">{children}</main>
        </div>

        {/* Mobil alt tab bar */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-2/95 backdrop-blur-md md:hidden print:!hidden">
          <AdminNav role={ctx.role} orientation="horizontal" />
        </nav>
      </div>
    </AdminRealtimeProvider>
  );
}
