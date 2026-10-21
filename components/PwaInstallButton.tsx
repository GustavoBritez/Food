'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Compass,
  Download,
  ExternalLink,
  MoreVertical,
  PlusSquare,
  Share2,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Detección de entorno
  const [platform, setPlatform] = useState({
    isIOS: false,
    isAndroid: false,
    isInApp: false,
  });

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    // 1. Detectar si ya corre en modo PWA instalada (standalone)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      Boolean(document.referrer && document.referrer.includes('android-app://'));

    if (standalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Detección de plataforma móvil y navegadores integrados (WhatsApp, Instagram, etc.)
    const ua = navigator.userAgent || '';
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /Android/i.test(ua);
    const isInAppBrowser =
      /FBAN|FBAV|Instagram|WhatsApp|Line|Twitter|Snapchat|MicroMessenger|TikTok/i.test(ua);

    setPlatform({
      isIOS: isIOSDevice,
      isAndroid: isAndroidDevice,
      isInApp: isInAppBrowser,
    });

    // 3. Captura temprana de beforeinstallprompt
    const earlyPrompt = (window as unknown as { __pwaPrompt?: BeforeInstallPromptEvent }).__pwaPrompt;
    if (earlyPrompt) {
      setDeferredPrompt(earlyPrompt);
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
      setModalOpen(false);
      (window as unknown as { __pwaPrompt?: BeforeInstallPromptEvent | null }).__pwaPrompt = null;
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

  // Si ya corre instalada en pantalla de inicio, no mostramos el botón
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. Intentar lanzar el prompt nativo de Android/Chrome si está disponible
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
          return;
        }
      } catch (err) {
        console.warn('Error al ejecutar prompt nativo PWA:', err);
      }
    }

    // 2. Si el prompt nativo no está disponible o el navegador es iOS / Webview / in-app:
    // ABRIR SIEMPRE EL MODAL DE GUÍA PASO A PASO
    setModalOpen(true);
  };

  const triggerNativePrompt = async () => {
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
          setIsInstalled(true);
          setModalOpen(false);
        }
      } catch (err) {
        console.warn('Error launching prompt:', err);
      }
    }
  };

  const baseStyles =
    variant === 'glass'
      ? 'inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-md transition hover:bg-black/60 active:scale-95 shadow-sm'
      : variant === 'badge'
      ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition active:scale-95'
      : 'inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-neutral-950 shadow-sm transition-all hover:bg-emerald-400 active:scale-95';

  const modalContent = modalOpen && mounted ? (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={() => setModalOpen(false)}
    >
      <div
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 bg-neutral-900 p-6 text-white shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={() => setModalOpen(false)}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
          aria-label="Cerrar ventana"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
            <Smartphone className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-bold tracking-tight text-white">
              Instalar Menú en tu Celular
            </h3>
            <p className="text-[12.5px] text-neutral-400">
              Accedé al menú al instante como una App, sin descargas pesadas
            </p>
          </div>
        </div>

        {/* Alerta de Navegador In-App (WhatsApp / Instagram / etc.) */}
        {platform.isInApp && (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-[13px] text-amber-200">
            <p className="font-semibold flex items-center gap-1.5 text-amber-300">
              <Compass className="h-4 w-4 shrink-0" /> Abrir en tu navegador principal
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-amber-200/90">
              Estás viendo el menú dentro de WhatsApp o Instagram. Tocá los tres puntos{' '}
              <strong className="text-white">(⋮)</strong> o el ícono de brújula y elegí{' '}
              <strong className="text-white">&ldquo;Abrir en Chrome&rdquo;</strong> o{' '}
              <strong className="text-white">&ldquo;Abrir en Safari&rdquo;</strong> para poder instalar la App.
            </p>
          </div>
        )}

        {/* Guía según plataforma */}
        <div className="mt-5 space-y-3">
          {platform.isIOS ? (
            // Instrucciones para iPhone / iPad en Safari
            <div className="space-y-3 rounded-2xl bg-white/[0.04] p-4 border border-white/5">
              <p className="text-[12px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Pasos para iPhone / Safari:
              </p>
              <ol className="space-y-3 text-[13px] text-neutral-200">
                <li className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-neutral-950 font-bold text-xs">
                    1
                  </span>
                  <div>
                    Tocá el botón <strong>Compartir</strong> en la barra inferior de Safari:
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-0.5 text-xs text-white">
                      <Share2 className="h-3.5 w-3.5 text-blue-400" /> Ícono de compartir (cuadrito con flecha)
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-neutral-950 font-bold text-xs">
                    2
                  </span>
                  <div>
                    Deslizá las opciones y tocá:
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
                      <PlusSquare className="h-3.5 w-3.5 text-emerald-400" /> &ldquo;Agregar a pantalla de inicio&rdquo;
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-neutral-950 font-bold text-xs">
                    3
                  </span>
                  <p>
                    Tocá <strong>&ldquo;Agregar&rdquo;</strong> arriba a la derecha. ¡Listo! Ya tenés el ícono en tu pantalla.
                  </p>
                </li>
              </ol>
            </div>
          ) : (
            // Instrucciones para Android / Google Chrome u otros
            <div className="space-y-3 rounded-2xl bg-white/[0.04] p-4 border border-white/5">
              <p className="text-[12px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Pasos para Android / Google Chrome:
              </p>
              <ol className="space-y-3 text-[13px] text-neutral-200">
                <li className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-neutral-950 font-bold text-xs">
                    1
                  </span>
                  <div>
                    Tocá el menú de <strong>tres puntos</strong> en la esquina superior derecha:
                    <div className="mt-1 inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5 text-xs text-white">
                      <MoreVertical className="h-3.5 w-3.5" /> Menú de Chrome (⋮)
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-neutral-950 font-bold text-xs">
                    2
                  </span>
                  <div>
                    Seleccioná la opción:
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
                      <Download className="h-3.5 w-3.5 text-emerald-400" /> &ldquo;Instalar aplicación&rdquo; o &ldquo;Agregar a inicio&rdquo;
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-neutral-950 font-bold text-xs">
                    3
                  </span>
                  <p>
                    Confirmá tocando <strong>&ldquo;Instalar&rdquo;</strong>. La App se agregará con el logo oficial del restaurante.
                  </p>
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Botones de acción del Modal */}
        <div className="mt-6 flex flex-col gap-2.5">
          {deferredPrompt && (
            <button
              type="button"
              onClick={triggerNativePrompt}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-[14px] font-bold text-neutral-950 shadow-lg transition active:scale-[0.98] hover:bg-emerald-400"
            >
              <Download className="h-4 w-4" />
              <span>Instalar Ahora con 1 Clic</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="flex h-11 w-full items-center justify-center rounded-2xl bg-white/10 text-[13.5px] font-semibold text-white transition hover:bg-white/20 active:scale-[0.98]"
          >
            ¡Entendido!
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`${baseStyles} ${className}`}
        title="Instalar App en tu pantalla de inicio"
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </button>

      {/* Renderizado mediante Portal en document.body para evitar que cualquier overflow-hidden lo recorte */}
      {modalContent && typeof document !== 'undefined'
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}
