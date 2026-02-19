import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// ─── Routes that never need auth ──────────────────────────────────────────────
const PUBLIC_ROUTES = new Set(['/', '/search', '/trending']);
const AUTH_ROUTES   = new Set(['/login', '/signup', '/auth/callback']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Speed: cache static-ish pages at the CDN edge ──────────────────────
  // These pages are public and don't change per-user — tell Vercel's edge
  // to serve them from cache for 60 s, then revalidate in the background.
  if (PUBLIC_ROUTES.has(pathname)) {
    const res = NextResponse.next();
    res.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300'
    );
    addSecurityHeaders(res);
    return res; // ← skip Supabase entirely for public pages
  }

  // ── 2. Skip auth entirely for auth pages ──────────────────────────────────
  if (AUTH_ROUTES.has(pathname)) {
    const res = NextResponse.next();
    addSecurityHeaders(res);
    return res;
  }

  // ── 3. Auth check for protected routes ────────────────────────────────────
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // ── 4. Redirect unauthenticated users away from protected routes ───────────
  const isProtected =
    pathname.startsWith('/profile') ||
    pathname.startsWith('/upload')  ||
    pathname.startsWith('/settings');

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 5. Redirect logged-in users away from login/signup ────────────────────
  if (AUTH_ROUTES.has(pathname) && user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ── 6. Security + performance headers on every authenticated response ──────
  addSecurityHeaders(response);
  response.headers.set('Cache-Control', 'private, no-store');

  return response;
}

// ─── Security headers (also improve Lighthouse score) ────────────────────────
function addSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

// ─── Matcher: only run on real page routes ────────────────────────────────────
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};