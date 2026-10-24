'use client';

import { useState } from 'react';
import { ArrowRight, Loader2, Store as StoreIcon, Truck } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { createClient } from '@/lib/supabase/client';
import type { Store } from '@/lib/types';
import { normalizeWhatsapp, SLUG_REGEX, slugify } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  mainStore: Store;
  userId: string;
  onCreated: (newBranch: Store) => void;
};

export function BranchModal({ open, onClose, mainStore, userId, onCreated }: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [whatsapp, setWhatsapp] = useState(mainStore.whatsapp || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleNameChange(val: string) {
    setName(val);
    setSlug(slugify(val));
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

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nueva Sucursal o Food Truck"
      description="Incluido sin costo extra en tu suscripción mensual. Hereda automáticamente todas las categorías y platos de tu local principal."
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
            placeholder="Ej: Food Truck Costanera, Sucursal Cañitas"
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
