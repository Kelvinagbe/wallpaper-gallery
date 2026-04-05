import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

// ── Types ─────────────────────────────────────────────────────────────────────
interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ username: string }>; // Next.js 15: params is a Promise
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const APP_NAME    = 'Walls';
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://walls.ovrica.name.ng';
const APP_TAGLINE = 'Discover & share beautiful wallpapers';
const DEFAULT_OG  = `${APP_URL}/og-default.png`;

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ── Dynamic metadata ──────────────────────────────────────────────────────────
export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { username } = await params; // Next.js 15: must await params

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, username, bio, avatar_url, verified')
    .eq('username', username)
    .single();

  const { count: postCount } = profile
    ? await supabase
        .from('wallpapers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
    : { count: 0 };

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
    title:       `${displayName} (${handle}) · ${APP_NAME}`,
    description: truncate(description, 160),
    keywords:    ['wallpapers', 'wallpaper app', displayName, handle, APP_NAME],
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type:        'profile',
      url:         canonicalUrl,
      title:       `${displayName} (${handle}) · ${APP_NAME}`,
      description: truncate(description, 200),
      siteName:    APP_NAME,
      images: [{ url: ogImage, width: 400, height: 400, alt: `${displayName}'s profile picture` }],
      // @ts-ignore — Next.js Metadata types don't expose profile fields yet
      profile: { username: profile.username ?? username },
    },
    twitter: {
      card:        'summary',
      title:       `${displayName} (${handle}) · ${APP_NAME}`,
      description: truncate(description, 200),
      images:      [ogImage],
    },
    robots: {
      index:     true,
      follow:    true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
  };
}

// ── Layout component ──────────────────────────────────────────────────────────
export default function UsernameLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
