'use client';

import { useRouter } from 'next/navigation';
import { startLoader } from '@/app/components/TopLoader';

const getRankStyle = (rank: number) => {
  if (rank === 1) return {
    badge: 'linear-gradient(135deg,#FFB800,#FF7800)',
    border: 'rgba(255,220,100,.4)',
    glow: 'rgba(255,180,0,.15)',
    label: '🥇',
  };
  if (rank === 2) return {
    badge: 'linear-gradient(135deg,#B4B4C8,#8C8CA0)',
    border: 'rgba(220,220,240,.3)',
    glow: 'rgba(180,180,200,.1)',
    label: '🥈',
  };
  if (rank === 3) return {
    badge: 'linear-gradient(135deg,#B46428,#8C501E)',
    border: 'rgba(220,160,100,.3)',
    glow: 'rgba(180,100,40,.1)',
    label: '🥉',
  };
  return {
    badge: 'rgba(0,0,0,.06)',
    border: 'rgba(0,0,0,.08)',
    glow: 'transparent',
    label: null,
  };
};

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);

const CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .hot-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 16px;
    cursor: pointer;
    transition: background 0.15s;
    border-radius: 16px;
    animation: fadeUp 0.35s ease both;
  }
  .hot-row:active { background: #f9fafb; }
  .hot-thumb {
    position: relative;
    flex-shrink: 0;
    width: 64px;
    height: 102px;
    border-radius: 12px;
    overflow: hidden;
    background: #f0f0f5;
  }
  .hot-thumb img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

type Wallpaper = {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  likes: number;
  views: number;
  downloads: number;
  category: string;
  type: string;
  hot_score: number;
};

export default function HotPageClient({ wallpapers }: { wallpapers: Wallpaper[] }) {
  const router = useRouter();

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh', background: '#fff' }}>

        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: '#fff',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
        }}>
          <button
            onClick={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: '#f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}
          >
            ←
          </button>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: '#0a0a0a', margin: 0, letterSpacing: '-0.3px' }}>
              🔥 Hot Right Now
            </h1>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, marginTop: 1 }}>
              Top 10 · Updated every 2 days
            </p>
          </div>
        </div>

        {/* Ranked list */}
        <div style={{ padding: '8px 8px 32px' }}>
          {wallpapers.map((wp, i) => {
            const rank = i + 1;
            const rs   = getRankStyle(rank);

            return (
              <div
                key={wp.id}
                className="hot-row"
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => { startLoader(); router.push(`/details/${wp.id}`); }}
              >
                {/* Rank number */}
                <div style={{
                  flexShrink: 0, width: 32, height: 32,
                  borderRadius: 10,
                  background: rs.badge,
                  border: `1px solid ${rs.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: rank <= 3 ? 16 : 13,
                  fontWeight: 800,
                  color: rank <= 3 ? '#fff' : '#6b7280',
                }}>
                  {rs.label ?? rank}
                </div>

                {/* Thumbnail */}
                <div className="hot-thumb">
                  <img src={wp.thumbnail || wp.url} alt={wp.title} draggable={false} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {wp.title}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '3px 0 0', textTransform: 'capitalize' }}>
                    {wp.category} · {wp.type === 'pc' ? 'Desktop' : 'Mobile'}
                  </p>
                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                      👁 {fmt(wp.views)}
                    </span>
                    <span style={{ fontSize: 10, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                      ♥ {fmt(wp.likes)}
                    </span>
                    <span style={{ fontSize: 10, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                      ↓ {fmt(wp.downloads)}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ flexShrink: 0, fontSize: 14, color: '#d1d5db' }}>›</div>
              </div>
            );
          })}
        </div>

      </div>
    </>
  );
}
