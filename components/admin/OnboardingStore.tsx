'use client';

import { useState } from 'react';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { createClient } from '@/lib/supabase/client';
import type { Store } from '@/lib/types';
import { normalizeWhatsapp, SLUG_REGEX, slugify } from '@/lib/utils';

type Props = {
  userId: string;
  onCreated: (newStore: Store) => void;
};

export function OnboardingStore({ userId, onCreated }: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
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
      setError('Escribí el nombre de tu local.');
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

      const supabase = createClient();

      // 1. Crear tienda
      const { data: newStore, error: storeErr } = await supabase
        .from('stores')
        .insert({
          name: cleanName,
          slug: cleanSlug,
          whatsapp: cleanWp,
          created_by: userId,
        })
        .select()
        .single();

      if (storeErr) {
        if (storeErr.code === '23505') {
          throw new Error(`El link "/p/${cleanSlug}" ya está ocupado. Elegí otro.`);
        }
        throw new Error(storeErr.message);
      }

      // 2. Crear categorías iniciales de ayuda
      await supabase.from('categories').insert([
        { store_id: newStore.id, name: 'Platos', order: 0 },
        { store_id: newStore.id, name: 'Bebidas', order: 1 },
      ]);

      onCreated(newStore as Store);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear el local.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-4 py-8 sm:px-6">
      <header className="mx-auto flex h-14 w-full max-w-lg items-center">
        <Logo />
      </header>

      <div className="flex flex-1 items-center justify-center">
        <div className="card w-full max-w-lg p-7 sm:p-9">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1 text-[13px] font-medium text-muted">
            <Sparkles className="h-3.5 w-3.5" /> Paso 1 de 1
          </span>
          <h1 className="mt-3 text-[28px] font-semibold tracking-tight">
            Creá tu local en 1 minuto
          </h1>
          <p className="mt-1.5 text-[15px] text-muted">
            Solo necesitamos el nombre de tu bar o restaurante y el número de WhatsApp donde te llegarán los pedidos.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="ob-name" className="label">
                Nombre de tu restaurante o bar
              </label>
              <input
                id="ob-name"
                type="text"
                required
                autoFocus
                placeholder="Ej: Cervecería Patagonia, Pizzería Don Pepe"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="ob-slug" className="label">
                Link público de tu menú
              </label>
              <div className="flex items-center rounded-xl border border-black/10 bg-canvas px-3.5 focus-within:border-ink/40 focus-within:bg-white focus-within:ring-4 focus-within:ring-black/5">
                <span className="text-[13px] text-subtle font-mono">/p/</span>
                <input
                  id="ob-slug"
                  type="text"
                  required
                  placeholder="mi-bar"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="h-11 w-full bg-transparent px-1 text-[14px] font-mono text-ink outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ob-wp" className="label">
                Número de WhatsApp para pedidos
              </label>
              <input
                id="ob-wp"
                type="tel"
                required
                placeholder="11 2345 6789"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="input"
              />
              <p className="mt-1 text-[12px] text-subtle">
                Formato argentino de 10 dígitos (sin 0 ni 15).
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="pt-2">
              <button type="submit" className="btn-primary h-12 w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Crear mi menú <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
