'use client';

import { useState } from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { OnboardingStore } from '@/components/admin/OnboardingStore';
import type { Category, Product, Store } from '@/lib/types';

type Props = {
  initialStore: Store | null;
  initialCategories: Category[];
  initialProducts: Product[];
  userId: string;
};

export function AdminClientWrapper({
  initialStore,
  initialCategories,
  initialProducts,
  userId,
}: Props) {
  const [store, setStore] = useState<Store | null>(initialStore);
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  if (!store) {
    return (
      <OnboardingStore
        userId={userId}
        onCreated={(newStore) => {
          setStore(newStore);
          setCategories([
            { id: 'cat-1', store_id: newStore.id, name: 'Platos', order: 0 },
            { id: 'cat-2', store_id: newStore.id, name: 'Bebidas', order: 1 },
          ]);
        }}
      />
    );
  }

  return (
    <AdminDashboard
      initialStore={store}
      initialCategories={categories}
      initialProducts={initialProducts}
      userId={userId}
    />
  );
}
