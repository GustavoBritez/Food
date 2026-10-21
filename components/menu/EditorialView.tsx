'use client';

import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Flame,
  HandPlatter,
  Leaf,
  Plus,
  Search,
  Sparkles,
  Star,
  Wheat,
  X,
} from 'lucide-react';
import { ClocheIcon } from '@/components/ClocheIcon';
import { PwaInstallButton } from '@/components/PwaInstallButton';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import type { FontPair, Product, ProductBadge, PublicStore } from '@/lib/types';
import { cn, formatPrice, normalizeText } from '@/lib/utils';
import type { MenuActions, MenuSection } from './PublicMenu';

type Props = {
  store: PublicStore;
  sections: MenuSection[];
  actions: MenuActions;
  preview: boolean;
};

const FONT_TITLE_MAP: Record<FontPair, string> = {
  modern: 'font-sans font-bold tracking-tight',
  serif: 'font-serif tracking-normal font-semibold',
  script: 'font-script text-2xl sm:text-3xl font-bold tracking-wide',
  mono: 'font-mono uppercase tracking-widest font-semibold',
};

const FONT_BODY_MAP: Record<FontPair, string> = {
  modern: 'font-sans',
  serif: 'font-serif',
  script: 'font-sans',
  mono: 'font-mono',
};

const BADGE_CONFIG: Record<ProductBadge, { label: string; icon: React.ReactNode; color: string }> = {
  vegano: {
    label: 'Vegano',
    icon: <Leaf className="h-3 w-3" />,
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  },
  vegetariano: {
    label: 'Vegetariano',
    icon: <Leaf className="h-3 w-3" />,
    color: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
  },
  sin_tacc: {
    label: 'Sin TACC',
    icon: <Wheat className="h-3 w-3" />,
    color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  },
  picante: {
    label: 'Picante',
    icon: <Flame className="h-3 w-3" />,
    color: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  },
  destacado: {
    label: 'Recomendado',
    icon: <Star className="h-3 w-3 fill-current" />,
    color: 'bg-amber-400/15 text-amber-800 dark:text-amber-200 border-amber-400/30',
  },
};

