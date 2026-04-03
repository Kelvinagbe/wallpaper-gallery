// app/api/og/user/[id]/route.tsx
// Generates a 1200×630 GitHub-style OG card for each user profile.
// Next.js ImageResponse renders JSX → PNG at the edge — no canvas, no sharp.
//
// URL pattern:  GET /api/og/user/<userId>
// Cache:        60 min public CDN + 10 min stale-while-revalidate

import { ImageResponse } from 'next/og';
import { createClient }  from '@/lib/supabase/server';
import { NextRequest }   from 'next/server';

export const runtime = 'edge';
export const revalidate = 3600; // 1 hour ISR

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}k`
  : String(n);

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://walls.app';
const APP_NAME = 'WALLS';

// ── Route handler ──────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id: userId } = params;

  // ── Fetch profile + counts ───────────────────────────────────────────────
  const supabase = createClient();

  const [{ data: profile }, { data: counts }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, username, bio, avatar, verified')
      .eq('id', userId)
      .single(),
    supabase
      .rpc('get_user_counts', { target_user_id: userId })
      .single(),
  ]);

  if (!profile) {
    return new Response('Not found', { status: 404 });
  }

  const followers = counts?.followers ?? 0;
  const following = counts?.following ?? 0;
  const posts     = counts?.posts     ?? 0;

  const { name, username, bio, avatar, verified } = profile;

  // ── Render ────────────────────────────────────────────────────────────────
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          background: '#0d1117',
          position: 'relative',
          fontFamily: 'system-ui, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* ── Subtle grid ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(rgba(255,255,255,.04) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            display: 'flex',
          }}
        />

        {/* ── Accent glows ── */}
        <div
          style={{
            position: 'absolute',
            top: -160,
            right: -100,
            width: 540,
            height: 540,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(88,166,255,.14) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -120,
            left: -80,
            width: 440,
            height: 440,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(63,185,80,.09) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* ── Main content ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 64,
            padding: '0 88px',
            width: '100%',
          }}
        >
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
            {/* Gradient ring */}
            <div
              style={{
                width: 196,
                height: 196,
                borderRadius: 44,
                background: 'linear-gradient(135deg, #58a6ff 0%, #3fb950 100%)',
                padding: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatar}
                alt={name}
                width={190}
                height={190}
                style={{
                  borderRadius: 42,
                  objectFit: 'cover',
                  background: '#161b22',
                }}
              />
            </div>

            {/* Verified badge */}
            {verified && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#238636',
                  border: '3px solid #0d1117',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: '#fff',
                }}
              >
                ✓
              </div>
            )}
          </div>

          {/* Right column — name / bio / stats */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Name */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 54,
                  fontWeight: 800,
                  color: '#e6edf3',
                  letterSpacing: '-2px',
                  lineHeight: 1,
                }}
              >
                {name}
              </span>
            </div>

            {/* Username */}
            {username && (
              <p
                style={{
                  fontSize: 28,
                  color: '#8b949e',
                  margin: '0 0 18px',
                }}
              >
                @{username}
              </p>
            )}

            {/* Bio */}
            {bio && (
              <p
                style={{
                  fontSize: 24,
                  color: '#c9d1d9',
                  lineHeight: 1.5,
                  margin: '0 0 32px',
                  maxWidth: 580,
                  // Truncate long bios
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {bio}
              </p>
            )}

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 44 }}>
              {[
                { label: 'posts',     value: fmt(posts)     },
                { label: 'followers', value: fmt(followers) },
                { label: 'following', value: fmt(following) },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <span
                    style={{
                      fontSize: 38,
                      fontWeight: 700,
                      color: '#e6edf3',
                      lineHeight: 1,
                    }}
                  >
                    {value}
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      color: '#8b949e',
                      marginTop: 4,
                      textTransform: 'lowercase',
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer bar ── */}
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            left: 88,
            right: 88,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                background: '#58a6ff',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 800,
                color: '#0d1117',
              }}
            >
              W
            </div>
            <span style={{ fontSize: 18, color: '#8b949e' }}>{APP_NAME}</span>
          </div>

          {/* Profile URL */}
          <span style={{ fontSize: 18, color: '#484f58' }}>
            {APP_URL.replace('https://', '')}/{username ?? userId}
          </span>
        </div>
      </div>
    ),
    {
      width:  1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
      },
    },
  );
}
