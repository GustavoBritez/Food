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

  if (logoUrl) {
    return NextResponse.redirect(logoUrl, 307);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: logoUrl ? accentColor : '#18181b',
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
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#18181b',
            }}
          >
            <svg
              width={Math.round(size * 0.54)}
              height={Math.round(size * 0.54)}
              viewBox="0 0 24 24"
              fill="none"
            >
              {/* Perilla superior / Knob */}
              <circle cx="12" cy="5.5" r="2.2" fill="#ffffff" />
              {/* Cuello conector / Neck */}
              <rect x="11.1" y="7.3" width="1.8" height="1.8" fill="#ffffff" />
              {/* Cúpula / Dome cloche */}
              <path
                d="M6 16.5V14.5C6 11.2 8.7 8.5 12 8.5C15.3 8.5 18 11.2 18 14.5V16.5"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Bandeja horizontal redondeada / Platter */}
              <rect x="3.8" y="16.5" width="16.4" height="2.2" rx="1.1" fill="#ffffff" />
            </svg>
          </div>
        )}
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
