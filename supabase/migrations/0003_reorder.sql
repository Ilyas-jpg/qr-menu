-- ============================================================
-- QR Menü — 0003_reorder
-- Drag-drop sıralama: tek SQL ile integer reindex.
-- SECURITY INVOKER → RLS uygulanır: kullanıcı yalnız kendi tenant
-- satırlarını güncelleyebilir (UPDATE policy has_tenant ile korur).
-- ============================================================

create or replace function public.reorder_categories(p_ids uuid[])
returns void language sql security invoker as $$
  update public.categories c
  set sort_order = o.ord * 10
  from unnest(p_ids) with ordinality as o(id, ord)
  where c.id = o.id;
$$;

create or replace function public.reorder_products(p_ids uuid[])
returns void language sql security invoker as $$
  update public.products p
  set sort_order = o.ord * 10
  from unnest(p_ids) with ordinality as o(id, ord)
  where p.id = o.id;
$$;

revoke execute on function public.reorder_categories(uuid[]) from anon;
revoke execute on function public.reorder_products(uuid[]) from anon;
grant execute on function public.reorder_categories(uuid[]) to authenticated;
grant execute on function public.reorder_products(uuid[]) to authenticated;
