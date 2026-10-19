-- =============================================================================
-- CARTA APP · SETUP COMPLETO UNIFICADO PARA SUPABASE (SQL EDITOR)
-- =============================================================================
-- Este archivo contiene la arquitectura completa:
--  1. Estructura de tablas (stores, categories, products, mp_webhook_events)
--  2. Índices B-Tree optimizados para multi-tenant (+1.000 bares)
--  3. Trigger Anti-Tampering (blindaje de columnas de facturación)
--  4. Funciones de verificación de seguridad y suscripción
--  5. Políticas Row Level Security (RLS Hard-Lock)
--  6. Configuración de Storage (fotos y videos cortos en bucket "menus")
--  7. Local y menú demo de ejemplo ("Bar de Prueba" -> /p/bar-de-prueba)
--
-- INSTRUCCIONES:
-- 1. Ve a tu Dashboard de Supabase (https://supabase.com/dashboard)
-- 2. Entra en tu proyecto > Menú lateral izquierdo: "SQL Editor"
-- 3. Haz clic en "+ New query"
-- 4. Pega TODO este contenido y haz clic en "RUN" (o presiona Ctrl + Enter)
-- =============================================================================

-- =============================================================================
-- 1. TABLAS PRINCIPALES
-- =============================================================================

-- STORES: Un local por dueño
create table if not exists public.stores (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null check (char_length(name) between 2 and 80),
  -- URL pública de la carta: /p/[slug]
  slug                    text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  -- Teléfono con código de país sin "+" (ej: 5491123456789)
  whatsapp                text not null check (whatsapp ~ '^[0-9]{8,15}$'),
  logo_url                text,
  cover_url               text,
  tagline                 text check (tagline is null or char_length(tagline) <= 120),
  accent_color            text not null default '#22c55e' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  layout                  text not null default 'feed' check (layout in ('feed', 'list', 'grid')),
  theme                   text not null default 'dark' check (theme in ('dark', 'light')),
  bg_color                text,
  button_style            text not null default 'accent' check (button_style in ('accent', 'whatsapp', 'monochrome')),
  created_by              uuid references auth.users (id) on delete cascade default auth.uid(),
  created_at              timestamptz not null default now(),
  -- Campos de suscripción y facturación Mercado Pago ($50.000 ARS/mes o $500.000 ARS/año + 30 días gratis)
  subscription_status     text not null default 'inactive'
    check (subscription_status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  plan_type               text check (plan_type in ('trial', 'monthly', 'yearly')),
  trial_end               timestamptz,
  current_period_end      timestamptz,
  mp_payment_id           text unique,
  mp_preference_id        text,
  mp_merchant_order_id    text
);

-- Asegura las columnas si la tabla ya fue creada previamente
alter table public.stores add column if not exists cover_url text;
alter table public.stores add column if not exists theme text not null default 'dark';
alter table public.stores add column if not exists bg_color text;
alter table public.stores add column if not exists button_style text not null default 'accent';
alter table public.stores add column if not exists plan_type text check (plan_type in ('trial', 'monthly', 'yearly'));
alter table public.stores add column if not exists trial_end timestamptz;
alter table public.stores add column if not exists mp_payment_id text;
alter table public.stores add column if not exists mp_preference_id text;
alter table public.stores add column if not exists mp_merchant_order_id text;
alter table public.stores drop constraint if exists stores_layout_check;
alter table public.stores add constraint stores_layout_check check (layout in ('feed', 'list', 'grid'));

-- Slugs reservados que no pueden ser usados por ningún local
alter table public.stores drop constraint if exists stores_slug_not_reserved;
alter table public.stores add constraint stores_slug_not_reserved
  check (slug not in ('demo', 'admin', 'login', 'api', 'auth', 'p'));

-- Un dueño = un local
create unique index if not exists stores_created_by_key on public.stores (created_by);

-- CATEGORIES: Categorías del menú
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  "order"     int  not null default 0,
  created_at  timestamptz not null default now(),
  -- Clave compuesta para integridad referencial estricta
  unique (id, store_id)
);

-- PRODUCTS: Platos, bebidas y artículos
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores (id) on delete cascade,
  category_id  uuid not null,
  name         text not null check (char_length(name) between 1 and 100),
  description  text check (description is null or char_length(description) <= 500),
  price        numeric(12, 2) not null check (price >= 0),
  photo_url    text,
  video_url    text,
  available    boolean not null default true,
  "order"      int not null default 0,
  created_at   timestamptz not null default now(),
  -- Garantiza que la categoría pertenezca a la misma tienda
  constraint products_category_fk
    foreign key (category_id, store_id)
    references public.categories (id, store_id)
    on delete cascade
);

