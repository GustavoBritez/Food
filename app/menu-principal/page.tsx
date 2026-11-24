import type { Metadata } from 'next';
import { InstagramPromoFeed } from '@/components/menu/InstagramPromoFeed';
import { DEMO_PROMO_POSTS } from '@/lib/demo';
import { createPublicClient } from '@/lib/supabase/public';
import type { PromoPost } from '@/lib/types';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Menú Principal · Promociones de Hoy · Carta App',
  description:
    'Descubrí las promociones y combos destacados de nuestros bares y restaurantes. Pedí directo por WhatsApp sin comisiones.',
};

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function MenuPrincipalPage({ searchParams }: Props) {
  const fromSlug =
    typeof searchParams?.from === 'string' ? searchParams.from.trim().toLowerCase() : null;

  let posts: PromoPost[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = createPublicClient();
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('promo_posts')
        .select('*')
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(60);

      if (!error && data && data.length > 0) {
        posts = data.map((p) => ({
          ...(p as PromoPost),
          promo_price:
            p.promo_price !== null && p.promo_price !== undefined
              ? Number(p.promo_price)
              : null,
        }));
      }
    } catch (err) {
      console.error('Error cargando promo_posts en /menu-principal:', err);
    }
  }

  // Si aún no hay publicaciones reales en Supabase o se corre en demo local, mostramos las promos de demostración
  if (posts.length === 0) {
    posts = DEMO_PROMO_POSTS;
  }

  return <InstagramPromoFeed posts={posts} fromSlug={fromSlug} />;
}
