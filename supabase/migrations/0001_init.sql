-- ============================================================
-- QR Menü SaaS — 0001_init
-- Tablolar + indexler + RLS + helper fonksiyonlar + trigger'lar + get_menu RPC
-- Tüm çok-dilli metinler jsonb: {"tr":"...","en":"..."} (tr zorunlu)
-- ============================================================

-- SQL-dili fonksiyonlar henüz oluşmamış tabloları refere ediyor (helpers tablolardan önce);
-- gövde doğrulamasını migration süresince kapat.
set check_function_bodies = off;

create schema if not exists app;

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------

create or replace function app.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Recursive-policy tuzağını önlemek için SECURITY DEFINER membership helper'ları.
-- Policy içinde her zaman (select auth.uid()) — initPlan cache.
create or replace function app.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenant_users
    where user_id = (select auth.uid()) and role = 'platform_admin'
  );
$$;

create or replace function app.has_tenant(tid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenant_users
    where user_id = (select auth.uid()) and tenant_id = tid and role in ('owner','staff')
  );
$$;

-- ------------------------------------------------------------
-- tenants
-- ------------------------------------------------------------

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9](-?[a-z0-9]){1,38}$'),
  name text not null,
  logo_path text,
  theme jsonb not null default '{"mode":"dark","accent":"#C8A24B"}',
  default_lang text not null default 'tr',
  languages text[] not null default '{tr}',
  currency text not null default 'TRY',
  whatsapp_phone text,
  wifi_ssid text,
  wifi_password text,
  address text,
  phone text,
  instagram_url text,
  facebook_url text,
  google_maps_url text,
  is_active boolean not null default true,
  plan text not null default 'trial' check (plan in ('trial','full')),
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz,
  activated_at timestamptz,
  settings jsonb not null default '{"waiter_call_enabled":true,"bill_request_enabled":true,"show_calories":false,"timezone":"Europe/Istanbul"}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tenants_updated_at before update on public.tenants
  for each row execute function app.set_updated_at();

-- Owner'ın değiştiremeyeceği kolonlar (RLS OLD/NEW karşılaştıramaz; trigger yapar).
-- auth.uid() IS NULL = PostgREST dışı bağlam (postgres/pg_cron/service_role) → serbest.
create or replace function app.protect_tenant_columns()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or app.is_platform_admin() then
    return new;
  end if;
  if new.slug is distinct from old.slug
     or new.is_active is distinct from old.is_active
     or new.plan is distinct from old.plan
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.subscription_ends_at is distinct from old.subscription_ends_at
     or new.activated_at is distinct from old.activated_at then
    raise exception 'Bu alanları yalnızca platform yöneticisi değiştirebilir';
  end if;
  return new;
end $$;

create trigger tenants_protect_columns before update on public.tenants
  for each row execute function app.protect_tenant_columns();

-- ------------------------------------------------------------
-- tenant_users
-- ------------------------------------------------------------

create table public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','staff','platform_admin')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id),
  constraint tenant_users_role_tenant check (
    (role = 'platform_admin' and tenant_id is null)
    or (role in ('owner','staff') and tenant_id is not null)
  )
);

-- unique(tenant_id,user_id) NULL'larda çoğalır; platform_admin tekilliği ayrıca:
create unique index tenant_users_one_platform_admin
  on public.tenant_users (user_id) where tenant_id is null;
create index tenant_users_user_idx on public.tenant_users (user_id);
create index tenant_users_tenant_idx on public.tenant_users (tenant_id);

-- ------------------------------------------------------------
-- categories
-- ------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name jsonb not null,
  description jsonb,
  icon text,
  sort_order int not null default 0,
  time_window jsonb, -- {"start":"06:30","end":"11:30","days":[1..7]} | null = her zaman
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_updated_at before update on public.categories
  for each row execute function app.set_updated_at();

create index categories_public_idx on public.categories (tenant_id, sort_order) where is_active;
create index categories_tenant_idx on public.categories (tenant_id);

-- ------------------------------------------------------------
-- products
-- ------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  name jsonb not null,
  description jsonb,
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price is null or compare_at_price >= 0),
  spiciness smallint not null default 0 check (spiciness between 0 and 3),
  allergens text[] not null default '{}' check (
    allergens <@ array['gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs']::text[]
  ),
  dietary text[] not null default '{}' check (
    dietary <@ array['vegan','vegetarian','gluten_free','halal']::text[]
  ),
  calories int check (calories is null or calories >= 0),
  portion text,
  prep_time_minutes int check (prep_time_minutes is null or prep_time_minutes >= 0),
  sort_order int not null default 0,
  is_active boolean not null default true,
  is_sold_out boolean not null default false,
  is_featured boolean not null default false,
  badges text[] not null default '{}' check (
    badges <@ array['new','chefs_pick']::text[]
  ),
  is_bestseller boolean not null default false, -- cron yazar; manuel badge'lerden AYRI
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_updated_at before update on public.products
  for each row execute function app.set_updated_at();

