import './globals.css';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { AuthProvider } from '@/app/components/AuthProvider';
import { UploadModalProvider } from '@/app/components/UploadModalProvider';
import { TopLoader } from '@/app/components/TopLoader';
import { createClient } from '@/lib/supabase/server';

const inter = Inter({ subsets: ['latin'] });

const BASE_URL = 'https://wallpaper-gallery-sooty.vercel.app';

export const metadata: Metadata = {
  title: 'Walls – Transform Your Spaces',
  description: 'Discover and download stunning wallpapers to transform your spaces.',
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: 'Walls – Transform Your Spaces',
    description: 'Discover and download stunning wallpapers to transform your spaces.',
    url: BASE_URL,
    siteName: 'Walls',
    images: [
      {
        url: '/banner.png',
        width: 1200,
        height: 630,
        alt: 'Walls – Transform Your Spaces',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Walls – Transform Your Spaces',
    description: 'Discover and download stunning wallpapers to transform your spaces.',
    images: ['/banner.png'],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <html lang="en">
      <head>
        <Script src="/ads.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className}>
        <Suspense fallback={null}>
          <TopLoader />
        </Suspense>
        <AuthProvider initialSession={session}>
          <UploadModalProvider>
            {children}
          </UploadModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
