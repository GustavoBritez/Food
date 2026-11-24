import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { SLUG_REGEX } from '@/lib/utils';

/**
 * Invalida la caché ISR del menú público después de que el dueño edita.
 * Body opcional: { previousSlug } para limpiar la URL vieja si cambió el slug.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: stores } = await supabase
    .from('stores')
    .select('slug')
    .eq('created_by', user.id);

  if (!stores || stores.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { previousSlug?: unknown; slug?: unknown };
  const ownedSlugs = new Set<string>(stores.map((s) => s.slug as string));
  const slugsToRevalidate = new Set<string>(ownedSlugs);

  // Solo permitimos invalidar previousSlug si el usuario cambió el slug de una tienda propia (máximo 1)
  if (
    typeof body.previousSlug === 'string' &&
    SLUG_REGEX.test(body.previousSlug) &&
    !ownedSlugs.has(body.previousSlug)
  ) {
    slugsToRevalidate.add(body.previousSlug);
  }

  slugsToRevalidate.forEach((slug) => {
    revalidatePath(`/p/${slug}`);
    revalidatePath(`/p/${slug}/pdf`);
    revalidatePath(`/p/${slug}/manifest.webmanifest`);
  });
  return NextResponse.json({ revalidated: Array.from(slugsToRevalidate) });
}
