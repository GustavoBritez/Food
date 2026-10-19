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
      <div className={cn('mt-3.5 grid grid-cols-2 gap-2 pt-2 border-t', isDark ? 'border-white/10' : 'border-black/[0.04]')}>
        <button
          type="button"
          onClick={() => onOrderAtTable(product)}
          className={cn(
            'btn relative h-9 px-2 text-[12px] sm:text-[13px] font-semibold gap-1.5 min-w-0 transition',
            buttonStyle === 'accent'
              ? 'bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-105 shadow-sm'
              : buttonStyle === 'whatsapp'
              ? 'bg-whatsapp text-white hover:brightness-95 shadow-sm'
              : isDark
              ? 'bg-white text-black hover:bg-white/90 shadow-sm'
              : 'bg-ink text-white hover:bg-black shadow-sm'
          )}
          title="Pedir en mesa"
        >
          <HandPlatter className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Pedir en mesa</span>
          {qty > 0 && (
            <span
              key={qty}
              className="absolute -right-1 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-[var(--accent-fg)] shadow ring-1 ring-black/10 animate-pop"
            >
              {qty}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onOrderWhatsApp(product)}
          className={cn(
            'btn h-9 px-2 text-[12px] sm:text-[13px] font-medium gap-1.5 min-w-0 transition shadow-sm',
            isDark
              ? 'bg-whatsapp/20 text-whatsapp hover:bg-whatsapp/30 border border-whatsapp/30'
              : 'bg-whatsapp/10 text-whatsapp-dark hover:bg-whatsapp/15'
          )}
          title="Pedir por WhatsApp"
        >
          <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-whatsapp" />
          <span className="truncate">Pedir WhatsApp</span>
        </button>
      </div>
    </article>
  );
}
