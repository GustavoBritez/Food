'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Camera, Film, Loader2, Plus, Trash2 } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { uploadImage, uploadVideo } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import type { Category, PriceVariant, Product, ProductBadge } from '@/lib/types';

type Props = {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  categories: Category[];
  storeId: string;
  userId: string;
  onSave: (prod: Partial<Product> & { id?: string }) => Promise<void>;
  nextOrder: number;
};

export function ProductModal({
  open,
  onClose,
  product,
  categories,
  storeId,
  userId,
  onSave,
  nextOrder,
}: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [categoryId, setCategoryId] = useState('');
  const [badgeLabel, setBadgeLabel] = useState('');
  const [priceVariants, setPriceVariants] = useState<PriceVariant[]>([]);
  const [available, setAvailable] = useState(true);
  const [badges, setBadges] = useState<ProductBadge[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [order, setOrder] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? '');
      setPrice(String(product.price));
      setCategoryId(product.category_id);
      setBadgeLabel(product.badge_label ?? '');
      setPriceVariants(product.price_variants ?? []);
      setAvailable(product.available);
      setBadges(product.badges ?? []);
      setPhotoUrl(product.photo_url);
      setVideoUrl(product.video_url ?? null);
      setOrder(product.order);
    } else {
      setName('');
      setDescription('');
      setPrice('');
      const defaultCat = categories[0];
      setCategoryId(defaultCat?.id ?? '');
      setBadgeLabel('');
      // Si la categoría por defecto tiene columnas de precio, inicializarlas
      if (defaultCat?.price_columns && defaultCat.price_columns.length > 0) {
        setPriceVariants(defaultCat.price_columns.map((col) => ({ label: col, price: 0 })));
      } else {
        setPriceVariants([]);
      }
      setAvailable(true);
      setBadges([]);
      setPhotoUrl(null);
      setVideoUrl(null);
      setOrder(nextOrder);
    }
    setError('');
  }, [product, categories, nextOrder, open]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');
      const supabase = createClient();
      const url = await uploadImage(supabase, userId, file);
      setPhotoUrl(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingVideo(true);
      setError('');
      const supabase = createClient();
      const url = await uploadVideo(supabase, userId, file);
      setVideoUrl(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el video.');
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    const numPrice = Number(price);

    if (!cleanName) {
      setError('Ingresá el nombre del producto.');
      return;
    }
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Ingresá un precio válido.');
      return;
    }
    if (!categoryId) {
      setError('Seleccioná una categoría.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const cleanVariants = priceVariants
        .filter((v) => v.label.trim() && !isNaN(Number(v.price)))
        .map((v) => ({ label: v.label.trim(), price: Number(v.price) }));

      await onSave({
        id: product?.id,
        store_id: storeId,
        category_id: categoryId,
        name: cleanName,
        description: description.trim() || null,
        price: numPrice,
        photo_url: photoUrl,
        video_url: videoUrl,
        badge_label: badgeLabel.trim() || null,
        price_variants: cleanVariants,
        available,
        badges,
        order: Number(order) || 0,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('row-level security') || msg.includes('42501')) {
        setError('Para guardar platos necesitás activar tu mes gratis o suscribirte con Mercado Pago desde el banner superior.');
      } else {
        setError(msg || 'Error al guardar el producto.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={product ? 'Editar Producto' : 'Nuevo Producto'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {/* Multimedia: Foto y Video */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Foto del producto */}
          <div className="rounded-2xl border border-black/[0.08] p-3 bg-canvas/50">
            <span className="label text-[12px] font-semibold text-ink">Foto del plato</span>
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-canvas">
                {photoUrl ? (
                  <Image src={photoUrl} alt="Foto" fill sizes="64px" className="object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-subtle">
                    <Camera className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="btn-secondary h-8 cursor-pointer text-[12px] px-3">
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-3.5 w-3.5" /> {photoUrl ? 'Cambiar' : 'Subir foto'}
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(null)}
                    className="btn-ghost h-6 text-[11px] text-red-600 hover:text-red-700 justify-start px-1"
                  >
                    <Trash2 className="h-3 w-3" /> Quitar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Video corto para modo feed */}
          <div className="rounded-2xl border border-black/[0.08] p-3 bg-canvas/50">
            <span className="label text-[12px] font-semibold text-ink">Video corto (Reels)</span>
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-black">
                {videoUrl ? (
                  <video src={videoUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-white/50">
                    <Film className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="btn-secondary h-8 cursor-pointer text-[12px] px-3">
                  {uploadingVideo ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Film className="h-3.5 w-3.5" /> {videoUrl ? 'Cambiar' : 'Subir video'}
                    </>
                  )}
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    disabled={uploadingVideo}
                    onChange={handleVideoChange}
                    className="hidden"
                  />
                </label>
                {videoUrl && (
                  <button
                    type="button"
                    onClick={() => setVideoUrl(null)}
                    className="btn-ghost h-6 text-[11px] text-red-600 hover:text-red-700 justify-start px-1"
                  >
                    <Trash2 className="h-3 w-3" /> Quitar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label htmlFor="prod-name" className="label">
            Nombre del plato o bebida
          </label>
          <input
            id="prod-name"
            type="text"
            required
            maxLength={100}
            placeholder="Ej: Pizza Napolitana, Pinta IPA"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </div>

        {/* Categoría y Precio */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="prod-cat" className="label">
              Categoría
            </label>
            <select
              id="prod-cat"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input appearance-none bg-white pr-8"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="prod-price" className="label">
              Precio General ($)
            </label>
            <input
              id="prod-price"
              type="number"
              step="any"
              min={0}
              required
              placeholder="12500"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input tabular-nums"
            />
          </div>
        </div>

        {/* Chapita / Etiqueta de Promo */}
        <div>
          <label htmlFor="prod-badge-label" className="label">
            Chapita o Etiqueta Destacada (opcional)
          </label>
          <input
            id="prod-badge-label"
            type="text"
            maxLength={25}
            placeholder="Ej: PROMO 1, COMBO 4, PARA 2 PERSONAS"
            value={badgeLabel}
            onChange={(e) => setBadgeLabel(e.target.value)}
            className="input"
          />
          <p className="mt-1 text-[11.5px] text-subtle">
            Se muestra como una píldora llamativa sobre el plato en el Folleto Digital.
          </p>
        </div>

        {/* Múltiples Precios / Variantes (Grande / Chica, etc.) */}
        <div className="rounded-2xl border border-black/10 bg-canvas/40 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12.5px] font-bold text-ink">Precios por Tamaño / Variante</p>
              <p className="text-[11px] text-subtle">
                Ideal para Pizzas (Gde / Chica), Pastas (Clásica / Especial) o promociones.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPriceVariants((prev) => [...prev, { label: '', price: 0 }])}
              className="inline-flex items-center gap-1 rounded-lg bg-black/5 hover:bg-black/10 px-2.5 py-1 text-[11.5px] font-semibold text-ink transition active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar variante
            </button>
          </div>

          {priceVariants.length > 0 ? (
            <div className="space-y-2">
              {priceVariants.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tamaño (ej: Grande)"
                    value={v.label}
                    onChange={(e) => {
                      const updated = [...priceVariants];
                      updated[idx].label = e.target.value;
                      setPriceVariants(updated);
                    }}
                    className="input h-9 flex-1 text-[13px]"
                  />
                  <div className="relative w-32 shrink-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle text-xs font-bold">$</span>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      placeholder="Precio"
                      value={v.price || ''}
                      onChange={(e) => {
                        const updated = [...priceVariants];
                        updated[idx].price = Number(e.target.value);
                        setPriceVariants(updated);
                      }}
                      className="input h-9 pl-6 pr-2 tabular-nums text-[13px]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPriceVariants((prev) => prev.filter((_, i) => i !== idx))}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-red-500 hover:bg-red-500/10 transition"
                    title="Eliminar variante"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-muted italic">
              Sin variantes cargadas. Se usará el precio general ($ {price || '0'}).
            </p>
          )}
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="prod-desc" className="label">
            Descripción o ingredientes (opcional)
          </label>
          <textarea
            id="prod-desc"
            rows={2}
            maxLength={500}
            placeholder="Ej: Muzzarella, rodajas de tomate, ajo y albahaca fresca."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white p-3 text-[14px] text-ink outline-none transition placeholder:text-subtle focus:border-ink/40 focus:ring-4 focus:ring-black/5"
          />
        </div>

        {/* Etiquetas gastronómicas (badges) */}
        <div>
          <span className="label">Etiquetas gastronómicas (opcional)</span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'destacado', label: '⭐ Destacado' },
              { id: 'vegano', label: '🌱 Vegano' },
              { id: 'vegetariano', label: '🥬 Vegetariano' },
              { id: 'sin_tacc', label: '🌾 Sin TACC' },
              { id: 'picante', label: '🌶️ Picante' },
            ].map((badge) => {
              const active = badges.includes(badge.id as ProductBadge);
              return (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => {
                    setBadges((prev) =>
                      active
                        ? prev.filter((b) => b !== badge.id)
                        : [...prev, badge.id as ProductBadge]
                    );
                  }}
                  className={`inline-flex items-center rounded-xl border px-3 py-1.5 text-[12px] font-medium transition active:scale-95 ${
                    active
                      ? 'border-ink bg-ink text-white shadow-xs font-semibold'
                      : 'border-black/10 bg-white text-muted hover:bg-canvas'
                  }`}
                >
                  {badge.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Switch disponible */}
        <div className="flex items-center justify-between rounded-2xl bg-canvas p-3.5">
          <div>
            <p className="text-[14px] font-medium">Disponible para pedir</p>
            <p className="text-[12px] text-muted">
              Si se agotó, desactivalo para que no aparezca en el menú.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={available}
            onClick={() => setAvailable(!available)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${
              available ? 'bg-ink' : 'bg-black/20'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                available ? 'translate-x-6' : 'translate-x-1'
              } mt-1`}
            />
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="pt-2">
          <button type="submit" className="btn-primary h-12 w-full" disabled={saving || uploading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar producto'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
