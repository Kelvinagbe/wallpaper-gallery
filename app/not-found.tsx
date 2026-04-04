// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="nf-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@300;400&display=swap');

        .nf-root {
          font-family: 'DM Mono', monospace;
          background: #f5f4f0;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .nf-dot {
          position: absolute;
          border-radius: 50%;
          background: rgba(0,0,0,0.04);
          pointer-events: none;
          animation: nf-float var(--dur, 9s) ease-in-out var(--delay, 0s) infinite;
        }

        .nf-ghost {
          font-family: 'Syne', sans-serif;
          font-size: clamp(120px, 30vw, 260px);
          font-weight: 800;
          color: transparent;
          -webkit-text-stroke: 1.5px rgba(0,0,0,0.08);
          line-height: 1;
          user-select: none;
          letter-spacing: -0.04em;
          animation: nf-float-ghost 6s ease-in-out infinite;
        }

        .nf-wrap {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 40px 24px;
        }

        .nf-content {
          margin-top: -32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          animation: nf-fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both;
        }

        .nf-label {
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(0,0,0,0.35);
        }

        .nf-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(22px, 5vw, 32px);
          font-weight: 700;
          color: #0a0a0a;
          letter-spacing: -0.03em;
          line-height: 1.2;
          margin: 0;
        }

        .nf-sub {
          font-size: 13px;
          color: rgba(0,0,0,0.4);
          line-height: 1.7;
          max-width: 280px;
          font-weight: 300;
          margin: 0;
        }

        .nf-divider {
          width: 32px;
          height: 1px;
          background: rgba(0,0,0,0.15);
        }

        .nf-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          background: #0a0a0a;
          color: #f5f4f0;
          text-decoration: none;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 0.06em;
          border-radius: 100px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 2px 12px rgba(0,0,0,0.12);
        }

        .nf-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.18);
        }

        .nf-btn:active { transform: translateY(0); }
        .nf-arrow { transition: transform 0.2s ease; display: inline-block; }
        .nf-btn:hover .nf-arrow { transform: translateX(3px); }

        @keyframes nf-float-ghost {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }

        @keyframes nf-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes nf-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-20px) scale(1.05); }
        }
      `}</style>

      {/* Decorative blobs */}
      {([
        { w: 320, h: 320, top: '-8%',  left: '-6%',  dur: '9s',  delay: '0s'    },
        { w: 180, h: 180, top: '60%',  left: '80%',  dur: '11s', delay: '-3s'   },
        { w: 80,  h: 80,  top: '20%',  left: '88%',  dur: '7s',  delay: '-1.5s' },
        { w: 120, h: 120, top: '75%',  left: '5%',   dur: '13s', delay: '-4s'   },
      ] as const).map((d, i) => (
        <div
          key={i}
          className="nf-dot"
          style={{
            width:  d.w,
            height: d.h,
            top:    d.top,
            left:   d.left,
            '--dur':   d.dur,
            '--delay': d.delay,
          } as React.CSSProperties}
        />
      ))}

      <div className="nf-wrap">
        <div className="nf-ghost" aria-hidden="true">404</div>

        <div className="nf-content">
          <span className="nf-label">page not found</span>
          <h1 className="nf-title">Lost in the void</h1>
          <div className="nf-divider" />
          <p className="nf-sub">
            This page doesn&apos;t exist or has been moved somewhere else.
          </p>
          <Link href="/" className="nf-btn">
            Go home <span className="nf-arrow">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