-- MP_WEBHOOK_EVENTS: Tabla de idempotencia para webhooks de Mercado Pago
create table if not exists public.mp_webhook_events (
  id          text primary key,
  topic       text,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- 2. ÍNDICES B-TREE PARA ALTO RENDIMIENTO (+1.000 BARES)
-- =============================================================================
create index if not exists stores_created_by_idx on public.stores (created_by);
create index if not exists stores_mp_payment_id_idx on public.stores (mp_payment_id);
create index if not exists stores_subscription_status_idx on public.stores (subscription_status);
create index if not exists categories_store_id_idx on public.categories (store_id);
create index if not exists categories_store_order_idx on public.categories (store_id, "order");
create index if not exists products_store_idx on public.products (store_id);
create index if not exists products_category_order_idx on public.products (category_id, "order");

-- =============================================================================
-- 3. FUNCIONES DE SEGURIDAD
-- =============================================================================

-- Comprueba si el usuario autenticado actual tiene una tienda activa (para Storage)
create or replace function public.current_user_has_active_store()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.stores s
    where s.created_by = (select auth.uid())
      and s.subscription_status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

-- Comprueba si el usuario autenticado es dueño del local
create or replace function public.is_store_owner(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.stores s
    where s.id = sid and s.created_by = (select auth.uid())
  );
$$;

-- Comprueba si el dueño tiene suscripción activa o período vigente
create or replace function public.is_store_owner_active(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.stores s
    where s.id = sid
      and s.created_by = (select auth.uid())
      and s.subscription_status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

-- Trigger Anti-Tampering: bloquea mutación de campos de Mercado Pago tanto en INSERT como en UPDATE
create or replace function public.protect_stores_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce(
    current_setting('request.jwt.claim.role', true),
    (auth.role())::text,
    ''
  );
begin
  if jwt_role in ('authenticated', 'anon') then
    if TG_OP = 'INSERT' then
      -- Forzamos que toda tienda creada desde el cliente nazca inactiva y sin datos de facturación
      NEW.subscription_status := 'inactive';
      NEW.plan_type := null;
      NEW.trial_end := null;
      NEW.current_period_end := null;
      NEW.mp_payment_id := null;
      NEW.mp_preference_id := null;
      NEW.mp_merchant_order_id := null;
    elsif TG_OP = 'UPDATE' then
      if (NEW.subscription_status is distinct from OLD.subscription_status) or
         (NEW.plan_type is distinct from OLD.plan_type) or
         (NEW.trial_end is distinct from OLD.trial_end) or
         (NEW.current_period_end is distinct from OLD.current_period_end) or
         (NEW.mp_payment_id is distinct from OLD.mp_payment_id) or
         (NEW.mp_preference_id is distinct from OLD.mp_preference_id) or
         (NEW.mp_merchant_order_id is distinct from OLD.mp_merchant_order_id) then
        raise exception 'Acceso denegado: No está permitido modificar columnas de facturación directamente.';
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists tr_protect_stores_billing on public.stores;
create trigger tr_protect_stores_billing
  before insert or update on public.stores
  for each row
  execute function public.protect_stores_billing_columns();

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) & PRIVACIDAD
-- =============================================================================
alter table public.stores                enable row level security;
alter table public.categories            enable row level security;
alter table public.products              enable row level security;
alter table public.mp_webhook_events     enable row level security;

-- Blindaje de privacidad a nivel de columna: anon no puede leer identificadores de Mercado Pago
revoke select (mp_payment_id, mp_preference_id, mp_merchant_order_id) on table public.stores from anon;

-- STORES:
-- Lectura pública para comensales (solo columnas no revocadas)
drop policy if exists "stores: lectura publica" on public.stores;
create policy "stores: lectura publica" on public.stores
  for select using (true);

-- Creación solo para el usuario logueado
drop policy if exists "stores: alta del dueño" on public.stores;
create policy "stores: alta del dueño" on public.stores
  for insert to authenticated
  with check (created_by = (select auth.uid()));

-- Edición solo del dueño (el trigger protege las columnas de facturación)
drop policy if exists "stores: edicion del dueño" on public.stores;
create policy "stores: edicion del dueño" on public.stores
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- Eliminación solo del dueño
drop policy if exists "stores: baja del dueño" on public.stores;
create policy "stores: baja del dueño" on public.stores
  for delete to authenticated
  using (created_by = (select auth.uid()));

-- CATEGORIES:
-- Lectura pública
drop policy if exists "categories: lectura publica" on public.categories;
create policy "categories: lectura publica" on public.categories
  for select using (true);

-- Escritura protegida por RLS HARD-LOCK (requiere suscripción activa)
drop policy if exists "categories: escritura del dueño" on public.categories;
create policy "categories: escritura del dueño" on public.categories
  for all to authenticated
  using (public.is_store_owner_active(store_id))
  with check (public.is_store_owner_active(store_id));

-- PRODUCTS:
-- Lectura pública
drop policy if exists "products: lectura publica" on public.products;
create policy "products: lectura publica" on public.products
  for select using (true);

-- Escritura protegida por RLS HARD-LOCK (requiere suscripción activa)
drop policy if exists "products: escritura del dueño" on public.products;
create policy "products: escritura del dueño" on public.products
  for all to authenticated
  using (public.is_store_owner_active(store_id))
  with check (public.is_store_owner_active(store_id));

-- =============================================================================
-- 5. STORAGE BUCKET ("menus" para fotos y videos)
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menus', 'menus', true, 26214400, -- 25 MB máx. por archivo
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Políticas de aislamiento de Storage: cada dueño solo opera en su carpeta /{auth.uid()}/
drop policy if exists "menus: el dueño lista su carpeta" on storage.objects;
create policy "menus: el dueño lista su carpeta" on storage.objects
  for select to authenticated
  using (bucket_id = 'menus' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "menus: el dueño sube a su carpeta" on storage.objects;
create policy "menus: el dueño sube a su carpeta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menus'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_user_has_active_store()
  );

drop policy if exists "menus: el dueño edita su carpeta" on storage.objects;
create policy "menus: el dueño edita su carpeta" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'menus'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_user_has_active_store()
  );

