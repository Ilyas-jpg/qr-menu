import { z } from "zod";

/** Server action'larda ZORUNLU doğrulama şemaları (frontend doğrulama = UX, güvenlik değil) */

export const lstringSchema = z.object({
  tr: z.string().trim().min(1, "Türkçe metin zorunlu").max(300),
  en: z.string().trim().max(300).optional().nullable(),
});

export const lstringOptionalSchema = z
  .object({
    tr: z.string().trim().max(2000),
    en: z.string().trim().max(2000).optional().nullable(),
  })
  .nullable()
  .optional();

export const ALLERGEN_KEYS = [
  "gluten", "crustaceans", "eggs", "fish", "peanuts", "soybeans", "milk",
  "nuts", "celery", "mustard", "sesame", "sulphites", "lupin", "molluscs",
] as const;

export const DIETARY_KEYS = ["vegan", "vegetarian", "gluten_free", "halal"] as const;
export const BADGE_KEYS = ["new", "chefs_pick"] as const;

export const categorySchema = z.object({
  id: z.uuid().optional(),
  name: lstringSchema,
  description: lstringOptionalSchema,
  icon: z.string().trim().max(40).nullable().optional(),
  time_window: z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
      days: z.array(z.number().int().min(1).max(7)).min(1),
    })
    .nullable()
    .optional(),
  is_active: z.boolean().default(true),
});

export const productSchema = z.object({
  id: z.uuid().optional(),
  category_id: z.uuid(),
  name: lstringSchema,
  description: lstringOptionalSchema,
  price: z.coerce.number().min(0).max(99999999),
  compare_at_price: z.coerce.number().min(0).max(99999999).nullable().optional(),
  spiciness: z.coerce.number().int().min(0).max(3).default(0),
  allergens: z.array(z.enum(ALLERGEN_KEYS)).default([]),
  dietary: z.array(z.enum(DIETARY_KEYS)).default([]),
  badges: z.array(z.enum(BADGE_KEYS)).default([]),
  calories: z.coerce.number().int().min(0).max(20000).nullable().optional(),
  portion: z.string().trim().max(60).nullable().optional(),
  prep_time_minutes: z.coerce.number().int().min(0).max(600).nullable().optional(),
  is_active: z.boolean().default(true),
  is_sold_out: z.boolean().default(false),
  is_featured: z.boolean().default(false),
});

export const reorderSchema = z.object({
  kind: z.enum(["categories", "products"]),
  ids: z.array(z.uuid()).min(1).max(500),
});

export const campaignSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1, "Kampanya adı zorunlu").max(80),
    type: z.enum(["percent", "fixed", "price_override"]),
    value: z.coerce.number().min(0).max(99999999),
    scope: z.enum(["all", "category", "products"]),
    category_id: z.uuid().nullable().optional(),
    product_ids: z.array(z.uuid()).default([]),
    days_of_week: z.array(z.number().int().min(1).max(7)).min(1, "En az bir gün seçin"),
    start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    end_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    badge_text: lstringSchema.nullable().optional(),
    is_active: z.boolean().default(true),
  })
  .refine((c) => c.scope !== "category" || !!c.category_id, {
    message: "Kategori seçin",
  })
  .refine((c) => c.scope !== "products" || c.product_ids.length > 0, {
    message: "En az bir ürün seçin",
  })
  .refine((c) => c.type !== "percent" || c.value <= 100, {
    message: "Yüzde 100'den büyük olamaz",
  })
  .refine((c) => (!c.start_time && !c.end_time) || (!!c.start_time && !!c.end_time), {
    message: "Saat aralığının iki ucunu da girin",
  });

export type CampaignInput = z.infer<typeof campaignSchema>;

export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
