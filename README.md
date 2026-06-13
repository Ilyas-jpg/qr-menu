# QR Menü — Çok Kiracılı Karekod Menü Platformu

> Multi-tenant QR menu SaaS for restaurants & cafés — Next.js (App Router) + Supabase, self-hosted on shared hosting (LiteSpeed/Passenger). Photo-first public menus with TR/EN, allergen & dietary filters, time-based campaigns, waiter call (Realtime), WhatsApp ordering and privacy-friendly analytics.

Restoran ve kafeler için **satışa hazır, çok kiracılı (multi-tenant)** dijital menü platformu. Tek kurulum, sınırsız işletme — her işletme `/{slug}` altında kendi temalı menüsünü alır.

**Canlı demo:** https://qrmenu.algow.net/safran-sofrasi

## Özellikler

**Misafir menüsü (public)**
- Foto-dominant koyu/açık tema, işletme bazlı accent rengi (tema motoru)
- TR/EN anında dil değişimi (route değişmeden, tek payload)
- Arama + alerjen-hariç + diyet filtreleri (AB-14 alerjen seti, vegan/vejetaryen/glütensiz/helal)
- Saat/gün bazlı otomatik kampanyalar (üstü çizili fiyat + badge), zaman pencereli kategoriler ("Kahvaltı 07–12")
- Öne çıkanlar rayı, acılık göstergeleri, "tükendi" durumu, WiFi kartı
- Masa QR'ı (`?m=masa-kodu`) → garson çağır / hesap iste (Supabase Realtime) + WhatsApp sepetli sipariş
- KVKK-dostu analitik: cookie'siz, günlük rotasyonlu salted session hash

**İşletme paneli (mobil-first)**
- Dashboard, menü CRUD + sürükle-bırak sıralama, tükendi/öne çıkan toggle'ları
- Görsel galeri: seri upload → sharp ile 200/640/960/1280 WebP varyant + LQIP (runtime optimizer yok)
- Kampanya builder (canlı önizleme), masa yönetimi + A4 QR baskı sayfası
- Çağrı panosu (Realtime + sesli uyarı, 30s polling fallback), analitik panosu
- Ayarlar: tema modu + accent, dil/çağrı/WhatsApp/kalori toggle'ları, WiFi/iletişim

**Süper-admin**
- Sihirbazla işletme + sahip hesabı açma (tek-sefer şifre), deneme→abonelik geçişi, yayında/kapalı

## Mimari

```
Next.js 16 (App Router, TS, Tailwind v4, shadcn)  →  standalone build
 ├─ Public menü: ISR (revalidate 3600 + admin kaydında revalidateTag)
 ├─ Admin: Supabase Auth (SSR cookie) + RLS
 ├─ Misafir yazmaları (analitik/çağrı): YALNIZ API route + service-role — anon INSERT yok
 └─ Görseller: upload anında sharp varyantları → dosya sistemi → LiteSpeed doğrudan servis

Supabase (Postgres + Auth + Realtime)
 ├─ supabase/migrations/0001 — şema + RLS + get_menu RPC
 ├─ 0002 — pg_cron ×5 (analitik rollup, prune, bestseller, çağrı expiry, abonelik)
 └─ 0003 — sürükle-bırak reorder RPC'leri
```

Tasarım kararları: görseller Supabase Storage yerine **dosya sisteminde** (transform maliyeti yok, CDN'siz LiteSpeed servis), i18n kütüphanesi yerine **jsonb `{"tr","en"}` içerik**, masa kodu path yerine **query param** (ISR cache tek girdi kalır).

## Kurulum

```bash
git clone <repo> && cd qr-menu
npm install
cp .env.example .env.local   # değerleri doldur (Supabase proje bilgileri)
```

1. [Supabase](https://supabase.com)'de proje aç, `supabase/migrations/` dosyalarını sırayla çalıştır (SQL Editor veya `scripts/db-query.mjs`).
2. `supabase/seed.sql` ile demo işletmeyi yükle (opsiyonel).
3. `npm run dev` → http://localhost:3000/safran-sofrasi

### Production (paylaşımlı hosting / Passenger)

Lokal Windows build → tar → scp → atomic swap deseni hazır:

```powershell
powershell -File scripts\deploy.ps1 [-SkipBuild] [-TargetDomain example.com] [-SshAlias myhost]
```

- SSH erişimi `~/.ssh/config` alias'ı ile (kimlik repo'da tutulmaz)
- `.env.production` sunucuda durur (chmod 600), deploy ezmez
- `deploy/htaccess-template` → Passenger + güvenlik başlıkları (HSTS, CSP, XFO) + 1 yıl immutable cache
- sharp Linux binary'si: `npm i -D --force @img/sharp-linux-x64 @img/sharp-libvips-linux-x64`

## Güvenlik

- Tüm tablolarda RLS; misafir yazmaları yalnız server-side service-role üzerinden
- Magic-byte upload doğrulaması, tenant başına kota, path traversal koruması
- CSP/HSTS/XFO başlıkları, rate-limit'li çağrı endpoint'i (90s cooldown)
- Sırlar yalnız env'de — `.env*` hiçbir zaman commit edilmez

## Lisans

Â© 2026 Ä°lyas Saltay â TÃ¼m haklarÄ± saklÄ±dÄ±r. AyrÄ±ntÄ±: [LICENSE](LICENSE)
