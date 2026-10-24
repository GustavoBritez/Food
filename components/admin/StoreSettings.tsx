'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Film,
  LayoutGrid,
  Loader2,
  Moon,
  Palette,
  Receipt,
  RotateCcw,
  Sparkles,
  Stamp,
  Store as StoreIcon,
  Sun,
  Trash2,
  Type,
} from 'lucide-react';
import { uploadImage, removeImageByUrl } from '@/lib/storage';
import { ClocheIcon } from '@/components/ClocheIcon';
import { createClient } from '@/lib/supabase/client';
import type {
  BgPattern,
  ButtonStyle,
  FontPair,
  MenuLayout,
  MenuTheme,
  PriceFormat,
  Store,
  ThemeConfig,
} from '@/lib/types';
import { THEME_PRESETS, type ThemePreset } from '@/lib/theme-presets';
import { DEFAULT_ACCENT, normalizeWhatsapp, SLUG_REGEX, slugify } from '@/lib/utils';

type Props = {
  store: Store;
  userId: string;
  onUpdate: (updated: Store, prevSlug?: string) => void;
  onPreviewDraft?: (draft: Partial<Store>) => void;
  onDeleteBranch?: (branchId: string) => void;
};

const COLOR_PRESETS = [
  { name: 'Verde', hex: '#22c55e' },
  { name: 'Rojo', hex: '#ef4444' },
  { name: 'Naranja', hex: '#f97316' },
  { name: 'Dorado', hex: '#eab308' },
  { name: 'Violeta', hex: '#8b5cf6' },
  { name: 'Azul', hex: '#3b82f6' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Negro', hex: '#0f172a' },
];

const BG_DARK_PRESETS = [
  { name: 'Carbón', hex: '#0a0a0a' },
  { name: 'Grafito', hex: '#18181b' },
  { name: 'Medianoche', hex: '#0b132b' },
  { name: 'Espresso', hex: '#1c140e' },
  { name: 'Bosque', hex: '#061a12' },
];

const BG_LIGHT_PRESETS = [
  { name: 'Blanco', hex: '#ffffff' },
  { name: 'Crema', hex: '#fbf8f2' },
  { name: 'Papel', hex: '#f4f4f5' },
  { name: 'Almendra', hex: '#f7f2ea' },
  { name: 'Menta', hex: '#f0fdf4' },
];

export function StoreSettings({ store, userId, onUpdate, onPreviewDraft }: Props) {
  const [name, setName] = useState(store.name);
  const [tagline, setTagline] = useState(store.tagline ?? '');
  const [slug, setSlug] = useState(store.slug);
  const [whatsapp, setWhatsapp] = useState(store.whatsapp);
  const [logoUrl, setLogoUrl] = useState<string | null>(store.logo_url);
  const [coverUrl, setCoverUrl] = useState<string | null>(store.cover_url ?? null);
  const [accentColor, setAccentColor] = useState(store.accent_color || DEFAULT_ACCENT);
  const [layout, setLayout] = useState<MenuLayout>(store.layout || 'feed');
  const [theme, setTheme] = useState<MenuTheme>(store.theme || 'dark');
  const [bgColor, setBgColor] = useState<string>(
    store.bg_color || (store.theme === 'light' ? '#ffffff' : '#0a0a0a')
  );
  const [buttonStyle, setButtonStyle] = useState<ButtonStyle>(store.button_style || 'accent');
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(
    store.theme_config || {
      presetId: 'urban_reels',
      fontPair: 'modern',
      bgPattern: 'none',
      priceFormat: 'badge',
      showNetPrice: false,
      showWatermark: false,
    }
  );

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const presetsScrollRef = useRef<HTMLDivElement>(null);

  const applyPreset = (preset: ThemePreset) => {
    setLayout(preset.layout);
    setTheme(preset.theme);
    setBgColor(preset.bg_color);
    setAccentColor(preset.accent_color);
    setButtonStyle(preset.button_style);
    setThemeConfig(preset.theme_config);
  };

  // Sincroniza el formulario cuando el usuario cambia de sucursal en el selector
  useEffect(() => {
    setName(store.name);
    setTagline(store.tagline ?? '');
    setSlug(store.slug);
    setWhatsapp(store.whatsapp);
    setLogoUrl(store.logo_url);
    setCoverUrl(store.cover_url ?? null);
    setAccentColor(store.accent_color || DEFAULT_ACCENT);
    setLayout(store.layout || 'feed');
    setTheme(store.theme || 'dark');
    setBgColor(store.bg_color || (store.theme === 'light' ? '#ffffff' : '#0a0a0a'));
    setButtonStyle(store.button_style || 'accent');
    if (store.theme_config) setThemeConfig(store.theme_config);
  }, [store.id]);

  // Avisa al dashboard para previsualizar los cambios en vivo en el celular
  useEffect(() => {
    onPreviewDraft?.({
      name,
      tagline: tagline.trim() || null,
      slug,
      whatsapp,
      logo_url: logoUrl,
      cover_url: coverUrl,
      accent_color: accentColor,
      layout,
      theme,
      bg_color: bgColor,
      button_style: buttonStyle,
      theme_config: themeConfig,
    });
  }, [
    name,
    tagline,
    slug,
    whatsapp,
    logoUrl,
    coverUrl,
    accentColor,
    layout,
    theme,
    bgColor,
    buttonStyle,
    themeConfig,
    onPreviewDraft,
  ]);

  function handleThemeChange(newTheme: MenuTheme) {
    setTheme(newTheme);
    if (newTheme === 'light' && (bgColor === '#0a0a0a' || bgColor === '#000000' || bgColor === '#18181b')) {
      setBgColor('#ffffff');
    } else if (newTheme === 'dark' && (bgColor === '#ffffff' || bgColor === '#fbf8f2' || bgColor === '#f4f4f5')) {
      setBgColor('#0a0a0a');
    }
  }

  // Auto-slugify si el usuario toca el nombre pero nunca tocó el slug manualmente
  function handleNameChange(val: string) {
    setName(val);
    if (!slug || slug === slugify(store.name)) {
      setSlug(slugify(val));
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      setError('');
      const supabase = createClient();
      const url = await uploadImage(supabase, userId, file);
      setLogoUrl(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el logo.');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCover(true);
      setError('');
      const supabase = createClient();
      const url = await uploadImage(supabase, userId, file);
      setCoverUrl(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto de portada.');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanSlug = slug.trim().toLowerCase();
    const cleanWp = normalizeWhatsapp(whatsapp);

    if (!cleanName) {
      setError('El nombre del local es obligatorio.');
      return;
    }
    if (!SLUG_REGEX.test(cleanSlug)) {
      setError('El link público solo puede tener letras minúsculas, números y guiones (ej: mi-bar).');
      return;
    }
    if (!cleanWp || cleanWp.length < 8) {
      setError('Ingresá un número de WhatsApp válido.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (store.id === 'demo-store' || userId === 'demo-user') {
        const updatedStore: Store = {
          ...store,
          name: cleanName,
          tagline: tagline.trim() || null,
          slug: cleanSlug,
          whatsapp: cleanWp,
          logo_url: logoUrl,
          cover_url: coverUrl,
          accent_color: accentColor,
          layout,
          theme,
          bg_color: bgColor,
          button_style: buttonStyle,
          theme_config: themeConfig,
        };
        onUpdate(updatedStore, store.slug !== cleanSlug ? store.slug : undefined);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        return;
      }

      const supabase = createClient();
      const payload: Record<string, unknown> = {
        name: cleanName,
        tagline: tagline.trim() || null,
        slug: cleanSlug,
        whatsapp: cleanWp,
        logo_url: logoUrl,
        cover_url: coverUrl,
        accent_color: accentColor,
        layout,
        theme,
        bg_color: bgColor,
        button_style: buttonStyle,
        theme_config: themeConfig,
      };

      let finalData: Store | null = null;
      const { data, error: updateError } = await supabase
        .from('stores')
        .update(payload)
        .eq('id', store.id)
        .select()
        .single();

      if (
        updateError &&
        (updateError.code === '42703' ||
          updateError.code === '23514' ||
          updateError.message?.includes('theme') ||
          updateError.message?.includes('button_style') ||
          updateError.message?.includes('theme_config') ||
          updateError.message?.includes('layout'))
      ) {
        console.warn('Fallback al guardar columnas principales (migración pendiente):', updateError.message);
        const safeLayout = layout;
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('stores')
          .update({
            name: cleanName,
            tagline: tagline.trim() || null,
            slug: cleanSlug,
            whatsapp: cleanWp,
            logo_url: logoUrl,
            cover_url: coverUrl,
            accent_color: accentColor,
            layout: safeLayout,
          })
          .eq('id', store.id)
          .select()
          .single();

        if (fallbackError) {
          if (fallbackError.code === '23505') {
            throw new Error(`El link "/p/${cleanSlug}" ya está siendo usado por otro local. Elegí otro.`);
          }
          throw new Error(fallbackError.message);
        }

        finalData = {
          ...(fallbackData as Store),
          theme,
          bg_color: bgColor,
          button_style: buttonStyle,
          layout,
          theme_config: themeConfig,
        };
      } else if (updateError) {
        if (updateError.code === '23505') {
          throw new Error(`El link "/p/${cleanSlug}" ya está siendo usado por otro local. Elegí otro.`);
        }
        throw new Error(updateError.message);
      } else {
        finalData = data as Store;
      }

      // Limpiar imágenes antiguas de Storage si fueron reemplazadas o eliminadas
      if (store.logo_url && store.logo_url !== logoUrl) {
        removeImageByUrl(supabase, store.logo_url);
      }
      if (store.cover_url && store.cover_url !== coverUrl) {
        removeImageByUrl(supabase, store.cover_url);
      }

      const prevSlug = store.slug !== cleanSlug ? store.slug : undefined;
      if (finalData) {
        onUpdate(finalData, prevSlug);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar los datos.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-6 sm:p-7">
      <div className="flex items-center gap-3 border-b border-black/[0.06] pb-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-canvas text-ink">
          <StoreIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Personalización y Datos del Local</h2>
          <p className="text-[13px] text-muted">Ajustá colores, estilo de menú, logo y datos de contacto</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-6">
        {/* 0. Plantillas Rápidas por Rubro (Carrusel con flechas) */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <span className="label font-semibold text-ink mb-0">
                Plantillas Rápidas por Rubro
              </span>
              <p className="text-[11.5px] text-muted">Aplicá estilo completo en 1 clic</p>
            </div>

            {/* Flechas de navegación para el carrusel */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => presetsScrollRef.current?.scrollBy({ left: -250, behavior: 'smooth' })}
                className="grid h-8 w-8 place-items-center rounded-xl border border-black/10 bg-white hover:bg-canvas text-ink transition active:scale-90 shadow-xs"
                title="Ver plantilla anterior"
                aria-label="Plantilla anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => presetsScrollRef.current?.scrollBy({ left: 250, behavior: 'smooth' })}
                className="grid h-8 w-8 place-items-center rounded-xl border border-black/10 bg-white hover:bg-canvas text-ink transition active:scale-90 shadow-xs"
                title="Ver siguiente plantilla"
                aria-label="Siguiente plantilla"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={presetsScrollRef}
            className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth pb-2 -mx-1 px-1"
          >
            {THEME_PRESETS.map((preset) => {
              const isActive =
                themeConfig.presetId === preset.id ||
                (layout === preset.layout &&
                  theme === preset.theme &&
                  bgColor.toLowerCase() === preset.bg_color.toLowerCase());

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`flex min-w-[240px] max-w-[260px] shrink-0 flex-col justify-between rounded-2xl border p-4 text-left transition active:scale-[0.98] ${
                    isActive
                      ? 'border-ink bg-black/[0.04] ring-2 ring-ink/20 shadow-sm'
                      : 'border-black/10 bg-white hover:border-black/20 hover:bg-canvas'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[14px] font-bold text-ink leading-tight">{preset.name}</span>
                      {isActive && <Check className="h-4 w-4 shrink-0 text-ink" />}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                      {preset.subtitle}
                    </p>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-black/[0.06] text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-xs"
                        style={{ backgroundColor: preset.bg_color }}
                        title={`Fondo: ${preset.bg_color}`}
                      />
                      <span
                        className="h-3.5 w-3.5 rounded-full shadow-xs"
                        style={{ backgroundColor: preset.accent_color }}
                        title={`Acento: ${preset.accent_color}`}
                      />
                      <span className="font-mono text-[10px] text-muted capitalize">{preset.theme}</span>
                    </div>
                    <span className="rounded-md bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink">
                      {preset.layout}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. Estilo de Menú (Layout) */}
        <div>
          <span className="label flex items-center gap-1.5 font-semibold text-ink">
            <LayoutGrid className="h-4 w-4 text-amber-500" /> Formato del Menú para tus clientes
          </span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setLayout('feed')}
              className={`flex flex-col items-start rounded-2xl border p-4 text-left transition ${
                layout === 'feed'
                  ? 'border-ink bg-black/[0.03] ring-2 ring-ink/10'
                  : 'border-black/10 bg-white hover:bg-canvas'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                  <Film className="h-4 w-4 text-rose-500" /> Feed Deslizable (Reels)
                </span>
                {layout === 'feed' && <Check className="h-4 w-4 text-ink" />}
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                Pantalla completa vertical con fotos y videos interactivos (estilo TikTok/Instagram). Ideal para generar antojo visual.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setLayout('list')}
              className={`flex flex-col items-start rounded-2xl border p-4 text-left transition ${
                layout === 'list'
                  ? 'border-ink bg-black/[0.03] ring-2 ring-ink/10'
                  : 'border-black/10 bg-white hover:bg-canvas'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                  <StoreIcon className="h-4 w-4 text-blue-500" /> Lista Clásica
                </span>
                {layout === 'list' && <Check className="h-4 w-4 text-ink" />}
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                Formato tradicional por secciones con buscador instantáneo, fotos compactas y navegación rápida.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setLayout('editorial')}
              className={`flex flex-col items-start rounded-2xl border p-4 text-left transition ${
                layout === 'editorial'
                  ? 'border-ink bg-black/[0.03] ring-2 ring-ink/10'
                  : 'border-black/10 bg-white hover:bg-canvas'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                  <BookOpen className="h-4 w-4 text-purple-600" /> Carta Editorial / Autor
                </span>
                {layout === 'editorial' && <Check className="h-4 w-4 text-ink" />}
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                Estilo carta física de autor, hoteles y bodegones. Tipografías refinadas y acabados elegantes.
              </p>
            </button>
          </div>
        </div>

        {/* 1.1 Configuración Editorial y Tokens de Diseño */}
        {layout === 'editorial' && (
          <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 sm:p-5 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-black/[0.06] pb-3">
              <BookOpen className="h-4 w-4 text-purple-600" />
              <h3 className="text-[14px] font-semibold text-ink">Personalización de Carta Editorial</h3>
            </div>

            {/* Tipografía de Títulos (FontPair) */}
            <div>
              <span className="label flex items-center gap-1.5 font-medium text-ink">
                <Type className="h-3.5 w-3.5 text-muted" /> Tipografía de Títulos y Secciones
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { id: 'modern', label: 'Moderna', font: 'Sans-serif limpia' },
                  { id: 'serif', label: 'Elegante Serif', font: 'Hoteles y Bodegones' },
                  { id: 'script', label: 'Caligráfica', font: 'Autor / Oriental' },
                  { id: 'mono', label: 'Monospace', font: 'Minimalista chic' },
                ].map((f) => {
                  const active = (themeConfig.fontPair || 'modern') === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setThemeConfig((prev) => ({ ...prev, fontPair: f.id as FontPair }))
                      }
                      className={`rounded-xl border p-2.5 text-left transition ${
                        active
                          ? 'border-ink bg-white ring-2 ring-ink/15 font-semibold'
                          : 'border-black/10 bg-white/70 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12.5px] text-ink">{f.label}</span>
                        {active && <Check className="h-3 w-3 text-ink" />}
                      </div>
                      <p className="mt-0.5 text-[10.5px] text-muted">{f.font}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Textura de Fondo (BgPattern) */}
            <div>
              <span className="label flex items-center gap-1.5 font-medium text-ink">
                <Palette className="h-3.5 w-3.5 text-muted" /> Textura de Fondo
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { id: 'none', label: 'Liso', desc: 'Sin textura' },
                  { id: 'waves', label: 'Ondas Orientales', desc: 'Efecto Seigaiha' },
                  { id: 'paper', label: 'Papel Texturado', desc: 'Efecto fibra' },
                  { id: 'dots', label: 'Puntos Finos', desc: 'Trama sutil' },
                ].map((p) => {
                  const active = (themeConfig.bgPattern || 'none') === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setThemeConfig((prev) => ({ ...prev, bgPattern: p.id as BgPattern }))
                      }
                      className={`rounded-xl border p-2.5 text-left transition ${
                        active
                          ? 'border-ink bg-white ring-2 ring-ink/15 font-semibold'
                          : 'border-black/10 bg-white/70 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12.5px] text-ink">{p.label}</span>
                        {active && <Check className="h-3 w-3 text-ink" />}
                      </div>
                      <p className="mt-0.5 text-[10.5px] text-muted">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formato de Precio (PriceFormat) */}
            <div>
              <span className="label flex items-center gap-1.5 font-medium text-ink">
                <Receipt className="h-3.5 w-3.5 text-muted" /> Formato de Precios
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { id: 'inline-dot', label: 'Punto Guía', example: 'Plato • $11.000' },
                  { id: 'badge', label: 'Insignia', example: 'Plato [$11.000]' },
                  { id: 'minimal', label: 'Minimalista', example: 'Plato   $11.000' },
                ].map((pf) => {
                  const active = (themeConfig.priceFormat || 'badge') === pf.id;
                  return (
                    <button
                      key={pf.id}
                      type="button"
                      onClick={() =>
                        setThemeConfig((prev) => ({ ...prev, priceFormat: pf.id as PriceFormat }))
                      }
                      className={`rounded-xl border p-2.5 text-left transition ${
                        active
                          ? 'border-ink bg-white ring-2 ring-ink/15 font-semibold'
                          : 'border-black/10 bg-white/70 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12.5px] text-ink">{pf.label}</span>
                        {active && <Check className="h-3 w-3 text-ink" />}
                      </div>
                      <p className="mt-0.5 text-[11px] font-mono text-muted">{pf.example}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Switches: Impuestos e Insignia/Sello */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1 border-t border-black/[0.06]">
              {/* Switch Net Price */}
              <label className="flex items-start gap-3 rounded-xl border border-black/10 bg-white p-3 cursor-pointer hover:bg-black/[0.01]">
                <input
                  type="checkbox"
                  checked={Boolean(themeConfig.showNetPrice)}
                  onChange={(e) =>
                    setThemeConfig((prev) => ({ ...prev, showNetPrice: e.target.checked }))
                  }
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-ink focus:ring-ink"
                />
                <div>
                  <span className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-indigo-600" /> Desglose Sin IVA (21%)
                  </span>
                  <p className="mt-0.5 text-[11.5px] text-muted leading-relaxed">
                    Calcula y muestra la base imponible neta sin IVA, ideal para hoteles y cartas de vinos.
                  </p>
                </div>
              </label>

              {/* Switch Watermark */}
              <label className="flex items-start gap-3 rounded-xl border border-black/10 bg-white p-3 cursor-pointer hover:bg-black/[0.01]">
                <input
                  type="checkbox"
                  checked={Boolean(themeConfig.showWatermark)}
                  onChange={(e) =>
                    setThemeConfig((prev) => ({ ...prev, showWatermark: e.target.checked }))
                  }
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-ink focus:ring-ink"
                />
                <div>
                  <span className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                    <Stamp className="h-3.5 w-3.5 text-amber-600" /> Sello de Autor al Pie
                  </span>
                  <p className="mt-0.5 text-[11.5px] text-muted leading-relaxed">
                    Muestra un sello distintivo artesanal al pie de cada sección del menú.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* 2. Tema Visual (Modo Oscuro / Modo Claro) */}
        <div>
          <span className="label flex items-center gap-1.5 font-semibold text-ink">
            <Moon className="h-4 w-4 text-indigo-500" /> Tema y Apariencia
          </span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                theme === 'dark'
                  ? 'border-ink bg-neutral-900 text-white ring-2 ring-ink/10'
                  : 'border-black/10 bg-white hover:bg-canvas'
              }`}
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neutral-800 text-amber-400 shadow-sm">
                <Moon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[14px] font-semibold ${theme === 'dark' ? 'text-white' : 'text-ink'}`}>
                    Modo Oscuro (Dark)
                  </span>
                  {theme === 'dark' && <Check className="h-4 w-4 text-emerald-400" />}
                </div>
                <p className={`mt-0.5 text-[12px] leading-relaxed ${theme === 'dark' ? 'text-neutral-300' : 'text-muted'}`}>
                  Look inmersivo de alta gama. Resalta la fotografía de tus platos y es ideal para bares y cenas.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                theme === 'light'
                  ? 'border-ink bg-black/[0.03] ring-2 ring-ink/10'
                  : 'border-black/10 bg-white hover:bg-canvas'
              }`}
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600 shadow-sm">
                <Sun className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-ink">
                    Modo Claro (Light)
                  </span>
                  {theme === 'light' && <Check className="h-4 w-4 text-ink" />}
                </div>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                  Look limpio, fresco y luminoso. Ideal para cafeterías, heladerías, brunchs y almuerzos.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 3. Color de Fondo del Menú */}
        <div>
          <div className="flex items-center justify-between">
            <span className="label flex items-center gap-1.5 font-semibold text-ink">
              <Palette className="h-4 w-4 text-pink-500" /> Color de Fondo del Menú
            </span>
            <button
              type="button"
              onClick={() => setBgColor(theme === 'light' ? '#ffffff' : '#0a0a0a')}
              className="text-[11px] font-medium text-muted hover:text-ink flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" /> Restablecer fondo predeterminado
            </button>
          </div>
          <p className="text-[12px] text-muted mb-2">
            Elegí una paleta sugerida para {theme === 'dark' ? 'modo oscuro' : 'modo claro'} o seleccioná cualquier tono personalizado:
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            {(theme === 'dark' ? BG_DARK_PRESETS : BG_LIGHT_PRESETS).map((preset) => {
              const active = bgColor.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.hex}
                  type="button"
                  title={preset.name}
                  onClick={() => setBgColor(preset.hex)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[12px] font-medium transition active:scale-95 ${
                    active
                      ? 'border-ink bg-black/[0.06] text-ink ring-2 ring-ink/20 font-semibold'
                      : 'border-black/10 bg-white text-muted hover:bg-canvas'
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span>{preset.name}</span>
                  {active && <Check className="h-3.5 w-3.5 text-ink" />}
                </button>
              );
            })}
            <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-canvas px-3 py-1">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
                title="Color de fondo libre"
              />
              <span className="text-[12px] font-mono font-medium text-ink uppercase">{bgColor}</span>
            </div>
          </div>
        </div>

        {/* 4. Color de Marca (Accent Color) */}
        <div>
          <span className="label flex items-center gap-1.5 font-semibold text-ink">
            <Palette className="h-4 w-4 text-purple-500" /> Color de Marca (Precios, insignias y acentos)
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {COLOR_PRESETS.map((color) => {
              const active = accentColor.toLowerCase() === color.hex.toLowerCase();
              return (
                <button
                  key={color.hex}
                  type="button"
                  title={color.name}
                  onClick={() => setAccentColor(color.hex)}
                  className={`relative grid h-9 w-9 place-items-center rounded-full transition active:scale-95 ${
                    active ? 'ring-2 ring-ink ring-offset-2' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                >
                  {active && <Check className="h-4 w-4 text-white drop-shadow-sm" />}
                </button>
              );
            })}
            <div className="flex items-center gap-2 rounded-full border border-black/10 bg-canvas px-3 py-1">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
                title="Elegir color personalizado"
              />
              <span className="text-[13px] font-mono font-medium text-ink uppercase">{accentColor}</span>
            </div>
          </div>
        </div>



        {/* Logo */}
        <div>
          <span className="label">Logo del local (opcional)</span>
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-canvas">
              {logoUrl ? (
                <Image src={logoUrl} alt="Logo" fill sizes="64px" className="object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-neutral-900 text-white">
                  <ClocheIcon className="h-7 w-7 text-white" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="btn-secondary h-9 cursor-pointer text-[13px]">
                {uploadingLogo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-4 w-4" /> {logoUrl ? 'Cambiar logo' : 'Subir logo'}
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  disabled={uploadingLogo}
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl(null)}
                  className="btn-ghost h-9 text-[13px] text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Quitar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Foto de Portada / Imagen de Fondo del Menú */}
        <div>
          <span className="label font-semibold text-ink">Foto de Portada / Fondo del Menú</span>
          <p className="text-[12px] text-muted mb-2.5">
            Aparece en la cabecera y el fondo de tu carta digital. Recomendado: foto horizontal de tu local o platos (1200 × 500 px).
          </p>
          <div className="space-y-3">
            <div className="relative h-32 sm:h-36 w-full overflow-hidden rounded-2xl border border-black/10 bg-canvas">
              {coverUrl ? (
                <>
                  <Image src={coverUrl} alt="Portada" fill sizes="(max-width: 768px) 100vw, 800px" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-subtle text-xs">
                  <Camera className="h-6 w-6" />
                  <span>Sin foto de portada cargada</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="btn-secondary h-9 cursor-pointer text-[13px]">
                {uploadingCover ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-4 w-4" /> {coverUrl ? 'Cambiar foto de portada' : 'Subir foto de portada'}
                  </>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  disabled={uploadingCover}
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </label>
              {coverUrl && (
                <button
                  type="button"
                  onClick={() => setCoverUrl(null)}
                  className="btn-ghost h-9 text-[13px] text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Quitar portada
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Nombre y Eslogan */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="store-name" className="label">
              Nombre del bar o restaurante
            </label>
            <input
              id="store-name"
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="store-tagline" className="label">
              Eslogan o subtítulo corto (opcional)
            </label>
            <input
              id="store-tagline"
              type="text"
              maxLength={120}
              placeholder="Ej: Cocina casera, burgers y tragos · Palermo"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="input"
            />
          </div>
        </div>

        {/* Slug y WhatsApp */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="store-slug" className="label">
              Link público para tus clientes
            </label>
            <div className="flex items-center rounded-xl border border-black/10 bg-canvas px-3.5 focus-within:border-ink/40 focus-within:bg-white focus-within:ring-4 focus-within:ring-black/5">
              <span className="text-[13px] text-subtle font-mono">/p/</span>
              <input
                id="store-slug"
                type="text"
                required
                maxLength={40}
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="h-11 w-full bg-transparent px-1 text-[14px] font-mono text-ink outline-none"
              />
            </div>
            {slug !== store.slug && (
              <p className="mt-1 text-[11px] text-amber-700">
                ⚠️ Cambiar el link alterará la URL de tu carta. Si ya imprimiste códigos QR físicos en las mesas, deberás reimprimirlos con el nuevo link.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="store-wp" className="label">
              WhatsApp para recibir pedidos
            </label>
            <input
              id="store-wp"
              type="tel"
              required
              placeholder="11 2345 6789"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="input"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="pt-2">
          <button type="submit" className="btn-primary h-11 w-full sm:w-auto" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <>
                <Check className="h-4 w-4 text-whatsapp" /> Cambios guardados con éxito
              </>
            ) : (
              'Guardar personalización'
            )}
          </button>
        </div>

        {/* Zona para eliminar sucursal si no es el local principal */}
        {store.parent_store_id && onDeleteBranch && (
          <div className="mt-10 rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-5">
            <h4 className="text-[14.5px] font-semibold text-red-700">Zona de peligro: Eliminar este punto de venta</h4>
            <p className="mt-1 text-[13px] text-muted leading-relaxed">
              Al eliminar esta sucursal o food truck, sus comensales ya no podrán acceder a <strong>/p/{store.slug}</strong>. Tus platos y categorías de la casa matriz quedarán intactos.
            </p>
            <button
              type="button"
              onClick={() => {
                if (confirm(`¿Estás seguro de que deseás eliminar el punto de venta "${store.name}"? Esta acción no se puede deshacer.`)) {
                  onDeleteBranch(store.id);
                }
              }}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-red-600/30 bg-white px-3.5 py-2 text-[13px] font-medium text-red-600 shadow-sm transition hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Eliminar sucursal
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
