'use client';

import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import { ClocheIcon } from '@/components/ClocheIcon';
import { PwaInstallButton } from '@/components/PwaInstallButton';
import { ProductCard } from './ProductCard';
import type { PublicStore } from '@/lib/types';
import { cn, formatPrice, normalizeText } from '@/lib/utils';
import type { MenuActions, MenuSection } from './PublicMenu';

type Props = {
  store: PublicStore;
  sections: MenuSection[];
  actions: MenuActions;
  preview: boolean;
};

/** Estilo clásico: lista con buscador y categorías adaptada para celular y PC */
export function ListView({ store, sections, actions, preview }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const idPrefix = preview ? 'pv-cat-' : 'cat-';

  const filtered = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return sections;
    return sections
      .map((s) => ({
        ...s,
        products: s.products.filter((p) => normalizeText(`${p.name} ${p.description ?? ''}`).includes(q)),
      }))
      .filter((s) => s.products.length > 0);
  }, [sections, query]);

  function scrollToCategory(id: string) {
    setActiveCat(id);
    const root = scrollerRef.current;
    const el = document.getElementById(idPrefix + id);
    if (!root || !el) return;
    const offset = (headerRef.current?.offsetHeight ?? 0) + 8;
    root.scrollTo({ top: el.offsetTop - offset, behavior: 'smooth' });
  }

  const initial = store.name.trim().charAt(0).toUpperCase() || 'L';
  const isDark = store.theme === 'light' ? false : (store.theme === 'dark' ? true : false);
  const bgColor = store.bg_color || (isDark ? '#0a0a0a' : '#ffffff');

  return (
    <>
      <div
        ref={scrollerRef}
        className={cn(
          'relative h-full min-h-dvh overflow-y-auto overscroll-contain transition-colors duration-200',
          isDark ? 'text-white' : 'text-neutral-900'
        )}
        style={{ backgroundColor: bgColor }}
      >
        {/* Banner de Portada / Imagen de fondo del local */}
        {store.cover_url && (
          <div className="relative h-24 sm:h-36 w-full overflow-hidden bg-neutral-950">
            <Image
              src={store.cover_url}
              alt={store.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 1200px"
              className="object-cover opacity-90 transition duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
            <div className="absolute bottom-3 left-4 right-4 mx-auto max-w-5xl flex items-end justify-between text-white">
              <span className="text-[11px] font-semibold tracking-wider uppercase opacity-75">
                Menú Oficial
              </span>
              <PwaInstallButton variant="glass" label="App" className="sm:hidden text-[11px] py-1 px-2.5" />
            </div>
          </div>
        )}

        <header
          ref={headerRef}
          className={cn(
            'sticky top-0 z-20 border-b backdrop-blur-xl transition-colors duration-200',
            isDark
              ? 'border-white/10 bg-neutral-900/90 text-white'
              : 'border-black/[0.06] bg-white/95 text-neutral-900'
          )}
        >
          <div className="mx-auto max-w-5xl px-4 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {store.logo_url ? (
                  <Image
                    src={store.logo_url}
                    alt={store.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-2 ring-white/20 shadow-md"
                  />
                ) : (
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white shadow-md ring-2 ring-white/10">
                    <ClocheIcon className="h-6 w-6 text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="truncate text-[20px] sm:text-[22px] font-bold leading-tight tracking-tight">{store.name}</h1>
                  <p className={cn('truncate text-[13px]', isDark ? 'text-white/60' : 'text-subtle')}>{store.tagline || 'Menú digital'}</p>
                </div>
              </div>

              <PwaInstallButton
                variant="button"
                label="Instalar App"
                className={cn(store.cover_url ? 'hidden sm:inline-flex' : 'inline-flex')}
              />
            </div>

            <div className="relative mt-3">
              <Search className={cn('pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2', isDark ? 'text-white/40' : 'text-subtle')} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar plato, bebida o ingrediente..."
                aria-label="Buscar en el menú"
                className={cn(
                  'h-10 w-full rounded-xl pl-10 pr-9 text-[15px] outline-none transition focus:ring-4',
                  isDark
                    ? 'bg-white/10 text-white placeholder:text-white/40 focus:ring-white/10'
                    : 'bg-canvas text-ink placeholder:text-subtle focus:ring-black/5'
                )}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Borrar búsqueda"
                  className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-black/10 text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {!query && filtered.length > 1 ? (
              <nav className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-3" aria-label="Categorías">
                {filtered.map(({ category }) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => scrollToCategory(category.id)}
                    className={cn(
                      'h-8 shrink-0 rounded-full px-3.5 text-[13.5px] font-medium transition active:scale-95',
                      activeCat === category.id
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm'
                        : isDark
                        ? 'bg-white/10 text-white/80 hover:bg-white/20'
                        : 'bg-canvas text-ink hover:bg-black/[0.07]'
                    )}
                  >
                    {category.name}
                  </button>
                ))}
              </nav>
            ) : (
              <div className="h-3" />
            )}
          </div>
        </header>

        <main className={cn('mx-auto max-w-5xl px-4 sm:px-6', actions.count > 0 ? 'pb-28' : 'pb-12')}>
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-semibold text-lg">{query ? 'No encontramos nada' : 'El menú está vacío'}</p>
              <p className={cn('mt-1 text-sm', isDark ? 'text-white/60' : 'text-muted')}>
                {query ? 'Probá con otra palabra.' : 'El comercio todavía no cargó productos.'}
              </p>
            </div>
          ) : (
            filtered.map(({ category, products }) => (
              <section key={category.id} id={idPrefix + category.id} className="pt-8">
                <div className={cn('pb-3 mb-3 border-b', isDark ? 'border-white/10' : 'border-black/[0.06]')}>
                  <div className="flex items-center gap-2">
                    <h2 className={cn('text-[14px] font-bold uppercase tracking-wider', isDark ? 'text-white/70' : 'text-subtle')}>{category.name}</h2>
                    <span className={cn('text-[12px]', isDark ? 'text-white/50' : 'text-muted')}>({products.length})</span>
                  </div>
                  {category.subtitle && (
                    <p className={cn('mt-1 text-[13px] italic', isDark ? 'text-white/60' : 'text-muted')}>
                      {category.subtitle}
                    </p>
                  )}
                </div>
                {/* Cuadrícula responsiva: 2 columnas en modo grid, o adaptativa en lista clásica */}
                <div
                  className={cn(
                    'grid gap-3.5',
                    store.layout === 'grid'
                      ? 'grid-cols-2 gap-2.5 sm:gap-3.5'
                      : preview
                      ? 'grid-cols-1'
                      : 'grid-cols-1 md:grid-cols-2'
                  )}
                >
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        'rounded-2xl border p-3.5 sm:p-4 shadow-xs hover:shadow-md transition',
                        isDark
                          ? 'border-white/10 bg-neutral-900/80 text-white'
                          : 'border-black/[0.06] bg-white text-neutral-900'
                      )}
                    >
                      <ProductCard
                        product={p}
                        qty={actions.qtyOf(p.id)}
                        onOrderAtTable={actions.orderAtTable}
                        onOrderWhatsApp={actions.orderOneByWhatsApp}
                        buttonStyle={store.button_style}
                        isDark={isDark}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}

          <footer className={cn(
            'mt-12 border-t pt-6 text-center text-[12px] leading-relaxed',
            isDark ? 'border-white/10 text-white/40' : 'border-black/[0.06] text-subtle'
          )}>
            Precios sujetos a modificación por el comercio. No procesamos pagos.
            <br />
            <span className="font-medium text-black/50">Menú creado con Carta App</span>
          </footer>
        </main>
      </div>

      {/* Barra de Pedido Flotante */}
      {actions.count > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-safe flex justify-center">
          <button
            type="button"
            onClick={actions.openCart}
            className="pointer-events-auto flex h-14 w-full max-w-md items-center justify-between rounded-2xl bg-ink px-4 text-white shadow-2xl shadow-black/20 transition active:scale-[0.98] animate-slide-up"
          >
            <span className="flex items-center gap-3">
              <span
                key={actions.count}
                className="grid h-7 min-w-7 place-items-center rounded-full bg-[var(--accent)] px-1.5 text-sm font-bold tabular-nums text-[var(--accent-fg)] animate-pop"
              >
                {actions.count}
              </span>
              <span className="text-[15px] font-medium">Ver mi pedido</span>
            </span>
            <span className="flex items-center gap-1 text-[15px] font-semibold tabular-nums">
              {formatPrice(actions.total)} <ChevronRight className="h-4 w-4 opacity-60" />
            </span>
          </button>
        </div>
      )}
    </>
  );
}
