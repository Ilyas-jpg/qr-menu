"use client";

import { useState, useTransition } from "react";
import type { LString, MenuCampaign } from "@/lib/types";
import { deleteCampaign, toggleCampaignActive } from "@/app/admin/_actions/campaigns";
import { CampaignDialog } from "./CampaignDialog";

export interface AdminCampaign extends Omit<MenuCampaign, "badge_text"> {
  name: string;
  badge_text: LString | null;
  is_active: boolean;
}

export interface PickerCategory {
  id: string;
  name: LString;
  products: { id: string; name: LString; price: number }[];
}

const DAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function typeLabel(c: AdminCampaign): string {
  if (c.type === "percent") return `%${c.value} indirim`;
  if (c.type === "fixed") return `₺${c.value} indirim`;
  return `Sabit fiyat ₺${c.value}`;
}

function scheduleLabel(c: AdminCampaign): string {
  const days =
    c.days_of_week.length === 7
      ? "Her gün"
      : c.days_of_week.map((d) => DAY_SHORT[d - 1]).join(",");
  const time = c.start_time && c.end_time ? ` ${c.start_time.slice(0, 5)}–${c.end_time.slice(0, 5)}` : "";
  const dates =
    c.starts_on || c.ends_on
      ? ` (${c.starts_on ?? "…"} → ${c.ends_on ?? "…"})`
      : "";
  return days + time + dates;
}

export function CampaignManager({
  initial,
  categories,
  currency,
}: {
  initial: AdminCampaign[];
  categories: PickerCategory[];
  currency: string;
}) {
  const [items, setItems] = useState<AdminCampaign[]>(initial);
  const [edit, setEdit] = useState<AdminCampaign | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const flash = (m: string) => {
    setError(m);
    window.setTimeout(() => setError(null), 4000);
  };

  const toggle = (id: string, value: boolean) => {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: value } : c)));
    startTransition(async () => {
      const r = await toggleCampaignActive(id, value);
      if (!r.ok) flash(r.error ?? "Güncellenemedi");
    });
  };

  const remove = (c: AdminCampaign) => {
    if (!window.confirm(`"${c.name}" kampanyası silinsin mi?`)) return;
    setItems((prev) => prev.filter((x) => x.id !== c.id));
    startTransition(async () => {
      const r = await deleteCampaign(c.id);
      if (!r.ok) flash(r.error ?? "Silinemedi");
    });
  };

  const scopeLabel = (c: AdminCampaign): string => {
    if (c.scope === "all") return "Tüm menü";
    if (c.scope === "category")
      return categories.find((x) => x.id === c.category_id)?.name.tr ?? "Kategori";
    return `${c.product_ids.length} ürün`;
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold italic">Kampanyalar</h1>
          <p className="mt-0.5 text-[13px] text-ink-2">
            Saatli/günlü indirimler menüde otomatik açılıp kapanır — deploy gerekmez
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEdit("new")}
          className="shrink-0 rounded-full bg-accent px-4 py-2.5 text-[13px] font-extrabold text-accent-fg active:scale-95"
        >
          + Kampanya
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-danger/12 px-4 py-3 text-[13px] font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {items.map((c) => (
          <div
            key={c.id}
            className={`rounded-2xl border border-line bg-card p-4 ${c.is_active ? "" : "opacity-60"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <button type="button" onClick={() => setEdit(c)} className="min-w-0 text-left">
                <p className="text-[15px] font-extrabold">{c.name}</p>
                <p className="mt-0.5 text-[13px] font-semibold text-accent">
                  {typeLabel(c)} · {scopeLabel(c)}
                </p>
                <p className="mt-0.5 text-[12px] text-ink-2">{scheduleLabel(c)}</p>
                {c.badge_text && (
                  <span className="mt-2 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-fg">
                    {c.badge_text.tr}
                  </span>
                )}
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-ink-2">
                  <input
                    type="checkbox"
                    checked={c.is_active}
                    onChange={(e) => toggle(c.id, e.target.checked)}
                    className="h-4 w-4 accent-(--mq-accent)"
                  />
                  Aktif
                </label>
                <button
                  type="button"
                  onClick={() => remove(c)}
                  aria-label="Sil"
                  className="rounded-lg px-2 py-1 text-[13px] text-danger/80 hover:bg-danger/10 hover:text-danger"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-[14px] text-ink-2">
          Henüz kampanya yok. Happy hour, gün indirimi, sabit fiyat… &quot;+ Kampanya&quot; ile başla.
        </p>
      )}

      <CampaignDialog
        state={edit}
        categories={categories}
        currency={currency}
        onClose={() => setEdit(null)}
        onSaved={(saved, isNew) =>
          setItems((prev) => (isNew ? [saved, ...prev] : prev.map((x) => (x.id === saved.id ? saved : x))))
        }
      />
    </div>
  );
}
