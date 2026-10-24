import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPaymentDetails } from '@/lib/mercadopago';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawPaymentId = body?.paymentId ? String(body.paymentId).trim() : '';

    // 1. Sanitización Anti-Path Traversal: paymentId de Mercado Pago es estrictamente numérico
    if (rawPaymentId && !/^\d{5,20}$/.test(rawPaymentId)) {
      return NextResponse.json({ error: 'ID de pago inválido' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: store } = await admin
      .from('stores')
      .select('id, slug, subscription_status, plan_type, mp_payment_id, current_period_end, extra_branches_purchased')
      .eq('created_by', user.id)
      .is('parent_store_id', null)
      .maybeSingle();

    if (!store) {
      return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 });
    }

    let paymentToProcess: any = null;

    if (rawPaymentId) {
      paymentToProcess = await getPaymentDetails(rawPaymentId);
    } else {
      // Buscar tanto referencias mensuales, anuales como de puntos de venta extras de esta tienda específica
      const token = process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (token) {
        const [resMonthly, resYearly, resExtra] = await Promise.all([
          fetch(
            `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=3&external_reference=${store.id}::monthly`,
            { headers: { Authorization: `Bearer ${token}` } }
          ).then((r) => r.json().catch(() => ({}))),
          fetch(
            `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=3&external_reference=${store.id}::yearly`,
            { headers: { Authorization: `Bearer ${token}` } }
          ).then((r) => r.json().catch(() => ({}))),
          fetch(
            `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=3&external_reference=${store.id}::extra_branch`,
            { headers: { Authorization: `Bearer ${token}` } }
          ).then((r) => r.json().catch(() => ({}))),
        ]);

        const combined = [
          ...(resMonthly?.results || []),
          ...(resYearly?.results || []),
          ...(resExtra?.results || []),
        ].filter((p: any) => p.status === 'approved');

        // Ordenar por fecha de aprobación más reciente
        combined.sort(
          (a: any, b: any) =>
            new Date(b.date_approved || b.date_created).getTime() -
            new Date(a.date_approved || a.date_created).getTime()
        );

        paymentToProcess = combined[0] || null;
      }
    }

    if (!paymentToProcess || paymentToProcess.status !== 'approved') {
      return NextResponse.json({
        updated: false,
        status: paymentToProcess?.status || 'pending',
      });
    }

    // 2. Validar que el pago pertenezca ESTRICTAMENTE a este local
    const matchesStore =
      paymentToProcess.metadata?.store_id === store.id ||
      String(paymentToProcess.external_reference || '').startsWith(store.id);

    if (!matchesStore) {
      return NextResponse.json(
        { error: 'El comprobante de pago no corresponde a este local gastronómico.' },
        { status: 403 }
      );
    }

    // 3. Validar moneda y antigüedad del pago (Anti-Replay Attack de pagos viejos)
    const approvedDateMs = new Date(
      paymentToProcess.date_approved || paymentToProcess.date_created || 0
    ).getTime();
    const maxPaymentAgeMs = 7 * 24 * 60 * 60 * 1000; // Máximo 7 días de antigüedad para confirmar manualmente

    if (!approvedDateMs || Date.now() - approvedDateMs > maxPaymentAgeMs) {
      return NextResponse.json({
        updated: false,
        alreadyProcessed: true,
        error: 'Este pago ya fue procesado anteriormente o ha expirado su ventana de confirmación.',
      });
    }

    // 4. Determinar plan y validar monto y moneda
    let plan: 'monthly' | 'yearly' | 'extra_branch' = 'monthly';
    if (
      paymentToProcess.metadata?.plan === 'yearly' ||
      String(paymentToProcess.external_reference || '').endsWith('::yearly')
    ) {
      plan = 'yearly';
    } else if (
      paymentToProcess.metadata?.plan === 'extra_branch' ||
      String(paymentToProcess.external_reference || '').endsWith('::extra_branch')
    ) {
      plan = 'extra_branch';
    }

    const expectedAmount =
      plan === 'yearly' ? 500000 : plan === 'extra_branch' ? 25000 : 50000;
    const currency = paymentToProcess.currency_id || 'ARS';

    if (Number(paymentToProcess.transaction_amount) < expectedAmount || currency !== 'ARS') {
      return NextResponse.json(
        { error: 'El importe o moneda abonada no coincide con el valor del plan seleccionado.' },
        { status: 400 }
      );
    }

    const paymentIdStr = String(paymentToProcess.id);
    const eventKey = `mp-payment-${paymentIdStr}-approved`;

    // 5. Candado Atómico en Base de Datos (Evita Race Condition con el Webhook y el Replay Attack)
    const { error: lockError } = await admin.from('mp_webhook_events').insert({
      id: eventKey,
      topic: plan === 'extra_branch' ? 'extra_branch.approved.confirm' : 'payment.approved.confirm',
    });

    if (lockError) {
      // Si el código es 23505 (Unique Violation), el Webhook o una llamada previa ya acreditó este pago
      if (lockError.code === '23505' || store.mp_payment_id === paymentIdStr) {
        return NextResponse.json({
          updated: false,
          alreadyProcessed: true,
          subscription_status: store.subscription_status,
          plan_type: store.plan_type || plan,
          payment_id: paymentIdStr,
          current_period_end: store.current_period_end,
          type: plan,
        });
      }
      throw lockError;
    }

    // Si es un local o food truck adicional ($25.000 ARS)
    if (plan === 'extra_branch') {
      const nextExtra = (store.extra_branches_purchased || 0) + 1;
      const { error: updateErr } = await admin
        .from('stores')
        .update({
          extra_branches_purchased: nextExtra,
        })
        .eq('id', store.id);

      if (updateErr) {
        await admin.from('mp_webhook_events').delete().eq('id', eventKey);
        throw updateErr;
      }

      return NextResponse.json({
        updated: true,
        type: 'extra_branch',
        extra_branches_purchased: nextExtra,
        payment_id: paymentIdStr,
      });
    }

    // 6. Sumar días respetando el saldo de días vigentes que ya tuviera el local
    const daysToAdd = plan === 'yearly' ? 365 : 30;
    const currentEndMs = store.current_period_end
      ? new Date(store.current_period_end).getTime()
      : 0;
    const baseTimeMs = Math.max(Date.now(), currentEndMs);
    const periodEnd = new Date(baseTimeMs + daysToAdd * 86400 * 1000).toISOString();

    const { error: updateErr } = await admin
      .from('stores')
      .update({
        subscription_status: 'active',
        plan_type: plan,
        mp_payment_id: paymentIdStr,
        current_period_end: periodEnd,
      })
      .eq('id', store.id);

    if (updateErr) {
      // Si falló la actualización de la tienda, liberamos el candado para permitir reintento
      await admin.from('mp_webhook_events').delete().eq('id', eventKey);
      throw updateErr;
    }

    try {
      revalidatePath(`/p/${store.slug}`);
    } catch {
      /* noop */
    }

    return NextResponse.json({
      updated: true,
      subscription_status: 'active',
      plan_type: plan,
      payment_id: paymentIdStr,
      current_period_end: periodEnd,
    });
  } catch (err: unknown) {
    console.error('Error confirmando pago:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al confirmar pago' },
      { status: 500 }
    );
  }
}
