'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  LogOut,
  Pencil,
  Plus,
  QrCode,
  Settings,
  Smartphone,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { PublicMenu } from '@/components/menu/PublicMenu';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { CategoryModal } from './CategoryModal';
import { ProductModal } from './ProductModal';
import { QrModal } from './QrModal';
import { StoreSettings } from './StoreSettings';
import { createClient } from '@/lib/supabase/client';
import type { Category, Product, Store } from '@/lib/types';
import { formatPrice, menuUrl } from '@/lib/utils';

type Props = {
  initialStore: Store;
  initialCategories: Category[];
  initialProducts: Product[];
  userId: string;
};

export function AdminDashboard({
  initialStore,
  initialCategories,
  initialProducts,
  userId,
}: Props) {
  const [store, setStore] = useState<Store>(initialStore);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(initialProducts);

  // Modales
  const [qrOpen, setQrOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Tabs / Vistas y borrador de previsualización en vivo
  const [activeTab, setActiveTab] = useState<'menu' | 'settings'>('menu');
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<Partial<Store>>({});

  const previewStore = { ...store, ...previewDraft };

  // Toasts de copiado
  const [copiedWp, setCopiedWp] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  // --- Manejo de Store ---
  function handleStoreUpdated(updated: Store, previousSlug?: string) {
    setStore(updated);
    setPreviewDraft({});
    triggerRevalidate(previousSlug);
  }

  // --- Manejo de Categorías ---
  async function handleSaveCategory(data: { id?: string; name: string; order: number }) {
    if (data.id) {
      const { data: updated, error } = await supabase
        .from('categories')
        .update({ name: data.name, order: data.order })
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
          store_id: store.id,
          name: data.name,
          order: data.order,
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

    const { error } = await supabase.from('categories').delete().eq('id', catId);
    if (error) {
      alert('No se pudo eliminar la categoría.');
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    setProducts((prev) => prev.filter((p) => p.category_id !== catId));
    triggerRevalidate();
  }

  // --- Manejo de Productos ---
  async function handleSaveProduct(data: Partial<Product> & { id?: string }) {
    if (data.id) {
      const { id, ...rest } = data;
      const { data: updated, error } = await supabase
        .from('products')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setProducts((prev) =>
        prev
          .map((p) => (p.id === id ? { ...(updated as Product), price: Number(updated.price) } : p))
          .sort((a, b) => a.order - b.order)
      );
    } else {
      const { data: created, error } = await supabase
        .from('products')
        .insert({
          store_id: store.id,
          category_id: data.category_id!,
          name: data.name!,
          description: data.description ?? null,
          price: data.price!,
          photo_url: data.photo_url ?? null,
          video_url: data.video_url ?? null,
          available: data.available ?? true,
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
    const { error } = await supabase.from('products').delete().eq('id', prodId);
    if (error) {
      alert('No se pudo eliminar el producto.');
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== prodId));
    triggerRevalidate();
  }

  // --- Copiar Enlaces ---
  async function copyWhatsappLink() {
    const wpUrl = `https://wa.me/${store.whatsapp}`;
    try {
      await navigator.clipboard.writeText(wpUrl);
      setCopiedWp(true);
      setTimeout(() => setCopiedWp(false), 2000);
    } catch {
      /* fallback */
    }
  }

  async function copyMenuLink() {
    const url = menuUrl(store.slug);
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
              <span className="truncate text-[15px] font-semibold">{store.name}</span>
              <a
                href={`/p/${store.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-0.5 text-[12px] font-medium text-muted transition hover:bg-black/5 hover:text-ink"
              >
                /p/{store.slug} <ExternalLink className="h-3 w-3" />
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

      {/* Barra de Subnavegación del Admin */}
      <div className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
          <nav className="flex gap-1 py-2">
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
              <Settings className="h-4 w-4" /> Datos del Local
            </button>
          </nav>

          <button
            type="button"
            onClick={copyMenuLink}
            className="hidden text-[13px] text-muted hover:text-ink sm:inline-flex sm:items-center sm:gap-1.5"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-whatsapp-dark" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedLink ? 'Link copiado' : 'Copiar link del menú'}
          </button>
        </div>
      </div>

      {/* Layout Principal: Dos columnas en Desktop (Gestión + Live Preview) */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Columna Izquierda: CRUD / Configuración */}
          <div
            className={`space-y-6 ${
              showPreviewMobile ? 'hidden lg:block' : 'block'
            } lg:col-span-7 xl:col-span-7`}
          >
            {activeTab === 'settings' ? (
              <StoreSettings
                store={store}
                userId={userId}
                onUpdate={handleStoreUpdated}
                onPreviewDraft={setPreviewDraft}
              />
            ) : (
              <>
                {/* Cabecera del Menú */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">Tu Menú Digital</h2>
                    <p className="text-[13px] text-muted">
                      {categories.length} categoría(s) · {products.length} producto(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
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
                            <div className="flex items-center gap-2">
                              <h3 className="text-[15px] font-semibold tracking-tight">
                                {category.name}
                              </h3>
                              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-subtle shadow-sm">
                                {categoryProducts.length}
                              </span>
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
                              {categoryProducts.map((prod) => (
                                <div
                                  key={prod.id}
                                  className={`flex items-center gap-3.5 p-4 transition ${
                                    !prod.available ? 'opacity-60' : ''
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
                                    <div className="flex items-baseline gap-2">
                                      <h4 className="truncate text-[15px] font-medium leading-snug">
                                        {prod.name}
                                      </h4>
                                      {!prod.available && (
                                        <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                                          Agotado
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
                                  <div className="flex items-center gap-1">
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
                                          ? 'Marcar como agotado'
                                          : 'Marcar como disponible'
                                      }
                                    >
                                      {prod.available ? (
                                        <Eye className="h-4 w-4" />
                                      ) : (
                                        <EyeOff className="h-4 w-4" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingProduct(prod);
                                        setProdModalOpen(true);
                                      }}
                                      className="icon-btn h-8 w-8 hover:text-ink"
                                      title="Editar producto"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteProduct(prod.id)}
                                      className="icon-btn h-8 w-8 hover:text-red-600"
                                      title="Eliminar producto"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
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
                  href={`/p/${store.slug}`}
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
                    products={products}
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
      <QrModal open={qrOpen} onClose={() => setQrOpen(false)} store={store} />

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
        storeId={store.id}
        userId={userId}
        onSave={handleSaveProduct}
        nextOrder={products.length}
      />
    </div>
  );
}
