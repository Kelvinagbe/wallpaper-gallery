import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      // ✅ Animations moved here from inline <style jsx> blocks in components
      animation: {
        'shimmer':     'shimmer 1.5s infinite',
        'slide-up':    'slideUp 0.3s ease-out',
        'slide-down':  'slideDown 0.3s ease-out',
        'scale-in':    'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'float-heart': 'floatHeart 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
        slideDown: {
          from: { transform: 'translateY(0)' },
          to:   { transform: 'translateY(100%)' },
        },
        scaleIn: {
          '0%':   { transform: 'scale(0)' },
          '50%':  { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },

  // ✅ Safelist for dynamic classes built from template strings in WallpaperDetail:
  //    stats array uses `text-${color}-400` and `fill-${color}-400`
  //    Tailwind's purge never sees these as literal strings so it strips them.
  //    Safelisting forces them into the production CSS bundle.
  safelist: [
    'text-rose-400',
    'fill-rose-400',
    'text-emerald-400',
    'fill-emerald-400',
    'bg-rose-500/20',
    'border-rose-500/50',
    'hover:bg-rose-500/30',
    'bg-emerald-500/20',
    'border-emerald-500/50',
    'bg-blue-500',
    'hover:bg-blue-600',
  ],

  plugins: [],
};

export default config;
