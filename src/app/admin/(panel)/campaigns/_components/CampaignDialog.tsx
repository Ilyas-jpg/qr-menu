"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MenuCampaign, MenuProduct } from "@/lib/types";
import { formatPrice } from "@/lib/i18n";
import { nowInIstanbul, resolvePrice } from "@/lib/pricing";
import { upsertCampaign } from "@/app/admin/_actions/campaigns";
import type { AdminCampaign, PickerCategory } from "./CampaignManager";

const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

interface Props {
  state: AdminCampaign | "new" | null;
  categories: PickerCategory[];
  currency: string;
  onClose: () => void;
  onSaved: (c: AdminCampaign, isNew: boolean) => void;
}

export function CampaignDialog({ state, categories, currency, onClose, onSaved }: Props) {
  const isNew = state === "new";
  const c = isNew || !state ? null : state;

  const [name, setName] = useState("");
  const [type, setType] = useState<"percent" | "fixed" | "price_override">("percent");
  const [value, setValue] = useState("");
  const [scope, setScope] = useState<"all" | "category" | "products">("all");
  const [categoryId, setCategoryId] = useState<string>("");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [timeEnabled, setTimeEnabled] = useState(false);
  const [startTime, setStartTime] = useState("15:00");
  const [endTime, setEndTime] = useState("17:00");
  const [dateEnabled, setDateEnabled] = useState(false);
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [badgeTr, setBadgeTr] = useState("");
  const [badgeEn, setBadgeEn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!state) return;
    setError(null);
    setName(c?.name ?? "");
    setType(c?.type ?? "percent");
    setValue(c ? String(c.value) : "");
    setScope(c?.scope ?? "all");
    setCategoryId(c?.category_id ?? categories[0]?.id ?? "");
    setProductIds(c?.product_ids ?? []);
    setDays(c?.days_of_week ?? [1, 2, 3, 4, 5, 6, 7]);
    setTimeEnabled(Boolean(c?.start_time));
    setStartTime(c?.start_time?.slice(0, 5) ?? "15:00");
    setEndTime(c?.end_time?.slice(0, 5) ?? "17:00");
    setDateEnabled(Boolean(c?.starts_on || c?.ends_on));
    setStartsOn(c?.starts_on ?? "");
    setEndsOn(c?.ends_on ?? "");
    setBadgeTr(c?.badge_text?.tr ?? "");
    setBadgeEn(c?.badge_text?.en ?? "");
  }, [state, c, categories]);

  /* Canlı önizleme: kapsamdaki ilk ürün + şu anki form değerleri → lib/pricing
     (public render ile AYNI kod — fiyat asla sapamaz) */
  const preview = useMemo(() => {
    const sample =
      scope === "products"
        ? categories.flatMap((cat) => cat.products).find((p) => productIds.includes(p.id))
        : scope === "category"
          ? categories.find((cat) => cat.id === categoryId)?.products[0]
          : categories[0]?.products[0];
    if (!sample || !value) return null;

    const draft: MenuCampaign = {
      id: "draft",
      type,
      value: parseFloat(value.replace(",", ".")) || 0,
      scope,
      category_id: scope === "category" ? categoryId : null,
      product_ids: scope === "products" ? productIds : [],
      days_of_week: [1, 2, 3, 4, 5, 6, 7], // önizleme "şu an aktifmiş gibi" gösterir
      start_time: null,
      end_time: null,
      starts_on: null,
      ends_on: null,
      badge_text: badgeTr ? { tr: badgeTr, en: badgeEn || null } : null,
    };
    const fakeProduct = {
      id: sample.id,
      category_id: scope === "category" ? categoryId : (categories.find((cat) => cat.products.some((p) => p.id === sample.id))?.id ?? ""),
      name: sample.name,
      price: sample.price,
    } as MenuProduct;

    const r = resolvePrice(fakeProduct, [draft], nowInIstanbul());
    return { name: sample.name.tr, ...r };
  }, [scope, categories, productIds, categoryId, value, type, badgeTr, badgeEn]);

  if (!state) return null;

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const toggleProduct = (id: string) =>
    setProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    setError(null);
    const payload = {
      id: c?.id,
      name,
      type,
      value: value.replace(",", "."),
      scope,
      category_id: scope === "category" ? categoryId : null,
      product_ids: scope === "products" ? productIds : [],
      days_of_week: days,
      start_time: timeEnabled ? startTime : null,
      end_time: timeEnabled ? endTime : null,
      starts_on: dateEnabled && startsOn ? startsOn : null,
      ends_on: dateEnabled && endsOn ? endsOn : null,
      badge_text: badgeTr ? { tr: badgeTr, en: badgeEn || null } : null,
      is_active: c?.is_active ?? true,
    };
    startTransition(async () => {
      const r = await upsertCampaign(payload);
      if (!r.ok || !r.id) {
        setError(r.error ?? "Kaydedilemedi");
        return;
      }
      onSaved(
        {
          id: r.id,
          name,
          type,
          value: parseFloat(payload.value) || 0,
          scope,
          category_id: payload.category_id,
          product_ids: payload.product_ids,
          days_of_week: days,
          start_time: payload.start_time,
          end_time: payload.end_time,
          starts_on: payload.starts_on,
          ends_on: payload.ends_on,
          badge_text: payload.badge_text,
          is_active: payload.is_active,
        },
        isNew
      );
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-mode="dark" className="dark max-h-[92dvh] overflow-y-auto border-line bg-surface text-ink sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display italic">
            {isNew ? "Yeni Kampanya" : "Kampanyayı Düzenle"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Kampanya adı (işletme içi) *">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Çay Saati %15" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tip">
              <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={inputCls}>
                <option value="percent">Yüzde indirim (%)</option>
                <option value="fixed">Tutar indirim (₺)</option>
                <option value="price_override">Sabit fiyat (₺)</option>
              </select>
            </Field>
            <Field label={type === "percent" ? "Yüzde *" : "Tutar (₺) *"}>
              <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" className={inputCls} placeholder={type === "percent" ? "15" : "50"} />
            </Field>
          </div>

          <Field label="Kapsam">
            <div className="flex gap-1.5">
              {([["all", "Tüm menü"], ["category", "Kategori"], ["products", "Seçili ürünler"]] as const).map(
                ([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setScope(v)}
                    aria-pressed={scope === v}
                    className={`flex-1 rounded-xl border py-2 text-[12px] font-bold ${
                      scope === v ? "border-accent bg-accent/15 text-accent" : "border-line text-ink-2"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </Field>

          {scope === "category" && (
            <Field label="Kategori">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name.tr}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {scope === "products" && (
            <Field label={`Ürünler (${productIds.length} seçili)`}>
              <div className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-line p-2.5">
                {categories.map((cat) => (
                  <div key={cat.id}>
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-ink-2">
                      {cat.name.tr}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.products.map((p) => {
                        const active = productIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleProduct(p.id)}
                            aria-pressed={active}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                              active ? "border-accent bg-accent/15 text-accent" : "border-line text-ink-2"
                            }`}
                          >
                            {p.name.tr}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Field>
          )}

          <Field label="Günler">
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
                    className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
                      active ? "bg-accent text-accent-fg" : "border border-line-strong text-ink-2"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line p-3">
              <label className="flex items-center gap-2 text-[13px] font-bold">
                <input type="checkbox" checked={timeEnabled} onChange={(e) => setTimeEnabled(e.target.checked)} className="h-4 w-4 accent-(--mq-accent)" />
                Saat aralığı (happy hour)
              </label>
              {timeEnabled && (
                <div className="mt-2 flex items-center gap-2">
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
                  <span className="text-ink-2">–</span>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
                </div>
              )}
            </div>
            <div className="rounded-xl border border-line p-3">
              <label className="flex items-center gap-2 text-[13px] font-bold">
                <input type="checkbox" checked={dateEnabled} onChange={(e) => setDateEnabled(e.target.checked)} className="h-4 w-4 accent-(--mq-accent)" />
                Tarih aralığı
              </label>
              {dateEnabled && (
                <div className="mt-2 space-y-2">
                  <input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className={inputCls} />
                  <input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} className={inputCls} />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Rozet metni (TR)">
              <input value={badgeTr} onChange={(e) => setBadgeTr(e.target.value)} className={inputCls} placeholder="Çay Saati %15" />
            </Field>
            <Field label="Rozet metni (EN)">
              <input value={badgeEn} onChange={(e) => setBadgeEn(e.target.value)} className={inputCls} placeholder="Tea Time -15%" />
            </Field>
          </div>

          {/* Canlı önizleme */}
          {preview && (
            <div className="rounded-2xl border border-accent/40 bg-accent/8 p-4">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">
                Önizleme — müşteri böyle görür
              </p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-bold">{preview.name}</p>
                  {preview.badge && (
                    <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-fg">
                      {preview.badge.tr}
                    </span>
                  )}
                </div>
                <span className="mq-tabular inline-flex items-baseline gap-1.5">
                  {preview.original != null && (
                    <s className="text-[13px] font-medium text-ink-2">
                      {formatPrice(preview.original, currency, "tr")}
                    </s>
                  )}
                  <span className={`text-lg font-extrabold ${preview.original != null ? "text-accent" : ""}`}>
                    {formatPrice(preview.price, currency, "tr")}
                  </span>
                </span>
              </div>
              {preview.original == null && (
                <p className="mt-2 text-[11px] text-ink-2">
                  Bu değerlerle fiyat düşmüyor — kampanya menüde gösterilmez.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-danger/12 px-3 py-2.5 text-[13px] font-semibold text-danger">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl border border-line-strong px-4 py-2.5 text-[13px] font-bold">
              Vazgeç
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !name.trim() || !value.trim()}
              className="rounded-xl bg-accent px-5 py-2.5 text-[13px] font-extrabold text-accent-fg disabled:opacity-50"
            >
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </button>
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
