import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { ClocheIcon } from '@/components/ClocheIcon';
import {
  DEMO_BRANCH_SLUG,
  DEMO_BRANCH_STORE,
  DEMO_CATEGORIES,
  DEMO_PRODUCTS,
  DEMO_SLUG,
  DEMO_STORE,
} from '@/lib/demo';
import { createPublicClient } from '@/lib/supabase/public';
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

  // Soporte completo para locales Demo (/p/demo/pdf y /p/demo-truck/pdf)
  if (clean === DEMO_SLUG) {
    return (
      <PrintPdfView
        store={{ ...DEMO_STORE, created_by: 'demo-user' } as Store}
        categories={DEMO_CATEGORIES}
        products={DEMO_PRODUCTS}
      />
    );
  }

  if (clean === DEMO_BRANCH_SLUG) {
    return (
      <PrintPdfView
        store={{ ...DEMO_BRANCH_STORE, created_by: 'demo-user' } as Store}
        categories={DEMO_CATEGORIES}
        products={DEMO_PRODUCTS.filter((p) => !p.excluded_store_ids?.includes('demo-truck'))}
      />
    );
  }

  const supabase = createPublicClient();

  // 1. Obtener la tienda seleccionando únicamente las columnas públicas permitidas para el rol anon
  const { data: store, error: storeErr } = await supabase
    .from('stores')
    .select(
      'id, name, slug, whatsapp, logo_url, cover_url, tagline, accent_color, layout, theme, bg_color, button_style, theme_config, subscription_status, current_period_end, parent_store_id'
    )
    .eq('slug', clean)
    .maybeSingle();

  if (storeErr || !store) {
    return notFound();
  }

  // 2. Validar vigencia de suscripción (propia o heredada de casa matriz si es sucursal/food truck)
  let effectiveSubStatus = store.subscription_status;
  let effectivePeriodEnd = store.current_period_end;

  if (store.parent_store_id) {
    const { data: parentStore } = await supabase
      .from('stores')
      .select('subscription_status, current_period_end')
      .eq('id', store.parent_store_id)
      .maybeSingle();

    if (parentStore) {
      effectiveSubStatus = parentStore.subscription_status || effectiveSubStatus;
      effectivePeriodEnd = parentStore.current_period_end || effectivePeriodEnd;
    }
  }

  const isSubActive =
    effectiveSubStatus === 'active' || effectiveSubStatus === 'trialing';
  const isNotExpired =
    !effectivePeriodEnd || new Date(effectivePeriodEnd).getTime() > Date.now();
  const hasActiveSubscription = Boolean(isSubActive && isNotExpired);

  if (!hasActiveSubscription) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-neutral-950 px-6 py-12 text-center text-white">
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl">
          {store.logo_url ? (
            <Image
              src={store.logo_url}
              alt={store.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <ClocheIcon className="h-10 w-10 text-white" />
          )}
        </div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-100 sm:text-2xl">
          {store.name}
        </h1>
        <div className="mt-5 max-w-sm rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-5 backdrop-blur-md">
          <p className="text-sm font-semibold text-neutral-200">
            Folleto y menú digital temporalmente no disponible
          </p>
          <p className="mt-2 text-xs leading-relaxed text-neutral-400">
            El servicio digital de este local se encuentra momentáneamente pausado.
          </p>
        </div>
      </main>
    );
  }

  // 3. Determinar si es sucursal o matriz para heredar catálogo
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
