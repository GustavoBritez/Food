import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
      .select('id, name, slug, subscription_status, trial_end, current_period_end')
      .eq('created_by', user.id)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'No se encontró un local registrado para este usuario.' },
        { status: 404 }
      );
    }

    // Si ya consumió el trial previamente o ya tiene suscripción activa
    if (store.subscription_status === 'active') {
      return NextResponse.json(
        { error: 'Tu local ya cuenta con una suscripción activa.' },
        { status: 400 }
      );
    }

    if (store.trial_end && new Date(store.trial_end).getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'El mes de prueba gratuito ya fue utilizado previamente para este local. Elegí el Plan Mensual o Anual para continuar.' },
        { status: 400 }
      );
    }

    // Activamos 30 días de prueba gratuita
    const trialDays = 30;
    const trialEnd = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from('stores')
      .update({
        subscription_status: 'trialing',
        plan_type: 'trial',
        trial_end: trialEnd,
        current_period_end: trialEnd,
      })
      .eq('id', store.id);

    if (updateError) {
      console.error('Error activando mes de prueba:', updateError);
      return NextResponse.json(
        { error: 'No se pudo activar el mes de prueba. Intentá nuevamente.' },
        { status: 500 }
      );
    }

    try {
      revalidatePath(`/p/${store.slug}`);
      revalidatePath('/admin');
    } catch {
      /* noop */
    }

    return NextResponse.json({
      success: true,
      subscription_status: 'trialing',
      trial_end: trialEnd,
      current_period_end: trialEnd,
    });
  } catch (err: unknown) {
    console.error('Error en activación de mes de prueba:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error inesperado' },
      { status: 500 }
    );
  }
}
