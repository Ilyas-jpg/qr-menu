import type { Lang, LString } from "./types";

/**
 * Çok dilli jsonb alan çözücü. İstenen dil boşsa TR'ye düşer.
 * (Public yüzeyde next-intl bilinçli olarak YOK — içerik DB'den geliyor,
 * tek cache'li sayfa iki dili de taşır, dil değişimi route değiştirmez.)
 */
export function t(s: LString | null | undefined, lang: Lang): string {
  if (!s) return "";
  if (lang !== "tr") {
    const v = s[lang];
    if (v && v.trim().length > 0) return v;
  }
  return s.tr ?? "";
}

/** UI sözlüğü (içerik değil, arayüz metinleri) */
export const UI = {
  menu:            { tr: "Menü",                   en: "Menu" },
  search:          { tr: "Menüde ara…",            en: "Search the menu…" },
  filters:         { tr: "Filtreler",              en: "Filters" },
  clearFilters:    { tr: "Filtreleri temizle",     en: "Clear filters" },
  dietary:         { tr: "Beslenme tercihi",       en: "Dietary preference" },
  excludeAllergens:{ tr: "Alerjen içermesin",      en: "Exclude allergens" },
  spiciness:       { tr: "Acılık",                 en: "Spiciness" },
  soldOut:         { tr: "Bugün tükendi",          en: "Sold out today" },
  featured:        { tr: "Öne Çıkanlar",           en: "Featured" },
  calories:        { tr: "kalori",                 en: "kcal" },
  minutes:         { tr: "dk",                     en: "min" },
  allergens:       { tr: "Alerjenler",             en: "Allergens" },
  noAllergens:     { tr: "Bilinen alerjen içermez", en: "No known allergens" },
  closedNow:       { tr: "Şu an servis dışı",      en: "Not served right now" },
  servedBetween:   { tr: "Servis saatleri",        en: "Served between" },
  noResults:       { tr: "Aradığınız kriterde ürün bulunamadı", en: "No items match your filters" },
  table:           { tr: "Masa",                   en: "Table" },
  wifi:            { tr: "Wi-Fi",                  en: "Wi-Fi" },
  wifiPassword:    { tr: "Şifre",                  en: "Password" },
  viewDetails:     { tr: "Detay",                  en: "Details" },
  close:           { tr: "Kapat",                  en: "Close" },
  poweredBy:       { tr: "Dijital menü",           en: "Digital menu" },
} satisfies Record<string, LString>;

export type UIKey = keyof typeof UI;

export function ui(key: UIKey, lang: Lang): string {
  return t(UI[key], lang);
}

/** Fiyat biçimleme — kuruş varsa göster, yoksa tam sayı */
export function formatPrice(value: number, currency: string, lang: Lang): string {
  const hasFraction = Math.round(value * 100) % 100 !== 0;
  return new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(value);
}
