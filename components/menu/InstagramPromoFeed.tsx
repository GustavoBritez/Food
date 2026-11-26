'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  Flame,
  HandPlatter,
  Heart,
  LayoutGrid,
  List,
  MapPin,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Store as StoreIcon,
  Truck,
  X,
} from 'lucide-react';
import { ClocheIcon } from '@/components/ClocheIcon';
import { PwaInstallButton } from '@/components/PwaInstallButton';
import { Sheet } from '@/components/ui/Sheet';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { whatsappUrl } from '@/lib/order';
import type { DirectoryStore, PromoPost } from '@/lib/types';
import { cn, formatPrice, normalizeText } from '@/lib/utils';

type Props = {
  posts: PromoPost[];
  stores: DirectoryStore[];
  fromSlug?: string | null;
};

const RUBRO_CHIPS = [
  { id: 'all', label: 'Todos', emoji: '✨' },
  { id: 'Hamburguesas', label: 'Burgers', emoji: '🍔' },
  { id: 'Pizzas', label: 'Pizzas', emoji: '🍕' },
  { id: 'Cervecerías', label: 'Cervecerías', emoji: '🍺' },
  { id: 'Food Trucks', label: 'Food Trucks', emoji: '🚚' },
  { id: 'Cafeterías', label: 'Cafeterías', emoji: '☕' },
  { id: 'Postres', label: 'Postres', emoji: '🍰' },
  { id: 'Saludable', label: 'Saludable', emoji: '🥗' },
];