create index products_public_idx on public.products (tenant_id, category_id, sort_order) where is_active;
create index products_tenant_idx on public.products (tenant_id);
create index products_category_idx on public.products (category_id);

-- ------------------------------------------------------------
-- product_images
-- ------------------------------------------------------------

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  file_stem text not null, -- varyantlar türer: {stem}-200.webp / -640.webp / -1280.webp / -orig.jpg
  width int not null,
  height int not null,
  blur_data text, -- base64 LQIP (~300B)
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, sort_order);
create index product_images_tenant_idx on public.product_images (tenant_id);

-- ------------------------------------------------------------
-- campaigns
-- ------------------------------------------------------------

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, -- işletme içi ad
  type text not null check (type in ('percent','fixed','price_override')),
  value numeric(10,2) not null check (value >= 0),
  scope text not null check (scope in ('all','category','products')),
  category_id uuid references public.categories(id) on delete cascade,
  product_ids uuid[] not null default '{}',
  days_of_week smallint[] not null default '{1,2,3,4,5,6,7}' check (days_of_week <@ array[1,2,3,4,5,6,7]::smallint[]),
  start_time time,
  end_time time,
  starts_on date,
  ends_on date,
  badge_text jsonb, -- {"tr":"...","en":"..."} | null
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_scope_consistency check (
    (scope = 'category' and category_id is not null)
    or (scope = 'products' and array_length(product_ids, 1) >= 1)
    or (scope = 'all')
  )
);

create trigger campaigns_updated_at before update on public.campaigns
  for each row execute function app.set_updated_at();

create index campaigns_public_idx on public.campaigns (tenant_id) where is_active;

-- ------------------------------------------------------------
-- tables (masalar)
-- ------------------------------------------------------------

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null, -- QR URL'ine girer: "1", "B3", "bahce-2"
  name text not null, -- "Bahçe 2"
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create index tables_tenant_idx on public.tables (tenant_id, sort_order);

-- ------------------------------------------------------------
-- service_requests (garson çağrısı / hesap)
-- ------------------------------------------------------------

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  table_id uuid not null references public.tables(id) on delete cascade,
  type text not null check (type in ('waiter','bill')),
  status text not null default 'pending' check (status in ('pending','acknowledged','resolved','expired')),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

-- Spam'e DB-seviyesi kilit: aynı masada aynı tipten tek pending
create unique index service_requests_one_pending
  on public.service_requests (table_id, type) where status = 'pending';
create index service_requests_admin_idx
  on public.service_requests (tenant_id, status, created_at desc);

-- ------------------------------------------------------------
-- analytics (raw 90 gün + kalıcı rollup)
-- ------------------------------------------------------------

create table public.analytics_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null, -- FK YOK: append-only log, ürün silinince tarih bozulmasın
  type text not null,
  product_id uuid,
  category_id uuid,
  lang text,
  session_hash text not null,
  table_code text,
  created_at timestamptz not null default now()
);

create index analytics_events_tenant_time_idx on public.analytics_events (tenant_id, created_at);

create table public.analytics_daily (
  tenant_id uuid not null,
  day date not null,
  type text not null,
  product_id uuid,
  category_id uuid,
  views int not null default 0,
  uniques int not null default 0
);

