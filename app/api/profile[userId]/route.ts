import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAGE_SIZE = 18;

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10));
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // ── Auth: proxy.ts injects x-user-id header if token is valid ──
  const isAuthenticated = req.headers.get('x-user-id') !== null;

  try {
    // ── Wallpapers (every page) ────────────────────────────────
    const selectFields =
      'id, thumbnail_url, title, description, tags, ' +
      'downloads, likes, views, user_id, aspect_ratio, created_at, category, ' +
      (isAuthenticated ? 'image_url, ' : '') +
      'profiles:user_id(username, full_name, avatar_url, verified)';

    const { data: wallpaperData, error: wallpaperError } = await supabase
      .from('wallpapers')
      .select(selectFields)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (wallpaperError) throw wallpaperError;

    const items = (wallpaperData ?? []).map((w: any) => ({
      ...w,
      // Guests only get thumbnail — authenticated users get full image
      image_url: isAuthenticated
        ? (w.image_url ?? w.thumbnail_url)
        : w.thumbnail_url,
    }));

    // ── Profile (page 0 only — no need to re-fetch on scroll) ──
    let profile = null;
    if (page === 0) {
      const [profileRes, followersRes, followingRes, postsRes] =
        await Promise.all([
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

      if (profileRes.error) throw profileRes.error;
      if (!profileRes.data) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      profile = {
        id: profileRes.data.id,
        full_name: profileRes.data.full_name ?? '',
        username: profileRes.data.username ?? '',
        bio: profileRes.data.bio ?? '',
        verified: profileRes.data.verified ?? false,
        avatar_url: profileRes.data.avatar_url ?? '',
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0,
        posts: postsRes.count ?? 0,
      };
    }

    return NextResponse.json(
      {
        profile,
        page,
        page_size: PAGE_SIZE,
        has_more: items.length === PAGE_SIZE,
        is_authenticated: isAuthenticated,
        items,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    console.error('[profile] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
