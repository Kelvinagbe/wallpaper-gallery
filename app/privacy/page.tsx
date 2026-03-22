// app/privacy/page.tsx
'use client';

import { LegalShell } from '@/lib/legal-shared';

const TOC = [
  'What we collect',
  'How we use it',
  'Data sharing',
  'Cookies & tracking',
  'Your rights',
  'Data retention',
  'Security',
  'Children',
  'Changes',
  'Contact',
];

const SECTIONS = [
  {
    num: '01', title: 'What We Collect',
    body: 'We collect the minimum data needed to provide the Service:',
    list: [
      'Account information — email address, display name, and profile photo (if provided)',
      'Uploaded content — wallpapers, titles, descriptions, and tags you add',
      'Activity data — wallpapers you like, save, download, or upload',
      'Technical data — IP address, browser type, device type, operating system, and crash logs',
      'Communications — emails you send us for support or enquiries',
    ],
    callout: <><strong>We do not sell your data.</strong> Your personal information is never sold to advertisers, data brokers, or any third party.</>,
  },
  {
    num: '02', title: 'How We Use It',
    body: 'We use your data solely to operate and improve WALLS:',
    list: [
      'Provide, maintain, and improve the Service',
      'Authenticate your account and keep it secure',
      'Personalise your feed and recommendations',
      'Send transactional emails (password resets, account notices)',
      'Send optional product updates — you can unsubscribe at any time',
      'Detect, investigate, and prevent abuse, fraud, and policy violations',
      'Understand how the product is used through aggregate analytics',
    ],
  },
  {
    num: '03', title: 'Data Sharing',
    body: 'We do not share your personal data with third parties except in these specific circumstances:',
    list: [
      'Service providers — hosting (Supabase), email delivery, and error tracking, each bound by data processing agreements',
      'Legal compliance — when required by law, court order, or valid government request',
      'Safety — to protect the rights, property, or safety of WALLS, our users, or the public',
      'Business transfer — in connection with a merger or acquisition, with at least 30 days\' prior notice to users',
    ],
  },
  {
    num: '04', title: 'Cookies & Tracking',
    body: 'We use cookies and similar technologies. See our Cookie Policy at walls.app/cookies for full details. In summary:',
    list: [
      'Essential cookies — required for login sessions and security. Cannot be disabled.',
      'Analytics cookies — help us understand product usage. Optional, opt-out available in settings.',
      'We do not use advertising or tracking cookies.',
    ],
  },
  {
    num: '05', title: 'Your Rights',
    body: 'Depending on where you live, you may have the following rights regarding your personal data:',
    list: [
      'Access — request a copy of the data we hold about you',
      'Correction — request we fix inaccurate or incomplete data',
      'Deletion — request we delete your account and personal data',
      'Portability — export your uploaded content and account data',
      'Restriction — ask us to limit how we process your data',
      'Objection — object to processing based on legitimate interests',
    ],
    callout: <>To exercise any of these rights, email <strong>privacy@walls.app</strong>. We respond within 30 days. We may need to verify your identity before acting on a request.</>,
  },
  {
    num: '06', title: 'Data Retention',
    body: 'We keep your personal data for as long as your account is active. When you delete your account:',
    list: [
      'Your profile and personal data are deleted within 30 days',
      'Your uploaded wallpapers are removed from the public feed immediately',
      'Aggregate anonymised analytics data may be retained indefinitely',
      'We may retain certain data longer where required by law (e.g. financial records)',
    ],
  },
  {
    num: '07', title: 'Security',
    body: 'We use industry-standard measures to protect your data including encrypted connections (HTTPS/TLS), encrypted storage for sensitive fields, and access controls limiting who can access user data internally. We conduct regular security reviews.',
    callout: 'No system is perfectly secure. If you believe your account has been compromised, contact us immediately at security@walls.app.',
  },
  {
    num: '08', title: 'Children',
    body: 'WALLS is not directed at children under 13. We do not knowingly collect personal data from children under 13. If we learn that we have collected data from a child under 13 without parental consent, we will delete it promptly. If you believe this has occurred, contact us at privacy@walls.app.',
  },
  {
    num: '09', title: 'Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. When we make significant changes, we will notify you by email or via a prominent notice in the app before the changes take effect. The "last updated" date at the top of this page reflects when the policy was last revised.',
  },
  {
    num: '10', title: 'Contact',
    body: 'Privacy questions or data requests: privacy@walls.app. General enquiries: hello@walls.app.',
  },
];

export default function PrivacyPage() {
  return (
    <LegalShell current="/privacy">

      <p className="lg-eyebrow">Privacy Policy</p>
      <h1 className="lg-h1">Your data.<br />Handled with care.</h1>
      <p className="lg-updated">Last updated: January 2025</p>

      <p className="lg-lead">
        We built WALLS to be the kind of product we'd trust with our own data.
        This policy explains what we collect, why we collect it, and what you can
        do about it. Plain language, no jargon.
      </p>

      {/* Table of contents */}
      <div className="lg-toc">
        {TOC.map((label, i) => (
          <a key={label} href={`#prv-${i + 1}`} className="lg-toc-row">
            <span className="lg-toc-num">0{i + 1}</span>
            <span className="lg-toc-label">{label}</span>
            <span className="lg-toc-arrow">↓</span>
          </a>
        ))}
      </div>

      {SECTIONS.map(({ num, title, body, list, callout }, i) => (
        <div key={num} id={`prv-${i + 1}`} className="lg-section">
          <p className="lg-sec-num">{num}</p>
          <p className="lg-sec-title">{title}</p>
          <p className="lg-sec-body">{body}</p>
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
