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
      .select('id, name, slug, whatsapp, subscription_status, trial_end, current_period_end')
      .eq('created_by', user.id)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'No se encontró un local registrado para este usuario.' },
        { status: 404 }
      );
    }

    // 1. Validación temprana de uso previo
    if (store.trial_end !== null || store.subscription_status !== 'inactive') {
      return NextResponse.json(
        {
          error:
            'El mes de prueba gratuito ya fue utilizado previamente para este local. Elegí el Plan Mensual o Anual para continuar.',
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 2. Prevención Anti-Abuso Multi-Cuenta:
    // Verificamos si otro local con el mismo número de WhatsApp ya consumió un período de prueba
    const { data: duplicateWhatsappTrial } = await admin
      .from('stores')
      .select('id')
      .eq('whatsapp', store.whatsapp)
      .not('trial_end', 'is', null)
      .neq('id', store.id)
      .limit(1)
      .maybeSingle();

    if (duplicateWhatsappTrial) {
      return NextResponse.json(
        {
          error:
            'Este número de WhatsApp comercial ya utilizó su mes de prueba gratuito en otra cuenta. Suscribite al Plan Mensual o Anual para activar tu carta.',
        },
        { status: 400 }
      );
    }

    // 3. Activación atómica de 30 días (Con bloqueo TOCTOU en PostgreSQL)
    const trialDays = 30;
    const trialEnd = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: updatedStore, error: updateError } = await admin
      .from('stores')
      .update({
        subscription_status: 'trialing',
        plan_type: 'trial',
        trial_end: trialEnd,
        current_period_end: trialEnd,
      })
      .eq('id', store.id)
      .is('trial_end', null)
      .eq('subscription_status', 'inactive')
      .select('id, slug')
      .maybeSingle();

    if (updateError || !updatedStore) {
      console.error('Error o colisión activando mes de prueba:', updateError);
      return NextResponse.json(
        { error: 'No se pudo activar el mes de prueba o ya se encuentra activo.' },
        { status: 409 }
      );
    }

    try {
      revalidatePath(`/p/${updatedStore.slug}`);
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
