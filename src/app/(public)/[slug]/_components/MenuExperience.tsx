"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Lang, MenuPayload } from "@/lib/types";
import {
  evaluateMenu,
  type EvaluatedCategory,
  type EvaluatedProduct,
} from "@/lib/pricing";
import { t, ui } from "@/lib/i18n";
import { ProductCard } from "./ProductCard";
import { ProductSheet } from "./ProductSheet";
import { EMPTY_FILTERS, FilterSheet, productMatches, type MenuFilters } from "./FilterSheet";
import { ServiceButtons } from "./ServiceButtons";
import { CartBar, CartSheet, useCart } from "./Cart";
import { initTracker, track } from "./tracker";
import { Monogram, PriceTag } from "./bits";
import { imageSrc } from "@/lib/constants";

interface Props {
  menu: MenuPayload;
  /** Server'da hesaplanan ilk durum — hydration server HTML ile birebir aynı kalır,
      mount sonrası effect gerçek saatle tazeler (ISR cache eski olsa bile düzelir) */
  initialEvaluated: EvaluatedCategory[];
}

export function MenuExperience({ menu, initialEvaluated }: Props) {
  const { tenant, campaigns } = menu;

  const [lang, setLang] = useState<Lang>(tenant.default_lang);
  const [evaluated, setEvaluated] = useState<EvaluatedCategory[]>(initialEvaluated);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<MenuFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [active, setActive] = useState<EvaluatedProduct | null>(null);
  // Sekmeli gezinme: tek seferde TEK kategori gösterilir (upuzun sayfa yok)
  const [activeCat, setActiveCat] = useState<string | null>(initialEvaluated[0]?.id ?? null);
  const [tableCode, setTableCode] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart(tenant.slug);
  const whatsappEnabled = Boolean(tenant.whatsapp_phone);
  const cartCount = Object.values(cart.items).reduce((a, b) => a + b, 0);

  // Dil tercihini hatırla (route değişmez, iki dil de payload'da)
  useEffect(() => {
    const saved = window.localStorage.getItem("mq-lang") as Lang | null;
    if (saved && tenant.languages.includes(saved)) setLang(saved);
  }, [tenant.languages]);

  const switchLang = (l: Lang) => {
    setLang(l);
    window.localStorage.setItem("mq-lang", l);
    track({ type: "lang_switch", lang: l });
  };

  // Analitik: izleyici + sayfa görüntüleme (session başına bir)
  useEffect(() => {
    const cleanup = initTracker(tenant.slug);
    track({ type: "menu_view" }, "menu_view");
    return cleanup;
  }, [tenant.slug]);

  // QR taraması (masa parametresiyle geliş — session başına bir)
  useEffect(() => {
    if (tableCode) track({ type: "qr_scan", table_code: tableCode }, "qr_scan");
  }, [tableCode]);

  const openProduct = (p: EvaluatedProduct) => {
    setActive(p);
    track({ type: "product_view", product_id: p.id, category_id: p.category_id }, `prod-${p.id}`);
  };

  // Zaman penceresi + kampanya time-flip: mount'ta ve her dakika yeniden değerlendir
  useEffect(() => {
    const recompute = () => setEvaluated(evaluateMenu(menu.categories, campaigns));
    recompute();
    const id = window.setInterval(recompute, 60_000);
    return () => window.clearInterval(id);
  }, [menu.categories, campaigns]);

  const barRef = useRef<HTMLDivElement>(null);

  const filterCount = filters.dietary.length + filters.excludeAllergens.length;
  /** Arama/filtre aktifken TÜM menüde aranır; sekme görünümü geçici devre dışı */
  const searchMode = query.trim().length > 0 || filterCount > 0;

  // Aktif kategori görüntüleme analitiği (sekme seçimi = gerçek niyet sinyali)
  useEffect(() => {
    if (activeCat && !searchMode) track({ type: "category_view", category_id: activeCat }, `cat-${activeCat}`);
  }, [activeCat, searchMode]);

  const selectCategory = (catId: string) => {
    setQuery("");
    setActiveCat(catId);
    // İçerik sticky bar'ın hemen altından başlasın (başlığı geç, ürüne odaklan)
    const top = (barRef.current?.offsetTop ?? 0) - 1;
    if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
    else if (window.scrollY < top - 40) window.scrollTo({ top, behavior: "smooth" });
  };

  // Filtre + arama uygulanmış görünüm
  const visible = useMemo(
    () =>
      evaluated
        .map((cat) => ({
          ...cat,
          products: cat.products.filter((p) => productMatches(p, filters, query, lang)),
        }))
        .filter((cat) => cat.products.length > 0),
    [evaluated, filters, query, lang]
  );

  const featured = useMemo(
    () => evaluated.flatMap((c) => c.products).filter((p) => p.is_featured),
    [evaluated]
  );

  const hasEn = tenant.languages.includes("en");

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* ---------- BAŞLIK ---------- */}
      <header
        className="mq-rise px-5 pb-5 [padding-top:calc(env(safe-area-inset-top)+1.75rem)]"
        style={{ "--rise-delay": "0ms" } as React.CSSProperties}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {tenant.logo_path ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={tenant.logo_path}
                alt={tenant.name}
                className="mb-3 h-12 w-auto"
                width={96}
                height={48}
              />
            ) : null}
            <h1 className="font-display text-[34px] font-semibold italic leading-[1.05] tracking-tight">
              {tenant.name}
            </h1>
            {tenant.address && (
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{tenant.address}</p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {hasEn && (
              <div className="flex overflow-hidden rounded-full border border-line-strong text-[12px] font-extrabold">
                {(tenant.languages as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => switchLang(l)}
                    aria-pressed={lang === l}
                    className={`px-3 py-1.5 uppercase tracking-wider transition-colors ${
                      lang === l ? "bg-accent text-accent-fg" : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
            <Suspense fallback={null}>
              <TableBridge onTable={setTableCode} />
            </Suspense>
            {tableCode && (
              <span className="rounded-full border border-accent/50 bg-accent/10 px-3 py-1.5 text-[12px] font-extrabold text-accent">
                {ui("table", lang)} {tableCode}
              </span>
            )}
          </div>
        </div>

        {tenant.wifi_ssid && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2">
            <span className="text-accent">⌁</span>
            {ui("wifi", lang)}: <span className="text-ink">{tenant.wifi_ssid}</span>
            {tenant.wifi_password && (
              <>
                <span className="text-line-strong">·</span>
                {ui("wifiPassword", lang)}: <span className="text-ink">{tenant.wifi_password}</span>
              </>
            )}
          </div>
        )}
      </header>

      {/* ---------- ÖNE ÇIKANLAR ---------- */}
      {featured.length > 0 && (
        <section
          className="mq-rise mb-2"
          style={{ "--rise-delay": "80ms" } as React.CSSProperties}
          aria-label={ui("featured", lang)}
        >
          <div className="mb-2.5 flex items-center gap-3 px-5">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-accent">
              ★ {ui("featured", lang)}
            </h2>
            <div className="mq-rule flex-1" />
          </div>
          <div className="mq-scroll-x flex snap-x gap-3 overflow-x-auto px-5 pb-2">
            {featured.map((p, i) => {
              const img = p.images[0];
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openProduct(p)}
                  className={`w-[230px] shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-card text-left active:scale-[0.985] ${p.is_sold_out ? "opacity-55 saturate-50" : ""}`}
                >
                  {img ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={imageSrc(img.file_stem, 640)}
                      sizes="230px"
                      alt={t(p.name, lang)}
                      width={img.width}
                      height={img.height}
                      /* rayda yalnız ilk kart ekranda — kalanı yatay scroll'da, bant genişliği LCP'ye kalsın */
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                      className="aspect-[16/10] w-full object-cover"
                    />
                  ) : (
                    <Monogram name={t(p.name, lang)} className="aspect-[16/10] w-full" />
                  )}
                  <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                    <span className="truncate text-[14px] font-bold">{t(p.name, lang)}</span>
                    <PriceTag product={p} currency={tenant.currency} lang={lang} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------- YAPIŞKAN NAV: arama + filtre + kategori sekmeleri ---------- */}
      <div
        ref={barRef}
        className="mq-rise sticky top-0 z-40 border-b border-line bg-surface/95 pb-2.5 backdrop-blur-md [padding-top:max(0.625rem,env(safe-area-inset-top))]"
        style={{ "--rise-delay": "140ms" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2 px-5">
          <label className="flex h-10 flex-1 items-center gap-2 rounded-full border border-line bg-card px-3.5">
            <span aria-hidden className="text-ink-2">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={ui("search", lang)}
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-ink-2"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label={ui("close", lang)} className="text-ink-2">
                ✕
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className={`relative h-10 shrink-0 rounded-full border px-4 text-[13px] font-extrabold ${
              filterCount > 0 ? "border-accent bg-accent text-accent-fg" : "border-line-strong text-ink"
            }`}
          >
            {ui("filters", lang)}
            {filterCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-black text-white">
                {filterCount}
              </span>
            )}
          </button>
        </div>

        <nav className="mq-scroll-x mt-2.5 flex gap-1.5 overflow-x-auto px-5" aria-label={ui("menu", lang)}>
          {evaluated.map((cat) => {
            const isActive = !searchMode && activeCat === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => selectCategory(cat.id)}
                aria-pressed={isActive}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-all ${
                  isActive
                    ? "border-accent bg-accent text-accent-fg shadow-[0_2px_12px_rgb(var(--mq-accent-rgb)/0.35)]"
                    : `border-line bg-card text-ink-2 hover:border-line-strong hover:text-ink ${cat.isOpen ? "" : "opacity-50"} ${searchMode ? "opacity-60" : ""}`
                }`}
              >
                {t(cat.name, lang)}
                <span className={`mq-tabular ml-1.5 text-[11px] ${isActive ? "opacity-70" : "opacity-50"}`}>
                  {cat.products.length}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ---------- İÇERİK: arama modunda gruplu sonuçlar, normalde TEK kategori ---------- */}
      <main className={`px-5 pt-5 ${tableCode || cartCount > 0 ? "pb-44" : "pb-16"}`}>
        {searchMode ? (
          <div className="space-y-9">
            {visible.length === 0 && (
              <p className="py-16 text-center text-[14px] text-ink-2">{ui("noResults", lang)}</p>
            )}
            {visible.map((cat) => (
              <section key={cat.id} className="mq-fade">
                <CategoryHeading cat={cat} lang={lang} />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {cat.products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      currency={tenant.currency}
                      lang={lang}
                      onOpen={openProduct}
                      dimmed={!cat.isOpen}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          (() => {
            const cat = evaluated.find((c) => c.id === activeCat) ?? evaluated[0];
            if (!cat) {
              return <p className="py-16 text-center text-[14px] text-ink-2">{ui("noResults", lang)}</p>;
            }
            return (
              <section key={cat.id} className="mq-fade">
                <CategoryHeading cat={cat} lang={lang} />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {cat.products.map((p, j) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      currency={tenant.currency}
                      lang={lang}
                      onOpen={openProduct}
                      priority={j < 1}
                      dimmed={!cat.isOpen}
                    />
                  ))}
                </div>
              </section>
            );
          })()
        )}
      </main>

      {/* ---------- ALT BİLGİ ---------- */}
      <footer className="border-t border-line px-5 pb-12 pt-8 text-center">
        <p className="font-display text-lg font-semibold italic">{tenant.name}</p>
        <div className="mt-2 space-y-1 text-[13px] text-ink-2">
          {tenant.address && <p>{tenant.address}</p>}
          {tenant.phone && (
            <p>
              <a href={`tel:${tenant.phone}`} className="underline-offset-4 hover:text-ink hover:underline">
                {tenant.phone}
              </a>
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-[12px] font-bold uppercase tracking-wider text-accent">
          {tenant.instagram_url && (
            <a href={tenant.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              Instagram
            </a>
          )}
          {tenant.google_maps_url && (
            <a href={tenant.google_maps_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {lang === "tr" ? "Yol Tarifi" : "Directions"}
            </a>
          )}
        </div>
        <p className="mt-6 text-[11px] text-ink-2/70">{ui("poweredBy", lang)} · QR Menü</p>
      </footer>

      <ProductSheet
        product={active}
        tenant={tenant}
        lang={lang}
        onClose={() => setActive(null)}
        onAddToCart={
          whatsappEnabled
            ? (p) => {
                cart.update(p.id, 1);
                setActive(null);
              }
            : undefined
        }
      />
      <FilterSheet
        open={filterOpen}
        filters={filters}
        lang={lang}
        onChange={setFilters}
        onClose={() => setFilterOpen(false)}
      />

      {/* Sepet çubuğu — servis çubuğunun üstünde durur */}
      {whatsappEnabled && cartCount > 0 && (
        <div
          className={`pointer-events-none fixed inset-x-0 z-50 mx-auto w-full max-w-2xl px-4 ${
            tableCode ? "bottom-[92px]" : "bottom-[max(env(safe-area-inset-bottom),16px)]"
          }`}
        >
          <CartBar
            tenant={tenant}
            evaluated={evaluated}
            items={cart.items}
            lang={lang}
            onOpen={() => setCartOpen(true)}
          />
        </div>
      )}

      <CartSheet
        tenant={tenant}
        evaluated={evaluated}
        items={cart.items}
        lang={lang}
        tableCode={tableCode}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onUpdate={cart.update}
        onClear={cart.clear}
        onOrderClick={() => track({ type: "whatsapp_order_click", table_code: tableCode })}
      />

      {tableCode && <ServiceButtons tenant={tenant} tableCode={tableCode} lang={lang} />}
    </div>
  );
}

/** Kategori başlığı: ad + altın hairline + açıklama + servis saati çipi */
function CategoryHeading({ cat, lang }: { cat: EvaluatedCategory & { isOpen: boolean }; lang: Lang }) {
  return (
    <>
      <div className="mb-1 flex items-baseline gap-3">
        <h2 className="font-display text-[24px] font-semibold italic leading-tight">
          {t(cat.name, lang)}
        </h2>
        <div className="mq-rule flex-1 self-center" />
      </div>
      {cat.description && <p className="mb-3 text-[13px] text-ink-2">{t(cat.description, lang)}</p>}
      {cat.time_window && (
        <p
          className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
            cat.isOpen ? "bg-surface-2 text-ink-2" : "bg-danger/12 text-danger"
          }`}
        >
          {cat.isOpen
            ? `${ui("servedBetween", lang)}: ${cat.time_window.start}–${cat.time_window.end}`
            : `${ui("closedNow", lang)} · ${cat.time_window.start}–${cat.time_window.end}`}
        </p>
      )}
      {!cat.description && !cat.time_window && <div className="mb-3" />}
    </>
  );
}

/** ?m=masa-kodu okuyup üst state'e taşır (Suspense içinde — useSearchParams gereği) */
function TableBridge({ onTable }: { onTable: (code: string | null) => void }) {
  const params = useSearchParams();
  const code = params.get("m");
  useEffect(() => {
    onTable(code);
  }, [code, onTable]);
  return null;
}
