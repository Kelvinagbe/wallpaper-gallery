// app/privacy/page.tsx
'use client';

import Link from 'next/link';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .prv-root {
    min-height: 100vh;
    background: #0a0a0a;
    color: #fff;
    font-family: 'Outfit', sans-serif;
  }

  .prv-header {
    position: sticky; top: 0; z-index: 50;
    background: rgba(10,10,10,0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .prv-header-inner {
    max-width: 700px; margin: 0 auto;
    padding: 0 24px; height: 52px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .prv-logo {
    display: flex; align-items: center; gap: 8px;
    text-decoration: none;
  }
  .prv-logo-text {
    font-family: 'Outfit', sans-serif;
    font-weight: 800; font-size: 15px;
    letter-spacing: -0.3px; color: #fff;
  }
  .prv-nav {
    display: flex; align-items: center; gap: 2px;
  }
  .prv-nav a {
    padding: 5px 11px; border-radius: 7px;
    font-size: 12px; font-weight: 500;
    color: rgba(255,255,255,0.32);
    text-decoration: none;
    transition: color .15s, background .15s;
    white-space: nowrap;
  }
  .prv-nav a:hover { color: rgba(255,255,255,0.65); background: rgba(255,255,255,0.05); }
  .prv-nav a.cur  { color: #fff; }

  .prv-body {
    max-width: 700px; margin: 0 auto;
    padding: 72px 24px 120px;
  }

  .prv-eyebrow {
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: rgba(255,255,255,0.22); margin-bottom: 18px;
  }
  .prv-h1 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(30px, 5vw, 46px);
    line-height: 1.1; letter-spacing: -0.02em;
    color: #fff; margin-bottom: 10px;
  }
  .prv-updated {
    font-size: 12px; color: rgba(255,255,255,0.2);
    margin-bottom: 36px;
  }
  .prv-intro {
    font-size: 15px; line-height: 1.8;
    color: rgba(255,255,255,0.42); max-width: 540px;
    margin-bottom: 52px; padding-bottom: 52px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  /* TOC */
  .prv-toc {
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px; overflow: hidden;
    margin-bottom: 56px;
  }
  .prv-toc-row {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 18px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    text-decoration: none;
    transition: background .12s;
    background: rgba(255,255,255,0.015);
  }
  .prv-toc-row:last-child { border-bottom: none; }
  .prv-toc-row:hover { background: rgba(255,255,255,0.045); }
  .prv-toc-num   { font-size: 11px; color: rgba(255,255,255,0.18); width: 22px; flex-shrink: 0; }
  .prv-toc-label { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.42); flex: 1; }
  .prv-toc-arrow { font-size: 10px; color: rgba(255,255,255,0.14); }

  /* Sections */
  .prv-section {
    padding-bottom: 44px;
    margin-bottom: 44px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .prv-section:last-of-type { border-bottom: none; }

  .prv-sec-num {
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: rgba(255,255,255,0.18); margin-bottom: 6px;
  }
  .prv-sec-title {
    font-size: 15px; font-weight: 700;
    color: rgba(255,255,255,0.78);
    letter-spacing: -0.01em; margin-bottom: 12px;
  }
  .prv-sec-body {
    font-size: 14px; line-height: 1.85;
    color: rgba(255,255,255,0.38);
    margin-bottom: 10px;
  }
  .prv-sec-body:last-child { margin-bottom: 0; }

  .prv-list {
    margin-top: 12px;
    display: flex; flex-direction: column; gap: 9px;
    list-style: none; padding: 0;
  }
  .prv-list li {
    display: flex; gap: 12px;
    font-size: 14px; line-height: 1.7;
    color: rgba(255,255,255,0.36);
  }
  .prv-list li::before {
    content: '—'; color: rgba(255,255,255,0.14);
    flex-shrink: 0; margin-top: 1px;
  }

  .prv-callout {
    margin-top: 18px; padding: 18px 20px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 11px;
  }
  .prv-callout-title {
    font-size: 13px; font-weight: 600;
    color: rgba(255,255,255,0.6); margin-bottom: 4px;
  }
  .prv-callout-body {
    font-size: 13px; line-height: 1.7;
    color: rgba(255,255,255,0.3);
  }

  .prv-footer {
    border-top: 1px solid rgba(255,255,255,0.05);
    max-width: 700px; margin: 0 auto; padding: 28px 24px;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 10px;
  }
  .prv-footer-copy { font-size: 12px; color: rgba(255,255,255,0.18); }
  .prv-footer-links { display: flex; gap: 18px; }
  .prv-footer-links a {
    font-size: 12px; color: rgba(255,255,255,0.22);
    text-decoration: none; transition: color .15s;
  }
  .prv-footer-links a:hover { color: rgba(255,255,255,0.55); }
`;

const TOC = [
  'What we collect',
  'How we use it',
  'Data sharing',
  'Cookies',
  'Your rights',
  'Data retention',
  'Security',
  'Contact',
];

const SECTIONS = [
  {
    num: '01', title: 'What We Collect',
    body: 'We collect the minimum data needed to run the service:',
    list: [
      'Account info: email address, display name, and profile photo if provided',
      'Uploaded content: wallpapers, titles, and descriptions you add',
      'Usage data: pages visited, wallpapers liked or saved, download history',
      'Technical data: IP address, browser type, device type, and crash logs',
    ],
    callout: { title: 'We do not sell your data.', body: 'Your personal information is never sold to advertisers or third-party brokers.' },
  },
  {
    num: '02', title: 'How We Use It',
    body: 'Your data is used to:',
    list: [
      'Provide and improve the WALLS service',
      'Personalise your feed and recommendations',
      'Send account-related notifications (you can opt out of marketing emails)',
      'Detect and prevent abuse, fraud, and policy violations',
      'Analyse aggregate usage patterns to improve the product',
    ],
  },
  {
    num: '03', title: 'Data Sharing',
    body: 'We share data only in these limited circumstances:',
    list: [
      'With service providers (hosting, analytics, email) bound by data processing agreements',
      'When required by law or valid legal process',
      'In connection with a merger or acquisition, with prior notice to users',
    ],
  },
  {
    num: '04', title: 'Cookies',
    body: 'We use essential cookies to keep you signed in and remember preferences. We use analytics cookies (opt-out available in settings) to understand product usage. We do not use advertising cookies.',
  },
  {
    num: '05', title: 'Your Rights',
    body: 'Depending on your location, you may have the right to:',
    list: [
      'Access a copy of the personal data we hold about you',
      'Request correction of inaccurate data',
      'Request deletion of your account and associated data',
      'Export your uploaded content',
      'Opt out of non-essential data processing',
    ],
    callout: { title: 'Exercising your rights', body: 'Email privacy@walls.app with your request. We respond within 30 days.' },
  },
  {
    num: '06', title: 'Data Retention',
    body: 'We keep your data for as long as your account is active. When you delete your account, we remove your personal data within 30 days, except where retention is required for legal or financial compliance.',
  },
  {
    num: '07', title: 'Security',
    body: 'We use industry-standard measures to protect your data: encrypted connections (HTTPS), encrypted storage for sensitive fields, and regular security reviews. No system is perfectly secure — if you believe your account has been compromised, contact us immediately.',
  },
  {
    num: '08', title: 'Contact',
    body: 'Privacy questions or requests: privacy@walls.app. General enquiries: hello@walls.app.',
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

export default function PrivacyPage() {
  return (
    <>
      <style>{CSS}</style>
      <div className="prv-root">

        <header className="prv-header">
          <div className="prv-header-inner">
            <Link href="/" className="prv-logo">
              <Logo />
              <span className="prv-logo-text">WALLS</span>
            </Link>
            <nav className="prv-nav">
              <a href="/about">About</a>
              <a href="/terms">Terms</a>
              <a href="/privacy" className="cur">Privacy</a>
            </nav>
          </div>
        </header>

        <div className="prv-body">
          <p className="prv-eyebrow">Privacy Policy</p>
          <h1 className="prv-h1">Your data.<br />Handled with care.</h1>
          <p className="prv-updated">Last updated: January 2025</p>

          <p className="prv-intro">
            We built WALLS to be the kind of product we'd trust with our own data.
            This policy explains what we collect, why, and what you can do about it.
            No legal jargon — just plain language.
          </p>

          {/* Table of contents */}
          <div className="prv-toc">
            {TOC.map((label, i) => (
              <a key={label} href={`#prv-${i + 1}`} className="prv-toc-row">
                <span className="prv-toc-num">0{i + 1}</span>
                <span className="prv-toc-label">{label}</span>
                <span className="prv-toc-arrow">↓</span>
              </a>
            ))}
          </div>

          {SECTIONS.map(({ num, title, body, list, callout }, i) => (
            <div key={num} id={`prv-${i + 1}`} className="prv-section">
              <p className="prv-sec-num">{num}</p>
              <p className="prv-sec-title">{title}</p>
              <p className="prv-sec-body">{body}</p>
              {list && (
                <ul className="prv-list">
                  {list.map(item => <li key={item}>{item}</li>)}
                </ul>
              )}
              {callout && (
                <div className="prv-callout">
                  <div className="prv-callout-title">{callout.title}</div>
                  <div className="prv-callout-body">{callout.body}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        <footer>
          <div className="prv-footer">
            <span className="prv-footer-copy">© {new Date().getFullYear()} WALLS</span>
            <div className="prv-footer-links">
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
