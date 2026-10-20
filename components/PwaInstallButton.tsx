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

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
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
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsInstalled(true);
        }
      } catch {
        /* noop */
      }
    } else {
      // Si el navegador no soporta prompt nativo directo (iOS Safari o Chrome sin beforeinstallprompt)
      const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        setGuide("En iPhone: tocá Compartir y luego 'Agregar a inicio'");
      } else {
        setGuide("En tu navegador: tocá el menú (⋮) y seleccioná 'Instalar app' o 'Agregar a la pantalla principal'");
      }
      setTimeout(() => setGuide(null), 6000);
    }
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
