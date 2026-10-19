import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('stripe_customer_id')
      .eq('created_by', user.id)
      .maybeSingle();

    if (storeError || !store?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No se encontró un cliente de Stripe asociado a este local' },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: store.stripe_customer_id,
      return_url: `${siteUrl}/admin`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: unknown) {
    console.error('Error en /api/stripe/portal:', error);
    const message =
      error instanceof Error ? error.message : 'Error al abrir el portal de facturación';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
