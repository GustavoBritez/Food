'use client';

import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Check, Copy, Download, ExternalLink, QrCode } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import type { Store } from '@/lib/types';
import { menuUrl } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  store: Pick<Store, 'name' | 'slug' | 'logo_url'>;
};

export function QrModal({ open, onClose, store }: Props) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const url = menuUrl(store.slug);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback */
    }
  }

  function handleDownload() {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;

    // Generamos un canvas en alta resolución (1024x1024) para que la impresión quede perfecta
    const exportCanvas = document.createElement('canvas');
    const size = 1024;
    const padding = 96;
    exportCanvas.width = size;
    exportCanvas.height = size;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Fondo blanco limpio
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Dibujar el QR escalado
    ctx.drawImage(canvas, padding, padding, size - padding * 2, size - padding * 2);

    const a = document.createElement('a');
    a.download = `cartaapp-${store.slug}.png`;
    a.href = exportCanvas.toDataURL('image/png');
    a.click();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Código QR del Menú">
      <div className="flex flex-col items-center py-2 text-center">
        <p className="text-[14px] text-muted">
          Tus clientes escanean este código con la cámara y entran directamente a:
        </p>
        <div className="mt-2 flex max-w-full items-center gap-2 rounded-xl bg-canvas px-3 py-1.5 text-[13px] font-mono text-ink">
          <span className="truncate">{url}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="icon-btn h-6 w-6 shrink-0 bg-white shadow-sm"
            title="Copiar link"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-whatsapp-dark" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Contenedor del QR */}
        <div
          ref={canvasRef}
          className="my-6 grid place-items-center rounded-3xl border border-black/5 bg-white p-6 shadow-soft"
        >
          <QRCodeCanvas
            value={url}
            size={240}
            level="H"
            marginSize={2}
            imageSettings={{
              src: store.logo_url || '/icons/default-store-logo.png',
              height: 48,
              width: 48,
              excavate: true,
            }}
          />
        </div>

        <p className="text-[12px] text-subtle">
          Diseñado para imprimir en folletos, caballetes o calcos de mesa.
        </p>

        {/* Acciones */}
        <div className="mt-6 grid w-full gap-2.5">
          <button type="button" onClick={handleDownload} className="btn-primary h-12 w-full">
            <Download className="h-4 w-4" /> Descargar QR en alta resolución (PNG)
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={handleCopy} className="btn-secondary h-11">
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-whatsapp-dark" /> ¡Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar link
                </>
              )}
            </button>
            <a
              href={`/p/${store.slug}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary h-11"
            >
              <ExternalLink className="h-4 w-4" /> Abrir menú
            </a>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
