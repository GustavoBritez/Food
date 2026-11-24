import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractStoragePathFromUrl } from '@/lib/storage';
import { normalizeWhatsapp } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const BUCKET = 'menus';
const PROMO_DURATION_DAYS = 15;

/**
 * Verifica que el usuario esté autenticado y sea el Super-Admin autorizado.
 */
async function verifySuperAdmin() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { authorized: false as const, status: 401, error: 'No autenticado' };
  }

  const superAdminEnv = (
    process.env.SUPER_ADMIN_EMAIL ||
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ||
    ''
  )
    .trim()
    .toLowerCase();

  if (superAdminEnv && user.email?.trim().toLowerCase() !== superAdminEnv) {
    return {
      authorized: false as const,
      status: 403,
      error: 'Acceso exclusivo para la cuenta Super-Administradora.',
    };
  }

  return { authorized: true as const, user };
}

/**
 * Recolector de Basura (Garbage Collector):
 * 1. Busca todas las publicaciones con más de 15 días (expires_at <= now()).
 * 2. Elimina físicamente sus imágenes WebP del bucket de Supabase Storage.
 * 3. Elimina las filas de la tabla public.promo_posts.
 */
async function purgeExpiredPromos(admin: ReturnType<typeof createAdminClient>) {
  try {
    const nowIso = new Date().toISOString();
    const { data: expiredRows, error: fetchErr } = await admin
      .from('promo_posts')
      .select('id, image_url, storage_path')
      .lte('expires_at', nowIso);

    if (fetchErr || !expiredRows || expiredRows.length === 0) {
      return 0;
    }

    const storagePaths = expiredRows
      .map((row) => row.storage_path || extractStoragePathFromUrl(row.image_url))
      .filter((p): p is string => Boolean(p));

    if (storagePaths.length > 0) {
      await admin.storage.from(BUCKET).remove(storagePaths).catch((err) => {
        console.warn('Advertencia al limpiar imágenes vencidas de Storage:', err);
      });
    }

    const expiredIds = expiredRows.map((r) => r.id);
    await admin.from('promo_posts').delete().in('id', expiredIds);

    return expiredIds.length;
  } catch (err) {
    console.warn('Error no bloqueante purgando promos vencidas:', err);
    return 0;
  }
}

export async function GET() {
  try {
    const auth = await verifySuperAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const admin = createAdminClient();

    // 1. Limpieza automática de promociones que ya cumplieron 15 días
    const expiredCleanedCount = await purgeExpiredPromos(admin);

    // 2. Obtener promociones vigentes y lista de locales clientes para el selector
    const nowIso = new Date().toISOString();
    const [{ data: promos, error: promosErr }, { data: stores }] = await Promise.all([
      admin
        .from('promo_posts')
        .select('*')
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false }),
      admin
        .from('stores')
        .select('id, name, slug, whatsapp, logo_url, subscription_status')
        .order('name', { ascending: true }),
    ]);

    if (promosErr) {
      throw promosErr;
    }

    return NextResponse.json({
      promos: promos ?? [],
      stores: stores ?? [],
      expiredCleanedCount,
    });
  } catch (err: unknown) {
    console.error('Error en GET /api/admin/promos:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al cargar promociones' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await verifySuperAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const storeId = body.store_id ? String(body.store_id).trim() : null;
    const storeName = String(body.store_name || '').trim();
    const storeSlug = body.store_slug ? String(body.store_slug).trim().toLowerCase() : null;
    const storeWhatsapp = normalizeWhatsapp(String(body.store_whatsapp || ''));
    const storeLogoUrl = body.store_logo_url ? String(body.store_logo_url).trim() : null;
    const imageUrl = String(body.image_url || '').trim();
    const storagePath =
      body.storage_path ? String(body.storage_path).trim() : extractStoragePathFromUrl(imageUrl);
    const caption = String(body.caption || '').trim();
    const badgeText = body.badge_text ? String(body.badge_text).trim().slice(0, 30) : null;
    const promoPrice =
      body.promo_price !== undefined && body.promo_price !== null && body.promo_price !== ''
        ? Number(body.promo_price)
        : null;

    if (storeName.length < 2 || storeName.length > 80) {
      return NextResponse.json(
        { error: 'El nombre del local debe tener entre 2 y 80 caracteres.' },
        { status: 400 }
      );
    }
    if (!/^[0-9]{8,15}$/.test(storeWhatsapp)) {
      return NextResponse.json(
        { error: 'Ingresá un número de WhatsApp válido (8 a 15 dígitos).' },
        { status: 400 }
      );
    }
    if (!imageUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Debés subir una imagen válida (HTTPS) para la publicación.' },
        { status: 400 }
      );
    }
    if (!caption || caption.length > 500) {
      return NextResponse.json(
        { error: 'La descripción de la promoción es obligatoria (máx. 500 caracteres).' },
        { status: 400 }
      );
    }
    if (promoPrice !== null && (Number.isNaN(promoPrice) || promoPrice < 0)) {
      return NextResponse.json({ error: 'El precio promocional es inválido.' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Purgar publicaciones vencidas (> 15 días) antes de insertar la nueva
    await purgeExpiredPromos(admin);

    // 2. Calcular fecha exacta de autodestrucción (15 días desde ahora)
    const now = Date.now();
    const expiresAt = new Date(now + PROMO_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: created, error: insertErr } = await admin
      .from('promo_posts')
      .insert({
        store_id: storeId,
        store_name: storeName,
        store_slug: storeSlug,
        store_whatsapp: storeWhatsapp,
        store_logo_url: storeLogoUrl,
        image_url: imageUrl,
        storage_path: storagePath,
        caption,
        promo_price: promoPrice,
        badge_text: badgeText,
        expires_at: expiresAt,
      })
      .select('*')
      .single();

    if (insertErr) {
      throw insertErr;
    }

    try {
      revalidatePath('/menu-principal');
    } catch {
      /* noop */
    }

    return NextResponse.json({ promo: created }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error en POST /api/admin/promos:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al publicar la promoción' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await verifySuperAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    const admin = createAdminClient();

    if (action === 'cleanup') {
      const cleaned = await purgeExpiredPromos(admin);
      try {
        revalidatePath('/menu-principal');
      } catch {
        /* noop */
      }
      return NextResponse.json({ cleaned });
    }

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID de la publicación' }, { status: 400 });
    }

    const { data: existing } = await admin
      .from('promo_posts')
      .select('id, image_url, storage_path')
      .eq('id', id)
      .maybeSingle();

    if (existing) {
      const pathToDelete =
        existing.storage_path || extractStoragePathFromUrl(existing.image_url);
      if (pathToDelete) {
        await admin.storage.from(BUCKET).remove([pathToDelete]).catch(() => undefined);
      }
      await admin.from('promo_posts').delete().eq('id', id);
    }

    try {
      revalidatePath('/menu-principal');
    } catch {
      /* noop */
    }

    return NextResponse.json({ deleted: true });
  } catch (err: unknown) {
    console.error('Error en DELETE /api/admin/promos:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al eliminar la promoción' },
      { status: 500 }
    );
  }
}
