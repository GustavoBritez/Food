import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DEMO_CATEGORIES, DEMO_PRODUCTS, DEMO_STORE } from '@/lib/demo';
import { createClient } from '@/lib/supabase/server';
import { AdminClientWrapper } from './AdminClientWrapper';
import type { Category, Product, Store } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Panel de Administración · Carta App',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

type Props = { searchParams?: Record<string, string | string[] | undefined> };

export default async function AdminPage({ searchParams }: Props) {
  // Modo demo para explorar el panel del dueño sin necesidad de login previo
  const isDemo = searchParams?.demo === 'true';
  if (isDemo) {
    const demoStore: Store = {
      id: 'demo-store',
      name: 'Restaurante de Prueba',
      slug: 'demo',
      whatsapp: '5491128989237',
      logo_url: null,
      cover_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      created_by: 'demo-user',
      tagline: 'Cocina casera, burgers y tragos · Demo de Carta App',
      accent_color: '#22c55e',
      layout: 'feed',
      theme: 'dark',
      bg_color: '#0a0a0a',
      button_style: 'accent',
    };

    return (
      <AdminClientWrapper
        initialStore={demoStore}
        initialCategories={DEMO_CATEGORIES}
        initialProducts={DEMO_PRODUCTS}
        userId="demo-user"
      />
    );
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin');
  }

  // 1. Buscar local del dueño
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('created_by', user.id)
    .maybeSingle();

  let categories: Category[] = [];
  let products: Product[] = [];

  // 2. Si ya tiene local, cargar sus categorías y productos
  if (store) {
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('store_id', store.id)
        .order('order', { ascending: true }),
      supabase
        .from('products')
        .select('*')
        .eq('store_id', store.id)
        .order('order', { ascending: true }),
    ]);

    categories = (cats ?? []) as Category[];
    products = ((prods ?? []) as Product[]).map((p) => ({
      ...p,
      price: Number(p.price),
    }));
  }

  return (
    <AdminClientWrapper
      initialStore={store as Store | null}
      initialCategories={categories}
      initialProducts={products}
      userId={user.id}
    />
  );
}
