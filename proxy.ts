import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// ─── Routes that never need auth ──────────────────────────────────────────────
const PUBLIC_ROUTES  = new Set(['/', '/search', '/trending']);
const AUTH_ROUTES    = new Set(['/login', '/signup', '/auth/callback']);

// ─── Rate limit store (edge-compatible, per-instance) ────────────────────────
// Counts are stored per IP per minute window.
// Not perfect across instances but significantly reduces abuse at low cost.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_AUTHENTICATED = 40; // requests per minute
const RATE_LIMIT_GUEST         = 20; // requests per minute
const WINDOW_MS                = 60_000; // 1 minute

// Periodically clean expired entries so Map doesn't grow forever
function cleanRateLimitStore() {
  const now = Date.now();
  for (const [key, val] of rateLimitStore.entries()) {
    if (now > val.resetAt) rateLimitStore.delete(key);
  }
}

function checkRateLimit(
  ip: string,
  limit: number
): { allowed: boolean; remaining: number; resetAt: number } {
  // Clean every ~100 checks to keep memory low
  if (Math.random() < 0.01) cleanRateLimitStore();

  const now   = Date.now();
  const key   = `rl:${ip}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  return { allowed: entry.count <= limit, remaining, resetAt: entry.resetAt };
}

// ─────────────────────────────────────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Public pages — cache at CDN edge, skip auth ────────────────────────
  if (PUBLIC_ROUTES.has(pathname)) {
    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    addSecurityHeaders(res);
    return res;
  }

  // ── 2. Auth pages — skip everything ───────────────────────────────────────
  if (AUTH_ROUTES.has(pathname)) {
    const res = NextResponse.next();
    addSecurityHeaders(res);
    return res;
  }

  // ── 3. API routes — rate limit + inject user context ──────────────────────
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown';

    // Try to verify JWT token if present
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization') ?? '';

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get: (name) => request.cookies.get(name)?.value,
            set: () => {},
            remove: () => {},
          },
        }
      );
      const { data } = await supabase.auth.getUser(token);
      if (data.user) userId = data.user.id;
    }

    const isAuthenticated = userId !== null;
    const limit = isAuthenticated ? RATE_LIMIT_AUTHENTICATED : RATE_LIMIT_GUEST;
    const { allowed, remaining, resetAt } = checkRateLimit(ip, limit);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetAt),
          },
        }
      );
    }

    // Inject user id as header so route.ts knows auth status without re-verifying
    const requestHeaders = new Headers(request.headers);
    if (userId) requestHeaders.set('x-user-id', userId);

    const res = NextResponse.next({ request: { headers: requestHeaders } });

    // Rate limit info headers
    res.headers.set('X-RateLimit-Limit', String(limit));
    res.headers.set('X-RateLimit-Remaining', String(remaining));
    res.headers.set('X-RateLimit-Reset', String(resetAt));

    addSecurityHeaders(res);
    return res;
  }

  // ── 4. Protected page routes ───────────────────────────────────────────────
  let response = NextResponse.next({ request: { headers: request.headers } });

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

  // ── 5. Redirect unauthenticated away from protected pages ─────────────────
  const isProtected =
    pathname.startsWith('/profile') ||
    pathname.startsWith('/upload')  ||
    pathname.startsWith('/settings');

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 6. Redirect logged-in users away from login/signup ────────────────────
  if (AUTH_ROUTES.has(pathname) && user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ── 7. Security + cache headers ───────────────────────────────────────────
  addSecurityHeaders(response);
  response.headers.set('Cache-Control', 'private, no-store');

  return response;
}

// ─── Security headers ─────────────────────────────────────────────────────────
function addSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

// ─── Matcher ──────────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
