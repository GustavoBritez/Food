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
    const paymentId = body.paymentId;

    const admin = createAdminClient();
    const { data: store } = await admin
      .from('stores')
      .select('id, slug, subscription_status, mp_payment_id, current_period_end')
      .eq('created_by', user.id)
      .maybeSingle();

    if (!store) {
      return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 });
    }

    let paymentToProcess: any = null;

    if (paymentId) {
      paymentToProcess = await getPaymentDetails(paymentId);
    } else {
      // Si no viene paymentId específico, buscar el último pago en MP asociado a esta tienda
      const token = process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (token) {
        const res = await fetch(
          `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=5&external_reference=${store.id}::monthly`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const searchData = await res.json();
        if (searchData.results && searchData.results.length > 0) {
          paymentToProcess = searchData.results[0];
        } else {
          // Buscar sin filtro exacto
          const resAll = await fetch(
            `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=10`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const allData = await resAll.json();
          paymentToProcess = allData.results?.find((p: any) =>
            p.external_reference?.startsWith(store.id)
          );
        }
      }
    }

    if (!paymentToProcess || paymentToProcess.status !== 'approved') {
      return NextResponse.json({
        updated: false,
        status: paymentToProcess?.status || 'pending',
      });
    }

    // 1. Validar que el pago pertenezca ESTRICTAMENTE a este local
    const matchesStore =
      paymentToProcess.metadata?.store_id === store.id ||
      paymentToProcess.external_reference?.startsWith(store.id);

    if (!matchesStore) {
      return NextResponse.json(
        { error: 'El comprobante de pago no corresponde a este local gastronómico.' },
        { status: 403 }
      );
    }

    // 2. Determinar plan y validar monto pagado
    let plan: 'monthly' | 'yearly' = 'monthly';
    if (
      paymentToProcess.metadata?.plan === 'yearly' ||
      paymentToProcess.external_reference?.endsWith('::yearly')
    ) {
      plan = 'yearly';
    }

    const expectedAmount = plan === 'yearly' ? 500000 : 50000;
    if (Number(paymentToProcess.transaction_amount) < expectedAmount) {
      return NextResponse.json(
        { error: 'El importe abonado no coincide con el valor del plan seleccionado.' },
        { status: 400 }
      );
    }

    // 3. Idempotencia estricta: si ya se procesó este payment_id, no sumar días duplicados
    if (
      store.mp_payment_id === String(paymentToProcess.id) &&
      store.subscription_status === 'active'
    ) {
      return NextResponse.json({
        updated: false,
        alreadyProcessed: true,
        subscription_status: 'active',
        plan_type: plan,
        payment_id: paymentToProcess.id,
        current_period_end: store.current_period_end,
      });
    }

    const daysToAdd = plan === 'yearly' ? 365 : 30;
    const periodEnd = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

    await admin
      .from('stores')
      .update({
        subscription_status: 'active',
        plan_type: plan === 'yearly' ? 'yearly' : 'monthly',
        mp_payment_id: String(paymentToProcess.id),
        current_period_end: periodEnd,
      })
      .eq('id', store.id);

    try {
      revalidatePath(`/p/${store.slug}`);
      revalidatePath('/admin');
    } catch {
      /* noop */
    }

    return NextResponse.json({
      updated: true,
      subscription_status: 'active',
      plan_type: plan,
      payment_id: paymentToProcess.id,
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
