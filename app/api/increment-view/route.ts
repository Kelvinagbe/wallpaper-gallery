import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Service role client — server only, never shipped to the browser
const getServiceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

// Simple in-memory rate limit: 1 view per wallpaper per IP per 60 s
const seen = new Map<string, number>();
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
    if (seen.has(key) && now - seen.get(key)! < RATE_WINDOW_MS) {
      return NextResponse.json({ skipped: true }, { status: 200 }); // silently skip duplicates
    }
    seen.set(key, now);
    // Prune old entries to avoid unbounded growth
    if (seen.size > 10_000) {
      for (const [k, t] of seen) { if (now - t > RATE_WINDOW_MS) seen.delete(k); }
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