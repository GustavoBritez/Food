'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { Store } from '@/lib/types';
import { MERCADOPAGO_PLANS, TRIAL_CONFIG, type PlanId } from '@/lib/mercadopago';

type Props = {
  store: Store;
};

export function SubscriptionBanner({ store }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [activatingTrial, setActivatingTrial] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);

  const isDemo = store.id === 'demo-store';
  const status = isDemo ? 'active' : store.subscription_status || 'inactive';

  // Mitigación y sincronización en vivo al volver de Mercado Pago Checkout Pro
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const billingParam = params.get('billing');
    const statusParam = params.get('status') || params.get('collection_status');
    const paymentId = params.get('payment_id') || params.get('collection_id');

    if (
      (billingParam === 'success' || statusParam === 'approved' || paymentId) &&
      status !== 'active'
    ) {
      setCheckingPayment(true);
      fetch('/api/mercadopago/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.updated) {
            window.location.href = '/admin?confirmed=1';
          } else {
            setTimeout(() => {
              window.location.href = '/admin';
            }, 2500);
          }
        })
        .catch(() => {
          setTimeout(() => {
            window.location.href = '/admin';
          }, 2500);
        });
    }
  }, [status]);

  // Formato de fechas
  const periodEndFormatted = store.current_period_end
    ? new Intl.DateTimeFormat('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(store.current_period_end))
    : null;

  // Cálculo de días restantes de prueba
  const trialDaysRemaining = store.trial_end
    ? Math.max(0, Math.ceil((new Date(store.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Manejo de checkout con Mercado Pago
  async function handleMercadoPagoCheckout(plan: PlanId) {
    setLoadingPlan(plan);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/mercadopago/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar checkout con Mercado Pago');
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado');
      setLoadingPlan(null);
    }
  }

  // Manejo de activación del mes gratis
  async function handleActivateTrial() {
    setActivatingTrial(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/mercadopago/trial', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al activar mes gratuito');
      }
      window.location.href = '/admin?trial=activated';
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Error al activar prueba gratuita');
      setActivatingTrial(false);
    }
  }

  // Estado de confirmación de pago al volver de Mercado Pago
  if (checkingPayment) {
    return (
      <div className="flex items-center gap-3.5 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5 text-sky-950 shadow-sm animate-pulse">
        <Loader2 className="h-6 w-6 animate-spin text-[#009ee3] shrink-0" />
        <div>
          <p className="text-sm font-bold text-sky-950">¡Pago recibido! Confirmando con Mercado Pago...</p>
          <p className="text-xs text-sky-800 mt-0.5">
            Mercado Pago procesó tu pago con éxito. Estamos activando tu local en unos segundos.
          </p>
        </div>
      </div>
    );
  }

  // A. MODO DEMO
  if (isDemo) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-800 sm:text-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">Modo Demostración Activo:</span>
          <span>Suscripción simulada como activa ($50.000 ARS/mes).</span>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-700 text-[11px]">
          Demo
        </span>
      </div>
    );
  }

  // B. PRIMER MES GRATIS ACTIVO (TRIAL)
  if (status === 'trialing') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50/40 p-5 text-neutral-800 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-bold text-neutral-900">Primer Mes Gratuito en Curso</span>
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                  {trialDaysRemaining !== null ? `${trialDaysRemaining} días restantes` : 'Prueba activa'}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                Estás disfrutando de tu período de prueba sin cargo. Tu carta está 100% activa para recibir pedidos.
                {periodEndFormatted && (
                  <span className="font-medium text-neutral-800"> Válido hasta el {periodEndFormatted}.</span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPlansModal(!showPlansModal)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-black active:scale-95 shrink-0"
          >
            <span>{showPlansModal ? 'Ocultar planes' : 'Elegir plan para continuar'}</span>
            {showPlansModal ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Tarjetas de planes desplegables mientras está en trial */}
        {showPlansModal && renderPlanCards()}
      </div>
    );
  }

  // C. SUSCRIPCIÓN ACTIVA VÍA MERCADO PAGO
  if (status === 'active') {
    const isYearly = store.plan_type === 'yearly';

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 text-xs text-neutral-800 sm:flex-row sm:items-center sm:justify-between sm:text-sm shadow-xs">
          <div className="flex items-start gap-3.5 sm:items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[15px] text-ink">
                  Plan Carta App Pro {isYearly ? '(Anual)' : '(Mensual)'}
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                  {isYearly ? '$500.000 ARS / año · Activo (Plan Máximo)' : '$50.000 ARS / mes · Activo'}
                </span>
              </div>
              {periodEndFormatted && (
                <p className="mt-1 text-xs text-neutral-500">
                  Período vigente hasta: <span className="font-semibold text-neutral-800">{periodEndFormatted}</span>
                </p>
              )}
            </div>
          </div>

          {isYearly ? (
            <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-800 sm:self-auto">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Plan Máximo Activo</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPlansModal(!showPlansModal)}
              className="inline-flex items-center justify-center gap-1.5 self-start rounded-full bg-[#1a73e8] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1557b0] active:scale-95 sm:self-auto"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{showPlansModal ? 'Cerrar opción anual' : 'Mejorar a Plan Anual (Ahorrá $100.000)'}</span>
              {showPlansModal ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {errorMsg && renderErrorMessage()}
        {!isYearly && showPlansModal && renderPlanCards()}
      </div>
    );
  }

  // D. PAGO PENDIENTE (PAST DUE)
  if (status === 'past_due') {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-xs text-amber-900 sm:text-sm shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[15px] text-amber-950">
                  Período finalizado · Renovación pendiente
                </p>
                <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
                  Tu período de suscripción ha concluido. Elegí tu plan para reactivar la edición y recepción de pedidos al instante.
                </p>
              </div>
            </div>
          </div>
        </div>

        {renderPlanCards()}
      </div>
    );
  }

  // E. SUSCRIPCIÓN INACTIVA / NUEVO LOCAL (SELECCIÓN DE PLAN ESTILO GOOGLE ONE)
  return (
    <div className="space-y-5">
      <div className="text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[12px] font-semibold text-blue-700 mb-2">
          <ShieldCheck className="h-3.5 w-3.5" /> Planes y Suscripción Carta App
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
          Elegí el plan perfecto para tu local
        </h2>
        <p className="mt-1 text-sm text-neutral-600 max-w-2xl">
          El primer mes es 100% gratuito. Después podés elegir entre pago mensual o anual con descuento exclusivo vía Mercado Pago.
        </p>
      </div>

      {errorMsg && renderErrorMessage()}
      {renderPlanCards()}
    </div>
  );

  function renderErrorMessage() {
    return (
      <div className="flex items-start justify-between gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 animate-fade-in">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
        <button
          type="button"
          onClick={() => setErrorMsg(null)}
          className="text-red-700 hover:text-red-900 text-xs font-semibold"
        >
          Cerrar
        </button>
      </div>
    );
  }

  // Tarjetas de planes filtradas: solo planes superiores o nada si ya tiene anual
  function renderPlanCards() {
    const isTrialActive = status === 'trialing' || store.plan_type === 'trial';
    const isTrialUsed = Boolean(
      isTrialActive || (store.trial_end && new Date(store.trial_end).getTime() < Date.now())
    );
    const isMonthlyActive = status === 'active' && store.plan_type === 'monthly';
    const isYearlyActive = status === 'active' && store.plan_type === 'yearly';

    // Regla de negocio estricta:
    // Si la persona ya tiene un plan asignado entonces no le puede aparecer para comprar dicho plan.
    // Debe aparecerle unicamente un plan superior o nada en caso de tener el plan anual ya asignado.
    const showTrial = !isTrialUsed && !isTrialActive && status !== 'active';
    const showMonthly = !isMonthlyActive && !isYearlyActive && !isTrialActive;
    const showYearly = !isYearlyActive;

    // En período de prueba (trial), los planes superiores para continuar son Mensual y Anual
    const canShowMonthlyInTrial = status === 'trialing';
    const effectiveShowMonthly = showMonthly || canShowMonthlyInTrial;

    const cardCount = [showTrial, effectiveShowMonthly, showYearly].filter(Boolean).length;
    if (cardCount === 0) return null;

    const gridClass =
      cardCount === 1
        ? 'grid grid-cols-1 max-w-md mx-auto gap-5 lg:gap-6 pt-2'
        : cardCount === 2
        ? 'grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-5 lg:gap-6 pt-2'
        : 'grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 pt-2';

    return (
      <div className="space-y-4">
        {isMonthlyActive && (
          <div className="rounded-2xl border border-[#1a73e8]/30 bg-blue-50/70 p-4 text-xs text-blue-950 sm:text-sm">
            <div className="flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-[#1a73e8] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-950">Plan superior disponible: Plan Anual Pro</p>
                <p className="mt-0.5 text-xs text-blue-800 leading-relaxed">
                  Ya contás con el Plan Mensual activo. Mejorá tu suscripción al Plan Anual para obtener 2 meses bonificados ($100.000 ARS de ahorro directo) y asegurar tu carta todo el año.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className={gridClass}>
          {/* =========================================================================
              TARJETA 1: GRATIS (Primer mes gratuito)
             ========================================================================= */}
          {showTrial && (
            <div className="relative flex flex-col justify-between rounded-[32px] border border-neutral-200 bg-white p-6 sm:p-7 shadow-xs hover:border-neutral-300 transition-all duration-200">
              <div>
                <h3 className="text-[26px] font-bold tracking-tight text-neutral-900">
                  {TRIAL_CONFIG.name}
                </h3>

                <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-600 min-h-[56px]">
                  Obtén <strong className="font-semibold text-neutral-900">30 días de prueba gratuita</strong> para digitalizar tu carta, recibir pedidos por WhatsApp y probar con tus clientes.
                </p>

                {/* Precio */}
                <div className="mt-6 pt-4 border-t border-neutral-100">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-semibold text-neutral-900">$</span>
                    <span className="text-4xl sm:text-[42px] font-extrabold tracking-tight text-neutral-900">
                      0
                    </span>
                    <span className="text-[13px] font-medium text-neutral-500">
                      ARS {TRIAL_CONFIG.interval}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-neutral-500">
                    {TRIAL_CONFIG.subtext}
                  </p>
                </div>

                {/* Lista de características */}
                <ul className="mt-6 space-y-2.5 text-[13px] text-neutral-700">
                  {TRIAL_CONFIG.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <button
                  type="button"
                  disabled={activatingTrial || isTrialUsed || status === 'trialing' || status === 'active'}
                  onClick={handleActivateTrial}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full border border-neutral-300 bg-white px-6 text-[14px] font-semibold text-neutral-900 transition hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {activatingTrial ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Activando mes gratis...</span>
                    </>
                  ) : status === 'trialing' ? (
                    'Prueba en curso'
                  ) : isTrialUsed ? (
                    'Prueba ya utilizada'
                  ) : (
                    'Comenzar'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              TARJETA 2: PLAN MENSUAL ($50.000 ARS / mes)
             ========================================================================= */}
          {effectiveShowMonthly && (
            <div className="relative flex flex-col justify-between rounded-[32px] border border-neutral-200 bg-white p-6 sm:p-7 shadow-xs hover:border-neutral-300 transition-all duration-200">
              <div>
                <h3 className="text-[26px] font-bold tracking-tight text-neutral-900">
                  {MERCADOPAGO_PLANS.monthly.name}
                </h3>

                <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-600 min-h-[56px]">
                  Obtén <strong className="font-semibold text-neutral-900">acceso ilimitado</strong> a pedidos por WhatsApp, mozo en mesa, QR de alta resolución y catálogo visual.
                </p>

                {/* Precio */}
                <div className="mt-6 pt-4 border-t border-neutral-100">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-semibold text-neutral-900">$</span>
                    <span className="text-3xl sm:text-[38px] font-extrabold tracking-tight text-neutral-900">
                      {MERCADOPAGO_PLANS.monthly.formattedPrice}
                    </span>
                    <span className="text-[13px] font-medium text-neutral-500">
                      ARS {MERCADOPAGO_PLANS.monthly.interval}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-neutral-500">
                    Cobro mensual vía Mercado Pago
                  </p>
                </div>

                {/* Lista de características */}
                <ul className="mt-6 space-y-2.5 text-[13px] text-neutral-700">
                  {MERCADOPAGO_PLANS.monthly.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-[#1a73e8] shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <button
                  type="button"
                  disabled={loadingPlan !== null}
                  onClick={() => handleMercadoPagoCheckout('monthly')}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#1a73e8] px-6 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#1557b0] active:scale-[0.98] disabled:opacity-50"
                >
                  {loadingPlan === 'monthly' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Conectando con Mercado Pago...</span>
                    </>
                  ) : (
                    'Comenzar'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              TARJETA 3: PLAN ANUAL ($500.000 ARS / año) - DESTACADO / MÁS ELEGIDO
             ========================================================================= */}
          {showYearly && (
            <div className="relative flex flex-col justify-between rounded-[32px] border-2 border-[#1a73e8] bg-white p-6 sm:p-7 shadow-md transition-all duration-200">
              {/* Pill superior destacada */}
              <div className="absolute -top-3.5 left-6 right-6 flex justify-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#1a73e8] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
                  <Sparkles className="h-3 w-3" /> Ahorrás $100.000 (2 meses gratis)
                </span>
              </div>

              <div className="pt-2">
                <h3 className="text-[26px] font-bold tracking-tight text-neutral-900">
                  {MERCADOPAGO_PLANS.yearly.name}
                </h3>

                <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-600 min-h-[56px]">
                  Obtén <strong className="font-semibold text-neutral-900">la opción más conveniente</strong>. Asegurá tu carta todo el año al mejor precio garantizado.
                </p>

                {/* Precio */}
                <div className="mt-6 pt-4 border-t border-neutral-100">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-semibold text-neutral-900">$</span>
                    <span className="text-3xl sm:text-[38px] font-extrabold tracking-tight text-neutral-900">
                      {MERCADOPAGO_PLANS.yearly.formattedPrice}
                    </span>
                    <span className="text-[13px] font-medium text-neutral-500">
                      ARS {MERCADOPAGO_PLANS.yearly.interval}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] font-semibold text-emerald-600">
                    Equivale a solo $41.666 ARS por mes
                  </p>
                </div>

                {/* Lista de características */}
                <ul className="mt-6 space-y-2.5 text-[13px] text-neutral-700">
                  {MERCADOPAGO_PLANS.yearly.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-[#1a73e8] shrink-0 mt-0.5" />
                      <span className={feature.includes('bonificados') ? 'font-semibold text-neutral-900' : ''}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <button
                  type="button"
                  disabled={loadingPlan !== null}
                  onClick={() => handleMercadoPagoCheckout('yearly')}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#1a73e8] px-6 text-[14px] font-semibold text-white shadow-md transition hover:bg-[#1557b0] active:scale-[0.98] disabled:opacity-50"
                >
                  {loadingPlan === 'yearly' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Conectando con Mercado Pago...</span>
                    </>
                  ) : isMonthlyActive ? (
                    'Mejorar a Plan Anual'
                  ) : (
                    'Comenzar'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}
