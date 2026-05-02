
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const PAGE_SIZE = 18;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const page = Math.max(0, parseInt(req.nextUrl.searchParams.get('page') ?? '0', 10));
  const isAuthenticated = req.headers.get('x-user-id') !== null;

  let supabase: ReturnType<typeof getSupabaseClient>;
  try {
    supabase = getSupabaseClient();
  } catch {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  try {
    const [wallpapersResult, profileResult] = await Promise.all([
      fetchWallpapers(supabase, userId, page, isAuthenticated),
      page === 0 ? fetchProfile(supabase, userId) : Promise.resolve(null),
    ]);

    if (wallpapersResult.error) throw wallpapersResult.error;
    if (page === 0 && profileResult?.error) throw profileResult.error;
    if (page === 0 && !profileResult?.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        profile: profileResult?.data ?? null,
        page,
        page_size: PAGE_SIZE,
        has_more: wallpapersResult.items.length === PAGE_SIZE,
        is_authenticated: isAuthenticated,
        items: wallpapersResult.items,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
      }
    );
  } catch (err) {
    console.error('[profile] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function fetchWallpapers(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  page: number,
  isAuthenticated: boolean
) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const selectFields = [
    'id, thumbnail_url, title, description, tags',
    'downloads, views, user_id, created_at, category',
    isAuthenticated ? 'image_url' : null,
    'profiles:user_id(username, full_name, avatar_url, verified)',
  ]
    .filter(Boolean)
    .join(', ');

  const { data, error } = await supabase
    .from('wallpapers')
    .select(selectFields)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  const items = (data ?? []).map((w: any) => ({
    ...w,
    image_url: isAuthenticated ? (w.image_url ?? w.thumbnail_url) : w.thumbnail_url,
  }));

  return { items, error };
}

async function fetchProfile(supabase: ReturnType<typeof getSupabaseClient>, userId: string) {
  const [profileRes, followersRes, followingRes, postsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, username, bio, verified, avatar_url')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId),
    supabase
      .from('wallpapers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  if (profileRes.error) return { data: null, error: profileRes.error };
  if (!profileRes.data) return { data: null, error: null };

  return {
    error: null,
    data: {
      id:         profileRes.data.id,
      full_name:  profileRes.data.full_name  ?? '',
      username:   profileRes.data.username   ?? '',
      bio:        profileRes.data.bio        ?? '',
      verified:   profileRes.data.verified   ?? false,
      avatar_url: profileRes.data.avatar_url ?? '',
      followers:  followersRes.count ?? 0,
      following:  followingRes.count ?? 0,
      posts:      postsRes.count     ?? 0,
    },
  };
}
