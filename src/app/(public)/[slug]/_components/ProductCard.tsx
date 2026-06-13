"use client";

import type { Lang } from "@/lib/types";
import type { EvaluatedProduct } from "@/lib/pricing";
import { CARD_IMAGE_VARIANTS, imageSrc, imageSrcSet } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { DietBadges, Monogram, PriceTag, ProductBadges, SoldOutChip, SpicinessDots } from "./bits";

interface Props {
  product: EvaluatedProduct;
  currency: string;
  lang: Lang;
  onOpen: (p: EvaluatedProduct) => void;
  /** İlk ekrana girecek görseller için fetchpriority=high */
  priority?: boolean;
  dimmed?: boolean;
}

/**
 * İki varyant tek bileşende:
 *  - Görselli: kenardan-kenara 4:3 foto, altta bilgi (foto-dominant)
 *  - Görselsiz: monogram plakalı kompakt satır (gerçek menülerin çoğu böyle başlar)
 */
export function ProductCard({ product, currency, lang, onOpen, priority, dimmed }: Props) {
  const img = product.images[0];
  const name = t(product.name, lang);
  const desc = t(product.description, lang);
  const soldOut = product.is_sold_out;
  const inert = soldOut || dimmed;

  if (img) {
    return (
      <button
        type="button"
        onClick={() => onOpen(product)}
        className={`group w-full overflow-hidden rounded-2xl border border-line bg-card text-left transition-transform duration-200 active:scale-[0.985] ${inert ? "opacity-55 saturate-50" : ""}`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
          {/* Varyantlar upload anında sharp ile üretildi — next/image yok, LiteSpeed servis eder */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc(img.file_stem, 640)}
            /* LCP kartı sabit 640 indirir (gıda fotoğrafında ~1.8x yoğunluk yeterli) —
               preload ile birebir aynı URL, cache'ten gelir. Diğer kartlar srcset'le seçer. */
            srcSet={priority ? undefined : imageSrcSet(img.file_stem, CARD_IMAGE_VARIANTS)}
            sizes={priority ? undefined : "(min-width: 768px) 310px, calc(100vw - 40px)"}
            width={img.width}
            height={img.height}
            alt={name}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : undefined}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            style={
              img.blur_data
                ? { backgroundImage: `url(${img.blur_data})`, backgroundSize: "cover" }
                : undefined
            }
          />
          {product.images.length > 1 && (
            <span className="absolute right-2.5 top-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              {product.images.length} 📷
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
            <ProductBadges product={product} lang={lang} />
            {soldOut && <SoldOutChip lang={lang} />}
          </div>
        </div>
        <div className="flex items-start justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 text-[15px] font-bold leading-snug">
              <span className={soldOut ? "line-through decoration-1" : ""}>{name}</span>
              <SpicinessDots level={product.spiciness} />
            </h3>
            {desc && (
              <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-2">{desc}</p>
            )}
            <div className="mt-1.5">
              <DietBadges dietary={product.dietary} lang={lang} compact />
            </div>
          </div>
          <PriceTag product={product} currency={currency} lang={lang} />
        </div>
      </button>
    );
  }

  // Görselsiz kompakt satır
  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      className={`group flex w-full items-stretch gap-3.5 overflow-hidden rounded-2xl border border-line bg-card p-3 text-left transition-transform duration-200 active:scale-[0.985] ${inert ? "opacity-55" : ""}`}
    >
      <Monogram name={name} className="h-[72px] w-[72px] shrink-0 rounded-xl border border-line" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="flex min-w-0 items-center gap-1.5 text-[15px] font-bold leading-snug">
            <span className={`truncate ${soldOut ? "line-through decoration-1" : ""}`}>{name}</span>
            <SpicinessDots level={product.spiciness} />
          </h3>
          <PriceTag product={product} currency={currency} lang={lang} />
        </div>
        {desc && <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-2">{desc}</p>}
        <div className="flex items-center gap-2">
          <ProductBadges product={product} lang={lang} />
          <DietBadges dietary={product.dietary} lang={lang} compact />
          {soldOut && <SoldOutChip lang={lang} />}
        </div>
      </div>
    </button>
  );
}
