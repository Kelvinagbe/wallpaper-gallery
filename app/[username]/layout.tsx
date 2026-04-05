// app/[username]/layout.tsx
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

// ── Types ─────────────────────────────────────────────────────────────────────
interface LayoutProps {
  children: React.ReactNode;
  params: { username: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const APP_NAME    = 'Walls';                          // ← your app name
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yourapp.com';
const APP_TAGLINE = 'Discover & share beautiful wallpapers';
const DEFAULT_OG  = `${APP_URL}/og-default.png`;     // fallback OG image

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ── Dynamic metadata ──────────────────────────────────────────────────────────
export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { username } = params;

  // Fetch profile directly from Supabase (server-side, no auth needed for public data)
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, username, bio, avatar_url, verified')
    .eq('username', username)
    .single();

  // Fetch post count for the description
  const { count: postCount } = profile
    ? await supabase
        .from('wallpapers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
    : { count: 0 };

  // ── Fallback (profile not found) ──────────────────────────────────────────
  if (!profile) {
    return {
      title:       `@${username} · ${APP_NAME}`,
      description: APP_TAGLINE,
      robots:      { index: false },
    };
  }

  const displayName = profile.full_name || profile.username || username;
  const handle      = profile.username ? `@${profile.username}` : `@${username}`;
  const bio         = profile.bio ? truncate(profile.bio, 160) : null;
  const posts       = postCount ?? 0;

  const description = bio
    ? `${bio} · ${posts} wallpapers on ${APP_NAME}`
    : `${handle} has shared ${posts} wallpaper${posts !== 1 ? 's' : ''} on ${APP_NAME}. ${APP_TAGLINE}.`;

  const canonicalUrl = `${APP_URL}/${username}`;
  const ogImage      = profile.avatar_url ?? DEFAULT_OG;

  return {
    // ── Basic ──────────────────────────────────────────────────────────────
    title:       `${displayName} (${handle}) · ${APP_NAME}`,
    description: truncate(description, 160),
    keywords:    ['wallpapers', 'wallpaper app', displayName, handle, APP_NAME],

    // ── Canonical ─────────────────────────────────────────────────────────
    alternates: {
      canonical: canonicalUrl,
    },

    // ── Open Graph ────────────────────────────────────────────────────────
    openGraph: {
      type:        'profile',
      url:         canonicalUrl,
      title:       `${displayName} (${handle}) · ${APP_NAME}`,
      description: truncate(description, 200),
      siteName:    APP_NAME,
      images: [
        {
          url:    ogImage,
          width:  400,
          height: 400,
          alt:    `${displayName}'s profile picture`,
        },
      ],
      // OG profile namespace fields
      // @ts-ignore — Next.js Metadata types don't expose profile fields yet
      profile: {
        username: profile.username ?? username,
      },
    },

    // ── Twitter / X card ──────────────────────────────────────────────────
    twitter: {
      card:        'summary',
      title:       `${displayName} (${handle}) · ${APP_NAME}`,
      description: truncate(description, 200),
      images:      [ogImage],
    },

    // ── Robots ────────────────────────────────────────────────────────────
    robots: {
      index:          true,
      follow:         true,
      googleBot: {
        index:             true,
        follow:            true,
        'max-image-preview': 'large',
      },
    },
  };
}

// ── Root layout metadata (used by the global layout, not here) ────────────────
// Put this in your app/layout.tsx instead — included here for reference:
//
// export const metadata: Metadata = {
//   metadataBase: new URL(APP_URL),
//   applicationName: APP_NAME,
//   title: { default: `${APP_NAME} — ${APP_TAGLINE}`, template: `%s · ${APP_NAME}` },
//   description: APP_TAGLINE,
//   manifest: '/site.webmanifest',
//   icons: {
//     icon: [
//       { url: '/favicon.ico',               sizes: 'any' },
//       { url: '/favicon-16x16.png',         type: 'image/png', sizes: '16x16'  },
//       { url: '/favicon-32x32.png',         type: 'image/png', sizes: '32x32'  },
//       { url: '/icon-192.png',              type: 'image/png', sizes: '192x192' },
//       { url: '/icon-512.png',              type: 'image/png', sizes: '512x512' },
//     ],
//     apple:   [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
//     shortcut: '/favicon.ico',
//   },
//   themeColor: [
//     { media: '(prefers-color-scheme: light)', color: '#ffffff' },
//     { media: '(prefers-color-scheme: dark)',  color: '#050505' },
//   ],
// };

// ── Layout component ──────────────────────────────────────────────────────────
export default function UsernameLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
