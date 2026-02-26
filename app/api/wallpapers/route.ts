// app/api/wallpapers/route.ts
// Place this file at: app/api/wallpapers/route.ts in your Ovrica Next.js project

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ─── CORS — allows any site/HTML app to call this ─────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: CORS });
}

// ─── Transform DB row to clean JSON ──────────────────────────────────────────
const transform = (wp: any) => ({
  id:          wp.id,
  title:       wp.title,
  description: wp.description || '',
  url:         wp.image_url,
  thumbnail:   wp.thumbnail_url || wp.image_url,
  category:    wp.category || 'Other',
  tags:        wp.tags || [],
  likes:       wp.likes || 0,
  views:       wp.views || 0,
  downloads:   wp.downloads || 0,
  aspectRatio: wp.aspect_ratio || 1.5,
  createdAt:   wp.created_at,
  uploadedBy:  wp.profiles?.full_name || wp.profiles?.username || 'Unknown',
  userAvatar:  wp.profiles?.avatar_url || '',
  verified:    wp.profiles?.verified || false,
});

// ─── GET /api/wallpapers ──────────────────────────────────────────────────────
// Query params:
//   page     = 0, 1, 2...        (default: 0)
//   limit    = 1-50              (default: 20)
//   filter   = recent|trending|popular  (default: recent)
//   category = Nature|Space|etc  (default: all)
//   search   = keyword           (default: none)
//   userId   = user UUID         (default: none)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = request.nextUrl;

    const page     = parseInt(searchParams.get('page')     || '0');
    const limit    = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const filter   = searchParams.get('filter')   || 'recent';
    const category = searchParams.get('category') || '';
    const search   = searchParams.get('search')   || '';
    const userId   = searchParams.get('userId')   || '';

    const start = page * limit;
    const end   = start + limit - 1;

    let query = supabase
      .from('wallpapers')
      .select(`
        *,
        profiles:user_id(username, full_name, avatar_url, verified)
      `, { count: 'exact' })
      .eq('is_public', true);

    if (category) query = query.eq('category', category);
    if (userId)   query = query.eq('user_id', userId);
    if (search)   query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

    if (filter === 'trending') {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      query = query.gte('created_at', since.toISOString()).order('views', { ascending: false });
    } else if (filter === 'popular') {
      query = query.order('downloads', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error, count } = await query.range(start, end);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      wallpapers: data ? data.map(transform) : [],
      pagination: {
        page,
        limit,
        total:   count || 0,
        hasMore: end < (count || 0) - 1,
      },
    }, { status: 200, headers: CORS });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wallpapers' },
      { status: 500, headers: CORS }
    );
  }
}