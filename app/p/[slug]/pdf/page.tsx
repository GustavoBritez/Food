import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import type { Category, Product, Store } from '@/lib/types';
import { PrintPdfView } from './PrintPdfView';

type Params = {
  params: {
    slug: string;
  };
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const clean = params.slug.trim().toLowerCase();
  return {
    title: `Carta y Folleto Imprimible · ${clean} · Carta App`,
    description: `Folleto digital y carta en formato PDF imprimible de ${clean} para reparto y promociones.`,
  };
}

export default async function StorePdfPage({ params }: Params) {
  const clean = params.slug.trim().toLowerCase();
  const supabase = createClient();

  // 1. Obtener la tienda (matriz, sucursal o food truck)
  const { data: store, error: storeErr } = await supabase
    .from('stores')
    .select('*')
    .eq('slug', clean)
    .single();

  if (storeErr || !store) {
    return notFound();
  }

  // 2. Determinar si es sucursal o matriz para heredar catálogo
  const storeIdToQuery = store.parent_store_id || store.id;

  const [
    { data: rawCategories },
    { data: rawProducts },
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('id, store_id, name, subtitle, order, display_mode, price_columns')
      .eq('store_id', storeIdToQuery)
      .order('order', { ascending: true }),
    supabase
      .from('products')
      .select(
        'id, store_id, category_id, name, description, price, photo_url, video_url, available, badges, badge_label, price_variants, order, excluded_store_ids'
      )
      .eq('store_id', storeIdToQuery)
      .not('excluded_store_ids', 'cs', `{${store.id}}`)
      .eq('available', true)
      .order('order', { ascending: true }),
  ]);

  const categories = (rawCategories ?? []) as Category[];
  const products = ((rawProducts ?? []) as Product[])
    .filter((p) => !p.excluded_store_ids || !p.excluded_store_ids.includes(store.id))
    .map((p) => ({
      ...p,
      price: Number(p.price),
    }));

  return (
    <PrintPdfView
      store={store as Store}
      categories={categories}
      products={products}
    />
  );
}
