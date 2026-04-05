import './globals.css';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { AuthProvider } from '@/app/components/AuthProvider';
import { UploadModalProvider } from '@/app/components/UploadModalProvider';
import { TopLoader } from '@/app/components/TopLoader';
import { RouterRefresher } from '@/app/components/RouterRefresher';
import { createClient } from '@/lib/supabase/server';

const inter = Inter({ subsets: ['latin'] });
const BASE_URL = 'https://walls.ovrica.name.ng';  // ← update to your real domain

export const metadata: Metadata = {
  title: 'Walls – Transform Your Spaces',
  description: 'Discover and download stunning wallpapers to transform your spaces.',
  metadataBase: new URL(BASE_URL),
  manifest: '/manifest.webmanifest',  // ← add this
  
  appleWebApp: {                      // ← add this for iOS
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Walls',
  },
  openGraph: {
    title: 'Walls – Transform Your Spaces',
    description: 'Discover and download stunning wallpapers to transform your spaces.',
    url: BASE_URL,
    siteName: 'Walls',
    type: 'website',
    images: [{ url: '/banner.png', width: 1200, height: 630, alt: 'Walls – Transform Your Spaces' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Walls – Transform Your Spaces',
    description: 'Discover and download stunning wallpapers to transform your spaces.',
    images: ['/banner.png'],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <html lang="en">
      <head>
        <Script src="/ads.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) { console.log('SW registered:', reg.scope); })
                    .catch(function(err) { console.log('SW failed:', err); });
                });
              }
            `,
          }}
        />
        <RouterRefresher />
        <Suspense fallback={null}><TopLoader /></Suspense>
        <AuthProvider initialSession={session}>
          <UploadModalProvider>{children}</UploadModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}