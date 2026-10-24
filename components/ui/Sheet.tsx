'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Siempre como bottom sheet (no centrado en desktop) */
  forceMobile?: boolean;
  /** Posicionado dentro del contenedor padre (relative) en vez de la ventana: lo usa el menú público y la vista previa */
  contained?: boolean;
  className?: string;
};

export function Sheet({ open, onClose, title, description, children, forceMobile = false, contained = false, className }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    if (!contained) document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, contained]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        contained ? 'absolute' : 'fixed',
        'inset-0 z-50 flex items-end justify-center',
        !forceMobile && 'sm:items-center sm:p-6'
      )}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-[2px] animate-fade-in"
      />
      <div
        className={cn(
          'relative flex max-h-[92%] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white text-ink shadow-2xl animate-slide-up',
          !forceMobile && 'sm:rounded-[28px]',
          className
        )}
      >
        <div className={cn('mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-black/10', !forceMobile && 'sm:hidden')} />
        {title && (
          <header className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
              {description && <p className="text-xs text-subtle mt-0.5 leading-relaxed">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="icon-btn bg-canvas shrink-0" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </header>
        )}
        <div className="overflow-y-auto overscroll-contain px-5 pb-safe pt-2">{children}</div>
      </div>
    </div>
  );
}
