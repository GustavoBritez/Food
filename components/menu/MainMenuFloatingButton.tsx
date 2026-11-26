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
        className="pointer-events-auto group inline-flex items-center gap-2 rounded-full border border-white/15 bg-neutral-950/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-2xl shadow-black/50 backdrop-blur-xl ring-1 ring-white/10 transition-all duration-200 hover:scale-[1.03] hover:bg-neutral-900 active:scale-[0.96]"
        title="Explorar bares, food trucks y promos en el Menú Principal"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-fuchsia-600 text-white shadow-xs">
          <Flame className="h-3 w-3 fill-current" />
        </span>
        <span>Menú Principal · Locales y Promos</span>
      </Link>
    </div>
  );
}
