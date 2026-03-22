// lib/legal-shared.tsx
// Import this into each legal page

export const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .lg-root {
    min-height: 100vh;
    background: #fafafa;
    color: #0a0a0a;
    font-family: 'Outfit', sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Header ── */
  .lg-header {
    position: sticky; top: 0; z-index: 50;
    background: rgba(250,250,250,0.94);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-bottom: 1px solid rgba(0,0,0,0.06);
  }
  .lg-header-inner {
    max-width: 720px; margin: 0 auto;
    padding: 0 24px; height: 52px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .lg-logo {
    display: flex; align-items: center; gap: 8px;
    text-decoration: none; flex-shrink: 0;
  }
  .lg-logo-text {
    font-family: 'Outfit', sans-serif;
    font-weight: 800; font-size: 15px;
    letter-spacing: -0.3px; color: #0a0a0a;
  }
  .lg-nav {
    display: flex; align-items: center; gap: 2px;
  }
  .lg-nav a {
    padding: 5px 10px; border-radius: 7px;
    font-size: 12px; font-weight: 500;
    color: rgba(0,0,0,0.35);
    text-decoration: none;
    transition: color .15s, background .15s;
    white-space: nowrap;
  }
  .lg-nav a:hover { color: rgba(0,0,0,0.7); background: rgba(0,0,0,0.04); }
  .lg-nav a.cur  { color: #0a0a0a; font-weight: 600; }

  /* ── Page body ── */
  .lg-body {
    max-width: 720px; margin: 0 auto;
    padding: 68px 24px 100px;
  }

  /* ── Typography tokens ── */
  .lg-eyebrow {
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.11em; text-transform: uppercase;
    color: rgba(0,0,0,0.28); margin-bottom: 16px;
  }
  .lg-h1 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(30px, 5vw, 46px);
    line-height: 1.1; letter-spacing: -0.02em;
    color: #0a0a0a; margin-bottom: 10px;
  }
  .lg-h1 em { font-style: italic; color: rgba(0,0,0,0.32); }
  .lg-updated {
    font-size: 12px; color: rgba(0,0,0,0.28);
    margin-bottom: 52px;
  }
  .lg-lead {
    font-size: 15px; line-height: 1.8;
    color: rgba(0,0,0,0.48);
    max-width: 540px; margin-bottom: 52px;
    padding-bottom: 52px;
    border-bottom: 1px solid rgba(0,0,0,0.06);
  }

  /* ── Sections ── */
  .lg-section {
    padding-bottom: 44px;
    margin-bottom: 44px;
    border-bottom: 1px solid rgba(0,0,0,0.06);
  }
  .lg-section:last-of-type { border-bottom: none; padding-bottom: 0; }

  .lg-sec-num {
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: rgba(0,0,0,0.2); margin-bottom: 6px;
  }
  .lg-sec-title {
    font-size: 15px; font-weight: 700;
    color: #0a0a0a; letter-spacing: -0.01em;
    margin-bottom: 12px;
  }
  .lg-sec-body {
    font-size: 14px; line-height: 1.85;
    color: rgba(0,0,0,0.5);
    margin-bottom: 10px;
  }
  .lg-sec-body:last-child { margin-bottom: 0; }
  .lg-sec-body strong { color: rgba(0,0,0,0.72); font-weight: 600; }
  .lg-sec-body a { color: rgba(0,0,0,0.6); }

  /* ── List ── */
  .lg-list {
    margin-top: 12px;
    display: flex; flex-direction: column; gap: 9px;
    list-style: none; padding: 0;
  }
  .lg-list li {
    display: flex; gap: 12px;
    font-size: 14px; line-height: 1.7;
    color: rgba(0,0,0,0.48);
  }
  .lg-list li::before {
    content: '—'; color: rgba(0,0,0,0.18);
    flex-shrink: 0; margin-top: 1px;
  }

  /* ── Callout / note box ── */
  .lg-callout {
    margin-top: 16px; padding: 16px 18px;
    background: #f4f4f5;
    border-radius: 10px;
    font-size: 13px; line-height: 1.7;
    color: rgba(0,0,0,0.45);
  }
  .lg-callout strong { color: rgba(0,0,0,0.68); font-weight: 600; }

  /* ── TOC (used in Privacy) ── */
  .lg-toc {
    border: 1px solid rgba(0,0,0,0.07);
    border-radius: 12px; overflow: hidden;
    margin-bottom: 52px;
  }
  .lg-toc-row {
    display: flex; align-items: center; gap: 14px;
    padding: 11px 18px;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    text-decoration: none; background: #fff;
    transition: background .12s;
  }
  .lg-toc-row:last-child { border-bottom: none; }
  .lg-toc-row:hover { background: #f7f7f7; }
  .lg-toc-num   { font-size: 11px; color: rgba(0,0,0,0.22); width: 22px; flex-shrink: 0; }
  .lg-toc-label { font-size: 13px; font-weight: 500; color: rgba(0,0,0,0.5); flex: 1; }
  .lg-toc-arrow { font-size: 10px; color: rgba(0,0,0,0.2); }

  /* ── Stats grid (About) ── */
  .lg-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px; background: rgba(0,0,0,0.07);
    border: 1px solid rgba(0,0,0,0.07);
    border-radius: 14px; overflow: hidden;
    margin-bottom: 56px;
  }
  @media(max-width:520px) { .lg-stats { grid-template-columns: repeat(2,1fr); } }
  .lg-stat { padding: 22px 20px; background: #fff; }
  .lg-stat-num {
    font-family: 'DM Serif Display', serif;
    font-size: 30px; color: #0a0a0a;
    letter-spacing: -0.02em; margin-bottom: 3px;
  }
  .lg-stat-lbl {
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.05em; text-transform: uppercase;
    color: rgba(0,0,0,0.3);
  }

  /* ── Values list (About) ── */
  .lg-values {
    border: 1px solid rgba(0,0,0,0.07);
    border-radius: 13px; overflow: hidden;
    margin-bottom: 52px;
  }
  .lg-value {
    display: flex; gap: 18px;
    padding: 18px 20px; background: #fff;
    border-bottom: 1px solid rgba(0,0,0,0.05);
  }
  .lg-value:last-child { border-bottom: none; }
  .lg-value-n {
    font-family: 'DM Serif Display', serif;
    font-size: 13px; color: rgba(0,0,0,0.2);
    padding-top: 1px; flex-shrink: 0; width: 22px;
  }
  .lg-value-title { font-size: 13px; font-weight: 600; color: #0a0a0a; margin-bottom: 3px; }
  .lg-value-desc  { font-size: 13px; line-height: 1.65; color: rgba(0,0,0,0.4); }

  /* ── Cookie type cards ── */
  .lg-cookie-grid {
    display: flex; flex-direction: column; gap: 1px;
    border: 1px solid rgba(0,0,0,0.07);
    border-radius: 13px; overflow: hidden;
    margin-top: 14px; margin-bottom: 10px;
  }
  .lg-cookie-card {
    padding: 18px 20px; background: #fff;
    border-bottom: 1px solid rgba(0,0,0,0.05);
  }
  .lg-cookie-card:last-child { border-bottom: none; }
  .lg-cookie-card-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 6px;
  }
  .lg-cookie-card-title { font-size: 13px; font-weight: 700; color: #0a0a0a; }
  .lg-cookie-badge {
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.06em; text-transform: uppercase;
    padding: 2px 8px; border-radius: 100px;
  }
  .lg-cookie-badge.required  { background: #f0f0f0; color: rgba(0,0,0,0.45); }
  .lg-cookie-badge.optional  { background: #e8f4fd; color: #1a6fa8; }
  .lg-cookie-badge.analytics { background: #f0f9f0; color: #2d7a2d; }
  .lg-cookie-card-desc { font-size: 13px; line-height: 1.65; color: rgba(0,0,0,0.42); }

  /* ── Rule ── */
  .lg-rule { width: 36px; height: 1px; background: rgba(0,0,0,0.1); margin-bottom: 40px; }

  /* ── Footer ── */
  .lg-footer {
    border-top: 1px solid rgba(0,0,0,0.06);
    max-width: 720px; margin: 0 auto; padding: 24px 24px;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 10px;
  }
  .lg-footer-copy { font-size: 12px; color: rgba(0,0,0,0.28); }
  .lg-footer-links { display: flex; gap: 16px; }
  .lg-footer-links a {
    font-size: 12px; color: rgba(0,0,0,0.32);
    text-decoration: none; transition: color .15s;
  }
  .lg-footer-links a:hover { color: rgba(0,0,0,0.65); }
`;

export const NAV_LINKS = [
  { href: '/about',   label: 'About'   },
  { href: '/terms',   label: 'Terms'   },
  { href: '/privacy', label: 'Privacy' },
  { href: '/cookies', label: 'Cookies' },
];

export const Logo = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <rect width="9" height="9" rx="2" fill="#0a0a0a" />
    <rect x="11" y="0" width="9" height="9" rx="2" fill="#0a0a0a" />
    <rect x="0" y="11" width="9" height="9" rx="2" fill="#0a0a0a" />
    <rect x="11" y="11" width="9" height="9" rx="2" fill="#0a0a0a" fillOpacity="0.25" />
  </svg>
);

export const LegalShell = ({
  children,
  current,
}: {
  children: React.ReactNode;
  current: string;
}) => (
  <>
    <style>{SHARED_CSS}</style>
    <div className="lg-root">
      <header className="lg-header">
        <div className="lg-header-inner">
          <a href="/" className="lg-logo">
            <Logo />
            <span className="lg-logo-text">WALLS</span>
          </a>
          <nav className="lg-nav">
            {NAV_LINKS.map(({ href, label }) => (
              <a key={href} href={href} className={current === href ? 'cur' : ''}>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="lg-body">{children}</div>

      <footer>
        <div className="lg-footer">
          <span className="lg-footer-copy">© {new Date().getFullYear()} WALLS. All rights reserved.</span>
          <div className="lg-footer-links">
            {NAV_LINKS.map(({ href, label }) => (
              <a key={href} href={href}>{label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  </>
);
