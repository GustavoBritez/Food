import { NextResponse } from 'next/server';
import { createPreference, type PlanId } from '@/lib/mercadopago';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
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

    // 2. Obtener plan solicitado
    let plan: PlanId = 'monthly';
    try {
      const body = await req.json();
      if (body?.plan === 'yearly') {
        plan = 'yearly';
      }
    } catch {
      // default monthly
    }

    // 3. Obtener el local del usuario
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, slug, subscription_status, current_period_end')
      .eq('created_by', user.id)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'No se encontró un local registrado para este usuario.' },
        { status: 404 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // 4. Crear preferencia en Mercado Pago
    const preference = await createPreference({
      storeId: store.id,
      storeSlug: store.slug,
      storeName: store.name,
      userEmail: user.email,
      plan,
      siteUrl,
    });

    // 5. Guardar mp_preference_id de referencia en background
    try {
      const admin = createAdminClient();
      await admin
        .from('stores')
        .update({ mp_preference_id: preference.id })
        .eq('id', store.id);
    } catch (saveErr) {
      console.warn('No se pudo guardar mp_preference_id (no bloqueante):', saveErr);
    }

    return NextResponse.json({
      url: preference.init_point,
      id: preference.id,
      plan,
    });
  } catch (err: unknown) {
    console.error('Error en checkout de Mercado Pago:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al generar preferencia de Mercado Pago' },
      { status: 500 }
    );
  }
}
