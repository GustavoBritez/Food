import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

// Desactivamos el parser de Next.js para leer el stream en crudo
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Falta cabecera stripe-signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('CRÍTICO: STRIPE_WEBHOOK_SECRET no está configurada.');
    return NextResponse.json({ error: 'Configuración incompleta en el servidor' }, { status: 500 });
  }

  let event: Stripe.Event;

  // 1. Verificación criptográfica obligatoria de la firma
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error de verificación de firma';
    console.error(`Firma de Webhook no válida: ${message}`);
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // 2. Control de Idempotencia: evitamos ataques de repetición o reprocesamiento
  const { error: idempotencyError } = await adminSupabase
    .from('stripe_webhook_events')
    .insert({ id: event.id });

  if (idempotencyError) {
    // Código de error 23505 en PostgreSQL = clave primaria duplicada
    if (idempotencyError.code === '23505') {
      console.log(`[Stripe Webhook] Evento ya procesado previamente: ${event.id}`);
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }
    console.error('Error al registrar evento de idempotencia:', idempotencyError);
  }

  // Helper para invalidar la caché pública ISR de la carta
  const invalidateStoreCache = async (slug?: string | null) => {
    if (slug) {
      try {
        revalidatePath(`/p/${slug}`);
        console.log(`[Cache Invalidation] Caché ISR purgada para /p/${slug}`);
      } catch (err) {
        console.error(`Error invalidando caché para /p/${slug}:`, err);
      }
    }
  };

  try {
    switch (event.type) {
      // -----------------------------------------------------------------------
      // A. Checkout completado: primera suscripción confirmada
      // -----------------------------------------------------------------------
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const storeId = (session.client_reference_id || session.metadata?.store_id) as string;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!storeId || !subscriptionId) {
          console.warn('[checkout.session.completed] Sin storeId o subscriptionId:', session.id);
          break;
        }

        // Obtenemos los detalles de la suscripción creada en Stripe
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const rawPeriodEnd = (sub as any).current_period_end ?? (sub.items?.data?.[0] as any)?.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400;
        const periodEnd = new Date(Number(rawPeriodEnd) * 1000).toISOString();
        const priceId = sub.items?.data?.[0]?.price?.id || null;

        const { data: updatedStore, error: updateErr } = await adminSupabase
          .from('stores')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: sub.status === 'active' || sub.status === 'trialing' ? 'active' : sub.status,
            current_period_end: periodEnd,
            plan_price_id: priceId,
          })
          .eq('id', storeId)
          .select('slug')
          .single();

        if (updateErr) {
          console.error('Error actualizando store tras checkout:', updateErr);
        } else if (updatedStore?.slug) {
          await invalidateStoreCache(updatedStore.slug);
        }
        break;
      }

      // -----------------------------------------------------------------------
      // B. Pago de factura exitoso (renovación mensual de $30 USD)
      // -----------------------------------------------------------------------
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (
          (invoice as any).subscription ||
          (invoice as any).parent?.subscription_details?.subscription
        ) as string | undefined;
        const customerId = invoice.customer as string;

        if (!subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const rawPeriodEnd = (sub as any).current_period_end ?? (sub.items?.data?.[0] as any)?.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400;
        const periodEnd = new Date(Number(rawPeriodEnd) * 1000).toISOString();
        const priceId = sub.items?.data?.[0]?.price?.id || null;

        const { data: updatedStore, error: updateErr } = await adminSupabase
          .from('stores')
          .update({
            subscription_status: 'active',
            current_period_end: periodEnd,
            plan_price_id: priceId,
          })
          .or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`)
          .select('slug')
          .maybeSingle();

        if (updateErr) {
          console.error('Error en invoice.paid:', updateErr);
        } else if (updatedStore?.slug) {
          await invalidateStoreCache(updatedStore.slug);
        }
        break;
      }

      // -----------------------------------------------------------------------
      // C. Pago de factura fallido (tarjeta rechazada / sin fondos)
      // -----------------------------------------------------------------------
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (
          (invoice as any).subscription ||
          (invoice as any).parent?.subscription_details?.subscription
        ) as string | undefined;
        const customerId = invoice.customer as string;

        const { data: updatedStore, error: updateErr } = await adminSupabase
          .from('stores')
          .update({
            subscription_status: 'past_due',
          })
          .or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`)
          .select('slug')
          .maybeSingle();

        if (updateErr) {
          console.error('Error en invoice.payment_failed:', updateErr);
        } else if (updatedStore?.slug) {
          // Inmediata purga de caché pública para tumbar la carta no paga
          await invalidateStoreCache(updatedStore.slug);
        }
        break;
      }

      // -----------------------------------------------------------------------
      // D. Cambio en el estado de la suscripción (pausas, cancelaciones, cambios)
      // -----------------------------------------------------------------------
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const rawPeriodEnd = (sub as any).current_period_end ?? (sub.items?.data?.[0] as any)?.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400;
        const periodEnd = new Date(Number(rawPeriodEnd) * 1000).toISOString();
        const priceId = sub.items?.data?.[0]?.price?.id || null;

        // Mapeo seguro de estados de Stripe a los definidos en DB
        const mappedStatus =
          sub.status === 'active' || sub.status === 'trialing'
            ? sub.status
            : sub.status === 'past_due'
            ? 'past_due'
            : sub.status === 'canceled'
            ? 'canceled'
            : 'unpaid';

        const { data: updatedStore, error: updateErr } = await adminSupabase
          .from('stores')
          .update({
            stripe_subscription_id: sub.id,
            subscription_status: mappedStatus,
            current_period_end: periodEnd,
            plan_price_id: priceId,
          })
          .or(`stripe_subscription_id.eq.${sub.id},stripe_customer_id.eq.${customerId}`)
          .select('slug')
          .maybeSingle();

        if (updateErr) {
          console.error('Error en customer.subscription.updated:', updateErr);
        } else if (updatedStore?.slug) {
          // Revalidamos la carta pública
          await invalidateStoreCache(updatedStore.slug);
        }
        break;
      }

      // -----------------------------------------------------------------------
      // E. Cancelación total de la suscripción
      // -----------------------------------------------------------------------
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const { data: updatedStore, error: updateErr } = await adminSupabase
          .from('stores')
          .update({
            subscription_status: 'canceled',
          })
          .or(`stripe_subscription_id.eq.${sub.id},stripe_customer_id.eq.${customerId}`)
          .select('slug')
          .maybeSingle();

        if (updateErr) {
          console.error('Error en customer.subscription.deleted:', updateErr);
        } else if (updatedStore?.slug) {
          // Tumbamos la caché pública en el acto
          await invalidateStoreCache(updatedStore.slug);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Evento ignorado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Error procesando Stripe Webhook:', error);
    const message = error instanceof Error ? error.message : 'Error interno de webhook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