drop policy if exists "menus: el dueño borra su carpeta" on storage.objects;
create policy "menus: el dueño borra su carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'menus' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- =============================================================================
-- 6. BAR DE PRUEBA INICIAL (DATOS SEED DE EJEMPLO)
-- =============================================================================
-- Este local queda precargado en /p/bar-de-prueba con suscripción activa
-- para que puedas probar la aplicación inmediatamente.

insert into public.stores (
  id, name, slug, whatsapp, logo_url, cover_url, created_by, tagline, accent_color, layout,
  subscription_status, current_period_end
)
values (
  '00000000-0000-4000-8000-000000000001',
  'Bar de Prueba',
  'bar-de-prueba',
  '5491123456789',
  null,
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  null,
  'Pizzas, burgers y cerveza artesanal',
  '#f97316',
  'feed',
  'active',
  now() + interval '1 year'
)
on conflict (id) do update
  set name = excluded.name,
      slug = excluded.slug,
      whatsapp = excluded.whatsapp,
      cover_url = excluded.cover_url,
      tagline = excluded.tagline,
      accent_color = excluded.accent_color,
      layout = excluded.layout,
      subscription_status = excluded.subscription_status,
      current_period_end = excluded.current_period_end;

-- Categorías de prueba
insert into public.categories (id, store_id, name, "order") values
  ('c0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Pizzas',          0),
  ('c0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Hamburguesas',    1),
  ('c0000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Para compartir',  2),
  ('c0000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'Cervezas',        3)
on conflict (id) do update
  set name = excluded.name, "order" = excluded."order";

-- Productos de prueba
insert into public.products
  (id, store_id, category_id, name, description, price, photo_url, available, "order")
values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'Pizza Muzzarella', 'Salsa de tomate, muzzarella, orégano y aceitunas verdes. 8 porciones.', 9500,
   'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=75', true, 0),
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'Pizza Napolitana', 'Muzzarella, rodajas de tomate, ajo y albahaca fresca.', 11200,
   'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=75', true, 1),
  ('a0000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002',
   'Hamburguesa Clásica', 'Medallón de 180 g, cheddar, lechuga, tomate y salsa de la casa. Con papas fritas.', 10800,
   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=75', true, 0),
  ('a0000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002',
   'Hamburguesa Doble Bacon', 'Doble medallón, cheddar, panceta crocante y cebolla caramelizada.', 13900,
   'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=800&q=75', true, 1),
  ('a0000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000003',
   'Papas Fritas Cheddar y Bacon', 'Porción abundante de papas rústicas con salsa cheddar y panceta crocante.', 7800,
   'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=800&q=75', true, 0),
  ('a0000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000004',
   'Cerveza IPA Artesanal (Pinta)', 'Cerveza rubia de amargor medio con notas cítricas. 500 cc.', 4200,
   'https://images.unsplash.com/photo-1608270191599-52d3a95d4606?auto=format&fit=crop&w=800&q=75', true, 0)
on conflict (id) do update
  set name = excluded.name, price = excluded.price, description = excluded.description;

-- =============================================================================
-- ¡FIN DEL SCRIPT! Todo configurado y blindado exitosamente.
-- =============================================================================
