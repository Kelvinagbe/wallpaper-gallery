// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="nf">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        .nf {
          font-family: 'DM Sans', sans-serif;
          background: #ffffff;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          position: relative;
          overflow: hidden;
        }

        /* ── Faint grid background ── */
        .nf::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        /* ── Soft radial glow center ── */
        .nf::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%);
          pointer-events: none;
        }

        .nf-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0;
        }

        /* ── Broken image frame ── */
        .nf-frame {
          position: relative;
          width: 160px;
          height: 200px;
          margin-bottom: 32px;
          animation: nf-float 5s ease-in-out infinite;
        }

        .nf-card {
          width: 100%;
          height: 100%;
          border-radius: 20px;
          background: #f3f3f3;
          border: 1.5px solid #e8e8e8;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          position: relative;
          overflow: hidden;
          box-shadow:
            0 1px 2px rgba(0,0,0,0.04),
            0 4px 16px rgba(0,0,0,0.06),
            0 12px 40px rgba(0,0,0,0.05);
        }

        /* Torn diagonal lines inside card */
        .nf-card::before {
          content: '';
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          background: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 8px,
            rgba(0,0,0,0.025) 8px,
            rgba(0,0,0,0.025) 9px
          );
        }

        .nf-img-icon {
          width: 44px;
          height: 44px;
          position: relative;
          z-index: 1;
        }

        .nf-img-icon svg {
          width: 100%;
          height: 100%;
        }

        .nf-img-label {
          font-size: 10px;
          font-weight: 500;
          color: rgba(0,0,0,0.25);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          position: relative;
          z-index: 1;
        }

        /* Stacked cards behind */
        .nf-card-back1 {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 20px;
          background: #ebebeb;
          border: 1.5px solid #e0e0e0;
          top: 8px;
          left: -8px;
          z-index: -1;
          transform: rotate(-4deg);
        }

        .nf-card-back2 {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 20px;
          background: #e4e4e4;
          border: 1.5px solid #d8d8d8;
          top: 14px;
          left: -14px;
          z-index: -2;
          transform: rotate(-7deg);
        }

        /* ── Number + text ── */
        .nf-code {
          font-family: 'Syne', sans-serif;
          font-size: clamp(72px, 18vw, 120px);
          font-weight: 800;
          color: transparent;
          -webkit-text-stroke: 2px rgba(0,0,0,0.1);
          line-height: 1;
          letter-spacing: -0.05em;
          margin-bottom: 16px;
          animation: nf-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.05s both;
        }

        .nf-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(20px, 5vw, 26px);
          font-weight: 700;
          color: #0a0a0a;
          letter-spacing: -0.03em;
          margin: 0 0 10px;
          animation: nf-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both;
        }

        .nf-sub {
          font-size: 14px;
          font-weight: 400;
          color: rgba(0,0,0,0.38);
          line-height: 1.65;
          max-width: 260px;
          margin: 0 0 28px;
          animation: nf-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both;
        }

        /* ── Buttons ── */
        .nf-actions {
          display: flex;
          gap: 10px;
          animation: nf-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both;
        }

        .nf-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 12px 24px;
          background: #0a0a0a;
          color: #fff;
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          border-radius: 100px;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
          letter-spacing: 0.01em;
        }

        .nf-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.22);
        }

        .nf-btn-primary:active { transform: scale(0.97); }

        .nf-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 12px 24px;
          background: transparent;
          color: rgba(0,0,0,0.5);
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          border-radius: 100px;
          border: 1.5px solid rgba(0,0,0,0.1);
          transition: border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
          letter-spacing: 0.01em;
        }

        .nf-btn-secondary:hover {
          border-color: rgba(0,0,0,0.25);
          color: #0a0a0a;
          transform: translateY(-1px);
        }

        .nf-btn-secondary:active { transform: scale(0.97); }

        /* ── Corner watermarks ── */
        .nf-corner {
          position: absolute;
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: rgba(0,0,0,0.08);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          pointer-events: none;
        }

        .nf-corner-tl { top: 24px; left: 24px; }
        .nf-corner-br { bottom: 24px; right: 24px; }

        /* ── Animations ── */
        @keyframes nf-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-8px) rotate(1deg); }
          66%       { transform: translateY(-4px) rotate(-1deg); }
        }

        @keyframes nf-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Corner labels */}
      <span className="nf-corner nf-corner-tl">Walls</span>
      <span className="nf-corner nf-corner-br">Error · 404</span>

      <div className="nf-inner">

        {/* Broken wallpaper card stack */}
        <div className="nf-frame">
          <div className="nf-card-back2" />
          <div className="nf-card-back1" />
          <div className="nf-card">
            <div className="nf-img-icon">
              {/* Broken image SVG */}
              <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="36" height="28" rx="5" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" fill="none"/>
                <circle cx="14" cy="17" r="3" fill="rgba(0,0,0,0.12)"/>
                <path d="M4 28L14 18L20 24L27 17L40 28" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" strokeLinejoin="round"/>
                {/* Crack / broken lines */}
                <path d="M20 8L17 16L22 19L18 28" stroke="rgba(0,0,0,0.22)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 19L26 22" stroke="rgba(0,0,0,0.15)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="nf-img-label">Not found</span>
          </div>
        </div>

        {/* Ghost 404 */}
        <div className="nf-code" aria-hidden="true">404</div>

        {/* Text */}
        <h1 className="nf-title">Wallpaper missing</h1>
        <p className="nf-sub">
          This page doesn&apos;t exist or the wallpaper has been removed.
        </p>

        {/* Actions */}
        <div className="nf-actions">
          <Link href="/" className="nf-btn-primary">
            ← Go home
          </Link>
          <Link href="/search" className="nf-btn-secondary">
            Browse walls
          </Link>
        </div>

      </div>
    </div>
  );
}
