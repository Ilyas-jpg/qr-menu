"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lang, MenuTenant } from "@/lib/types";
import type { EvaluatedCategory } from "@/lib/pricing";
import { formatPrice, t } from "@/lib/i18n";

/**
 * WhatsApp sipariş sepeti.
 * Sepette yalnız {productId, qty} tutulur — fiyat HER render'da güncel
 * kampanya değerlendirmesinden (evaluated) çekilir; happy-hour bitince
 * sepetteki fiyat da kendiliğinden düzelir.
 * Ödeme entegrasyonu YOK: wa.me linkine formatlı sipariş mesajı.
 */

export type CartItems = Record<string, number>; // productId -> qty

const STR = {
  order: { tr: "WhatsApp'tan Sipariş Ver", en: "Order via WhatsApp" },
  cart: { tr: "Sepet", en: "Cart" },
  total: { tr: "Toplam", en: "Total" },
  note: { tr: "Sipariş notu (opsiyonel)", en: "Order note (optional)" },
  empty: { tr: "Sepet boş", en: "Cart is empty" },
  add: { tr: "Sepete Ekle", en: "Add to Cart" },
  table: { tr: "Masa", en: "Table" },
  msgHeader: { tr: "Yeni Sipariş", en: "New Order" },
  msgNote: { tr: "Not", en: "Note" },
} as const;

export function cartStorageKey(slug: string) {
  return `mq-cart-${slug}`;
}

export function useCart(slug: string) {
  const [items, setItems] = useState<CartItems>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(cartStorageKey(slug));
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* bozuk veri yok sayılır */
    }
  }, [slug]);

  const update = (productId: string, delta: number) => {
    setItems((prev) => {
      const next = { ...prev };
      const qty = (next[productId] ?? 0) + delta;
      if (qty <= 0) delete next[productId];
      else next[productId] = Math.min(qty, 50);
      window.localStorage.setItem(cartStorageKey(slug), JSON.stringify(next));
      return next;
    });
  };

  const clear = () => {
    setItems({});
    window.localStorage.removeItem(cartStorageKey(slug));
  };

  return { items, update, clear };
}

interface CartBarProps {
  tenant: MenuTenant;
  evaluated: EvaluatedCategory[];
  items: CartItems;
  lang: Lang;
  tableCode: string | null;
  onOpen: () => void;
}

/** Alt sepet çubuğu — yalnız sepette ürün varken görünür */
export function CartBar({ tenant, evaluated, items, lang, onOpen }: Omit<CartBarProps, "tableCode">) {
  const { count, total } = useMemo(() => {
    let count = 0;
    let total = 0;
    const all = evaluated.flatMap((c) => c.products);
    for (const [id, qty] of Object.entries(items)) {
      const p = all.find((x) => x.id === id);
      if (!p) continue;
      count += qty;
      total += p.resolved.price * qty;
    }
    return { count, total };
  }, [evaluated, items]);

  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-full bg-accent px-5 py-3 text-accent-fg shadow-2xl transition-transform active:scale-[0.99]"
    >
      <span className="flex items-center gap-2 text-[14px] font-extrabold">
        🛒 {t(STR.cart, lang)}
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black/20 px-1.5 text-[11px] font-black">
          {count}
        </span>
      </span>
      <span className="mq-tabular text-[15px] font-extrabold">
        {formatPrice(total, tenant.currency, lang)}
      </span>
    </button>
  );
}

interface CartSheetProps extends Omit<CartBarProps, "onOpen"> {
  open: boolean;
  onClose: () => void;
  onUpdate: (productId: string, delta: number) => void;
  onClear: () => void;
  /** WhatsApp linkine tıklanınca (analitik) */
  onOrderClick?: () => void;
}

