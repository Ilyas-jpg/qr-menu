import type { AllergenKey, BadgeKey, DietaryKey, LString } from "./types";

/** Tenant slug'ı olamayacak rezerve yollar (route çakışması + güvenlik) */
export const RESERVED_SLUGS = new Set([
  "admin", "api", "uploads", "_next", "login", "logout", "static", "assets",
  "favicon.ico", "robots.txt", "sitemap.xml", "manifest.json", "qr", "m",
]);

/** AB 14 standart alerjeni */
export const ALLERGENS: Record<AllergenKey, { label: LString; emoji: string }> = {
  gluten:      { label: { tr: "Gluten",          en: "Gluten" },      emoji: "🌾" },
  crustaceans: { label: { tr: "Kabuklular",      en: "Crustaceans" }, emoji: "🦐" },
  eggs:        { label: { tr: "Yumurta",         en: "Eggs" },        emoji: "🥚" },
  fish:        { label: { tr: "Balık",           en: "Fish" },        emoji: "🐟" },
  peanuts:     { label: { tr: "Yer fıstığı",     en: "Peanuts" },     emoji: "🥜" },
  soybeans:    { label: { tr: "Soya",            en: "Soy" },         emoji: "🫘" },
  milk:        { label: { tr: "Süt ürünleri",    en: "Dairy" },       emoji: "🥛" },
  nuts:        { label: { tr: "Sert kabuklular", en: "Tree nuts" },   emoji: "🌰" },
  celery:      { label: { tr: "Kereviz",         en: "Celery" },      emoji: "🥬" },
  mustard:     { label: { tr: "Hardal",          en: "Mustard" },     emoji: "🟡" },
  sesame:      { label: { tr: "Susam",           en: "Sesame" },      emoji: "⚪" },
  sulphites:   { label: { tr: "Sülfit",          en: "Sulphites" },   emoji: "🍷" },
  lupin:       { label: { tr: "Acı bakla",       en: "Lupin" },       emoji: "🌿" },
  molluscs:    { label: { tr: "Yumuşakçalar",    en: "Molluscs" },    emoji: "🦑" },
};

/** Diyet etiketleri — kelimeyle gösterilir (harf kısaltması anlaşılmıyordu), renk noktası tip kimliği */
export const DIETARY: Record<DietaryKey, { label: LString; dot: string }> = {
  vegan:       { label: { tr: "Vegan",      en: "Vegan" },       dot: "#22C55E" },
  vegetarian:  { label: { tr: "Vejetaryen", en: "Vegetarian" },  dot: "#84CC16" },
  gluten_free: { label: { tr: "Glütensiz",  en: "Gluten-free" }, dot: "#F59E0B" },
  halal:       { label: { tr: "Helal",      en: "Halal" },       dot: "#14B8A6" },
};

export const BADGES: Record<BadgeKey | "bestseller", { label: LString }> = {
  new:        { label: { tr: "Yeni",         en: "New" } },
  chefs_pick: { label: { tr: "Şefin Seçimi", en: "Chef's Pick" } },
  bestseller: { label: { tr: "Çok Satan",    en: "Bestseller" } },
};

/** Görsel varyant genişlikleri — sharp pipeline ile birebir (lib/images.ts) */
export const IMAGE_VARIANTS = [200, 640, 960, 1280] as const;

/** Upload edilen görsellerin public yol kökü */
export const UPLOADS_PUBLIC_PATH = "/uploads";

export function imageSrc(fileStem: string, width: (typeof IMAGE_VARIANTS)[number]): string {
  return `${UPLOADS_PUBLIC_PATH}/${fileStem}-${width}.webp`;
}

export function imageSrcSet(fileStem: string): string {
  return IMAGE_VARIANTS.map((w) => `${imageSrc(fileStem, w)} ${w}w`).join(", ");
}
