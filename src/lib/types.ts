// get_menu RPC payload tipleri — supabase/migrations/0001_init.sql ile birebir

export type Lang = "tr" | "en";

/** Çok dilli metin: {"tr":"...","en":"..."} — tr zorunlu */
export type LString = { tr: string; en?: string | null };

export interface TenantTheme {
  mode: "dark" | "light";
  accent: string; // hex
}

export interface TenantSettings {
  waiter_call_enabled: boolean;
  bill_request_enabled: boolean;
  show_calories: boolean;
  timezone: string;
}

export interface MenuTenant {
  id: string;
  slug: string;
  name: string;
  logo_path: string | null;
  theme: TenantTheme;
  default_lang: Lang;
  languages: Lang[];
  currency: string;
  whatsapp_phone: string | null;
  wifi_ssid: string | null;
  wifi_password: string | null;
  address: string | null;
  phone: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  google_maps_url: string | null;
  settings: TenantSettings;
}

export interface ProductImage {
  file_stem: string;
  width: number;
  height: number;
  blur_data: string | null;
  sort_order: number;
}

export type AllergenKey =
  | "gluten" | "crustaceans" | "eggs" | "fish" | "peanuts" | "soybeans"
  | "milk" | "nuts" | "celery" | "mustard" | "sesame" | "sulphites"
  | "lupin" | "molluscs";

export type DietaryKey = "vegan" | "vegetarian" | "gluten_free" | "halal";
export type BadgeKey = "new" | "chefs_pick";

export interface MenuProduct {
  id: string;
  category_id: string;
  name: LString;
  description: LString | null;
  price: number;
  compare_at_price: number | null;
  spiciness: 0 | 1 | 2 | 3;
  allergens: AllergenKey[];
  dietary: DietaryKey[];
  calories: number | null;
  portion: string | null;
  prep_time_minutes: number | null;
  sort_order: number;
  is_sold_out: boolean;
  is_featured: boolean;
  badges: BadgeKey[];
  is_bestseller: boolean;
  created_at: string;
  images: ProductImage[];
}

export interface TimeWindow {
  start: string; // "06:30"
  end: string;   // "11:30"
  days: number[]; // ISO 1=Pzt ... 7=Paz
}

export interface MenuCategory {
  id: string;
  name: LString;
  description: LString | null;
  icon: string | null;
  sort_order: number;
  time_window: TimeWindow | null;
  products: MenuProduct[];
}

export interface MenuCampaign {
  id: string;
  type: "percent" | "fixed" | "price_override";
  value: number;
  scope: "all" | "category" | "products";
  category_id: string | null;
  product_ids: string[];
  days_of_week: number[];
  start_time: string | null; // "15:00:00"
  end_time: string | null;
  starts_on: string | null;  // "2026-06-12"
  ends_on: string | null;
  badge_text: LString | null;
}

export interface MenuPayload {
  tenant: MenuTenant;
  categories: MenuCategory[];
  campaigns: MenuCampaign[];
}
