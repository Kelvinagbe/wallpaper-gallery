import type { Metadata } from 'next';
import { fetchWallpaperById } from '@/lib/stores/wallpaperStore';

// ── Constants ─────────────────────────────────────────────────────────────────
const APP_NAME    = 'Walls';
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://walls.ovrica.nane.ng';
const APP_TAGLINE = 'Discover & share beautiful wallpapers';

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>; // Next.js 15: params is a Promise
}

// ── Dynamic metadata ──────────────────────────────────────────────────────────
export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;
  const wp = await fetchWallpaperById(id);

  if (!wp) {
    return {
      title:       `Wallpaper · ${APP_NAME}`,
      description: APP_TAGLINE,
      robots:      { index: false },
    };
  }

  const title       = wp.title ? `${wp.title} · ${APP_NAME}` : `Wallpaper · ${APP_NAME}`;
  const description = wp.description
    ? truncate(wp.description, 160)
    : `Download "${wp.title}" and more beautiful wallpapers on ${APP_NAME}.`;
  const canonicalUrl = `${APP_URL}/details/${id}`;
  const ogImage      = wp.url;

  return {
    title,
    description,
    keywords: [
      'wallpaper',
      'wallpapers',
      APP_NAME,
      ...(wp.title ? [wp.title] : []),
      ...(wp.tags ?? []),
    ],

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      type:        'article',
      url:         canonicalUrl,
      title,
      description: truncate(description, 200),
      siteName:    APP_NAME,
      images: [
        {
          url:    ogImage,
          alt:    wp.title ?? 'Wallpaper',
          // No fixed width/height — wallpapers vary; let the platform decide
        },
      ],
    },

    twitter: {
      card:        'summary_large_image',
      title,
      description: truncate(description, 200),
      images:      [ogImage],
    },

    robots: {
      index:     true,
      follow:    true,
      googleBot: {
        index:               true,
        follow:              true,
        'max-image-preview': 'large',
      },
    },
  };
}

// ── Layout component ──────────────────────────────────────────────────────────
export default function DetailsLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
