import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { PublicMenu } from '@/components/menu/PublicMenu';
import { DEMO_CATEGORIES, DEMO_PRODUCTS, DEMO_SLUG, DEMO_STORE } from '@/lib/demo';
import { createPublicClient } from '@/lib/supabase/public';
import type { Category, Product, PublicStore } from '@/lib/types';

// ISR: se sirve cacheado y se regenera cada 60s, o al instante cuando el dueño edita (/api/revalidate)
export const revalidate = 60;

type Params = { params: { slug: string } };

const getMenu = cache(async (slug: string) => {
  const clean = slug.toLowerCase();
  if (clean === DEMO_SLUG) {
    return {
      store: DEMO_STORE,
      categories: DEMO_CATEGORIES,
      products: DEMO_PRODUCTS,
    };
  }

  try {
    const supabase = createPublicClient();

    const { data: store } = await supabase
      .from('stores')
      .select('id, name, slug, whatsapp, logo_url, tagline, accent_color, layout')
      .eq('slug', clean)
      .maybeSingle();

    if (!store) return null;

    const [{ data: categories }, { data: products }] = await Promise.all([
      supabase
        .from('categories')
        .select('id, store_id, name, order')
        .eq('store_id', store.id)
        .order('order', { ascending: true }),
      supabase
        .from('products')
        .select('id, store_id, category_id, name, description, price, photo_url, video_url, available, order')
        .eq('store_id', store.id)
        .eq('available', true)
        .order('order', { ascending: true }),
    ]);

    return {
      store: store as PublicStore,
      categories: (categories ?? []) as Category[],
      products: ((products ?? []) as Product[]).map((p) => ({ ...p, price: Number(p.price) })),
    };
  } catch (err) {
    console.error('Error fetching menu for slug:', slug, err);
    return null;
  }
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const menu = await getMenu(params.slug);
  if (!menu) return { title: 'Menú no encontrado · LaCarta' };
  const title = `${menu.store.name} · Menú`;
  const description = `${menu.store.tagline || `Mirá el menú de ${menu.store.name}`} y pedí en la mesa o por WhatsApp.`;
  return {
    title,
    description,
    alternates: { canonical: `/p/${menu.store.slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      images: menu.store.logo_url ? [menu.store.logo_url] : undefined,
    },
  };
}

export default async function PublicMenuPage({ params }: Params) {
  const menu = await getMenu(params.slug);
  if (!menu) notFound();

  return (
    <main className="h-full min-h-dvh w-full overflow-hidden bg-neutral-950 text-white">
      <PublicMenu store={menu.store} categories={menu.categories} products={menu.products} />
    </main>
  );
}
