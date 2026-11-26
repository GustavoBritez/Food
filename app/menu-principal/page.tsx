import type { Metadata } from 'next';
import { InstagramPromoFeed } from '@/components/menu/InstagramPromoFeed';
import {
  DEMO_BRANCH_STORE,
  DEMO_PRODUCTS,
  DEMO_PROMO_POSTS,
  DEMO_STORE,
} from '@/lib/demo';
import { createPublicClient } from '@/lib/supabase/public';
import type { DirectoryStore, Product, PromoPost, PublicStore } from '@/lib/types';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Menú Principal · Bares, Food Trucks y Promos · Carta App',
  description:
    'Explorá bares, cervecerías, restaurantes y food trucks por ubicación. Mirá sus cartas digitales, promociones vigentes y pedí directo sin comisiones.',
};

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function MenuPrincipalPage({ searchParams }: Props) {
  const fromSlug =
    typeof searchParams?.from === 'string' ? searchParams.from.trim().toLowerCase() : null;

  let posts: PromoPost[] = [];
  let directoryStores: DirectoryStore[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = createPublicClient();
      const nowIso = new Date().toISOString();

      const [
        { data: promoData, error: promoErr },
        { data: storesData, error: storesErr },
      ] = await Promise.all([
        supabase
          .from('promo_posts')
          .select('*')
          .gt('expires_at', nowIso)
          .order('created_at', { ascending: false })
          .limit(60),
        supabase
          .from('stores')
          .select(
            'id, name, slug, whatsapp, logo_url, cover_url, tagline, location, category_tag, accent_color, layout, theme, bg_color, button_style, theme_config, subscription_status, current_period_end, parent_store_id'
          )
          .order('name', { ascending: true }),
      ]);

      if (!promoErr && promoData && promoData.length > 0) {
        posts = promoData.map((p) => ({
          ...(p as PromoPost),
          promo_price:
            p.promo_price !== null && p.promo_price !== undefined
              ? Number(p.promo_price)
              : null,
        }));
      }

      if (!storesErr && storesData && storesData.length > 0) {
        const allStores = storesData as PublicStore[];
        const byId = new Map(allStores.map((s) => [s.id, s]));
        const nowMs = Date.now();

        // Filtrar solo locales con suscripción activa o heredada vigente
        const activeStores = allStores.filter((s) => {
          const parent = s.parent_store_id ? byId.get(s.parent_store_id) : null;
          const status = parent?.subscription_status || s.subscription_status;
          const periodEnd = parent?.current_period_end || s.current_period_end;
          const isSubActive = status === 'active' || status === 'trialing';
          const isNotExpired = !periodEnd || new Date(periodEnd).getTime() > nowMs;
          return isSubActive && isNotExpired;
        });

        if (activeStores.length > 0) {
          const queryStoreIds = Array.from(
            new Set(activeStores.map((s) => s.parent_store_id || s.id))
          );

          const { data: prodsData } = await supabase
            .from('products')
            .select('id, store_id, name, price, available, excluded_store_ids, order')
            .in('store_id', queryStoreIds)
            .eq('available', true)
            .order('order', { ascending: true })
            .limit(400);

          const productsList = (prodsData ?? []) as Array<
            Pick<Product, 'id' | 'store_id' | 'name' | 'price' | 'excluded_store_ids' | 'order'>
          >;

          const promoStoreIds = new Set(posts.map((p) => p.store_id).filter(Boolean));
          const promoSlugs = new Set(posts.map((p) => p.store_slug).filter(Boolean));

          directoryStores = activeStores.map((s) => {
            const sourceId = s.parent_store_id || s.id;
            const featured = productsList
              .filter(
                (p) =>
                  p.store_id === sourceId &&
                  !(p.excluded_store_ids || []).includes(s.id)
              )
              .slice(0, 4)
              .map((p) => ({
                id: p.id,
                name: p.name,
                price: Number(p.price),
              }));

            return {
              ...s,
              is_branch: Boolean(s.parent_store_id),
              has_promos: promoStoreIds.has(s.id) || promoSlugs.has(s.slug),
              featured_products: featured,
            };
          });
        }
      }
    } catch (err) {
      console.error('Error cargando datos en /menu-principal:', err);
    }
  }

  // Fallback a datos Demo si aún no hay locales o promos reales en Supabase
  if (posts.length === 0) {
    posts = DEMO_PROMO_POSTS;
  }

  if (directoryStores.length === 0) {
    directoryStores = [
      {
        ...DEMO_STORE,
        is_branch: false,
        has_promos: true,
        featured_products: DEMO_PRODUCTS.slice(0, 4).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
        })),
      },
      {
        ...DEMO_BRANCH_STORE,
        is_branch: true,
        has_promos: true,
        featured_products: DEMO_PRODUCTS.filter((p) =>
          p.category_id.includes('burgers') || p.category_id.includes('bebidas')
        )
          .slice(0, 4)
          .map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
          })),
      },
    ];
  }

  return (
    <InstagramPromoFeed
      posts={posts}
      stores={directoryStores}
      fromSlug={fromSlug}
    />
  );
}
