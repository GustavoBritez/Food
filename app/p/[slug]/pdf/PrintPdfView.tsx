'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { ArrowLeft, Download, Printer, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import type { Category, Product, Store } from '@/lib/types';
import { formatPrice, menuUrl } from '@/lib/utils';

type Props = {
  store: Store;
  categories: Category[];
  products: Product[];
};

export function PrintPdfView({ store, categories, products }: Props) {
  const url = menuUrl(store.slug);

  // Organizar secciones
  const sections = categories
    .sort((a, b) => a.order - b.order)
    .map((category) => ({
      category,
      products: products
        .filter((p) => p.category_id === category.id && p.available)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((s) => s.products.length > 0);

  function handlePrint() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 print:bg-white print:text-black">
      {/* Barra de Controles en Pantalla (Oculta al imprimir o exportar a PDF) */}
      <header className="sticky top-0 z-50 border-b border-neutral-300 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) window.history.back();
                else window.close();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </button>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-neutral-900">{store.name}</span>
              <span className="ml-1 text-xs text-neutral-500">· Vista previa de Folleto / PDF Imprimible</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <p className="hidden text-[11.5px] text-neutral-500 md:block">
              💡 Tip: Elegí <strong className="text-neutral-800">&ldquo;Guardar como PDF&rdquo;</strong> en el destino para descargarlo
            </p>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-neutral-800 active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Descargar PDF / Imprimir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenedor Hoja A4 / Folleto Imprimible */}
      <main className="mx-auto my-6 max-w-4xl bg-white p-8 shadow-xl sm:rounded-2xl print:my-0 print:max-w-none print:p-0 print:shadow-none">
        {/* Encabezado del Folleto */}
        <header className="border-b-2 border-neutral-900 pb-5">
          <div className="flex items-start justify-between gap-6">
            {/* Identidad de la Marca */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                {store.logo_url && (
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-200">
                    <Image
                      src={store.logo_url}
                      alt={store.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-950">
                    {store.name}
                  </h1>
                  {store.tagline && (
                    <p className="text-xs sm:text-sm font-semibold tracking-wide text-neutral-600">
                      {store.tagline}
                    </p>
                  )}
                </div>
              </div>

              {/* Teléfono / WhatsApp de Pedidos */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-neutral-800">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-emerald-900 border border-emerald-300">
                  <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-700" /> WhatsApp: {store.whatsapp}
                </span>
                <span className="text-neutral-500 text-[11.5px]">
                  Pedidos y delivery directo sin comisión
                </span>
              </div>
            </div>

            {/* Código QR Vectorial de Alta Definición */}
            <div className="flex flex-col items-center shrink-0 rounded-xl border-2 border-neutral-900 bg-white p-2.5 text-center">
              <QRCodeSVG
                value={url}
                size={92}
                level="M"
                includeMargin={false}
              />
              <span className="mt-1 text-[8.5px] font-black uppercase tracking-wider text-neutral-950">
                Escaneá para pedir
              </span>
            </div>
          </div>
        </header>

        {/* Grilla de Categorías del Folleto */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
          {sections.map(({ category, products: catProducts }) => {
            const displayMode = category.display_mode || 'standard';
            const priceCols =
              category.price_columns && category.price_columns.length > 0
                ? category.price_columns
                : ['Normal'];

            return (
              <section
                key={category.id}
                className={`break-inside-avoid ${
                  displayMode === 'highlighted_box'
                    ? 'col-span-full rounded-2xl border-2 border-neutral-950 bg-neutral-50 p-4 shadow-sm'
                    : ''
                }`}
              >
                {/* Título de la Categoría */}
                <div className="mb-3 border-b-2 border-neutral-900 pb-1 flex items-baseline justify-between">
                  <h2 className="text-[15px] font-black uppercase tracking-wide text-neutral-950">
                    {category.name}
                  </h2>
                  {category.subtitle && (
                    <span className="text-[11px] font-semibold italic text-neutral-600">
                      {category.subtitle}
                    </span>
                  )}
                </div>

                {/* 1. MODO PROMO_CARDS (Cajas compactas de promos/combos) */}
                {displayMode === 'promo_cards' ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {catProducts.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-col justify-between rounded-xl border border-neutral-300 p-2 text-center bg-white"
                      >
                        <div>
                          <span className="inline-block rounded bg-neutral-900 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                            {p.badge_label || 'PROMO'}
                          </span>
                          <h3 className="mt-1 text-[12px] font-extrabold leading-tight text-neutral-950">
                            {p.name}
                          </h3>
                          {p.description && (
                            <p className="mt-0.5 text-[10px] leading-tight text-neutral-600 line-clamp-2">
                              {p.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-1.5 rounded bg-neutral-100 py-0.5">
                          <span className="text-[12px] font-black text-neutral-950 tabular-nums">
                            {formatPrice(p.price)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : displayMode === 'matrix_table' ? (
                  /* 2. MODO MATRIX_TABLE (Columnas de precios a la derecha) */
                  <div className="overflow-hidden rounded-xl border border-neutral-300 text-[11px]">
                    <div className="flex items-center justify-between border-b border-neutral-300 bg-neutral-100 px-2.5 py-1 font-black uppercase tracking-wider text-[10px]">
                      <span>Variedad</span>
                      <div className="flex gap-2">
                        {priceCols.map((col) => (
                          <span key={col} className="w-14 text-center">
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="divide-y divide-neutral-200">
                      {catProducts.map((p) => {
                        const variants = p.price_variants ?? [];
                        return (
                          <div key={p.id} className="flex items-center justify-between px-2.5 py-1.5">
                            <span className="font-bold text-neutral-950 truncate mr-2">{p.name}</span>
                            <div className="flex gap-2 shrink-0">
                              {priceCols.map((col) => {
                                const matchVar = variants.find(
                                  (v) => v.label.toLowerCase() === col.toLowerCase()
                                );
                                const priceVal = matchVar
                                  ? matchVar.price
                                  : variants.length === 0
                                  ? p.price
                                  : null;
                                return (
                                  <span
                                    key={col}
                                    className="w-14 text-center font-extrabold tabular-nums text-neutral-900"
                                  >
                                    {priceVal !== null ? formatPrice(priceVal) : '—'}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* 3. MODO STANDARD / CLÁSICO (Línea de puntos hacia el precio) */
                  <ul className="space-y-1.5 text-[12px]">
                    {catProducts.map((p) => {
                      const variants = p.price_variants ?? [];
                      return (
                        <li key={p.id} className="flex items-baseline justify-between gap-1">
                          <div className="min-w-0 flex-1 flex items-baseline">
                            <span className="font-bold text-neutral-950">{p.name}</span>
                            {p.badge_label && (
                              <span className="ml-1.5 rounded bg-neutral-100 px-1 py-0.2 text-[9px] font-bold uppercase text-neutral-700 border border-neutral-300">
                                {p.badge_label}
                              </span>
                            )}
                            <span className="flex-1 mx-1.5 border-b border-dotted border-neutral-400" />
                          </div>
                          <span className="shrink-0 font-extrabold tabular-nums text-neutral-950">
                            {variants.length > 0
                              ? variants.map((v) => `${v.label} ${formatPrice(v.price)}`).join(' / ')
                              : formatPrice(p.price)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        {/* Pie de Página del Folleto */}
        <footer className="mt-8 border-t-2 border-neutral-900 pt-3 text-center text-[10.5px] font-semibold text-neutral-600 flex items-center justify-between">
          <span>{store.name} · Carta y Folleto Oficial</span>
          <span>Pedidos al WhatsApp: {store.whatsapp}</span>
          <span className="font-mono text-[9.5px]">cartaapp.com</span>
        </footer>
      </main>

      {/* Reglas CSS para Impresión Limpia A4 */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 8mm 8mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header.print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