function getDaysRemaining(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function InstagramPromoFeed({ posts, stores, fromSlug }: Props) {
  const [query, setQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedRubro, setSelectedRubro] = useState<string>('all');
  const [onlyPromos, setOnlyPromos] = useState(false);
  const [onlyFoodTrucks, setOnlyFoodTrucks] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'az'>('featured');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [activePromo, setActivePromo] = useState<PromoPost | null>(null);

  const [likedStoreIds, setLikedStoreIds] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cartaapp:fav_stores');
      if (saved) setLikedStoreIds(new Set(JSON.parse(saved)));
    } catch {
      /* noop */
    }
  }, []);

  function toggleFavStore(id: string) {
    setLikedStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('cartaapp:fav_stores', JSON.stringify([...next]));
      } catch {
        /* noop */
      }
      return next;
    });
  }

  async function handleSharePromo(post: PromoPost) {
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/menu-principal`
        : '/menu-principal';
    const text = `🔥 Mirá esta promo de ${post.store_name}: ${post.caption}`;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `Promo de ${post.store_name} · Carta App`,
          text,
          url: shareUrl,
        });
        return;
      } catch {
        /* cancelado */
      }
    }
    if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
      await navigator.clipboard.writeText(shareUrl);
      setToast('¡Enlace copiado!');
      setTimeout(() => setToast(null), 2000);
    }
  }

  // Ubicaciones únicas disponibles extraídas de los bares y food trucks activos
  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => {
      if (s.location && s.location.trim()) {
        set.add(s.location.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [stores]);

  const filteredLocationsList = useMemo(() => {
    const q = normalizeText(locationSearch.trim());
    if (!q) return availableLocations;
    return availableLocations.filter((loc) => normalizeText(loc).includes(q));
  }, [availableLocations, locationSearch]);

  // Filtrado de bares y food trucks por ubicación, rubro, búsqueda y pills
  const filteredStores = useMemo(() => {
    const q = normalizeText(query.trim());

    const list = stores.filter((s) => {
      if (selectedLocation !== 'all') {
        const loc = (s.location || '').trim();
        if (loc.toLowerCase() !== selectedLocation.toLowerCase()) return false;
      }

      if (selectedRubro !== 'all') {
        const tag = (s.category_tag || '').toLowerCase();
        const tagline = (s.tagline || '').toLowerCase();
        const isTruckMatch =
          selectedRubro === 'Food Trucks' && (s.is_branch || tag.includes('truck'));
        if (
          !isTruckMatch &&
          !tag.includes(selectedRubro.toLowerCase()) &&
          !tagline.includes(selectedRubro.toLowerCase())
        ) {
          return false;
        }
      }

      if (onlyPromos && !s.has_promos) return false;
      if (
        onlyFoodTrucks &&
        !s.is_branch &&
        !(s.category_tag || '').toLowerCase().includes('truck')
      ) {
        return false;
      }

      if (!q) return true;

      const productsText = s.featured_products.map((p) => p.name).join(' ');
      return normalizeText(
        `${s.name} ${s.tagline ?? ''} ${s.location ?? ''} ${s.category_tag ?? ''} ${productsText}`
      ).includes(q);
    });

    if (sortBy === 'az') {
      return [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }

    // Destacados: primero los que tienen promos vigentes, luego por nombre
    return [...list].sort((a, b) => {
      if (a.has_promos !== b.has_promos) return a.has_promos ? -1 : 1;
      return a.name.localeCompare(b.name, 'es');
    });
  }, [stores, query, selectedLocation, selectedRubro, onlyPromos, onlyFoodTrucks, sortBy]);

  // Promociones filtradas también por ubicación si el usuario eligió una zona específica
  const filteredPromos = useMemo(() => {
    if (selectedLocation === 'all') return posts;
    const matchingSlugs = new Set(
      stores
        .filter(
          (s) =>
            (s.location || '').trim().toLowerCase() ===
            selectedLocation.toLowerCase()
        )
        .map((s) => s.slug)
    );
    const matching = posts.filter((p) => p.store_slug && matchingSlugs.has(p.store_slug));
    return matching.length > 0 ? matching : posts;
  }, [posts, stores, selectedLocation]);

  return (
    <div className="min-h-dvh bg-neutral-950 text-white pb-20">
      {/* =====================================================================
          1. TOP HEADER ESTILO APPLE + APP DE COMIDA (Sin Delivery)
         ===================================================================== */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-neutral-950/90 backdrop-blur-2xl">
        <div className="mx-auto max-w-2xl px-3.5 pt-3 pb-2.5 space-y-2.5">
          {/* Fila superior: Volver + Buscador Pill + Botón PWA/Ubicación */}
          <div className="flex items-center gap-2">
            <Link
              href={fromSlug ? `/p/${fromSlug}` : '/'}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.08] text-white ring-1 ring-white/10 transition hover:bg-white/15 active:scale-95"
              aria-label="Volver"
              title={fromSlug ? 'Volver a la carta' : 'Volver al inicio'}
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>

            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar bares, food trucks o productos..."
                aria-label="Buscar locales y productos"
                className="h-10 w-full rounded-full border border-white/10 bg-white/[0.08] pl-10 pr-9 text-[13.5px] text-white placeholder:text-white/45 outline-none transition focus:border-emerald-500/60 focus:bg-white/[0.12]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <PwaInstallButton
              variant="glass"
              label="App"
              className="h-10 px-3 text-[12px] shrink-0"
            />
          </div>

          {/* Selector Prominente de Ubicación (Apple-style Pill Bar) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setLocationSheetOpen(true)}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition active:scale-95',
                selectedLocation !== 'all'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                  : 'bg-white/[0.09] text-white ring-1 ring-white/15 hover:bg-white/15'
              )}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[140px] truncate">
                {selectedLocation === 'all' ? 'Todas las zonas' : selectedLocation}
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-75" />
            </button>

            {availableLocations.map((loc) => {
              const isSelected = selectedLocation.toLowerCase() === loc.toLowerCase();
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setSelectedLocation(isSelected ? 'all' : loc)}
                  className={cn(
                    'h-8 shrink-0 rounded-full px-3 text-[12px] font-medium transition active:scale-95',
                    isSelected
                      ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                      : 'bg-white/[0.05] text-white/75 ring-1 ring-white/10 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {loc}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-3.5 pt-4 space-y-5">
        {/* =====================================================================
            2. TIRA DE RUBROS / CATEGORÍAS (Estilo App de Comida)
           ===================================================================== */}
        <section aria-label="Rubros gastronómicos">
          <div className="no-scrollbar -mx-3.5 flex gap-2.5 overflow-x-auto px-3.5 py-0.5">
            {RUBRO_CHIPS.map((rubro) => {
              const active = selectedRubro === rubro.id;
              return (
                <button
                  key={rubro.id}
                  type="button"
                  onClick={() => setSelectedRubro(active && rubro.id !== 'all' ? 'all' : rubro.id)}
                  className="flex shrink-0 flex-col items-center gap-1.5 group"
                >
                  <div
                    className={cn(
                      'grid h-14 w-16 place-items-center rounded-2xl text-2xl transition-all duration-150 group-active:scale-95',
                      active
                        ? 'bg-white text-neutral-950 shadow-lg ring-2 ring-emerald-400'
                        : 'bg-neutral-900 text-white ring-1 ring-white/10 group-hover:bg-neutral-800'
                    )}
                  >
                    <span>{rubro.emoji}</span>
                  </div>
                  <span
                    className={cn(
                      'text-[11px] tracking-tight',
                      active ? 'font-bold text-white' : 'font-medium text-white/65'
                    )}
                  >
                    {rubro.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* =====================================================================
            3. BARRA DE FILTROS APPLE-STYLE (Sin Delivery)
           ===================================================================== */}
        <section className="no-scrollbar -mx-3.5 flex items-center gap-2 overflow-x-auto px-3.5">
          <button
            type="button"
            onClick={() => setLocationSheetOpen(true)}
            className="inline-flex h-8.5 shrink-0 items-center gap-1.5 rounded-full bg-white/[0.07] px-3.5 text-[12px] font-medium text-white ring-1 ring-white/10 transition hover:bg-white/12 active:scale-95"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Ubicación</span>
          </button>

          <button
            type="button"
            onClick={() => setSortBy(sortBy === 'featured' ? 'az' : 'featured')}
            className="inline-flex h-8.5 shrink-0 items-center gap-1.5 rounded-full bg-white/[0.07] px-3.5 text-[12px] font-medium text-white ring-1 ring-white/10 transition hover:bg-white/12 active:scale-95"
          >
            <span>Ordenar: {sortBy === 'featured' ? 'Destacados' : 'A - Z'}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>

          <button
            type="button"
            onClick={() => setOnlyPromos(!onlyPromos)}
            className={cn(
              'inline-flex h-8.5 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition active:scale-95',
              onlyPromos
                ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 text-white shadow-sm'
                : 'bg-white/[0.07] text-white/85 ring-1 ring-white/10 hover:bg-white/12'
            )}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Con Promos</span>
          </button>

          <button
            type="button"
            onClick={() => setOnlyFoodTrucks(!onlyFoodTrucks)}
            className={cn(
              'inline-flex h-8.5 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition active:scale-95',
              onlyFoodTrucks
                ? 'bg-white text-neutral-950 shadow-sm'
                : 'bg-white/[0.07] text-white/85 ring-1 ring-white/10 hover:bg-white/12'
            )}
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Food Trucks</span>
          </button>
        </section>

        {/* =====================================================================
            4. CARRUSEL HORIZONTAL DE PROMOCIONES (15 días auto-expirables)
           ===================================================================== */}
        {filteredPromos.length > 0 && (
          <section aria-label="Promociones vigentes">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-rose-400" />
                <h2 className="text-[14px] font-bold tracking-tight text-white">
                  Promos Destacadas (15 días)
                </h2>
              </div>
              <span className="text-[11px] text-white/50">Tocá para ver y pedir</span>
            </div>

            <div className="no-scrollbar -mx-3.5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3.5 pb-1">
              {filteredPromos.map((post) => {
                const daysLeft = getDaysRemaining(post.expires_at);
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setActivePromo(post)}
                    className="group relative flex h-36 w-[84%] sm:w-[320px] shrink-0 snap-start overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 text-left shadow-lg transition active:scale-[0.98]"
                  >
                    {/* Lado izquierdo: gradiente marca + texto promo */}
                    <div className="relative z-10 flex w-[56%] flex-col justify-between bg-gradient-to-br from-rose-600 via-fuchsia-700 to-neutral-900 p-3.5">
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                          <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                          {post.badge_text || 'PROMO'}
                        </span>
                        <p className="mt-1.5 line-clamp-2 text-[13px] font-extrabold leading-tight text-white">
                          {post.caption}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-1 pt-1">
                        <span className="truncate text-[11px] font-semibold text-white/90">
                          {post.store_name}
                        </span>
                        {post.promo_price !== null && post.promo_price !== undefined && (
                          <span className="shrink-0 rounded-full bg-emerald-400 px-2 py-0.5 text-[11px] font-black text-neutral-950">
                            {formatPrice(post.promo_price)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lado derecho: foto */}
                    <div className="relative w-[44%] h-full bg-neutral-800">
                      <Image
                        src={post.image_url}
                        alt={post.store_name}
                        fill
                        sizes="180px"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                      <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-black/70 px-2 py-0.5 text-[9.5px] font-bold text-amber-300 backdrop-blur-md">
                        <Clock className="h-2.5 w-2.5" /> {daysLeft}d
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* =====================================================================
            5. CABECERA DEL DIRECTORIO: CONTEO + SELECTOR APPLE LISTA / TARJETAS
           ===================================================================== */}
        <section className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-[19px] sm:text-[21px] font-bold tracking-tight text-white">
              {filteredStores.length}{' '}
              {filteredStores.length === 1 ? 'bar o food truck' : 'bares y food trucks'}
            </h1>
            {selectedLocation !== 'all' && (
              <p className="text-[12px] text-emerald-400 font-medium">
                Mostrando locales en {selectedLocation}
              </p>
            )}
          </div>

          {/* Segmented Control Estilo Apple */}
          <div className="inline-flex items-center rounded-full bg-white/[0.08] p-1 ring-1 ring-white/10">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'grid h-7 w-9 place-items-center rounded-full transition',
                viewMode === 'list' ? 'bg-white text-neutral-950 shadow-sm' : 'text-white/65 hover:text-white'
              )}
              aria-label="Vista en lista"
              title="Vista compacta"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={cn(
                'grid h-7 w-9 place-items-center rounded-full transition',
                viewMode === 'cards' ? 'bg-white text-neutral-950 shadow-sm' : 'text-white/65 hover:text-white'
              )}
              aria-label="Vista en tarjetas"
              title="Vista con portada"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* =====================================================================
            6. LISTADO DE BARES Y FOOD TRUCKS (SIN DELIVERY, CON SUS PRODUCTOS)
           ===================================================================== */}
        {filteredStores.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-neutral-900/60 px-6 py-16 text-center">
            <StoreIcon className="mx-auto h-10 w-10 text-white/30" />
            <h3 className="mt-3 text-base font-bold text-white">
              No encontramos bares ni food trucks
            </h3>
            <p className="mt-1 text-xs text-white/60">
              Probá cambiando la ubicación o quitando los filtros activos.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedLocation('all');
                setSelectedRubro('all');
                setOnlyPromos(false);
                setOnlyFoodTrucks(false);
              }}
              className="btn-apple-pill mt-4"
            >
              Ver todos los locales
            </button>
          </div>
        ) : viewMode === 'list' ? (
          /* VISTA COMPACTA */
          <div className="space-y-3">
            {filteredStores.map((store) => (
              <article
                key={store.id}
                className="flex items-center justify-between gap-3 rounded-3xl border border-white/[0.08] bg-neutral-900/80 p-3.5 transition hover:border-white/20"
              >
                <Link
                  href={`/p/${store.slug}`}
                  className="flex min-w-0 flex-1 items-center gap-3.5"
                >
                  <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-neutral-800 ring-1 ring-white/10">
                    {store.logo_url ? (
                      <Image
                        src={store.logo_url}
                        alt={store.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : store.cover_url ? (
                      <Image
                        src={store.cover_url}
                        alt={store.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <ClocheIcon className="h-7 w-7 text-white" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-[15px] font-bold text-white">{store.name}</h3>
                      {store.is_branch && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 shrink-0">
                          Food Truck
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[12px] text-white/60">
                      {store.category_tag || 'Gastronomía'}
                      {store.location ? ` · 📍 ${store.location}` : ''}
                    </p>
                    {store.featured_products.length > 0 && (
                      <p className="mt-1 truncate text-[11.5px] text-emerald-400 font-medium">
                        {store.featured_products
                          .slice(0, 2)
                          .map((p) => `${p.name} ${formatPrice(p.price)}`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                </Link>

                <Link
                  href={`/p/${store.slug}`}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-[12px] font-bold text-neutral-950 shadow-sm transition hover:bg-white/90 active:scale-95"
                >
                  <span>Ver Carta</span>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          /* VISTA TARJETAS GRANDES (Estilo App de Comida sin Delivery) */
          <div className="space-y-5">
            {filteredStores.map((store, idx) => {
              const isFav = likedStoreIds.has(store.id);
              return (
                <article
                  key={store.id}
                  className="overflow-hidden rounded-[28px] border border-white/[0.09] bg-neutral-900/85 shadow-xl transition hover:border-white/20"
                >
                  {/* 1. Imagen de Portada Grande */}
                  <Link href={`/p/${store.slug}`} className="relative block aspect-[16/9] w-full bg-neutral-800">
                    {store.cover_url ? (
                      <Image
                        src={store.cover_url}
                        alt={store.name}
                        fill
                        priority={idx < 2}
                        sizes="(max-width: 768px) 100vw, 640px"
                        className="object-cover"
                      />
                    ) : (
                      <div
                        className="h-full w-full"
                        style={{
                          background: `radial-gradient(120% 90% at 30% 20%, ${store.accent_color || '#22c55e'}, #171717 75%)`,
                        }}
                      />
                    )}

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

                    {/* Badges superiores estilo Apple Frosted Glass */}
                    <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                      {store.has_promos && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-neutral-950 shadow-md">
                          <Flame className="h-3 w-3 text-rose-500 fill-current" /> Promos activas
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/95 px-2.5 py-1 text-[11px] font-bold text-neutral-950 shadow-md">
                        {store.is_branch ? '🚚 Food Truck / Sucursal' : '🏪 Carta Directa'}
                      </span>
                    </div>

                    {/* Ubicación abajo a la izquierda sobre la foto */}
                    {store.location && (
                      <div className="absolute bottom-3 left-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-3 py-1 text-[11.5px] font-semibold text-white backdrop-blur-md ring-1 ring-white/15">
                          <MapPin className="h-3 w-3 text-emerald-400" /> {store.location}
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* 2. Bloque de Identidad del Bar / Food Truck */}
                  <div className="p-4 space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/p/${store.slug}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-neutral-800 ring-1 ring-white/15 shadow-sm">
                          {store.logo_url ? (
                            <Image
                              src={store.logo_url}
                              alt={store.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <ClocheIcon className="h-6 w-6 text-white" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h2 className="truncate text-[17px] font-bold tracking-tight text-white">
                            {store.name}
                          </h2>
                          <p className="truncate text-[12.5px] text-white/65">
                            {store.category_tag || 'Restaurante'}
                            {store.tagline ? ` · ${store.tagline}` : ''}
                          </p>
                        </div>
                      </Link>

                      <button
                        type="button"
                        onClick={() => toggleFavStore(store.id)}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-white/80 transition hover:bg-white/15 active:scale-90"
                        aria-label={isFav ? 'Quitar de favoritos' : 'Guardar local'}
                      >
                        <Heart
                          className={cn('h-4.5 w-4.5', isFav && 'fill-rose-500 text-rose-500')}
                        />
                      </button>
                    </div>

                    {/* 3. Vista previa de Productos del Bar / Food Truck */}
                    {store.featured_products.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {store.featured_products.map((prod) => (
                          <Link
                            key={prod.id}
                            href={`/p/${store.slug}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11.5px] text-white/85 transition hover:border-white/25 hover:bg-white/[0.08]"
                          >
                            <span className="max-w-[140px] truncate font-medium">{prod.name}</span>
                            <span className="font-bold tabular-nums text-emerald-400">
                              {formatPrice(prod.price)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* 4. Botones Estilo Apple (Ver Carta + WhatsApp directo, sin Delivery) */}
                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href={`/p/${store.slug}`}
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 text-[13px] font-bold text-neutral-950 shadow-sm transition hover:bg-white/90 active:scale-[0.98]"
                      >
                        <HandPlatter className="h-4 w-4" />
                        <span>Ver Carta Digital</span>
                      </Link>
                      <a
                        href={whatsappUrl(
                          store.whatsapp,
                          `Hola ${store.name}! Los vi en el Menú Principal de Carta App.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-4 text-[13px] font-bold text-neutral-950 shadow-sm transition hover:brightness-105 active:scale-[0.98]"
                        title="Escribir por WhatsApp"
                      >
                        <WhatsAppIcon className="h-4 w-4" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* =====================================================================
          MODAL / SHEET DE SELECCIÓN DE UBICACIÓN (Apple Style)
         ===================================================================== */}
      <Sheet
        open={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        title="Filtrar por Ubicación"
        description="Elegí el barrio, zona o ciudad para ver los bares y food trucks disponibles."
      >
        <div className="space-y-4 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              type="search"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Buscar barrio o zona..."
              className="input pl-10"
              autoFocus
            />
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedLocation('all');
                setLocationSheetOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition',
                selectedLocation === 'all'
                  ? 'bg-ink text-white'
                  : 'bg-canvas text-ink hover:bg-black/[0.06]'
              )}
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Todas las ubicaciones ({stores.length})
              </span>
              {selectedLocation === 'all' && <Check className="h-4 w-4" />}
            </button>

            {filteredLocationsList.map((loc) => {
              const active = selectedLocation.toLowerCase() === loc.toLowerCase();
              const count = stores.filter(
                (s) => (s.location || '').trim().toLowerCase() === loc.toLowerCase()
              ).length;

              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    setSelectedLocation(loc);
                    setLocationSheetOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition',
                    active
                      ? 'bg-ink text-white font-semibold'
                      : 'bg-canvas text-ink hover:bg-black/[0.06]'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 opacity-70" /> {loc}
                    <span className="text-xs opacity-60">({count})</span>
                  </span>
                  {active && <Check className="h-4 w-4" />}
                </button>
              );
            })}

            {filteredLocationsList.length === 0 && (
              <p className="py-6 text-center text-xs text-muted">
                No hay locales registrados en esa zona todavía.
              </p>
            )}
          </div>
        </div>
      </Sheet>

      {/* =====================================================================
          MODAL / SHEET DE DETALLE DE PROMOCIÓN (15 DÍAS)
         ===================================================================== */}
      <Sheet
        open={Boolean(activePromo)}
        onClose={() => setActivePromo(null)}
        title={activePromo?.store_name}
        description={
          activePromo
            ? `Promoción vigente · Quedan ${getDaysRemaining(activePromo.expires_at)} días`
            : undefined
        }
      >
        {activePromo && (
          <div className="space-y-4 py-2">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-900">
              <Image
                src={activePromo.image_url}
                alt={activePromo.store_name}
                fill
                sizes="480px"
                className="object-cover"
              />
              {activePromo.badge_text && (
                <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-md">
                  {activePromo.badge_text}
                </span>
              )}
              {activePromo.promo_price !== null && activePromo.promo_price !== undefined && (
                <span className="absolute bottom-3 right-3 rounded-full bg-emerald-500 px-3.5 py-1 text-sm font-black text-neutral-950 shadow-lg">
                  {formatPrice(activePromo.promo_price)}
                </span>
              )}
            </div>

            <p className="text-[14.5px] leading-relaxed text-ink">{activePromo.caption}</p>

            <div className="grid gap-2.5 pt-2">
              <a
                href={whatsappUrl(
                  activePromo.store_whatsapp,
                  `¡Hola ${activePromo.store_name}! Vi la promo "${
                    activePromo.badge_text ? `${activePromo.badge_text} - ` : ''
                  }${activePromo.caption.slice(0, 80)}" en el Menú Principal de Carta App y quiero pedirla.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp h-12 w-full"
              >
                <WhatsAppIcon className="h-4 w-4" />
                <span>Pedir Promo por WhatsApp</span>
              </a>

              <div className="grid grid-cols-2 gap-2">
                {activePromo.store_slug && (
                  <Link
                    href={`/p/${activePromo.store_slug}`}
                    className="btn-secondary h-11"
                  >
                    <ExternalLink className="h-4 w-4" /> Ver Carta
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => handleSharePromo(activePromo)}
                  className={cn(
                    'btn-secondary h-11',
                    !activePromo.store_slug && 'col-span-2'
                  )}
                >
                  <Share2 className="h-4 w-4" /> Compartir
                </button>
              </div>
            </div>
          </div>
        )}
      </Sheet>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center animate-fade-in">
          <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-neutral-950 shadow-2xl">
            {toast}
          </span>
        </div>
      )}
    </div>
  );
}
