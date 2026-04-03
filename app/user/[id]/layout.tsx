import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}k`
  : String(n);

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://walls.app';
const APP_NAME = 'WALLS';

// ── Fetch helpers (server-side, no auth needed for public profiles) ─────────
async function getProfileMeta(userId: string) {
  const supabase = createClient();

  const [{ data: profile }, { data: counts }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, username, bio, avatar, verified')
      .eq('id', userId)
      .single(),

    supabase
      .rpc('get_user_counts', { target_user_id: userId })   // adjust to your RPC name
      .single(),
  ]);

  return { profile, counts };
}

// ── Metadata export (runs on the server, populates <head>) ─────────────────
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { profile, counts } = await getProfileMeta(params.id);

  // Graceful fallback when the profile doesn't exist
  if (!profile) {
    return {
      title: 'Profile not found · WALLS',
      description: 'This profile does not exist.',
    };
  }

  const {
    name,
    username,
    bio,
    avatar,
    verified,
  } = profile;

  const followers = counts?.followers ?? 0;
  const following = counts?.following ?? 0;
  const posts     = counts?.posts     ?? 0;

  // ── Composed strings ──────────────────────────────────────────────────────
  // Title  →  "Aria Nakamura (@arianakamura) · WALLS"  (matches GitHub pattern)
  const title = username
    ? `${name} (@${username}) · ${APP_NAME}`
    : `${name} · ${APP_NAME}`;

  // Description  →  bio + counts, just like GitHub
  // "Building things with pixels. · 14.8k followers · 94 posts"
  const parts: string[] = [];
  if (bio) parts.push(bio);
  parts.push(`${fmt(followers)} followers`);
  parts.push(`${fmt(following)} following`);
  parts.push(`${fmt(posts)} posts`);
  const description = parts.join(' · ');

  // Canonical URL
  const profileUrl = username
    ? `${APP_URL}/${username}`
    : `${APP_URL}/user/${profile.id}`;

  // OG image — served from your dynamic og-image route
  // e.g. /api/og/user/[id] or /og/[username].png
  const ogImageUrl = `${APP_URL}/api/og/user/${profile.id}`;

  // ── Metadata object ───────────────────────────────────────────────────────
  return {
    title,
    description,

    // ── Open Graph (Facebook, LinkedIn, iMessage, Slack …) ──────────────
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
      // profile-specific OG fields
      // https://ogp.me/#type_profile
      ...(username && {
        // Next.js 14 accepts arbitrary OG fields via `other` (see below)
      }),
    },

    // ── Twitter / X card ─────────────────────────────────────────────────
    twitter: {
      card:        'summary_large_image',
      site:        `@${APP_NAME.toLowerCase()}`,
      creator:     username ? `@${username}` : undefined,
      title,
      description,
      images:      [ogImageUrl],
    },

    // ── Canonical & alternates ────────────────────────────────────────────
    alternates: {
      canonical: profileUrl,
    },

    // ── Extra meta tags not covered by Next.js typed fields ──────────────
    // Rendered as <meta name="..." content="..." /> or
    // <meta property="..." content="..." /> depending on the key format.
    other: {
      // profile OG namespace  (https://ogp.me/#type_profile)
      'og:profile:username':   username ?? name,

      // Verified badge signal (non-standard, but useful for rich previews)
      ...(verified && { 'profile:verified': 'true' }),

      // Counts — useful for scrapers / share previews that render custom cards
      'profile:followers': String(followers),
      'profile:following': String(following),
      'profile:posts':     String(posts),

      // Robots
      'robots': 'index, follow',
    },
  };
}

// ── Layout shell ──────────────────────────────────────────────────────────
// This wraps the page.tsx for this route segment.
// The <head> tags are injected automatically by Next.js from generateMetadata.
export default function UserProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
