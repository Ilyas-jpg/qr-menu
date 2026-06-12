-- ============================================================
-- QR Menü SaaS — 0002_cron
-- pg_cron job'ları (Supabase'de UTC çalışır; saatler ~03:00-04:00 TRT'ye denk)
-- ============================================================

create extension if not exists pg_cron;

-- 1) Günlük rollup (00:15 UTC): dünün (TR günü) event'lerini analytics_daily'ye idempotent upsert
select cron.schedule('qrmenu-analytics-rollup', '15 0 * * *', $job$
  insert into public.analytics_daily (tenant_id, day, type, product_id, category_id, views, uniques)
  select
    tenant_id,
    (created_at at time zone 'Europe/Istanbul')::date,
    type, product_id, category_id,
    count(*), count(distinct session_hash)
  from public.analytics_events
  where (created_at at time zone 'Europe/Istanbul')::date = (now() at time zone 'Europe/Istanbul')::date - 1
  group by 1, 2, 3, 4, 5
  on conflict (tenant_id, day, type,
               coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid),
               coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid))
  do update set views = excluded.views, uniques = excluded.uniques;
$job$);

-- 2) Raw event prune (00:45 UTC): 90 günden eskiyi sil (rollup kalıcı)
select cron.schedule('qrmenu-analytics-prune', '45 0 * * *', $job$
  delete from public.analytics_events
  where created_at < now() - interval '90 days';
$job$);

-- 3) Bestseller rozeti (01:00 UTC): son 7 gün product_view uniques top-3, taban >= 10 unique
select cron.schedule('qrmenu-bestseller', '0 1 * * *', $job$
  with ranked as (
    select tenant_id, product_id,
           row_number() over (partition by tenant_id order by sum(uniques) desc) as rn
    from public.analytics_daily
    where type = 'product_view'
      and product_id is not null
      and day >= (now() at time zone 'Europe/Istanbul')::date - 7
    group by tenant_id, product_id
    having sum(uniques) >= 10
  )
  update public.products p
  set is_bestseller = (p.id in (select product_id from ranked where rn <= 3))
  where p.is_bestseller is distinct from (p.id in (select product_id from ranked where rn <= 3));
$job$);

-- 4) Garson çağrısı expiry (10 dk'da bir): 30 dk'dan eski pending → expired
select cron.schedule('qrmenu-service-request-expiry', '*/10 * * * *', $job$
  update public.service_requests
  set status = 'expired'
  where status = 'pending' and created_at < now() - interval '30 minutes';
$job$);

-- 5) Abonelik kontrolü (02:00 UTC): süre + 3 gün grace geçtiyse tenant pasif
select cron.schedule('qrmenu-subscription-check', '0 2 * * *', $job$
  update public.tenants
  set is_active = false
  where is_active
    and (
      (plan = 'full'  and subscription_ends_at is not null and subscription_ends_at + interval '3 days' < now())
      or
      (plan = 'trial' and trial_ends_at is not null and trial_ends_at + interval '3 days' < now())
    );
$job$);
