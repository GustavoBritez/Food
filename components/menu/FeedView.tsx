'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Film,
  HandPlatter,
  Heart,
  LayoutGrid,
  Menu,
  RotateCcw,
  Search,
  Share2,
  ShoppingBag,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { PwaInstallButton } from '@/components/PwaInstallButton';
import { Sheet } from '@/components/ui/Sheet';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import type { Product, PublicStore } from '@/lib/types';
import { whatsappUrl } from '@/lib/order';
import { cn, formatPrice, normalizeText } from '@/lib/utils';
import type { MenuActions, MenuSection } from './PublicMenu';

type Slide = { product: Product; categoryId: string };

type Props = {
  store: PublicStore;
  sections: MenuSection[];
  actions: MenuActions;
  preview: boolean;
};

const DISCLAIMER = 'Precios sujetos a modificación por el comercio. No procesamos pagos.';

/** "Me gusta" locales (guardados en este dispositivo) */
function useLikes(storageKey: string | null) {
  const [liked, setLiked] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!storageKey) return;
    try {
      setLiked(new Set(JSON.parse(localStorage.getItem(storageKey) ?? '[]')));
    } catch {
      /* sin storage */
    }
  }, [storageKey]);

  const toggle = useCallback(
    (id: string) => {
      setLiked((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify([...next]));
          } catch {
            /* noop */
          }
        }
        return next;
      });
    },
    [storageKey]
  );

  return { liked, toggle };
}

