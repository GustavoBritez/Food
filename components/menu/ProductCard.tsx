'use client';

import Image from 'next/image';
import { HandPlatter } from 'lucide-react';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import type { Product } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

type Props = {
  product: Product;
  qty: number;
  onOrderAtTable: (p: Product) => void;
  onOrderWhatsApp: (p: Product) => void;
};

export function ProductCard({ product, qty, onOrderAtTable, onOrderWhatsApp }: Props) {
  return (
    <article className="flex h-full flex-col justify-between">
      {/* Contenido principal: texto a la izquierda, foto a la derecha */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold leading-snug tracking-tight text-ink break-words">
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted break-words">
              {product.description}
            </p>
          )}
          <p className="mt-2 text-[15px] font-bold text-ink tabular-nums">
            {formatPrice(product.price)}
          </p>
        </div>

        {product.photo_url && (
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-2xl bg-canvas border border-black/5 shadow-xs">
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
      <div className="mt-3.5 grid grid-cols-2 gap-2 pt-2 border-t border-black/[0.04]">
        <button
          type="button"
          onClick={() => onOrderAtTable(product)}
          className="btn relative h-9 px-2 text-[12px] sm:text-[13px] font-medium bg-ink text-white hover:bg-black gap-1.5 min-w-0"
          title="Pedir en mesa"
        >
          <HandPlatter className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Pedir en mesa</span>
          {qty > 0 && (
            <span
              key={qty}
              className="absolute -right-1 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-ink shadow ring-1 ring-black/10 animate-pop"
            >
              {qty}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onOrderWhatsApp(product)}
          className="btn h-9 px-2 text-[12px] sm:text-[13px] font-medium bg-whatsapp/10 text-whatsapp-dark hover:bg-whatsapp/15 gap-1.5 min-w-0"
          title="Pedir por WhatsApp"
        >
          <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-whatsapp" />
          <span className="truncate">Pedir WhatsApp</span>
        </button>
      </div>
    </article>
  );
}
