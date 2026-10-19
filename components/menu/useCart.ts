'use client';

import { useCallback, useEffect, useState } from 'react';

/** { productId: cantidad } — se guarda solo el id para que precios/nombres siempre salgan del menú actual */
export type CartItems = Record<string, number>;

const MAX_QTY = 99;

function sanitize(raw: unknown): CartItems {
  if (!raw || typeof raw !== 'object') return {};
  const out: CartItems = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(value);
    if (Number.isInteger(n) && n > 0) out[id] = Math.min(n, MAX_QTY);
  }
  return out;
}

/** Carrito persistido en localStorage. storageKey = null -> solo en memoria (vista previa del admin) */
export function useCart(storageKey: string | null) {
  const [items, setItems] = useState<CartItems>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (storageKey) {
      try {
        setItems(sanitize(JSON.parse(localStorage.getItem(storageKey) ?? '{}')));
      } catch {
        /* localStorage bloqueado o JSON roto: arrancamos vacío */
      }
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !hydrated) return;
    try {
      if (Object.keys(items).length) localStorage.setItem(storageKey, JSON.stringify(items));
      else localStorage.removeItem(storageKey);
    } catch {
      /* modo incógnito sin storage */
    }
  }, [items, hydrated, storageKey]);

  const add = useCallback((id: string, delta = 1) => {
    setItems((prev) => {
      const next = { ...prev };
      const qty = (next[id] ?? 0) + delta;
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(qty, MAX_QTY);
      return next;
    });
  }, []);

  const clear = useCallback(() => setItems({}), []);

  return { items, add, clear };
}
