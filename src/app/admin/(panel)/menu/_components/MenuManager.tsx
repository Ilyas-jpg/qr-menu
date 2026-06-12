"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AllergenKey, BadgeKey, DietaryKey, LString, TimeWindow } from "@/lib/types";
import { formatPrice } from "@/lib/i18n";
import { reorder, toggleCategoryActive, toggleProductFlag } from "@/app/admin/_actions/menu";
import { CategoryDialog } from "./CategoryDialog";
import { ProductDialog } from "./ProductDialog";
import type { AdminImage } from "./GalleryManager";

export interface AdminProduct {
  images: AdminImage[];
  id: string;
  category_id: string;
  name: LString;
  description: LString | null;
  price: number;
  compare_at_price: number | null;
  spiciness: number;
  allergens: AllergenKey[];
  dietary: DietaryKey[];
  badges: BadgeKey[];
  calories: number | null;
  portion: string | null;
  prep_time_minutes: number | null;
  sort_order: number;
  is_active: boolean;
  is_sold_out: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
}

export interface AdminCategory {
  id: string;
  name: LString;
  description: LString | null;
  icon: string | null;
  sort_order: number;
  time_window: TimeWindow | null;
  is_active: boolean;
  products: AdminProduct[];
}

interface Props {
  initial: AdminCategory[];
  currency: string;
  menuSlug: string;
}

