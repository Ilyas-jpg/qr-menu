import type { Lang } from "@/lib/types";
import type { EvaluatedProduct } from "@/lib/pricing";
import { BADGES, DIETARY } from "@/lib/constants";
import { formatPrice, t, ui } from "@/lib/i18n";

/** Acılık: 1-3 kırmızı biber noktası */
export function SpicinessDots({ level }: { level: number }) {
  if (!level) return null;
  return (
    <span
      className="inline-flex items-center gap-[3px] align-middle"
      title={`Acılık ${level}/3`}
      aria-label={`Acılık ${level}/3`}
    >
      {Array.from({ length: level }).map((_, i) => (
        <span key={i} className="text-[11px] leading-none">🌶️</span>
      ))}
    </span>
  );
}

/**
 * Diyet rozetleri: renk noktası + kelime ("● Vegan") — harf kısaltması anlaşılmıyordu.
 * compact modda en fazla 2 etiket + "+n" (kart yoğunluğu); detay sheet'inde tümü.
 */
export function DietBadges({
  dietary,
  lang,
  compact = false,
}: {
  dietary: EvaluatedProduct["dietary"];
  lang: Lang;
  compact?: boolean;
}) {
  if (!dietary?.length) return null;
  const visible = compact ? dietary.slice(0, 2) : dietary;
  const hidden = dietary.length - visible.length;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {visible.map((d) => (
        <span
          key={d}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/60 px-2 py-[3px] text-[10px] font-bold text-ink-2"
        >
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: DIETARY[d].dot }}
          />
          {t(DIETARY[d].label, lang)}
        </span>
      ))}
      {hidden > 0 && (
        <span className="rounded-full border border-line px-1.5 py-[3px] text-[10px] font-bold text-ink-2">
          +{hidden}
        </span>
      )}
    </span>
  );
}

/** Ürün etiketi çipleri: Yeni / Şefin Seçimi / Çok Satan / kampanya badge'i */
export function ProductBadges({
  product,
  lang,
}: {
  product: EvaluatedProduct;
  lang: Lang;
}) {
  const chips: { key: string; label: string; accent: boolean }[] = [];
  if (product.resolved.badge) {
    chips.push({ key: "campaign", label: t(product.resolved.badge, lang), accent: true });
  }
  if (product.is_bestseller) {
    chips.push({ key: "bestseller", label: t(BADGES.bestseller.label, lang), accent: false });
  }
  for (const b of product.badges) {
    chips.push({ key: b, label: t(BADGES[b].label, lang), accent: false });
  }
  if (!chips.length) return null;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <span
          key={c.key}
          className={
            c.accent
              ? "rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-fg"
              : "rounded-full border border-line-strong px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent"
          }
        >
          {c.label}
        </span>
      ))}
    </span>
  );
}

/** Fiyat: kampanyalıysa accent + üstü çizili orijinal */
export function PriceTag({
  product,
  currency,
  lang,
  size = "md",
}: {
  product: EvaluatedProduct;
  currency: string;
  lang: Lang;
  size?: "md" | "lg";
}) {
  const { price, original } = product.resolved;
  return (
    <span className={`mq-tabular inline-flex items-baseline gap-1.5 ${size === "lg" ? "text-xl" : "text-[15px]"}`}>
      {original != null && (
        <s className="text-ink-2 text-[0.78em] font-medium decoration-[1.5px]">
          {formatPrice(original, currency, lang)}
        </s>
      )}
      <span className={`font-extrabold ${original != null ? "text-accent" : "text-ink"}`}>
        {formatPrice(price, currency, lang)}
      </span>
    </span>
  );
}

/** Tükendi şeridi */
export function SoldOutChip({ lang }: { lang: Lang }) {
  return (
    <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-danger">
      {ui("soldOut", lang)}
    </span>
  );
}

/** Görselsiz ürünler için monogram plakası (Fraunces italik altın harf) */
export function Monogram({ name, className = "" }: { name: string; className?: string }) {
  const letter = (name?.trim()?.[0] ?? "•").toLocaleUpperCase("tr-TR");
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center bg-[radial-gradient(120%_120%_at_30%_20%,rgb(var(--mq-accent-rgb)/0.28),rgb(var(--mq-accent-rgb)/0.06)_55%,transparent)] ${className}`}
    >
      <span className="font-display italic text-accent/85 text-3xl leading-none select-none">
        {letter}
      </span>
    </div>
  );
}
