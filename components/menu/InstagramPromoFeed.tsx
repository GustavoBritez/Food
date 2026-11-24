'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Flame,
  HandPlatter,
  Heart,
  Search,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { ClocheIcon } from '@/components/ClocheIcon';
import { Logo } from '@/components/Logo';
import { PwaInstallButton } from '@/components/PwaInstallButton';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { whatsappUrl } from '@/lib/order';
import type { PromoPost } from '@/lib/types';
import { cn, formatPrice, normalizeText } from '@/lib/utils';

type Props = {
  posts: PromoPost[];
  fromSlug?: string | null;
};

function getDaysRemaining(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function getRelativeTimeLabel(createdAt: string) {
  const diffHours = Math.max(
    1,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60))
  );
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const days = Math.floor(diffHours / 24);
  return days === 1 ? 'Hace 1 día' : `Hace ${days} días`;
}

export function InstagramPromoFeed({ posts, fromSlug }: Props) {
  const [selectedStoreKey, setSelectedStoreKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [doubleTapHeartId, setDoubleTapHeartId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cartaapp:promo_likes');
      if (saved) setLikedIds(new Set(JSON.parse(saved)));
    } catch {
      /* noop */
    }
  }, []);

  function toggleLike(id: string, forceLike = false) {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (forceLike) {
        next.add(id);
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem('cartaapp:promo_likes', JSON.stringify([...next]));
      } catch {
        /* noop */
      }
      return next;
    });
  }

  function handleDoubleTap(id: string) {
    toggleLike(id, true);
    setDoubleTapHeartId(id);
    setTimeout(() => {
      setDoubleTapHeartId((curr) => (curr === id ? null : curr));
    }, 850);
  }

  async function handleShare(post: PromoPost) {
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/menu-principal`
        : '/menu-principal';
    const text = `🔥 Mirá esta promo de ${post.store_name}: ${post.caption}`;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `Promo de ${post.store_name} · Carta App`,
          text,
          url: shareUrl,
        });
        return;
      } catch {
        /* cancelado */
      }
    }
    if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
      await navigator.clipboard.writeText(shareUrl);
      setToast('¡Enlace de la promo copiado!');
      setTimeout(() => setToast(null), 2000);
    }
  }

  // Agrupar locales únicos para la barra superior de Historias (Stories de Instagram)
  const stories = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        name: string;
        slug: string | null;
        logo_url: string | null;
        count: number;
      }
    >();
    posts.forEach((p) => {
      const key = p.store_slug || p.store_name.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, {
          key,
          name: p.store_name,
          slug: p.store_slug,
          logo_url: p.store_logo_url,
          count: 1,
        });
      }
    });
    return Array.from(map.values());
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const q = normalizeText(query.trim());
    return posts.filter((p) => {
      const key = p.store_slug || p.store_name.toLowerCase();
      if (selectedStoreKey && key !== selectedStoreKey) return false;
      if (!q) return true;
      return normalizeText(
        `${p.store_name} ${p.caption} ${p.badge_text ?? ''}`
      ).includes(q);
    });
  }, [posts, selectedStoreKey, query]);

  return (
    <div className="min-h-dvh bg-neutral-950 text-white pb-24">
      {/* Top Navbar Estilo Instagram Dark */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            {fromSlug ? (
              <Link
                href={`/p/${fromSlug}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Volver a la carta</span>
              </Link>
            ) : (
              <Link href="/" className="flex items-center gap-2">
                <Logo className="text-white" />
              </Link>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-fuchsia-500/20 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">
              <Flame className="h-3 w-3 text-rose-400" /> Promos
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
              aria-label="Buscar promociones"
            >
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
            <PwaInstallButton variant="glass" label="App" className="text-[11px] py-1 px-2.5" />
          </div>
        </div>

        {/* Buscador desplegable */}
        {searchOpen && (
          <div className="mx-auto max-w-lg px-4 pb-3 animate-fade-in">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar bar, 2x1, pizza, burger, cerveza..."
                className="h-10 w-full rounded-2xl border border-white/15 bg-white/10 pl-10 pr-9 text-sm text-white placeholder:text-white/40 outline-none focus:border-rose-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Barra de Historias (Stories de Locales con Promos Activas) */}
      {stories.length > 0 && (
        <section
          aria-label="Locales con promociones"
          className="border-b border-white/[0.08] bg-neutral-900/40 py-3.5"
        >
          <div className="no-scrollbar mx-auto flex max-w-lg items-center gap-4 overflow-x-auto px-4">
            {/* Botón "Todas las promos" */}
            <button
              type="button"
              onClick={() => setSelectedStoreKey(null)}
              className="flex shrink-0 flex-col items-center gap-1.5 group"
            >
              <div
                className={cn(
                  'rounded-full p-[2.5px] transition-transform duration-200 group-active:scale-95',
                  selectedStoreKey === null
                    ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 shadow-lg shadow-rose-500/20'
                    : 'bg-white/20'
                )}
              >
                <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-neutral-950 bg-neutral-900 text-white">
                  <Sparkles className="h-6 w-6 text-amber-400" />
                </div>
              </div>
              <span
                className={cn(
                  'max-w-[72px] truncate text-[11px]',
                  selectedStoreKey === null ? 'font-bold text-white' : 'text-white/65'
                )}
              >
                Todas ({posts.length})
              </span>
            </button>

            {/* Círculos estilo Instagram Stories por cada local */}
            {stories.map((st) => {
              const isSelected = selectedStoreKey === st.key;
              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setSelectedStoreKey(isSelected ? null : st.key)}
                  className="flex shrink-0 flex-col items-center gap-1.5 group"
                >
                  <div
                    className={cn(
                      'rounded-full p-[2.5px] transition-transform duration-200 group-active:scale-95',
                      isSelected
                        ? 'bg-gradient-to-tr from-emerald-400 via-teal-500 to-cyan-500 scale-105'
                        : 'bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600'
                    )}
                  >
                    <div className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-full border-2 border-neutral-950 bg-neutral-900">
                      {st.logo_url ? (
                        <Image
                          src={st.logo_url}
                          alt={st.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <ClocheIcon className="h-6 w-6 text-white" />
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'max-w-[76px] truncate text-[11px]',
                      isSelected ? 'font-bold text-emerald-400' : 'text-white/80'
                    )}
                  >
                    {st.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Feed Vertical Estilo Instagram */}
      <main className="mx-auto max-w-lg divide-y divide-white/10">
        {filteredPosts.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <Flame className="mx-auto h-10 w-10 text-rose-500/60" />
            <h2 className="mt-3 text-lg font-bold">No encontramos promociones</h2>
            <p className="mt-1 text-xs text-white/60">
              {query || selectedStoreKey
                ? 'Probá quitando el filtro o buscando otra palabra.'
                : 'Pronto publicaremos nuevas promociones exclusivas de nuestros locales.'}
            </p>
            {(query || selectedStoreKey) && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedStoreKey(null);
                }}
                className="mt-4 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
              >
                Ver todas las promociones
              </button>
            )}
          </div>
        ) : (
          filteredPosts.map((post, idx) => {
            const isLiked = likedIds.has(post.id);
            const daysRemaining = getDaysRemaining(post.expires_at);
            const orderMsg = `¡Hola ${post.store_name}! Vi tu promoción "${
              post.badge_text ? `${post.badge_text} - ` : ''
            }${post.caption.slice(0, 90)}" en el Menú Principal de Carta App y quiero pedirla.`;

            return (
              <article key={post.id} className="bg-neutral-950 py-3 sm:py-5">
                {/* 1. Header del Post (Avatar + Nombre del Local + Tiempo restante) */}
                <div className="flex items-center justify-between gap-3 px-3.5 pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[2px] shrink-0">
                      <div className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-neutral-950 bg-neutral-900">
                        {post.store_logo_url ? (
                          <Image
                            src={post.store_logo_url}
                            alt={post.store_name}
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        ) : (
                          <ClocheIcon className="h-4 w-4 text-white" />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      {post.store_slug ? (
                        <Link
                          href={`/p/${post.store_slug}`}
                          className="flex items-center gap-1 truncate text-[14px] font-bold text-white hover:text-rose-400 transition"
                        >
                          <span className="truncate">{post.store_name}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                        </Link>
                      ) : (
                        <p className="truncate text-[14px] font-bold text-white">
                          {post.store_name}
                        </p>
                      )}
                      <p className="text-[11px] text-white/50">
                        {getRelativeTimeLabel(post.created_at)} · Promoción oficial
                      </p>
                    </div>
                  </div>

                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10.5px] font-bold text-amber-300 shrink-0"
                    title="Las publicaciones duran 15 días y luego se eliminan automáticamente"
                  >
                    <Clock className="h-3 w-3" /> {daysRemaining}d restantes
                  </span>
                </div>

                {/* 2. Imagen de la Publicación Estilo Instagram (Doble tap para Like) */}
                <div
                  onDoubleClick={() => handleDoubleTap(post.id)}
                  className="relative aspect-[4/5] sm:aspect-square w-full overflow-hidden bg-neutral-900 select-none cursor-pointer"
                >
                  <Image
                    src={post.image_url}
                    alt={`${post.store_name} - ${post.caption.slice(0, 60)}`}
                    fill
                    priority={idx === 0}
                    sizes="(max-width: 640px) 100vw, 512px"
                    className="object-cover"
                  />

                  {/* Degradado sutil inferior para legibilidad de insignias */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                  {/* Chapita / Badge de Promo arriba a la izquierda */}
                  {post.badge_text && (
                    <div className="absolute left-3.5 top-3.5 z-10">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-rose-600 to-fuchsia-600 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-lg ring-1 ring-white/20">
                        <Flame className="h-3 w-3" /> {post.badge_text}
                      </span>
                    </div>
                  )}

                  {/* Precio Promocional abajo a la izquierda */}
                  {post.promo_price !== null && post.promo_price !== undefined && (
                    <div className="absolute bottom-3.5 left-3.5 z-10">
                      <span className="inline-flex items-center rounded-2xl border border-white/20 bg-black/80 px-3.5 py-1.5 text-base font-black tabular-nums text-emerald-400 shadow-xl backdrop-blur-md">
                        {formatPrice(post.promo_price)}
                      </span>
                    </div>
                  )}

                  {/* Animación de Corazón al hacer Doble Tap */}
                  {doubleTapHeartId === post.id && (
                    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/15 animate-fade-in">
                      <Heart className="h-24 w-24 fill-rose-500 text-rose-500 drop-shadow-2xl animate-pop" />
                    </div>
                  )}
                </div>

                {/* 3. Barra de Acciones Estilo Instagram */}
                <div className="flex items-center justify-between px-3.5 pt-3">
                  <div className="flex items-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => toggleLike(post.id)}
                      className="inline-flex items-center gap-1.5 text-white transition active:scale-90"
                      aria-label={isLiked ? 'Quitar me gusta' : 'Me gusta'}
                    >
                      <Heart
                        className={cn(
                          'h-6 w-6 transition-transform',
                          isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white hover:text-white/80'
                        )}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShare(post)}
                      className="inline-flex items-center gap-1.5 text-white/90 hover:text-white transition active:scale-90"
                      aria-label="Compartir promoción"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>

                  {post.store_slug && (
                    <Link
                      href={`/p/${post.store_slug}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15 active:scale-95"
                    >
                      <HandPlatter className="h-3.5 w-3.5 text-amber-400" />
                      <span>Ver Carta Completa</span>
                    </Link>
                  )}
                </div>

                {/* 4. Caption (Nombre del local + descripción) */}
                <div className="px-3.5 pt-2.5 text-[13.5px] leading-relaxed text-neutral-200">
                  <p>
                    <strong className="font-bold text-white mr-1.5">{post.store_name}</strong>
                    {post.caption}
                  </p>
                </div>

                {/* 5. CTA Directo a WhatsApp del Local */}
                <div className="px-3.5 pt-3.5">
                  <a
                    href={whatsappUrl(post.store_whatsapp, orderMsg)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 text-[13.5px] font-bold text-neutral-950 shadow-lg shadow-[#25D366]/15 transition hover:brightness-105 active:scale-[0.98]"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    <span>Pedir esta Promo por WhatsApp</span>
                  </a>
                </div>
              </article>
            );
          })
        )}
      </main>

      {/* Toast de copiado */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center animate-fade-in">
          <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-neutral-950 shadow-2xl">
            {toast}
          </span>
        </div>
      )}
    </div>
  );
}
