-- =============================================================================
-- MenuQR · Personalización del local
-- Ejecutar DESPUÉS de 20261018000000_init.sql
-- =============================================================================

-- Identidad visual del local (la gestiona el dueño desde /admin)
alter table public.stores
  add column if not exists tagline text
    check (tagline is null or char_length(tagline) <= 120),
  add column if not exists accent_color text not null default '#22c55e'
    check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  -- 'feed' = deslizable a pantalla completa (tipo Reels) · 'list' = lista clásica
  add column if not exists layout text not null default 'feed'
    check (layout in ('feed', 'list'));

-- Slugs reservados por la app
alter table public.stores drop constraint if exists stores_slug_not_reserved;
alter table public.stores add constraint stores_slug_not_reserved
  check (slug not in ('demo', 'admin', 'login', 'api', 'auth', 'p'));

-- Video opcional por producto (se reproduce en el menú deslizable)
alter table public.products
  add column if not exists video_url text;

-- El bucket ahora acepta videos cortos (hasta 25 MB)
update storage.buckets
   set file_size_limit = 26214400,
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp', 'image/gif',
         'video/mp4', 'video/webm', 'video/quicktime'
       ]
 where id = 'menus';
