import { NextResponse } from 'next/server';
import { DEMO_SLUG, DEMO_STORE } from '@/lib/demo';
import { createPublicClient } from '@/lib/supabase/public';

export const revalidate = 60;

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const cleanSlug = (params?.slug || '').toLowerCase();

  let storeName = 'Menú Digital';
  let tagline = 'Pedí desde tu mesa o por WhatsApp';
  let accentColor = '#22c55e';
  let bgColor = '#0a0a0a';
  let logoUrl: string | null = null;

  if (cleanSlug === DEMO_SLUG) {
    storeName = DEMO_STORE.name;
    tagline = DEMO_STORE.tagline || tagline;
    accentColor = DEMO_STORE.accent_color || '#22c55e';
    bgColor = DEMO_STORE.bg_color || '#0a0a0a';
    logoUrl = DEMO_STORE.logo_url ?? null;
  } else {
    try {
      const supabase = createPublicClient();
      const { data: store } = await supabase
        .from('stores')
        .select('name, tagline, accent_color, bg_color, theme, logo_url')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (store) {
        storeName = store.name || storeName;
        tagline = store.tagline || `Carta digital de ${store.name}`;
        accentColor = store.accent_color || '#22c55e';
        bgColor = store.bg_color || (store.theme === 'light' ? '#ffffff' : '#0a0a0a');
        logoUrl = store.logo_url || null;
      }
    } catch (err) {
      console.error('Error fetching store for manifest:', err);
    }
  }

  // Short name de máximo 12 caracteres para que no se corte debajo del ícono en el celular
  const shortName =
    storeName.length > 14 ? storeName.slice(0, 12).trim() + '…' : storeName;

  // Si el local tiene un logo subido por el dueño, lo usamos directamente para el icono de la PWA
  const iconSrc = logoUrl || `/api/pwa-icon/${cleanSlug}?size=512`;
  const iconSrc192 = logoUrl || `/api/pwa-icon/${cleanSlug}?size=192`;

  const manifest = {
    id: `/p/${cleanSlug}`,
    name: storeName,
    short_name: shortName,
    description: tagline,
    start_url: `/p/${cleanSlug}`,
    scope: `/p/${cleanSlug}`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: bgColor,
    theme_color: accentColor,
    icons: [
      {
        src: iconSrc192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: iconSrc,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: iconSrc,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
