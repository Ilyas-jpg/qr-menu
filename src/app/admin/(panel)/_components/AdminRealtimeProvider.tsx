"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Toaster, toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/**
 * Garson çağrısı canlı bildirimi — tüm admin sayfalarında aktif.
 * Supabase Realtime postgres_changes (kanal: service:{tenantId});
 * RLS SELECT policy'si teslimatı zaten kapsıyor (WALRUS).
 * Ses: WebAudio çift bip — asset yok; iOS ilk dokunuşta unlock olur.
 */

interface ServiceRequestRow {
  id: string;
  tenant_id: string;
  table_id: string;
  type: "waiter" | "bill";
  status: "pending" | "acknowledged" | "resolved" | "expired";
  created_at: string;
}

interface RealtimeCtx {
  pendingCount: number;
  setPendingCount: (n: number | ((p: number) => number)) => void;
  /** requests sayfası canlı satır ekleri için abone ol */
  subscribe: (fn: (row: ServiceRequestRow, tableName: string) => void) => () => void;
}

const Ctx = createContext<RealtimeCtx>({
  pendingCount: 0,
  setPendingCount: () => {},
  subscribe: () => () => {},
});

export const useAdminRealtime = () => useContext(Ctx);

export function AdminRealtimeProvider({
  tenantId,
  initialPending,
  children,
}: {
  tenantId: string | null;
  initialPending: number;
  children: React.ReactNode;
}) {
  const [pendingCount, setPendingCount] = useState(initialPending);
  const listeners = useRef(new Set<(row: ServiceRequestRow, tableName: string) => void>());
  const audioCtx = useRef<AudioContext | null>(null);

  // iOS/Chrome autoplay: ilk kullanıcı etkileşiminde AudioContext aç
  useEffect(() => {
    const unlock = () => {
      if (!audioCtx.current) {
        try {
          audioCtx.current = new AudioContext();
        } catch {
          /* ses yoksa sessiz devam */
        }
      }
      audioCtx.current?.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const chime = useCallback(() => {
    const ctx = audioCtx.current;
    if (!ctx || ctx.state !== "running") return;
    const beep = (freq: number, at: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.45);
    };
    beep(880, 0);
    beep(1175, 0.18);
  }, []);

  const subscribe = useCallback((fn: (row: ServiceRequestRow, tableName: string) => void) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`service:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "service_requests",
          filter: `tenant_id=eq.${tenantId}`,
        },
        async (payload) => {
          const row = payload.new as ServiceRequestRow;
          if (row.status !== "pending") return;

          // masa adını çek (RLS member select)
          const { data: table } = await supabase
            .from("tables")
            .select("name")
            .eq("id", row.table_id)
            .maybeSingle();
          const tableName = table?.name ?? "Masa";

          setPendingCount((p) => p + 1);
          chime();
          toast(row.type === "waiter" ? `🔔 ${tableName} garson çağırıyor` : `🧾 ${tableName} hesap istiyor`, {
            description: new Date(row.created_at).toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            duration: 12000,
          });
          listeners.current.forEach((fn) => fn(row, tableName));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, chime]);

  return (
    <Ctx.Provider value={{ pendingCount, setPendingCount, subscribe }}>
      {children}
      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{
          style: {
            background: "var(--mq-card)",
            border: "1px solid var(--mq-line-strong)",
            color: "var(--mq-text)",
            fontWeight: 700,
          },
        }}
      />
    </Ctx.Provider>
  );
}
