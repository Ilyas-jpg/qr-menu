"use client";

import { useEffect } from "react";
import type { Lang, MenuTenant } from "@/lib/types";
import type { EvaluatedProduct } from "@/lib/pricing";
import { ALLERGENS, imageSrc, imageSrcSet } from "@/lib/constants";
import { t, ui } from "@/lib/i18n";
import { DietBadges, Monogram, PriceTag, ProductBadges, SoldOutChip, SpicinessDots } from "./bits";

interface Props {
  product: EvaluatedProduct | null;
  tenant: MenuTenant;
  lang: Lang;
  onClose: () => void;
  /** WhatsApp sipariş açıksa tanımlı — "Sepete Ekle" butonunu gösterir */
  onAddToCart?: (p: EvaluatedProduct) => void;
}

/** Ürün detayı: alttan açılan sheet — swipe galerisi + alerjen/diyet/meta */
export function ProductSheet({ product, tenant, lang, onClose, onAddToCart }: Props) {
  // Sheet açıkken arka plan kaymasın
  useEffect(() => {
    if (!product) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [product, onClose]);

  if (!product) return null;

  const name = t(product.name, lang);
  const desc = t(product.description, lang);
  const showCalories = tenant.settings.show_calories && product.calories != null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={name}>
      <button
        type="button"
        aria-label={ui("close", lang)}
        onClick={onClose}
        className="mq-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />
      <div className="mq-sheet absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line-strong bg-surface shadow-2xl">
        {/* Tutamak */}
        <div className="absolute left-1/2 top-2.5 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-ink-2/40" />

        <div className="overflow-y-auto overscroll-contain">
          {/* Galeri */}
          {product.images.length > 0 ? (
            <div className="mq-scroll-x flex snap-x snap-mandatory overflow-x-auto">
              {product.images.map((img, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={img.file_stem}
                  src={imageSrc(img.file_stem, 1280)}
                  srcSet={imageSrcSet(img.file_stem)}
                  sizes="(min-width: 672px) 672px, 100vw"
                  width={img.width}
                  height={img.height}
                  alt={`${name} — ${i + 1}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="aspect-[4/3] w-full shrink-0 snap-center object-cover"
                />
              ))}
            </div>
          ) : (
            <Monogram name={name} className="aspect-[5/2] w-full border-b border-line" />
          )}

          <div className="space-y-4 px-5 pb-8 pt-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <ProductBadges product={product} lang={lang} />
                  {product.is_sold_out && <SoldOutChip lang={lang} />}
                </div>
                <h2 className="font-display text-2xl font-semibold italic leading-tight">
                  {name} <SpicinessDots level={product.spiciness} />
                </h2>
              </div>
              <PriceTag product={product} currency={tenant.currency} lang={lang} size="lg" />
            </div>

            {desc && <p className="text-[15px] leading-relaxed text-ink-2">{desc}</p>}

            {/* Meta satırı: porsiyon · süre · kalori */}
            {(product.portion || product.prep_time_minutes || showCalories) && (
              <div className="flex flex-wrap gap-2 text-[12px] font-semibold text-ink-2">
                {product.portion && (
                  <span className="rounded-full bg-surface-2 px-3 py-1">{product.portion}</span>
                )}
                {product.prep_time_minutes != null && product.prep_time_minutes > 0 && (
                  <span className="rounded-full bg-surface-2 px-3 py-1">
                    ⏱ {product.prep_time_minutes} {ui("minutes", lang)}
                  </span>
                )}
                {showCalories && (
                  <span className="rounded-full bg-surface-2 px-3 py-1">
                    🔥 {product.calories} {ui("calories", lang)}
                  </span>
                )}
                <DietBadges dietary={product.dietary} lang={lang} />
              </div>
            )}

            {/* Alerjenler */}
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent">
                  {ui("allergens", lang)}
                </h3>
                <div className="mq-rule flex-1" />
              </div>
              {product.allergens.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {product.allergens.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-1 text-[12px] font-semibold"
                    >
                      <span aria-hidden>{ALLERGENS[a].emoji}</span>
                      {t(ALLERGENS[a].label, lang)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-ink-2">{ui("noAllergens", lang)}</p>
              )}
            </div>

            {onAddToCart && !product.is_sold_out && (
              <button
                type="button"
                onClick={() => onAddToCart(product)}
                className="w-full rounded-2xl bg-accent py-3.5 text-[15px] font-extrabold text-accent-fg active:scale-[0.99]"
              >
                🛒 {lang === "tr" ? "Sepete Ekle" : "Add to Cart"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
