'use client';

import { useRouter } from 'next/navigation';
import { startLoader } from '@/app/components/TopLoader';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .hot-page {
    min-height: 100vh;
    background: #fafafa;
    font-family: 'DM Sans', sans-serif;
  }

  .hot-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #fff;
    border-bottom: 1px solid #f0f0f0;
    padding: 0 16px;
    height: 56px;
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .back-btn {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    border: 1.5px solid #e5e7eb;
    background: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .back-btn:active { background: #f3f4f6; }
  .back-chevron {
    width: 8px;
    height: 8px;
    border-left: 2px solid #374151;
    border-bottom: 2px solid #374151;
    transform: rotate(45deg) translateX(1px);
    display: block;
  }

  .header-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: 1px;
    color: #0a0a0a;
    line-height: 1;
  }
  .header-sub {
    font-size: 11px;
    color: #9ca3af;
    font-weight: 500;
    margin-left: auto;
    white-space: nowrap;
  }

  /* Hero — rank #1 */
  .hero-card {
    position: relative;
    margin: 16px 16px 0;
    border-radius: 20px;
    overflow: hidden;
    height: 220px;
    cursor: pointer;
    animation: fadeUp 0.4s ease both;
    box-shadow: 0 4px 24px rgba(0,0,0,0.10);
  }
  .hero-card img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%, transparent 100%);
    z-index: 2;
  }
  .hero-rank {
    position: absolute;
    top: 14px;
    left: 14px;
    z-index: 3;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 52px;
    line-height: 1;
    color: rgba(255,255,255,0.18);
    letter-spacing: 2px;
    pointer-events: none;
  }
  .hero-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 3;
    background: #FFB800;
    color: #0a0a0a;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    padding: 4px 10px;
    border-radius: 6px;
    text-transform: uppercase;
  }
  .hero-meta {
    position: absolute;
    bottom: 14px;
    left: 14px;
    right: 14px;
    z-index: 3;
  }
  .hero-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 26px;
    color: #fff;
    letter-spacing: 0.5px;
    line-height: 1.1;
    margin: 0 0 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hero-stats {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .stat-pill {
    font-size: 10px;
    font-weight: 600;
    color: rgba(255,255,255,0.85);
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 20px;
    padding: 3px 9px;
  }

  /* List rows — ranks 2-10 */
  .list-section {
    padding: 12px 16px 48px;
  }
  .list-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 0;
    cursor: pointer;
    border-bottom: 1px solid #f3f4f6;
    animation: fadeUp 0.35s ease both;
    transition: opacity 0.15s;
  }
  .list-row:last-child { border-bottom: none; }
  .list-row:active { opacity: 0.6; }

  .rank-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    line-height: 1;
    width: 28px;
    text-align: center;
    flex-shrink: 0;
    letter-spacing: 1px;
  }
  .row-thumb {
    position: relative;
    width: 58px;
    height: 92px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    background: #f0f0f5;
  }
  .row-thumb img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .row-info {
    flex: 1;
    min-width: 0;
  }
  .row-title {
    font-size: 13px;
    font-weight: 700;
    color: #0a0a0a;
    margin: 0 0 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: -0.1px;
  }
  .row-category {
    font-size: 11px;
    color: #9ca3af;
    font-weight: 500;
    margin: 0 0 7px;
    text-transform: capitalize;
  }
  .row-stats {
    display: flex;
    gap: 10px;
  }
  .row-stat {
    font-size: 10px;
    color: #6b7280;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .row-arrow {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 8px;
    background: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .arrow-icon {
    width: 6px;
    height: 6px;
    border-right: 1.5px solid #9ca3af;
    border-top: 1.5px solid #9ca3af;
    transform: rotate(45deg) translateX(-1px);
    display: block;
  }
`;

const RANK_COLORS = [
  '#0a0a0a', '#0a0a0a', '#374151',
  '#6b7280', '#6b7280', '#9ca3af',
  '#9ca3af', '#9ca3af', '#9ca3af',
];

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` :
  String(n);

const EyeIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const HeartIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

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
  const hero   = wallpapers[0];
  const rest   = wallpapers.slice(1);

  const goTo = (id: string) => { startLoader(); router.push(`/details/${id}`); };

  return (
    <>
      <style>{CSS}</style>
      <div className="hot-page">

        {/* Header */}
        <div className="hot-header">
          <button className="back-btn" onClick={() => router.back()}>
            <span className="back-chevron" />
          </button>
          <span className="header-title">Hot Right Now</span>
          <span className="header-sub">Updated every 2 days</span>
        </div>

        {/* Hero — #1 */}
        {hero && (
          <div className="hero-card" onClick={() => goTo(hero.id)}>
            <img src={hero.thumbnail || hero.url} alt={hero.title} draggable={false} />
            <div className="hero-overlay" />
            <div className="hero-rank">#1</div>
            <div className="hero-badge">Top Pick</div>
            <div className="hero-meta">
              <p className="hero-title">{hero.title}</p>
              <div className="hero-stats">
                <span className="stat-pill">{fmt(hero.views)} views</span>
                <span className="stat-pill">{fmt(hero.likes)} likes</span>
                <span className="stat-pill">{fmt(hero.downloads)} downloads</span>
              </div>
            </div>
          </div>
        )}

        {/* Ranked list — #2 to #10 */}
        <div className="list-section">
          {rest.map((wp, i) => {
            const rank = i + 2;
            return (
              <div
                key={wp.id}
                className="list-row"
                style={{ animationDelay: `${0.1 + i * 0.05}s` }}
                onClick={() => goTo(wp.id)}
              >
                <span className="rank-num" style={{ color: RANK_COLORS[rank - 2] ?? '#9ca3af' }}>
                  {rank}
                </span>

                <div className="row-thumb">
                  <img src={wp.thumbnail || wp.url} alt={wp.title} draggable={false} />
                </div>

                <div className="row-info">
                  <p className="row-title">{wp.title}</p>
                  <p className="row-category">
                    {wp.category} · {wp.type === 'pc' ? 'Desktop' : 'Mobile'}
                  </p>
                  <div className="row-stats">
                    <span className="row-stat"><EyeIcon /> {fmt(wp.views)}</span>
                    <span className="row-stat"><HeartIcon /> {fmt(wp.likes)}</span>
                    <span className="row-stat"><DownloadIcon /> {fmt(wp.downloads)}</span>
                  </div>
                </div>

                <div className="row-arrow">
                  <span className="arrow-icon" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </>
  );
}
