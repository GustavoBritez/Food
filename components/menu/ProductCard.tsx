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
    <article className="py-5">
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold leading-snug tracking-tight">{product.name}</h3>
          {product.description && (
            <p className="mt-1 line-clamp-3 text-[14px] leading-snug text-muted">{product.description}</p>
          )}
          <p className="mt-2 text-[16px] font-semibold tabular-nums">{formatPrice(product.price)}</p>
        </div>

        {product.photo_url && (
          <div className="relative h-[96px] w-[96px] shrink-0 overflow-hidden rounded-2xl bg-canvas">
            <Image
              src={product.photo_url}
              alt={product.name}
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
        )}
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onOrderAtTable(product)}
          className="btn relative h-10 bg-ink text-[13.5px] text-white hover:bg-black"
        >
          <HandPlatter className="h-4 w-4" />
          Pedir en mesa
          {qty > 0 && (
            <span
              key={qty}
              className="absolute -right-1 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-semibold text-ink shadow ring-1 ring-black/10 animate-pop"
            >
              {qty}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onOrderWhatsApp(product)}
          className="btn h-10 bg-whatsapp/10 text-[13.5px] text-whatsapp-dark hover:bg-whatsapp/15"
        >
          <WhatsAppIcon />
          Pedir por WhatsApp
        </button>
      </div>
    </article>
  );
}
