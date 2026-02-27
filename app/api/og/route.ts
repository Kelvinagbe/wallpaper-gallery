// app/api/og/route.ts

import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n ?? 0));

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');

  if (!id) return new Response('Missing id', { status: 400 });

  const supabase = createClient();

  const { data: wp } = await supabase
    .from('wallpapers')
    .select('title, description, url, uploaded_by, user_avatar, likes, downloads, views, verified')
    .eq('id', id)
    .single();

  if (!wp) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>Wallpaper not found</span>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row', background: '#0f0f0f', fontFamily: 'sans-serif', overflow: 'hidden' }}>

        {/* Left: wallpaper image 58% */}
        <div style={{ width: '58%', height: '100%', position: 'relative', display: 'flex', overflow: 'hidden' }}>
          <img src={wp.url} alt={wp.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 50%, #0f0f0f 100%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 40%)' }} />
        </div>

        {/* Right: info panel 42% */}
        <div style={{ width: '42%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '52px 52px 52px 20px' }}>

          {/* App badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 18, fontWeight: 900 }}>W</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, letterSpacing: '0.12em', fontWeight: 700 }}>WALLPAPERS</span>
          </div>

          {/* Title */}
          <div style={{ color: '#ffffff', fontSize: wp.title.length > 28 ? 26 : 32, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.025em', marginBottom: wp.description ? 12 : 24 }}>
            {wp.title}
          </div>

          {/* Description */}
          {wp.description && (
            <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 14, lineHeight: 1.6, marginBottom: 24, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical' }}>
              {wp.description}
            </div>
          )}

          {/* Accent line */}
          <div style={{ width: 44, height: 3, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: 3, marginBottom: 28 }} />

          {/* Stats */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
            {[
              { label: 'LIKES',     val: fmt(wp.likes)     },
              { label: 'DOWNLOADS', val: fmt(wp.downloads) },
              { label: 'VIEWS',     val: fmt(wp.views)     },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{val}</span>
                <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Uploader chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.09)' }}>
            {wp.user_avatar
              ? <img src={wp.user_avatar} alt={wp.uploaded_by} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{(wp.uploaded_by ?? '?')[0].toUpperCase()}</span>
                </div>
            }
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700 }}>UPLOADED BY</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{wp.uploaded_by}</span>
                {wp.verified && (
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontSize: 9, fontWeight: 900 }}>✓</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    },
  );
}