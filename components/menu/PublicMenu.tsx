'use client';

import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { HandPlatter, Minus, Plus, Trash2 } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { FeedView } from './FeedView';
import { ListView } from './ListView';
import { useCart } from './useCart';
import type { Category, Product, PublicStore } from '@/lib/types';
import { buildOrderMessage, orderCount, orderTotal, whatsappUrl, type OrderLine } from '@/lib/order';
import { cn, DEFAULT_ACCENT, formatPrice, HEX_REGEX, readableTextColor } from '@/lib/utils';

export type MenuSection = { category: Category; products: Product[] };

/** Acciones de pedido compartidas por las vistas */
export type MenuActions = {
  qtyOf: (id: string) => number;
  orderAtTable: (p: Product) => void;
  orderOneByWhatsApp: (p: Product) => void;
  openCart: () => void;
  count: number;
  total: number;
};

type Props = {
  store: PublicStore;
  categories: Category[];
  products: Product[];
  /** Vista previa del panel: carrito en memoria y contenido en marco de celular */
  preview?: boolean;
};

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function PublicMenu({ store, categories, products, preview = false }: Props) {
  const { items, add, clear } = useCart(preview ? null : `cartaapp:cart:${store.slug}`);
  const [waiterOpen, setWaiterOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const accent = HEX_REGEX.test(store.accent_color ?? '') ? store.accent_color : DEFAULT_ACCENT;
  const layout = store.layout === 'list' ? 'list' : 'feed';

  const isDark =
    store.theme === 'light'
      ? false
      : store.theme === 'dark'
      ? true
      : layout !== 'list';

  const customBg = store.bg_color && HEX_REGEX.test(store.bg_color) ? store.bg_color : null;
  const defaultBg = isDark ? '#0a0a0a' : '#ffffff';
  const bgColor = customBg || defaultBg;
  const textColor = isDark ? '#ffffff' : '#111827';

  const sections = useMemo<MenuSection[]>(
    () =>
      [...categories]
        .sort((a, b) => a.order - b.order)
        .map((category) => ({
          category,
          products: products
            .filter((p) => p.available && p.category_id === category.id)
            .sort((a, b) => a.order - b.order),
        }))
        .filter((s) => s.products.length > 0),
    [categories, products]
  );

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const lines = useMemo<OrderLine[]>(
    () =>
      Object.entries(items).flatMap(([id, qty]) => {
        const p = byId.get(id);
        return p && p.available ? [{ id, name: p.name, price: Number(p.price), qty }] : [];
      }),
    [items, byId]
  );
  const total = orderTotal(lines);
  const count = orderCount(lines);

  // FLUJO 1 · en el local: se acumula y se muestra al mozo
  const orderAtTable = useCallback(
    (p: Product) => {
      add(p.id);
      setWaiterOpen(true);
    },
    [add]
  );

  // FLUJO 2 · fuera del local: un producto directo a WhatsApp
  const orderOneByWhatsApp = useCallback(
    (p: Product) => {
      const msg = buildOrderMessage(store.name, [{ id: p.id, name: p.name, price: Number(p.price), qty: 1 }]);
      openExternal(whatsappUrl(store.whatsapp, msg));
    },
    [store.name, store.whatsapp]
  );

  function sendCartByWhatsApp() {
    if (!lines.length) return;
    openExternal(whatsappUrl(store.whatsapp, buildOrderMessage(store.name, lines)));
  }

  const actions: MenuActions = {
    qtyOf: (id) => items[id] ?? 0,
    orderAtTable,
    orderOneByWhatsApp,
    openCart: () => setCartOpen(true),
    count,
    total,
  };

  const cssVars = {
    '--accent': accent,
    '--accent-fg': readableTextColor(accent),
    '--menu-bg': bgColor,
    '--menu-text': textColor,
  } as CSSProperties;
  // En preview (marco admin) el sheet queda contenido dentro del marco; en la web real se abre como modal/sheet
  const sheetProps = preview
    ? { contained: true, forceMobile: true }
    : { contained: false, forceMobile: false };

  return (
    <div
      className={cn(
        'flex h-full min-h-dvh w-full justify-center overflow-hidden transition-colors duration-200',
        isDark ? 'text-white' : 'text-neutral-900'
      )}
      style={{
        ...cssVars,
        backgroundColor: bgColor,
      }}
    >
      <div
        className={cn(
          'relative h-full min-h-dvh w-full overflow-hidden',
          preview ? 'max-w-[480px]' : ''
        )}
      >
        {layout === 'list' ? (
          <ListView store={store} sections={sections} actions={actions} preview={preview} />
        ) : (
          <FeedView store={store} sections={sections} actions={actions} preview={preview} />
        )}

        {/* Modal / Sheet del Carrito */}
        <Sheet open={cartOpen} onClose={() => setCartOpen(false)} title="Tu pedido" {...sheetProps}>
          {lines.length === 0 ? (
            <p className="py-10 text-center text-muted">Todavía no agregaste nada.</p>
          ) : (
            <>
              <ul className="divide-y divide-black/[0.06]">
                {lines.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{l.name}</p>
                      <p className="text-[13px] tabular-nums text-muted">{formatPrice(l.price * l.qty)}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-canvas p-1">
                      <button
                        type="button"
                        onClick={() => add(l.id, -1)}
                        className="icon-btn h-7 w-7 bg-white text-ink shadow-sm"
                        aria-label={`Quitar ${l.name}`}
                      >
                        {l.qty === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{l.qty}</span>
                      <button
                        type="button"
                        onClick={() => add(l.id, 1)}
                        className="icon-btn h-7 w-7 bg-white text-ink shadow-sm"
                        aria-label={`Agregar ${l.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex items-baseline justify-between border-t border-black/[0.06] pt-4">
                <span className="text-[15px] text-muted">Total</span>
                <span className="text-2xl font-semibold tabular-nums tracking-tight">{formatPrice(total)}</span>
              </div>
              <div className="mt-5 grid gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    setWaiterOpen(true);
                  }}
                  className={cn(
                    'btn h-12 font-semibold shadow-md transition',
                    store.button_style === 'accent'
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-105'
                      : store.button_style === 'whatsapp'
                      ? 'bg-whatsapp text-white hover:brightness-95'
                      : 'bg-ink text-white hover:bg-black'
                  )}
                >
                  <HandPlatter className="h-4 w-4" /> Mostrar al mozo
                </button>
                <button type="button" onClick={sendCartByWhatsApp} className="btn-whatsapp h-12 shadow-md">
                  <WhatsAppIcon /> Enviar pedido completo por WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clear();
                    setCartOpen(false);
                  }}
                  className="btn-ghost mx-auto"
                >
                  Vaciar pedido
                </button>
              </div>
            </>
          )}
        </Sheet>

        {/* Modal / Sheet Mostrar al mozo */}
        <Sheet open={waiterOpen} onClose={() => setWaiterOpen(false)} {...sheetProps}>
          <div className="pt-2 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-canvas">
              <HandPlatter className="h-6 w-6" />
            </span>
            <h2 className="mt-3 text-[22px] font-semibold tracking-tight">Mostrale esto al mozo</h2>
            <p className="mt-1 text-[14px] text-muted">{store.name}</p>
          </div>

          <ul className="mt-5 space-y-2 rounded-3xl bg-canvas p-5">
            {lines.map((l) => (
              <li key={l.id} className="flex items-baseline justify-between gap-4">
                <span className="text-[20px] sm:text-[22px] font-semibold leading-tight tracking-tight">
                  {l.qty}x {l.name}
                </span>
                <span className="shrink-0 text-[15px] tabular-nums text-muted">{formatPrice(l.price * l.qty)}</span>
              </li>
            ))}
            <li className="flex items-baseline justify-between border-t border-black/10 pt-3">
              <span className="text-[15px] text-muted">Total</span>
              <span className="text-[22px] font-semibold tabular-nums">{formatPrice(total)}</span>
            </li>
          </ul>

          <div className="mt-5 grid gap-2.5">
            <button
              type="button"
              onClick={() => setWaiterOpen(false)}
              className={cn(
                'btn h-12 font-semibold shadow-md transition',
                store.button_style === 'accent'
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-105'
                  : store.button_style === 'whatsapp'
                  ? 'bg-whatsapp text-white hover:brightness-95'
                  : 'bg-ink text-white hover:bg-black'
              )}
            >
              Seguir mirando el menú
            </button>
            <button
              type="button"
              onClick={() => {
                setWaiterOpen(false);
                setCartOpen(true);
              }}
              className="btn-secondary h-12"
            >
              Editar pedido
            </button>
          </div>
          <p className="mt-4 text-center text-[12px] text-subtle">El pago lo hacés directamente en el local.</p>
        </Sheet>
      </div>
    </div>
  );
}
