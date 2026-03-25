'use client';

import { useState } from 'react';
import type { Ad } from '../types';

const COLORS = [
  { bg: '#e8eaf0', shimmer: '#d0d4e8' },
  { bg: '#ede8f0', shimmer: '#d8cce8' },
  { bg: '#e8f0ea', shimmer: '#cce0d0' },
  { bg: '#f0e8e8', shimmer: '#e8cccc' },
  { bg: '#f0ede8', shimmer: '#e8dcc8' },
];

const GRADIENTS = [
  'linear-gradient(145deg,#0f0c29,#302b63,#24243e)',
  'linear-gradient(145deg,#0a0a0a,#1a1a2e,#16213e)',
  'linear-gradient(145deg,#1a0533,#2d1b69,#11998e)',
  'linear-gradient(145deg,#0d0d0d,#1a1a1a,#2c2c54)',
  'linear-gradient(145deg,#160a2c,#0f3460,#533483)',
];

const trackClick = (id: string) =>
  fetch('/api/ads/click', { method: 'POST', body: JSON.stringify({ adId: id }), headers: { 'Content-Type': 'application/json' } }).catch(() => {});

/* Shared brand logo / monogram */
const BrandMark = ({ ad, size, radius, border }: { ad: Ad; size: number; radius: number; border: string }) =>
  ad.brandLogoUrl
    ? <img src={ad.brandLogoUrl} alt={ad.brandName} style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', flexShrink: 0, border }} />
    : <div style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 800, color: '#fff' }}>{ad.brandName?.[0]?.toUpperCase() ?? 'A'}</div>;

/* ── NATIVE AD CARD ── */
export const NativeAdCard = ({ ad, placeholderIndex = 0 }: { ad: Ad; placeholderIndex?: number }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const ph = COLORS[placeholderIndex % COLORS.length];
  const hasImage = !!ad.imageUrl && !imgError;
  const gradBg = GRADIENTS[(ad.brandName?.charCodeAt(0) ?? 65) % GRADIENTS.length];

  return (
    <a href={ad.ctaUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={() => trackClick(ad.id)} style={{ display: 'block', textDecoration: 'none' }}>
      <div style={{ position: 'relative', width: '100%', borderRadius: 16, overflow: 'hidden', aspectRatio: '9/16', background: hasImage ? ph.bg : gradBg }}>

        {/* Shimmer */}
        {!imgLoaded && !imgError && ad.imageUrl && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: `linear-gradient(105deg,transparent 40%,${ph.shimmer}99 50%,transparent 60%)`, backgroundSize: '200% 100%', animation: 'shimmerSweep 1.8s ease-in-out infinite' }} />
        )}

        {/* Image */}
        {ad.imageUrl && (
          <img src={ad.imageUrl} alt={ad.title} draggable={false} onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 2, opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: 'none', WebkitUserDrag: 'none' } as React.CSSProperties} />
        )}

        {/* No-image fallback: rings + monogram */}
        {!hasImage && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.07)', top: '20%', left: '50%', transform: 'translateX(-50%)' }} />
            <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', top: '30%', left: '50%', transform: 'translateX(-50%)' }} />
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.9)', marginBottom: 60 }}>
              {ad.brandName?.[0]?.toUpperCase() ?? 'A'}
            </div>
          </div>
        )}

        {/* Bottom gradient */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%', background: 'linear-gradient(to top,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.4) 55%,transparent 100%)', zIndex: 3 }} />

        {/* Bottom bar: brand + title + CTA */}
        <div style={{ position: 'absolute', bottom: 10, left: 8, right: 8, zIndex: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
          <BrandMark ad={ad} size={24} radius={7} border="1.5px solid rgba(255,255,255,0.2)" />
          <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>{ad.title}</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 7, padding: '4px 9px', flexShrink: 0, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{ad.ctaLabel ?? 'View'}</span>
        </div>

        {/* AD badge */}
        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 4, padding: '3px 7px', borderRadius: 6, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.08em', border: '1px solid rgba(255,255,255,0.1)' }}>AD</div>
      </div>

      {/* Info row */}
      <div style={{ padding: '6px 2px 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#0a0a0a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{ad.title}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.brandName}</span>
          <span style={{ display: 'inline-flex', alignSelf: 'flex-start', fontSize: 9, fontWeight: 800, color: '#fff', background: '#1d4ed8', borderRadius: 4, padding: '2px 6px', flexShrink: 0, letterSpacing: '0.04em' }}>SPONSORED</span>
        </div>
      </div>

      <style>{`@keyframes shimmerSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    </a>
  );
};

/* ── BANNER AD CARD ── */
export const BannerAdCard = ({ ad, horizontalPadding = 10 }: { ad: Ad; horizontalPadding?: number }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const bg = ad.backgroundColor ?? '#0f0f1a';
  const accent = ad.accentColor ?? '#6366f1';
  const hasImage = !!ad.imageUrl && !imgError;

  return (
    <div style={{ padding: `8px ${horizontalPadding}px` }}>
      <a href={ad.ctaUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={() => trackClick(ad.id)} style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', minHeight: 86, background: bg, boxShadow: '0 2px 20px rgba(0,0,0,0.14),0 0 0 1px rgba(255,255,255,0.04) inset' }}>

          {/* Background image */}
          {ad.imageUrl && (
            <img src={ad.imageUrl} alt="" aria-hidden draggable={false} onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.5s ease', pointerEvents: 'none', zIndex: 0 }} />
          )}

          {/* Scrim */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: hasImage ? 'linear-gradient(90deg,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0.48) 55%,rgba(0,0,0,0.2) 100%)' : `linear-gradient(135deg,${bg} 0%,${bg}dd 100%)` }} />

          {/* Glow blobs */}
          <div style={{ position: 'absolute', top: -30, right: 60, width: 100, height: 100, borderRadius: '50%', background: `${accent}28`, filter: 'blur(20px)', zIndex: 1, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, right: 20, width: 70, height: 70, borderRadius: '50%', background: `${accent}18`, filter: 'blur(14px)', zIndex: 1, pointerEvents: 'none' }} />

          {/* Content row */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
            {ad.brandLogoUrl
              ? <img src={ad.brandLogoUrl} alt={ad.brandName} style={{ width: 42, height: 42, borderRadius: 13, objectFit: 'cover', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.15)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }} />
              : <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, background: `${accent}33`, backdropFilter: 'blur(10px)', border: `1.5px solid ${accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 900, color: accent }}>{ad.brandName?.[0]?.toUpperCase() ?? 'A'}</div>
            }

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, color: '#fff', fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em', lineHeight: 1.2, textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>{ad.title}</p>
              {ad.subtitle && <p style={{ margin: '3px 0 0', color: `${accent}cc`, fontSize: 11, fontWeight: 500, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ad.subtitle}</p>}
              <span style={{ display: 'inline-block', marginTop: 5, fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Sponsored</span>
            </div>

            <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#fff', background: accent, borderRadius: 50, padding: '9px 16px', boxShadow: `0 4px 14px ${accent}55,0 0 0 1px ${accent}44 inset`, whiteSpace: 'nowrap' }}>{ad.ctaLabel ?? 'Learn More'}</span>
          </div>
        </div>
      </a>
    </div>
  );
};
