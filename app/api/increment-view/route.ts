// app/api/increment-view/route.ts
// NOTE: You no longer need to call this from the client.
// incrementViews() in wallpaperStore.ts calls the RPC directly.
// Keep this route only if you need server-side view tracking
// (e.g. from SSR/bot traffic where the Supabase client isn't available).

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const getServiceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

// Simple in-memory rate limit: 1 view per wallpaper per IP per 60s
const seen: Record<string, number> = {};
const RATE_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  try {
    const { wallpaperId } = await request.json();

    if (!wallpaperId || typeof wallpaperId !== 'string') {
      return NextResponse.json({ error: 'wallpaperId required' }, { status: 400 });
    }

    // Rate-limit by IP + wallpaper
    const ip  = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const key = `${ip}:${wallpaperId}`;
    const now = Date.now();

    if (seen[key] && now - seen[key] < RATE_WINDOW_MS) {
      return NextResponse.json({ skipped: true }, { status: 200 });
    }
    seen[key] = now;

    // Prune old entries to avoid unbounded growth
    const keys = Object.keys(seen);
    if (keys.length > 10_000) {
      keys.forEach(k => { if (now - seen[k] > RATE_WINDOW_MS) delete seen[k]; });
    }

    const { error } = await getServiceClient().rpc('increment_views', {
      wallpaper_id: wallpaperId,
    });

    if (error) {
      console.error('increment_views RPC error:', error.message);
      return NextResponse.json({ error: 'Failed to increment views' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('increment-view route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
