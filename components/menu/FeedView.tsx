'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronUp,
  HandPlatter,
  Heart,
  LayoutGrid,
  Menu,
  RotateCcw,
  Search,
  Share2,
  ShoppingBag,
  X,
} from 'lucide-react';
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

/** "Me gusta" locales (solo en este dispositivo) */
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
            localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
          } catch {
            /* sin storage */
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [gridOpen, setGridOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const { liked, toggle } = useLikes(preview ? null : `menuqr:likes:${store.slug}`);

  const slides = useMemo<Slide[]>(
    () => sections.flatMap((s) => s.products.map((product) => ({ product, categoryId: s.category.id }))),
    [sections]
  );
  const firstIndexByCat = useMemo(() => {
    const map = new Map<string, number>();
    slides.forEach((s, i) => {
      if (!map.has(s.categoryId)) map.set(s.categoryId, i);
    });
    return map;
  }, [slides]);
  const indexById = useMemo(() => new Map(slides.map((s, i) => [s.product.id, i])), [slides]);

  const totalSlides = slides.length + 1; // + tarjeta final
  const activeCat = slides[Math.min(active, slides.length - 1)]?.categoryId ?? null;

  // Detecta qué plato está en pantalla
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root, threshold: 0.6 }
    );
    root.querySelectorAll('[data-index]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [slides.length]);

  // Mantiene centrada la categoría activa en la barra superior
  useEffect(() => {
    const bar = chipsRef.current;
    if (!bar || !activeCat) return;
    const chip = bar.querySelector<HTMLElement>(`[data-cat="${activeCat}"]`);
    if (chip) bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
  }, [activeCat]);

  const goTo = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const root = scrollerRef.current;
    if (root) root.scrollTo({ top: index * root.clientHeight, behavior });
  }, []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(''), 1800);
  }, []);

  async function share(p: Product) {
    const url = `${window.location.origin}/p/${store.slug}`;
    const data = { title: store.name, text: `Mirá "${p.name}" en ${store.name}`, url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast('Link copiado');
    } catch {
      /* el usuario canceló */
    }
  }

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

  const initial = store.name.trim().charAt(0).toUpperCase() || 'M';

  if (slides.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center text-white">
        <p className="text-xl font-semibold">{store.name}</p>
        <p className="mt-2 text-sm text-white/60">El comercio todavía no cargó productos.</p>
        <p className="absolute inset-x-0 bottom-4 px-6 text-center text-[11px] text-white/40">{DISCLAIMER}</p>
      </div>
    );
  }

  return (
    <>
      {/* Barra superior flotante */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/70 via-black/30 to-transparent pb-8">
        <div ref={chipsRef} className="no-scrollbar pointer-events-auto relative flex gap-2 overflow-x-auto px-3 pt-3">
          {sections.map(({ category }) => (
            <button
              key={category.id}
              type="button"
              data-cat={category.id}
              onClick={() => goTo(firstIndexByCat.get(category.id) ?? 0)}
              className={cn(
                'h-8 shrink-0 rounded-full px-3.5 text-[13px] font-semibold backdrop-blur-md transition',
                activeCat === category.id ? 'bg-white text-black' : 'bg-black/30 text-white ring-1 ring-white/15 hover:bg-black/45'
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="pointer-events-auto mt-3 flex items-center justify-between gap-3 px-3">
          <button type="button" onClick={() => setGridOpen(true)} className="glass-btn" aria-label="Ver todo en grilla">
            <LayoutGrid className="h-5 w-5" />
          </button>
          <p className="min-w-0 truncate text-center text-[13px] font-semibold text-white/90 drop-shadow">{store.name}</p>
          <div className="flex items-center gap-2">
            {actions.count > 0 && (
              <button type="button" onClick={actions.openCart} className="glass-btn relative" aria-label="Ver mi pedido">
                <ShoppingBag className="h-5 w-5" />
                <span
                  key={actions.count}
                  className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-bold text-[var(--accent-fg)] animate-pop"
                >
                  {actions.count}
                </span>
              </button>
            )}
            <button type="button" onClick={() => setInfoOpen(true)} className="glass-btn" aria-label="Información del local">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Feed deslizable */}
      <div ref={scrollerRef} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain">
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

        {/* Tarjeta final */}
        <section
          data-index={slides.length}
          className="relative flex h-full w-full snap-start snap-always flex-col items-center justify-center bg-neutral-950 px-8 text-center text-white"
        >
          <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-[var(--accent)] text-2xl font-bold text-[var(--accent-fg)]">
            {store.logo_url ? (
              <Image src={store.logo_url} alt={store.name} width={64} height={64} className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </span>
          <h2 className="mt-5 text-2xl font-bold tracking-tight">¡Eso es todo!</h2>
          <p className="mt-2 text-[15px] text-white/60">Ya viste todo el menú de {store.name}.</p>
          <div className="mt-8 grid w-full max-w-xs gap-2.5">
            {actions.count > 0 && (
              <button type="button" onClick={actions.openCart} className="btn h-12 bg-[var(--accent)] text-[15px] text-[var(--accent-fg)]">
                <ShoppingBag className="h-4 w-4" /> Ver mi pedido
              </button>
            )}
            <button type="button" onClick={() => setGridOpen(true)} className="btn h-12 bg-white/10 text-[15px] text-white hover:bg-white/15">
              <LayoutGrid className="h-4 w-4" /> Ver todo en grilla
            </button>
            <button type="button" onClick={() => goTo(0)} className="btn h-11 text-[14px] text-white/70 hover:text-white">
              <RotateCcw className="h-4 w-4" /> Volver al inicio
            </button>
          </div>
          <p className="absolute inset-x-0 bottom-5 px-6 text-[11px] leading-relaxed text-white/40">
            {DISCLAIMER}
            <br />
            Menú creado con MenuQR
          </p>
        </section>
      </div>

      {/* Progreso */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[3px] bg-white/10">
        <div
          className="h-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${((active + 1) / totalSlides) * 100}%` }}
        />
      </div>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none absolute inset-x-0 top-28 z-40 flex justify-center animate-fade-in">
          <span className="rounded-full bg-black/80 px-4 py-2 text-[13px] font-medium text-white backdrop-blur">{toast}</span>
        </div>
      )}

      {/* Vista en grilla */}
      {gridOpen && (
        <div className="absolute inset-0 z-30 flex flex-col bg-black animate-fade-in">
          <div className="flex items-center gap-2 px-3 pb-3 pt-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en el menú"
                aria-label="Buscar en el menú"
                className="h-10 w-full rounded-xl bg-white/10 pl-9 pr-3 text-[15px] text-white outline-none placeholder:text-white/40 focus:bg-white/15"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setGridOpen(false);
                setQuery('');
              }}
              className="glass-btn"
              aria-label="Cerrar grilla"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto">
            {gridSections.length === 0 ? (
              <p className="py-16 text-center text-sm text-white/50">No encontramos nada con “{query}”.</p>
            ) : (
              gridSections.map(({ category, products }) => (
                <section key={category.id} className="mb-4">
                  <h3 className="px-3 pb-2 text-[12px] font-semibold uppercase tracking-wider text-white/50">{category.name}</h3>
                  <div className="grid grid-cols-3 gap-0.5">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const idx = indexById.get(p.id) ?? 0;
                          setGridOpen(false);
                          setQuery('');
                          requestAnimationFrame(() => goTo(idx, 'auto'));
                        }}
                        className="relative aspect-[3/4] overflow-hidden bg-neutral-800 text-left transition active:opacity-80"
                      >
                        {p.photo_url ? (
                          <Image src={p.photo_url} alt={p.name} fill sizes="(max-width: 480px) 33vw, 160px" className="object-cover" />
                        ) : (
                          <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 30% 20%, var(--accent), #111 75%)' }} />
                        )}
                        <span className="absolute inset-x-1 bottom-1 truncate rounded-md bg-black/60 px-1.5 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur-sm">
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))
            )}
            <p className="px-6 pb-6 pt-2 text-center text-[11px] text-white/40">{DISCLAIMER}</p>
          </div>
        </div>
      )}

      {/* Info del local */}
      <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} contained forceMobile>
        <div className="flex items-center gap-3 pt-2">
          <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[var(--accent)] text-xl font-bold text-[var(--accent-fg)]">
            {store.logo_url ? (
              <Image src={store.logo_url} alt={store.name} width={56} height={56} className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold tracking-tight">{store.name}</h2>
            {store.tagline && <p className="text-[14px] text-muted">{store.tagline}</p>}
          </div>
        </div>

        <p className="mt-6 text-[12px] font-semibold uppercase tracking-wider text-subtle">Categorías</p>
        <ul className="mt-2 divide-y divide-black/[0.06]">
          {sections.map(({ category, products }) => (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => {
                  setInfoOpen(false);
                  goTo(firstIndexByCat.get(category.id) ?? 0, 'auto');
                }}
                className="flex w-full items-center justify-between py-3 text-left text-[15px] font-medium"
              >
                {category.name}
                <span className="text-[13px] font-normal text-subtle">{products.length}</span>
              </button>
            </li>
          ))}
        </ul>

        <a
          href={whatsappUrl(store.whatsapp, `Hola ${store.name}!`)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-whatsapp mt-5 h-12 w-full"
        >
          <WhatsAppIcon /> Escribirle al local
        </a>
        <p className="mt-4 text-center text-[12px] text-subtle">{DISCLAIMER}</p>
      </Sheet>
    </>
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

  // El video solo se reproduce cuando el plato está en pantalla
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) video.play().catch(() => undefined);
    else video.pause();
  }, [active]);

  return (
    <section
      data-index={index}
      className="relative h-full w-full snap-start snap-always overflow-hidden bg-neutral-900"
    >
      {p.video_url ? (
        <video
          ref={videoRef}
          src={p.video_url}
          poster={p.photo_url ?? undefined}
          muted
          loop
          playsInline
          preload={near ? 'auto' : 'none'}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : p.photo_url ? (
        <Image
          src={p.photo_url}
          alt={p.name}
          fill
          priority={index === 0}
          sizes="(max-width: 480px) 100vw, 480px"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 30% 25%, var(--accent), #0a0a0a 70%)' }} />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/20" />

      {/* Acciones laterales */}
      <div className="absolute bottom-52 right-3 z-10 flex flex-col items-center gap-5 text-white">
        <button type="button" onClick={onLike} aria-label={liked ? 'Quitar me gusta' : 'Me gusta'} className="transition active:scale-90">
          <Heart className={cn('h-7 w-7 drop-shadow-lg', liked && 'fill-red-500 text-red-500')} />
        </button>
        <button type="button" onClick={onShare} aria-label="Compartir" className="transition active:scale-90">
          <Share2 className="h-6 w-6 drop-shadow-lg" />
        </button>
      </div>

      {/* Info del plato */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-6 text-white">
        {index === 0 && (
          <p className="mb-3 flex items-center gap-1 text-[12px] font-medium text-white/70">
            <ChevronUp className="h-4 w-4 animate-bounce" /> Deslizá para ver más platos
          </p>
        )}
        <span className="inline-flex h-8 items-center rounded-full bg-[var(--accent)] px-3.5 text-[15px] font-bold tabular-nums text-[var(--accent-fg)] shadow-lg">
          {formatPrice(p.price)}
        </span>
        <h2 className="mt-2.5 pr-12 text-[26px] font-bold leading-tight tracking-tight drop-shadow">{p.name}</h2>
        {p.description && (
          <p className="mt-1.5 line-clamp-3 pr-12 text-[15px] leading-snug text-white/85">{p.description}</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => actions.orderAtTable(p)}
            className="btn relative h-11 bg-white text-[13.5px] text-black hover:bg-white/90"
          >
            <HandPlatter className="h-4 w-4" /> Pedir en mesa
            {qty > 0 && (
              <span
                key={qty}
                className="absolute -right-1 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-bold text-[var(--accent-fg)] shadow animate-pop"
              >
                {qty}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => actions.orderOneByWhatsApp(p)}
            className="btn h-11 bg-whatsapp text-[13.5px] text-white hover:brightness-95"
          >
            <WhatsAppIcon /> Pedir por WhatsApp
          </button>
        </div>
      </div>
    </section>
  );
}