export function FeedView({ store, sections, actions, preview }: Props) {
  const slides = useMemo<Slide[]>(
    () => sections.flatMap((s) => s.products.map((p) => ({ product: p, categoryId: s.category.id }))),
    [sections]
  );

  const [active, setActive] = useState(0);
  const [gridOpen, setGridOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // En PC de escritorio permite elegir entre Catálogo Ancho y Modo Reels
  const [desktopMode, setDesktopMode] = useState<'grid' | 'reels'>('grid');

  const scrollerRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);

  const { liked, toggle } = useLikes(preview ? null : `cartaapp:likes:${store.slug}`);

  const totalSlides = slides.length + 1; // +1 por la tarjeta final
  const activeSlide = slides[active];
  const activeCat = activeSlide?.categoryId ?? sections[0]?.category.id;

  const firstIndexByCat = useMemo(() => {
    const map = new Map<string, number>();
    slides.forEach((s, i) => {
      if (!map.has(s.categoryId)) map.set(s.categoryId, i);
    });
    return map;
  }, [slides]);

  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    slides.forEach((s, i) => map.set(s.product.id, i));
    return map;
  }, [slides]);

  // Teclado para navegar en PC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gridOpen || infoOpen) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        goTo(Math.min(slides.length, active + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        goTo(Math.max(0, active - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, slides.length, gridOpen, infoOpen]);

  // Detecta el slide visible por IntersectionObserver
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-index'));
            if (!Number.isNaN(idx)) setActive(idx);
          }
        });
      },
      { root, threshold: 0.55 }
    );

    const items = root.querySelectorAll('[data-index]');
    items.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [slides.length, desktopMode]);

  // Auto-scroll del chip de categoría
  useEffect(() => {
    const container = chipsRef.current;
    if (!container || !activeCat) return;
    const btn = container.querySelector<HTMLElement>(`[data-cat="${activeCat}"]`);
    if (btn) {
      const left = btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2;
      container.scrollTo({ left, behavior: 'smooth' });
    }
  }, [activeCat]);

  function goTo(index: number, behavior: ScrollBehavior = 'smooth') {
    const root = scrollerRef.current;
    if (!root) return;
    root.scrollTo({ top: index * root.clientHeight, behavior });
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  async function share(p: Product) {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/p/${store.slug}` : '';
    const shareData = {
      title: `${p.name} · ${store.name}`,
      text: `${p.name} - ${formatPrice(p.price)} en ${store.name}`,
      url,
    };
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* cancelado */
      }
    }
    if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
      await navigator.clipboard.writeText(url);
      showToast('¡Link del menú copiado!');
    }
  }

  // Filtrado de la grilla / buscador
  const gridSections = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return sections;
    return sections
      .map((s) => ({
        ...s,
        products: s.products.filter((p) => normalizeText(`${p.name} ${p.description ?? ''}`).includes(q)),
      }))
      .filter((s) => s.products.length > 0);
  }, [sections, query]);

  const initial = store.name.trim().charAt(0).toUpperCase() || 'L';

  if (slides.length === 0) {
    return (
      <div className="flex h-full min-h-dvh flex-col items-center justify-center px-8 text-center text-white bg-neutral-950">
        <p className="text-xl font-semibold">{store.name}</p>
        <p className="mt-2 text-sm text-white/60">El comercio todavía no cargó productos.</p>
        <p className="absolute inset-x-0 bottom-4 px-6 text-center text-[11px] text-white/40">{DISCLAIMER}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-dvh w-full overflow-hidden bg-neutral-950 text-white select-none">
      {/* Barra superior de navegación (adaptativa para Celular y PC a lo ancho) */}
      <header className="fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-black/90 via-black/60 to-transparent pb-6 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-3">
          {/* Logo y Nombre del comercio */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="flex items-center gap-2 text-left group"
              aria-label="Ver datos del local"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--accent-fg)] shadow-sm">
                {store.logo_url ? (
                  <Image src={store.logo_url} alt={store.name} width={36} height={36} className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </span>
              <div className="min-w-0 hidden sm:block">
                <p className="truncate text-[14px] font-bold text-white group-hover:text-emerald-400 transition">{store.name}</p>
                {store.tagline && <p className="truncate text-[11px] text-white/60">{store.tagline}</p>}
              </div>
            </button>
          </div>

          {/* Chips de Categorías */}
          <div ref={chipsRef} className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto px-2 max-w-xl mx-auto">
            {sections.map(({ category }) => (
              <button
                key={category.id}
                type="button"
                data-cat={category.id}
                onClick={() => {
                  if (desktopMode === 'grid') {
                    const el = document.getElementById(`cat-sec-${category.id}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    goTo(firstIndexByCat.get(category.id) ?? 0);
                  }
                }}
                className={cn(
                  'h-8 shrink-0 rounded-full px-3.5 text-[12.5px] font-semibold backdrop-blur-md transition active:scale-95',
                  activeCat === category.id
                    ? 'bg-white text-black shadow-md'
                    : 'bg-white/10 text-white/90 ring-1 ring-white/10 hover:bg-white/20'
                )}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Acciones de la derecha: Buscador, PWA, Toggle de modo PC, Carrito */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Buscador / Grilla */}
            <button
              type="button"
              onClick={() => setGridOpen(true)}
              className="glass-btn"
              title="Buscar platos y ver catálogo"
              aria-label="Buscar"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Selector de modo en PC (Catálogo Ancho vs Reels) */}
            <div className="hidden md:flex items-center rounded-full bg-white/10 p-0.5 border border-white/15">
              <button
                type="button"
                onClick={() => setDesktopMode('grid')}
                className={cn(
                  'flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-medium transition',
                  desktopMode === 'grid' ? 'bg-white text-black shadow-sm font-semibold' : 'text-white/80 hover:text-white'
                )}
                title="Ver catálogo a lo ancho"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Catálogo
              </button>
              <button
                type="button"
                onClick={() => setDesktopMode('reels')}
                className={cn(
                  'flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-medium transition',
                  desktopMode === 'reels' ? 'bg-white text-black shadow-sm font-semibold' : 'text-white/80 hover:text-white'
                )}
                title="Ver en formato Reels vertical"
              >
                <Film className="h-3.5 w-3.5" /> Reels
              </button>
            </div>

            {/* Botón PWA para instalar la app */}
            <PwaInstallButton variant="glass" label="App" className="hidden sm:inline-flex" />

            {/* Carrito Flotante */}
            {actions.count > 0 && (
              <button
                type="button"
                onClick={actions.openCart}
                className="glass-btn relative bg-[var(--accent)] text-[var(--accent-fg)] border-none font-bold"
                aria-label="Ver mi pedido"
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-bold text-black shadow-md animate-pop">
                  {actions.count}
                </span>
              </button>
            )}

            {/* Info local */}
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="glass-btn"
              aria-label="Información del local"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          CONTENIDO:
          1) VISTA EN CELULAR (Siempre snap-scroll a pantalla completa)
          2) VISTA EN PC (Catálogo ancho a lo ancho O Modo Reels centrado con blur)
         ========================================================================= */}

      {/* A) MODO CATÁLOGO ANCHO PARA PC (visible en desktop cuando desktopMode === 'grid') */}
      <div
        className={cn(
          'hidden md:block h-full min-h-dvh overflow-y-auto overscroll-contain pt-24 pb-16 px-6',
          desktopMode === 'grid' && !preview ? 'md:block' : 'md:hidden'
        )}
      >
        <div className="mx-auto max-w-7xl">
          {sections.map(({ category, products }) => (
            <section key={category.id} id={`cat-sec-${category.id}`} className="mb-10">
              <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-5">
                <h2 className="text-xl font-bold tracking-tight text-white">{category.name}</h2>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[12px] font-medium text-white/60">
                  {products.length} platos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {products.map((p) => (
                  <article
                    key={p.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/80 backdrop-blur-md transition duration-200 hover:border-white/25 hover:shadow-2xl hover:shadow-black/50"
                  >
                    {/* Media: Foto o Video */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-800">
                      {p.video_url ? (
                        <video
                          src={p.video_url}
                          poster={p.photo_url ?? undefined}
                          muted
                          loop
                          playsInline
                          onMouseEnter={(e) => e.currentTarget.play().catch(() => undefined)}
                          onMouseLeave={(e) => e.currentTarget.pause()}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : p.photo_url ? (
                        <Image
                          src={p.photo_url}
                          alt={p.name}
                          fill
                          sizes="(max-width: 1200px) 50vw, 25vw"
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="h-full w-full"
                          style={{
                            background: 'radial-gradient(120% 90% at 30% 20%, var(--accent), #111 75%)',
                          }}
                        />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                      {/* Botón me gusta */}
                      <button
                        type="button"
                        onClick={() => toggle(p.id)}
                        className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/50 backdrop-blur-md text-white transition hover:scale-110 active:scale-95"
                        aria-label="Me gusta"
                      >
                        <Heart className={cn('h-4 w-4', liked.has(p.id) && 'fill-red-500 text-red-500')} />
                      </button>

                      {/* Precio */}
                      <span className="absolute bottom-3 left-3 rounded-full bg-[var(--accent)] px-3 py-1 text-[14px] font-bold text-[var(--accent-fg)] shadow-lg">
                        {formatPrice(p.price)}
                      </span>
                    </div>

                    {/* Descripción y Contenido */}
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <h3 className="text-[17px] font-bold text-white group-hover:text-emerald-400 transition leading-snug">
                          {p.name}
                        </h3>
                        {p.description && (
                          <p className="mt-1.5 text-[13px] text-white/70 line-clamp-2 leading-relaxed">
                            {p.description}
                          </p>
                        )}
                      </div>

                      {/* Botones de acción directos */}
                      <div className="mt-4 grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => actions.orderAtTable(p)}
                          className="btn relative h-10 bg-white text-[12.5px] font-semibold text-black hover:bg-white/90"
                        >
                          <HandPlatter className="h-3.5 w-3.5" /> En mesa
                          {actions.qtyOf(p.id) > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-bold text-[var(--accent-fg)] shadow">
                              {actions.qtyOf(p.id)}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => actions.orderOneByWhatsApp(p)}
                          className="btn h-10 bg-whatsapp text-[12.5px] font-semibold text-white hover:brightness-95"
                        >
                          <WhatsAppIcon /> WhatsApp
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

          <footer className="mt-12 border-t border-white/10 pt-6 text-center text-[12px] text-white/50">
            {DISCLAIMER} · Menú creado con <strong className="text-white">Carta App</strong>
          </footer>
        </div>
      </div>

      {/* B) MODO REELS (Celular 100% full-screen O Desktop centrado con ambient blur) */}
      <div
        className={cn(
          'h-full min-h-dvh w-full overflow-hidden',
          desktopMode === 'grid' && !preview ? 'md:hidden' : 'block'
        )}
      >
        {/* Ambient background blur en PC */}
        {activeSlide?.product.photo_url && (
          <div
            className="hidden md:block pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-25 filter blur-3xl scale-125 transition-all duration-700"
            style={{ backgroundImage: `url(${activeSlide.product.photo_url})` }}
          />
        )}

        {/* Marco centrado de Reels en PC / Full screen en Móvil */}
        <div
          ref={scrollerRef}
          className={cn(
            'no-scrollbar relative z-10 h-full min-h-dvh snap-y snap-mandatory overflow-y-scroll overscroll-contain',
            preview
              ? 'w-full'
              : 'mx-auto w-full md:max-w-[440px] md:h-[calc(100dvh-80px)] md:my-auto md:rounded-3xl md:border md:border-white/15 md:shadow-2xl'
          )}
        >
          {slides.map((slide, i) => (
            <FeedSlide
              key={slide.product.id}
              index={i}
              product={slide.product}
              active={i === active}
              near={Math.abs(i - active) <= 1}
              liked={liked.has(slide.product.id)}
              qty={actions.qtyOf(slide.product.id)}
              onLike={() => toggle(slide.product.id)}
              onShare={() => share(slide.product)}
              actions={actions}
            />
          ))}

          {/* Tarjeta final del feed */}
          <section
            data-index={slides.length}
            className="relative flex h-full min-h-dvh w-full snap-start snap-always flex-col items-center justify-center bg-neutral-950 px-8 text-center text-white"
          >
            <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-[var(--accent)] text-2xl font-bold text-[var(--accent-fg)]">
              {store.logo_url ? (
                <Image src={store.logo_url} alt={store.name} width={64} height={64} className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </span>
            <h2 className="mt-5 text-2xl font-bold tracking-tight">¡Llegaste al final!</h2>
            <p className="mt-2 text-[14px] text-white/60">Ya viste todos los platos de {store.name}.</p>

            <div className="mt-7 grid w-full max-w-xs gap-2.5">
              {actions.count > 0 && (
                <button
                  type="button"
                  onClick={actions.openCart}
                  className="btn h-12 bg-[var(--accent)] text-[14px] font-bold text-[var(--accent-fg)]"
                >
                  <ShoppingBag className="h-4 w-4" /> Ver mi pedido ({actions.count})
                </button>
              )}
              <button
                type="button"
                onClick={() => setGridOpen(true)}
                className="btn h-11 bg-white/10 text-[14px] text-white hover:bg-white/15"
              >
                <LayoutGrid className="h-4 w-4" /> Ver catálogo completo
              </button>
              <button
                type="button"
                onClick={() => goTo(0)}
                className="btn h-10 text-[13px] text-white/70 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Volver al inicio
              </button>
            </div>

            <p className="absolute inset-x-0 bottom-5 px-6 text-[11px] leading-relaxed text-white/40">
              {DISCLAIMER}
              <br />
              Menú creado con <span className="text-white">Carta App</span>
            </p>
          </section>
        </div>

        {/* Flechas de navegación prev/next en PC */}
        <div className="hidden md:flex fixed right-8 bottom-10 z-20 flex-col gap-2">
          <button
            type="button"
            disabled={active === 0}
            onClick={() => goTo(Math.max(0, active - 1))}
            className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none"
            title="Plato anterior (Flecha Arriba)"
          >
            <ChevronUp className="h-6 w-6" />
          </button>
          <button
            type="button"
            disabled={active >= slides.length}
            onClick={() => goTo(Math.min(slides.length, active + 1))}
            className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none"
            title="Siguiente plato (Flecha Abajo)"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Barra de progreso inferior */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[3px] bg-white/10">
        <div
          className="h-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${((active + 1) / totalSlides) * 100}%` }}
        />
      </div>

      {/* Toast emergente */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center animate-fade-in">
          <span className="rounded-full bg-black/90 px-4 py-2 text-[13px] font-semibold text-white shadow-xl backdrop-blur-md border border-white/10">
            {toast}
          </span>
        </div>
      )}

      {/* =========================================================================
          MODAL DE BÚSQUEDA Y GRILLA (A LO ANCHO EN PC, 100% RESPONSIVE)
         ========================================================================= */}
      {gridOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white animate-fade-in">
          <header className="shrink-0 border-b border-white/10 bg-neutral-900/90 backdrop-blur-md px-4 py-3">
            <div className="mx-auto flex max-w-4xl items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <input
                  type="search"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar plato, ingrediente o bebida..."
                  aria-label="Buscar en el menú"
                  className="h-11 w-full rounded-2xl bg-white/10 pl-10 pr-10 text-[15px] text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-emerald-500"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/60 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setGridOpen(false);
                  setQuery('');
                }}
                className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
                aria-label="Cerrar búsqueda"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* Grilla responsiva que aprovecha todo el ancho de la pantalla */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            <div className="mx-auto max-w-7xl">
              {gridSections.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-lg font-semibold text-white/80">No encontramos resultados para “{query}”</p>
                  <p className="mt-1 text-sm text-white/50">Probá buscando con otro ingrediente o plato.</p>
                </div>
              ) : (
                gridSections.map(({ category, products }) => (
                  <section key={category.id} className="mb-8">
                    <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-white/60">
                      {category.name} ({products.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                      {products.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const idx = indexById.get(p.id) ?? 0;
                            setGridOpen(false);
                            setQuery('');
                            setDesktopMode('reels');
                            requestAnimationFrame(() => goTo(idx, 'auto'));
                          }}
                          className="group relative flex flex-col overflow-hidden rounded-2xl bg-neutral-900 border border-white/10 text-left transition hover:border-white/30 hover:scale-[1.02] active:scale-95"
                        >
                          <div className="relative aspect-square w-full overflow-hidden bg-neutral-800">
                            {p.photo_url ? (
                              <Image
                                src={p.photo_url}
                                alt={p.name}
                                fill
                                sizes="(max-width: 768px) 50vw, 20vw"
                                className="object-cover transition duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div
                                className="h-full w-full"
                                style={{
                                  background: 'radial-gradient(120% 90% at 30% 20%, var(--accent), #111 75%)',
                                }}
                              />
                            )}
                            <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                              {formatPrice(p.price)}
                            </span>
                          </div>
                          <div className="p-2.5">
                            <p className="truncate text-[13px] font-bold text-white group-hover:text-emerald-400">
                              {p.name}
                            </p>
                            {p.description && (
                              <p className="mt-0.5 truncate text-[11px] text-white/60">{p.description}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          INFORMACIÓN DEL LOCAL Y DESCARGA DE APP (PWA)
         ========================================================================= */}
      <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} forceMobile={false}>
        <div className="flex items-center gap-3.5 pt-2">
          <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[var(--accent)] text-xl font-bold text-[var(--accent-fg)] shadow-md">
            {store.logo_url ? (
              <Image src={store.logo_url} alt={store.name} width={56} height={56} className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight">{store.name}</h2>
            {store.tagline && <p className="text-[13.5px] text-muted">{store.tagline}</p>}
          </div>
        </div>

        {/* Botón PWA dentro del panel de información */}
        <div className="mt-5 rounded-2xl bg-canvas p-4 border border-black/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-ink">Instalar Menú en tu Celular</p>
              <p className="text-[12px] text-muted">Accedé sin escribir la dirección ni abrir el navegador</p>
            </div>
            <PwaInstallButton variant="button" label="Descargar" className="shrink-0" />
          </div>
        </div>

        <h3 className="mt-5 text-[12px] font-bold uppercase tracking-wider text-subtle">Categorías del Menú</h3>
        <ul className="mt-2 divide-y divide-black/5">
          {sections.map(({ category, products }) => (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => {
                  setInfoOpen(false);
                  if (desktopMode === 'grid') {
                    const el = document.getElementById(`cat-sec-${category.id}`);
                    el?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    goTo(firstIndexByCat.get(category.id) ?? 0);
                  }
                }}
                className="flex w-full items-center justify-between py-2.5 text-left transition hover:text-emerald-600"
              >
                <span className="text-[14.5px] font-medium">{category.name}</span>
                <span className="text-[13px] tabular-nums text-muted">{products.length}</span>
              </button>
            </li>
          ))}
        </ul>

        <a
          href={whatsappUrl(store.whatsapp, `Hola ${store.name}!`)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-whatsapp mt-5 h-12 w-full font-semibold"
        >
          <WhatsAppIcon /> Escribir por WhatsApp al comercio
        </a>
        <p className="mt-4 text-center text-[11px] text-subtle">{DISCLAIMER} · Menú impulsado por Carta App</p>
      </Sheet>
    </div>
  );
}

type SlideProps = {
  index: number;
  product: Product;
  active: boolean;
  near: boolean;
  liked: boolean;
  qty: number;
  onLike: () => void;
  onShare: () => void;
  actions: MenuActions;
};

function FeedSlide({ index, product: p, active, near, liked, qty, onLike, onShare, actions }: SlideProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  // El video solo se reproduce cuando el slide está activo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) video.play().catch(() => undefined);
    else video.pause();
  }, [active]);

  return (
    <section
      data-index={index}
      className="relative h-full min-h-dvh w-full snap-start snap-always overflow-hidden bg-neutral-900"
    >
      {p.video_url ? (
        <>
          <video
            ref={videoRef}
            src={p.video_url}
            poster={p.photo_url ?? undefined}
            muted={muted}
            loop
            playsInline
            preload={near ? 'auto' : 'none'}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="absolute left-4 top-24 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md transition active:scale-95"
            aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>
        </>
      ) : p.photo_url ? (
        <Image
          src={p.photo_url}
          alt={p.name}
          fill
          priority={index === 0}
          sizes="(max-width: 768px) 100vw, 440px"
          className="object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 80% at 30% 25%, var(--accent), #0a0a0a 70%)' }}
        />
      )}

      {/* Degradado para legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/30 pointer-events-none" />

      {/* Acciones flotantes laterales */}
      <div className="absolute bottom-52 right-3 z-20 flex flex-col items-center gap-4 text-white">
        <button
          type="button"
          onClick={onLike}
          aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
          className="grid h-12 w-12 place-items-center rounded-full bg-black/40 backdrop-blur-md transition active:scale-90"
        >
          <Heart className={cn('h-6 w-6 drop-shadow-lg', liked ? 'fill-red-500 text-red-500' : 'text-white')} />
        </button>
        <button
          type="button"
          onClick={onShare}
          aria-label="Compartir"
          className="grid h-12 w-12 place-items-center rounded-full bg-black/40 backdrop-blur-md transition active:scale-90"
        >
          <Share2 className="h-5 w-5 drop-shadow-lg text-white" />
        </button>
      </div>

      {/* Info y botones del plato */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-8 text-white">
        {index === 0 && (
          <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold text-white/80 animate-bounce">
            <ChevronUp className="h-3.5 w-3.5" /> Deslizá hacia arriba para ver más platos
          </p>
        )}
        <span className="inline-flex h-8 items-center rounded-full bg-[var(--accent)] px-3.5 text-[15px] font-bold tabular-nums text-[var(--accent-fg)] shadow-lg">
          {formatPrice(p.price)}
        </span>
        <h2 className="mt-2.5 pr-14 text-[24px] sm:text-[26px] font-bold leading-tight tracking-tight drop-shadow">
          {p.name}
        </h2>
        {p.description && (
          <p className="mt-1.5 line-clamp-3 pr-14 text-[13.5px] leading-snug text-white/85">
            {p.description}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => actions.orderAtTable(p)}
            className="btn relative h-11 bg-white text-[13px] font-bold text-black hover:bg-white/90 shadow-lg"
          >
            <HandPlatter className="h-4 w-4" /> Pedir en mesa
            {qty > 0 && (
              <span
                key={qty}
                className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-bold text-[var(--accent-fg)] shadow-md animate-pop"
              >
                {qty}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => actions.orderOneByWhatsApp(p)}
            className="btn h-11 bg-whatsapp text-[13px] font-bold text-white hover:brightness-95 shadow-lg"
          >
            <WhatsAppIcon /> Por WhatsApp
          </button>
        </div>
      </div>
    </section>
  );
}
