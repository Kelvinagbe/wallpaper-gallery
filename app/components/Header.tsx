'use client';

import { Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Filter } from '../types';

interface HeaderProps {
  filter: Filter;
  setFilter: (filter: Filter) => void;
  onMenuOpen: () => void;
}

export const Header = ({ filter, setFilter, onMenuOpen }: HeaderProps) => {
  const router = useRouter();

  const filters: { value: Filter; label: string }[] = [
    { value: 'all',      label: 'All'      },
    { value: 'trending', label: 'Trending' },
    { value: 'recent',   label: 'Recent'   },
    { value: 'popular',  label: 'Popular'  },
  ];

  return (
    <>
      {/* Google Font — Syne for logo, clean and bold 2026 style */}
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          // 2026 Glassmorphism header
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 16px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >

          {/* Hamburger — mobile only */}
          <button
            onClick={onMenuOpen}
            className="lg:hidden"
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            aria-label="Open menu"
          >
            <Menu size={20} color="rgba(255,255,255,0.65)" />
          </button>

          {/* Logo — Syne font, bold 2026 style */}
          <span
            onClick={() => router.push('/')}
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: '18px',
              letterSpacing: '-0.5px',
              cursor: 'pointer',
              flexShrink: 0,
              // Subtle gradient on logo text
              background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            WALLS
          </span>

          {/* Filter tabs — scrollable */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              overflowX: 'auto',
              flex: 1,
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            {filters.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '100px',
                  fontSize: '13px',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  // Active = glassmorphism pill
                  background: filter === value
                    ? 'rgba(255, 255, 255, 1)'
                    : 'transparent',
                  color: filter === value
                    ? '#000000'
                    : 'rgba(255, 255, 255, 0.45)',
                  // Active pill gets subtle glow
                  boxShadow: filter === value
                    ? '0 0 20px rgba(255,255,255,0.15)'
                    : 'none',
                }}
                onMouseEnter={e => {
                  if (filter !== value) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  }
                }}
                onMouseLeave={e => {
                  if (filter !== value) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            {/* Upload — ghost button */}
            <button
              onClick={() => router.push('/upload')}
              style={{
                padding: '7px 16px',
                borderRadius: '100px',
                fontSize: '13px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              }}
            >
              Upload
            </button>

            {/* Sign in — solid white button */}
            <button
              onClick={() => router.push('/auth/login')}
              style={{
                padding: '7px 16px',
                borderRadius: '100px',
                fontSize: '13px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                border: 'none',
                background: '#ffffff',
                color: '#000000',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.88)';
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Sign in
            </button>
          </div>

        </div>
      </header>
    </>
  );
};