export function EditorialView({ store, sections, actions, preview }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const themeConfig = store.theme_config ?? {};
  const fontPair = (themeConfig.fontPair || 'modern') as FontPair;
  const bgPattern = themeConfig.bgPattern || 'none';
  const priceFormat = themeConfig.priceFormat || 'badge';
  const showNetPrice = Boolean(themeConfig.showNetPrice);
  const showWatermark = Boolean(themeConfig.showWatermark);

  const isDark = store.theme === 'dark';
  const idPrefix = preview ? 'pv-cat-' : 'cat-';

  const filtered = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return sections;
    return sections
      .map((s) => ({
        ...s,
        products: s.products.filter((p) =>
          normalizeText(`${p.name} ${p.description ?? ''} ${(p.badges ?? []).join(' ')}`).includes(q)
        ),
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

  // Patrones de fondo SVG optimizados
  const patternBgClass = useMemo(() => {
    if (bgPattern === 'waves') {
      return 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]';
    }
    if (bgPattern === 'paper') {
      return 'bg-gradient-to-b from-[#fbf8f2] to-[#f4eee2]';
    }
    if (bgPattern === 'dots') {
      return '';
    }
    return '';
  }, [bgPattern]);

  return (
    <>
      <div
        ref={scrollerRef}
        className={cn(
          'relative h-full min-h-dvh overflow-y-auto overscroll-contain transition-colors duration-200',
          patternBgClass,
          FONT_BODY_MAP[fontPair],
          isDark ? 'text-white' : 'text-neutral-900'
        )}
      >
        {/* Textura SVG de fondo: Ondas japonesas (Seigaiha) */}
        {bgPattern === 'waves' && (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.04]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v40h-2V20.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20z' fill='%239C92AC' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            }}
          />
        )}

        {/* Textura SVG de fondo: Papel / Granulado sutil */}
        {bgPattern === 'paper' && (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />
        )}

        {/* Textura SVG de fondo: Puntos finos */}
        {bgPattern === 'dots' && (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
            style={{
              backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
              backgroundSize: '16px 16px',
            }}
          />
        )}

        {/* Portada Editorial */}
        {store.cover_url && (
          <div className="relative h-44 sm:h-64 w-full overflow-hidden bg-neutral-950">
            <Image
              src={store.cover_url}
              alt={store.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 1200px"
              className="object-cover opacity-90 transition duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
            <div className="absolute bottom-3 left-4 right-4 mx-auto max-w-4xl flex items-end justify-between text-white">
              <span className="text-[11px] font-semibold tracking-widest uppercase opacity-85">
                Carta de Autor · Edición Especial
              </span>
              <PwaInstallButton variant="glass" label="App" className="sm:hidden text-[11px] py-1 px-2.5" />
            </div>
          </div>
        )}

        {/* Encabezado Editorial con Estilo Distintivo */}
        <header
          ref={headerRef}
          className={cn(
            'sticky top-0 z-20 border-b backdrop-blur-xl transition-colors duration-200',
            isDark
              ? 'border-white/10 bg-neutral-950/85 text-white'
              : 'border-black/[0.08] bg-white/90 text-neutral-900'
          )}
        >
          <div className="mx-auto max-w-4xl px-4 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                {store.logo_url ? (
                  <Image
                    src={store.logo_url}
                    alt={store.name}
                    width={52}
                    height={52}
                    className="h-13 w-13 shrink-0 rounded-2xl object-cover ring-2 ring-white/20 shadow-md"
                  />
                ) : (
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white shadow-md ring-2 ring-white/10">
                    <ClocheIcon className="h-6 w-6 text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className={cn('truncate text-[22px] sm:text-[26px] leading-tight', FONT_TITLE_MAP[fontPair])}>
                    {store.name}
                  </h1>
                  <p className={cn('truncate text-[13px] tracking-wide', isDark ? 'text-white/60' : 'text-neutral-600')}>
                    {store.tagline || 'Carta de gastronomía y coctelería'}
                  </p>
                </div>
              </div>

              <PwaInstallButton variant="button" label="Descargar App" className="hidden sm:inline-flex" />
            </div>

            {/* Buscador */}
            <div className="relative mt-3.5">
              <Search
                className={cn(
                  'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2',
                  isDark ? 'text-white/40' : 'text-neutral-400'
                )}
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar plato, vino, ingrediente o etiqueta..."
                aria-label="Buscar en la carta"
                className={cn(
                  'h-10 w-full rounded-xl pl-10 pr-9 text-[14.5px] outline-none transition focus:ring-4',
                  isDark
                    ? 'bg-white/10 text-white placeholder:text-white/40 focus:ring-white/10'
                    : 'bg-black/[0.04] text-neutral-900 placeholder:text-neutral-500 focus:ring-black/5'
                )}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Borrar búsqueda"
                  className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-black/10 text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Categorías deslizables */}
            {!query && filtered.length > 1 ? (
              <nav className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-3" aria-label="Categorías">
                {filtered.map(({ category }) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => scrollToCategory(category.id)}
                    className={cn(
                      'h-8.5 shrink-0 rounded-full px-4 text-[13.5px] font-medium transition active:scale-95',
                      activeCat === category.id
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm'
                        : isDark
                        ? 'bg-white/10 text-white/80 hover:bg-white/20'
                        : 'bg-black/[0.05] text-neutral-800 hover:bg-black/[0.08]'
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

        {/* Contenido Editorial Principal */}
        <main className={cn('mx-auto max-w-4xl px-4 sm:px-6 relative z-10', actions.count > 0 ? 'pb-28' : 'pb-16')}>
          {filtered.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-semibold text-lg">{query ? 'No encontramos sugerencias' : 'Carta vacía'}</p>
              <p className={cn('mt-1 text-sm', isDark ? 'text-white/60' : 'text-neutral-500')}>
                {query ? 'Probá buscando con otro ingrediente o plato.' : 'El restaurante cargará su menú en breve.'}
              </p>
            </div>
          ) : (
            filtered.map(({ category, products }) => (
              <section key={category.id} id={idPrefix + category.id} className="pt-10">
                {/* Cabecera de Categoría Editorial */}
                <div className="text-center pb-5 mb-6 border-b border-current/10">
                  <div className="inline-flex items-center justify-center gap-2 mb-1">
                    <span className="h-px w-6 sm:w-12 bg-current opacity-25" />
                    <h2
                      className={cn(
                        'text-xl sm:text-2xl font-bold tracking-tight px-2',
                        FONT_TITLE_MAP[fontPair]
                      )}
                    >
                      {category.name}
                    </h2>
                    <span className="h-px w-6 sm:w-12 bg-current opacity-25" />
                  </div>

                  {/* Subtítulo u horario opcional de la sección */}
                  {category.subtitle && (
                    <p
                      className={cn(
                        'mt-1 max-w-lg mx-auto text-[13px] sm:text-[14px] italic leading-relaxed opacity-75',
                        isDark ? 'text-neutral-300' : 'text-neutral-700'
                      )}
                    >
                      {category.subtitle}
                    </p>
                  )}
                </div>

                {/* Lista de Platos Editorial */}
                <div className="divide-y divide-current/10 space-y-6">
                  {products.map((p) => {
                    const qty = actions.qtyOf(p.id);
                    const netPrice = showNetPrice ? Math.round(p.price / 1.21) : null;
                    const badges = p.badges ?? [];

                    return (
                      <article key={p.id} className="pt-6 first:pt-0 group">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          {/* Columna Izquierda: Título, badges, descripción y desglose */}
                          <div className="min-w-0 flex-1">
                            {/* Fila del Título y Precio con Dotted Leader si corresponde */}
                            <div className="flex items-baseline justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3
                                  className={cn(
                                    'text-[17px] sm:text-[18px] font-semibold leading-snug',
                                    isDark ? 'text-white' : 'text-neutral-950'
                                  )}
                                >
                                  {p.name}
                                </h3>

                                {/* Badges gastronómicos */}
                                {badges.map((badge) => {
                                  const conf = BADGE_CONFIG[badge];
                                  if (!conf) return null;
                                  return (
                                    <span
                                      key={badge}
                                      className={cn(
                                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium tracking-wide',
                                        conf.color
                                      )}
                                    >
                                      {conf.icon}
                                      <span>{conf.label}</span>
                                    </span>
                                  );
                                })}
                              </div>

                              {/* Formato Dotted Line (inline-dot) */}
                              {priceFormat === 'inline-dot' ? (
                                <div className="flex items-baseline gap-2 shrink-0">
                                  <span className="hidden sm:inline border-b border-dotted border-current opacity-30 w-16" />
                                  <span className="text-[17px] font-bold tabular-nums text-[var(--accent)]">
                                    • {formatPrice(p.price)}
                                  </span>
                                </div>
                              ) : priceFormat === 'minimal' ? (
                                <span className="text-[17px] font-semibold tabular-nums shrink-0 opacity-90">
                                  {formatPrice(p.price)}
                                </span>
                              ) : (
                                <span className="inline-flex shrink-0 items-center rounded-full bg-[var(--accent)]/15 px-2.5 py-0.5 text-[15px] font-bold tabular-nums text-[var(--accent)]">
                                  {formatPrice(p.price)}
                                </span>
                              )}
                            </div>

                            {/* Descripción del plato */}
                            {p.description && (
                              <p
                                className={cn(
                                  'mt-1.5 text-[13.5px] sm:text-[14px] leading-relaxed break-words',
                                  isDark ? 'text-neutral-300' : 'text-neutral-600'
                                )}
                              >
                                {p.description}
                              </p>
                            )}

                            {/* Desglose de impuesto / IVA si showNetPrice está activado */}
                            {showNetPrice && netPrice !== null && (
                              <p className="mt-1 text-[11px] font-mono tracking-wide opacity-65">
                                Base imponible sin IVA (21%): {formatPrice(netPrice)}
                              </p>
                            )}

                            {/* Botones de acción directos */}
                            <div className="mt-3.5 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => actions.orderAtTable(p)}
                                className={cn(
                                  'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition active:scale-95 shadow-xs',
                                  store.button_style === 'accent'
                                    ? 'bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-105'
                                    : store.button_style === 'whatsapp'
                                    ? 'bg-whatsapp text-white hover:brightness-95'
                                    : isDark
                                    ? 'bg-white text-black hover:bg-neutral-200'
                                    : 'bg-neutral-900 text-white hover:bg-black'
                                )}
                                title="Agregar al pedido de la mesa"
                              >
                                <HandPlatter className="h-3.5 w-3.5 shrink-0" />
                                <span>+ En mesa</span>
                                {qty > 0 && (
                                  <span className="ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-white/30 px-1 text-[10px] font-bold">
                                    {qty}
                                  </span>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => actions.orderOneByWhatsApp(p)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366] text-white transition hover:brightness-95 active:scale-95 shadow-xs"
                                title="Pedir por WhatsApp"
                                aria-label="Pedir por WhatsApp"
                              >
                                <WhatsAppIcon className="h-4 w-4 shrink-0" />
                              </button>
                            </div>
                          </div>

                          {/* Foto opcional del plato */}
                          {p.photo_url && (
                            <div
                              className={cn(
                                'relative mt-3 sm:mt-0 h-24 w-full sm:h-24 sm:w-28 shrink-0 overflow-hidden rounded-2xl shadow-xs border',
                                isDark
                                  ? 'bg-neutral-800 border-white/10'
                                  : 'bg-black/[0.04] border-black/[0.08]'
                              )}
                            >
                              <Image
                                src={p.photo_url}
                                alt={p.name}
                                fill
                                sizes="(max-width: 640px) 100vw, 112px"
                                className="object-cover transition duration-300 group-hover:scale-105"
                              />
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Sello / Marca de agua de autor al pie de cada categoría */}
                {showWatermark && (
                  <div className="mt-8 pt-4 flex items-center justify-center gap-2 text-center opacity-40">
                    <span className="h-px w-10 bg-current" />
                    <span className="text-[10px] font-mono tracking-widest uppercase flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Selección de Autor · {store.name}
                    </span>
                    <span className="h-px w-10 bg-current" />
                  </div>
                )}
              </section>
            ))
          )}

          {/* Sello de Calidad / Pie de Página Editorial */}
          <footer
            className={cn(
              'mt-16 border-t border-current/15 pt-8 text-center text-[12px] leading-relaxed',
              isDark ? 'text-neutral-400' : 'text-neutral-600'
            )}
          >
            {showNetPrice && (
              <p className="mb-3 text-[11px] font-mono opacity-80">
                * Precios en Pesos Argentinos con IVA incluido. Se informa el desglose neto conforme a regulaciones vigentes.
              </p>
            )}
            <p>Precios sujetos a modificación por el establecimiento. No procesamos pagos en línea.</p>
            <p className="mt-1 font-medium opacity-75">Carta digital diseñada con Carta App Editorial</p>
          </footer>
        </main>
      </div>

      {/* Barra de Pedido Flotante */}
      {actions.count > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-safe flex justify-center">
          <button
            type="button"
            onClick={actions.openCart}
            className="pointer-events-auto flex h-14 w-full max-w-md items-center justify-between rounded-2xl bg-neutral-900 px-4 text-white shadow-2xl shadow-black/30 ring-1 ring-white/10 transition active:scale-[0.98] animate-slide-up"
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
