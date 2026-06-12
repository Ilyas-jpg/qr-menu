"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AllergenKey, BadgeKey, DietaryKey, LString } from "@/lib/types";
import { ALLERGENS, BADGES, DIETARY } from "@/lib/constants";
import { deleteProduct, upsertProduct } from "@/app/admin/_actions/menu";
import type { AdminProduct } from "./MenuManager";
import { GalleryManager, type AdminImage } from "./GalleryManager";

interface Props {
  state: { product: AdminProduct | null; categoryId: string } | null;
  categories: { id: string; name: LString }[];
  onClose: () => void;
  onSaved: (p: AdminProduct, isNew: boolean) => void;
  onDeleted: (id: string) => void;
  onImagesChange: (productId: string, images: AdminImage[]) => void;
}

export function ProductDialog({ state, categories, onClose, onSaved, onDeleted, onImagesChange }: Props) {
  const p = state?.product ?? null;
  const isNew = !p;

  const [nameTr, setNameTr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descTr, setDescTr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [spiciness, setSpiciness] = useState(0);
  const [allergens, setAllergens] = useState<AllergenKey[]>([]);
  const [dietary, setDietary] = useState<DietaryKey[]>([]);
  const [badges, setBadges] = useState<BadgeKey[]>([]);
  const [portion, setPortion] = useState("");
  const [calories, setCalories] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!state) return;
    setError(null);
    setNameTr(p?.name.tr ?? "");
    setNameEn(p?.name.en ?? "");
    setDescTr(p?.description?.tr ?? "");
    setDescEn(p?.description?.en ?? "");
    setCategoryId(p?.category_id ?? state.categoryId);
    setPrice(p ? String(p.price) : "");
    setComparePrice(p?.compare_at_price != null ? String(p.compare_at_price) : "");
    setSpiciness(p?.spiciness ?? 0);
    setAllergens(p?.allergens ?? []);
    setDietary(p?.dietary ?? []);
    setBadges(p?.badges ?? []);
    setPortion(p?.portion ?? "");
    setCalories(p?.calories != null ? String(p.calories) : "");
    setPrepTime(p?.prep_time_minutes != null ? String(p.prep_time_minutes) : "");
    setIsFeatured(p?.is_featured ?? false);
    setIsSoldOut(p?.is_sold_out ?? false);
    setIsActive(p?.is_active ?? true);
  }, [state, p]);

  if (!state) return null;

  const toggle = <T,>(list: T[], setList: (v: T[]) => void, item: T) =>
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const submit = () => {
    setError(null);
    const payload = {
      id: p?.id,
      category_id: categoryId,
      name: { tr: nameTr, en: nameEn || null },
      description: descTr || descEn ? { tr: descTr, en: descEn || null } : null,
      price: price.replace(",", "."),
      compare_at_price: comparePrice ? comparePrice.replace(",", ".") : null,
      spiciness,
      allergens,
      dietary,
      badges,
      calories: calories || null,
      portion: portion || null,
      prep_time_minutes: prepTime || null,
      is_active: isActive,
      is_sold_out: isSoldOut,
      is_featured: isFeatured,
    };
    startTransition(async () => {
      const r = await upsertProduct(payload);
      if (!r.ok || !r.id) {
        setError(r.error ?? "Kaydedilemedi");
        return;
      }
      onSaved(
        {
          id: r.id,
          category_id: categoryId,
          name: payload.name,
          description: payload.description,
          price: parseFloat(payload.price) || 0,
          compare_at_price: payload.compare_at_price ? parseFloat(payload.compare_at_price) : null,
          spiciness,
          allergens,
          dietary,
          badges,
          calories: calories ? parseInt(calories, 10) : null,
          portion: portion || null,
          prep_time_minutes: prepTime ? parseInt(prepTime, 10) : null,
          sort_order: p?.sort_order ?? 9999,
          is_active: isActive,
          is_sold_out: isSoldOut,
          is_featured: isFeatured,
          is_bestseller: p?.is_bestseller ?? false,
          images: p?.images ?? [],
        },
        isNew
      );
      onClose();
    });
  };

  const remove = () => {
    if (!p) return;
    if (!window.confirm(`"${p.name.tr}" silinecek. Emin misin?`)) return;
    startTransition(async () => {
      const r = await deleteProduct(p.id);
      if (!r.ok) {
        setError(r.error ?? "Silinemedi");
        return;
      }
      onDeleted(p.id);
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-mode="dark" className="dark max-h-[92dvh] overflow-y-auto border-line bg-surface text-ink sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display italic">
            {isNew ? "Yeni Ürün" : "Ürünü Düzenle"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {p ? (
            <Field label={`Görseller (${p.images.length})`}>
              <GalleryManager
                productId={p.id}
                images={p.images}
                onChange={(imgs) => onImagesChange(p.id, imgs)}
              />
            </Field>
          ) : (
            <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-[12px] font-semibold text-ink-2">
              📷 Görselleri ürünü kaydettikten sonra ekleyebilirsin.
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Ad (TR) *">
              <input value={nameTr} onChange={(e) => setNameTr(e.target.value)} className={inputCls} placeholder="Adana Kebap" />
            </Field>
            <Field label="Ad (EN)">
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputCls} placeholder="Adana Kebab" />
            </Field>
          </div>

          <Field label="Açıklama (TR)">
            <textarea value={descTr} onChange={(e) => setDescTr(e.target.value)} rows={2} className={`${inputCls} h-auto py-2`} />
          </Field>
          <Field label="Açıklama (EN)">
            <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={2} className={`${inputCls} h-auto py-2`} />
          </Field>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Fiyat (₺) *">
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className={inputCls} placeholder="450" />
            </Field>
            <Field label="Eski fiyat (üstü çizili)">
              <input value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} inputMode="decimal" className={inputCls} placeholder="—" />
            </Field>
            <Field label="Kategori">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.tr}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Acılık">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSpiciness(level)}
                  aria-pressed={spiciness === level}
                  className={`flex-1 rounded-xl border py-2 text-[13px] font-bold ${
                    spiciness === level ? "border-accent bg-accent/15 text-accent" : "border-line text-ink-2"
                  }`}
                >
                  {level === 0 ? "Yok" : "🌶️".repeat(level)}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Beslenme etiketleri">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(DIETARY) as DietaryKey[]).map((d) => (
                <Chip key={d} active={dietary.includes(d)} onClick={() => toggle(dietary, setDietary, d)}>
                  {DIETARY[d].label.tr}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Alerjenler (AB-14)">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {(Object.keys(ALLERGENS) as AllergenKey[]).map((a) => (
                <Chip key={a} active={allergens.includes(a)} onClick={() => toggle(allergens, setAllergens, a)} danger>
                  {ALLERGENS[a].emoji} {ALLERGENS[a].label.tr}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Rozetler">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(BADGES) as (BadgeKey | "bestseller")[])
                .filter((b): b is BadgeKey => b !== "bestseller")
                .map((b) => (
                  <Chip key={b} active={badges.includes(b)} onClick={() => toggle(badges, setBadges, b)}>
                    {BADGES[b].label.tr}
                  </Chip>
                ))}
              <span className="self-center text-[11px] text-ink-2">(&quot;Çok Satan&quot; otomatik hesaplanır)</span>
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Porsiyon">
              <input value={portion} onChange={(e) => setPortion(e.target.value)} className={inputCls} placeholder="200 g" />
            </Field>
            <Field label="Kalori">
              <input value={calories} onChange={(e) => setCalories(e.target.value)} inputMode="numeric" className={inputCls} placeholder="—" />
            </Field>
            <Field label="Hazırlık (dk)">
              <input value={prepTime} onChange={(e) => setPrepTime(e.target.value)} inputMode="numeric" className={inputCls} placeholder="—" />
            </Field>
          </div>

          <div className="flex flex-wrap gap-4 rounded-xl border border-line p-3 text-[13px] font-bold">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 accent-(--mq-accent)" />
              ★ Öne çıkan
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isSoldOut} onChange={(e) => setIsSoldOut(e.target.checked)} className="h-4 w-4 accent-(--mq-danger)" />
              Tükendi
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-(--mq-accent)" />
              Menüde görünür
            </label>
          </div>

          {error && (
            <p className="rounded-xl bg-danger/12 px-3 py-2.5 text-[13px] font-semibold text-danger">{error}</p>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            {!isNew ? (
              <button type="button" onClick={remove} disabled={pending} className="text-[13px] font-bold text-danger hover:underline disabled:opacity-50">
                Sil
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-xl border border-line-strong px-4 py-2.5 text-[13px] font-bold">
                Vazgeç
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || !nameTr.trim() || !price.trim()}
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

function Chip({
  active,
  danger,
  onClick,
  children,
}: {
  active: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1.5 text-left text-[12px] font-bold transition-colors ${
        active
          ? danger
            ? "border-danger/60 bg-danger/12 text-danger"
            : "border-accent bg-accent/15 text-accent"
          : "border-line text-ink-2 hover:border-line-strong"
      }`}
    >
      {children}
    </button>
  );
}
