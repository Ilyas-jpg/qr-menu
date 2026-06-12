"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateRequestStatus } from "@/app/admin/_actions/requests";
import { useAdminRealtime } from "../_components/AdminRealtimeProvider";

export interface RequestRow {
  id: string;
  type: "waiter" | "bill";
  status: "pending" | "acknowledged";
  created_at: string;
  tables: { name: string; code: string } | null;
}

export function RequestsBoard({ initial, tenantId }: { initial: RequestRow[]; tenantId: string }) {
  const [rows, setRows] = useState<RequestRow[]>(initial);
  const [, startTransition] = useTransition();
  const { subscribe, setPendingCount } = useAdminRealtime();

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("service_requests")
      .select("id, type, status, created_at, tables(name, code)")
      .eq("tenant_id", tenantId)
      .in("status", ["pending", "acknowledged"])
      .order("created_at", { ascending: true });
    if (data) {
      setRows(data as unknown as RequestRow[]);
      setPendingCount((data as unknown as RequestRow[]).filter((r) => r.status === "pending").length);
    }
  }, [tenantId, setPendingCount]);

  // Canlı ekleme (provider'dan) + 30 sn polling fallback (Realtime kopmalarına karşı)
  useEffect(() => {
    const off = subscribe(() => void refetch());
    const id = window.setInterval(() => void refetch(), 30_000);
    return () => {
      off();
      window.clearInterval(id);
    };
  }, [subscribe, refetch]);

  const act = (row: RequestRow, status: "acknowledged" | "resolved") => {
    setRows((prev) =>
      status === "resolved"
        ? prev.filter((r) => r.id !== row.id)
        : prev.map((r) => (r.id === row.id ? { ...r, status: "acknowledged" } : r))
    );
    if (row.status === "pending") setPendingCount((p) => Math.max(0, p - 1));
    startTransition(async () => {
      const r = await updateRequestStatus(row.id, status);
      if (!r.ok) void refetch();
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="font-display text-2xl font-semibold italic">Çağrılar</h1>
      <p className="mt-0.5 text-[13px] text-ink-2">
        Masadan gelen garson ve hesap istekleri — canlı düşer, ses çalar
      </p>

      <div className="mt-5 space-y-2">
        {rows.map((r) => (
          <RequestCard key={r.id} row={r} onAct={act} />
        ))}
      </div>

      {rows.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-line-strong p-10 text-center">
          <p className="text-3xl">🛎️</p>
          <p className="mt-2 text-[14px] font-bold">Bekleyen çağrı yok</p>
          <p className="mt-1 text-[12px] text-ink-2">
            Müşteri masa QR&apos;ından &quot;Garson Çağır&quot;a bastığında burada belirir.
          </p>
        </div>
      )}
    </div>
  );
}

function RequestCard({
  row,
  onAct,
}: {
  row: RequestRow;
  onAct: (row: RequestRow, s: "acknowledged" | "resolved") => void;
}) {
  const [, force] = useState(0);
  // geçen süre her 10 sn'de tazelensin
  useEffect(() => {
    const id = window.setInterval(() => force((x) => x + 1), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const elapsedMin = Math.floor((Date.now() - new Date(row.created_at).getTime()) / 60000);
  const elapsed = elapsedMin < 1 ? "az önce" : `${elapsedMin} dk önce`;
  const isPending = row.status === "pending";

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 ${
        isPending ? "border-accent/60" : "border-line opacity-90"
      }`}
    >
      <span className="text-2xl" aria-hidden>
        {row.type === "waiter" ? "🔔" : "🧾"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-extrabold">
          {row.tables?.name ?? "Masa"}{" "}
          <span className="font-bold text-ink-2">
            — {row.type === "waiter" ? "garson çağırıyor" : "hesap istiyor"}
          </span>
        </p>
        <p className={`text-[12px] font-bold ${elapsedMin >= 5 && isPending ? "text-danger" : "text-ink-2"}`}>
          {elapsed}
          {!isPending && " · üstlenildi"}
        </p>
      </div>
      {isPending && (
        <button
          type="button"
          onClick={() => onAct(row, "acknowledged")}
          className="shrink-0 rounded-full border border-accent px-3.5 py-2 text-[12px] font-extrabold text-accent active:scale-95"
        >
          Üstlen
        </button>
      )}
      <button
        type="button"
        onClick={() => onAct(row, "resolved")}
        className="shrink-0 rounded-full bg-accent px-3.5 py-2 text-[12px] font-extrabold text-accent-fg active:scale-95"
      >
        Çözüldü ✓
      </button>
    </div>
  );
}
