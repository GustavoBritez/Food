'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { Store } from '@/lib/types';

type Props = {
  store: Store;
};

export function SubscriptionBanner({ store }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isDemo = store.id === 'demo-store';
  const status = isDemo ? 'active' : store.subscription_status || 'inactive';

  const periodEndFormatted = store.current_period_end
    ? new Intl.DateTimeFormat('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(store.current_period_end))
    : null;

  async function handleCheckout() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar checkout');
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado');
      setLoading(false);
    }
  }

  async function handleOpenPortal() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al abrir el portal de facturación');
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado');
      setLoading(false);
    }
  }

  // A. MODO DEMO
  if (isDemo) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-800 sm:text-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">Modo Demostración Activo:</span>
          <span>Suscripción simulada como activa ($30 USD/mes).</span>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-700 text-[11px]">
          Demo
        </span>
      </div>
    );
  }

  // B. SUSCRIPCIÓN ACTIVA
  if (status === 'active' || status === 'trialing') {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 text-xs text-neutral-800 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
        <div className="flex items-start gap-3 sm:items-center">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink">Plan Carta App Pro</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                $30 USD / mes · Activo
              </span>
            </div>
            {periodEndFormatted && (
              <p className="mt-0.5 text-xs text-neutral-500">
                Próxima renovación programada: <span className="font-medium">{periodEndFormatted}</span>
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenPortal}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-60 sm:self-auto"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CreditCard className="h-3.5 w-3.5 text-neutral-500" />
          )}
          <span>Gestionar Facturas / Tarjeta</span>
          <ExternalLink className="h-3 w-3 text-neutral-400" />
        </button>
      </div>
    );
  }

  // C. PAGO PENDIENTE (PAST DUE)
  if (status === 'past_due') {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 sm:text-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">
                Pago de renovación pendiente ($30 USD)
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                Hubo un inconveniente al debitar la suscripción de tu tarjeta. Tu carta pública está momentáneamente pausada para evitar visitas no autorizadas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenPortal}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
            <span>Actualizar Tarjeta en Stripe</span>
          </button>
        </div>
      </div>
    );
  }

  // D. SUSCRIPCIÓN INACTIVA / CANCELADA (PAYWALL)
  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-r from-neutral-900 to-neutral-950 p-5 text-white shadow-xl sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
              <ShieldAlert className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">
              Suscripción Requerida
            </span>
          </div>
          <h3 className="text-lg font-bold tracking-tight text-white sm:text-xl">
            Activa tu Carta Digital por solo <span className="text-emerald-400">$30 USD / mes</span>
          </h3>
          <p className="max-w-xl text-xs text-neutral-300 sm:text-sm">
            Para habilitar la edición de tu catálogo y que tus clientes puedan escanear el QR y hacer pedidos por WhatsApp en vivo, activa tu suscripción mensual oficial.
          </p>

          <ul className="grid gap-1 pt-1 text-xs text-neutral-300 sm:grid-cols-2">
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Carta online 24/7 sin límites de visitas
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Pedidos directos a tu WhatsApp
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Generador de QR para tus mesas
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Cancela cuando quieras con 1 clic
            </li>
          </ul>

          {errorMsg && (
            <p className="text-xs font-medium text-red-400">
              ⚠️ {errorMsg}
            </p>
          )}
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-neutral-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 lg:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-neutral-950" />
                <span>Conectando con Stripe...</span>
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                <span>Activar Plan Pro ($30 USD)</span>
              </>
            )}
          </button>
          <span className="text-[11px] text-neutral-400">
            Procesado con cifrado bancario vía Stripe
          </span>
        </div>
      </div>
    </div>
  );
}
