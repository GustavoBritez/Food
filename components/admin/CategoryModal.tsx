'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import type { Category } from '@/lib/types';

type Props = {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
  onSave: (cat: { id?: string; name: string; subtitle?: string | null; order: number }) => Promise<void>;
  nextOrder: number;
};

export function CategoryModal({ open, onClose, category, onSave, nextOrder }: Props) {
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [order, setOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.name);
      setSubtitle(category.subtitle ?? '');
      setOrder(category.order);
    } else {
      setName('');
      setSubtitle('');
      setOrder(nextOrder);
    }
    setError('');
  }, [category, nextOrder, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Ingresá un nombre para la categoría.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await onSave({
        id: category?.id,
        name: cleanName,
        subtitle: subtitle.trim() || null,
        order: Number(order) || 0,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('row-level security') || msg.includes('42501')) {
        setError('Para guardar categorías necesitás activar tu mes gratis o suscribirte con Mercado Pago desde el banner superior.');
      } else {
        setError(msg || 'Error al guardar la categoría.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={category ? 'Editar Categoría' : 'Nueva Categoría'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <div>
          <label htmlFor="cat-name" className="label">
            Nombre de la categoría
          </label>
          <input
            id="cat-name"
            type="text"
            required
            autoFocus
            maxLength={60}
            placeholder="Ej: Pizzas, Cervezas, Postres"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="cat-subtitle" className="label">
            Subtítulo u horario opcional
          </label>
          <input
            id="cat-subtitle"
            type="text"
            maxLength={180}
            placeholder="Ej: Disponible de 12 a 15:30hs · Incluye copa de vino"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="input"
          />
          <p className="mt-1 text-[12px] text-subtle">
            Se muestra debajo del título de la sección en la carta.
          </p>
        </div>

        <div>
          <label htmlFor="cat-order" className="label">
            Orden de aparición (número)
          </label>
          <input
            id="cat-order"
            type="number"
            min={0}
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            className="input"
          />
          <p className="mt-1 text-[12px] text-subtle">
            Los números más bajos aparecen primero en el menú.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="pt-2">
          <button type="submit" className="btn-primary h-12 w-full" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar categoría'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
