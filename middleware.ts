import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * Refresca la sesión de Supabase y protege /admin.
 * Solo corre en las rutas del matcher: el menú público (/p/*) no pasa por acá.
 */
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. El webhook de Mercado Pago no usa sesión de usuario ni cookies
  if (pathname === '/api/mercadopago/webhook') {
    return NextResponse.next();
  }

  // 2. Permitir el acceso libre al modo interactivo Demo del panel (/admin?demo=true o ?demo=1)
  if (
    pathname === '/admin' &&
    (searchParams.get('demo') === 'true' || searchParams.get('demo') === '1')
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  // Si no hay Supabase configurado todavía en local, dejamos pasar para ver la UI
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/auth/:path*', '/api/:path*'],
};
