import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

const APP_NAME = 'Wallpapers';

function getBaseUrl(): string {
  const headersList = headers();

  const host =
    headersList.get('x-forwarded-host') ??
    headersList.get('host') ??
    'localhost:3000';

  const protocol =
    headersList.get('x-forwarded-proto') ??
    (host.startsWith('localhost') ? 'http' : 'https');

  return `${protocol}://${host}`;
}

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const supabase = await createClient();

  const { data: wp } = await supabase
    .from('wallpapers')
    .select('title, description, url, uploaded_by, likes, downloads, views')
    .eq('id', params.id)
    .single();

  const baseUrl    = getBaseUrl();
  const pageUrl    = `${baseUrl}/details/${params.id}`;
  const ogImageUrl = `${baseUrl}/api/og?id=${params.id}`;

  if (!wp) return { title: APP_NAME };

  const title = `${wp.title} — ${APP_NAME}`;
  const desc  = wp.description || `Wallpaper by ${wp.uploaded_by} · ${wp.likes ?? 0} likes`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: pageUrl,
      siteName: APP_NAME,
      type: 'website',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: wp.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [ogImageUrl],
    },
    alternates: { canonical: pageUrl },
  };
}

export default function DetailsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}