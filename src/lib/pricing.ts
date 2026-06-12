import type { LString, MenuCampaign, MenuCategory, MenuProduct, TimeWindow } from "./types";

/**
 * Kampanya fiyat çözücü — SAF fonksiyonlar.
 * Server render, client time-flip ve admin önizleme AYNI kodu kullanır;
 * üç yüzeyin fiyatı asla birbirinden sapamaz.
 */

export interface IstanbulNow {
  /** ISO gün: 1=Pzt … 7=Paz */
  dayIso: number;
  /** Gün içi dakika: 15:30 → 930 */
  minutes: number;
  /** "YYYY-MM-DD" */
  dateStr: string;
}

/** Verilen anın Europe/Istanbul karşılığı (server UTC'de de doğru çalışır) */
export function nowInIstanbul(date: Date = new Date()): IstanbulNow {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const hour = parseInt(get("hour"), 10) % 24; // bazı ortamlar 24:xx döndürür
  return {
    dayIso: dayMap[get("weekday")] ?? 1,
    minutes: hour * 60 + parseInt(get("minute"), 10),
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
}

/** "15:00"-"17:00" aralığı; gece taşması (22:00-02:00) desteklenir */
function inTimeRange(minutes: number, start: string | null, end: string | null): boolean {
  if (!start || !end) return true;
  const s = parseTimeToMinutes(start);
  const e = parseTimeToMinutes(end);
  if (s <= e) return minutes >= s && minutes < e;
  return minutes >= s || minutes < e; // gece yarısını aşan pencere
}

/** Kategori time_window'u şu an açık mı? (kahvaltı menüsü vb.) */
export function isCategoryOpen(tw: TimeWindow | null, now: IstanbulNow): boolean {
  if (!tw) return true;
  if (tw.days && tw.days.length > 0 && !tw.days.includes(now.dayIso)) return false;
  return inTimeRange(now.minutes, tw.start, tw.end);
}

/** Kampanya şu an ve bu ürün için geçerli mi? */
export function isCampaignActive(c: MenuCampaign, now: IstanbulNow): boolean {
  if (c.starts_on && now.dateStr < c.starts_on) return false;
  if (c.ends_on && now.dateStr > c.ends_on) return false;
  if (c.days_of_week && c.days_of_week.length > 0 && !c.days_of_week.includes(now.dayIso)) return false;
  return inTimeRange(now.minutes, c.start_time, c.end_time);
}

export function campaignAppliesTo(c: MenuCampaign, product: MenuProduct): boolean {
  if (c.scope === "all") return true;
  if (c.scope === "category") return c.category_id === product.category_id;
  return c.product_ids.includes(product.id);
}

function applyCampaign(c: MenuCampaign, basePrice: number): number {
  switch (c.type) {
    case "percent":        return Math.max(0, basePrice * (1 - c.value / 100));
    case "fixed":          return Math.max(0, basePrice - c.value);
    case "price_override": return Math.max(0, c.value);
  }
}

export interface ResolvedPrice {
  /** Müşterinin ödeyeceği fiyat */
  price: number;
  /** Üstü çizili gösterilecek orijinal fiyat (kampanya veya compare_at) — yoksa null */
  original: number | null;
  /** Uygulanan kampanyanın badge metni (varsa) */
  badge: LString | null;
  campaignId: string | null;
}

/**
 * 🎯 İLYAS KARAR NOKTASI #1 — Kampanya çakışma kuralı
 * ----------------------------------------------------
 * Aynı ürüne aynı anda birden çok kampanya denk gelirse ne olacak?
 * Bu ticari bir karar ve platformun "adalet algısını" belirliyor:
 *
 *   A) Müşteri-lehine: hesaplanan EN DÜŞÜK fiyat kazanır (şu anki davranış)
 *   B) Öncelik: price_override > fixed > percent (işletme niyeti üstün)
 *   C) Stack: indirimler üst üste biner (percent sonra fixed…) — riskli, fiyat eriyebilir
 *
 * Aşağıdaki TODO bloğunu kendi kuralınla değiştir (5-10 satır).
 * Şimdilik A uygulanıyor: adapt edilen her kampanya tek tek hesaplanır,
 * müşteri için en avantajlısı seçilir; eşitlikte badge'i olan tercih edilir.
 */
function pickWinningCampaign(
  applicable: { campaign: MenuCampaign; price: number }[]
): { campaign: MenuCampaign; price: number } | null {
  if (applicable.length === 0) return null;
  // TODO(ilyas): çakışma kuralını burada belirle ↓
  return applicable.reduce((best, cur) => {
    if (cur.price < best.price) return cur;
    if (cur.price === best.price && cur.campaign.badge_text && !best.campaign.badge_text) return cur;
    return best;
  });
}

export function resolvePrice(
  product: MenuProduct,
  campaigns: MenuCampaign[],
  now: IstanbulNow
): ResolvedPrice {
  const applicable = campaigns
    .filter((c) => isCampaignActive(c, now) && campaignAppliesTo(c, product))
    .map((campaign) => ({ campaign, price: round2(applyCampaign(campaign, product.price)) }))
    .filter((x) => x.price < product.price); // fiyatı düşürmeyen kampanya gösterilmez

  const winner = pickWinningCampaign(applicable);

  if (winner) {
    return {
      price: winner.price,
      original: product.price,
      badge: winner.campaign.badge_text,
      campaignId: winner.campaign.id,
    };
  }

  // Kampanya yoksa: işletmenin elle girdiği "eski fiyat" (compare_at_price) gösterilir
  return {
    price: product.price,
    original:
      product.compare_at_price && product.compare_at_price > product.price
        ? product.compare_at_price
        : null,
    badge: null,
    campaignId: null,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Menüdeki tüm kategorilerin açık/kapalı durumu + ürün fiyatları tek geçişte */
export function evaluateMenu(categories: MenuCategory[], campaigns: MenuCampaign[], date: Date = new Date()) {
  const now = nowInIstanbul(date);
  return categories.map((cat) => ({
    ...cat,
    isOpen: isCategoryOpen(cat.time_window, now),
    products: cat.products.map((p) => ({ ...p, resolved: resolvePrice(p, campaigns, now) })),
  }));
}

export type EvaluatedCategory = ReturnType<typeof evaluateMenu>[number];
export type EvaluatedProduct = EvaluatedCategory["products"][number];
