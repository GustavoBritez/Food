'use client';

import { useState } from 'react';
import { ArrowRight, Check, CreditCard, Loader2, Sparkles, Store as StoreIcon, Truck } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { createClient } from '@/lib/supabase/client';
import { BASE_INCLUDED_BRANCHES, BASE_INCLUDED_STORES, EXTRA_BRANCH_PRICE } from '@/lib/mercadopago';
import type { Store } from '@/lib/types';
import { normalizeWhatsapp, SLUG_REGEX, slugify } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  mainStore: Store;
  branchesCount: number;
  userId: string;
  onCreated: (newBranch: Store) => void;
  onExtraSlotPurchased?: (updatedStore: Store) => void;
};

export function BranchModal({
  open,
  onClose,
  mainStore,
  branchesCount,
  userId,
  onCreated,
  onExtraSlotPurchased,
}: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [whatsapp, setWhatsapp] = useState(mainStore.whatsapp || '');
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');

  // Límite: 3 locales incluidos en plan base (1 casa matriz + 2 sucursales/food trucks) + cupos extras
  const extraPurchased = mainStore.extra_branches_purchased || 0;
  const maxAllowedBranches = BASE_INCLUDED_BRANCHES + extraPurchased;
  const hasAvailableSlot = branchesCount < maxAllowedBranches;
  const totalActiveStores = branchesCount + 1;
  const maxTotalStores = BASE_INCLUDED_STORES + extraPurchased;

  function handleNameChange(val: string) {
    setName(val);
    setSlug(slugify(val));
  }

  // Checkout para comprar slot de local adicional ($25.000 ARS)
  async function handleBuyExtraSlot() {
    setCheckoutLoading(true);
    setError('');

    // Modo demo: simular compra al instante
    if (mainStore.id === 'demo-store' || userId === 'demo-user') {
      const updatedStore: Store = {
        ...mainStore,
        extra_branches_purchased: (mainStore.extra_branches_purchased || 0) + 1,
      };
      onExtraSlotPurchased?.(updatedStore);
      setCheckoutLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/mercadopago/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'extra_branch' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar el pago en Mercado Pago');
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al conectar con Mercado Pago');
      setCheckoutLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanSlug = slug.trim().toLowerCase();
    const cleanWp = normalizeWhatsapp(whatsapp);

    if (!cleanName) {
      setError('Escribí el nombre de la sucursal o food truck.');
      return;
    }
    if (!SLUG_REGEX.test(cleanSlug)) {
      setError('El link solo puede contener letras minúsculas, números y guiones.');
      return;
    }
    if (!cleanWp || cleanWp.length < 8) {
      setError('Ingresá un número de WhatsApp válido.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (mainStore.id === 'demo-store' || userId === 'demo-user') {
        const demoBranch: Store = {
          id: `demo-branch-${Date.now()}`,
          parent_store_id: mainStore.id,
          name: cleanName,
          slug: cleanSlug,
          whatsapp: cleanWp,
          created_by: userId,
          logo_url: mainStore.logo_url,
          cover_url: mainStore.cover_url,
          tagline: `Punto de venta · ${cleanName}`,
          accent_color: mainStore.accent_color,
          layout: mainStore.layout,
          theme: mainStore.theme,
          bg_color: mainStore.bg_color,
          button_style: mainStore.button_style,
          theme_config: mainStore.theme_config,
          subscription_status: mainStore.subscription_status,
          current_period_end: mainStore.current_period_end,
        };
        onCreated(demoBranch);
        setName('');
        setSlug('');
        onClose();
        return;
      }

      const supabase = createClient();

      const { data: newBranch, error: branchErr } = await supabase
        .from('stores')
        .insert({
          name: cleanName,
          slug: cleanSlug,
          whatsapp: cleanWp,
          parent_store_id: mainStore.id,
          created_by: userId,
          logo_url: mainStore.logo_url,
          cover_url: mainStore.cover_url,
          tagline: `Sucursal · ${cleanName}`,
          accent_color: mainStore.accent_color,
          layout: mainStore.layout,
          theme: mainStore.theme,
          bg_color: mainStore.bg_color,
          button_style: mainStore.button_style,
          theme_config: mainStore.theme_config,
          subscription_status: mainStore.subscription_status || 'active',
          current_period_end: mainStore.current_period_end,
        })
        .select()
        .single();

      if (branchErr) {
        if (branchErr.code === '23505') {
          throw new Error(`El link "/p/${cleanSlug}" ya está ocupado. Elegí otro.`);
        }
        throw new Error(branchErr.message);
      }

      onCreated(newBranch as Store);
      setName('');
      setSlug('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear la sucursal.');
    } finally {
      setLoading(false);
    }
  }

  // --- Caso 1: Límite de locales alcanzado -> Pantalla de Adquisición de Punto Adicional ($25.000 ARS) ---
  if (!hasAvailableSlot) {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title="Sumar Local o Food Truck Adicional"
        description="Límite del plan base alcanzado (hasta 3 locales incluidos)."
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-[13px] text-amber-950">
            <div className="flex items-center gap-2 font-semibold text-amber-900">
              <StoreIcon className="h-4 w-4 text-amber-600" />
              <span>Ya tenés {totalActiveStores} de {maxTotalStores} locales activos</span>
            </div>
            <p className="mt-1.5 text-amber-800/90 leading-relaxed">
              Tu suscripción base incluye hasta <strong>3 locales en total</strong> (1 casa matriz + 2 sucursales o food trucks).
            </p>
          </div>

          <div className="rounded-2xl border border-black/10 bg-canvas p-4 text-ink">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <Sparkles className="h-3 w-3" /> Punto de Venta Extra
                </span>
                <h4 className="mt-2 text-[16px] font-bold">Local a la calle o Food Truck Adicional</h4>
                <p className="mt-1 text-[13px] text-subtle leading-relaxed">
                  Podés abrir los locales o food trucks que necesites (5, 10, 30 locales). Cada punto extra comparte tu menú centralizado con su propio código QR y WhatsApp.
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-extrabold text-ink">$25.000</span>
                <span className="block text-[11.5px] text-subtle font-medium">ARS / local extra</span>
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-[12.5px] text-muted border-t border-black/[0.06] pt-3">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-whatsapp-dark" /> Hereda automáticamente tu catálogo de platos y precios
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-whatsapp-dark" /> Código QR propio de alta resolución para sus mesas
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-whatsapp-dark" /> Número de WhatsApp independiente para pedidos
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-whatsapp-dark" /> Ocultá platos no disponibles en este punto con 1 clic
              </li>
            </ul>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleBuyExtraSlot}
              disabled={checkoutLoading}
              className="btn-primary h-12 w-full flex items-center justify-center gap-2 text-[15px]"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Conectando con Mercado Pago...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  {mainStore.id === 'demo-store'
                    ? 'Probar desbloqueo en Modo Demo (Gratis)'
                    : 'Pagar $25.000 con Mercado Pago'}
                </>
              )}
            </button>
            <p className="mt-2 text-center text-[11.5px] text-subtle">
              Pago 100% seguro procesado por Mercado Pago Argentina. Se acredita al instante.
            </p>
          </div>
        </div>
      </Sheet>
    );
  }

  // --- Caso 2: Tiene cupo disponible -> Formulario de creación de sucursal ---
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nueva Sucursal o Food Truck"
      description={`Punto de venta ${totalActiveStores + 1} de ${maxTotalStores} permitidos. Hereda automáticamente las categorías y platos de tu local principal.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-3.5 text-[13px] text-emerald-950">
          <p className="font-semibold text-emerald-900 flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-emerald-600" /> Herencia de Catálogo Automática
          </p>
          <p className="mt-1 text-emerald-800/90 leading-relaxed">
            No necesitás volver a cargar tus hamburguesas ni pizzas. Este nuevo punto de venta compartirá los mismos platos y precios, y podrás ocultar en 1 clic los que no vendas aquí.
          </p>
        </div>

        <div>
          <label htmlFor="branch-name" className="label">
            Nombre del Punto de Venta
          </label>
          <input
            id="branch-name"
            type="text"
            required
            autoFocus
            placeholder="Ej: Food Truck Costanera, Sucursal Jujuy"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="branch-slug" className="label">
            Link público de la carta de este punto
          </label>
          <div className="flex items-center rounded-xl border border-black/10 bg-canvas px-3.5 focus-within:border-ink/40 focus-within:bg-white focus-within:ring-4 focus-within:ring-black/5">
            <span className="text-[13px] text-subtle font-mono">/p/</span>
            <input
              id="branch-slug"
              type="text"
              required
              placeholder="foodtruck-costanera"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="h-11 w-full bg-transparent px-1 text-[14px] font-mono text-ink outline-none"
            />
          </div>
          <p className="mt-1 text-[12px] text-subtle">
            Tendrá su propio código QR para colocar en el food truck o las mesas de esta sucursal.
          </p>
        </div>

        <div>
          <label htmlFor="branch-wp" className="label">
            WhatsApp de pedidos para este punto
          </label>
          <input
            id="branch-wp"
            type="tel"
            required
            placeholder="11 2345 6789"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="input"
          />
          <p className="mt-1 text-[12px] text-subtle">
            Puede ser el mismo del local principal o el teléfono del encargado de este food truck.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="pt-2">
          <button type="submit" className="btn-primary h-12 w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Habilitar este punto de venta <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

