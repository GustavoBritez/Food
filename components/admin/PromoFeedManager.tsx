'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Clock,
  ExternalLink,
  Flame,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store as StoreIcon,
  Trash2,
} from 'lucide-react';
import { ClocheIcon } from '@/components/ClocheIcon';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { DEMO_PROMO_POSTS } from '@/lib/demo';
import { extractStoragePathFromUrl, removeImageByUrl, uploadImage } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import type { PromoPost, Store } from '@/lib/types';
import { formatPrice, normalizeWhatsapp } from '@/lib/utils';

type ClientStoreOption = Pick<
  Store,
  'id' | 'name' | 'slug' | 'whatsapp' | 'logo_url' | 'subscription_status'
>;

type Props = {
  stores: Store[];
  userId: string;
  isDemo: boolean;
};

function getDaysRemaining(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function PromoFeedManager({ stores, userId, isDemo }: Props) {
  const [promos, setPromos] = useState<PromoPost[]>(isDemo ? DEMO_PROMO_POSTS : []);
  const [allStores, setAllStores] = useState<ClientStoreOption[]>(stores);
  const [loading, setLoading] = useState(!isDemo);
  const [publishing, setPublishing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Campos del formulario de nueva publicación
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id ?? '__CUSTOM__');
  const [customStoreName, setCustomStoreName] = useState('');
  const [customStoreSlug, setCustomStoreSlug] = useState('');
  const [customStoreWhatsapp, setCustomStoreWhatsapp] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [badgeText, setBadgeText] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  const [caption, setCaption] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedStore =
    selectedStoreId !== '__CUSTOM__'
      ? allStores.find((s) => s.id === selectedStoreId) ?? null
      : null;

  useEffect(() => {
    if (isDemo) return;
    fetchPromos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  async function fetchPromos() {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/promos');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudieron cargar las promociones');
      }
      setPromos(data.promos ?? []);
      if (data.stores && data.stores.length > 0) {
        setAllStores(data.stores);
        if (!selectedStoreId || selectedStoreId === '__CUSTOM__') {
          setSelectedStoreId(data.stores[0].id);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar el muro de promos.');
    } finally {
      setLoading(false);
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      setError('');

      if (isDemo) {
        const localPreviewUrl = URL.createObjectURL(file);
        setImageUrl(localPreviewUrl);
        return;
      }

      const supabase = createClient();
      const previousTemp = imageUrl;
      const uploadedUrl = await uploadImage(supabase, userId, file);
      if (previousTemp) {
        removeImageByUrl(supabase, previousTemp);
      }
      setImageUrl(uploadedUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const finalStoreName = selectedStore ? selectedStore.name : customStoreName.trim();
    const finalStoreSlug = selectedStore
      ? selectedStore.slug
      : customStoreSlug.trim().toLowerCase() || null;
    const finalStoreWhatsapp = normalizeWhatsapp(
      selectedStore ? selectedStore.whatsapp : customStoreWhatsapp
    );
    const finalStoreLogo = selectedStore ? selectedStore.logo_url : null;

    if (!finalStoreName || finalStoreName.length < 2) {
      setError('Seleccioná un cliente o escribí el nombre del local.');
      return;
    }
    if (!finalStoreWhatsapp || finalStoreWhatsapp.length < 8) {
      setError('Ingresá un número de WhatsApp válido para recibir pedidos de la promo.');
      return;
    }
    if (!imageUrl) {
      setError('Subí la imagen o flyer de la promoción.');
      return;
    }
    if (!caption.trim()) {
      setError('Escribí la descripción de la promoción.');
      return;
    }

    try {
      setPublishing(true);

      if (isDemo) {
        const demoPost: PromoPost = {
          id: `demo-promo-${Date.now()}`,
          store_id: selectedStore?.id ?? null,
          store_name: finalStoreName,
          store_slug: finalStoreSlug,
          store_whatsapp: finalStoreWhatsapp,
          store_logo_url: finalStoreLogo,
          image_url: imageUrl,
          caption: caption.trim(),
          badge_text: badgeText.trim() || null,
          promo_price: promoPrice ? Number(promoPrice) : null,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        };
        setPromos((prev) => [demoPost, ...prev]);
        setCaption('');
        setBadgeText('');
        setPromoPrice('');
        setImageUrl(null);
        setSuccessMsg('¡Promoción publicada en Modo Demo! Durará 15 días.');
        return;
      }

      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: selectedStore?.id ?? null,
          store_name: finalStoreName,
          store_slug: finalStoreSlug,
          store_whatsapp: finalStoreWhatsapp,
          store_logo_url: finalStoreLogo,
          image_url: imageUrl,
          storage_path: extractStoragePathFromUrl(imageUrl),
          caption: caption.trim(),
          badge_text: badgeText.trim() || null,
          promo_price: promoPrice ? Number(promoPrice) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo publicar la promoción');
      }

      setPromos((prev) => [data.promo as PromoPost, ...prev]);
      setCaption('');
      setBadgeText('');
      setPromoPrice('');
      setImageUrl(null);
      setSuccessMsg('¡Promoción publicada con éxito! Se autodestruirá en 15 días.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al publicar la promoción.');
    } finally {
      setPublishing(false);
    }
  }

  async function handleDeletePromo(promoId: string) {
    if (!confirm('¿Eliminar esta promoción del Menú Principal y borrar su imagen del servidor?')) {
      return;
    }

    if (isDemo) {
      setPromos((prev) => prev.filter((p) => p.id !== promoId));
      return;
    }

    try {
      const res = await fetch(`/api/admin/promos?id=${encodeURIComponent(promoId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('No se pudo eliminar la promoción.');
      }
      setPromos((prev) => prev.filter((p) => p.id !== promoId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar.');
    }
  }

  async function handleCleanupExpired() {
    if (isDemo) {
      setSuccessMsg('Limpieza verificada: 0 publicaciones vencidas.');
      return;
    }
    try {
      setCleaning(true);
      const res = await fetch('/api/admin/promos?action=cleanup', { method: 'DELETE' });
      const data = await res.json();
      setSuccessMsg(
        `Limpieza completada: ${data.cleaned ?? 0} publicación(es) e imágenes vencidas eliminadas.`
      );
      await fetchPromos();
    } catch {
      setError('No se pudo ejecutar la limpieza manual.');
    } finally {
      setCleaning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner de Control FinOps: Autodestrucción 15 Días */}
      <div className="rounded-3xl border border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/[0.06] via-rose-500/[0.06] to-amber-500/[0.06] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-fuchsia-600 text-white shadow-md">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-bold text-ink">
                  Muro de Promos Estilo Instagram (Super-Admin)
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                  <ShieldCheck className="h-3 w-3" /> Ciclo automático de 15 días
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Solo vos podés publicar aquí las promociones que te envían tus clientes. Cada publicación se comprime a WebP (~120 KB), dura <strong>15 días exactos</strong> y al vencer se eliminan tanto la fila SQL como el archivo de Storage para no saturar nunca la base de datos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCleanupExpired}
              disabled={cleaning}
              className="btn-secondary h-9 px-3 text-xs"
              title="Purgar ahora publicaciones e imágenes con más de 15 días"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${cleaning ? 'animate-spin' : ''}`} />
              <span>Purgar vencidas</span>
            </button>
            <Link
              href="/menu-principal"
              target="_blank"
              className="btn-primary h-9 px-3.5 text-xs bg-gradient-to-r from-rose-600 to-fuchsia-600 hover:brightness-110 border-0"
            >
              <span>Abrir /menu-principal</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Formulario para Publicar Nueva Promo */}
      <div className="card p-6 sm:p-7">
        <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-rose-500" /> Publicar Nueva Promoción (Vigente por 15 días)
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Elegí el cliente, subí la imagen que te mandó y publicala en el feed general.
        </p>

        <form onSubmit={handlePublish} className="mt-5 space-y-4">
          {/* 1. Selector de Local Cliente */}
          <div>
            <label htmlFor="promo-store-select" className="label font-semibold text-ink">
              1. Local / Cliente que envía la promoción
            </label>
            <select
              id="promo-store-select"
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="input font-medium"
            >
              {allStores.map((s) => (
                <option key={s.id} value={s.id}>
                  🏪 {s.name} (/p/{s.slug} · WhatsApp: {s.whatsapp})
                </option>
              ))}
              <option value="__CUSTOM__">✍️ Otro local / Cargar datos manualmente</option>
            </select>
          </div>

          {selectedStoreId === '__CUSTOM__' && (
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-black/10 bg-canvas/60 p-4 sm:grid-cols-3">
              <div>
                <label htmlFor="custom-store-name" className="label text-xs">
                  Nombre del Local *
                </label>
                <input
                  id="custom-store-name"
                  type="text"
                  required
                  placeholder="Ej: Burger King Palermo"
                  value={customStoreName}
                  onChange={(e) => setCustomStoreName(e.target.value)}
                  className="input h-10 text-sm"
                />
              </div>
              <div>
                <label htmlFor="custom-store-wp" className="label text-xs">
                  WhatsApp de Pedidos *
                </label>
                <input
                  id="custom-store-wp"
                  type="tel"
                  required
                  placeholder="11 2345 6789"
                  value={customStoreWhatsapp}
                  onChange={(e) => setCustomStoreWhatsapp(e.target.value)}
                  className="input h-10 text-sm"
                />
              </div>
              <div>
                <label htmlFor="custom-store-slug" className="label text-xs">
                  Slug en Carta App (opcional)
                </label>
                <input
                  id="custom-store-slug"
                  type="text"
                  placeholder="ej: mi-bar"
                  value={customStoreSlug}
                  onChange={(e) => setCustomStoreSlug(e.target.value)}
                  className="input h-10 text-sm font-mono"
                />
              </div>
            </div>
          )}

          {/* 2. Subida de Imagen (Formato Instagram) */}
          <div>
            <span className="label font-semibold text-ink">
              2. Imagen o Flyer de la Promoción (Compresión automática a WebP)
            </span>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-black/10 bg-canvas/50 p-4">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-neutral-900">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt="Preview Promo"
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-white/50 text-[11px]">
                    <Camera className="h-6 w-6 mb-1" />
                    <span>1:1 ó 4:5</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="btn-secondary h-10 cursor-pointer px-4 text-xs font-semibold">
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Comprimiendo y subiendo...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        <span>{imageUrl ? 'Cambiar imagen' : 'Seleccionar imagen de la promo'}</span>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      disabled={uploadingPhoto}
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isDemo && imageUrl) {
                          const supabase = createClient();
                          removeImageByUrl(supabase, imageUrl);
                        }
                        setImageUrl(null);
                      }}
                      className="btn-ghost h-9 text-xs text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Quitar
                    </button>
                  )}
                </div>
                <p className="text-[11.5px] text-muted">
                  Las fotos pesadas de celular se optimizan automáticamente a ~120 KB y se eliminan del servidor a los 15 días.
                </p>
              </div>
            </div>
          </div>

          {/* 3. Chapita y Precio Promocional */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="promo-badge" className="label">
                3. Etiqueta / Chapita llamativa (opcional)
              </label>
              <input
                id="promo-badge"
                type="text"
                maxLength={30}
                placeholder="Ej: 2x1 JUEVES, COMBO AMIGOS, 30% OFF"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="promo-price" className="label">
                Precio de la Promo en ARS (opcional)
              </label>
              <input
                id="promo-price"
                type="number"
                min={0}
                step="any"
                placeholder="Ej: 15900"
                value={promoPrice}
                onChange={(e) => setPromoPrice(e.target.value)}
                className="input tabular-nums"
              />
            </div>
          </div>

          {/* 4. Descripción estilo Instagram Caption */}
          <div>
            <label htmlFor="promo-caption" className="label font-semibold text-ink">
              4. Pie de foto / Detalle de la Promoción
            </label>
            <textarea
              id="promo-caption"
              rows={3}
              required
              maxLength={500}
              placeholder="Ej: 🔥 2x1 en Burgers Doble Cheddar + Papas Rústicas todos los miércoles y jueves de 19 a 23 hs. ¡Tocá el botón de WhatsApp para encargar la tuya!"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white p-3 text-[14px] text-ink outline-none transition placeholder:text-subtle focus:border-ink/40 focus:ring-4 focus:ring-black/5"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={publishing || uploadingPhoto}
            className="btn-primary h-12 w-full bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white shadow-md"
          >
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Publicando en el Menú Principal...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Publicar Promoción por 15 Días
              </>
            )}
          </button>
        </form>
      </div>

      {/* Lista de Publicaciones Activas con Contador de Expiración */}
      <div className="card p-6 sm:p-7">
        <div className="flex items-center justify-between border-b border-black/[0.06] pb-4">
          <div>
            <h3 className="text-base font-semibold tracking-tight">
              Publicaciones Activas en `/menu-principal` ({promos.length})
            </h3>
            <p className="text-xs text-muted">
              Se ordenan de la más reciente a la más antigua y se autodestruyen al llegar al día 0.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando publicaciones activas...
          </div>
        ) : promos.length === 0 ? (
          <div className="py-12 text-center text-sm text-subtle">
            No hay promociones activas en este momento. Publicá la primera arriba.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {promos.map((post) => {
              const daysLeft = getDaysRemaining(post.expires_at);
              return (
                <article
                  key={post.id}
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-xs"
                >
                  <div>
                    {/* Cabecera de la card */}
                    <div className="flex items-center justify-between gap-2 border-b border-black/[0.05] px-3.5 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-neutral-900 text-white grid place-items-center">
                          {post.store_logo_url ? (
                            <Image
                              src={post.store_logo_url}
                              alt={post.store_name}
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          ) : (
                            <ClocheIcon className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-ink">{post.store_name}</p>
                          {post.store_slug && (
                            <p className="truncate text-[10.5px] font-mono text-muted">
                              /p/{post.store_slug}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-bold text-amber-800 shrink-0">
                        <Clock className="h-3 w-3" /> {daysLeft}d restantes
                      </span>
                    </div>

                    {/* Imagen */}
                    <div className="relative aspect-[4/3] w-full bg-neutral-900">
                      <Image
                        src={post.image_url}
                        alt={post.store_name}
                        fill
                        sizes="(max-width: 768px) 100vw, 320px"
                        className="object-cover"
                      />
                      {post.badge_text && (
                        <span className="absolute left-2.5 top-2.5 rounded-lg bg-black/75 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md">
                          {post.badge_text}
                        </span>
                      )}
                      {post.promo_price !== null && post.promo_price !== undefined && (
                        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-neutral-950 shadow-md">
                          {formatPrice(post.promo_price)}
                        </span>
                      )}
                    </div>

                    {/* Caption */}
                    <p className="p-3.5 text-xs leading-relaxed text-neutral-700 line-clamp-3">
                      <strong className="font-bold text-ink">{post.store_name}</strong>{' '}
                      {post.caption}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-black/[0.05] bg-canvas/50 px-3.5 py-2 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1">
                      <WhatsAppIcon className="h-3 w-3 text-whatsapp-dark" /> {post.store_whatsapp}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeletePromo(post.id)}
                      className="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar ahora
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