export function MenuManager({ initial, currency, menuSlug }: Props) {
  const [cats, setCats] = useState<AdminCategory[]>(initial);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(initial.map((c) => c.id)));
  const [editCategory, setEditCategory] = useState<AdminCategory | "new" | null>(null);
  const [editProduct, setEditProduct] = useState<
    { product: AdminProduct | null; categoryId: string } | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } })
  );

  const categoryIds = useMemo(() => cats.map((c) => c.id), [cats]);

  const flash = useCallback((msg: string) => {
    setError(msg);
    window.setTimeout(() => setError(null), 4000);
  }, []);

  /* ---------- sıralama ---------- */

  const onCategoryDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = cats.findIndex((c) => c.id === active.id);
    const newIdx = cats.findIndex((c) => c.id === over.id);
    const next = arrayMove(cats, oldIdx, newIdx);
    setCats(next);
    startTransition(async () => {
      const r = await reorder({ kind: "categories", ids: next.map((c) => c.id) });
      if (!r.ok) flash(r.error ?? "Sıralama kaydedilemedi");
    });
  };

  const onProductDragEnd = (categoryId: string) => (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setCats((prev) =>
      prev.map((c) => {
        if (c.id !== categoryId) return c;
        const oldIdx = c.products.findIndex((p) => p.id === active.id);
        const newIdx = c.products.findIndex((p) => p.id === over.id);
        const products = arrayMove(c.products, oldIdx, newIdx);
        startTransition(async () => {
          const r = await reorder({ kind: "products", ids: products.map((p) => p.id) });
          if (!r.ok) flash(r.error ?? "Sıralama kaydedilemedi");
        });
        return { ...c, products };
      })
    );
  };

  /* ---------- hızlı toggle'lar (optimistic) ---------- */

  const setProductFlag = (
    productId: string,
    flag: "is_active" | "is_sold_out" | "is_featured",
    value: boolean
  ) => {
    setCats((prev) =>
      prev.map((c) => ({
        ...c,
        products: c.products.map((p) => (p.id === productId ? { ...p, [flag]: value } : p)),
      }))
    );
    startTransition(async () => {
      const r = await toggleProductFlag(productId, flag, value);
      if (!r.ok) flash(r.error ?? "Güncellenemedi");
    });
  };

  const setCategoryActive = (categoryId: string, value: boolean) => {
    setCats((prev) => prev.map((c) => (c.id === categoryId ? { ...c, is_active: value } : c)));
    startTransition(async () => {
      const r = await toggleCategoryActive(categoryId, value);
      if (!r.ok) flash(r.error ?? "Güncellenemedi");
    });
  };

  /* ---------- dialog sonuçları (yerel state senkronu) ---------- */

  const onCategorySaved = (saved: AdminCategory, isNew: boolean) => {
    setCats((prev) =>
      isNew ? [...prev, saved] : prev.map((c) => (c.id === saved.id ? { ...saved, products: c.products } : c))
    );
    setExpanded((prev) => new Set(prev).add(saved.id));
  };

  const onCategoryDeleted = (id: string) => setCats((prev) => prev.filter((c) => c.id !== id));

  const onProductSaved = (saved: AdminProduct, isNew: boolean) => {
    setCats((prev) =>
      prev.map((c) => {
        // kategori değiştiyse eski listeden düş
        const without = c.products.filter((p) => p.id !== saved.id);
        if (c.id === saved.category_id) {
          return { ...c, products: isNew || without.length !== c.products.length ? [...without, saved] : without };
        }
        return { ...c, products: without };
      })
    );
  };

  const onProductDeleted = (id: string) =>
    setCats((prev) => prev.map((c) => ({ ...c, products: c.products.filter((p) => p.id !== id) })));

  const onImagesChange = (productId: string, images: AdminImage[]) => {
    setCats((prev) =>
      prev.map((c) => ({
        ...c,
        products: c.products.map((p) => (p.id === productId ? { ...p, images } : p)),
      }))
    );
    // açık dialog da güncel kalsın
    setEditProduct((prev) =>
      prev?.product?.id === productId
        ? { ...prev, product: { ...prev.product, images } }
        : prev
    );
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold italic">Menü</h1>
          <p className="mt-0.5 text-[13px] text-ink-2">
            Sürükleyerek sırala · değişiklikler <span className="text-accent">/{menuSlug}</span>{" "}
            sayfasına anında yansır
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditCategory("new")}
          className="shrink-0 rounded-full bg-accent px-4 py-2.5 text-[13px] font-extrabold text-accent-fg active:scale-95"
        >
          + Kategori
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-danger/12 px-4 py-3 text-[13px] font-semibold text-danger">
          {error}
        </p>
      )}

      <DndContext id="dnd-categories" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCategoryDragEnd}>
        <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {cats.map((cat) => (
              <SortableCategory
                key={cat.id}
                category={cat}
                currency={currency}
                expanded={expanded.has(cat.id)}
                onToggleExpand={() => toggleExpand(cat.id)}
                onEdit={() => setEditCategory(cat)}
                onActiveChange={(v) => setCategoryActive(cat.id, v)}
                onAddProduct={() => setEditProduct({ product: null, categoryId: cat.id })}
                onEditProduct={(p) => setEditProduct({ product: p, categoryId: cat.id })}
                onProductFlag={setProductFlag}
                onProductDragEnd={onProductDragEnd(cat.id)}
                sensors={sensors}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {cats.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-[14px] text-ink-2">
          Henüz kategori yok. &quot;+ Kategori&quot; ile başla.
        </p>
      )}

      <CategoryDialog
        state={editCategory}
        onClose={() => setEditCategory(null)}
        onSaved={onCategorySaved}
        onDeleted={onCategoryDeleted}
      />
      <ProductDialog
        state={editProduct}
        categories={cats.map((c) => ({ id: c.id, name: c.name }))}
        onClose={() => setEditProduct(null)}
        onSaved={onProductSaved}
        onDeleted={onProductDeleted}
        onImagesChange={onImagesChange}
      />
    </div>
  );
}

/* ================= kategori kartı ================= */

