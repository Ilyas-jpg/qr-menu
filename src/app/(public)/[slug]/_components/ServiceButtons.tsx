"use client";

import { useEffect, useState } from "react";
import type { Lang, MenuTenant } from "@/lib/types";
import { ui } from "@/lib/i18n";

interface Props {
  tenant: MenuTenant;
  tableCode: string;
  lang: Lang;
}

type BtnState = "idle" | "sending" | "done" | "error";

const LABELS = {
  waiter: { tr: "Garson Çağır", en: "Call Waiter" },
  bill: { tr: "Hesap İste", en: "Request Bill" },
  waiterDone: { tr: "Garson çağrıldı ✓", en: "Waiter called ✓" },
  billDone: { tr: "Hesap istendi ✓", en: "Bill requested ✓" },
} as const;

/**
 * Masa QR'ı ile gelindiğinde (?m=) görünen sticky çağrı çubuğu.
 * Misafir Realtime'a abone OLMAZ (free-tier bağlantı kotası admin'e saklı) —
 * optimistic durum + 75 sn sonra tekrar denenebilir hale gelir.
 */
export function ServiceButtons({ tenant, tableCode, lang }: Props) {
  const [waiter, setWaiter] = useState<BtnState>("idle");
  const [bill, setBill] = useState<BtnState>("idle");
  const [error, setError] = useState<string | null>(null);

  const showWaiter = tenant.settings.waiter_call_enabled !== false;
  const showBill = tenant.settings.bill_request_enabled !== false;

  // "done" durumunu bir süre sonra sıfırla (tekrar çağırabilsin)
  useEffect(() => {
    if (waiter !== "done") return;
    const t = window.setTimeout(() => setWaiter("idle"), 75_000);
    return () => window.clearTimeout(t);
  }, [waiter]);
  useEffect(() => {
    if (bill !== "done") return;
    const t = window.setTimeout(() => setBill("idle"), 75_000);
    return () => window.clearTimeout(t);
  }, [bill]);

  if (!showWaiter && !showBill) return null;

  const send = async (type: "waiter" | "bill") => {
    const set = type === "waiter" ? setWaiter : setBill;
    set("sending");
    setError(null);
    try {
      const res = await fetch("/api/service-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: tenant.slug, tableCode, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hata");
      set("done");
    } catch (e) {
      set("idle");
      setError(e instanceof Error ? e.message : "Bağlantı hatası");
      window.setTimeout(() => setError(null), 5000);
    }
  };

  const btnCls = (state: BtnState, primary: boolean) =>
    `flex-1 rounded-full py-3 text-[14px] font-extrabold transition-all active:scale-[0.98] disabled:opacity-80 ${
      state === "done"
        ? "bg-surface-2 text-accent border border-accent/50"
        : primary
          ? "bg-accent text-accent-fg"
          : "border border-line-strong bg-surface/80 text-ink backdrop-blur"
    }`;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-2xl px-4 pb-[max(env(safe-area-inset-bottom),12px)]">
      {error && (
        <p className="pointer-events-auto mb-2 rounded-xl bg-danger px-4 py-2.5 text-center text-[13px] font-bold text-white shadow-lg">
          {error}
        </p>
      )}
      <div className="pointer-events-auto flex gap-2 rounded-full border border-line bg-surface-2/90 p-1.5 shadow-2xl backdrop-blur-md">
        {showWaiter && (
          <button
            type="button"
            disabled={waiter !== "idle"}
            onClick={() => send("waiter")}
            className={btnCls(waiter, true)}
          >
            {waiter === "sending" ? "…" : waiter === "done" ? LABELS.waiterDone[lang] : `🔔 ${LABELS.waiter[lang]}`}
          </button>
        )}
        {showBill && (
          <button
            type="button"
            disabled={bill !== "idle"}
            onClick={() => send("bill")}
            className={btnCls(bill, false)}
          >
            {bill === "sending" ? "…" : bill === "done" ? LABELS.billDone[lang] : `🧾 ${LABELS.bill[lang]}`}
          </button>
        )}
      </div>
      <p className="pointer-events-none mt-1.5 text-center text-[11px] font-bold text-ink-2">
        {ui("table", lang)} {tableCode}
      </p>
    </div>
  );
}
