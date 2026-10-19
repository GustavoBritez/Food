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

  const { data: store } = await supabase
    .from('stores')
    .select('slug')
    .eq('created_by', user.id)
    .maybeSingle();

  if (!store) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { previousSlug?: unknown };
  const slugs = new Set<string>([store.slug as string]);
  if (typeof body.previousSlug === 'string' && SLUG_REGEX.test(body.previousSlug)) {
    slugs.add(body.previousSlug);
  }

  slugs.forEach((slug) => revalidatePath(`/p/${slug}`));
  return NextResponse.json({ revalidated: Array.from(slugs) });
}
