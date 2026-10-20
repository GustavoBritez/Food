'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}

type Props = {
  className?: string;
  variant?: 'button' | 'badge' | 'glass';
  label?: string;
};

export function PwaInstallButton({
  className = '',
  variant = 'button',
  label = 'Instalar App',
}: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [guide, setGuide] = useState<string | null>(null);

  useEffect(() => {
    // Si ya corre como PWA instalada (standalone), marcamos como instalada
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true)
    ) {
      setIsInstalled(true);
      return;
    }

    // Si el evento fue capturado tempranamente en <head>, lo tomamos de inmediato
    if (typeof window !== 'undefined') {
      const earlyPrompt = (window as unknown as { __pwaPrompt?: BeforeInstallPromptEvent }).__pwaPrompt;
      if (earlyPrompt) {
        setDeferredPrompt(earlyPrompt);
      }
    }

    const handlePromptReady = () => {
      const p = (window as unknown as { __pwaPrompt?: BeforeInstallPromptEvent }).__pwaPrompt;
      if (p) setDeferredPrompt(p);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvt = e as BeforeInstallPromptEvent;
      (window as unknown as { __pwaPrompt?: BeforeInstallPromptEvent }).__pwaPrompt = promptEvt;
      setDeferredPrompt(promptEvt);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') {
        (window as unknown as { __pwaPrompt?: BeforeInstallPromptEvent | null }).__pwaPrompt = null;
      }
    };

    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Si ya está instalada, no mostramos nada
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. Tomar el prompt nativo guardado (en estado o global de window)
    const promptEvent =
      deferredPrompt ||
      (typeof window !== 'undefined'
        ? (window as unknown as { __pwaPrompt?: BeforeInstallPromptEvent }).__pwaPrompt
        : null);

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          if (typeof window !== 'undefined') {
            (window as unknown as { __pwaPrompt?: BeforeInstallPromptEvent | null }).__pwaPrompt = null;
          }
          setIsInstalled(true);
        }
      } catch {
        /* noop */
      }
      return;
    }

    // 2. Si es iPhone (Safari iOS no tiene beforeinstallprompt por política de Apple)
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      setGuide("Tocá el botón Compartir de Safari y luego 'Agregar a inicio' ⊞ para tener la app en tu pantalla.");
      setTimeout(() => setGuide(null), 7000);
      return;
    }

    // 3. Si en Android/Chrome el evento tarda unos milisegundos en disparar, esperamos brevemente y lanzamos
    setTimeout(async () => {
      const latePrompt = (window as unknown as { __pwaPrompt?: BeforeInstallPromptEvent }).__pwaPrompt;
      if (latePrompt) {
        try {
          await latePrompt.prompt();
        } catch {
          /* noop */
        }
      }
    }, 300);
  };

  const baseStyles =
    variant === 'glass'
      ? 'inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-md transition hover:bg-black/60 active:scale-95'
      : variant === 'badge'
      ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition'
      : 'inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-neutral-950 shadow-sm transition-all hover:bg-emerald-400 active:scale-95';

  return (
    <div className="relative inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleInstallClick}
        className={`${baseStyles} ${className}`}
        title="Instalar App en tu pantalla de inicio"
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </button>
      {guide && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-white/10 bg-neutral-900/95 p-2.5 text-[11.5px] leading-snug text-white shadow-2xl backdrop-blur-md animate-fade-in text-left">
          <p className="font-semibold text-emerald-400 mb-0.5">¿Cómo instalar?</p>
          <p className="text-white/90">{guide}</p>
        </div>
      )}
    </div>
  );
}
