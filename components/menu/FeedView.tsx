'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
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
import { ClocheIcon } from '@/components/ClocheIcon';
import { Sheet } from '@/components/ui/Sheet';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import type { ButtonStyle, Product, PublicStore } from '@/lib/types';
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

  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    sections[0]?.category.id ?? ''
  );
  const isProgrammaticScroll = useRef(false);

  // Detección de si la app ya corre instalada en modo Standalone (PWA)
  const [isStandalone, setIsStandalone] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkStandalone = () => {
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      );
    };
    checkStandalone();
  }, []);

  // Sincronizar activeCategoryId inicial cuando cargan las secciones
  useEffect(() => {
    if (!activeCategoryId && sections[0]?.category.id) {
      setActiveCategoryId(sections[0].category.id);
    }
  }, [sections, activeCategoryId]);

  // Detección de dispositivo para saber si el usuario está en PC o Celular
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(typeof window !== 'undefined' && window.innerWidth >= 768);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Modo de visualización: 'reels' (feed vertical) o 'grid' (catálogo).
  // Disponible tanto en Celular, PWA como en PC.
  const [viewMode, setViewMode] = useState<'grid' | 'reels'>('reels');

  const scrollerRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const desktopGridScrollerRef = useRef<HTMLDivElement>(null);
  const [gridActiveCat, setGridActiveCat] = useState<string | null>(null);

  // La grilla está activa si el usuario eligió el modo 'grid' y no estamos en preview
  const isGridActive = !preview && viewMode === 'grid';

  const { liked, toggle } = useLikes(preview ? null : `cartaapp:likes:${store.slug}`);

  const totalSlides = slides.length + 1; // +1 por la tarjeta final
  const activeSlide = slides[active];
  const activeCat = isGridActive
    ? (gridActiveCat ?? sections[0]?.category.id)
    : (activeCategoryId || activeSlide?.categoryId || sections[0]?.category.id);

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

  const goTo = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const root = scrollerRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (target) {
      isProgrammaticScroll.current = true;
      root.style.scrollSnapType = 'none';
      target.scrollIntoView({ behavior, block: 'start' });
      setTimeout(() => {
        if (root) {
          root.style.scrollSnapType = 'y mandatory';
        }
        isProgrammaticScroll.current = false;
      }, 700);
    } else {
      root.scrollTo({ top: index * root.clientHeight, behavior });
    }
    setActive(index);
  }, []);

  const scrollToCategory = useCallback((categoryId: string) => {
    setActiveCategoryId(categoryId);

    // Centrar la píldora activa en la barra superior suavemente
    const pillEl = chipsRef.current?.querySelector(
      `[data-pill-id="${categoryId}"]`
    ) as HTMLElement | null;
    pillEl?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

    if (isGridActive) {
      setGridActiveCat(categoryId);
      const container = desktopGridScrollerRef.current;
      const el = document.getElementById(`cat-sec-${categoryId}`);
      if (el && container) {
        const offset = 85;
        const targetTop = el.offsetTop - offset;
        container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      } else if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    // Buscar el primer plato de esa categoría en el Feed vertical (Reels)
    const container = scrollerRef.current;
    if (!container) return;

    const firstSlideOfCat = container.querySelector(
      `[data-category-id="${categoryId}"]`
    ) as HTMLElement | null;

    if (firstSlideOfCat) {
      isProgrammaticScroll.current = true;
      const idx = Number(firstSlideOfCat.getAttribute('data-index'));
      if (!Number.isNaN(idx)) {
        setActive(idx);
      }

      // CRÍTICO PARA CELULARES Y PWA:
      // Desactivamos temporalmente el scroll-snap durante el smooth scroll
      // para que Safari iOS y Android Chrome no cancelen ni aborten el salto.
      container.style.scrollSnapType = 'none';
      firstSlideOfCat.scrollIntoView({ behavior: 'smooth', block: 'start' });

      setTimeout(() => {
        if (container) {
          container.style.scrollSnapType = 'y mandatory';
        }
        isProgrammaticScroll.current = false;
      }, 700);
    }
  }, [isGridActive]);

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
  }, [active, slides.length, gridOpen, infoOpen, goTo]);

  // Detecta el slide visible por IntersectionObserver en Reels
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll.current) return;

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            const idx = Number(entry.target.getAttribute('data-index'));
            if (!Number.isNaN(idx)) {
              setActive(idx);
            }
            const catId = entry.target.getAttribute('data-category-id');
            if (catId) {
              setActiveCategoryId(catId);
              const pillEl = chipsRef.current?.querySelector(
                `[data-pill-id="${catId}"]`
              ) as HTMLElement | null;
              pillEl?.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest',
              });
            }
            break;
          }
        }
      },
      { root, threshold: [0.55] }
    );

    const items = root.querySelectorAll('[data-index]');
    items.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [slides.length, viewMode]);

  // Detecta la categoría visible por IntersectionObserver en Catálogo PC
  useEffect(() => {
    if (!isGridActive) return;
    const gridEl = desktopGridScrollerRef.current;
    if (!gridEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const catId = entry.target.getAttribute('data-cat-section');
            if (catId) setGridActiveCat(catId);
          }
        });
      },
      { root: gridEl, rootMargin: '-10% 0px -70% 0px', threshold: 0 }
    );

    const sectionEls = gridEl.querySelectorAll('[data-cat-section]');
    sectionEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [isGridActive, sections]);

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

  const isDark = store.theme === 'light' ? false : true;
  const bgColor = store.bg_color || (isDark ? '#0a0a0a' : '#ffffff');

  return (
    <div
      className={cn(
        'relative h-full min-h-dvh w-full overflow-hidden select-none transition-colors duration-200',
        isDark ? 'text-white' : 'text-neutral-900'
      )}
      style={{ backgroundColor: bgColor }}
    >
      {/* Barra superior de navegación (adaptativa para Celular, PWA y PC) */}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-30 pt-[env(safe-area-inset-top,0px)] pb-3 backdrop-blur-[2px] transition-colors duration-200',
          isDark
            ? 'bg-gradient-to-b from-black/95 via-black/70 to-transparent text-white'
            : 'bg-gradient-to-b from-white/95 via-white/80 to-transparent text-neutral-900 border-b border-black/5'
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-1.5 sm:gap-3 px-2.5 sm:px-4 pt-2 sm:pt-3">
          {/* Logo y Nombre del comercio */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="flex items-center gap-2 text-left group"
              aria-label="Ver datos del local"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-neutral-900 text-white shadow-sm ring-1 ring-white/10 transition-transform active:scale-90">
                {store.logo_url ? (
                  <Image src={store.logo_url} alt={store.name} width={36} height={36} className="h-full w-full object-cover" />
                ) : (
                  <ClocheIcon className="h-5 w-5 text-white" />
                )}
              </span>
              <div className="min-w-0 hidden sm:block">
                <p className={cn('truncate text-[14px] font-bold transition', isDark ? 'text-white group-hover:text-emerald-400' : 'text-neutral-900 group-hover:text-emerald-600')}>
                  {store.name}
                </p>
                {store.tagline && <p className={cn('truncate text-[11px]', isDark ? 'text-white/60' : 'text-neutral-500')}>{store.tagline}</p>}
              </div>
            </button>
          </div>

          {/* Carrusel de Categorías con bordes difuminados suaves */}
          <div
            ref={chipsRef}
            className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto scroll-smooth px-2 py-1 max-w-xl mx-auto [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)]"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
          >
            {sections.map(({ category }) => {
              const isActive = activeCat === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  data-pill-id={category.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToCategory(category.id);
                  }}
                  className={cn(
                    'h-8 shrink-0 rounded-full px-3.5 text-[12px] sm:text-[12.5px] font-semibold backdrop-blur-md transition-all duration-300 active:scale-95',
                    isActive
                      ? store.button_style === 'accent'
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-md scale-[1.03]'
                        : isDark
                        ? 'bg-white text-neutral-950 shadow-md scale-[1.03]'
                        : 'bg-neutral-900 text-white shadow-md scale-[1.03]'
                      : isDark
                      ? 'border border-white/15 bg-black/45 text-white/90 backdrop-blur-md hover:bg-black/65'
                      : 'border border-black/10 bg-white/70 text-neutral-800 backdrop-blur-md hover:bg-white/90'
                  )}
                >
                  {category.name}
                </button>
              );
            })}
          </div>

          {/* Acciones de la derecha: Buscador, PWA, Toggle de modo PC, Carrito */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Buscador / Grilla */}
            <button
              type="button"
              onClick={() => setGridOpen(true)}
              className={cn(
                'grid h-9 w-9 place-items-center rounded-full backdrop-blur-md transition active:scale-90',
                isDark ? 'border border-white/15 bg-black/45 text-white hover:bg-black/65' : 'border border-black/10 bg-white/70 text-neutral-800 hover:bg-white/90'
              )}
              title="Buscar platos y ver catálogo"
              aria-label="Buscar"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Selector de modo (Catálogo vs Reels) visible y activo en Celular, PWA y PC */}
            <div className={cn(
              'flex items-center rounded-full p-0.5 border',
              isDark ? 'bg-white/10 border-white/15' : 'bg-black/5 border-black/10'
            )}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-[12px] font-medium transition active:scale-95',
                  viewMode === 'grid'
                    ? (isDark ? 'bg-white text-black shadow-sm font-semibold' : 'bg-neutral-900 text-white shadow-sm font-semibold')
                    : (isDark ? 'text-white/80 hover:text-white' : 'text-neutral-600 hover:text-neutral-900')
                )}
                title="Ver catálogo completo"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> <span className="hidden xs:inline sm:inline">Catálogo</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('reels')}
                className={cn(
                  'flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-[12px] font-medium transition active:scale-95',
                  viewMode === 'reels'
                    ? (isDark ? 'bg-white text-black shadow-sm font-semibold' : 'bg-neutral-900 text-white shadow-sm font-semibold')
                    : (isDark ? 'text-white/80 hover:text-white' : 'text-neutral-600 hover:text-neutral-900')
                )}
                title="Ver en formato Reels"
              >
                <Film className="h-3.5 w-3.5" /> <span className="hidden xs:inline sm:inline">Reels</span>
              </button>
            </div>

            {/* Botón PWA para instalar la app */}
            <PwaInstallButton variant="glass" label="App" className="inline-flex text-[11px] py-1 px-2.5" />

            {/* Carrito Flotante */}
            {actions.count > 0 && (
              <button
                type="button"
                onClick={actions.openCart}
                className="glass-btn relative bg-[var(--accent)] text-[var(--accent-fg)] border-none font-bold shadow-lg"
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
              className={cn(
                'grid h-9 w-9 place-items-center rounded-full backdrop-blur-md transition active:scale-95',
                isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-neutral-800 hover:bg-black/10'
              )}
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

      {/* A) MODO CATÁLOGO (Celular, PWA y PC) */}
      <div
        ref={desktopGridScrollerRef}
        className={cn(
          'h-full min-h-dvh overflow-y-auto overscroll-contain pt-24 pb-20 px-3 sm:px-4 md:px-6 transition-colors duration-200',
          isGridActive
            ? 'block'
            : 'hidden'
        )}
      >
        <div className="mx-auto max-w-7xl">
          {sections.map(({ category, products }) => (
            <section
              key={category.id}
              id={`cat-sec-${category.id}`}
              data-cat-section={category.id}
              className="mb-10 scroll-mt-24"
            >
              <div className={cn('flex items-center gap-3 border-b pb-3 mb-5', isDark ? 'border-white/10' : 'border-black/10')}>
                <h2 className={cn('text-xl font-bold tracking-tight', isDark ? 'text-white' : 'text-neutral-900')}>{category.name}</h2>
                <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-medium', isDark ? 'bg-white/10 text-white/60' : 'bg-black/5 text-neutral-600')}>
                  {products.length} platos
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {products.map((p) => (
                  <article
                    key={p.id}
                    className={cn(
                      'group relative flex flex-col justify-between overflow-hidden rounded-[22px] border transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1',
                      isDark
                        ? 'border-white/[0.08] bg-neutral-900/75 text-white shadow-[0_8px_30px_rgb(0,0,0,0.35)] hover:border-white/[0.15] backdrop-blur-xl'
                        : 'border-black/[0.06] bg-white/85 text-neutral-900 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_16px_40px_rgb(0,0,0,0.12)] backdrop-blur-xl'
                    )}
                  >
                    {/* 1. ZONA MULTIMEDIA CON DIFUMINADO Y ESQUINAS SEPARADAS */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-800/20">
                      {p.video_url ? (
                        <video
                          src={p.video_url}
                          poster={p.photo_url ?? undefined}
                          muted
                          loop
                          playsInline
                          onMouseEnter={(e) => e.currentTarget.play().catch(() => undefined)}
                          onMouseLeave={(e) => e.currentTarget.pause()}
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        />
                      ) : p.photo_url ? (
                        <Image
                          src={p.photo_url}
                          alt={p.name}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center"
                          style={{
                            background: 'radial-gradient(120% 90% at 30% 20%, var(--accent), #111 75%)',
                          }}
                        >
                          <span className="text-xs opacity-40">Sin imagen</span>
                        </div>
                      )}

                      {/* Degradado difuminado inferior para contraste y profundidad */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100" />

                      {/* Botón Favorito: Esquina SUPERIOR DERECHA */}
                      <button
                        type="button"
                        onClick={() => toggle(p.id)}
                        aria-label="Favorito"
                        className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/55 active:scale-95"
                      >
                        <Heart className={cn('h-4 w-4', liked.has(p.id) && 'fill-red-500 text-red-500')} />
                      </button>

                      {/* Insignia de Precio: Esquina INFERIOR IZQUIERDA con Glassmorphism */}
                      <div
                        className="absolute bottom-2.5 left-2.5 z-10 max-w-[85%] truncate rounded-full border border-white/25 px-2.5 py-1 text-xs font-bold tracking-tight text-[var(--accent-fg)] shadow-lg backdrop-blur-md transition-transform duration-300 group-hover:scale-105"
                        style={{
                          backgroundColor: 'var(--accent)',
                        }}
                      >
                        {formatPrice(p.price)}
                      </div>
                    </div>

                    {/* 2. CUERPO DE LA TARJETA */}
                    <div className="flex flex-1 flex-col justify-between p-3">
                      <div>
                        <h3 className="line-clamp-2 text-[13px] font-bold leading-snug tracking-tight sm:text-sm">
                          {p.name}
                        </h3>
                        {p.description && (
                          <p
                            className={cn(
                              'mt-1 line-clamp-2 text-[11px] leading-relaxed',
                              isDark ? 'text-neutral-400' : 'text-neutral-500'
                            )}
                          >
                            {p.description}
                          </p>
                        )}
                      </div>

                      {/* 3. ACCIONES COMPACTAS SIN SUPERPOSICIÓN */}
                      <div className="mt-3 flex items-center gap-1.5 pt-1">
                        {/* Botón Principal: En mesa (ocupa el ancho disponible sin cortar texto) */}
                        <button
                          type="button"
                          onClick={() => actions.orderAtTable(p)}
                          className={cn(
                            'flex h-8 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 text-[11px] font-semibold text-white shadow-sm transition-all duration-300 hover:brightness-110 active:scale-95',
                            store.button_style === 'accent'
                              ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                              : store.button_style === 'whatsapp'
                              ? 'bg-whatsapp text-white'
                              : isDark
                              ? 'bg-white text-black'
                              : 'bg-neutral-900 text-white'
                          )}
                          title="Pedir en mesa"
                        >
                          <HandPlatter className="h-3 w-3 shrink-0" />
                          <span>+ En mesa</span>
                          {actions.qtyOf(p.id) > 0 && (
                            <span className="ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-white/30 px-1 text-[10px] font-bold">
                              {actions.qtyOf(p.id)}
                            </span>
                          )}
                        </button>

                        {/* Botón WhatsApp: Botón con solo ícono (Evita que el texto 'WhatsApp' se corte) */}
                        <button
                          type="button"
                          onClick={() => actions.orderOneByWhatsApp(p)}
                          title="Pedir por WhatsApp"
                          aria-label="Pedir por WhatsApp"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-[#20bd5a] active:scale-95"
                        >
                          <WhatsAppIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

          <footer className={cn('mt-12 border-t pt-6 text-center text-[12px]', isDark ? 'border-white/10 text-white/50' : 'border-black/10 text-neutral-500')}>
            {DISCLAIMER} · Menú creado con <strong className={isDark ? 'text-white' : 'text-neutral-900'}>Carta App</strong>
          </footer>
        </div>
      </div>

      {/* B) MODO REELS (Celular 100% full-screen O Desktop centrado con ambient blur) */}
      <div
        className={cn(
          'h-full min-h-dvh w-full overflow-hidden',
          isGridActive
            ? 'hidden'
            : 'block'
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
              categoryId={slide.categoryId}
              product={slide.product}
              active={i === active}
              near={Math.abs(i - active) <= 1}
              liked={liked.has(slide.product.id)}
              qty={actions.qtyOf(slide.product.id)}
              onLike={() => toggle(slide.product.id)}
              onShare={() => share(slide.product)}
              actions={actions}
              buttonStyle={store.button_style}
            />
          ))}

          {/* Tarjeta final del feed */}
          <section
            data-index={slides.length}
            className="relative flex h-full min-h-dvh w-full snap-start snap-always flex-col items-center justify-center bg-neutral-950 px-8 text-center text-white overflow-hidden"
          >
            {store.cover_url && (
              <div className="absolute inset-0 z-0 overflow-hidden opacity-25 pointer-events-none">
                <Image
                  src={store.cover_url}
                  alt={store.name}
                  fill
                  sizes="100vw"
                  className="object-cover blur-sm scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-neutral-950" />
              </div>
            )}
            <div className="relative z-10 flex flex-col items-center">
              <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-2xl ring-2 ring-white/10">
                {store.logo_url ? (
                  <Image src={store.logo_url} alt={store.name} width={64} height={64} className="h-full w-full object-cover" />
                ) : (
                  <ClocheIcon className="h-8 w-8 text-white" />
                )}
              </span>
              <h2 className="mt-5 text-2xl font-bold tracking-tight">¡Llegaste al final!</h2>
              <p className="mt-2 text-[14px] text-white/60">Ya viste todos los platos de {store.name}.</p>
            </div>

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

        {/* Flechas de navegación prev/next (disponibles en Celular, PWA y PC con botones táctiles) */}
        <div className="fixed right-3 sm:right-6 md:right-8 bottom-28 sm:bottom-28 md:bottom-10 z-20 flex flex-col gap-2">
          <button
            type="button"
            disabled={active === 0}
            onClick={() => goTo(Math.max(0, active - 1))}
            className="grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/20 transition active:scale-90 hover:bg-black/70 disabled:opacity-20 disabled:pointer-events-none shadow-xl"
            title="Plato anterior (Flecha Arriba)"
            aria-label="Plato anterior"
          >
            <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            type="button"
            disabled={active >= slides.length}
            onClick={() => goTo(Math.min(slides.length, active + 1))}
            className="grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/20 transition active:scale-90 hover:bg-black/70 disabled:opacity-20 disabled:pointer-events-none shadow-xl"
            title="Siguiente plato (Flecha Abajo)"
            aria-label="Siguiente plato"
          >
            <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />
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
                            setViewMode('reels');
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
        {store.cover_url && (
          <div className="relative -mx-6 -mt-6 mb-4 h-32 overflow-hidden rounded-t-3xl bg-neutral-900">
            <Image
              src={store.cover_url}
              alt={store.name}
              fill
              sizes="500px"
              className="object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>
        )}
        <div className="flex items-center gap-3.5 pt-1">
          <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-md ring-2 ring-white">
            {store.logo_url ? (
              <Image src={store.logo_url} alt={store.name} width={56} height={56} className="h-full w-full object-cover" />
            ) : (
              <ClocheIcon className="h-7 w-7 text-white" />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight">{store.name}</h2>
            {store.tagline && <p className="text-[13.5px] text-muted">{store.tagline}</p>}
          </div>
        </div>

        {/* Botón PWA dentro del panel de información (oculto si ya está instalada / standalone) */}
        {!isStandalone && (
          <div className="mt-5 rounded-2xl bg-canvas p-4 border border-black/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-ink">Instalar Menú en tu Celular</p>
                <p className="text-[12px] text-muted">Accedé sin escribir la dirección ni abrir el navegador</p>
              </div>
              <PwaInstallButton variant="button" label="Descargar" className="shrink-0" />
            </div>
          </div>
        )}

        <h3 className="mt-5 text-[12px] font-bold uppercase tracking-wider text-subtle">Categorías del Menú</h3>
        <ul className="mt-2 divide-y divide-black/5">
          {sections.map(({ category, products }) => (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => {
                  setInfoOpen(false);
                  setTimeout(() => {
                    scrollToCategory(category.id);
                  }, 80);
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
  categoryId: string;
  product: Product;
  active: boolean;
  near: boolean;
  liked: boolean;
  qty: number;
  onLike: () => void;
  onShare: () => void;
  actions: MenuActions;
  buttonStyle?: ButtonStyle;
};

function FeedSlide({
  index,
  categoryId,
  product: p,
  active,
  near,
  liked,
  qty,
  onLike,
  onShare,
  actions,
  buttonStyle = 'accent',
}: SlideProps) {
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
      id={`feed-product-${p.id}`}
      data-index={index}
      data-category-id={categoryId}
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
      <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] text-white">
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
            className={cn(
              'btn relative h-11 text-[13px] font-bold shadow-lg transition',
              buttonStyle === 'accent'
                ? 'bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-105'
                : buttonStyle === 'whatsapp'
                ? 'bg-whatsapp text-white hover:brightness-95'
                : 'bg-white text-black hover:bg-white/90'
            )}
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