interface SortableCategoryProps {
  category: AdminCategory;
  currency: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onActiveChange: (v: boolean) => void;
  onAddProduct: () => void;
  onEditProduct: (p: AdminProduct) => void;
  onProductFlag: (id: string, flag: "is_active" | "is_sold_out" | "is_featured", v: boolean) => void;
  onProductDragEnd: (e: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
}

function SortableCategory({
  category: cat,
  currency,
  expanded,
  onToggleExpand,
  onEdit,
  onActiveChange,
  onAddProduct,
  onEditProduct,
  onProductFlag,
  onProductDragEnd,
  sensors,
}: SortableCategoryProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cat.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-2xl border border-line bg-card ${isDragging ? "z-10 border-accent shadow-xl" : ""} ${cat.is_active ? "" : "opacity-60"}`}
    >
      {/* başlık satırı */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Sürükle"
          className="cursor-grab touch-none rounded-lg px-1.5 py-2 text-ink-2 hover:bg-surface-2 active:cursor-grabbing"
        >
          ⠿
        </button>
        <button type="button" onClick={onToggleExpand} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="truncate text-[15px] font-extrabold">{cat.name.tr}</span>
          <span className="mq-tabular shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-ink-2">
            {cat.products.length}
          </span>
          {cat.time_window && (
            <span className="hidden shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] font-bold text-ink-2 sm:inline">
              {cat.time_window.start}–{cat.time_window.end}
            </span>
          )}
        </button>
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-ink-2">
          <input
            type="checkbox"
            checked={cat.is_active}
            onChange={(e) => onActiveChange(e.target.checked)}
            className="h-4 w-4 accent-(--mq-accent)"
          />
          Aktif
        </label>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Kategoriyi düzenle"
          className="rounded-lg px-2 py-1.5 text-[13px] hover:bg-surface-2"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={expanded ? "Kapat" : "Aç"}
          className={`rounded-lg px-1.5 py-1.5 text-ink-2 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          ▾
        </button>
      </div>

      {/* ürünler */}
      {expanded && (
        <div className="border-t border-line px-3 pb-3 pt-2">
          <DndContext id={`dnd-products-${cat.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onProductDragEnd}>
            <SortableContext items={cat.products.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {cat.products.map((p) => (
                  <SortableProductRow
                    key={p.id}
                    product={p}
                    currency={currency}
                    onEdit={() => onEditProduct(p)}
                    onFlag={onProductFlag}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button
            type="button"
            onClick={onAddProduct}
            className="mt-2 w-full rounded-xl border border-dashed border-line-strong py-2.5 text-[13px] font-bold text-ink-2 hover:border-accent hover:text-accent"
          >
            + Ürün ekle
          </button>
        </div>
      )}
    </div>
  );
}

/* ================= ürün satırı ================= */

function SortableProductRow({
  product: p,
  currency,
  onEdit,
  onFlag,
}: {
  product: AdminProduct;
  currency: string;
  onEdit: () => void;
  onFlag: (id: string, flag: "is_active" | "is_sold_out" | "is_featured", v: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: p.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-2 ${isDragging ? "z-10 border-accent shadow-lg" : ""} ${p.is_active ? "" : "opacity-50"}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Sürükle"
        className="cursor-grab touch-none rounded-md px-1 py-1.5 text-ink-2 hover:bg-surface-2 active:cursor-grabbing"
      >
        ⠿
      </button>

      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-1.5">
          <span className={`truncate text-[14px] font-bold ${p.is_sold_out ? "line-through" : ""}`}>
            {p.name.tr}
          </span>
          {p.spiciness > 0 && <span className="text-[11px]">{"🌶️".repeat(p.spiciness)}</span>}
          {p.is_bestseller && <span title="Çok Satan (otomatik)" className="text-[11px]">🔥</span>}
        </span>
        <span className="mq-tabular text-[12px] font-semibold text-ink-2">
          {formatPrice(p.price, currency, "tr")}
          {p.compare_at_price ? ` · eski ${formatPrice(p.compare_at_price, currency, "tr")}` : ""}
        </span>
      </button>

      {/* hızlı aksiyonlar */}
      <button
        type="button"
        onClick={() => onFlag(p.id, "is_featured", !p.is_featured)}
        title="Öne çıkar"
        aria-pressed={p.is_featured}
        className={`rounded-md px-1.5 py-1 text-[15px] ${p.is_featured ? "text-accent" : "text-ink-2/50 hover:text-ink-2"}`}
      >
        ★
      </button>
      <label
        title="Tükendi"
        className={`flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-extrabold uppercase ${p.is_sold_out ? "text-danger" : "text-ink-2/60"}`}
      >
        <input
          type="checkbox"
          checked={p.is_sold_out}
          onChange={(e) => onFlag(p.id, "is_sold_out", e.target.checked)}
          className="h-3.5 w-3.5 accent-(--mq-danger)"
        />
        Tükendi
      </label>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Düzenle"
        className="rounded-md px-1.5 py-1 text-[13px] text-ink-2 hover:bg-surface-2"
      >
        ✎
      </button>
    </div>
  );
}
