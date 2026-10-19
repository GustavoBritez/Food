-- =============================================================================
-- Carta App · Suscripciones Stripe Multi-Tenant ($30 USD/mes) & Anti-Fraude
-- Migración: 20261019000000_stripe_subscriptions.sql
-- =============================================================================

-- 1. EXTENSIÓN DE TABLA STORES CON CAMPOS DE FACTURACIÓN
alter table public.stores
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  add column if not exists current_period_end timestamptz,
  add column if not exists plan_price_id text;

-- 2. TABLA DE IDEMPOTENCIA PARA WEBHOOKS DE STRIPE
-- Evita replay attacks y procesamiento duplicado de eventos de cobro
create table if not exists public.stripe_webhook_events (
  id text primary key,
  created_at timestamptz not null default now()
);

-- RLS activado sin políticas públicas: solo el service_role (backend webhook) tiene acceso total
alter table public.stripe_webhook_events enable row level security;

-- 3. ÍNDICES B-TREE PARA ALTO RENDIMIENTO A ESCALA (+1.000 BARES)
create index if not exists stores_created_by_idx on public.stores (created_by);
create index if not exists stores_stripe_customer_id_idx on public.stores (stripe_customer_id);
create index if not exists stores_subscription_status_idx on public.stores (subscription_status);
create index if not exists categories_store_id_idx on public.categories (store_id);
create index if not exists products_store_id_idx on public.products (store_id);

-- 4. TRIGGER ANTI-TAMPERING: PROTECCIÓN A NIVEL DE COLUMNA EN STORES
-- Un usuario autenticado desde el frontend JAMÁS puede alterar sus columnas de suscripción
create or replace function public.protect_stores_billing_columns()
returns trigger
language plpgsql
security definer
as $$
declare
  jwt_role text := coalesce(
    current_setting('request.jwt.claim.role', true),
    (auth.role())::text,
    ''
  );
begin
  -- Si la petición proviene de la clave 'authenticated' o 'anon', bloqueamos cambios de facturación
  if jwt_role in ('authenticated', 'anon') then
    if (NEW.stripe_customer_id is distinct from OLD.stripe_customer_id) or
       (NEW.stripe_subscription_id is distinct from OLD.stripe_subscription_id) or
       (NEW.subscription_status is distinct from OLD.subscription_status) or
       (NEW.current_period_end is distinct from OLD.current_period_end) or
       (NEW.plan_price_id is distinct from OLD.plan_price_id) then
      raise exception 'Acceso denegado: No está permitido modificar columnas de facturación directamente.';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists tr_protect_stores_billing on public.stores;
create trigger tr_protect_stores_billing
  before update on public.stores
  for each row
  execute function public.protect_stores_billing_columns();

-- 5. FUNCIÓN DE VALIDACIÓN DE SUSCRIPCIÓN ACTIVA PARA ESCRITURAS
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

-- 6. HARD-LOCK RLS EN CATEGORIES Y PRODUCTS (BLOQUEO DE ESCRITURAS SI NO ESTÁ ACTIVO)
-- Categories: solo el dueño con suscripción activa puede crear, editar o borrar
drop policy if exists "categories: escritura del dueño" on public.categories;
create policy "categories: escritura del dueño" on public.categories
  for all to authenticated
  using (public.is_store_owner_active(store_id))
  with check (public.is_store_owner_active(store_id));

-- Products: solo el dueño con suscripción activa puede crear, editar o borrar
drop policy if exists "products: escritura del dueño" on public.products;
create policy "products: escritura del dueño" on public.products
  for all to authenticated
  using (public.is_store_owner_active(store_id))
  with check (public.is_store_owner_active(store_id));
