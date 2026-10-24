import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import { getPaymentDetails } from '@/lib/mercadopago';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Verifica opcionalmente la firma criptográfica x-signature de Mercado Pago
 * si MP_WEBHOOK_SECRET está configurada en las variables de entorno.
 */
function verifyMercadoPagoSignature(req: Request, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // Si aún no configuraste el secret en MP, continúa validando vía API getPaymentDetails

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');
  if (!xSignature || !xRequestId) return false;

  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => {
      const [k, v] = p.trim().split('=');
      return [k, v];
    })
  );

  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(parts.v1));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);

    // 1. Extraer identificador de evento / pago
    let topic = url.searchParams.get('topic') || url.searchParams.get('type') || '';
    let resourceId = url.searchParams.get('id') || url.searchParams.get('data.id') || '';

    let body: any = null;
    try {
      body = await req.json();
      if (!resourceId && body?.data?.id) {
        resourceId = String(body.data.id);
      }
      if (!topic && (body?.type || body?.topic)) {
        topic = body.type || body.topic;
      }
    } catch {
      // sin body JSON
    }

    if (!resourceId) {
      return NextResponse.json({ received: true, message: 'Ping recibido' }, { status: 200 });
    }

    // Ignorar eventos que no sean de pagos (ej. merchant_order sueltos) para ahorrar lecturas en Supabase
    const isPaymentEvent =
      topic === 'payment' || body?.action?.startsWith('payment') || !topic;
    if (!isPaymentEvent) {
      return NextResponse.json({ received: true, ignored: topic }, { status: 200 });
    }

    // 2. Verificación criptográfica de firma (si MP_WEBHOOK_SECRET está activo)
    if (!verifyMercadoPagoSignature(req, resourceId)) {
      console.warn(`[MP Webhook] Firma x-signature inválida para resourceId: ${resourceId}`);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Consultar el estado real del pago directamente en los servidores de Mercado Pago (Fuente de Verdad)
    const payment = await getPaymentDetails(resourceId);
    if (!payment) {
      return NextResponse.json({ received: true, ignored: 'Payment not found' }, { status: 200 });
    }

    const paymentStatus = String(payment.status || '');

    // Extraer store_id y plan desde metadata o external_reference
    let storeId = payment.metadata?.store_id as string | undefined;
    let plan = (payment.metadata?.plan as string | undefined) || 'monthly';

    if (!storeId && payment.external_reference) {
      const parts = String(payment.external_reference).split('::');
      storeId = parts[0];
      if (parts[1]) plan = parts[1];
    }

    // Validar que storeId sea un UUID real antes de tocar PostgreSQL
    if (!storeId || !UUID_REGEX.test(storeId)) {
      return NextResponse.json({ received: true, ignored: 'Invalid storeId UUID' }, { status: 200 });
    }

    const admin = createAdminClient();

    // 4. Clave de idempotencia vinculada al estado del pago (permite que 'in_process' -> 'approved' sí se procese)
    const eventKey = `mp-payment-${payment.id}-${paymentStatus}`;
    const { data: existing } = await admin
      .from('mp_webhook_events')
      .select('id')
      .eq('id', eventKey)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    // 5. CASO A: Pago Aprobado -> Activar o Extender Suscripción
    if (paymentStatus === 'approved') {
      const expectedAmount = plan === 'yearly' ? 500000 : 50000;
      const currency = (payment as any).currency_id || 'ARS';

      if (Number(payment.transaction_amount) < expectedAmount || currency !== 'ARS') {
        console.warn(`[MP Webhook] Monto o moneda inválida: ${payment.transaction_amount} ${currency}`);
        return NextResponse.json({ received: true, ignored: 'Amount/currency mismatch' }, { status: 200 });
      }

      const { data: currentStore, error: fetchErr } = await admin
        .from('stores')
        .select('id, slug, mp_payment_id, subscription_status, current_period_end')
        .eq('id', storeId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!currentStore) {
        return NextResponse.json({ received: true, ignored: 'Store not found' }, { status: 200 });
      }

      // Si ya fue procesado por /api/mercadopago/confirm, registramos idempotencia y salimos sin duplicar días
      if (
        currentStore.mp_payment_id === String(payment.id) &&
        currentStore.subscription_status === 'active'
      ) {
        await admin.from('mp_webhook_events').insert({ id: eventKey, topic: 'payment.approved' });
        return NextResponse.json({ received: true, alreadyProcessed: true }, { status: 200 });
      }

      // Acumulación justa: si al local aún le quedaban días vigentes, sumamos a partir de su vencimiento actual
      const daysToAdd = plan === 'yearly' ? 365 : 30;
      const currentEndMs = currentStore.current_period_end
        ? new Date(currentStore.current_period_end).getTime()
        : 0;
      const baseTimeMs = Math.max(Date.now(), currentEndMs);
      const periodEnd = new Date(baseTimeMs + daysToAdd * 86400 * 1000).toISOString();

      const { error: updateErr } = await admin
        .from('stores')
        .update({
          subscription_status: 'active',
          plan_type: plan === 'yearly' ? 'yearly' : 'monthly',
          mp_payment_id: String(payment.id),
          current_period_end: periodEnd,
        })
        .eq('id', storeId);

      if (updateErr) throw updateErr;

      // Registramos idempotencia SOLO tras confirmar que la base de datos se actualizó con éxito
      await admin.from('mp_webhook_events').insert({ id: eventKey, topic: 'payment.approved' });

      try {
        revalidatePath(`/p/${currentStore.slug}`);
      } catch {
        /* noop */
      }

      return NextResponse.json({ received: true, status: 'activated' }, { status: 200 });
    }

    // 6. CASO B: Reembolso o Contracargo (Anti-Fraude) -> Suspender inmediatamente el local
    if (paymentStatus === 'refunded' || paymentStatus === 'charged_back') {
      const { data: revokedStore, error: revokeErr } = await admin
        .from('stores')
        .update({
          subscription_status: 'canceled',
          current_period_end: new Date().toISOString(),
        })
        .eq('id', storeId)
        .eq('mp_payment_id', String(payment.id))
        .select('slug')
        .maybeSingle();

      if (revokeErr) throw revokeErr;

      await admin.from('mp_webhook_events').insert({ id: eventKey, topic: `payment.${paymentStatus}` });

      if (revokedStore?.slug) {
        try {
          revalidatePath(`/p/${revokedStore.slug}`);
        } catch {
          /* noop */
        }
      }

      return NextResponse.json({ received: true, status: 'revoked' }, { status: 200 });
    }

    // Otros estados transitorios ('pending', 'in_process', 'rejected') no bloquean futuros cambios a 'approved'
    return NextResponse.json({ received: true, status: paymentStatus }, { status: 200 });
  } catch (err: unknown) {
    console.error('Error transitorio en Webhook de Mercado Pago (reintentable):', err);
    // Devolvemos 500 cuando falla la red o DB para que Mercado Pago reintente y nunca se pierda un pago real
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  // Respuesta liviana de costo $0 para healthchecks de Mercado Pago
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
