import { ImageResponse } from 'next/og';
import { createElement as h } from 'react';
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
      h('div', {
        style: {
          width: '100%', height: '100%',
          background: '#0a0a0a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
      },
        h('span', { style: { color: '#fff', fontSize: 32, fontWeight: 700 } }, 'Wallpaper not found'),
      ),
      { width: 1200, height: 630 },
    );
  }

  const avatar = wp.user_avatar
    ? h('img', {
        src: wp.user_avatar,
        alt: wp.uploaded_by,
        style: { width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
      })
    : h('div', {
        style: {
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
      },
        h('span', { style: { color: '#fff', fontSize: 14, fontWeight: 700 } },
          (wp.uploaded_by ?? '?')[0].toUpperCase(),
        ),
      );

  return new ImageResponse(
    h('div', {
      style: {
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'row',
        background: '#0f0f0f',
        fontFamily: 'sans-serif',
        overflow: 'hidden',
      },
    },

      // Left: wallpaper image 58%
      h('div', {
        style: { width: '58%', height: '100%', position: 'relative', display: 'flex', overflow: 'hidden' },
      },
        h('img', {
          src: wp.url,
          alt: wp.title,
          style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
        }),
        h('div', { style: { position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 50%, #0f0f0f 100%)' } }),
        h('div', { style: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 40%)' } }),
      ),

      // Right: info panel 42%
      h('div', {
        style: {
          width: '42%', height: '100%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '52px 52px 52px 20px',
        },
      },

        // App badge
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30 } },
          h('div', {
            style: {
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            },
          },
            h('span', { style: { color: '#fff', fontSize: 18, fontWeight: 900 } }, 'W'),
          ),
          h('span', {
            style: { color: 'rgba(255,255,255,0.35)', fontSize: 12, letterSpacing: '0.12em', fontWeight: 700 },
          }, 'WALLPAPERS'),
        ),

        // Title
        h('div', {
          style: {
            color: '#ffffff',
            fontSize: wp.title.length > 28 ? 26 : 32,
            fontWeight: 800, lineHeight: 1.2,
            letterSpacing: '-0.025em',
            marginBottom: wp.description ? 12 : 24,
          },
        }, wp.title),

        // Description (conditional)
        ...(wp.description ? [
          h('div', {
            style: {
              color: 'rgba(255,255,255,0.42)', fontSize: 14,
              lineHeight: 1.6, marginBottom: 24,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: '2',
              WebkitBoxOrient: 'vertical',
            },
          }, wp.description),
        ] : []),

        // Accent line
        h('div', {
          style: {
            width: 44, height: 3,
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            borderRadius: 3, marginBottom: 28,
          },
        }),

        // Stats
        h('div', { style: { display: 'flex', gap: 24, marginBottom: 32 } },
          ...[
            { label: 'LIKES',     val: fmt(wp.likes)     },
            { label: 'DOWNLOADS', val: fmt(wp.downloads) },
            { label: 'VIEWS',     val: fmt(wp.views)     },
          ].map(({ label, val }) =>
            h('div', { key: label, style: { display: 'flex', flexDirection: 'column', gap: 3 } },
              h('span', { style: { color: '#fff', fontSize: 22, fontWeight: 700 } }, val),
              h('span', { style: { color: 'rgba(255,255,255,0.28)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' } }, label),
            ),
          ),
        ),

        // Uploader chip
        h('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.09)',
          },
        },
          avatar,
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 1 } },
            h('span', {
              style: { color: 'rgba(255,255,255,0.28)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700 },
            }, 'UPLOADED BY'),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 5 } },
              h('span', { style: { color: '#fff', fontSize: 13, fontWeight: 600 } }, wp.uploaded_by),
              ...(wp.verified ? [
                h('div', {
                  style: {
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#3b82f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  },
                },
                  h('span', { style: { color: '#fff', fontSize: 9, fontWeight: 900 } }, '✓'),
                ),
              ] : []),
            ),
          ),
        ),
      ),
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