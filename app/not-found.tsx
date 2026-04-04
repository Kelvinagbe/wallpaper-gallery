// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="en">
      <head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@300;400&display=swap');

          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: 'DM Mono', monospace;
            background: #f5f4f0;
            color: #0a0a0a;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .wrap {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 24px;
            text-align: center;
            z-index: 1;
          }

          /* Big faded 404 behind */
          .ghost {
            font-family: 'Syne', sans-serif;
            font-size: clamp(120px, 30vw, 260px);
            font-weight: 800;
            color: transparent;
            -webkit-text-stroke: 1.5px rgba(0,0,0,0.08);
            line-height: 1;
            user-select: none;
            animation: floatGhost 6s ease-in-out infinite;
            letter-spacing: -0.04em;
          }

          .content {
            margin-top: -32px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both;
          }

          .label {
            font-size: 10px;
            font-weight: 400;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: rgba(0,0,0,0.35);
          }

          .title {
            font-family: 'Syne', sans-serif;
            font-size: clamp(22px, 5vw, 32px);
            font-weight: 700;
            color: #0a0a0a;
            letter-spacing: -0.03em;
            line-height: 1.2;
          }

          .sub {
            font-size: 13px;
            color: rgba(0,0,0,0.4);
            line-height: 1.7;
            max-width: 280px;
            font-weight: 300;
          }

          .divider {
            width: 32px;
            height: 1px;
            background: rgba(0,0,0,0.15);
          }

          .btn {
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
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
            box-shadow: 0 2px 12px rgba(0,0,0,0.12);
          }

          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.18);
          }

          .btn:active {
            transform: translateY(0);
          }

          .btn-arrow {
            font-size: 14px;
            transition: transform 0.2s ease;
          }

          .btn:hover .btn-arrow {
            transform: translateX(3px);
          }

          /* Decorative dots */
          .dots {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 0;
            overflow: hidden;
          }

          .dot {
            position: absolute;
            border-radius: 50%;
            background: rgba(0,0,0,0.04);
            animation: floatDot var(--dur) ease-in-out infinite;
            animation-delay: var(--delay);
          }

          @keyframes floatGhost {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-12px); }
          }

          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          @keyframes floatDot {
            0%, 100% { transform: translateY(0) scale(1); }
            50%      { transform: translateY(-20px) scale(1.05); }
          }
        `}</style>
      </head>
      <body>
        {/* Decorative floating circles */}
        <div className="dots" aria-hidden="true">
          {[
            { w: 320, h: 320, top: '-8%',  left: '-6%',  dur: '9s',  delay: '0s'    },
            { w: 180, h: 180, top: '60%',  left: '80%',  dur: '11s', delay: '-3s'   },
            { w: 80,  h: 80,  top: '20%',  left: '88%',  dur: '7s',  delay: '-1.5s' },
            { w: 120, h: 120, top: '75%',  left: '5%',   dur: '13s', delay: '-4s'   },
            { w: 50,  h: 50,  top: '40%',  left: '50%',  dur: '8s',  delay: '-2s'   },
          ].map((d, i) => (
            <div
              key={i}
              className="dot"
              style={{
                width: d.w,
                height: d.h,
                top: d.top,
                left: d.left,
                ['--dur' as any]: d.dur,
                ['--delay' as any]: d.delay,
              }}
            />
          ))}
        </div>

        <div className="wrap">
          <div className="ghost" aria-hidden="true">404</div>

          <div className="content">
            <span className="label">page not found</span>
            <h1 className="title">Lost in the void</h1>
            <div className="divider" />
            <p className="sub">
              This page doesn&apos;t exist or has been moved somewhere else.
            </p>
            <Link href="/" className="btn">
              Go home <span className="btn-arrow">→</span>
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