-- Idempotent upsert için expression unique index (NULL'lar sentinel'e katlanır)
create unique index analytics_daily_upsert_idx on public.analytics_daily (
  tenant_id, day, type,
  coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
create index analytics_daily_tenant_idx on public.analytics_daily (tenant_id, day);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.tenants enable row level security;
alter table public.tenant_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.campaigns enable row level security;
alter table public.tables enable row level security;
alter table public.service_requests enable row level security;
alter table public.analytics_events enable row level security;
alter table public.analytics_daily enable row level security;

-- anon hiçbir tabloya yazamaz (misafir yazmaları service-role ile API route'lardan)
revoke insert, update, delete on all tables in schema public from anon;

-- tenants: anon yalnız güvenli kolonları görür (plan/trial/abonelik görünmez)
revoke select on public.tenants from anon;
grant select (
  id, slug, name, logo_path, theme, default_lang, languages, currency,
  whatsapp_phone, wifi_ssid, wifi_password, address, phone,
  instagram_url, facebook_url, google_maps_url, is_active, settings
) on public.tenants to anon;

create policy tenants_read on public.tenants for select
  to anon, authenticated
  using (is_active or app.has_tenant(id) or app.is_platform_admin());

create policy tenants_owner_update on public.tenants for update
  to authenticated
  using (app.has_tenant(id)) with check (app.has_tenant(id));

create policy tenants_admin_all on public.tenants for all
  to authenticated
  using (app.is_platform_admin()) with check (app.is_platform_admin());

-- tenant_users: kendi satırların + platform_admin hepsi
create policy tenant_users_self_read on public.tenant_users for select
  to authenticated
  using (user_id = (select auth.uid()) or app.is_platform_admin());

create policy tenant_users_admin_write on public.tenant_users for insert
  to authenticated with check (app.is_platform_admin());
create policy tenant_users_admin_update on public.tenant_users for update
  to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());
create policy tenant_users_admin_delete on public.tenant_users for delete
  to authenticated using (app.is_platform_admin());

-- categories
create policy categories_read on public.categories for select
  to anon, authenticated
  using (
    (is_active and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active))
    or app.has_tenant(tenant_id) or app.is_platform_admin()
  );
create policy categories_member_insert on public.categories for insert
  to authenticated with check (app.has_tenant(tenant_id) or app.is_platform_admin());
create policy categories_member_update on public.categories for update
  to authenticated using (app.has_tenant(tenant_id) or app.is_platform_admin())
  with check (app.has_tenant(tenant_id) or app.is_platform_admin());
create policy categories_member_delete on public.categories for delete
  to authenticated using (app.has_tenant(tenant_id) or app.is_platform_admin());

-- products
create policy products_read on public.products for select
  to anon, authenticated
  using (
    (is_active and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active))
    or app.has_tenant(tenant_id) or app.is_platform_admin()
  );
create policy products_member_insert on public.products for insert
  to authenticated with check (app.has_tenant(tenant_id) or app.is_platform_admin());
create policy products_member_update on public.products for update
  to authenticated using (app.has_tenant(tenant_id) or app.is_platform_admin())
  with check (app.has_tenant(tenant_id) or app.is_platform_admin());
create policy products_member_delete on public.products for delete
  to authenticated using (app.has_tenant(tenant_id) or app.is_platform_admin());

-- product_images (public görünürlük üst ürün + tenant aktifliğine bağlı)
create policy product_images_read on public.product_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      join public.tenants t on t.id = p.tenant_id
      where p.id = product_id and p.is_active and t.is_active
    )
    or app.has_tenant(tenant_id) or app.is_platform_admin()
  );
create policy product_images_member_insert on public.product_images for insert
  to authenticated with check (app.has_tenant(tenant_id) or app.is_platform_admin());
create policy product_images_member_update on public.product_images for update
  to authenticated using (app.has_tenant(tenant_id) or app.is_platform_admin())
  with check (app.has_tenant(tenant_id) or app.is_platform_admin());
create policy product_images_member_delete on public.product_images for delete
  to authenticated using (app.has_tenant(tenant_id) or app.is_platform_admin());

-- campaigns (client time-flip için public read gerekli)
create policy campaigns_read on public.campaigns for select
  to anon, authenticated
  using (
    (is_active and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active))
    or app.has_tenant(tenant_id) or app.is_platform_admin()
  );
create policy campaigns_member_insert on public.campaigns for insert
  to authenticated with check (app.has_tenant(tenant_id) or app.is_platform_admin());
create policy campaigns_member_update on public.campaigns for update
  to authenticated using (app.has_tenant(tenant_id) or app.is_platform_admin())
  with check (app.has_tenant(tenant_id) or app.is_platform_admin());
create policy campaigns_member_delete on public.campaigns for delete
  to authenticated using (app.has_tenant(tenant_id) or app.is_platform_admin());

-- tables: yalnız üye/admin (public menü masa listesine ihtiyaç duymaz; doğrulama server-side)
create policy tables_member_read on public.tables for select
  to authenticated using (app.has_tenant(tenant_id) or app.is_platform_admin());
create policy tables_member_insert on public.tables for insert
  to authenticated with check (app.has_tenant(tenant_id) or app.is_platform_admin());
create policy tables_member_update on public.tables for update
  to authenticated using (app.has_tenant(tenant_id) or app.is_platform_admin())
  with check (app.has_tenant(tenant_id) or app.is_platform_admin());
