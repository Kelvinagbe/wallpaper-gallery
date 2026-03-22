// app/about/page.tsx
'use client';

import { LegalShell } from '@/lib/legal-shared';

const STATS = [
  { num: '50K+',  lbl: 'Wallpapers' },
  { num: '12K+',  lbl: 'Creators'   },
  { num: '200K+', lbl: 'Downloads'  },
  { num: '4K',    lbl: 'Resolution' },
];

const VALUES = [
  { title: 'Quality over quantity',  desc: 'Every wallpaper is reviewed for resolution, composition, and originality before going live.' },
  { title: 'Creators first',         desc: 'We surface who made the work. Profiles, attribution, and recognition are built into the core.' },
  { title: 'No noise',               desc: 'No ads cluttering the feed. No dark patterns. Just wallpapers.' },
  { title: 'Open by default',        desc: 'Personal use is always free. We only charge for features that genuinely warrant it.' },
];

export default function AboutPage() {
  return (
    <LegalShell current="/about">

      <p className="lg-eyebrow">About WALLS</p>
      <h1 className="lg-h1">The wallpaper gallery<br /><em>built for the obsessive.</em></h1>
      <p className="lg-lead">
        WALLS is a curated collection of high-resolution wallpapers made by designers,
        photographers, and artists around the world. We built the thing we wanted to use
        but couldn't find.
      </p>

      <div className="lg-stats">
        {STATS.map(({ num, lbl }) => (
          <div key={lbl} className="lg-stat">
            <div className="lg-stat-num">{num}</div>
            <div className="lg-stat-lbl">{lbl}</div>
          </div>
        ))}
      </div>

      <div className="lg-rule" />

      <p className="lg-sec-num" style={{ marginBottom: 14 }}>The story</p>
      <p className="lg-sec-body">
        Most wallpaper sites are a nightmare — low-res previews, aggressive download gates,
        and feeds algorithmed into mediocrity. <strong>WALLS started as a personal fix.</strong>{' '}
        A clean place to find wallpapers worth putting on your screen, from people who made
        them intentionally.
      </p>
      <p className="lg-sec-body" style={{ marginTop: 12 }}>
        We opened it up because the problem wasn't personal.{' '}
        <strong>Great visual work deserves a better home.</strong> Creators deserve attribution
        and discovery. Users deserve a distraction-free experience.
      </p>

      <div className="lg-values" style={{ marginTop: 44 }}>
        {VALUES.map(({ title, desc }, i) => (
          <div key={title} className="lg-value">
            <span className="lg-value-n">0{i + 1}</span>
            <div>
              <div className="lg-value-title">{title}</div>
              <div className="lg-value-desc">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="lg-rule" />

      <p className="lg-sec-num" style={{ marginBottom: 14 }}>Get in touch</p>
      <p className="lg-sec-body">
        Questions, partnerships, or just want to say hi?{' '}
        <strong>
          <a href="mailto:hello@walls.app">hello@walls.app</a>
        </strong>
      </p>

    </LegalShell>
  );
}
