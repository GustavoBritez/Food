import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  try {
    // 1. Verificar autenticación del dueño
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 2. Obtener la tienda del usuario
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, slug, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end')
      .eq('created_by', user.id)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'No se encontró un local registrado para este usuario' },
        { status: 404 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // 3. Si ya tiene suscripción activa o período vigente, redirigir al Customer Portal
    const isAlreadyActive =
      store.subscription_status === 'active' &&
      (!store.current_period_end || new Date(store.current_period_end).getTime() > Date.now());

    if (isAlreadyActive && store.stripe_customer_id) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: store.stripe_customer_id,
        return_url: `${siteUrl}/admin`,
      });
      return NextResponse.json({ url: portalSession.url, alreadyActive: true });
    }

    // 4. Gestión / Idempotencia del Customer en Stripe
    let customerId = store.stripe_customer_id;

    if (!customerId) {
      // Creamos el cliente en Stripe si aún no existe
      const customer = await stripe.customers.create({
        email: user.email,
        name: store.name,
        metadata: {
          store_id: store.id,
          user_id: user.id,
          store_slug: store.slug,
        },
      });
      customerId = customer.id;

      // Guardamos stripe_customer_id de forma segura mediante service_role
      const adminSupabase = createAdminClient();
      await adminSupabase
        .from('stores')
        .update({ stripe_customer_id: customerId })
        .eq('id', store.id);
    }

    // 5. Lectura forzosa del precio desde variable de entorno del servidor (NUNCA del cliente)
    const priceId = process.env.STRIPE_PRICE_ID_30USD;
    if (!priceId) {
      return NextResponse.json(
        { error: 'STRIPE_PRICE_ID_30USD no configurado en el servidor' },
        { status: 500 }
      );
    }

    // 6. Creación de la sesión de Checkout para Suscripción Mensual ($30 USD)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: store.id,
      metadata: {
        store_id: store.id,
        user_id: user.id,
        store_slug: store.slug,
      },
      subscription_data: {
        metadata: {
          store_id: store.id,
          user_id: user.id,
          store_slug: store.slug,
        },
      },
      success_url: `${siteUrl}/admin?session_id={CHECKOUT_SESSION_ID}&billing=success`,
      cancel_url: `${siteUrl}/admin?billing=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Error en /api/stripe/checkout:', error);
    const message = error instanceof Error ? error.message : 'Error interno al procesar el pago';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
