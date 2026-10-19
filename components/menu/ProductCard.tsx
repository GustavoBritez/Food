'use client';

import Image from 'next/image';
import { HandPlatter } from 'lucide-react';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import type { ButtonStyle, Product } from '@/lib/types';
import { cn, formatPrice } from '@/lib/utils';

type Props = {
  product: Product;
  qty: number;
  onOrderAtTable: (p: Product) => void;
  onOrderWhatsApp: (p: Product) => void;
  buttonStyle?: ButtonStyle;
  isDark?: boolean;
};

export function ProductCard({
  product,
  qty,
  onOrderAtTable,
  onOrderWhatsApp,
  buttonStyle = 'accent',
  isDark = false,
}: Props) {
  return (
    <article className="flex h-full flex-col justify-between">
      {/* Contenido principal: texto a la izquierda, foto a la derecha */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h3 className={cn('text-[16px] font-semibold leading-snug tracking-tight break-words', isDark ? 'text-white' : 'text-ink')}>
            {product.name}
          </h3>
          {product.description && (
            <p className={cn('mt-1 line-clamp-2 text-[13px] leading-relaxed break-words', isDark ? 'text-white/70' : 'text-muted')}>
              {product.description}
            </p>
          )}
          <p className={cn('mt-2 text-[15px] font-bold tabular-nums', isDark ? 'text-white' : 'text-ink')}>
            {formatPrice(product.price)}
          </p>
        </div>

        {product.photo_url && (
          <div className={cn(
            'relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-2xl shadow-xs',
            isDark ? 'bg-neutral-800 border border-white/10' : 'bg-canvas border border-black/5'
          )}>
            <Image
              src={product.photo_url}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 80px, 96px"
              className="object-cover"
            />
          </div>
        )}
      </div>

      {/* Botones de acción directos */}
      <div className={cn('mt-3.5 flex items-center gap-1.5 pt-2 border-t', isDark ? 'border-white/10' : 'border-black/[0.04]')}>
        <button
          type="button"
          onClick={() => onOrderAtTable(product)}
          className={cn(
            'flex h-8.5 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-[12px] font-semibold transition shadow-sm',
            buttonStyle === 'accent'
              ? 'bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-105'
              : buttonStyle === 'whatsapp'
              ? 'bg-whatsapp text-white hover:brightness-95'
              : isDark
              ? 'bg-white text-black hover:bg-white/90'
              : 'bg-ink text-white hover:bg-black'
          )}
          title="Pedir en mesa"
        >
          <HandPlatter className="h-3.5 w-3.5 shrink-0" />
          <span>+ En mesa</span>
          {qty > 0 && (
            <span
              key={qty}
              className="ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-white/30 px-1 text-[10px] font-bold ring-1 ring-black/10 animate-pop"
            >
              {qty}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onOrderWhatsApp(product)}
          className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-sm transition hover:scale-105 active:scale-95"
          title="Pedir por WhatsApp"
          aria-label="Pedir por WhatsApp"
        >
          <WhatsAppIcon className="h-4 w-4 shrink-0" />
        </button>
      </div>
    </article>
  );
}
