import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPaymentDetails } from '@/lib/mercadopago';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);

    // 1. Extraer identificador de evento / pago
    let topic = url.searchParams.get('topic') || url.searchParams.get('type') || '';
    let resourceId = url.searchParams.get('id') || url.searchParams.get('data.id') || '';

    // Si viene en el body JSON
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

    // Mercado Pago envía pruebas de conexión sin ID
    if (!resourceId) {
      return NextResponse.json({ received: true, message: 'Ping recibido' }, { status: 200 });
    }

    const admin = createAdminClient();

    // 2. Idempotencia: Verificar si este evento ya fue procesado
    const eventKey = `mp-${topic || 'event'}-${resourceId}`;
    const { data: existing } = await admin
      .from('mp_webhook_events')
      .select('id')
      .eq('id', eventKey)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    // 3. Procesar notificaciones de pago
    if (topic === 'payment' || body?.action?.startsWith('payment') || !topic) {
      try {
        const payment = await getPaymentDetails(resourceId);

        if (payment && payment.status === 'approved') {
          // Extraer store_id y plan desde external_reference o metadata
          let storeId = payment.metadata?.store_id;
          let plan = payment.metadata?.plan || 'monthly';

          if (!storeId && payment.external_reference) {
            const parts = payment.external_reference.split('::');
            storeId = parts[0];
            if (parts[1]) plan = parts[1];
          }

          if (storeId) {
            const daysToAdd = plan === 'yearly' ? 365 : 30;
            const periodEnd = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

            const { data: storeData } = await admin
              .from('stores')
              .update({
                subscription_status: 'active',
                plan_type: plan === 'yearly' ? 'yearly' : 'monthly',
                mp_payment_id: String(payment.id),
                current_period_end: periodEnd,
              })
              .eq('id', storeId)
              .select('slug')
              .maybeSingle();

            if (storeData?.slug) {
              try {
                revalidatePath(`/p/${storeData.slug}`);
                revalidatePath('/admin');
              } catch {
                /* noop */
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error consultando pago ${resourceId} en Mercado Pago:`, err);
      }
    }

    // 4. Registrar en tabla de idempotencia
    try {
      await admin.from('mp_webhook_events').insert({
        id: eventKey,
        topic: topic || 'unknown',
      });
    } catch {
      /* noop */
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: unknown) {
    console.error('Error general en Webhook de Mercado Pago:', err);
    // Respondemos 200 a MP para evitar reintentos infinitos si fue un error no recuperable
    return NextResponse.json({ received: true, error: true }, { status: 200 });
  }
}

export async function GET(req: Request) {
  // Para validaciones GET de Mercado Pago IPN
  return POST(req);
}
