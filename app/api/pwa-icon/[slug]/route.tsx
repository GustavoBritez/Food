import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { DEMO_SLUG, DEMO_STORE } from '@/lib/demo';
import { createPublicClient } from '@/lib/supabase/public';

export const runtime = 'edge';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { searchParams } = new URL(req.url);
  const rawSize = Number(searchParams.get('size')) || 512;
  const size = rawSize === 192 ? 192 : 512;

  const cleanSlug = (params?.slug || '').toLowerCase();
  let name = 'Bar';
  let logoUrl: string | null = null;
  let accentColor = '#22c55e';

  if (cleanSlug === DEMO_SLUG) {
    name = DEMO_STORE.name;
    logoUrl = DEMO_STORE.logo_url;
    accentColor = DEMO_STORE.accent_color || '#22c55e';
  } else {
    try {
      const supabase = createPublicClient();
      const { data: store } = await supabase
        .from('stores')
        .select('name, logo_url, accent_color')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (store) {
        name = store.name || name;
        logoUrl = store.logo_url || null;
        accentColor = store.accent_color || '#22c55e';
      }
    } catch (err) {
      console.error('Error fetching store in pwa-icon:', err);
    }
  }

  const initial = name.trim().charAt(0).toUpperCase() || 'C';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: accentColor,
          overflow: 'hidden',
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={name}
            width={size}
            height={size}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <span
            style={{
              fontSize: Math.round(size * 0.52),
              fontWeight: 800,
              color: '#ffffff',
              fontFamily: 'sans-serif',
            }}
          >
            {initial}
          </span>
        )}
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  );
}
