// app/terms/page.tsx
'use client';

import { LegalShell } from '@/lib/legal-shared';

const SECTIONS = [
  {
    num: '01', title: 'Acceptance of Terms',
    body: 'By accessing or using WALLS ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. We may update these Terms at any time — continued use after changes are posted constitutes acceptance.',
  },
  {
    num: '02', title: 'Eligibility',
    body: 'You must be at least 13 years old to use WALLS. By using the Service you represent that you meet this requirement. If you are under 18, you confirm you have parental consent.',
  },
  {
    num: '03', title: 'Permitted Use',
    body: 'WALLS is provided for personal, non-commercial browsing and downloading. You agree not to:',
    list: [
      'Use the Service for any unlawful purpose or in violation of applicable laws',
      'Upload, post, or share content you do not own or have rights to distribute',
      'Scrape, crawl, or bulk-download content through automated means',
      'Attempt to circumvent security controls, rate limits, or access restrictions',
      'Impersonate another user, person, or entity',
      'Use the Service to distribute spam, malware, or harmful content',
    ],
  },
  {
    num: '04', title: 'User Accounts',
    body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately at support@walls.app if you suspect unauthorised access. We reserve the right to suspend or terminate accounts that violate these Terms.',
  },
  {
    num: '05', title: 'Content You Upload',
    body: 'You retain ownership of the content you upload. By uploading to WALLS, you grant us a non-exclusive, worldwide, royalty-free licence to store, display, distribute, and promote your content within the Service.',
    list: [
      'You must own or have the necessary rights to upload the content',
      'Content must not infringe third-party intellectual property rights',
      'Content must not contain nudity, violence, hate speech, or illegal material',
      'We may remove content that violates these Terms without notice',
    ],
    callout: 'You are solely responsible for the content you upload. WALLS is not liable for user-generated content.',
  },
  {
    num: '06', title: 'Downloads & Personal Use',
    body: 'Wallpapers on WALLS are available for personal, non-commercial use unless the creator states otherwise. You may not:',
    list: [
      'Redistribute, resell, or sublicense wallpapers as your own work',
      'Use wallpapers in commercial products, advertising, or for-profit contexts without explicit creator permission',
      'Remove watermarks, credits, or attribution metadata from downloaded files',
    ],
    callout: 'For commercial licensing, contact the creator directly via their WALLS profile.',
  },
  {
    num: '07', title: 'Intellectual Property',
    body: 'The WALLS platform — including its design, code, branding, and non-user-generated content — is owned by WALLS and protected by applicable intellectual property laws. You may not copy, modify, or redistribute any part of the platform without written permission.',
  },
  {
    num: '08', title: 'Disclaimers',
    body: 'WALLS is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee uninterrupted access, error-free operation, or that the Service will meet your requirements. We are not responsible for any loss of data, content, or revenue arising from use of the Service.',
  },
  {
    num: '09', title: 'Limitation of Liability',
    body: 'To the maximum extent permitted by law, WALLS and its team shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, even if we have been advised of the possibility of such damages. Our total liability to you for any claim shall not exceed the amount you paid us in the 12 months preceding the claim, or $50 — whichever is greater.',
  },
  {
    num: '10', title: 'Termination',
    body: 'We may suspend or terminate your access to WALLS at any time, with or without notice, for conduct that we determine violates these Terms or is harmful to other users, us, or third parties. You may delete your account at any time from your account settings.',
  },
  {
    num: '11', title: 'Governing Law',
    body: 'These Terms are governed by and construed in accordance with applicable law. Any disputes arising from these Terms or use of the Service shall be resolved through good-faith negotiation, or if necessary, binding arbitration.',
  },
  {
    num: '12', title: 'Contact',
    body: 'Questions about these Terms? Email legal@walls.app.',
  },
];

export default function TermsPage() {
  return (
    <LegalShell current="/terms">

      <p className="lg-eyebrow">Terms of Service</p>
      <h1 className="lg-h1">What you agree to<br />when you use WALLS.</h1>
      <p className="lg-updated">Last updated: January 2025</p>

      {SECTIONS.map(({ num, title, body, list, callout }) => (
        <div key={num} className="lg-section">
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
