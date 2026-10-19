import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminClientWrapper } from './AdminClientWrapper';
import type { Category, Product, Store } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Panel de Administración · LaCarta',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
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
