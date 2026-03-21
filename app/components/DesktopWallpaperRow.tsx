'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Download, Heart, ChevronRight } from 'lucide-react';
import { saveFeedScroll } from '@/lib/feedCache';
import { startLoader } from '@/app/components/TopLoader';
import type { Wallpaper } from '../types';

type Props = { wallpapers: Wallpaper[]; };

const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}k` : String(n);

export const PCWallpaperRow = ({ wallpapers }: Props) => {
  const router   = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!wallpapers.length) return null;

  const goTo = (id: string) => {
    saveFeedScroll(); startLoader();
    router.push(`/details/${id}`);
  };

  const goToProfile = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation(); startLoader();
    router.push(`/profile/${userId}`);
  };

  return (
    <section style={{ marginBottom: 8 }}>

      {/* ── Section header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.02em', margin: 0 }}>Desktop Wallpapers</p>
          <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.38)', margin: '2px 0 0' }}>16:9 · For your PC & Mac</p>
        </div>
        <button
          onClick={() => { startLoader(); router.push('/desktop'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.45)', padding: '4px 0', fontFamily: 'inherit' }}
        >
          See all <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Horizontal scroll row ── */}
      <div
        ref={scrollRef}
        style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 4px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        <style>{`.pc-row::-webkit-scrollbar{display:none}.pc-card:active{transform:scale(0.98)}`}</style>

        {wallpapers.map(wp => (
          <div
            key={wp.id}
            className="pc-card"
            onClick={() => goTo(wp.id)}
            style={{ flexShrink: 0, width: 280, cursor: 'pointer', transition: 'transform .12s' }}
          >
            {/* Image — 16:9 */}
            <div style={{ width: 280, height: 157, borderRadius: 12, overflow: 'hidden', background: '#e8e8e8', position: 'relative' }}>
              <Image
                src={wp.thumbnail || wp.url}
                alt={wp.title}
                fill
                sizes="280px"
                className="object-cover"
                style={{ display: 'block' }}
              />
              {/* Subtle hover overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 50%)', opacity: 0, transition: 'opacity .2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
              />
            </div>

            {/* ── Info below image — Unsplash style ── */}
            <div style={{ padding: '9px 2px 0' }}>

              {/* Title */}
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', margin: '0 0 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
                {wp.title}
              </p>

              {/* Uploader + stats row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                {/* Uploader */}
                {wp.uploadedBy && (
                  <button
                    onClick={e => goToProfile(e, wp.userId)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, minWidth: 0 }}
                  >
                    {wp.userAvatar && wp.userAvatar !== 'favicon.ico' ? (
                      <img
                        src={wp.userAvatar}
                        alt={wp.uploadedBy}
                        style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: 'rgba(0,0,0,0.5)', flexShrink: 0 }}>
                        {wp.uploadedBy[0]?.toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      @{wp.uploadedBy}
                    </span>
                    {wp.verified && (
                      <svg width="10" height="10" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="10" cy="10" r="10" fill="#1877F2"/>
                        <path d="M6.5 10.2L8.8 12.5L13.5 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                )}

                {/* Likes + downloads */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {wp.likes > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Heart size={10} color="rgba(0,0,0,0.3)" />
                      <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', fontWeight: 500 }}>{fmt(wp.likes)}</span>
                    </div>
                  )}
                  {wp.downloads > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Download size={10} color="rgba(0,0,0,0.3)" />
                      <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', fontWeight: 500 }}>{fmt(wp.downloads)}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
