'use client';

import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
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

/** Estilo clásico: lista con buscador y categorías */
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

  const initial = store.name.trim().charAt(0).toUpperCase() || 'M';

  return (
    <>
      <div ref={scrollerRef} className="relative h-full overflow-y-auto overscroll-contain">
        <header ref={headerRef} className="sticky top-0 z-20 border-b border-black/[0.06] bg-white/90 backdrop-blur-xl">
          <div className="px-4 pt-4">
            <div className="flex items-center gap-3">
              {store.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt={store.name}
                  width={44}
                  height={44}
                  className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-black/5"
                />
              ) : (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-lg font-semibold text-[var(--accent-fg)]">
                  {initial}
                </span>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-[22px] font-semibold leading-tight tracking-tight">{store.name}</h1>
                <p className="truncate text-[13px] text-subtle">{store.tagline || 'Menú digital'}</p>
              </div>
            </div>

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en el menú"
                aria-label="Buscar en el menú"
                className="h-10 w-full rounded-xl bg-canvas pl-10 pr-9 text-[15px] outline-none placeholder:text-subtle focus:ring-4 focus:ring-black/5"
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
                      'h-8 shrink-0 rounded-full px-3.5 text-[13.5px] font-medium transition',
                      activeCat === category.id
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
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

        <main className={cn('px-4', actions.count > 0 ? 'pb-28' : 'pb-8')}>
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-medium">{query ? 'No encontramos nada' : 'El menú está vacío'}</p>
              <p className="mt-1 text-sm text-muted">
                {query ? 'Probá con otra palabra.' : 'El comercio todavía no cargó productos.'}
              </p>
            </div>
          ) : (
            filtered.map(({ category, products }) => (
              <section key={category.id} id={idPrefix + category.id} className="pt-6">
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-subtle">{category.name}</h2>
                <div className="divide-y divide-black/[0.06]">
                  {products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      qty={actions.qtyOf(p.id)}
                      onOrderAtTable={actions.orderAtTable}
                      onOrderWhatsApp={actions.orderOneByWhatsApp}
                    />
                  ))}
                </div>
              </section>
            ))
          )}

          <footer className="mt-10 border-t border-black/[0.06] pt-6 text-center text-[12px] leading-relaxed text-subtle">
            Precios sujetos a modificación por el comercio. No procesamos pagos.
            <br />
            <span className="text-black/30">Menú creado con MenuQR</span>
          </footer>
        </main>
      </div>

      {actions.count > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-4 pb-safe">
          <button
            type="button"
            onClick={actions.openCart}
            className="pointer-events-auto flex h-14 w-full items-center justify-between rounded-2xl bg-ink px-4 text-white shadow-2xl shadow-black/20 transition active:scale-[0.98] animate-slide-up"
          >
            <span className="flex items-center gap-3">
              <span
                key={actions.count}
                className="grid h-7 min-w-7 place-items-center rounded-full bg-[var(--accent)] px-1.5 text-sm font-semibold tabular-nums text-[var(--accent-fg)] animate-pop"
              >
                {actions.count}
              </span>
              <span className="text-[15px] font-medium">Ver pedido</span>
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
