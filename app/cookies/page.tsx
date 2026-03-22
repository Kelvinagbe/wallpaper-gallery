// app/cookies/page.tsx
'use client';

import { LegalShell } from '@/lib/legal-shared';

const COOKIE_TYPES = [
  {
    title: 'Essential Cookies',
    badge: 'required',
    desc: 'Required for the Service to function. They keep you logged in, protect against cross-site request forgery (CSRF), and remember your session. These cannot be disabled without breaking core functionality.',
    examples: ['auth-token', 'csrf-token', 'session-id'],
  },
  {
    title: 'Preference Cookies',
    badge: 'required',
    desc: 'Remember choices you make — such as your filter preferences or display settings — so you don\'t have to re-set them each visit.',
    examples: ['ui-theme', 'filter-pref'],
  },
  {
    title: 'Analytics Cookies',
    badge: 'analytics',
    desc: 'Help us understand how people use WALLS — which pages are visited, where users drop off, and how features are adopted. Data is aggregate and anonymised. You can opt out in account settings.',
    examples: ['_ga', '_gid', 'posthog-session'],
  },
];

const SECTIONS = [
  {
    num: '01', title: 'What Are Cookies?',
    body: 'Cookies are small text files stored on your device when you visit a website. They allow the site to remember information about your visit — such as whether you\'re logged in — and help us understand how the site is being used.',
  },
  {
    num: '02', title: 'Cookies We Use',
    body: 'We use three categories of cookies:',
    cookieGrid: true,
  },
  {
    num: '03', title: 'Third-Party Cookies',
    body: 'We use a small number of third-party services that may set their own cookies:',
    list: [
      'Supabase — authentication and database sessions',
      'PostHog or similar — anonymised product analytics (optional)',
      'Cloudflare — security, DDoS protection, and performance caching',
    ],
    callout: 'We do not use advertising networks, social media trackers, or retargeting pixels.',
  },
  {
    num: '04', title: 'How to Control Cookies',
    body: 'You have several options for managing cookies:',
    list: [
      'Account settings — opt out of analytics cookies from your profile settings',
      'Browser settings — most browsers let you block or delete cookies. Note: blocking essential cookies will prevent you from staying logged in.',
      'Do Not Track — we honour DNT signals and disable analytics cookies when detected.',
    ],
    callout: 'Disabling essential cookies will break login and core functionality. We recommend leaving these enabled.',
  },
  {
    num: '05', title: 'Cookie Duration',
    body: 'Cookie lifetimes vary:',
    list: [
      'Session cookies — deleted when you close your browser',
      'Auth cookies — persist for up to 30 days (or until you sign out)',
      'Preference cookies — persist for up to 1 year',
      'Analytics cookies — typically 13 months (Google Analytics default)',
    ],
  },
  {
    num: '06', title: 'Updates',
    body: 'We may update this Cookie Policy as we add or remove services. Check the "last updated" date at the top of this page for the most recent revision.',
  },
  {
    num: '07', title: 'Contact',
    body: 'Questions about our use of cookies? Email privacy@walls.app.',
  },
];

export default function CookiesPage() {
  return (
    <LegalShell current="/cookies">

      <p className="lg-eyebrow">Cookie Policy</p>
      <h1 className="lg-h1">Cookies on WALLS.</h1>
      <p className="lg-updated">Last updated: January 2025</p>

      <p className="lg-lead">
        We use cookies to keep you signed in, remember your preferences, and understand how
        the product is being used. This page explains exactly what we use and why — and how
        to opt out if you want to.
      </p>

      {SECTIONS.map(({ num, title, body, list, callout, cookieGrid }) => (
        <div key={num} className="lg-section">
          <p className="lg-sec-num">{num}</p>
          <p className="lg-sec-title">{title}</p>
          <p className="lg-sec-body">{body}</p>

          {cookieGrid && (
            <div className="lg-cookie-grid">
              {COOKIE_TYPES.map(({ title: ct, badge, desc, examples }) => (
                <div key={ct} className="lg-cookie-card">
                  <div className="lg-cookie-card-head">
                    <span className="lg-cookie-card-title">{ct}</span>
                    <span className={`lg-cookie-badge ${badge}`}>
                      {badge === 'required' ? 'Always On' : badge === 'analytics' ? 'Optional' : 'Always On'}
                    </span>
                  </div>
                  <p className="lg-cookie-card-desc">{desc}</p>
                  <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(0,0,0,0.3)', fontFamily: 'monospace' }}>
                    {examples.join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          )}

          {list && (
            <ul className="lg-list">
              {list.map(item => <li key={item}>{item}</li>)}
            </ul>
          )}
          {callout && <div className="lg-callout">{callout}</div>}
        </div>
      ))}

    </LegalShell>
  );
}
