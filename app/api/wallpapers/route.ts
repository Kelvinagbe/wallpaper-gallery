
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ─── Allowed Origins ──────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://walls.ovrica.name.ng',
  'https://www.walls.ovrica.name.ng',
];

function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin)
      ? origin
      : 'https://walls.ovrica.name.ng',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// ─── Whitelists ───────────────────────────────────────────────────────────────
const VALID_FILTERS = ['recent', 'trending', 'popular'] as const;
const VALID_CATEGORIES = [
  'Nature', 'Space', 'Abstract', 'Animals',
  'Architecture', 'City', 'Dark', 'Minimal', 'Other',
];
const UUID_REGEX = /^[0-9a-f-]{36}$/i;

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now      = Date.now();
  const windowMs = 60 * 1000;
  const maxReqs  = 30;
  const entry    = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= maxReqs) return true;
  entry.count++;
  return false;
}

// ─── Columns ──────────────────────────────────────────────────────────────────
const WALLPAPER_COLUMNS = `
  id, title, description, image_url, thumbnail_url, category,
  tags, views, downloads, user_id, type, created_at,
  profiles:user_id(username, full_name, avatar_url, verified)
`;

// ─── Transforms ───────────────────────────────────────────────────────────────
const transform = (wp: any) => ({
  id:          wp.id,
  title:       wp.title,
  description: wp.description || '',
  url:         wp.image_url,
  thumbnail:   wp.thumbnail_url || wp.image_url,
  category:    wp.category      || 'Other',
  tags:        wp.tags          || [],
  views:       wp.views         || 0,
  downloads:   wp.downloads     || 0,
  likes:       0,
  aspectRatio: 1.5,
  userId:      wp.user_id,
  type:        wp.type          || 'mobile',
  createdAt:   wp.created_at,
  uploadedBy:  wp.profiles?.full_name || wp.profiles?.username || 'Unknown',
  userAvatar:  wp.profiles?.avatar_url || '',
  verified:    wp.profiles?.verified   || false,
});

const transformRpc = (row: any) => ({
  id:          row.id,
  title:       row.title,
  description: row.description || '',
  url:         row.image_url,
  thumbnail:   row.thumbnail_url || row.image_url,
  category:    row.category      || 'Other',
  tags:        row.tags          || [],
  views:       row.views         || 0,
  downloads:   row.downloads     || 0,
  likes:       0,
  aspectRatio: 1.5,
  userId:      row.user_id,
  type:        row.type          || 'mobile',
  createdAt:   row.created_at,
  uploadedBy:  row.full_name || row.username || 'Unknown',
  userAvatar:  row.avatar_url || '',
  verified:    row.verified   || false,
});

// ─── OPTIONS ──────────────────────────────────────────────────────────────────
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    { status: 200, headers: getCorsHeaders(request) }
  );
}

// ─── GET /api/wallpapers ──────────────────────────────────────────────────────
// Params:
//   page     = 0, 1, 2...               (default: 0)
//   limit    = 1-50                     (default: 20)
//   filter   = recent|trending|popular  (default: recent)
//   category = Nature|Space|etc         (default: all)
//   search   = keyword                  (default: none)
//   userId   = user UUID                (default: none)
export async function GET(request: NextRequest) {
  const CORS = getCorsHeaders(request);

  try {
    // ── Rate limit ────────────────────────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for')
            ?? request.headers.get('x-real-ip')
            ?? 'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: CORS }
      );
    }

    // ── Parse params ──────────────────────────────────────────────────────────
    const { searchParams } = request.nextUrl;

    const page  = Math.max(0, parseInt(searchParams.get('page')  || '0'));
    const limit = Math.min(
                    Math.max(1, parseInt(searchParams.get('limit') || '20')),
                    50
                  );

    const rawFilter   = searchParams.get('filter')   || 'recent';
    const rawCategory = searchParams.get('category') || '';
    const rawUserId   = searchParams.get('userId')   || '';
    const rawSearch   = searchParams.get('search')   || '';

    const filter   = VALID_FILTERS.includes(rawFilter as any) ? rawFilter : 'recent';
    const category = VALID_CATEGORIES.includes(rawCategory) ? rawCategory : '';
    const userId   = UUID_REGEX.test(rawUserId) ? rawUserId : '';
    const search   = rawSearch.slice(0, 50).trim().replace(/[%_\\]/g, '');

    const supabase = await createClient();

    // ── Search path ───────────────────────────────────────────────────────────
    if (search) {
      const { data, error } = await supabase
        .rpc('search_wallpapers', {
          search_term:  search,
          page_limit:   limit,
          page_offset:  page * limit,
        });

      if (error) throw new Error(error.message);

      const wallpapers = (data ?? []).map(transformRpc);

      return NextResponse.json(
        {
          wallpapers,
          pagination: {
            page,
            limit,
            total:   wallpapers.length,
            hasMore: wallpapers.length === limit,
          },
        },
        {
          status: 200,
          headers: {
            ...CORS,
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // ── Normal feed ───────────────────────────────────────────────────────────
    const start = page * limit;
    const end   = start + limit - 1;

    let query = supabase
      .from('wallpapers')
      .select(WALLPAPER_COLUMNS, { count: 'exact' })
      .eq('is_public', true);

    if (category) query = query.eq('category', category);
    if (userId)   query = query.eq('user_id', userId);

    if (filter === 'trending') {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      query = query
        .gte('created_at', since.toISOString())
        .order('views', { ascending: false });
    } else if (filter === 'popular') {
      query = query.order('downloads', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error, count } = await query.range(start, end);

    if (error) throw new Error(error.message);

    const wallpapers = [];
    for (const row of data ?? []) {
      try {
        if (!row.id || !row.image_url) continue;
        wallpapers.push(transform(row));
      } catch {
        continue;
      }
    }

    return NextResponse.json(
      {
        wallpapers,
        pagination: {
          page,
          limit,
          total:   count || 0,
          hasMore: end < (count || 0) - 1,
        },
      },
      {
        status: 200,
        headers: {
          ...CORS,
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );

  } catch (error: any) {
    console.error('[wallpapers API]', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallpapers' },
      { status: 500, headers: CORS }
    );
  }
}
