"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteCategory, upsertCategory } from "@/app/admin/_actions/menu";
import type { AdminCategory } from "./MenuManager";

const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

interface Props {
  state: AdminCategory | "new" | null;
  onClose: () => void;
  onSaved: (cat: AdminCategory, isNew: boolean) => void;
  onDeleted: (id: string) => void;
}

export function CategoryDialog({ state, onClose, onSaved, onDeleted }: Props) {
  const isNew = state === "new";
  const cat = isNew || !state ? null : state;

  const [nameTr, setNameTr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descTr, setDescTr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [timeEnabled, setTimeEnabled] = useState(false);
  const [start, setStart] = useState("06:30");
  const [end, setEnd] = useState("12:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!state) return;
    setError(null);
    setNameTr(cat?.name.tr ?? "");
    setNameEn(cat?.name.en ?? "");
    setDescTr(cat?.description?.tr ?? "");
    setDescEn(cat?.description?.en ?? "");
    setTimeEnabled(Boolean(cat?.time_window));
    setStart(cat?.time_window?.start ?? "06:30");
    setEnd(cat?.time_window?.end ?? "12:00");
    setDays(cat?.time_window?.days ?? [1, 2, 3, 4, 5, 6, 7]);
  }, [state, cat]);

  if (!state) return null;

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const submit = () => {
    setError(null);
    const payload = {
      id: cat?.id,
      name: { tr: nameTr, en: nameEn || null },
      description: descTr || descEn ? { tr: descTr, en: descEn || null } : null,
      icon: cat?.icon ?? null,
      time_window: timeEnabled ? { start, end, days } : null,
      is_active: cat?.is_active ?? true,
    };
    startTransition(async () => {
      const r = await upsertCategory(payload);
      if (!r.ok || !r.id) {
        setError(r.error ?? "Kaydedilemedi");
        return;
      }
      onSaved(
        {
          id: r.id,
          name: payload.name,
          description: payload.description,
          icon: payload.icon,
          sort_order: cat?.sort_order ?? 9999,
          time_window: payload.time_window,
          is_active: payload.is_active,
          products: cat?.products ?? [],
        },
        isNew
      );
      onClose();
    });
  };

  const remove = () => {
    if (!cat) return;
    if (!window.confirm(`"${cat.name.tr}" kategorisi ve içindeki ${cat.products.length} ürün silinecek. Emin misin?`))
      return;
    startTransition(async () => {
      const r = await deleteCategory(cat.id);
      if (!r.ok) {
        setError(r.error ?? "Silinemedi");
        return;
      }
      onDeleted(cat.id);
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-mode="dark" className="dark max-h-[90dvh] overflow-y-auto border-line bg-surface text-ink sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display italic">
            {isNew ? "Yeni Kategori" : "Kategoriyi Düzenle"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Ad (TR) *">
            <input value={nameTr} onChange={(e) => setNameTr(e.target.value)} className={inputCls} placeholder="Çorbalar" />
          </Field>
          <Field label="Ad (EN)">
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputCls} placeholder="Soups" />
          </Field>
          <Field label="Açıklama (TR)">
            <input value={descTr} onChange={(e) => setDescTr(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Açıklama (EN)">
            <input value={descEn} onChange={(e) => setDescEn(e.target.value)} className={inputCls} />
          </Field>

          <div className="rounded-xl border border-line p-3">
            <label className="flex items-center gap-2 text-[13px] font-bold">
              <input
                type="checkbox"
                checked={timeEnabled}
                onChange={(e) => setTimeEnabled(e.target.checked)}
                className="h-4 w-4 accent-(--mq-accent)"
              />
              Saat aralığında servis (örn. kahvaltı)
            </label>
            {timeEnabled && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
                  <span className="text-ink-2">–</span>
                  <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_LABELS.map((label, i) => {
                    const d = i + 1;
                    const active = days.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        aria-pressed={active}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          active ? "bg-accent text-accent-fg" : "border border-line-strong text-ink-2"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-danger/12 px-3 py-2.5 text-[13px] font-semibold text-danger">{error}</p>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            {!isNew ? (
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="text-[13px] font-bold text-danger hover:underline disabled:opacity-50"
              >
                Sil
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-line-strong px-4 py-2.5 text-[13px] font-bold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || !nameTr.trim()}
                className="rounded-xl bg-accent px-5 py-2.5 text-[13px] font-extrabold text-accent-fg disabled:opacity-50"
              >
                {pending ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-line-strong bg-card px-3 text-[14px] outline-none transition-colors focus:border-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-2">{label}</span>
      {children}
    </label>
  );
}