export function CartSheet({
  tenant,
  evaluated,
  items,
  lang,
  tableCode,
  open,
  onClose,
  onUpdate,
  onClear,
  onOrderClick,
}: CartSheetProps) {
  const [note, setNote] = useState("");

  const lines = useMemo(() => {
    const all = evaluated.flatMap((c) => c.products);
    return Object.entries(items)
      .map(([id, qty]) => {
        const p = all.find((x) => x.id === id);
        return p ? { product: p, qty } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [evaluated, items]);

  const total = lines.reduce((sum, l) => sum + l.product.resolved.price * l.qty, 0);

  if (!open) return null;

  const waLink = () => {
    const phone = (tenant.whatsapp_phone ?? "").replace(/[^0-9]/g, "");
    const rows = lines.map(
      (l) =>
        `• ${l.qty} × ${t(l.product.name, lang)} — ${formatPrice(l.product.resolved.price * l.qty, tenant.currency, lang)}`
    );
    const msg = [
      `🍽 ${t(STR.msgHeader, lang)} — ${tenant.name}`,
      tableCode ? `${t(STR.table, lang)}: ${tableCode}` : null,
      "",
      ...rows,
      "",
      `${t(STR.total, lang)}: ${formatPrice(total, tenant.currency, lang)}`,
      note.trim() ? `${t(STR.msgNote, lang)}: ${note.trim()}` : null,
    ]
      .filter((x): x is string => x !== null)
      .join("\n");
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t(STR.cart, lang)}>
      <button type="button" aria-label="Kapat" onClick={onClose} className="mq-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="mq-sheet absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-t-3xl border border-line-strong bg-surface shadow-2xl">
        <div className="absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-full bg-ink-2/40" />

        <div className="flex items-center justify-between px-5 pb-2 pt-7">
          <h2 className="font-display text-xl font-semibold italic">🛒 {t(STR.cart, lang)}</h2>
          {lines.length > 0 && (
            <button type="button" onClick={onClear} className="text-[12px] font-bold text-danger hover:underline">
              {lang === "tr" ? "Sepeti boşalt" : "Clear cart"}
            </button>
          )}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-5 pb-4">
          {lines.length === 0 && (
            <p className="py-10 text-center text-[14px] text-ink-2">{t(STR.empty, lang)}</p>
          )}
          {lines.map(({ product: p, qty }) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-card px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold">{t(p.name, lang)}</p>
                <p className="mq-tabular text-[12px] font-semibold text-ink-2">
                  {formatPrice(p.resolved.price, tenant.currency, lang)}
                  {p.resolved.original != null && (
                    <s className="ml-1.5 text-[11px]">{formatPrice(p.resolved.original, tenant.currency, lang)}</s>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onUpdate(p.id, -1)} aria-label="Azalt" className="h-8 w-8 rounded-full border border-line-strong text-[15px] font-black active:scale-90">
                  −
                </button>
                <span className="mq-tabular w-7 text-center text-[14px] font-extrabold">{qty}</span>
                <button type="button" onClick={() => onUpdate(p.id, 1)} aria-label="Artır" className="h-8 w-8 rounded-full bg-accent text-[15px] font-black text-accent-fg active:scale-90">
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {lines.length > 0 && (
          <div className="space-y-3 border-t border-line px-5 pb-8 pt-4">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t(STR.note, lang)}
              maxLength={200}
              className="h-11 w-full rounded-xl border border-line-strong bg-card px-3.5 text-[14px] outline-none focus:border-accent"
            />
            <div className="flex items-center justify-between text-[15px] font-extrabold">
              <span>{t(STR.total, lang)}</span>
              <span className="mq-tabular">{formatPrice(total, tenant.currency, lang)}</span>
            </div>
            <a
              href={waLink()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onOrderClick}
              className="block w-full rounded-2xl bg-[#25D366] py-3.5 text-center text-[15px] font-extrabold text-white active:scale-[0.99]"
            >
              💬 {t(STR.order, lang)}
            </a>
            <p className="text-center text-[11px] text-ink-2">
              {lang === "tr"
                ? "Sipariş WhatsApp üzerinden işletmeye iletilir."
                : "Your order is sent to the restaurant via WhatsApp."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export const CART_STRINGS = STR;
