import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { fmt, APP_URL, APP_NAME } from './_lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────
type Counts = { followers: number; following: number; posts: number };

// ── Admin Supabase client (server-only, bypasses RLS) ────────────────────────
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── Data fetcher ──────────────────────────────────────────────────────────────
async function getProfileMeta(userId: string) {
  const sb = adminClient();
  const [{ data: profile }, { data: counts }] = await Promise.all([
    sb.from('profiles')
      .select('id, name, username, bio, avatar, verified')
      .eq('id', userId)
      .single(),
    sb.rpc('get_user_counts', { target_user_id: userId }).single(),
  ]);
  return { profile, counts: counts as Counts | null };
}

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { profile, counts } = await getProfileMeta(params.id);

  if (!profile) {
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

  const description = [
    bio,
    `${fmt(followers)} followers`,
    `${fmt(following)} following`,
    `${fmt(posts)} posts`,
  ]
    .filter(Boolean)
    .join(' · ');

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
      images: [{
        url:    ogImageUrl,
        width:  1200,
        height: 630,
        alt:    `${name}'s profile on ${APP_NAME} — ${fmt(followers)} followers, ${fmt(posts)} posts`,
      }],
    },
    twitter: {
      card:        'summary_large_image',
      site:        `@${APP_NAME.toLowerCase()}`,
      creator:     username ? `@${username}` : undefined,
      title,
      description,
      images:      [ogImageUrl],
    },
    alternates: { canonical: profileUrl },
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

// ── Layout ────────────────────────────────────────────────────────────────────
export default function UserProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}