'use client';

import { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Props = {
  className?: string;
  variant?: 'button' | 'badge' | 'glass';
  label?: string;
};

export function PwaInstallButton({
  className = '',
  variant = 'button',
  label = 'Descargar App',
}: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Verificar si ya está ejecutándose como PWA instalada
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
    }

    // Detectar iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Si ya está instalada, no mostramos el botón
  if (isInstalled) return null;

  async function handleInstallClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIosGuide(true);
    } else {
      // Para navegadores donde ya se puede instalar o mostrar instrucciones
      alert(
        'Para descargar Carta App en tu dispositivo:\n\n• En Chrome/Edge: tocá los tres puntos (⋮) o el ícono de instalar en la barra de direcciones y elegí "Instalar aplicación".\n• En celular: elegí "Agregar a la pantalla principal".'
      );
    }
  }

  const baseStyles =
    variant === 'glass'
      ? 'inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-md transition hover:bg-black/60 active:scale-95'
      : variant === 'badge'
      ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition'
      : 'btn-secondary h-9 px-3.5 text-[13px] gap-1.5';

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`${baseStyles} ${className}`}
        title="Descargar Carta App como aplicación en tu celular o PC"
      >
        <Download className="h-3.5 w-3.5" />
        <span>{label}</span>
      </button>

      {/* Modal / Guía para iPhone (iOS Safari) */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-neutral-900 border border-white/10 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="flex items-center gap-2 text-[15px] font-semibold">
                <Smartphone className="h-5 w-5 text-emerald-400" /> Instalar en iPhone
              </span>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-[13px] text-white/70 leading-relaxed">
              Instalá el menú en la pantalla de inicio de tu iPhone para entrar con un toque sin abrir el navegador:
            </p>

            <ol className="mt-4 space-y-3 text-[13px]">
              <li className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[12px]">
                  1
                </span>
                <span>
                  Tocá el botón <strong className="text-white">Compartir</strong> <Share className="inline h-3.5 w-3.5 mx-0.5 text-blue-400" /> en la barra inferior de Safari.
                </span>
              </li>
              <li className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[12px]">
                  2
                </span>
                <span>
                  Buscá y seleccioná <strong className="text-white">"Agregar a inicio"</strong> ⊞.
                </span>
              </li>
              <li className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[12px]">
                  3
                </span>
                <span>
                  Tocá <strong className="text-white">"Agregar"</strong> arriba a la derecha ¡y listo!
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="btn-primary mt-5 h-11 w-full bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
