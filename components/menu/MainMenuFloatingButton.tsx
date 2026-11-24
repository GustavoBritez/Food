'use client';

import Link from 'next/link';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  storeSlug: string;
  hasCartItems: boolean;
  preview?: boolean;
};

/**
 * Botón flotante en la parte inferior de cada carta que lleva al Menú Principal (/menu-principal)
 * con interfaz estilo Instagram de promociones vigentes.
 */
export function MainMenuFloatingButton({ storeSlug, hasCartItems, preview = false }: Props) {
  if (preview) return null;

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 transition-all duration-300',
        hasCartItems
          ? 'bottom-[74px]'
          : 'bottom-4 pb-[env(safe-area-inset-bottom,0px)]'
      )}
    >
      <Link
        href={`/menu-principal?from=${encodeURIComponent(storeSlug)}`}
        className="pointer-events-auto group inline-flex items-center gap-2 rounded-full p-[1.5px] bg-gradient-to-r from-amber-400 via-rose-500 to-fuchsia-600 shadow-xl shadow-black/40 transition-transform duration-200 hover:scale-105 active:scale-95"
        title="Ir al Menú Principal de Promociones"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-950/95 px-3.5 py-1.5 text-[12px] font-bold text-white backdrop-blur-md">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-fuchsia-600 text-white shadow-xs">
            <Flame className="h-3 w-3 fill-current" />
          </span>
          <span>Menú Principal · Promos</span>
        </span>
      </Link>
    </div>
  );
}
