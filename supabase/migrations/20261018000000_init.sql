-- =============================================================================
-- MenuQR · Schema inicial
-- Ejecutar en Supabase > SQL Editor (o `supabase db push` con la CLI)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STORES: un local por usuario (dueño)
-- -----------------------------------------------------------------------------
create table if not exists public.stores (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  -- URL pública: /p/[slug]. 3-40 caracteres, minúsculas, números y guiones.
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  -- Formato internacional sin "+": 5491123456789
  whatsapp    text not null check (whatsapp ~ '^[0-9]{8,15}$'),
  logo_url    text,
  created_by  uuid references auth.users (id) on delete cascade default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Un dueño = un local (los NULL del seed no chocan entre sí)
create unique index if not exists stores_created_by_key on public.stores (created_by);

-- -----------------------------------------------------------------------------
-- CATEGORIES
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  "order"     int  not null default 0,
  created_at  timestamptz not null default now(),
  -- Permite la FK compuesta desde products (garantiza misma tienda)
  unique (id, store_id)
);

create index if not exists categories_store_order_idx on public.categories (store_id, "order");

-- -----------------------------------------------------------------------------
-- PRODUCTS
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores (id) on delete cascade,
  category_id  uuid not null,
  name         text not null check (char_length(name) between 1 and 100),
  description  text check (description is null or char_length(description) <= 500),
  price        numeric(12, 2) not null check (price >= 0),
  photo_url    text,
  available    boolean not null default true,
  "order"      int not null default 0,
  created_at   timestamptz not null default now(),
  -- La categoría tiene que ser del mismo local que el producto
  constraint products_category_fk
    foreign key (category_id, store_id)
    references public.categories (id, store_id)
    on delete cascade
);

create index if not exists products_store_idx on public.products (store_id);
create index if not exists products_category_order_idx on public.products (category_id, "order");

-- -----------------------------------------------------------------------------
-- HELPERS
-- -----------------------------------------------------------------------------
create or replace function public.is_store_owner(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.stores s
    where s.id = sid and s.created_by = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Lectura pública (el menú se ve sin login). Escritura solo del dueño.
-- -----------------------------------------------------------------------------
alter table public.stores     enable row level security;
alter table public.categories enable row level security;
alter table public.products   enable row level security;

-- stores
drop policy if exists "stores: lectura publica" on public.stores;
create policy "stores: lectura publica" on public.stores
  for select using (true);

drop policy if exists "stores: alta del dueño" on public.stores;
create policy "stores: alta del dueño" on public.stores
  for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "stores: edicion del dueño" on public.stores;
create policy "stores: edicion del dueño" on public.stores
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

drop policy if exists "stores: baja del dueño" on public.stores;
create policy "stores: baja del dueño" on public.stores
  for delete to authenticated
  using (created_by = (select auth.uid()));

-- categories
drop policy if exists "categories: lectura publica" on public.categories;
create policy "categories: lectura publica" on public.categories
  for select using (true);

drop policy if exists "categories: escritura del dueño" on public.categories;
create policy "categories: escritura del dueño" on public.categories
  for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

-- products
drop policy if exists "products: lectura publica" on public.products;
create policy "products: lectura publica" on public.products
  for select using (true);

drop policy if exists "products: escritura del dueño" on public.products;
create policy "products: escritura del dueño" on public.products
  for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

-- -----------------------------------------------------------------------------
-- STORAGE: bucket público "menus" para fotos y logos
-- Estructura de archivos: menus/{auth.uid()}/{uuid}.webp
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menus', 'menus', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Las URLs públicas funcionan sin policy de SELECT (bucket público).
-- Estas policies solo permiten al dueño gestionar SU carpeta.
drop policy if exists "menus: el dueño lista su carpeta" on storage.objects;
create policy "menus: el dueño lista su carpeta" on storage.objects
  for select to authenticated
  using (bucket_id = 'menus' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "menus: el dueño sube a su carpeta" on storage.objects;
create policy "menus: el dueño sube a su carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'menus' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "menus: el dueño edita su carpeta" on storage.objects;
create policy "menus: el dueño edita su carpeta" on storage.objects
  for update to authenticated
  using (bucket_id = 'menus' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "menus: el dueño borra su carpeta" on storage.objects;
create policy "menus: el dueño borra su carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'menus' and (storage.foldername(name))[1] = (select auth.uid())::text);
