import type { Metadata, Viewport } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ClocheIcon } from '@/components/ClocheIcon';
import { PublicMenu } from '@/components/menu/PublicMenu';
import { DEMO_CATEGORIES, DEMO_PRODUCTS, DEMO_SLUG, DEMO_STORE } from '@/lib/demo';
import { createPublicClient } from '@/lib/supabase/public';
import type { Category, Product, PublicStore } from '@/lib/types';

// ISR: se sirve cacheado y se regenera cada 60s, o al instante cuando el dueño edita o Mercado Pago cambia el estado (/api/mercadopago/webhook)
export const revalidate = 60;

type Params = { params: { slug: string } };

const getMenu = cache(async (slug: string) => {
  const clean = slug.toLowerCase();
  if (clean === DEMO_SLUG) {
    return {
      store: DEMO_STORE,
      categories: DEMO_CATEGORIES,
      products: DEMO_PRODUCTS,
      isSubscribed: true,
    };
  }

  const supabase = createPublicClient();

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select(
      'id, name, slug, whatsapp, logo_url, cover_url, tagline, accent_color, layout, theme, bg_color, button_style, theme_config, subscription_status, current_period_end'
    )
    .eq('slug', clean)
    .maybeSingle();

  // Si hubo un error de red/DB en Supabase, lanzamos excepción para que Next.js ISR
  // conserve la última versión cacheada válida y NO cachee un 404 falso.
  if (storeError) {
    console.error(`Error de DB buscando store (${clean}):`, storeError);
    throw new Error('Database error fetching store');
  }

  if (!store) return null;

  // REGLA CRÍTICA DE SEGURIDAD: Validación de Suscripción en Carta Pública
  const isSubActive =
    store.subscription_status === 'active' || store.subscription_status === 'trialing';
  const isNotExpired =
    !store.current_period_end || new Date(store.current_period_end).getTime() > Date.now();
  const hasActiveSubscription = Boolean(isSubActive && isNotExpired);

  // Si la suscripción no está activa, NO consultamos ni exponemos productos o precios
  if (!hasActiveSubscription) {
    return {
      store: store as PublicStore,
      categories: [] as Category[],
      products: [] as Product[],
      isSubscribed: false,
    };
  }

  const [
    { data: categories, error: catError },
    { data: products, error: prodError },
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('id, store_id, name, subtitle, order')
      .eq('store_id', store.id)
      .order('order', { ascending: true }),
    supabase
      .from('products')
      .select(
        'id, store_id, category_id, name, description, price, photo_url, video_url, available, badges, order'
      )
      .eq('store_id', store.id)
      .eq('available', true)
      .order('order', { ascending: true }),
  ]);

  if (catError || prodError) {
    console.error(`Error cargando menú de ${clean}:`, catError || prodError);
    throw new Error('Database error fetching menu items');
  }

  return {
    store: store as PublicStore,
    categories: (categories ?? []) as Category[],
    products: ((products ?? []) as Product[]).map((p) => ({ ...p, price: Number(p.price) })),
    isSubscribed: true,
  };
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const menu = await getMenu(params.slug).catch(() => null);
  if (!menu) return { title: 'Menú no encontrado · Carta App' };

  const slug = menu.store.slug;
  const title = `${menu.store.name} · Menú`;
  const description = `${
    menu.store.tagline || `Mirá el menú de ${menu.store.name}`
  } y pedí en la mesa o por WhatsApp.`;
  const storeLogo = menu.store.logo_url;
  const icon192 = storeLogo || `/api/pwa-icon/${slug}?size=192`;
  const icon512 = storeLogo || `/api/pwa-icon/${slug}?size=512`;

  return {
    title,
    description,
    // 1. Vincula el manifest exclusivo de este bar:
    manifest: `/p/${slug}/manifest.webmanifest`,
    alternates: { canonical: `/p/${slug}` },
    // 2. Fuerza que iPhone (iOS Safari) y Android usen el logo del bar al instalar:
    icons: {
      icon: [
        { url: icon192, sizes: '192x192', type: 'image/png' },
        { url: icon512, sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: icon192, sizes: '192x192', type: 'image/png' }],
    },
    appleWebApp: {
      capable: true,
      title: menu.store.name,
      statusBarStyle: 'black-translucent',
    },
    openGraph: {
      title,
      description,
      type: 'website',
      images: [menu.store.logo_url || icon512],
    },
  };
}

export async function generateViewport({ params }: Params): Promise<Viewport> {
  const menu = await getMenu(params.slug).catch(() => null);
  return {
    themeColor: menu?.store.accent_color || '#0a0a0a',
  };
}

export default async function PublicMenuPage({ params }: Params) {
  const menu = await getMenu(params.slug);
  if (!menu) notFound();

  // Si la suscripción no está activa, renderizamos la pantalla segura sin productos ni pedidos
  if (!menu.isSubscribed) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-neutral-950 px-6 py-12 text-center text-white">
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl">
          {menu.store.logo_url ? (
            <Image
              src={menu.store.logo_url}
              alt={menu.store.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <ClocheIcon className="h-10 w-10 text-white" />
          )}
        </div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-100 sm:text-2xl">
          {menu.store.name}
        </h1>
        <div className="mt-5 max-w-sm rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-5 backdrop-blur-md">
          <p className="text-sm font-semibold text-neutral-200">Menú digital temporalmente no disponible</p>
          <p className="mt-2 text-xs leading-relaxed text-neutral-400">
            El servicio digital de este local se encuentra momentáneamente pausado. Por favor, solicita la carta física a tu mozo.
          </p>
        </div>
        <p className="mt-8 text-[11px] text-neutral-600">Carta App · Plataforma de Menús Digitales</p>
      </main>
    );
  }

  return (
    <main className="h-full min-h-dvh w-full overflow-hidden bg-neutral-950 text-white">
      <PublicMenu store={menu.store} categories={menu.categories} products={menu.products} />
    </main>
  );
}

