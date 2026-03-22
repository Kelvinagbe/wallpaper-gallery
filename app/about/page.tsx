// app/about/page.tsx
'use client';

import Link from 'next/link';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .ab-root {
    min-height: 100vh;
    background: #0a0a0a;
    color: #fff;
    font-family: 'Outfit', sans-serif;
  }

  /* ── Header ── */
  .ab-header {
    position: sticky; top: 0; z-index: 50;
    background: rgba(10,10,10,0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .ab-header-inner {
    max-width: 700px; margin: 0 auto;
    padding: 0 24px; height: 52px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .ab-logo {
    display: flex; align-items: center; gap: 8px;
    text-decoration: none;
  }
  .ab-logo-text {
    font-family: 'Outfit', sans-serif;
    font-weight: 800; font-size: 15px;
    letter-spacing: -0.3px; color: #fff;
  }
  .ab-nav {
    display: flex; align-items: center; gap: 2px;
  }
  .ab-nav a {
    padding: 5px 11px; border-radius: 7px;
    font-size: 12px; font-weight: 500;
    color: rgba(255,255,255,0.32);
    text-decoration: none;
    transition: color .15s, background .15s;
    white-space: nowrap;
  }
  .ab-nav a:hover { color: rgba(255,255,255,0.65); background: rgba(255,255,255,0.05); }
  .ab-nav a.cur { color: #fff; }

  /* ── Page body ── */
  .ab-body {
    max-width: 700px; margin: 0 auto;
    padding: 72px 24px 120px;
  }

  .ab-eyebrow {
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: rgba(255,255,255,0.22);
    margin-bottom: 18px;
  }
  .ab-h1 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(34px, 6vw, 52px);
    line-height: 1.08; letter-spacing: -0.02em;
    color: #fff; margin-bottom: 24px;
  }
  .ab-h1 em { font-style: italic; color: rgba(255,255,255,0.38); }

  .ab-lead {
    font-size: 16px; line-height: 1.8;
    color: rgba(255,255,255,0.45);
    max-width: 520px; margin-bottom: 64px;
  }

  /* Stats grid */
  .ab-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px; overflow: hidden;
    margin-bottom: 64px;
  }
  @media(max-width:520px) { .ab-stats { grid-template-columns: repeat(2,1fr); } }
  .ab-stat { padding: 24px 20px; background: #0a0a0a; }
  .ab-stat-num {
    font-family: 'DM Serif Display', serif;
    font-size: 32px; color: #fff;
    letter-spacing: -0.02em; margin-bottom: 4px;
  }
  .ab-stat-lbl {
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.05em; text-transform: uppercase;
    color: rgba(255,255,255,0.24);
  }

  .ab-rule { width: 36px; height: 1px; background: rgba(255,255,255,0.1); margin-bottom: 44px; }

  .ab-section-lbl {
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: rgba(255,255,255,0.18); margin-bottom: 14px;
  }
  .ab-p {
    font-size: 14px; line-height: 1.85;
    color: rgba(255,255,255,0.4);
    margin-bottom: 16px;
  }
  .ab-p strong { color: rgba(255,255,255,0.68); font-weight: 600; }
  .ab-p:last-child { margin-bottom: 0; }

  /* Values list */
  .ab-values {
    margin-top: 44px;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px; overflow: hidden;
    margin-bottom: 64px;
  }
  .ab-value {
    display: flex; gap: 18px;
    padding: 20px 22px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    background: rgba(255,255,255,0.015);
  }
  .ab-value:last-child { border-bottom: none; }
  .ab-value-n {
    font-family: 'DM Serif Display', serif;
    font-size: 13px; color: rgba(255,255,255,0.15);
    padding-top: 1px; flex-shrink: 0; width: 22px;
  }
  .ab-value-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 3px; }
  .ab-value-desc  { font-size: 13px; line-height: 1.65; color: rgba(255,255,255,0.3); }

  /* Footer */
  .ab-footer {
    border-top: 1px solid rgba(255,255,255,0.05);
    max-width: 700px; margin: 0 auto; padding: 28px 24px;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 10px;
  }
  .ab-footer-copy { font-size: 12px; color: rgba(255,255,255,0.18); }
  .ab-footer-links { display: flex; gap: 18px; }
  .ab-footer-links a {
    font-size: 12px; color: rgba(255,255,255,0.22);
    text-decoration: none; transition: color .15s;
  }
  .ab-footer-links a:hover { color: rgba(255,255,255,0.55); }
`;

const STATS = [
  { num: '50K+',  lbl: 'Wallpapers' },
  { num: '12K+',  lbl: 'Creators'   },
  { num: '200K+', lbl: 'Downloads'  },
  { num: '4K',    lbl: 'Resolution' },
];

const VALUES = [
  { title: 'Quality over quantity',  desc: 'Every wallpaper is reviewed for resolution, composition, and originality before it goes live.' },
  { title: 'Creators first',         desc: 'We surface who made the work. Profiles, attribution, and recognition are built into the core.' },
  { title: 'No noise',               desc: 'No ads cluttering the feed. No dark patterns. Just wallpapers.' },
  { title: 'Open by default',        desc: 'Personal use is always free. We only charge for features that genuinely warrant it.' },
];

const Logo = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <rect width="9" height="9" rx="2" fill="white" />
    <rect x="11" y="0" width="9" height="9" rx="2" fill="white" />
    <rect x="0" y="11" width="9" height="9" rx="2" fill="white" />
    <rect x="11" y="11" width="9" height="9" rx="2" fill="white" fillOpacity="0.28" />
  </svg>
);

export default function AboutPage() {
  return (
    <>
      <style>{CSS}</style>
      <div className="ab-root">

        <header className="ab-header">
          <div className="ab-header-inner">
            <Link href="/" className="ab-logo">
              <Logo />
              <span className="ab-logo-text">WALLS</span>
            </Link>
            <nav className="ab-nav">
              <a href="/about" className="cur">About</a>
              <a href="/terms">Terms</a>
              <a href="/privacy">Privacy</a>
            </nav>
          </div>
        </header>

        <div className="ab-body">
          <p className="ab-eyebrow">About WALLS</p>
          <h1 className="ab-h1">The wallpaper gallery<br /><em>built for the obsessive.</em></h1>
          <p className="ab-lead">
            WALLS is a curated collection of high-resolution wallpapers made by designers,
            photographers, and artists around the world. We built the thing we wanted to use
            but couldn't find.
          </p>

          <div className="ab-stats">
            {STATS.map(({ num, lbl }) => (
              <div key={lbl} className="ab-stat">
                <div className="ab-stat-num">{num}</div>
                <div className="ab-stat-lbl">{lbl}</div>
              </div>
            ))}
          </div>

          <div className="ab-rule" />

          <p className="ab-section-lbl">The story</p>
          <p className="ab-p">
            Most wallpaper sites are a nightmare — low-res previews, aggressive download gates,
            and feeds algorithmed into mediocrity. <strong>WALLS started as a personal fix.</strong>{' '}
            A clean place to find wallpapers worth putting on your screen, from people who made
            them intentionally.
          </p>
          <p className="ab-p">
            We opened it up because the problem wasn't personal.{' '}
            <strong>Great visual work deserves a better home.</strong> Creators deserve
            attribution and discovery. Users deserve a distraction-free browsing experience.
          </p>

          <div className="ab-values">
            {VALUES.map(({ title, desc }, i) => (
              <div key={title} className="ab-value">
                <span className="ab-value-n">0{i + 1}</span>
                <div>
                  <div className="ab-value-title">{title}</div>
                  <div className="ab-value-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="ab-rule" />
          <p className="ab-section-lbl">Contact</p>
          <p className="ab-p">
            Questions, partnerships, or just want to say hi?{' '}
            <strong>
              <a href="mailto:hello@walls.app" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 1 }}>
                hello@walls.app
              </a>
            </strong>
          </p>
        </div>

        <footer>
          <div className="ab-footer">
            <span className="ab-footer-copy">© {new Date().getFullYear()} WALLS</span>
            <div className="ab-footer-links">
              <a href="/about">About</a>
              <a href="/terms">Terms</a>
              <a href="/privacy">Privacy</a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
