import { NextResponse } from 'next/server';
import { DEMO_BRANCH_SLUG, DEMO_BRANCH_STORE, DEMO_SLUG, DEMO_STORE } from '@/lib/demo';
import { createPublicClient } from '@/lib/supabase/public';

export const revalidate = 3600;

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const cleanSlug = (params?.slug || '').toLowerCase();

  let storeName = 'Menú Digital';
  let tagline = 'Pedí desde tu mesa o por WhatsApp';
  let accentColor = '#22c55e';
  let bgColor = '#0a0a0a';

  if (cleanSlug === DEMO_SLUG) {
    storeName = DEMO_STORE.name;
    tagline = DEMO_STORE.tagline || tagline;
    accentColor = DEMO_STORE.accent_color || '#22c55e';
    bgColor = DEMO_STORE.bg_color || '#0a0a0a';
  } else if (cleanSlug === DEMO_BRANCH_SLUG) {
    storeName = DEMO_BRANCH_STORE.name;
    tagline = DEMO_BRANCH_STORE.tagline || tagline;
    accentColor = DEMO_BRANCH_STORE.accent_color || '#f97316';
    bgColor = DEMO_BRANCH_STORE.bg_color || '#0a0a0a';
  } else {
    try {
      const supabase = createPublicClient();
      const { data: store } = await supabase
        .from('stores')
        .select('name, tagline, accent_color, bg_color, theme')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (store) {
        storeName = store.name || storeName;
        tagline = store.tagline || `Carta digital de ${store.name}`;
        accentColor = store.accent_color || '#22c55e';
        bgColor = store.bg_color || (store.theme === 'light' ? '#ffffff' : '#0a0a0a');
      }
    } catch (err) {
      console.error('Error fetching store for manifest:', err);
    }
  }

  // Short name de máximo 12 caracteres para que no se corte debajo del ícono en el celular
  const shortName =
    storeName.length > 14 ? storeName.slice(0, 12).trim() + '…' : storeName;

  // Usamos siempre el endpoint generador PNG con las dimensiones exactas (192x192 y 512x512)
  // para garantizar que Chrome / Android validen estrictamente el MIME type image/png y tamaño cuadrado
  const iconSrc = `/api/pwa-icon/${cleanSlug}?size=512`;
  const iconSrc192 = `/api/pwa-icon/${cleanSlug}?size=192`;

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
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