create policy tables_member_delete on public.tables for delete
  to authenticated using (app.has_tenant(tenant_id) or app.is_platform_admin());

-- service_requests: INSERT yok (yalnız service-role API route) — üye okur/günceller (Realtime SELECT'e bağlı)
create policy service_requests_member_read on public.service_requests for select
  to authenticated using (app.has_tenant(tenant_id) or app.is_platform_admin());
create policy service_requests_member_update on public.service_requests for update
  to authenticated using (app.has_tenant(tenant_id) or app.is_platform_admin())
  with check (app.has_tenant(tenant_id) or app.is_platform_admin());

-- analytics_events: yalnız platform_admin okur (raw log iç veri)
create policy analytics_events_admin_read on public.analytics_events for select
  to authenticated using (app.is_platform_admin());

-- analytics_daily: üye kendi rollup'ını okur
create policy analytics_daily_member_read on public.analytics_daily for select
  to authenticated using (app.has_tenant(tenant_id) or app.is_platform_admin());

-- ------------------------------------------------------------
-- Realtime: service_requests publication'a
-- ------------------------------------------------------------

alter publication supabase_realtime add table public.service_requests;

-- ------------------------------------------------------------
-- get_menu RPC — public sayfanın tek round-trip menü sorgusu
-- SECURITY DEFINER: RLS bypass → is_active filtreleri + güvenli kolon seçimi ELLE yapılır.
-- Hassas tenant kolonları (plan/trial/abonelik) ASLA dahil edilmez.
-- ------------------------------------------------------------

create or replace function public.get_menu(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'tenant', jsonb_build_object(
      'id', t.id, 'slug', t.slug, 'name', t.name, 'logo_path', t.logo_path,
      'theme', t.theme, 'default_lang', t.default_lang, 'languages', t.languages,
      'currency', t.currency, 'whatsapp_phone', t.whatsapp_phone,
      'wifi_ssid', t.wifi_ssid, 'wifi_password', t.wifi_password,
      'address', t.address, 'phone', t.phone,
      'instagram_url', t.instagram_url, 'facebook_url', t.facebook_url,
      'google_maps_url', t.google_maps_url, 'settings', t.settings
    ),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'description', c.description, 'icon', c.icon,
        'sort_order', c.sort_order, 'time_window', c.time_window,
        'products', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', p.id, 'category_id', p.category_id, 'name', p.name, 'description', p.description,
            'price', p.price, 'compare_at_price', p.compare_at_price,
            'spiciness', p.spiciness, 'allergens', p.allergens, 'dietary', p.dietary,
            'calories', p.calories, 'portion', p.portion, 'prep_time_minutes', p.prep_time_minutes,
            'sort_order', p.sort_order, 'is_sold_out', p.is_sold_out, 'is_featured', p.is_featured,
            'badges', p.badges, 'is_bestseller', p.is_bestseller, 'created_at', p.created_at,
            'images', coalesce((
              select jsonb_agg(jsonb_build_object(
                'file_stem', i.file_stem, 'width', i.width, 'height', i.height,
                'blur_data', i.blur_data, 'sort_order', i.sort_order
              ) order by i.sort_order)
              from public.product_images i where i.product_id = p.id
            ), '[]'::jsonb)
          ) order by p.sort_order)
          from public.products p
          where p.category_id = c.id and p.is_active
        ), '[]'::jsonb)
      ) order by c.sort_order)
      from public.categories c
      where c.tenant_id = t.id and c.is_active
    ), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'type', g.type, 'value', g.value, 'scope', g.scope,
        'category_id', g.category_id, 'product_ids', g.product_ids,
        'days_of_week', g.days_of_week, 'start_time', g.start_time, 'end_time', g.end_time,
        'starts_on', g.starts_on, 'ends_on', g.ends_on, 'badge_text', g.badge_text
      ))
      from public.campaigns g
      where g.tenant_id = t.id and g.is_active
        and (g.starts_on is null or g.starts_on <= (now() at time zone 'Europe/Istanbul')::date)
        and (g.ends_on is null or g.ends_on >= (now() at time zone 'Europe/Istanbul')::date)
    ), '[]'::jsonb)
  )
  from public.tenants t
  where t.slug = p_slug and t.is_active;
$$;

grant execute on function public.get_menu(text) to anon, authenticated;
grant usage on schema app to anon, authenticated;
grant execute on function app.is_platform_admin() to anon, authenticated;
grant execute on function app.has_tenant(uuid) to anon, authenticated;
