'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  LogOut,
  Pencil,
  Plus,
  QrCode,
  Settings,
  Smartphone,
  Trash2,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { PublicMenu } from '@/components/menu/PublicMenu';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { BranchModal } from './BranchModal';
import { CategoryModal } from './CategoryModal';
import { ProductModal } from './ProductModal';
import { QrModal } from './QrModal';
import { StoreSettings } from './StoreSettings';
import { SubscriptionBanner } from './SubscriptionBanner';
import { removeImageByUrl } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import type { Category, CategoryDisplayMode, Product, Store } from '@/lib/types';
import { formatPrice, menuUrl } from '@/lib/utils';

type Props = {
  initialStore: Store;
  initialStores?: Store[];
  initialCategories: Category[];
  initialProducts: Product[];
  userId: string;
};

export function AdminDashboard({
  initialStore,
  initialStores,
  initialCategories,
  initialProducts,
  userId,
}: Props) {
  // Lista de locales del dueño (local principal + sucursales/food trucks)
  const [stores, setStores] = useState<Store[]>(
    initialStores && initialStores.length > 0 ? initialStores : [initialStore]
  );
  const [selectedStoreId, setSelectedStoreId] = useState<string>(initialStore.id);

  // Local principal (matriz donde se administran platos y categorías)
  const mainStore = stores.find((s) => !s.parent_store_id) || stores[0] || initialStore;
  // Punto de venta seleccionado actualmente
  const activeStore = stores.find((s) => s.id === selectedStoreId) || mainStore;
  const isBranch = activeStore.id !== mainStore.id;
  const branches = stores.filter((s) => s.id !== mainStore.id);
  const BASE_INCLUDED_BRANCHES = 2; // + 1 casa matriz = 3 locales en total incluidos en el plan base
  const extraPurchased = mainStore.extra_branches_purchased || 0;
  const maxBranches = BASE_INCLUDED_BRANCHES + extraPurchased;
  const maxTotalStores = 3 + extraPurchased;

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(initialProducts);

  // Modales
  const [qrOpen, setQrOpen] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Tabs / Vistas y borrador de previsualización en vivo
  const [activeTab, setActiveTab] = useState<'menu' | 'settings'>('menu');
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<Partial<Store>>({});

  const previewStore = { ...activeStore, ...previewDraft };

  // Toasts de copiado
  const [copiedWp, setCopiedWp] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Alerta de confirmación de sucursal o food truck extra pagado con Mercado Pago
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('extra_confirmed') === '1') {
      alert('¡Punto de venta adicional acreditado con éxito! Ya podés crear tu nueva sucursal o food truck.');
      window.history.replaceState({}, '', '/admin');
    }
  }, []);

  const supabase = createClient();

  // Revalida caché ISR en background
  async function triggerRevalidate(previousSlug?: string) {
    try {
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previousSlug }),
      });
    } catch {
      /* best-effort */
    }
  }

  // --- Manejo de Store y Sucursales ---
  function handleStoreUpdated(updated: Store, previousSlug?: string) {
    setStores((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setPreviewDraft({});
    triggerRevalidate(previousSlug);
  }

  function handleBranchCreated(newBranch: Store) {
    setStores((prev) => [...prev, newBranch]);
    setSelectedStoreId(newBranch.id);
    triggerRevalidate();
  }

  async function handleDeleteBranch(branchId: string) {
    if (mainStore.id !== 'demo-store' && userId !== 'demo-user') {
      const { error } = await supabase.from('stores').delete().eq('id', branchId);
      if (error) {
        console.error('Error eliminando sucursal:', error);
        alert('No se pudo eliminar la sucursal.');
        return;
      }
    }
    setStores((prev) => prev.filter((s) => s.id !== branchId));
    setSelectedStoreId(mainStore.id);
    triggerRevalidate();
  }

  // Activa u oculta un plato exclusivamente en la sucursal / food truck seleccionado
  async function handleToggleBranchVisibility(prod: Product, branchId: string) {
    const currentExcluded = prod.excluded_store_ids || [];
    const isExcluded = currentExcluded.includes(branchId);
    const nextExcluded = isExcluded
      ? currentExcluded.filter((id) => id !== branchId)
      : [...currentExcluded, branchId];

    // Actualización optimista inmediata
    setProducts((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, excluded_store_ids: nextExcluded } : p))
    );

    if (mainStore.id !== 'demo-store' && userId !== 'demo-user') {
      const { error } = await supabase
        .from('products')
        .update({ excluded_store_ids: nextExcluded })
        .eq('id', prod.id);

      if (error) {
        console.error('Error actualizando visibilidad por sucursal:', error);
        setProducts((prev) =>
          prev.map((p) => (p.id === prod.id ? { ...p, excluded_store_ids: currentExcluded } : p))
        );
        alert('No se pudo actualizar la visibilidad en este punto.');
        return;
      }
    }

    triggerRevalidate();
  }

  // --- Manejo de Categorías (se crean en el local principal) ---
  async function handleSaveCategory(data: {
    id?: string;
    name: string;
    subtitle?: string | null;
    order: number;
    display_mode?: CategoryDisplayMode;
    price_columns?: string[];
  }) {
    if (mainStore.id === 'demo-store' || userId === 'demo-user') {
      if (data.id) {
        setCategories((prev) =>
          prev
            .map((c) =>
              c.id === data.id
                ? {
                    ...c,
                    name: data.name,
                    subtitle: data.subtitle ?? null,
                    order: data.order,
                    display_mode: data.display_mode ?? 'standard',
                    price_columns: data.price_columns ?? [],
                  }
                : c
            )
            .sort((a, b) => a.order - b.order)
        );
      } else {
        const created: Category = {
          id: `cat-${Date.now()}`,
          store_id: mainStore.id,
          name: data.name,
          subtitle: data.subtitle ?? null,
          order: data.order,
          display_mode: data.display_mode ?? 'standard',
          price_columns: data.price_columns ?? [],
        };
        setCategories((prev) => [...prev, created].sort((a, b) => a.order - b.order));
      }
      return;
    }

    if (data.id) {
      const { data: updated, error } = await supabase
        .from('categories')
        .update({
          name: data.name,
          subtitle: data.subtitle ?? null,
          order: data.order,
          display_mode: data.display_mode ?? 'standard',
          price_columns: data.price_columns ?? [],
        })
        .eq('id', data.id)
        .select()
        .single();
      if (error) throw error;
      setCategories((prev) =>
        prev
          .map((c) => (c.id === data.id ? (updated as Category) : c))
          .sort((a, b) => a.order - b.order)
      );
    } else {
      const { data: created, error } = await supabase
        .from('categories')
        .insert({
          store_id: mainStore.id,
          name: data.name,
          subtitle: data.subtitle ?? null,
          order: data.order,
          display_mode: data.display_mode ?? 'standard',
          price_columns: data.price_columns ?? [],
        })
        .select()
        .single();
      if (error) throw error;
      setCategories((prev) => [...prev, created as Category].sort((a, b) => a.order - b.order));
    }
    triggerRevalidate();
  }

  async function handleDeleteCategory(catId: string) {
    const prodsCount = products.filter((p) => p.category_id === catId).length;
    const msg = prodsCount > 0
      ? `¿Eliminar esta categoría? También se eliminarán sus ${prodsCount} producto(s).`
      : '¿Eliminar esta categoría?';
    if (!confirm(msg)) return;

    if (mainStore.id === 'demo-store' || userId === 'demo-user') {
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      setProducts((prev) => prev.filter((p) => p.category_id !== catId));
      return;
    }

    const prodsInCat = products.filter((p) => p.category_id === catId);
    const { error } = await supabase.from('categories').delete().eq('id', catId);
    if (error) {
      alert('No se pudo eliminar la categoría.');
      return;
    }
    // Limpieza de imágenes huérfanas en Storage
    prodsInCat.forEach((p) => {
      if (p.photo_url) removeImageByUrl(supabase, p.photo_url);
      if (p.video_url) removeImageByUrl(supabase, p.video_url);
    });
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    setProducts((prev) => prev.filter((p) => p.category_id !== catId));
    triggerRevalidate();
  }

  // --- Manejo de Productos ---
  async function handleSaveProduct(data: Partial<Product> & { id?: string }) {
    if (mainStore.id === 'demo-store' || userId === 'demo-user') {
      if (data.id) {
        setProducts((prev) =>
          prev
            .map((p) => (p.id === data.id ? ({ ...p, ...data, price: Number(data.price) } as Product) : p))
            .sort((a, b) => a.order - b.order)
        );
      } else {
        const created: Product = {
          id: `prod-${Date.now()}`,
          store_id: mainStore.id,
          category_id: data.category_id!,
          name: data.name!,
          description: data.description ?? null,
          price: Number(data.price),
          photo_url: data.photo_url ?? null,
          video_url: data.video_url ?? null,
          available: data.available ?? true,
          badges: data.badges ?? [],
          excluded_store_ids: [],
          order: data.order ?? products.length,
        };
        setProducts((prev) => [...prev, created].sort((a, b) => a.order - b.order));
      }
      return;
    }

    if (data.id) {
      const oldProd = products.find((p) => p.id === data.id);
      const { id, ...rest } = data;
      const { data: updated, error } = await supabase
        .from('products')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      // Si cambió de foto o video, borramos el anterior para no dejar huérfanos en Storage
      if (oldProd?.photo_url && oldProd.photo_url !== data.photo_url) {
        removeImageByUrl(supabase, oldProd.photo_url);
      }
      if (oldProd?.video_url && oldProd.video_url !== data.video_url) {
        removeImageByUrl(supabase, oldProd.video_url);
      }
      setProducts((prev) =>
        prev
          .map((p) => (p.id === id ? { ...(updated as Product), price: Number(updated.price) } : p))
          .sort((a, b) => a.order - b.order)
      );
    } else {
      const { data: created, error } = await supabase
        .from('products')
        .insert({
          store_id: mainStore.id,
          category_id: data.category_id!,
          name: data.name!,
          description: data.description ?? null,
          price: data.price!,
          photo_url: data.photo_url ?? null,
          video_url: data.video_url ?? null,
          available: data.available ?? true,
          badges: data.badges ?? [],
          order: data.order ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      setProducts((prev) =>
        [...prev, { ...(created as Product), price: Number(created.price) }].sort(
          (a, b) => a.order - b.order
        )
      );
    }
    triggerRevalidate();
  }

  async function handleToggleAvailable(product: Product) {
    const nextVal = !product.available;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, available: nextVal } : p))
    );
    if (mainStore.id === 'demo-store' || userId === 'demo-user') return;
    const { error } = await supabase
      .from('products')
      .update({ available: nextVal })
      .eq('id', product.id);
    if (error) {
      // rollback
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, available: product.available } : p))
      );
    } else {
      triggerRevalidate();
    }
  }

  async function handleDeleteProduct(prodId: string) {
    if (!confirm('¿Eliminar este producto?')) return;
    const prod = products.find((p) => p.id === prodId);
    const { error } = await supabase.from('products').delete().eq('id', prodId);
    if (error) {
      alert('No se pudo eliminar el producto.');
      return;
    }
    // Limpieza de foto y video huérfanos en Storage
    if (prod?.photo_url) removeImageByUrl(supabase, prod.photo_url);
    if (prod?.video_url) removeImageByUrl(supabase, prod.video_url);
    setProducts((prev) => prev.filter((p) => p.id !== prodId));
    triggerRevalidate();
  }

  // --- Copiar Enlaces ---
  async function copyWhatsappLink() {
    const wpUrl = `https://wa.me/${activeStore.whatsapp}`;
    try {
      await navigator.clipboard.writeText(wpUrl);
      setCopiedWp(true);
      setTimeout(() => setCopiedWp(false), 2000);
    } catch {
      /* fallback */
    }
  }

  async function copyMenuLink() {
    const url = menuUrl(activeStore.slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      /* fallback */
    }
  }

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Top Bar / Header */}
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden text-subtle sm:inline">/</span>
            <div className="hidden min-w-0 sm:flex sm:items-center sm:gap-2">
              <span className="truncate text-[15px] font-semibold">{activeStore.name}</span>
              <a
                href={`/p/${activeStore.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-0.5 text-[12px] font-medium text-muted transition hover:bg-black/5 hover:text-ink"
              >
                /p/{activeStore.slug} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón Generar QR */}
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="btn-primary h-9 px-3.5 text-[13.5px]"
            >
              <QrCode className="h-4 w-4" />
              <span>Generar QR</span>
            </button>

            {/* Botón Ver PDF de la sucursal/foodtruck seleccionada */}
            <a
              href={`/p/${activeStore.slug}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary h-9 px-3 text-[13.5px]"
              title={`Ver y descargar PDF / folleto imprimible de ${activeStore.name}`}
            >
              <FileText className="h-4 w-4" />
              <span>Ver PDF</span>
            </a>

            {/* Botón Copiar link de WhatsApp */}
            <button
              type="button"
              onClick={copyWhatsappLink}
              className="btn-secondary h-9 px-3 text-[13.5px] text-whatsapp-dark"
              title="Copiar link de WhatsApp para Instagram/Google"
            >
              {copiedWp ? (
                <>
                  <Check className="h-4 w-4 text-whatsapp-dark" />
                  <span className="hidden sm:inline">¡Copiado!</span>
                </>
              ) : (
                <>
                  <WhatsAppIcon className="h-4 w-4 text-whatsapp" />
                  <span className="hidden sm:inline">Copiar WhatsApp</span>
                </>
              )}
            </button>

            {/* Toggle Preview Móvil */}
            <button
              type="button"
              onClick={() => setShowPreviewMobile(!showPreviewMobile)}
              className={`icon-btn lg:hidden ${showPreviewMobile ? 'bg-ink text-white' : ''}`}
              title="Vista previa del menú"
            >
              <Smartphone className="h-4 w-4" />
            </button>

            {/* Sign Out */}
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="icon-btn text-subtle hover:text-red-600"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Barra de Subnavegación del Admin + Selector de Sucursal */}
      <div className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <nav className="flex gap-1 py-1">
            <button
              type="button"
              onClick={() => setActiveTab('menu')}
              className={`btn h-9 px-4 text-[13.5px] ${
                activeTab === 'menu' ? 'bg-ink text-white' : 'text-muted hover:bg-canvas hover:text-ink'
              }`}
            >
              <UtensilsCrossed className="h-4 w-4" /> Categorías y Platos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`btn h-9 px-4 text-[13.5px] ${
                activeTab === 'settings' ? 'bg-ink text-white' : 'text-muted hover:bg-canvas hover:text-ink'
              }`}
            >
              <Settings className="h-4 w-4" /> {isBranch ? `Datos de ${activeStore.name}` : 'Datos del Local'}
            </button>
          </nav>

          {/* Selector de Sucursal / Food Truck */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-canvas/80 px-3 py-1 text-[13px] shadow-sm">
              <span className="text-[11.5px] font-medium text-muted hidden md:inline">
                🎛️ Punto de venta:
              </span>
              <select
                value={selectedStoreId}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setBranchModalOpen(true);
                    return;
                  }
                  setSelectedStoreId(e.target.value);
                }}
                className="bg-transparent font-semibold text-ink outline-none cursor-pointer text-[13px] max-w-[220px] sm:max-w-[280px] truncate"
              >
                <option value={mainStore.id}>🏪 {mainStore.name} (Local Principal)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    🚚 {b.name} (Food Truck / Sucursal)
                  </option>
                ))}
                <option value="__NEW__">
                  {branches.length >= maxBranches
                    ? `+ Sumar local o food truck extra ($25.000)`
                    : `+ Nueva Sucursal o Food Truck (${branches.length}/${maxBranches} incluidos)`}
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={copyMenuLink}
              className="hidden text-[13px] text-muted hover:text-ink sm:inline-flex sm:items-center sm:gap-1.5 ml-2"
              title={`Copiar link de ${activeStore.name}`}
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-whatsapp-dark" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedLink ? 'Link copiado' : 'Copiar link'}
            </button>
          </div>
        </div>
      </div>

      {/* Layout Principal: Dos columnas en Desktop (Gestión + Live Preview) */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* Banner de Estado de Suscripción / Planes Mercado Pago (se basa en la cuenta principal) */}
        <SubscriptionBanner store={mainStore} />

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Columna Izquierda: CRUD / Configuración */}
          <div
            className={`space-y-6 ${
              showPreviewMobile ? 'hidden lg:block' : 'block'
            } lg:col-span-7 xl:col-span-7`}
          >
            {activeTab === 'settings' ? (
              <StoreSettings
                store={activeStore}
                userId={userId}
                onUpdate={handleStoreUpdated}
                onPreviewDraft={setPreviewDraft}
                onDeleteBranch={handleDeleteBranch}
              />
            ) : (
              <>
                {/* Banner contextual cuando se administra una Sucursal o Food Truck */}
                {isBranch && (
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] p-4 text-ink">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white shadow-sm text-lg">
                          🚚
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-semibold text-ink">
                              {activeStore.name}
                            </h3>
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                              Food Truck / Sucursal
                            </span>
                          </div>
                          <p className="text-[12px] text-muted mt-0.5 leading-relaxed">
                            Hereda platos y precios de <strong>{mainStore.name}</strong>. Tocá el switch de cada plato para activarlo u ocultarlo exclusivamente en este punto.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`/p/${activeStore.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary h-8 px-3 text-[12px]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Ver carta
                        </a>
                        <button
                          type="button"
                          onClick={() => setQrOpen(true)}
                          className="btn-secondary h-8 px-3 text-[12px]"
                        >
                          <QrCode className="h-3.5 w-3.5" /> QR punto
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cabecera del Menú */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      {isBranch ? `Carta de ${activeStore.name}` : 'Tu Menú Digital'}
                    </h2>
                    <p className="text-[13px] text-muted">
                      {categories.length} categoría(s) · {products.length} producto(s) en catálogo
                      {isBranch && (
                        <span>
                          {' '}·{' '}
                          <strong className="text-emerald-700">
                            {products.filter((p) => !p.excluded_store_ids?.includes(activeStore.id)).length} visibles en este punto
                          </strong>
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const isSubscribed =
                          mainStore.id === 'demo-store' ||
                          mainStore.subscription_status === 'active' ||
                          mainStore.subscription_status === 'trialing';
                        if (!isSubscribed) {
                          alert('Debes activar tu mes gratis o suscribirte con Mercado Pago para crear categorías.');
                          return;
                        }
                        setEditingCategory(null);
                        setCatModalOpen(true);
                      }}
                      className="btn-secondary h-10 px-3.5 text-[13px]"
                    >
                      <Plus className="h-4 w-4" /> Nueva categoría
                    </button>
                    <button
                      type="button"
                      disabled={categories.length === 0}
                      onClick={() => {
                        const isSubscribed =
                          mainStore.id === 'demo-store' ||
                          mainStore.subscription_status === 'active' ||
                          mainStore.subscription_status === 'trialing';
                        if (!isSubscribed) {
                          alert('Debes activar tu mes gratis o suscribirte con Mercado Pago para agregar platos.');
                          return;
                        }
                        setEditingProduct(null);
                        setProdModalOpen(true);
                      }}
                      className="btn-primary h-10 px-3.5 text-[13px]"
                    >
                      <Plus className="h-4 w-4" /> Agregar producto
                    </button>
                  </div>
                </div>

                {categories.length === 0 ? (
                  <div className="card p-12 text-center">
                    <UtensilsCrossed className="mx-auto h-10 w-10 text-subtle" />
                    <h3 className="mt-3 font-semibold">Tu menú todavía está vacío</h3>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                      Creá tu primera categoría (ej: Pizzas, Bebidas) para empezar a cargar tus platos.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setCatModalOpen(true);
                      }}
                      className="btn-primary mt-5"
                    >
                      <Plus className="h-4 w-4" /> Crear primera categoría
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {categories.map((category) => {
                      const categoryProducts = products.filter(
                        (p) => p.category_id === category.id
                      );

                      return (
                        <div key={category.id} className="card overflow-hidden">
                          {/* Barra de la Categoría */}
                          <div className="flex items-center justify-between border-b border-black/[0.06] bg-canvas/60 px-5 py-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-[15px] font-semibold tracking-tight">
                                  {category.name}
                                </h3>
                                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-subtle shadow-sm">
                                  {categoryProducts.length}
                                </span>
                              </div>
                              {category.subtitle && (
                                <p className="mt-0.5 text-[12px] italic text-muted">
                                  {category.subtitle}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(null);
                                  // Pre-selecciona esta categoría
                                  setProdModalOpen(true);
                                }}
                                className="icon-btn h-8 w-8 hover:text-ink"
                                title="Agregar producto aquí"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategory(category);
                                  setCatModalOpen(true);
                                }}
                                className="icon-btn h-8 w-8 hover:text-ink"
                                title="Editar nombre de categoría"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(category.id)}
                                className="icon-btn h-8 w-8 hover:text-red-600"
                                title="Eliminar categoría"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Lista de Productos de la Categoría */}
                          {categoryProducts.length === 0 ? (
                            <div className="p-6 text-center text-sm text-subtle">
                              No hay productos en esta categoría todavía.
                            </div>
                          ) : (
                            <div className="divide-y divide-black/[0.06]">
                              {categoryProducts.map((prod) => {
                                const isExcludedInBranch =
                                  isBranch && (prod.excluded_store_ids || []).includes(activeStore.id);

                                return (
                                  <div
                                    key={prod.id}
                                    className={`flex items-center gap-3.5 p-4 transition ${
                                      !prod.available || isExcludedInBranch ? 'opacity-60 bg-black/[0.01]' : ''
                                    }`}
                                  >
                                    {/* Foto miniatura */}
                                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-black/5 bg-canvas">
                                      {prod.photo_url ? (
                                        <Image
                                          src={prod.photo_url}
                                          alt={prod.name}
                                          fill
                                          sizes="56px"
                                          className="object-cover"
                                        />
                                      ) : (
                                        <div className="grid h-full w-full place-items-center text-[10px] text-subtle">
                                          Sin foto
                                        </div>
                                      )}
                                    </div>

                                    {/* Datos del producto */}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-baseline gap-2 flex-wrap">
                                        <h4 className="truncate text-[15px] font-medium leading-snug">
                                          {prod.name}
                                        </h4>
                                        {prod.badges && prod.badges.length > 0 && (
                                          <div className="flex items-center gap-1">
                                            {prod.badges.map((b) => (
                                              <span
                                                key={b}
                                                className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[10px] text-muted font-medium"
                                              >
                                                {b}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        {!prod.available && (
                                          <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                                            Agotado
                                          </span>
                                        )}
                                        {isBranch && isExcludedInBranch && (
                                          <span className="rounded bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700">
                                            No ofrecido en este punto
                                          </span>
                                        )}
                                        {!isBranch &&
                                          prod.excluded_store_ids &&
                                          prod.excluded_store_ids.length > 0 && (
                                            <span
                                              className="rounded bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                                              title={`Oculto en ${prod.excluded_store_ids.length} sucursal(es)`}
                                            >
                                              Oculto en {prod.excluded_store_ids.length} suc.
                                            </span>
                                          )}
                                      </div>
                                      {prod.description && (
                                        <p className="line-clamp-1 text-[13px] text-muted">
                                          {prod.description}
                                        </p>
                                      )}
                                      <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-ink">
                                        {formatPrice(prod.price)}
                                      </p>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex items-center gap-1.5">
                                      {isBranch ? (
                                        <button
                                          type="button"
                                          onClick={() => handleToggleBranchVisibility(prod, activeStore.id)}
                                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                                            !isExcludedInBranch
                                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                              : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 border border-zinc-200'
                                          }`}
                                          title={
                                            !isExcludedInBranch
                                              ? 'Hacer clic para ocultar en este punto de venta'
                                              : 'Hacer clic para activar en este punto de venta'
                                          }
                                        >
                                          {!isExcludedInBranch ? (
                                            <>
                                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                              <span>Visible aquí</span>
                                            </>
                                          ) : (
                                            <>
                                              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                                              <span>Oculto aquí</span>
                                            </>
                                          )}
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleToggleAvailable(prod)}
                                          className={`icon-btn h-8 w-8 ${
                                            prod.available
                                              ? 'text-whatsapp-dark'
                                              : 'text-subtle hover:text-ink'
                                          }`}
                                          title={
                                            prod.available
                                              ? 'Marcar como agotado en toda la cadena'
                                              : 'Marcar como disponible'
                                          }
                                        >
                                          {prod.available ? (
                                            <Eye className="h-4 w-4" />
                                          ) : (
                                            <EyeOff className="h-4 w-4" />
                                          )}
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingProduct(prod);
                                          setProdModalOpen(true);
                                        }}
                                        className="icon-btn h-8 w-8 hover:text-ink"
                                        title="Editar producto (se actualiza en todas las sucursales)"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteProduct(prod.id)}
                                        className="icon-btn h-8 w-8 hover:text-red-600"
                                        title="Eliminar producto del catálogo"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Columna Derecha: Live Preview en Marco de Teléfono */}
          <div
            className={`lg:col-span-5 xl:col-span-5 ${
              showPreviewMobile ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="sticky top-24">
              <div className="mb-2 flex items-center justify-between px-2">
                <span className="text-[13px] font-semibold uppercase tracking-wider text-subtle">
                  Vista previa en vivo
                </span>
                <a
                  href={`/p/${activeStore.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-muted hover:text-ink"
                >
                  Abrir link <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Marco de Teléfono (iPhone-style) */}
              <div className="relative mx-auto aspect-[9/19] max-w-[360px] overflow-hidden rounded-[44px] border-[8px] border-black/80 bg-white shadow-2xl ring-1 ring-black/10">
                {/* Notch / Dynamic Island */}
                <div className="pointer-events-none absolute left-1/2 top-2 z-40 h-4 w-24 -translate-x-1/2 rounded-full bg-black shadow-sm" />

                {/* Contenido interactivo del celular */}
                <div className="relative h-full w-full overflow-hidden">
                  <PublicMenu
                    store={previewStore}
                    categories={categories}
                    products={
                      isBranch
                        ? products.filter(
                            (p) => !(p.excluded_store_ids || []).includes(activeStore.id)
                          )
                        : products
                    }
                    preview={true}
                  />
                </div>
              </div>

              {showPreviewMobile && (
                <button
                  type="button"
                  onClick={() => setShowPreviewMobile(false)}
                  className="btn-primary mt-4 w-full lg:hidden"
                >
                  Volver al editor
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modales */}
      <QrModal open={qrOpen} onClose={() => setQrOpen(false)} store={activeStore} />

      <BranchModal
        open={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        mainStore={mainStore}
        branchesCount={branches.length}
        userId={userId}
        onCreated={handleBranchCreated}
        onExtraSlotPurchased={(updatedStore) => {
          handleStoreUpdated(updatedStore);
        }}
      />

      <CategoryModal
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        category={editingCategory}
        onSave={handleSaveCategory}
        nextOrder={categories.length}
      />

      <ProductModal
        open={prodModalOpen}
        onClose={() => setProdModalOpen(false)}
        product={editingProduct}
        categories={categories}
        storeId={mainStore.id}
        userId={userId}
        onSave={handleSaveProduct}
        nextOrder={products.length}
      />
    </div>
  );
}
