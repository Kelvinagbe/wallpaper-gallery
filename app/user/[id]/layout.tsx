import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}k`
  : String(n);

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://walls.app';
const APP_NAME = 'WALLS';

type CountsShape = { followers: number; following: number; posts: number };

async function getProfileMeta(userId: string) {
  const supabase = await createClient();

  // Fetch profile — uses anon key, so RLS must allow public SELECT on profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, username, bio, avatar, verified')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('[OG layout] profile fetch error:', profileError.message, '| userId:', userId);
  }

  // Fetch counts — adjust the RPC name + param to match your Supabase function exactly
  const { data: rawCounts, error: countsError } = await supabase
    .rpc('get_user_counts', { target_user_id: userId })
    .single();

  if (countsError) {
    console.error('[OG layout] counts RPC error:', countsError.message);
  }

  const counts = rawCounts as CountsShape | null;
  return { profile, counts };
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { id: userId } = params;
  const { profile, counts } = await getProfileMeta(userId);

  if (!profile) {
    // Check your server logs — profileError above will tell you why
    return {
      title: `${APP_NAME} · Wallpapers`,
      description: `Discover wallpapers on ${APP_NAME}.`,
    };
  }

  const { name, username, bio, verified } = profile;

  const followers = counts?.followers ?? 0;
  const following = counts?.following ?? 0;
  const posts     = counts?.posts     ?? 0;

  const title = username
    ? `${name} (@${username}) · ${APP_NAME}`
    : `${name} · ${APP_NAME}`;

  const parts: string[] = [];
  if (bio) parts.push(bio);
  parts.push(`${fmt(followers)} followers`);
  parts.push(`${fmt(following)} following`);
  parts.push(`${fmt(posts)} posts`);
  const description = parts.join(' · ');

  const profileUrl = username
    ? `${APP_URL}/${username}`
    : `${APP_URL}/user/${profile.id}`;

  const ogImageUrl = `${APP_URL}/api/og/user/${profile.id}`;

  return {
    title,
    description,
    openGraph: {
      type:        'profile',
      url:         profileUrl,
      siteName:    APP_NAME,
      title,
      description,
      images: [
        {
          url:    ogImageUrl,
          width:  1200,
          height: 630,
          alt:    `${name}'s profile on ${APP_NAME} — ${fmt(followers)} followers, ${fmt(posts)} posts`,
        },
      ],
    },
    twitter: {
      card:        'summary_large_image',
      site:        `@${APP_NAME.toLowerCase()}`,
      creator:     username ? `@${username}` : undefined,
      title,
      description,
      images:      [ogImageUrl],
    },
    alternates: {
      canonical: profileUrl,
    },
    other: {
      'og:profile:username': username ?? name,
      ...(verified && { 'profile:verified': 'true' }),
      'profile:followers':   String(followers),
      'profile:following':   String(following),
      'profile:posts':       String(posts),
      'robots':              'index, follow',
    },
  };
}

export default function UserProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
