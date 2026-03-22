// app/terms/page.tsx
'use client';

import Link from 'next/link';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .tms-root {
    min-height: 100vh;
    background: #0a0a0a;
    color: #fff;
    font-family: 'Outfit', sans-serif;
  }

  .tms-header {
    position: sticky; top: 0; z-index: 50;
    background: rgba(10,10,10,0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .tms-header-inner {
    max-width: 700px; margin: 0 auto;
    padding: 0 24px; height: 52px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .tms-logo {
    display: flex; align-items: center; gap: 8px;
    text-decoration: none;
  }
  .tms-logo-text {
    font-family: 'Outfit', sans-serif;
    font-weight: 800; font-size: 15px;
    letter-spacing: -0.3px; color: #fff;
  }
  .tms-nav {
    display: flex; align-items: center; gap: 2px;
  }
  .tms-nav a {
    padding: 5px 11px; border-radius: 7px;
    font-size: 12px; font-weight: 500;
    color: rgba(255,255,255,0.32);
    text-decoration: none;
    transition: color .15s, background .15s;
    white-space: nowrap;
  }
  .tms-nav a:hover { color: rgba(255,255,255,0.65); background: rgba(255,255,255,0.05); }
  .tms-nav a.cur  { color: #fff; }

  .tms-body {
    max-width: 700px; margin: 0 auto;
    padding: 72px 24px 120px;
  }

  .tms-eyebrow {
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: rgba(255,255,255,0.22); margin-bottom: 18px;
  }
  .tms-h1 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(30px, 5vw, 46px);
    line-height: 1.1; letter-spacing: -0.02em;
    color: #fff; margin-bottom: 10px;
  }
  .tms-updated {
    font-size: 12px; color: rgba(255,255,255,0.2);
    margin-bottom: 60px;
  }

  /* Sections */
  .tms-section {
    padding-bottom: 44px;
    margin-bottom: 44px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .tms-section:last-of-type { border-bottom: none; }

  .tms-sec-num {
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: rgba(255,255,255,0.18); margin-bottom: 6px;
  }
  .tms-sec-title {
    font-size: 15px; font-weight: 700;
    color: rgba(255,255,255,0.78);
    letter-spacing: -0.01em; margin-bottom: 12px;
  }
  .tms-sec-body {
    font-size: 14px; line-height: 1.85;
    color: rgba(255,255,255,0.38);
    margin-bottom: 10px;
  }
  .tms-sec-body:last-child { margin-bottom: 0; }

  .tms-list {
    margin-top: 12px;
    display: flex; flex-direction: column; gap: 9px;
    list-style: none; padding: 0;
  }
  .tms-list li {
    display: flex; gap: 12px;
    font-size: 14px; line-height: 1.7;
    color: rgba(255,255,255,0.36);
  }
  .tms-list li::before {
    content: '—'; color: rgba(255,255,255,0.14);
    flex-shrink: 0; margin-top: 1px;
  }

  .tms-note {
    margin-top: 16px; padding: 15px 18px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    font-size: 13px; line-height: 1.7;
    color: rgba(255,255,255,0.3);
  }

  .tms-footer {
    border-top: 1px solid rgba(255,255,255,0.05);
    max-width: 700px; margin: 0 auto; padding: 28px 24px;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 10px;
  }
  .tms-footer-copy { font-size: 12px; color: rgba(255,255,255,0.18); }
  .tms-footer-links { display: flex; gap: 18px; }
  .tms-footer-links a {
    font-size: 12px; color: rgba(255,255,255,0.22);
    text-decoration: none; transition: color .15s;
  }
  .tms-footer-links a:hover { color: rgba(255,255,255,0.55); }
`;

const SECTIONS = [
  {
    num: '01', title: 'Acceptance',
    body: 'By accessing or using WALLS you agree to these Terms. If you don\'t agree, please don\'t use the service.',
  },
  {
    num: '02', title: 'Permitted Use',
    body: 'WALLS is for personal, non-commercial browsing and downloading. You agree not to:',
    list: [
      'Use the service for any unlawful purpose',
      'Upload content you don\'t own or have rights to distribute',
      'Scrape or bulk-download content systematically',
      'Attempt to circumvent security or access controls',
      'Impersonate other users or misrepresent your identity',
    ],
  },
  {
    num: '03', title: 'Uploads & Content',
    body: 'You keep ownership of what you upload. By uploading you grant WALLS a non-exclusive, royalty-free licence to display and distribute your content within the service. You\'re solely responsible for what you upload.',
    note: 'Don\'t upload content that infringes third-party intellectual property rights.',
  },
  {
    num: '04', title: 'Downloads',
    body: 'Wallpapers are available for personal, non-commercial use unless stated otherwise. You may not:',
    list: [
      'Redistribute or resell wallpapers as your own work',
      'Use wallpapers in commercial products without explicit creator permission',
      'Remove credits or attribution from downloaded content',
    ],
  },
  {
    num: '05', title: 'Account Termination',
    body: 'We may suspend or terminate accounts that violate these Terms, upload infringing content, or engage in abusive behaviour toward other users or the platform.',
  },
  {
    num: '06', title: 'Disclaimer',
    body: 'WALLS is provided "as is" without warranties of any kind. We\'re not liable for any loss of data or damages arising from your use of the service.',
  },
  {
    num: '07', title: 'Changes',
    body: 'We may update these Terms from time to time. Continued use after changes are posted means you accept them. We\'ll notify you of significant changes via email or an in-app notice.',
  },
  {
    num: '08', title: 'Contact',
    body: 'Questions about these Terms? Email legal@walls.app.',
  },
];

const Logo = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <rect width="9" height="9" rx="2" fill="white" />
    <rect x="11" y="0" width="9" height="9" rx="2" fill="white" />
    <rect x="0" y="11" width="9" height="9" rx="2" fill="white" />
    <rect x="11" y="11" width="9" height="9" rx="2" fill="white" fillOpacity="0.28" />
  </svg>
);

export default function TermsPage() {
  return (
    <>
      <style>{CSS}</style>
      <div className="tms-root">

        <header className="tms-header">
          <div className="tms-header-inner">
            <Link href="/" className="tms-logo">
              <Logo />
              <span className="tms-logo-text">WALLS</span>
            </Link>
            <nav className="tms-nav">
              <a href="/about">About</a>
              <a href="/terms" className="cur">Terms</a>
              <a href="/privacy">Privacy</a>
            </nav>
          </div>
        </header>

        <div className="tms-body">
          <p className="tms-eyebrow">Terms of Service</p>
          <h1 className="tms-h1">What you agree to<br />when you use WALLS.</h1>
          <p className="tms-updated">Last updated: January 2025</p>

          {SECTIONS.map(({ num, title, body, list, note }) => (
            <div key={num} className="tms-section">
              <p className="tms-sec-num">{num}</p>
              <p className="tms-sec-title">{title}</p>
              <p className="tms-sec-body">{body}</p>
              {list && (
                <ul className="tms-list">
                  {list.map(item => <li key={item}>{item}</li>)}
                </ul>
              )}
              {note && <div className="tms-note">{note}</div>}
            </div>
          ))}
        </div>

        <footer>
          <div className="tms-footer">
            <span className="tms-footer-copy">© {new Date().getFullYear()} WALLS</span>
            <div className="tms-footer-links">
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
