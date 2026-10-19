import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

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

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error de verificación de firma';
    console.error(`Firma de Webhook no válida: ${message}`);
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // 1. Verificamos si el evento ya fue procesado exitosamente antes
  const { data: existingEvent } = await adminSupabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle();

  if (existingEvent) {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

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

  // Helper seguro para construir el filtro sin inyectar "undefined"
  const buildStoreMatchFilter = (subscriptionId?: string | null, customerId?: string | null) => {
    const filters: string[] = [];
    if (subscriptionId) filters.push(`stripe_subscription_id.eq.${subscriptionId}`);
    if (customerId) filters.push(`stripe_customer_id.eq.${customerId}`);
    return filters.join(',');
  };

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const storeId = (session.client_reference_id || session.metadata?.store_id) as string;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!storeId || !subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const rawPeriodEnd =
          (sub as any).current_period_end ??
          (sub.items?.data?.[0] as any)?.current_period_end ??
          Math.floor(Date.now() / 1000) + 30 * 86400;
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

        if (updateErr) throw updateErr;
        await invalidateStoreCache(updatedStore?.slug);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (
          (invoice as any).subscription ||
          (invoice as any).parent?.subscription_details?.subscription
        ) as string | undefined;
        const customerId = invoice.customer as string;

        if (!subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const rawPeriodEnd =
          (sub as any).current_period_end ??
          (sub.items?.data?.[0] as any)?.current_period_end ??
          Math.floor(Date.now() / 1000) + 30 * 86400;
        const periodEnd = new Date(Number(rawPeriodEnd) * 1000).toISOString();
        const priceId = sub.items?.data?.[0]?.price?.id || null;
        const storeIdFromMeta = sub.metadata?.store_id;

        const filter = buildStoreMatchFilter(subscriptionId, customerId);
        let query = adminSupabase
          .from('stores')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: 'active',
            current_period_end: periodEnd,
            plan_price_id: priceId,
          });

        query = storeIdFromMeta ? query.eq('id', storeIdFromMeta) : query.or(filter);

        const { data: updatedStore, error: updateErr } = await query.select('slug').maybeSingle();
        if (updateErr) throw updateErr;
        await invalidateStoreCache(updatedStore?.slug);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (
          (invoice as any).subscription ||
          (invoice as any).parent?.subscription_details?.subscription
        ) as string | undefined;
        const customerId = invoice.customer as string;

        const filter = buildStoreMatchFilter(subscriptionId, customerId);
        if (!filter) break;

        const { data: updatedStore, error: updateErr } = await adminSupabase
          .from('stores')
          .update({ subscription_status: 'past_due' })
          .or(filter)
          .select('slug')
          .maybeSingle();

        if (updateErr) throw updateErr;
        await invalidateStoreCache(updatedStore?.slug);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const rawPeriodEnd =
          (sub as any).current_period_end ??
          (sub.items?.data?.[0] as any)?.current_period_end ??
          Math.floor(Date.now() / 1000) + 30 * 86400;
        const periodEnd = new Date(Number(rawPeriodEnd) * 1000).toISOString();
        const priceId = sub.items?.data?.[0]?.price?.id || null;

        const mappedStatus =
          sub.status === 'active' || sub.status === 'trialing'
            ? sub.status
            : sub.status === 'past_due'
            ? 'past_due'
            : sub.status === 'canceled'
            ? 'canceled'
            : 'unpaid';

        const filter = buildStoreMatchFilter(sub.id, customerId);
        const { data: updatedStore, error: updateErr } = await adminSupabase
          .from('stores')
          .update({
            stripe_subscription_id: sub.id,
            subscription_status: mappedStatus,
            current_period_end: periodEnd,
            plan_price_id: priceId,
          })
          .or(filter)
          .select('slug')
          .maybeSingle();

        if (updateErr) throw updateErr;
        await invalidateStoreCache(updatedStore?.slug);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const filter = buildStoreMatchFilter(sub.id, customerId);
        const { data: updatedStore, error: updateErr } = await adminSupabase
          .from('stores')
          .update({ subscription_status: 'canceled' })
          .or(filter)
          .select('slug')
          .maybeSingle();

        if (updateErr) throw updateErr;
        await invalidateStoreCache(updatedStore?.slug);
        break;
      }
    }

    // 2. Registramos la idempotencia SOLO cuando el procesamiento fue 100% exitoso
    await adminSupabase.from('stripe_webhook_events').insert({ id: event.id });

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Error procesando Stripe Webhook:', error);
    const message = error instanceof Error ? error.message : 'Error interno de webhook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
